/**
 * FamilyHubs.in — Global Application State Context
 *
 * Source of truth comes from the server over Socket.io (`state:sync`,
 * `wallet:sync`, `parent:upserted`, …). All mutations are emitted via
 * Socket.io events; the server applies them, persists, and re-broadcasts.
 *
 * When Supabase auth is configured, the signed-in user drives the room joins
 * and authoritative role. Otherwise we fall back to the persona-switch demo
 * mode for local exploration (Family / Admin / Provider buttons on landing).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useSocket } from './SocketContext';
import { useAuth, type AuthRole } from './AuthContext';
import {
  ServiceCategory,
  User as UserType,
  FamilyNote,
  WalletState,
  WalletTransaction,
  ChatThread,
  ChatMessage,
  ChatKind,
} from '../types';
import {
  MOCK_USER,
  MOCK_ADMIN,
  MOCK_PROVIDER_USER,
  MOCK_RESOURCES,
  SERVICES,
} from '../constants';

export type AppView =
  | 'landing'
  | 'dashboard'
  | 'booking'
  | 'wallet'
  | 'resources'
  | 'add-parent'
  | 'edit-parent'
  | 'profile'
  | 'services'
  | 'admin-dashboard'
  | 'provider-dashboard';

export type AuthMode = 'login' | 'signup';

interface AppContextValue {
  // Session
  session: { id: string } | null;
  setSession: Dispatch<SetStateAction<{ id: string } | null>>;
  authMode: AuthMode;
  setAuthMode: (m: AuthMode) => void;
  user: UserType;
  setUser: Dispatch<SetStateAction<UserType>>;
  login: (email?: string, password?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: AuthRole) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  logout: () => void;
  switchToAdmin: () => void;
  switchToUser: () => void;
  updateProfile: (data: Partial<UserType>) => void;
  isSupabaseConfigured: boolean;

  // Navigation
  view: AppView;
  setView: (v: AppView) => void;

  // Tasks
  tasks: any[];
  setTasks: Dispatch<SetStateAction<any[]>>;
  selectedTask: string | null;
  setSelectedTask: (id: string | null) => void;
  handleTaskStatusUpdate: (taskId: string, status: string) => void;
  createTask: (task: any) => void;
  assignTaskToProvider: (taskId: string, provider: { id: string; name: string; photo?: string }) => void;

  // Parents
  parents: any[];
  setParents: Dispatch<SetStateAction<any[]>>;
  editingParentId: string | null;
  setEditingParentId: (id: string | null) => void;
  selectedParentId: string;
  setSelectedParentId: (id: string) => void;
  upsertParent: (parent: any) => void;
  patchParent: (id: string, patch: Record<string, any>) => void;
  deleteParent: (id: string) => void;

  // Hubs
  hubs: any[];
  setHubs: Dispatch<SetStateAction<any[]>>;

  // Services / Booking
  selectedCategories: ServiceCategory[];
  setSelectedCategories: Dispatch<SetStateAction<ServiceCategory[]>>;
  toggleCategory: (cat: ServiceCategory) => void;
  startBooking: (category?: ServiceCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;

  // SOS
  showSOS: boolean;
  setShowSOS: (s: boolean) => void;
  handleSOS: () => void;
  handleSOSAcknowledge: (hubId: string) => void;

  // Wallet (live, per-user, server-driven)
  wallet: WalletState;
  transactions: WalletTransaction[];
  topUpWallet: (amount: number, description?: string) => void;

  // Family Noticeboard
  notes: FamilyNote[];
  postNote: (body: string) => void;

  // Live data (real, server-broadcast)
  providers: any[];
  setProviders: Dispatch<SetStateAction<any[]>>;
  upsertProvider: (provider: any) => void;
  patchProvider: (id: string, patch: Record<string, any>) => void;

  // Support chat (Amazon-style live chat — FAQ first for family, direct for provider)
  chatThreads: ChatThread[];
  chatMessages: Record<string, ChatMessage[]>; // threadId → messages
  openChat: (kind: ChatKind) => void;
  joinChatThread: (threadId: string) => void;
  sendChatMessage: (threadId: string, body: string, kind?: 'text' | 'faq' | 'system') => void;
  markChatRead: (threadId: string) => void;
  resolveChatThread: (threadId: string) => void;
  /** Hub admin only — sets thread back to open after resolve. */
  reopenChatThread: (threadId: string) => void;

  // Static seeds
  resources: typeof MOCK_RESOURCES;
  services: typeof SERVICES;
  logs: any[];
}

const AppContext = createContext<AppContextValue>({} as AppContextValue);

export const useApp = () => useContext(AppContext);

const DEFAULT_HUB = 'hub_mgl';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * SECURITY: privileged roles (admin, provider) MUST come from `app_metadata`, which is
 * only writable with the service-role key (i.e., set by the seed script or an admin
 * invite endpoint). `user_metadata.role` is editable by the end user via
 * supabase.auth.updateUser, so it is only honoured for the unprivileged `child` role.
 */
function inferRole(
  appMeta: Record<string, any> | undefined | null,
  userMeta?: Record<string, any> | undefined | null
): 'child' | 'admin' | 'provider' {
  const trusted = String(appMeta?.role || '').toLowerCase();
  if (trusted === 'admin' || trusted === 'hub_admin') return 'admin';
  if (trusted === 'provider') return 'provider';
  // Fallback to user_metadata only for the unprivileged "child" default.
  const requested = String(userMeta?.role || '').toLowerCase();
  if (requested === 'admin' || requested === 'hub_admin' || requested === 'provider') return 'child';
  return 'child';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const auth = useAuth();

  // --- Session State ---
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<UserType>(MOCK_USER);
  const [view, setView] = useState<AppView>('landing');

  // --- Server-driven Data State ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [wallet, setWallet] = useState<WalletState>({ userId: '', balance: 0, escrow: 0 });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});

  // --- UI State ---
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showSOS, setShowSOS] = useState(false);

  // --- Auto-select first parent for the active user ---
  const myParents = useMemo(() => {
    if (!parents.length) return [];
    if (!user.id || user.role === 'admin') return parents;
    return parents.filter(p => !p.ownerId || p.ownerId === user.id || user.role === 'child');
  }, [parents, user.id, user.role]);

  useEffect(() => {
    if (myParents.length === 0) {
      if (selectedParentId) setSelectedParentId('');
      return;
    }
    if (!selectedParentId || !myParents.some(p => p.id === selectedParentId)) {
      setSelectedParentId(myParents[0].id);
    }
  }, [myParents, selectedParentId]);

  // --- Lift Supabase auth → app session/user ---
  useEffect(() => {
    if (!auth.user) return;
    const meta = (auth.user.user_metadata as Record<string, any>) || {};
    const appMeta = (auth.user.app_metadata as Record<string, any>) || {};
    const role = inferRole(appMeta, meta);
    const fullName = String(meta.full_name || meta.name || auth.user.email?.split('@')[0] || 'You');
    const profile: UserType = {
      id: auth.user.id,
      name: fullName,
      email: auth.user.email || '',
      location: String(meta.location || ''),
      phoneNumber: String(meta.phone || ''),
      profileImage: meta.avatar_url,
      walletBalance: 0,
      escrowBalance: 0,
      role,
      hubId: meta.hubId || (role === 'child' ? undefined : DEFAULT_HUB),
    };
    setUser(profile);
    setSession({ id: auth.user.id });
    setView(prev =>
      prev === 'landing'
        ? role === 'admin'
          ? 'admin-dashboard'
          : role === 'provider'
            ? 'provider-dashboard'
            : 'dashboard'
        : prev
    );
  }, [auth.user]);

  // Keep `user.walletBalance / escrowBalance` synced with the live wallet
  useEffect(() => {
    setUser(prev => ({
      ...prev,
      walletBalance: wallet.balance,
      escrowBalance: wallet.escrow,
    }));
  }, [wallet.balance, wallet.escrow]);

  // --- Initial REST snapshot (server source of truth) ---
  useEffect(() => {
    fetch('/api/state', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (Array.isArray(data.hubs)) setHubs(data.hubs);
        if (Array.isArray(data.parents)) setParents(data.parents);
        if (Array.isArray(data.providers)) setProviders(data.providers);
        if (Array.isArray(data.notes)) setNotes(data.notes);
      })
      .catch(() => {});
  }, []);

  // --- Socket.io: join hub + per-user room (server replies with state:sync) ---
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('join:room', {
        role: user.role,
        hubId: user.hubId || DEFAULT_HUB,
        userId: user.id,
      });
    }
  }, [socket, isConnected, user.role, user.hubId, user.id]);

  // --- Socket.io: live event listeners ---
  useEffect(() => {
    if (!socket) return;

    const onStateSync = (data: {
      tasks?: any[];
      hubs?: any[];
      parents?: any[];
      providers?: any[];
      notes?: FamilyNote[];
    }) => {
      if (data.tasks) setTasks(data.tasks);
      if (data.hubs) setHubs(data.hubs);
      if (data.parents) setParents(data.parents);
      if (data.providers) setProviders(data.providers);
      if (data.notes) setNotes(data.notes);
    };

    const onWalletSync = (data: { wallet: WalletState; transactions: WalletTransaction[] }) => {
      if (data.wallet) setWallet(data.wallet);
      if (data.transactions) setTransactions(data.transactions);
    };

    const onTaskUpdated = (data: { taskId: string; status: string; providerId?: string }) => {
      setTasks(prev =>
        prev.map(t =>
          t.id === data.taskId
            ? {
                ...t,
                status: data.status ?? t.status,
                providerId: data.providerId ?? t.providerId,
              }
            : t
        )
      );
    };

    const onTaskCreated = (data: any) => {
      setTasks(prev => (prev.find(t => t.id === data.id) ? prev : [data, ...prev]));
    };

    const onParentUpserted = (parent: any) => {
      setParents(prev => {
        const existing = prev.find(p => p.id === parent.id);
        if (existing) return prev.map(p => (p.id === parent.id ? { ...p, ...parent } : p));
        return [...prev, parent];
      });
    };

    const onParentDeleted = (data: { id: string }) => {
      setParents(prev => prev.filter(p => p.id !== data.id));
    };

    const onProviderUpserted = (provider: any) => {
      setProviders(prev => {
        const existing = prev.find(p => p.id === provider.id);
        if (existing) return prev.map(p => (p.id === provider.id ? { ...p, ...provider } : p));
        return [...prev, provider];
      });
    };

    const onNoteCreated = (note: FamilyNote) => {
      setNotes(prev => (prev.find(n => n.id === note.id) ? prev : [note, ...prev]).slice(0, 200));
    };

    const onSOSBroadcast = (data: any) => {
      setHubs(prev =>
        prev.map(h =>
          h.id === data.hubId ? { ...h, emergencyAlerts: (h.emergencyAlerts || 0) + 1 } : h
        )
      );
    };

    const onSOSAcknowledged = (data: { hubId: string }) => {
      setHubs(prev =>
        prev.map(h => (h.id === data.hubId ? { ...h, emergencyAlerts: 0 } : h))
      );
    };

    const onChatList = (data: { threads: ChatThread[] }) => {
      if (!Array.isArray(data?.threads)) return;
      setChatThreads(prev => {
        const map = new Map<string, ChatThread>();
        for (const t of prev) map.set(t.id, t);
        for (const t of data.threads) map.set(t.id, t);
        return Array.from(map.values()).sort((a, b) =>
          (b.updatedAt || '').localeCompare(a.updatedAt || '')
        );
      });
    };

    const onChatThreadUpserted = (thread: ChatThread) => {
      if (!thread?.id) return;
      setChatThreads(prev => {
        const idx = prev.findIndex(t => t.id === thread.id);
        const next = idx < 0 ? [thread, ...prev] : prev.map(t => (t.id === thread.id ? { ...t, ...thread } : t));
        return next.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      });
    };

    const onChatHistory = (data: { threadId: string; messages: ChatMessage[] }) => {
      if (!data?.threadId) return;
      setChatMessages(prev => ({ ...prev, [data.threadId]: data.messages || [] }));
    };

    const onChatMessage = (msg: ChatMessage) => {
      if (!msg?.threadId) return;
      setChatMessages(prev => {
        const list = prev[msg.threadId] || [];
        if (list.find(m => m.id === msg.id)) return prev;
        return { ...prev, [msg.threadId]: [...list, msg] };
      });
    };

    socket.on('state:sync', onStateSync);
    socket.on('wallet:sync', onWalletSync);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:created', onTaskCreated);
    socket.on('parent:upserted', onParentUpserted);
    socket.on('parent:deleted', onParentDeleted);
    socket.on('provider:upserted', onProviderUpserted);
    socket.on('note:created', onNoteCreated);
    socket.on('sos:broadcast', onSOSBroadcast);
    socket.on('sos:acknowledged', onSOSAcknowledged);
    socket.on('chat:list', onChatList);
    socket.on('chat:thread:upserted', onChatThreadUpserted);
    socket.on('chat:history', onChatHistory);
    socket.on('chat:message', onChatMessage);

    return () => {
      socket.off('state:sync', onStateSync);
      socket.off('wallet:sync', onWalletSync);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:created', onTaskCreated);
      socket.off('parent:upserted', onParentUpserted);
      socket.off('parent:deleted', onParentDeleted);
      socket.off('provider:upserted', onProviderUpserted);
      socket.off('note:created', onNoteCreated);
      socket.off('sos:broadcast', onSOSBroadcast);
      socket.off('sos:acknowledged', onSOSAcknowledged);
      socket.off('chat:list', onChatList);
      socket.off('chat:thread:upserted', onChatThreadUpserted);
      socket.off('chat:history', onChatHistory);
      socket.off('chat:message', onChatMessage);
    };
  }, [socket]);

  // --- Actions ---
  const handleTaskStatusUpdate = useCallback(
    (taskId: string, status: string) => {
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status } : t)));
      if (socket && isConnected) {
        socket.emit('task:update', {
          taskId,
          status,
          updatedBy: user.name,
          hubId: user.hubId || DEFAULT_HUB,
        });
      }
    },
    [socket, isConnected, user.name, user.hubId]
  );

  const createTask = useCallback(
    (task: any) => {
      const hubId = task.hubId || user.hubId || DEFAULT_HUB;
      const withHub = { ...task, hubId };
      setTasks(prev => [withHub, ...prev]);
      if (socket && isConnected) {
        socket.emit('task:create', withHub);
      }
    },
    [socket, isConnected, user.hubId]
  );

  const assignTaskToProvider = useCallback(
    (taskId: string, provider: { id: string; name: string; photo?: string }) => {
      if (!socket || !isConnected) return;
      socket.emit('task:assign', {
        taskId,
        providerId: provider.id,
        providerName: provider.name,
        providerPhoto: provider.photo,
      });
    },
    [socket, isConnected]
  );

  const upsertParent = useCallback(
    (parent: any) => {
      const id = parent.id || makeId('parent');
      const hubId = parent.hubId || user.hubId || DEFAULT_HUB;
      const withMeta = { ...parent, id, hubId, ownerId: parent.ownerId || user.id };
      setParents(prev => {
        const existing = prev.find(p => p.id === id);
        if (existing) return prev.map(p => (p.id === id ? { ...p, ...withMeta } : p));
        return [...prev, withMeta];
      });
      if (socket && isConnected) {
        socket.emit('parent:create', withMeta);
      }
    },
    [socket, isConnected, user.hubId, user.id]
  );

  const patchParent = useCallback(
    (id: string, patch: Record<string, any>) => {
      setParents(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
      if (socket && isConnected) {
        socket.emit('parent:update', {
          id,
          patch,
          hubId: user.hubId || DEFAULT_HUB,
        });
      }
    },
    [socket, isConnected, user.hubId]
  );

  const deleteParent = useCallback(
    (id: string) => {
      if (!confirm('Delete this family profile? Active jobs will keep referencing it.')) return;
      setParents(prev => prev.filter(p => p.id !== id));
      if (socket && isConnected) {
        socket.emit('parent:delete', { id, hubId: user.hubId || DEFAULT_HUB });
      }
    },
    [socket, isConnected, user.hubId]
  );

  const upsertProvider = useCallback(
    (provider: any) => {
      const id = provider.id || makeId('prov');
      const hubId = provider.hubId || user.hubId || DEFAULT_HUB;
      const withMeta = {
        ...provider,
        id,
        hubId,
        joinedAt: provider.joinedAt || new Date().toISOString(),
      };
      setProviders(prev => {
        const existing = prev.find(p => p.id === id);
        if (existing) return prev.map(p => (p.id === id ? { ...p, ...withMeta } : p));
        return [...prev, withMeta];
      });
      if (socket && isConnected) {
        socket.emit('provider:create', withMeta);
      }
    },
    [socket, isConnected, user.hubId]
  );

  const patchProvider = useCallback(
    (id: string, patch: Record<string, any>) => {
      setProviders(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
      if (socket && isConnected) {
        socket.emit('provider:update', {
          id,
          patch,
          hubId: user.hubId || DEFAULT_HUB,
        });
      }
    },
    [socket, isConnected, user.hubId]
  );

  const postNote = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const note: FamilyNote = {
        id: makeId('note'),
        hubId: user.hubId || DEFAULT_HUB,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        body: trimmed,
        createdAt: new Date().toISOString(),
      };
      setNotes(prev => [note, ...prev]);
      if (socket && isConnected) {
        socket.emit('note:create', {
          id: note.id,
          hubId: note.hubId,
          authorId: note.authorId,
          authorName: note.authorName,
          authorRole: note.authorRole,
          body: note.body,
        });
      }
    },
    [socket, isConnected, user.hubId, user.id, user.name, user.role]
  );

  const topUpWallet = useCallback(
    (amount: number, description = 'Wallet top-up') => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      setWallet(prev => ({ ...prev, balance: prev.balance + amount }));
      if (socket && isConnected) {
        socket.emit('wallet:topup', { userId: user.id, amount, description });
      }
    },
    [socket, isConnected, user.id]
  );

  const handleSOS = useCallback(() => {
    const hubId = user.hubId || DEFAULT_HUB;

    setHubs(prev => {
      if (prev.length === 0) {
        return [
          {
            id: hubId,
            name: 'Hub',
            city: '—',
            totalProviders: 0,
            activeJobs: 0,
            emergencyAlerts: 1,
            revenue: 0,
          },
        ];
      }
      return prev.map(h =>
        h.id === hubId ? { ...h, emergencyAlerts: (h.emergencyAlerts || 0) + 1 } : h
      );
    });

    const broadcast = (coords?: { lat: number; lng: number; accuracy?: number }) => {
      if (!socket || !isConnected) return;
      const targetParent = myParents.find(p => p.id === selectedParentId) || myParents[0];
      socket.emit('sos:trigger', {
        userId: user.id,
        hubId,
        parentName: targetParent?.name || user.name || 'Family member',
        location: targetParent?.address || (user as { location?: string }).location || '',
        coords,
      });
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => broadcast({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => broadcast(),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      broadcast();
    }
  }, [socket, isConnected, user.id, user.hubId, user.name, myParents, selectedParentId]);

  const handleSOSAcknowledge = useCallback(
    (hubId: string) => {
      setHubs(prev => prev.map(h => (h.id === hubId ? { ...h, emergencyAlerts: 0 } : h)));
      if (socket && isConnected) {
        socket.emit('sos:acknowledge', { hubId, acknowledgedBy: user.name });
      }
    },
    [socket, isConnected, user.name]
  );

  // --- Support chat actions ---
  const openChat = useCallback(
    (kind: ChatKind) => {
      if (!socket || !isConnected) return;
      socket.emit('chat:open', {
        kind,
        hubId: user.hubId || DEFAULT_HUB,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      });
    },
    [socket, isConnected, user.hubId, user.id, user.name, user.email]
  );

  const joinChatThread = useCallback(
    (threadId: string) => {
      if (!socket || !isConnected || !threadId) return;
      socket.emit('chat:join', { threadId });
    },
    [socket, isConnected]
  );

  const sendChatMessage = useCallback(
    (threadId: string, body: string, kind: 'text' | 'faq' | 'system' = 'text') => {
      if (!socket || !isConnected || !threadId) return;
      const trimmed = String(body || '').trim();
      if (!trimmed) return;
      socket.emit('chat:message', {
        threadId,
        body: trimmed,
        kind,
        authorName: user.name,
      });
    },
    [socket, isConnected, user.name]
  );

  const markChatRead = useCallback(
    (threadId: string) => {
      if (!socket || !isConnected || !threadId) return;
      socket.emit('chat:read', {
        threadId,
        role: user.role === 'admin' ? 'admin' : 'user',
      });
    },
    [socket, isConnected, user.role]
  );

  const resolveChatThread = useCallback(
    (threadId: string) => {
      if (!socket || !isConnected || !threadId) return;
      // Hub admins and support use this to close tickets; family/provider use the same
      // event to end their own thread — the server checks the JWT vs thread owner.
      socket.emit('chat:resolve', { threadId });
    },
    [socket, isConnected]
  );

  const reopenChatThread = useCallback(
    (threadId: string) => {
      if (!socket || !isConnected || !threadId) return;
      socket.emit('chat:reopen', { threadId });
    },
    [socket, isConnected]
  );

  // --- Auth (real Supabase if configured, else demo persona-switch) ---
  const login = useCallback(
    async (email?: string, password?: string) => {
      if (auth.isSupabaseConfigured && email && password) {
        const res = await auth.signInWithPassword(email, password);
        return { error: res.error };
      }
      const e = (email || user.email || '').toLowerCase();
      if (e.includes('admin')) {
        setUser(MOCK_ADMIN as any);
        setSession({ id: 'admin' });
        setView('admin-dashboard');
      } else if (e.includes('provider') || e.includes('venu')) {
        setUser(MOCK_PROVIDER_USER as any);
        setSession({ id: 'provider' });
        setView('provider-dashboard');
      } else {
        setUser(MOCK_USER as any);
        setSession({ id: 'user' });
        setView('dashboard');
      }
      return { error: null };
    },
    [auth, user.email]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: AuthRole) => {
      if (auth.isSupabaseConfigured) {
        return auth.signUp(email, password, fullName, role);
      }
      // Demo signup → just upgrade in-memory user
      const next: UserType = {
        id: makeId('user'),
        name: fullName,
        email,
        location: '',
        phoneNumber: '',
        walletBalance: 0,
        escrowBalance: 0,
        role,
        hubId: role === 'child' ? undefined : DEFAULT_HUB,
      };
      setUser(next);
      setSession({ id: next.id });
      setView(role === 'admin' ? 'admin-dashboard' : role === 'provider' ? 'provider-dashboard' : 'dashboard');
      return { error: null };
    },
    [auth]
  );

  const logout = useCallback(async () => {
    await auth.signOut();
    setSession(null);
    setUser(MOCK_USER);
    setView('landing');
  }, [auth]);

  const switchToAdmin = () => {
    setUser(MOCK_ADMIN as any);
    setSession({ id: 'admin' });
    setView('admin-dashboard');
  };

  const switchToUser = () => {
    setUser(MOCK_USER as any);
    setSession({ id: 'user' });
    setView('dashboard');
  };

  const updateProfile = (data: Partial<UserType>) => {
    setUser(prev => ({ ...prev, ...data }));
    setView('dashboard');
  };

  const toggleCategory = (cat: ServiceCategory) => {
    setSelectedCategories(prev => (prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]));
  };

  const startBooking = (category?: ServiceCategory) => {
    setSelectedCategories(category ? [category] : []);
    setView('booking');
  };

  return (
    <AppContext.Provider
      value={{
        session,
        setSession,
        authMode,
        setAuthMode,
        user,
        setUser,
        login,
        signUp,
        logout,
        switchToAdmin,
        switchToUser,
        updateProfile,
        isSupabaseConfigured: auth.isSupabaseConfigured,
        view,
        setView,
        tasks,
        setTasks,
        selectedTask,
        setSelectedTask,
        handleTaskStatusUpdate,
        createTask,
        assignTaskToProvider,
        parents: myParents,
        setParents,
        editingParentId,
        setEditingParentId,
        selectedParentId,
        setSelectedParentId,
        upsertParent,
        patchParent,
        deleteParent,
        hubs,
        setHubs,
        selectedCategories,
        setSelectedCategories,
        toggleCategory,
        startBooking,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        showSOS,
        setShowSOS,
        handleSOS,
        handleSOSAcknowledge,
        wallet,
        transactions,
        topUpWallet,
        notes,
        postNote,
        providers,
        setProviders,
        upsertProvider,
        patchProvider,
        chatThreads,
        chatMessages,
        openChat,
        joinChatThread,
        sendChatMessage,
        markChatRead,
        resolveChatThread,
        reopenChatThread,
        resources: MOCK_RESOURCES,
        services: SERVICES,
        logs: [],
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
