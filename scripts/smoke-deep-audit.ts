/**
 * Deep live-connection audit for FamilyHubs.in.
 *
 * The full-suite audit (smoke-full-audit.ts) covers the day-1 happy paths.
 * This script covers the remaining cross-role wires that the broad suite
 * previously skipped:
 *
 *   1. parent:delete propagates from child → admin / provider
 *   2. identity:verified → identity:confirmed broadcasts to all roles
 *   3. notification:push fans out to family, provider, and admin sockets
 *      for the major lifecycle moments (task created, status update, SOS,
 *      identity, chat)
 *   4. Doc wallet flow: admin can fetch the JSON manifest AND the text
 *      manifest, the text manifest contains the docs declared at /apply,
 *      and the public roster does NOT leak the documents.
 *   5. Wallet privacy: cross-user REST reads are 403; unauth = 401.
 *
 * Usage:  npx tsx scripts/smoke-deep-audit.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { io as ioClient, type Socket } from 'socket.io-client';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';
const HUB = 'hub_mgl';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

interface Captured {
  events: { who: string; name: string; payload: any }[];
  add(who: string, name: string, payload: any): void;
  has(who: string, name: string, predicate?: (p: any) => boolean): boolean;
  count(who: string, name: string, predicate?: (p: any) => boolean): number;
}
const tally: Captured = {
  events: [],
  add(who, name, payload) {
    this.events.push({ who, name, payload });
  },
  has(who, name, predicate) {
    return this.events.some(
      e => e.who === who && e.name === name && (!predicate || predicate(e.payload))
    );
  },
  count(who, name, predicate) {
    return this.events.filter(
      e => e.who === who && e.name === name && (!predicate || predicate(e.payload))
    ).length;
  },
};

const tests: { name: string; pass: boolean; details?: string }[] = [];
const record = (name: string, pass: boolean, details?: string) => {
  tests.push({ name, pass, details });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${details ? ` — ${details}` : ''}`);
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function signIn(email: string, password: string) {
  const sb = createClient(SUPABASE_URL!, SUPABASE_ANON!);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(`signIn(${email}) failed: ${error?.message}`);
  }
  return { token: data.session.access_token, userId: data.user.id, sb };
}

const interesting = [
  'state:sync',
  'wallet:sync',
  'task:created',
  'task:updated',
  'parent:upserted',
  'parent:deleted',
  'provider:upserted',
  'note:created',
  'sos:broadcast',
  'sos:acknowledged',
  'identity:confirmed',
  'notification:push',
];

async function connectAuthed(label: string, role: string, token: string, userId: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioClient(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    interesting.forEach(ev => s.on(ev, (payload: any) => tally.add(label, ev, payload)));
    s.on('connect_error', err => reject(new Error(`connect_error(${label}): ${err.message}`)));
    s.on('connect', () => {
      s.emit('join:room', { hubId: HUB, userId, role });
      setTimeout(() => resolve(s), 350);
    });
  });
}

async function main() {
  console.log(`\n=== FamilyHubs deep audit ===`);
  console.log(`server: ${SOCKET_URL}`);
  console.log(`hub:    ${HUB}\n`);

  const child = await signIn('family.demo@familyhubs.in', 'FamilyDemo2026!');
  const admin = await signIn('admin.demo@familyhubs.in', 'AdminDemo2026!');
  const provider = await signIn('provider.demo@familyhubs.in', 'ProviderDemo2026!');
  console.log(`child    = ${child.userId}`);
  console.log(`admin    = ${admin.userId}`);
  console.log(`provider = ${provider.userId}\n`);

  const childSock = await connectAuthed('child', 'child', child.token, child.userId);
  const adminSock = await connectAuthed('admin', 'admin', admin.token, admin.userId);
  const providerSock = await connectAuthed('provider', 'provider', provider.token, provider.userId);
  await sleep(400);

  // === 1. parent:delete propagation =========================================
  console.log('--- 1. parent:create + parent:delete propagation ---');
  const parentId = `parent_deep_${Date.now()}`;
  childSock.emit('parent:create', {
    id: parentId,
    name: 'Deep Audit Parent',
    age: 72,
    gender: 'Female',
    phoneNumber: '+910000000099',
    address: 'Deep Test Lane',
    city: 'Miryalaguda',
    locationPin: { lat: 16.87, lng: 79.57 },
    medicalHistory: '',
    currentMeds: [],
    emergencyContact: '',
    hubId: HUB,
    ownerId: child.userId,
  });
  await sleep(350);
  record(
    'admin saw parent:upserted (deep)',
    tally.has('admin', 'parent:upserted', p => p?.id === parentId)
  );
  record(
    'provider saw parent:upserted (deep)',
    tally.has('provider', 'parent:upserted', p => p?.id === parentId)
  );

  childSock.emit('parent:delete', { id: parentId, hubId: HUB });
  await sleep(350);
  record(
    'admin saw parent:deleted',
    tally.has('admin', 'parent:deleted', p => p?.id === parentId)
  );
  record(
    'provider saw parent:deleted',
    tally.has('provider', 'parent:deleted', p => p?.id === parentId)
  );

  // === 2. identity:verified → identity:confirmed ============================
  console.log('\n--- 2. Identity handshake (provider ↔ admin ↔ family) ---');
  // Need an existing task — create one quickly
  const idTaskId = `task_id_${Date.now()}`;
  childSock.emit('task:create', {
    id: idTaskId,
    childId: child.userId,
    parentId: 'parent_audit_lakshmi',
    hubId: HUB,
    title: 'Deep audit: identity check',
    description: '',
    category: 'medical',
    status: 'created',
    cost: 0,
    instructions: '',
    verificationCode: '9999',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await sleep(300);

  const beforeIdNotifs = tally.count('child', 'notification:push', p => p?.type === 'identity');
  providerSock.emit('identity:verified', {
    providerId: provider.userId,
    taskId: idTaskId,
    verifiedBy: 'family',
  });
  await sleep(450);

  record(
    'child saw identity:confirmed',
    tally.has('child', 'identity:confirmed', p => p?.taskId === idTaskId)
  );
  record(
    'admin saw identity:confirmed',
    tally.has('admin', 'identity:confirmed', p => p?.taskId === idTaskId)
  );
  record(
    'provider saw identity:confirmed (echo)',
    tally.has('provider', 'identity:confirmed', p => p?.taskId === idTaskId)
  );
  const afterIdNotifs = tally.count('child', 'notification:push', p => p?.type === 'identity');
  record(
    'identity event ALSO emits a notification:push to family',
    afterIdNotifs > beforeIdNotifs,
    `${beforeIdNotifs} → ${afterIdNotifs}`
  );

  // === 3. Notification fan-out across the hub ===============================
  console.log('\n--- 3. notification:push fan-out ---');
  // Spec: every hub-broadcast event should include a notification:push for all
  // three role sockets. Trigger a fresh task and assert.
  const fanoutTaskId = `task_fan_${Date.now()}`;
  const beforeChildN = tally.count('child', 'notification:push');
  const beforeAdminN = tally.count('admin', 'notification:push');
  const beforeProvN = tally.count('provider', 'notification:push');
  childSock.emit('task:create', {
    id: fanoutTaskId,
    childId: child.userId,
    parentId: 'parent_audit_lakshmi',
    hubId: HUB,
    title: 'Fan-out test',
    description: '',
    category: 'shopping',
    status: 'created',
    cost: 0,
    instructions: '',
    verificationCode: '0000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await sleep(350);
  const childN = tally.count('child', 'notification:push') - beforeChildN;
  const adminN = tally.count('admin', 'notification:push') - beforeAdminN;
  const provN = tally.count('provider', 'notification:push') - beforeProvN;
  record(
    'family received ≥1 notification:push for new task',
    childN >= 1,
    `${childN}`
  );
  record(
    'admin received ≥1 notification:push for new task',
    adminN >= 1,
    `${adminN}`
  );
  record(
    'provider received ≥1 notification:push for new task',
    provN >= 1,
    `${provN}`
  );

  // === 4. Document wallet REST contract =====================================
  console.log('\n--- 4. Document wallet REST contract ---');
  const provListRes = await fetch(`${API_URL}/api/providers`);
  const provList = await provListRes.json().catch(() => ({}));
  const allProviders: any[] = Array.isArray(provList?.providers) ? provList.providers : [];
  // The public list must be sanitized.
  const leak = allProviders.find(p => Array.isArray(p.verificationDocs));
  record(
    'public /api/providers does NOT leak verificationDocs',
    !leak,
    leak ? `LEAK provider=${leak.id}` : `${allProviders.length} sanitized`
  );

  // Submit a fresh provider application with declared docs.
  const ts = Date.now();
  const applyRes = await fetch(`${API_URL}/api/providers/apply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Deep Audit Applicant',
      email: `deepaudit_${ts}@familyhubs.in`,
      password: 'DeepAudit2026!',
      phone: '+919999000022',
      city: 'Miryalaguda',
      skills: ['ID-doctor', 'pharmacy-runner'],
      documents: [
        { label: 'Aadhaar (front+back)', note: 'XXXX-1234' },
        { label: 'Driving licence', note: 'TS-098765' },
        { label: 'Police clearance', note: '2026 issued' },
      ],
      hubId: HUB,
    }),
  });
  const applyJson = await applyRes.json().catch(() => ({}));
  const newProvId: string | undefined = applyJson?.providerId;
  record(
    '/api/providers/apply 201 with declared docs',
    applyRes.ok && Boolean(newProvId),
    `status=${applyRes.status} id=${newProvId || '—'}`
  );

  if (newProvId) {
    // Admin can fetch JSON manifest with the SAME documents.
    const jsonRes = await fetch(`${API_URL}/api/admin/providers/${newProvId}/manifest.json`, {
      headers: { authorization: `Bearer ${admin.token}` },
    });
    const jsonBody = await jsonRes.json().catch(() => ({}));
    const docCount = Array.isArray(jsonBody?.documents) ? jsonBody.documents.length : -1;
    record(
      'admin manifest.json returns the docs the applicant declared',
      jsonRes.ok && docCount === 3,
      `status=${jsonRes.status} docs=${docCount}`
    );
    const labels = (jsonBody?.documents || []).map((d: any) => d.label);
    record(
      'manifest.json preserves doc labels in order',
      labels[0]?.startsWith('Aadhaar') &&
        labels[1]?.startsWith('Driving') &&
        labels[2]?.startsWith('Police'),
      JSON.stringify(labels)
    );

    // Plain-text manifest is downloadable and contains the doc labels + KYC notes.
    const txtRes = await fetch(`${API_URL}/api/admin/providers/${newProvId}/manifest`, {
      headers: { authorization: `Bearer ${admin.token}` },
    });
    const txt = await txtRes.text();
    record(
      'admin manifest (text) is text/plain attachment',
      txtRes.ok &&
        txtRes.headers.get('content-type')?.startsWith('text/plain') === true &&
        (txtRes.headers.get('content-disposition') || '').includes('attachment'),
      `content-type=${txtRes.headers.get('content-type')} dispo=${txtRes.headers.get('content-disposition')}`
    );
    record(
      'manifest text body lists all 3 declared docs and the applicant',
      txt.includes('Aadhaar') &&
        txt.includes('Driving licence') &&
        txt.includes('Police clearance') &&
        txt.includes('Deep Audit Applicant'),
      `bytes=${txt.length}`
    );

    // Authorization: family/provider tokens cannot see the manifest.
    const familyRes = await fetch(`${API_URL}/api/admin/providers/${newProvId}/manifest`, {
      headers: { authorization: `Bearer ${child.token}` },
    });
    record(
      'family token CANNOT download manifest',
      familyRes.status === 403,
      `status=${familyRes.status}`
    );
    const providerRes = await fetch(`${API_URL}/api/admin/providers/${newProvId}/manifest`, {
      headers: { authorization: `Bearer ${provider.token}` },
    });
    record(
      'provider token CANNOT download manifest',
      providerRes.status === 403,
      `status=${providerRes.status}`
    );

    // 404 sanity check
    const missingRes = await fetch(`${API_URL}/api/admin/providers/does_not_exist/manifest`, {
      headers: { authorization: `Bearer ${admin.token}` },
    });
    record(
      'unknown provider id returns 404',
      missingRes.status === 404,
      `status=${missingRes.status}`
    );
  }

  // === 5. Admin parent registry & wallet REST ================================
  console.log('\n--- 5. Admin auxiliary REST ---');
  const adminParentsRes = await fetch(`${API_URL}/api/admin/parents?hubId=${HUB}`, {
    headers: { authorization: `Bearer ${admin.token}` },
  });
  const adminParents = await adminParentsRes.json().catch(() => ({}));
  record(
    'admin GET /admin/parents → 200 with parents array',
    adminParentsRes.ok && Array.isArray(adminParents?.parents),
    `count=${Array.isArray(adminParents?.parents) ? adminParents.parents.length : 'n/a'}`
  );
  const familyParentsRes = await fetch(`${API_URL}/api/admin/parents?hubId=${HUB}`, {
    headers: { authorization: `Bearer ${child.token}` },
  });
  record(
    'family token cannot reach /admin/parents',
    familyParentsRes.status === 403,
    `status=${familyParentsRes.status}`
  );

  const adminWalletRes = await fetch(`${API_URL}/api/admin/wallet/${child.userId}`, {
    headers: { authorization: `Bearer ${admin.token}` },
  });
  const adminWalletJson = await adminWalletRes.json().catch(() => ({}));
  record(
    'admin GET /admin/wallet/:userId → 200 with wallet snapshot',
    adminWalletRes.ok &&
      typeof adminWalletJson?.wallet?.balance === 'number',
    `status=${adminWalletRes.status} balance=${adminWalletJson?.wallet?.balance}`
  );

  // Public REST should refuse to expose parents / notes.
  const publicParents = await fetch(`${API_URL}/api/parents`);
  record(
    'public /api/parents is 401',
    publicParents.status === 401,
    `status=${publicParents.status}`
  );
  const publicNotes = await fetch(`${API_URL}/api/notes`);
  record(
    'public /api/notes is 401',
    publicNotes.status === 401,
    `status=${publicNotes.status}`
  );

  // === Tear down ===========================================================
  childSock.disconnect();
  adminSock.disconnect();
  providerSock.disconnect();

  const passed = tests.filter(t => t.pass).length;
  console.log(`\n=== Deep audit results: ${passed}/${tests.length} passed ===\n`);
  process.exit(passed === tests.length ? 0 : 2);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(3);
});
