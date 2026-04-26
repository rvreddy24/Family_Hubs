/**
 * Optional: sync Supabase Auth for demo users (same logic as server boostrap).
 * The API process also runs this on startup via `server/demoProvision.ts`.
 *
 * Use this when you need to refresh passwords without restarting the server.
 * In-memory parent/provider/wallet are applied when the server next starts (or already in memory).
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 *
 *   npx tsx scripts/seed-demo-accounts.ts
 */
import 'dotenv/config';
import { provisionSupabaseAuthUsers } from '../server/demoProvision';
import { DEMO_FAMILY, DEMO_PROVIDER, DEMO_HUB_ADMIN } from '../server/demoConfig';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env');
    process.exit(1);
  }
  await provisionSupabaseAuthUsers(url, key);
  console.log('\n=== Sign-in (no SQL) — see server/demoConfig.ts ===');
  console.log(`Child:    ${DEMO_FAMILY.email} / ${DEMO_FAMILY.password}`);
  console.log(`Provider: ${DEMO_PROVIDER.email} / ${DEMO_PROVIDER.password}`);
  console.log(`Admin:    ${DEMO_HUB_ADMIN.email} / ${DEMO_HUB_ADMIN.password} (only if DEMO_PROVISION_HUB_ADMIN=1 on the server)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
