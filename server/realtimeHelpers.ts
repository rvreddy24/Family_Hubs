import type { Server, Socket } from 'socket.io';
import type { User } from '@supabase/supabase-js';
import { getTaskById } from './store';

const STRICT = process.env.STRICT_SOCKET_AUTH === '1';

export function isStrictAuth() {
  return STRICT;
}

/**
 * True when the server has Supabase service-role credentials wired up (i.e., real auth
 * is in play, not pure demo mode). Used to gate privileged socket mutations even when
 * STRICT_SOCKET_AUTH is off.
 */
export function isSupabaseEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Returns true if the caller should be rejected for a privileged (admin-only) socket
 * mutation. When Supabase is configured, an authenticated admin is required; otherwise
 * (pure demo / no Supabase env) the mutation is allowed for ergonomics.
 */
export function rejectIfNotAdmin(socket: Socket, label: string): boolean {
  if (!isSupabaseEnabled()) return false;
  const u = getSocketUser(socket);
  if (!u || !isAdmin(u)) {
    console.warn(`[Socket] ${label} rejected: admin role required (caller=${u?.id ?? 'anonymous'})`);
    return true;
  }
  return false;
}

/**
 * SECURITY: role is sourced from `app_metadata` only. `user_metadata` is writable by the
 * end user themselves via `supabase.auth.updateUser({ data: { role: 'admin' } })`, so it
 * cannot be trusted for authorization. `app_metadata` can only be written by the
 * service-role key (server side), making it tamper-proof.
 */
export function roleOf(u: User): string | undefined {
  const a = (u.app_metadata as Record<string, string | undefined> | undefined) ?? undefined;
  return a?.role;
}

export function isAdmin(u: User | undefined): boolean {
  if (!u) return false;
  const r = (roleOf(u) || '').toLowerCase();
  return r === 'admin' || r === 'hub_admin';
}

/**
 * When STRICT_SOCKET_AUTH is on, only admin / involved party may change a task.
 */
export function mayMutateTask(task: { childId: string; providerId?: string }, user: User): boolean {
  const r = (roleOf(user) || '').toLowerCase();
  if (r === 'admin' || r === 'hub_admin') return true;
  if (user.id === task.childId) return true;
  if (task.providerId && user.id === task.providerId) return true;
  if (!task.providerId && (r === 'child' || r === 'admin')) return true;
  if (!r && (user.id === task.childId || user.id === task.providerId)) return true;
  return false;
}

export function getSocketUser(socket: Socket): User | undefined {
  return (socket.data as { familyHubsUser?: User }).familyHubsUser;
}

export function rejectIfUnauthenticated(
  socket: Socket,
  label: string
): boolean {
  if (!STRICT) return false;
  const u = getSocketUser(socket);
  if (!u) {
    console.warn(`[Socket] ${label} rejected: authentication required in STRICT_SOCKET_AUTH mode`);
    return true;
  }
  return false;
}

export function rejectTaskMutationIfForbidden(
  socket: Socket,
  taskId: string
): boolean {
  if (rejectIfUnauthenticated(socket, 'task:update')) return true;
  const u = getSocketUser(socket);
  const task = getTaskById(taskId);
  if (!task) {
    console.warn(`[Socket] task:update: unknown task ${taskId}`);
    return true;
  }
  if (STRICT) {
    if (!u) return true;
    if (!mayMutateTask(task, u)) {
      console.warn(`[Socket] task:update rejected: user ${u.id} cannot update task ${taskId}`);
      return true;
    }
  }
  return false;
}

/** First hub room this socket has joined, e.g. from join:room */
export function primaryHubIdFromSocket(socket: Socket): string | undefined {
  for (const room of socket.rooms) {
    if (room.startsWith('hub:') && room !== 'hub:') {
      return room.slice(4);
    }
  }
  return undefined;
}

export function hubBroadcast(io: Server, hubId: string | undefined) {
  if (hubId) {
    return io.to(`hub:${hubId}`);
  }
  return io;
}

export function resolveTaskHubId(
  socket: Socket,
  data: { hubId?: string; taskId?: string },
  task: { hubId?: string } | null | undefined
): string | undefined {
  if (data.hubId) return data.hubId;
  if (task?.hubId) return task.hubId;
  return primaryHubIdFromSocket(socket) ?? (data.taskId ? getTaskById(data.taskId)?.hubId : undefined);
}

export function resolveHubFromSosData(data: { hubId: string }): string {
  return data.hubId;
}

export function rejectTaskCreateIfForbidden(
  socket: Socket,
  data: { childId: string; hubId?: string }
): boolean {
  if (rejectIfUnauthenticated(socket, 'task:create')) return true;
  if (!STRICT) return false;
  const u = getSocketUser(socket);
  if (!u) return true;
  const r = (roleOf(u) || '').toLowerCase();
  if (r === 'admin' || r === 'hub_admin') return false;
  if (data.childId === u.id) return false;
  console.warn(`[Socket] task:create rejected: user ${u.id} may not create for child ${data.childId}`);
  return true;
}

/**
 * Per-user broadcast helper — emits only to sockets connected as the given userId.
 * Used for wallet snapshots that should never leak across users.
 */
export function userBroadcast(io: Server, userId: string) {
  return io.to(`user:${userId}`);
}
