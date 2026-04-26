/**
 * FamilyHubs.in — Single source of truth for shared app state (server process).
 *
 * Holds tasks, hubs, parents, providers, notice-board posts, wallets, and the
 * transaction ledger. Hub-scoped fields are broadcast over Socket.io rooms named
 * `hub:<hubId>`; per-user wallet snapshots are emitted only to the owner.
 *
 * Initialized from the same seed as the client (src/data/initialState.ts) and
 * mirrored to Supabase by ./persistence.ts when SUPABASE_URL / SERVICE_ROLE
 * env vars are configured.
 */
import { INITIAL_HUBS, INITIAL_TASKS } from '../src/data/initialState.ts';

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export interface WalletEntry {
  userId: string;
  balance: number;
  escrow: number;
}

export interface WalletTxn {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit' | 'escrow_lock' | 'escrow_release';
  description: string;
  taskId?: string;
  timestamp: string;
}

export interface NoteRow {
  id: string;
  hubId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export type ChatKind = 'family' | 'provider';
export type ChatStatus = 'open' | 'awaiting_human' | 'resolved';
export type ChatAuthorRole = 'family' | 'provider' | 'admin' | 'bot';

export interface ChatThread {
  id: string;
  kind: ChatKind;
  hubId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
  unreadForAdmin: number;
  unreadForUser: number;
  lastMessage?: string;
  lastAuthorRole?: ChatAuthorRole;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  authorId: string;
  authorRole: ChatAuthorRole;
  authorName: string;
  body: string;
  createdAt: string;
  kind?: 'text' | 'faq' | 'system';
}

interface State {
  tasks: any[];
  hubs: any[];
  parents: any[];
  providers: any[];
  notes: NoteRow[];
  wallets: WalletEntry[];
  transactions: WalletTxn[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
}

const state: State = {
  tasks: deepClone(INITIAL_TASKS),
  hubs: deepClone(INITIAL_HUBS),
  parents: [],
  providers: [],
  notes: [],
  wallets: [],
  transactions: [],
  chatThreads: [],
  chatMessages: [],
};

// --- Snapshots ---
export function getSnapshot() {
  return { tasks: state.tasks, hubs: state.hubs };
}

export function getFullSnapshot() {
  return {
    tasks: state.tasks,
    hubs: state.hubs,
    parents: state.parents,
    providers: state.providers,
    notes: state.notes,
  };
}

export function getStateForPersist() {
  return {
    tasks: state.tasks,
    hubs: state.hubs,
    parents: state.parents,
    providers: state.providers,
    notes: state.notes,
    wallets: state.wallets,
    transactions: state.transactions,
    chatThreads: state.chatThreads,
    chatMessages: state.chatMessages,
  };
}

export function setStateFromPersist(loaded: Partial<State>) {
  if (Array.isArray(loaded.tasks)) state.tasks = loaded.tasks;
  if (Array.isArray(loaded.hubs)) state.hubs = loaded.hubs;
  if (Array.isArray(loaded.parents)) state.parents = loaded.parents;
  if (Array.isArray(loaded.providers)) state.providers = loaded.providers;
  if (Array.isArray(loaded.notes)) state.notes = loaded.notes;
  if (Array.isArray(loaded.wallets)) state.wallets = loaded.wallets;
  if (Array.isArray(loaded.transactions)) state.transactions = loaded.transactions;
  if (Array.isArray(loaded.chatThreads)) state.chatThreads = loaded.chatThreads;
  if (Array.isArray(loaded.chatMessages)) state.chatMessages = loaded.chatMessages;
}

// --- Tasks ---
export function getTasksRef() {
  return state.tasks;
}
export function getTaskById(taskId: string) {
  return state.tasks.find(t => t.id === taskId);
}
export function updateTaskById(taskId: string, fn: (t: any) => any) {
  state.tasks = state.tasks.map(t => (t.id === taskId ? fn(t) : t));
}
export function addTaskToFront(task: any) {
  state.tasks = [task, ...state.tasks];
}

// --- Hubs ---
export function getHubsRef() {
  return state.hubs;
}
export function mapHubs(fn: (h: any) => any) {
  state.hubs = state.hubs.map(fn);
}
export function ensureHub(hubId: string, seed?: Partial<any>) {
  if (!state.hubs.find(h => h.id === hubId)) {
    state.hubs.push({
      id: hubId,
      name: seed?.name || hubId,
      city: seed?.city || '—',
      totalProviders: 0,
      activeJobs: 0,
      emergencyAlerts: 0,
      revenue: 0,
      ...(seed || {}),
    });
  }
}
export function updateHubCounts(hubId: string) {
  const activeJobs = state.tasks.filter(t => t.hubId === hubId && t.status !== 'settled').length;
  const totalProviders = state.providers.filter(p => p.hubId === hubId).length;
  state.hubs = state.hubs.map(h => (h.id === hubId ? { ...h, activeJobs, totalProviders } : h));
}

// --- Parents ---
export function getParentsRef() {
  return state.parents;
}
export function addParent(parent: any) {
  if (!parent?.id) return;
  if (state.parents.find(p => p.id === parent.id)) return;
  state.parents = [...state.parents, parent];
}
export function updateParent(id: string, patch: Record<string, any>) {
  state.parents = state.parents.map(p => (p.id === id ? { ...p, ...patch } : p));
}
export function deleteParent(id: string) {
  state.parents = state.parents.filter(p => p.id !== id);
}
export function getParentsForHub(hubId: string) {
  return state.parents.filter(p => !p.hubId || p.hubId === hubId);
}

// --- Providers ---
export function getProvidersRef() {
  return state.providers;
}
export function addProvider(provider: any) {
  if (!provider?.id) return;
  if (state.providers.find(p => p.id === provider.id)) return;
  state.providers = [...state.providers, provider];
}
export function updateProvider(id: string, patch: Record<string, any>) {
  state.providers = state.providers.map(p => (p.id === id ? { ...p, ...patch } : p));
}
export function deleteProvider(id: string) {
  state.providers = state.providers.filter(p => p.id !== id);
}

// --- Notes / Family Noticeboard ---
export function getNotesRef() {
  return state.notes;
}
export function addNote(note: NoteRow) {
  state.notes = [note, ...state.notes].slice(0, 500);
}
export function getNotesForHub(hubId: string) {
  return state.notes.filter(n => n.hubId === hubId);
}

// --- Wallets ---
export function getWallet(userId: string): WalletEntry {
  let w = state.wallets.find(w => w.userId === userId);
  if (!w) {
    w = { userId, balance: 0, escrow: 0 };
    state.wallets.push(w);
  }
  return { ...w };
}

function mutateWallet(userId: string, delta: { balance?: number; escrow?: number }) {
  const idx = state.wallets.findIndex(w => w.userId === userId);
  if (idx < 0) {
    state.wallets.push({
      userId,
      balance: Math.max(0, delta.balance ?? 0),
      escrow: Math.max(0, delta.escrow ?? 0),
    });
    return getWallet(userId);
  }
  const next = { ...state.wallets[idx] };
  next.balance = Math.max(0, next.balance + (delta.balance ?? 0));
  next.escrow = Math.max(0, next.escrow + (delta.escrow ?? 0));
  state.wallets[idx] = next;
  return { ...next };
}

export function walletCredit(userId: string, amount: number, description: string): { wallet: WalletEntry; txn: WalletTxn } {
  if (amount <= 0) {
    return { wallet: getWallet(userId), txn: makeTxn(userId, 0, 'credit', description) };
  }
  const wallet = mutateWallet(userId, { balance: amount });
  const txn = makeTxn(userId, amount, 'credit', description);
  return { wallet, txn };
}

export function walletLockEscrow(userId: string, amount: number, taskId: string, description: string): { wallet: WalletEntry; txn: WalletTxn } | null {
  const w = getWallet(userId);
  if (w.balance < amount) return null;
  const wallet = mutateWallet(userId, { balance: -amount, escrow: amount });
  const txn = makeTxn(userId, -amount, 'escrow_lock', description, taskId);
  return { wallet, txn };
}

export function walletReleaseEscrow(userId: string, amount: number, taskId: string, description: string): { wallet: WalletEntry; txn: WalletTxn } {
  const wallet = mutateWallet(userId, { escrow: -amount });
  const txn = makeTxn(userId, -amount, 'escrow_release', description, taskId);
  return { wallet, txn };
}

function makeTxn(
  userId: string,
  amount: number,
  type: WalletTxn['type'],
  description: string,
  taskId?: string
): WalletTxn {
  const t: WalletTxn = {
    id: `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    amount,
    type,
    description,
    taskId,
    timestamp: new Date().toISOString(),
  };
  state.transactions = [t, ...state.transactions].slice(0, 1000);
  return t;
}

export function getTxnsForUser(userId: string) {
  return state.transactions.filter(t => t.userId === userId);
}

// --- Chat (support inbox) ---
const CHAT_MESSAGE_CAP = 5000;

export function getChatThreadsRef() {
  return state.chatThreads;
}
export function getChatMessagesRef() {
  return state.chatMessages;
}
export function getChatThreadById(id: string): ChatThread | undefined {
  return state.chatThreads.find(t => t.id === id);
}
export function getChatThreadsForHub(hubId: string): ChatThread[] {
  return state.chatThreads
    .filter(t => t.hubId === hubId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
export function getChatThreadForUser(userId: string, kind: ChatKind, hubId: string): ChatThread | undefined {
  return state.chatThreads.find(t => t.userId === userId && t.kind === kind && t.hubId === hubId);
}
export function getChatMessagesForThread(threadId: string): ChatMessage[] {
  return state.chatMessages
    .filter(m => m.threadId === threadId)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}
export function upsertChatThread(thread: ChatThread): ChatThread {
  const idx = state.chatThreads.findIndex(t => t.id === thread.id);
  if (idx < 0) {
    state.chatThreads = [thread, ...state.chatThreads];
  } else {
    state.chatThreads = state.chatThreads.map(t => (t.id === thread.id ? { ...t, ...thread } : t));
  }
  return getChatThreadById(thread.id)!;
}
export function patchChatThread(id: string, patch: Partial<ChatThread>): ChatThread | undefined {
  state.chatThreads = state.chatThreads.map(t => (t.id === id ? { ...t, ...patch, updatedAt: patch.updatedAt || new Date().toISOString() } : t));
  return getChatThreadById(id);
}
export function appendChatMessage(message: ChatMessage): ChatMessage {
  state.chatMessages = [...state.chatMessages, message].slice(-CHAT_MESSAGE_CAP);
  return message;
}

// --- Reset / dev ---
export function resetToSeed() {
  state.tasks = deepClone(INITIAL_TASKS);
  state.hubs = deepClone(INITIAL_HUBS);
  state.parents = [];
  state.providers = [];
  state.notes = [];
  state.wallets = [];
  state.transactions = [];
  state.chatThreads = [];
  state.chatMessages = [];
}

// --- Legacy compat shims (keep older callers working) ---
export function setFullState(nextTasks: any[], nextHubs: any[]) {
  state.tasks = nextTasks;
  state.hubs = nextHubs;
}
export function setTasksAndHubs(t: any[], h: any[]) {
  state.tasks = t;
  state.hubs = h;
}
