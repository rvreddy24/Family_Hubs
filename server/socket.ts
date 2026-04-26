/**
 * FamilyHubs.in — Socket.io Event Handlers
 *
 * Real-time channels for tasks, parents, providers, family noticeboard, wallet
 * ledger, SOS broadcast, and notifications. All hub-scoped events broadcast
 * over `hub:<hubId>` rooms; per-user wallet snapshots go to `user:<userId>`.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  getSnapshot,
  getFullSnapshot,
  updateTaskById,
  addTaskToFront,
  mapHubs,
  getTaskById,
  ensureHub,
  updateHubCounts,
  addParent,
  updateParent,
  deleteParent as deleteParentInStore,
  addProvider,
  updateProvider,
  getProvidersRef,
  addNote,
  walletCredit,
  walletLockEscrow,
  walletReleaseEscrow,
  getWallet,
  getTxnsForUser,
  getChatThreadById,
  getChatThreadForUser,
  getChatThreadsForHub,
  getChatMessagesForThread,
  upsertChatThread,
  patchChatThread,
  appendChatMessage,
  type ChatKind,
  type ChatAuthorRole,
  type ChatThread,
  type ChatMessage,
} from './store';

import { persistState, logIdentityVerification } from './persistence';
import {
  getSocketUser,
  hubBroadcast,
  isAdmin,
  isStrictAuth,
  isSupabaseEnabled,
  primaryHubIdFromSocket,
  rejectIfNotAdmin,
  rejectIfUnauthenticated,
  rejectTaskCreateIfForbidden,
  rejectTaskMutationIfForbidden,
  resolveTaskHubId,
  roleOf,
  userBroadcast,
} from './realtimeHelpers';

function afterMutation() {
  void persistState();
}

function emitWalletTo(io: SocketIOServer, userId: string) {
  const wallet = getWallet(userId);
  const transactions = getTxnsForUser(userId);
  userBroadcast(io, userId).emit('wallet:sync', { wallet, transactions });
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const clientId = socket.id;
    console.log(`[Socket] Client connected: ${clientId}`);

    // --- Join role + hub + per-user rooms; receive authoritative state ---
    socket.on(
      'join:room',
      (data: { role: string; hubId?: string; userId?: string }) => {
        socket.join(data.role);
        if (data.hubId) {
          socket.join(`hub:${data.hubId}`);
          ensureHub(data.hubId);
        }
        const u = getSocketUser(socket);
        const userId = u?.id || data.userId;
        if (userId) {
          socket.join(`user:${userId}`);
        }

        // Chat: admins listen on a private inbox channel for their hub. Family/provider
        // sockets only join their own thread rooms once they open a chat.
        const role = String(data.role || '').toLowerCase();
        if ((role === 'admin' || role === 'hub_admin') && data.hubId) {
          socket.join(`chat:inbox:${data.hubId}`);
        }

        (socket.data as { joinedHubId?: string; joinedUserId?: string; joinedRole?: string }).joinedHubId = data.hubId;
        (socket.data as { joinedUserId?: string }).joinedUserId = userId;
        (socket.data as { joinedRole?: string }).joinedRole = role;

        console.log(
          `[Socket] ${clientId} joined: role=${data.role}` +
            (data.hubId ? `, hub=${data.hubId}` : '') +
            (userId ? `, user=${userId}` : '')
        );

        socket.emit('state:sync', getFullSnapshot());

        if (userId) {
          const wallet = getWallet(userId);
          const transactions = getTxnsForUser(userId);
          socket.emit('wallet:sync', { wallet, transactions });
        }

        // Send chat snapshot. Admins get the full hub inbox; everyone else gets their
        // own thread (if any) so the floating widget can resume mid-conversation.
        if (data.hubId) {
          if (role === 'admin' || role === 'hub_admin') {
            const threads = getChatThreadsForHub(data.hubId);
            socket.emit('chat:list', { threads });
          } else if (userId) {
            const familyThread = getChatThreadForUser(userId, 'family', data.hubId);
            const providerThread = getChatThreadForUser(userId, 'provider', data.hubId);
            const mine = [familyThread, providerThread].filter(Boolean) as ChatThread[];
            if (mine.length) {
              for (const t of mine) socket.join(`chat:thread:${t.id}`);
              socket.emit('chat:list', { threads: mine });
            }
          }
        }
      }
    );

    // --- Task Status Update ---
    socket.on(
      'task:update',
      (data: { taskId: string; status: string; updatedBy: string; hubId?: string }) => {
        if (rejectTaskMutationIfForbidden(socket, data.taskId)) return;
        const task = getTaskById(data.taskId);
        if (!task) return;

        console.log(`[Socket] Task update: ${data.taskId} → ${data.status} by ${data.updatedBy}`);

        const previousStatus = task.status;
        updateTaskById(data.taskId, t => ({
          ...t,
          status: data.status,
          updatedAt: new Date().toISOString(),
        }));

        // Wallet bookkeeping: settle releases escrow on completion
        if (data.status === 'settled' && previousStatus !== 'settled' && task.cost > 0 && task.childId) {
          walletReleaseEscrow(task.childId, task.cost, task.id, `Task settled: ${task.title}`);
          emitWalletTo(io, task.childId);
        }

        const hub = resolveTaskHubId(socket, data, task);
        if (hub) updateHubCounts(hub);
        afterMutation();

        const payload = {
          taskId: data.taskId,
          status: data.status,
          updatedBy: data.updatedBy,
          timestamp: new Date().toISOString(),
        };
        hubBroadcast(io, hub).emit('task:updated', payload);

        hubBroadcast(io, hub).emit('notification:push', {
          id: makeId('notif'),
          type: 'task_update',
          title: 'Task Status Changed',
          message: `Task moved to "${String(data.status).replace('_', ' ')}".`,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // --- Task Assignment (admin assigns provider) ---
    socket.on(
      'task:assign',
      (data: { taskId: string; providerId: string; providerName?: string; providerPhoto?: string }) => {
        if (rejectIfNotAdmin(socket, 'task:assign')) return;
        const task = getTaskById(data.taskId);
        if (!task) return;
        // SECURITY: only verified providers can be dispatched. Anyone can sign up as a
        // provider (Uber/Zomato style), but until an admin reviews their docs and flips
        // `verified: true`, they cannot receive jobs.
        const provider = getProvidersRef().find((p: any) => p.id === data.providerId);
        if (!provider) {
          console.warn(`[Socket] task:assign rejected: provider ${data.providerId} not found`);
          socket.emit('task:assign:error', { taskId: data.taskId, error: 'Provider not found' });
          return;
        }
        if (!provider.verified) {
          console.warn(`[Socket] task:assign rejected: provider ${data.providerId} is not verified`);
          socket.emit('task:assign:error', {
            taskId: data.taskId,
            error: 'Provider is pending verification. Approve them in the verification queue first.',
          });
          return;
        }
        updateTaskById(data.taskId, t => ({
          ...t,
          providerId: data.providerId,
          status: t.status === 'created' || t.status === 'funded' ? 'assigned' : t.status,
          careManager: {
            name: data.providerName || t.careManager?.name || 'Provider',
            photo: data.providerPhoto || t.careManager?.photo || '',
            verified: true,
          },
          updatedAt: new Date().toISOString(),
        }));
        afterMutation();

        const hub = task.hubId;
        const updated = getTaskById(data.taskId);
        hubBroadcast(io, hub).emit('task:updated', {
          taskId: data.taskId,
          status: updated?.status,
          providerId: data.providerId,
          updatedBy: 'admin',
          timestamp: new Date().toISOString(),
        });
        hubBroadcast(io, hub).emit('notification:push', {
          id: makeId('notif'),
          type: 'task_assigned',
          title: 'Provider Assigned',
          message: `${data.providerName || 'A provider'} is heading to ${task.title}.`,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // --- Task Creation (with optional escrow lock against child wallet) ---
    socket.on('task:create', (data: any) => {
      if (rejectTaskCreateIfForbidden(socket, data)) return;
      if (!data?.id || !data?.childId) {
        console.warn('[Socket] task:create: invalid payload');
        return;
      }

      const hubId = data.hubId || primaryHubIdFromSocket(socket);
      const task = { ...data, hubId };
      addTaskToFront(task);
      if (hubId) {
        ensureHub(hubId);
        updateHubCounts(hubId);
      }

      // Lock escrow if cost provided and child has balance
      if (typeof task.cost === 'number' && task.cost > 0 && task.childId) {
        const result = walletLockEscrow(
          task.childId,
          task.cost,
          task.id,
          `Escrow lock: ${task.title}`
        );
        if (result) {
          updateTaskById(task.id, t => ({ ...t, status: 'funded' }));
          emitWalletTo(io, task.childId);
        }
      }

      afterMutation();

      const finalTask = getTaskById(task.id);
      console.log(`[Socket] New task created: ${task.id} (hub=${hubId})`);

      hubBroadcast(io, hubId).emit('task:created', finalTask);
      hubBroadcast(io, hubId).emit('notification:push', {
        id: makeId('notif'),
        type: 'task_created',
        title: 'New Job Dispatched',
        message: `"${data.title}" is queued${finalTask?.status === 'funded' ? ' with escrow lock' : ''}.`,
        timestamp: new Date().toISOString(),
      });
    });

    // --- Parent CRUD (hub-scoped) ---
    socket.on('parent:create', (data: any) => {
      if (rejectIfUnauthenticated(socket, 'parent:create')) return;
      if (!data?.id || !data?.name) return;
      const hubId = data.hubId || primaryHubIdFromSocket(socket) || 'hub_mgl';
      const u = getSocketUser(socket);
      const parent = {
        ...data,
        hubId,
        ownerId: u?.id || data.ownerId || data.childId || 'anon',
      };
      addParent(parent);
      afterMutation();
      hubBroadcast(io, hubId).emit('parent:upserted', parent);
    });

    socket.on('parent:update', (data: { id: string; patch: Record<string, any>; hubId?: string }) => {
      if (rejectIfUnauthenticated(socket, 'parent:update')) return;
      if (!data?.id || !data?.patch) return;
      updateParent(data.id, data.patch);
      afterMutation();
      const hubId = data.hubId || primaryHubIdFromSocket(socket);
      hubBroadcast(io, hubId).emit('parent:upserted', { id: data.id, ...data.patch });
    });

    socket.on('parent:delete', (data: { id: string; hubId?: string }) => {
      if (rejectIfUnauthenticated(socket, 'parent:delete')) return;
      if (!data?.id) return;
      deleteParentInStore(data.id);
      afterMutation();
      const hubId = data.hubId || primaryHubIdFromSocket(socket);
      hubBroadcast(io, hubId).emit('parent:deleted', { id: data.id });
    });

    // --- Provider directory (admin-onboarded) ---
    socket.on('provider:create', (data: any) => {
      if (rejectIfNotAdmin(socket, 'provider:create')) return;
      if (!data?.id || !data?.name) return;
      const hubId = data.hubId || primaryHubIdFromSocket(socket) || 'hub_mgl';
      const provider = { ...data, hubId, joinedAt: data.joinedAt || new Date().toISOString() };
      addProvider(provider);
      ensureHub(hubId);
      updateHubCounts(hubId);
      afterMutation();
      hubBroadcast(io, hubId).emit('provider:upserted', provider);
    });

    socket.on('provider:update', (data: { id: string; patch: Record<string, any>; hubId?: string }) => {
      if (rejectIfNotAdmin(socket, 'provider:update')) return;
      if (!data?.id) return;
      updateProvider(data.id, data.patch || {});
      afterMutation();
      const hubId = data.hubId || primaryHubIdFromSocket(socket);
      hubBroadcast(io, hubId).emit('provider:upserted', { id: data.id, ...(data.patch || {}) });
    });

    // --- Family Noticeboard ---
    socket.on(
      'note:create',
      (data: { id?: string; hubId?: string; authorId: string; authorName: string; authorRole: string; body: string }) => {
        if (rejectIfUnauthenticated(socket, 'note:create')) return;
        const hubId = data.hubId || primaryHubIdFromSocket(socket) || 'hub_mgl';
        const note = {
          id: data.id || makeId('note'),
          hubId,
          authorId: data.authorId,
          authorName: data.authorName || 'Member',
          authorRole: data.authorRole || 'child',
          body: (data.body || '').slice(0, 1000),
          createdAt: new Date().toISOString(),
        };
        if (!note.body.trim()) return;
        addNote(note);
        afterMutation();
        hubBroadcast(io, hubId).emit('note:created', note);
        hubBroadcast(io, hubId).emit('notification:push', {
          id: makeId('notif'),
          type: 'note',
          title: 'Family Noticeboard',
          message: `${note.authorName}: ${note.body.slice(0, 80)}${note.body.length > 80 ? '…' : ''}`,
          timestamp: note.createdAt,
        });
      }
    );

    // --- Wallet top-up (no payment gateway; ledger only) ---
    socket.on('wallet:topup', (data: { userId: string; amount: number; description?: string }) => {
      if (rejectIfUnauthenticated(socket, 'wallet:topup')) return;
      const u = getSocketUser(socket);
      const userId = data.userId || u?.id;
      if (!userId) return;
      if (u && u.id !== userId && !isAdmin(u)) {
        console.warn('[Socket] wallet:topup rejected: user mismatch');
        return;
      }
      const amount = Number(data.amount) || 0;
      if (amount <= 0 || amount > 100000) return;
      walletCredit(userId, amount, data.description || 'Wallet top-up');
      afterMutation();
      emitWalletTo(io, userId);
    });

    // --- SOS Emergency Broadcast ---
    socket.on(
      'sos:trigger',
      (data: {
        userId: string;
        hubId: string;
        parentName: string;
        location?: string;
        coords?: { lat: number; lng: number; accuracy?: number };
      }) => {
        const u = getSocketUser(socket);
        if (u && u.id !== data.userId) {
          if (!isAdmin(u)) {
            console.warn(`[Socket] sos:trigger rejected: userId mismatch`);
            return;
          }
        }

        console.log(`[Socket] ⚠️ SOS TRIGGERED by ${data.userId} for hub ${data.hubId}`);

        mapHubs(h =>
          h.id === data.hubId ? { ...h, emergencyAlerts: (h.emergencyAlerts || 0) + 1 } : h
        );
        afterMutation();

        const payload = {
          userId: data.userId,
          hubId: data.hubId,
          parentName: data.parentName,
          location: data.location,
          coords: data.coords,
          timestamp: new Date().toISOString(),
        };
        const { hubId } = data;
        hubBroadcast(io, hubId).emit('sos:broadcast', payload);

        const coordsTxt = data.coords ? ` (lat ${data.coords.lat.toFixed(4)}, lng ${data.coords.lng.toFixed(4)})` : '';
        hubBroadcast(io, hubId).emit('notification:push', {
          id: makeId('notif'),
          type: 'sos',
          title: '🚨 EMERGENCY SOS',
          message: `SOS for ${data.parentName}${coordsTxt}. Immediate response required.`,
          timestamp: new Date().toISOString(),
          priority: 'critical',
        });
      }
    );

    // --- SOS Acknowledge ---
    socket.on('sos:acknowledge', (data: { hubId: string; acknowledgedBy: string }) => {
      const hubId = data.hubId;
      console.log(`[Socket] SOS acknowledged for hub ${hubId} by ${data.acknowledgedBy}`);

      mapHubs(h => (h.id === hubId ? { ...h, emergencyAlerts: 0 } : h));
      afterMutation();

      const payload = {
        hubId: data.hubId,
        acknowledgedBy: data.acknowledgedBy,
        timestamp: new Date().toISOString(),
      };
      hubBroadcast(io, hubId).emit('sos:acknowledged', payload);

      hubBroadcast(io, hubId).emit('notification:push', {
        id: makeId('notif'),
        type: 'sos_ack',
        title: 'SOS Resolved',
        message: `Emergency alert acknowledged.`,
        timestamp: new Date().toISOString(),
      });
    });

    // --- Identity Verification Complete ---
    socket.on(
      'identity:verified',
      (data: { providerId: string; taskId: string; verifiedBy: string }) => {
        console.log(`[Socket] Identity verified: ${data.providerId} for ${data.taskId}`);
        void logIdentityVerification({
          provider_id: data.providerId,
          task_id: data.taskId,
          verified_by: data.verifiedBy,
        });

        const task = getTaskById(data.taskId);
        const hub = task ? resolveTaskHubId(socket, { taskId: data.taskId, hubId: task.hubId }, task) : undefined;
        const payload = { ...data, timestamp: new Date().toISOString() };
        hubBroadcast(io, hub).emit('identity:confirmed', payload);

        hubBroadcast(io, hub).emit('notification:push', {
          id: makeId('notif'),
          type: 'identity',
          title: 'Identity Handshake Complete',
          message: `Provider identity verified for task ${data.taskId}. Safe to dispatch.`,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // --- Chat / Support Inbox -------------------------------------------------
    // Family & provider apps speak to admins through hub-scoped chat threads.
    // Family sees an FAQ-first widget client-side; the server is agnostic to that
    // gating and just stores whatever messages arrive (including a system "user
    // requested live agent" line when the FAQ flow escalates).
    function broadcastThreadUpsert(thread: ChatThread) {
      io.to(`chat:inbox:${thread.hubId}`).emit('chat:thread:upserted', thread);
      io.to(`user:${thread.userId}`).emit('chat:thread:upserted', thread);
    }
    function broadcastChatMessage(thread: ChatThread, message: ChatMessage) {
      io.to(`chat:thread:${thread.id}`).emit('chat:message', message);
      io.to(`chat:inbox:${thread.hubId}`).emit('chat:message', message);
    }

    socket.on(
      'chat:open',
      (data: {
        kind: ChatKind;
        hubId?: string;
        userId?: string;
        userName?: string;
        userEmail?: string;
      }) => {
        const u = getSocketUser(socket);
        const hubId = data.hubId || primaryHubIdFromSocket(socket) || 'hub_mgl';
        const userId = u?.id || data.userId;
        if (!userId) {
          console.warn('[Socket] chat:open rejected: no userId');
          return;
        }
        if (u && data.userId && u.id !== data.userId && !isAdmin(u)) {
          console.warn('[Socket] chat:open rejected: user mismatch');
          return;
        }
        const kind: ChatKind = data.kind === 'provider' ? 'provider' : 'family';
        const userName = data.userName || u?.email?.split('@')[0] || 'Member';

        let thread = getChatThreadForUser(userId, kind, hubId);
        const now = new Date().toISOString();
        if (!thread) {
          thread = {
            id: makeId('thread'),
            kind,
            hubId,
            userId,
            userName,
            userEmail: data.userEmail || u?.email,
            status: 'open',
            createdAt: now,
            updatedAt: now,
            unreadForAdmin: 0,
            unreadForUser: 0,
          };
          upsertChatThread(thread);
          afterMutation();
        } else if (thread.userName !== userName || thread.userEmail !== (data.userEmail || u?.email)) {
          thread = patchChatThread(thread.id, {
            userName,
            userEmail: data.userEmail || u?.email || thread.userEmail,
          })!;
          afterMutation();
        }

        // Let the same member start fresh after they ended a chat (status was resolved).
        if (thread.status === 'resolved') {
          const openerId = u?.id || userId;
          if (openerId === thread.userId) {
            thread = patchChatThread(thread.id, { status: 'open' })!;
            afterMutation();
          }
        }

        socket.join(`chat:thread:${thread.id}`);
        broadcastThreadUpsert(thread);

        const messages = getChatMessagesForThread(thread.id);
        socket.emit('chat:history', { threadId: thread.id, messages });
        socket.emit('chat:thread:upserted', thread);
      }
    );

    socket.on(
      'chat:join',
      (data: { threadId: string }) => {
        const u = getSocketUser(socket);
        const thread = getChatThreadById(data?.threadId);
        if (!thread) return;
        // Admins of the hub OR the thread owner may join the realtime stream.
        const ok =
          (u && isAdmin(u)) ||
          !u || // demo mode: keep ergonomic
          u.id === thread.userId;
        if (!ok) {
          console.warn(`[Socket] chat:join rejected for thread ${thread.id}`);
          return;
        }
        socket.join(`chat:thread:${thread.id}`);
        const messages = getChatMessagesForThread(thread.id);
        socket.emit('chat:history', { threadId: thread.id, messages });
      }
    );

    socket.on(
      'chat:message',
      (data: {
        threadId: string;
        body: string;
        kind?: 'text' | 'faq' | 'system';
        authorRole?: ChatAuthorRole;
        authorName?: string;
      }) => {
        const u = getSocketUser(socket);
        const thread = getChatThreadById(data?.threadId);
        if (!thread) return;
        const body = String(data.body || '').slice(0, 2000).trim();
        if (!body) return;

        // Determine author role. Admins are sourced from app_metadata; everyone else
        // matches the thread kind so a provider thread → provider author, etc.
        const adminCaller = u && isAdmin(u);
        let authorRole: ChatAuthorRole;
        if (data.authorRole === 'bot' && adminCaller) {
          authorRole = 'bot';
        } else if (adminCaller) {
          authorRole = 'admin';
        } else if (thread.kind === 'provider') {
          authorRole = 'provider';
        } else {
          authorRole = 'family';
        }

        // Authorization: only the thread owner or an admin may post.
        if (u && !adminCaller && u.id !== thread.userId) {
          console.warn(`[Socket] chat:message rejected: user ${u.id} is not thread owner`);
          return;
        }

        const message: ChatMessage = {
          id: makeId('msg'),
          threadId: thread.id,
          authorId: u?.id || thread.userId,
          authorRole,
          authorName: data.authorName || (adminCaller ? 'Support' : thread.userName),
          body,
          createdAt: new Date().toISOString(),
          kind: data.kind || 'text',
        };
        appendChatMessage(message);

        // Bookkeeping: update thread metadata, status, and unread counters.
        const isUserAuthored = authorRole === 'family' || authorRole === 'provider';
        const patch: Partial<ChatThread> = {
          updatedAt: message.createdAt,
          lastMessage: body,
          lastAuthorRole: authorRole,
          unreadForAdmin: isUserAuthored ? thread.unreadForAdmin + 1 : 0,
          unreadForUser: !isUserAuthored ? thread.unreadForUser + 1 : 0,
        };
        // Family threads escalate when the user explicitly hits "talk to a human".
        if (isUserAuthored && data.kind === 'system' && /live agent|human/i.test(body)) {
          patch.status = 'awaiting_human';
        }
        // Any admin reply re-opens an awaiting thread.
        if (authorRole === 'admin' && thread.status === 'awaiting_human') {
          patch.status = 'open';
        }
        const updated = patchChatThread(thread.id, patch)!;
        afterMutation();

        broadcastChatMessage(updated, message);
        broadcastThreadUpsert(updated);

        // Notify admins of the hub when a user posts (gentle ping for inbox).
        if (isUserAuthored) {
          io.to(`chat:inbox:${updated.hubId}`).emit('notification:push', {
            id: makeId('notif'),
            type: 'chat',
            title: updated.kind === 'provider' ? 'Partner support request' : 'Family support request',
            message: `${updated.userName}: ${body.slice(0, 80)}${body.length > 80 ? '…' : ''}`,
            timestamp: message.createdAt,
          });
        }
      }
    );

    socket.on(
      'chat:read',
      (data: { threadId: string; role?: 'admin' | 'user' }) => {
        const u = getSocketUser(socket);
        const thread = getChatThreadById(data?.threadId);
        if (!thread) return;
        const wantsAdmin = data.role === 'admin' || (u && isAdmin(u));
        const patch: Partial<ChatThread> = wantsAdmin
          ? { unreadForAdmin: 0 }
          : { unreadForUser: 0 };
        const updated = patchChatThread(thread.id, patch)!;
        afterMutation();
        broadcastThreadUpsert(updated);
      }
    );

    socket.on(
      'chat:typing',
      (data: { threadId: string; isTyping: boolean; authorRole?: ChatAuthorRole }) => {
        const thread = getChatThreadById(data?.threadId);
        if (!thread) return;
        socket.to(`chat:thread:${thread.id}`).emit('chat:typing', {
          threadId: thread.id,
          isTyping: !!data.isTyping,
          authorRole: data.authorRole || 'admin',
        });
        socket.to(`chat:inbox:${thread.hubId}`).emit('chat:typing', {
          threadId: thread.id,
          isTyping: !!data.isTyping,
          authorRole: data.authorRole || 'family',
        });
      }
    );

    socket.on(
      'chat:resolve',
      (data: { threadId: string }) => {
        const u = getSocketUser(socket);
        const thread = getChatThreadById(data?.threadId);
        if (!thread) return;

        const adminCaller = Boolean(u && isAdmin(u));
        const ownerCaller = Boolean(u && u.id === thread.userId);

        if (isSupabaseEnabled()) {
          if (!adminCaller && !ownerCaller) {
            console.warn('[Socket] chat:resolve rejected: must be hub admin or thread owner');
            return;
          }
        } else if (u && !adminCaller && !ownerCaller) {
          console.warn('[Socket] chat:resolve rejected (demo with auth): user/thread mismatch');
          return;
        }

        const updated = patchChatThread(thread.id, {
          status: 'resolved',
          unreadForAdmin: 0,
          unreadForUser: 0,
        })!;
        afterMutation();
        broadcastThreadUpsert(updated);
        const sysBody = adminCaller
          ? 'Conversation marked as resolved by support.'
          : 'You ended this chat. Open help anytime if you need us again.';
        const sysMsg: ChatMessage = {
          id: makeId('msg'),
          threadId: thread.id,
          authorId: 'system',
          authorRole: 'bot',
          authorName: 'System',
          body: sysBody,
          createdAt: new Date().toISOString(),
          kind: 'system',
        };
        appendChatMessage(sysMsg);
        broadcastChatMessage(updated, sysMsg);
      }
    );

    socket.on(
      'chat:reopen',
      (data: { threadId: string }) => {
        const u = getSocketUser(socket);
        const thread = getChatThreadById(data?.threadId);
        if (!thread) return;
        if (isSupabaseEnabled()) {
          if (!u || !isAdmin(u)) {
            console.warn('[Socket] chat:reopen rejected: hub admin required');
            return;
          }
        } else if (u && !isAdmin(u)) {
          console.warn('[Socket] chat:reopen rejected (demo with auth): not admin');
          return;
        }
        const updated = patchChatThread(thread.id, { status: 'open' })!;
        afterMutation();
        broadcastThreadUpsert(updated);
        const sysMsg: ChatMessage = {
          id: makeId('msg'),
          threadId: thread.id,
          authorId: 'system',
          authorRole: 'bot',
          authorName: 'System',
          body: 'Conversation reopened by support.',
          createdAt: new Date().toISOString(),
          kind: 'system',
        };
        appendChatMessage(sysMsg);
        broadcastChatMessage(updated, sysMsg);
      }
    );

    socket.on('disconnect', reason => {
      console.log(`[Socket] Client disconnected: ${clientId} (${reason})`);
    });
  });

  setInterval(() => {
    const count = io.engine.clientsCount;
    if (count > 0) {
      console.log(`[Socket] Active connections: ${count}`);
    }
  }, 30000);

  // legacy reference suppressed
  void getSnapshot;
  void roleOf;
}
