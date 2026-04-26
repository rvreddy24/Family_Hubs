/**
 * Optional Supabase persistence for the full app snapshot.
 *
 * When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, server state is
 * loaded on boot and saved after each mutation. Tasks/hubs are kept in their
 * own columns for backwards compatibility; everything else lives in `extras`
 * so we can extend the model without DDL on every change.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getStateForPersist, setStateFromPersist } from './store';

const STATE_ID = 'main';

function normalizeProjectUrl(u: string): string {
  return u
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
}

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabase) return supabase;
  const raw = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw || !key) return null;
  const url = normalizeProjectUrl(raw);
  supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return supabase;
}

export function isPersistenceEnabled(): boolean {
  return !!getClient();
}

// Track whether the deployed table has the `extras` JSONB column. We optimistically
// assume yes, then fall back to the legacy schema (tasks + hubs only) if Postgres
// reports a missing column. This lets persistence keep working even before the
// migration in supabase/migrations/20260426120000_fh_app_state.sql is applied.
let extrasSupported = true; // re-probed on each server boot

function looksLikeMissingExtras(message: string | undefined | null): boolean {
  if (!message) return false;
  return /extras/i.test(message) && /(does not exist|could not find|column)/i.test(message);
}

/** Load snapshot at boot. */
export async function hydrateFromDatabase(): Promise<void> {
  const client = getClient();
  if (!client) return;

  let data: any = null;
  let error: { message?: string } | null = null;

  if (extrasSupported) {
    const r = await client
      .from('fh_app_state')
      .select('tasks, hubs, extras')
      .eq('id', STATE_ID)
      .maybeSingle();
    data = r.data;
    error = r.error;
    if (error && looksLikeMissingExtras(error.message)) {
      console.warn('[persistence] `extras` column missing — falling back to tasks/hubs only. Apply migration 20260426120000_fh_app_state.sql to enable parents/notes/wallet persistence.');
      extrasSupported = false;
      error = null;
    }
  }

  if (!extrasSupported) {
    const r = await client
      .from('fh_app_state')
      .select('tasks, hubs')
      .eq('id', STATE_ID)
      .maybeSingle();
    data = r.data;
    error = r.error;
  }

  if (error) {
    console.warn('[persistence] hydrate read failed, using seed:', error.message);
    return;
  }
  if (!data) return;

  const extras = (data.extras && typeof data.extras === 'object' ? data.extras : {}) as Record<string, any>;
  setStateFromPersist({
    tasks: Array.isArray(data.tasks) ? data.tasks : undefined,
    hubs: Array.isArray(data.hubs) ? data.hubs : undefined,
    parents: Array.isArray(extras.parents) ? extras.parents : undefined,
    providers: Array.isArray(extras.providers) ? extras.providers : undefined,
    notes: Array.isArray(extras.notes) ? extras.notes : undefined,
    wallets: Array.isArray(extras.wallets) ? extras.wallets : undefined,
    transactions: Array.isArray(extras.transactions) ? extras.transactions : undefined,
    chatThreads: Array.isArray(extras.chatThreads) ? extras.chatThreads : undefined,
    chatMessages: Array.isArray(extras.chatMessages) ? extras.chatMessages : undefined,
  });
  console.log(
    `[persistence] Loaded: ${data.tasks?.length ?? 0} tasks, ${data.hubs?.length ?? 0} hubs, ` +
      `${extras.parents?.length ?? 0} parents, ${extras.providers?.length ?? 0} providers, ` +
      `${extras.notes?.length ?? 0} notes, ${extras.wallets?.length ?? 0} wallets, ` +
      `${extras.transactions?.length ?? 0} txns, ${extras.chatThreads?.length ?? 0} chat threads, ` +
      `${extras.chatMessages?.length ?? 0} chat messages`
  );
}

/** Save snapshot. Best-effort; errors are logged. */
export async function persistState(): Promise<void> {
  const client = getClient();
  if (!client) return;

  const snap = getStateForPersist();
  const baseRow = {
    id: STATE_ID,
    tasks: snap.tasks,
    hubs: snap.hubs,
    updated_at: new Date().toISOString(),
  } as Record<string, any>;

  if (extrasSupported) {
    const { error } = await client.from('fh_app_state').upsert(
      {
        ...baseRow,
        extras: {
          parents: snap.parents,
          providers: snap.providers,
          notes: snap.notes,
          wallets: snap.wallets,
          transactions: snap.transactions,
          chatThreads: snap.chatThreads,
          chatMessages: snap.chatMessages,
        },
      },
      { onConflict: 'id' }
    );
    if (!error) return;
    if (looksLikeMissingExtras(error.message)) {
      console.warn('[persistence] `extras` column missing — saving tasks/hubs only. Apply migration 20260426120000_fh_app_state.sql for full persistence.');
      extrasSupported = false;
    } else {
      console.warn('[persistence] save failed:', error.message);
      return;
    }
  }

  const { error } = await client.from('fh_app_state').upsert(baseRow, { onConflict: 'id' });
  if (error) {
    console.warn('[persistence] save failed:', error.message);
  }
}

/** Optional audit row when Identity Guard completes (see supabase migration). */
export async function logIdentityVerification(row: {
  provider_id: string;
  task_id: string;
  id_asset_url?: string | null;
  face_asset_url?: string | null;
  verified_by: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;
  const { error } = await client.from('fh_identity_verifications').insert({
    provider_id: row.provider_id,
    task_id: row.task_id,
    id_asset_url: row.id_asset_url,
    face_asset_url: row.face_asset_url,
    verified_by: row.verified_by,
  });
  if (error) {
    console.warn('[persistence] identity log failed:', error.message);
  }
}
