/**
 * Removes the throwaway accounts created by smoke tests (invited_* and forged_*).
 * Keeps demo accounts (family/admin/provider.demo@familyhubs.in) intact.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

(async () => {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) { console.error(error); process.exit(1); }
  for (const u of data.users) {
    if (!u.email) continue;
    if (u.email.startsWith('invited_') || u.email.startsWith('forged_')) {
      const { error: delErr } = await sb.auth.admin.deleteUser(u.id);
      console.log(`${delErr ? 'fail' : ' del'} ${u.email}${delErr ? ` (${delErr.message})` : ''}`);
    }
  }
})();
