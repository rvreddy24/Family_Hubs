/**
 * E2E smoke for the Uber/Zomato-style provider self-onboarding flow.
 *
 *  1. Anyone POSTs /api/providers/apply with name/email/password/phone/skills/docs
 *     → server creates the auth user with role=provider in app_metadata,
 *       and a Provider record with verified:false in the live store.
 *  2. Applicant signs in, verifies they get role=provider on the JWT but
 *     verified:false on their Provider record.
 *  3. Admin tries to assign a task to the unverified provider → server rejects
 *     via task:assign:error.
 *  4. Admin flips verified:true via socket provider:update.
 *  5. Admin re-tries task:assign → succeeds, task appears on the provider's
 *     own user-room socket.
 *
 * Anything failing means the gate is broken.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { io as ioClient, Socket } from 'socket.io-client';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';

if (!SUPABASE_URL || !SUPABASE_ANON || !SERVICE_KEY) {
  console.error('Missing Supabase env. Need URL, ANON, and SERVICE_ROLE.');
  process.exit(1);
}

const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(email: string, password: string) {
  const sb = createClient(SUPABASE_URL!, SUPABASE_ANON!);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn(${email}) failed: ${error?.message}`);
  return { sb, session: data.session, token: data.session.access_token };
}

async function connect(token: string, role: string, hubId = 'hub_mgl', userId?: string) {
  const sock = ioClient(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  await new Promise<void>((resolve, reject) => {
    sock.once('connect', () => resolve());
    sock.once('connect_error', err => reject(err));
  });
  sock.emit('join:room', { role, hubId, userId });
  await new Promise(r => setTimeout(r, 200));
  return sock;
}

function once<T>(sock: Socket, event: string, ms = 2000): Promise<T | null> {
  return new Promise(resolve => {
    const t = setTimeout(() => { sock.off(event, listener); resolve(null); }, ms);
    const listener = (payload: T) => { clearTimeout(t); sock.off(event, listener); resolve(payload); };
    sock.on(event, listener);
  });
}

(async () => {
  const tests: { name: string; pass: boolean; details?: string }[] = [];
  const stamp = Date.now();
  const applicantEmail = `applicant_${stamp}@example.com`;
  const applicantPassword = 'ApplyTest123!';

  // ---------- 1. Apply ----------
  const applyRes = await fetch(`${API_URL}/api/providers/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Applicant',
      email: applicantEmail,
      password: applicantPassword,
      phone: '+91 90000 00033',
      city: 'Miryalaguda',
      skills: ['medical', 'pharmacy'],
      documents: [{ label: 'Aadhaar', note: 'Have valid Aadhaar' }],
    }),
  });
  const applyJson = await applyRes.json().catch(() => ({}));
  console.log('[apply] status', applyRes.status, applyJson.message || applyJson.error);
  tests.push({
    name: '/api/providers/apply 201',
    pass: applyRes.status === 201 && Boolean(applyJson.providerId),
    details: `status=${applyRes.status}`,
  });
  const applicantId: string = applyJson.providerId;

  // ---------- 2. Applicant signs in; check role + verified ----------
  const applicant = await signIn(applicantEmail, applicantPassword);
  const userResp = await sbAdmin.auth.admin.getUserById(applicantId);
  const appMetaRole = (userResp.data.user?.app_metadata as Record<string, any>)?.role;
  tests.push({
    name: 'app_metadata.role = provider for applicant',
    pass: appMetaRole === 'provider',
    details: `role=${appMetaRole}`,
  });

  const provListRes = await fetch(`${API_URL}/api/providers`);
  const provList = await provListRes.json();
  const providerEntry = (provList.providers || []).find((p: any) => p.id === applicantId);
  tests.push({
    name: 'Provider record exists with verified:false',
    pass: Boolean(providerEntry) && providerEntry.verified === false,
    details: `entry=${JSON.stringify(providerEntry?.verified)}`,
  });

  // ---------- 3. Admin tries to assign → should reject ----------
  const admin = await signIn('admin.demo@familyhubs.in', 'AdminDemo2026!');
  const adminSock = await connect(admin.token, 'admin', 'hub_mgl', admin.session.user.id);

  // Need an existing task. Use any task in state, or create one as the demo family.
  const stateRes = await fetch(`${API_URL}/api/state`);
  const state = await stateRes.json();
  let taskId: string | undefined = state.tasks?.[0]?.id;
  if (!taskId) {
    const family = await signIn('family.demo@familyhubs.in', 'FamilyDemo2026!');
    const familySock = await connect(family.token, 'child', 'hub_mgl', family.session.user.id);
    taskId = `task_${stamp}`;
    familySock.emit('task:create', {
      task: {
        id: taskId,
        title: 'Test pharmacy run',
        category: 'pharmacy',
        status: 'created',
        cost: 30,
        childId: family.session.user.id,
        hubId: 'hub_mgl',
        createdAt: new Date().toISOString(),
      },
    });
    await new Promise(r => setTimeout(r, 600));
    familySock.close();
  }

  const errPromise = once<any>(adminSock, 'task:assign:error', 1500);
  adminSock.emit('task:assign', {
    taskId,
    providerId: applicantId,
    providerName: 'E2E Applicant',
  });
  const rejectMsg = await errPromise;
  tests.push({
    name: 'task:assign rejected for unverified provider',
    pass: Boolean(rejectMsg) && /verif/i.test(String(rejectMsg?.error || '')),
    details: rejectMsg ? rejectMsg.error : 'no task:assign:error',
  });

  // ---------- 4. Admin verifies the provider ----------
  adminSock.emit('provider:update', { id: applicantId, patch: { verified: true }, hubId: 'hub_mgl' });
  await new Promise(r => setTimeout(r, 500));

  const provListRes2 = await fetch(`${API_URL}/api/providers`);
  const provList2 = await provListRes2.json();
  const verifiedEntry = (provList2.providers || []).find((p: any) => p.id === applicantId);
  tests.push({
    name: 'admin can flip verified:true',
    pass: verifiedEntry?.verified === true,
    details: `verified=${verifiedEntry?.verified}`,
  });

  // ---------- 5. Now retry assign → should succeed ----------
  const applicantSock = await connect(applicant.token, 'provider', 'hub_mgl', applicantId);
  const updatedPromise = once<any>(applicantSock, 'task:updated', 2000);
  adminSock.emit('task:assign', {
    taskId,
    providerId: applicantId,
    providerName: 'E2E Applicant',
  });
  const taskUpdated = await updatedPromise;
  tests.push({
    name: 'task:assign succeeds after verification',
    pass: Boolean(taskUpdated) && taskUpdated?.providerId === applicantId,
    details: taskUpdated ? `status=${taskUpdated.status}` : 'no task:updated',
  });

  // ---------- Cleanup ----------
  adminSock.close();
  applicantSock.close();
  await sbAdmin.auth.admin.deleteUser(applicantId).catch(() => {});

  console.log('\n=== provider-apply smoke ===');
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
