/**
 * Wipe the persisted app state in Supabase (`fh_app_state.id='main'`) so the
 * server boots into a clean slate. After this runs, restart the dev server
 * (or wait for the tsx watcher to reload) and then run seed-demo-accounts.ts.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const seededHub = {
    id: 'hub_mgl',
    name: 'Miryalaguda Hub',
    city: 'Miryalaguda',
    totalProviders: 0,
    activeJobs: 0,
    emergencyAlerts: 0,
    revenue: 0,
  };

  const empty = {
    id: 'main',
    tasks: [],
    hubs: [seededHub],
    extras: { parents: [], providers: [], notes: [], wallets: [], transactions: [] },
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('fh_app_state').upsert(empty, { onConflict: 'id' });
  if (error && /extras/i.test(error.message)) {
    // Schema hasn't run the extras migration; still wipe legacy columns.
    const { error: e2 } = await sb.from('fh_app_state').upsert(
      { id: 'main', tasks: [], hubs: [], updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (e2) {
      console.error('reset failed:', e2.message);
      process.exit(1);
    }
    console.log('reset (legacy schema): tasks/hubs cleared');
    return;
  }
  if (error) {
    console.error('reset failed:', error.message);
    process.exit(1);
  }
  console.log('Reset OK — tasks, hubs, parents, providers, notes, wallets, transactions all cleared.');
  console.log('Restart the dev server (or save a server file) so the in-memory state reloads.');
}

main();
