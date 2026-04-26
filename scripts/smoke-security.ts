/**
 * Security smoke test for the role hardening.
 *
 *  1. Sign in as the family (child) demo user. Try to forge admin role via
 *     `supabase.auth.updateUser({ data: { role: 'admin' } })` and confirm:
 *       - the server's REST `/api/admin/providers/invite` still rejects with 403
 *       - the socket `provider:create` is rejected (admin role required)
 *  2. Sign in as the admin demo user and confirm:
 *       - the same REST endpoint accepts the request and creates a provider
 *
 * Pass criteria: every "expected reject" actually rejects, and the admin path
 * succeeds with HTTP 201. Fail criteria: any privilege escalation path slips through.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { io as ioClient } from 'socket.io-client';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing Supabase env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

async function signIn(email: string, password: string) {
  const sb = createClient(SUPABASE_URL!, SUPABASE_ANON!);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn(${email}) failed: ${error?.message}`);
  return { sb, session: data.session };
}

async function postInvite(token: string, payload: any) {
  const res = await fetch(`${API_URL}/api/admin/providers/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function trySocketProviderCreate(token: string, label: string) {
  return await new Promise<{ accepted: boolean; reason?: string }>(resolve => {
    const sock = ioClient(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    let resolved = false;
    const finish = (accepted: boolean, reason?: string) => {
      if (resolved) return;
      resolved = true;
      sock.close();
      resolve({ accepted, reason });
    };
    sock.on('connect_error', err => finish(false, `connect_error: ${err.message}`));
    sock.on('provider:upserted', p => {
      if (p?.id?.startsWith('attack_')) finish(true);
    });
    sock.on('connect', () => {
      sock.emit('join:room', { hubId: 'hub_mgl' });
      sock.emit('provider:create', {
        id: `attack_${Date.now()}_${label}`,
        name: `Forged ${label}`,
        skills: ['admin'],
        verified: true,
        activeStatus: 'idle',
        rating: 0,
        totalJobs: 0,
        joinedAt: new Date().toISOString(),
      });
      setTimeout(() => finish(false, 'no provider:upserted echo within 2s'), 2000);
    });
  });
}

(async () => {
  const tests: { name: string; pass: boolean; details?: string }[] = [];

  console.log('--- Test 1: family user forges role + invites a provider ---');
  const family = await signIn('family.demo@familyhubs.in', 'FamilyDemo2026!');
  // Attempt to self-promote via user_metadata (this used to be the privilege bypass).
  await family.sb.auth.updateUser({ data: { role: 'admin' } });
  const family2 = await family.sb.auth.refreshSession();
  const familyToken = family2.data.session?.access_token || family.session.access_token;

  const inv1 = await postInvite(familyToken, {
    email: `forged_${Date.now()}@example.com`,
    password: 'Hacker123!',
    name: 'Forged Provider',
  });
  console.log('  REST status:', inv1.status, inv1.body?.error || '');
  tests.push({
    name: 'family-forged → REST /admin/providers/invite is rejected',
    pass: inv1.status === 403,
    details: `status=${inv1.status} error=${inv1.body?.error}`,
  });

  const sock1 = await trySocketProviderCreate(familyToken, 'family');
  console.log('  Socket attempt accepted?', sock1.accepted, sock1.reason || '');
  tests.push({
    name: 'family-forged → socket provider:create is rejected',
    pass: !sock1.accepted,
    details: sock1.reason,
  });

  console.log('\n--- Test 2: real admin invites a provider ---');
  const admin = await signIn('admin.demo@familyhubs.in', 'AdminDemo2026!');
  const inv2 = await postInvite(admin.session.access_token, {
    email: `invited_${Date.now()}@familyhubs.in`,
    password: 'TempProvider123!',
    name: 'E2E Invited Provider',
    phone: '+91 90000 00099',
    skills: ['medical', 'pharmacy'],
  });
  console.log('  REST status:', inv2.status, inv2.body?.message || inv2.body?.error || '');
  tests.push({
    name: 'admin → REST /admin/providers/invite succeeds',
    pass: inv2.status === 201 && Boolean(inv2.body?.provider?.id),
    details: `status=${inv2.status} providerId=${inv2.body?.provider?.id}`,
  });

  console.log('\n=== Security smoke results ===');
  let allPass = true;
  for (const t of tests) {
    const tag = t.pass ? 'PASS' : 'FAIL';
    if (!t.pass) allPass = false;
    console.log(`  [${tag}] ${t.name}${t.details ? ` — ${t.details}` : ''}`);
  }
  process.exit(allPass ? 0 : 2);
})().catch(err => {
  console.error('FATAL', err);
  process.exit(3);
});
