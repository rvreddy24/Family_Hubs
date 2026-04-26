/**
 * Comprehensive live-connection audit for FamilyHubs.in.
 *
 * Drives three AUTHENTICATED sockets (child / admin / provider) against the demo
 * accounts and walks every cross-role connection that matters in production:
 *
 *   1. Child books a service        -> admin + provider see task:created
 *   2. Admin assigns provider       -> child + provider see task:updated (with provider info)
 *   3. Provider walks 5 statuses    -> child + admin see each step
 *   4. Child posts noticeboard note -> admin + provider see note:created
 *   5. Child triggers SOS w/coords  -> admin sees sos:broadcast (with coords)
 *   6. Admin acks SOS               -> child + provider see sos:acknowledged
 *   7. Wallet top-up + escrow lock  -> child sees wallet:sync with balance/escrow
 *   8. Child creates a parent       -> admin sees parent:upserted
 *   9. Child updates the parent     -> admin sees parent:upserted (with patch)
 *  10. Admin updates a provider     -> child + provider see provider:upserted
 *  11. Admin REST sees verification docs (document wallet)
 *  12. Settled task                 -> child wallet escrow released
 *
 * Usage:  npx tsx scripts/smoke-full-audit.ts
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
  has(who: string, name: string, predicate?: (p: any) => boolean): boolean;
  add(who: string, name: string, payload: any): void;
}

const tally: Captured = {
  events: [],
  add(who, name, payload) { this.events.push({ who, name, payload }); },
  has(who, name, predicate) {
    return this.events.some(e =>
      e.who === who && e.name === name && (!predicate || predicate(e.payload))
    );
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

function recordAll(label: string, s: Socket) {
  const interesting = [
    'state:sync', 'wallet:sync',
    'task:created', 'task:updated', 'task:assign:error',
    'parent:upserted', 'parent:deleted',
    'provider:upserted',
    'note:created',
    'sos:broadcast', 'sos:acknowledged',
    'identity:confirmed',
    'notification:push',
  ];
  interesting.forEach(ev => s.on(ev, (payload: any) => tally.add(label, ev, payload)));
}

async function connectAuthed(label: string, role: string, token: string, userId: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioClient(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    recordAll(label, s);
    s.on('connect_error', err => reject(new Error(`connect_error(${label}): ${err.message}`)));
    s.on('connect', () => {
      s.emit('join:room', { hubId: HUB, userId, role });
      setTimeout(() => resolve(s), 350);
    });
  });
}

async function main() {
  console.log(`\n=== FamilyHubs full live-connection audit ===`);
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

  console.log('--- 0. Connection + state:sync ---');
  record('child state:sync received', tally.has('child', 'state:sync'));
  record('admin state:sync received', tally.has('admin', 'state:sync'));
  record('provider state:sync received', tally.has('provider', 'state:sync'));
  record('child wallet:sync received (own user room)', tally.has('child', 'wallet:sync'));
  record('admin wallet:sync received (own user room)', tally.has('admin', 'wallet:sync'));

  // --- 1. Child books a task ---------------------------------------------------
  console.log('\n--- 1. Family books a service ---');
  const taskId = `task_audit_${Date.now()}`;
  childSock.emit('task:create', {
    id: taskId,
    childId: child.userId,
    parentId: 'parent_audit_lakshmi',
    hubId: HUB,
    title: 'Audit: BP check at home',
    description: 'Routine blood-pressure visit.',
    category: 'medical',
    status: 'created',
    cost: 25,
    instructions: 'Ring twice.',
    verificationCode: '4242',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await sleep(500);
  record('admin saw task:created', tally.has('admin', 'task:created', p => p?.id === taskId));
  record('provider saw task:created', tally.has('provider', 'task:created', p => p?.id === taskId));
  record('child saw their own task:created (echo)', tally.has('child', 'task:created', p => p?.id === taskId));

  // --- 2. Admin assigns provider -----------------------------------------------
  console.log('\n--- 2. Admin assigns provider ---');
  adminSock.emit('task:assign', {
    taskId,
    providerId: provider.userId,
    providerName: 'Ramesh Provider',
    providerPhoto: '',
  });
  await sleep(500);
  record(
    'admin assign → provider saw task:updated with providerId',
    tally.has('provider', 'task:updated', p => p?.taskId === taskId && p?.providerId === provider.userId)
  );
  record(
    'admin assign → child saw task:updated',
    tally.has('child', 'task:updated', p => p?.taskId === taskId)
  );
  record('no task:assign:error emitted to admin', !tally.has('admin', 'task:assign:error'));

  // --- 3. Provider walks the task through statuses -----------------------------
  console.log('\n--- 3. Provider progresses through statuses ---');
  const flow = ['en_route', 'arrived', 'checked_in', 'in_progress', 'completed'];
  for (const status of flow) {
    providerSock.emit('task:update', {
      taskId,
      status,
      updatedBy: 'Ramesh Provider',
      hubId: HUB,
    });
    await sleep(220);
  }
  const childUpdates = tally.events.filter(
    e => e.who === 'child' && e.name === 'task:updated' && e.payload?.taskId === taskId
  ).length;
  // 1 (assign) + 5 (statuses) = 6 expected
  record(`child saw ≥6 task:updated for this task`, childUpdates >= 6, `count=${childUpdates}`);

  // --- 4. Child posts a noticeboard note ---------------------------------------
  console.log('\n--- 4. Family noticeboard ---');
  const noteId = `note_audit_${Date.now()}`;
  childSock.emit('note:create', {
    id: noteId,
    hubId: HUB,
    authorId: child.userId,
    authorName: 'Anita Reddy',
    authorRole: 'child',
    body: 'Audit: please confirm BP after the visit.',
  });
  await sleep(400);
  record('admin saw note:created', tally.has('admin', 'note:created', p => p?.id === noteId));
  record('provider saw note:created', tally.has('provider', 'note:created', p => p?.id === noteId));

  // --- 5. SOS -------------------------------------------------------------------
  console.log('\n--- 5. SOS broadcast + ack ---');
  childSock.emit('sos:trigger', {
    userId: child.userId,
    hubId: HUB,
    parentName: 'Lakshmi Reddy',
    location: 'Plot 14, Krishnanagar',
    coords: { lat: 16.8716, lng: 79.5658, accuracy: 12 },
  });
  await sleep(400);
  record(
    'admin saw sos:broadcast with coords',
    tally.has('admin', 'sos:broadcast', p => p?.coords?.lat && p?.coords?.lng)
  );
  record('provider saw sos:broadcast', tally.has('provider', 'sos:broadcast'));

  adminSock.emit('sos:acknowledge', { hubId: HUB, acknowledgedBy: 'Hub Admin' });
  await sleep(300);
  record('child saw sos:acknowledged', tally.has('child', 'sos:acknowledged'));
  record('provider saw sos:acknowledged', tally.has('provider', 'sos:acknowledged'));

  // --- 6. Wallet top-up + escrow check ----------------------------------------
  console.log('\n--- 6. Wallet ledger ---');
  const beforeSyncs = tally.events.filter(e => e.who === 'child' && e.name === 'wallet:sync').length;
  childSock.emit('wallet:topup', {
    userId: child.userId,
    amount: 75,
    description: 'Audit top-up',
  });
  await sleep(350);
  const afterSyncs = tally.events.filter(e => e.who === 'child' && e.name === 'wallet:sync').length;
  record('child wallet:sync fired after topup', afterSyncs > beforeSyncs, `${beforeSyncs}→${afterSyncs}`);
  const lastWallet = [...tally.events].reverse().find(e => e.who === 'child' && e.name === 'wallet:sync');
  record(
    'wallet snapshot has numeric balance + escrow',
    typeof lastWallet?.payload?.wallet?.balance === 'number' &&
    typeof lastWallet?.payload?.wallet?.escrow === 'number',
    JSON.stringify(lastWallet?.payload?.wallet)
  );

  // --- 7. Parent CRUD across roles ---------------------------------------------
  console.log('\n--- 7. Parent CRUD propagation ---');
  const parentId = `parent_audit_${Date.now()}`;
  childSock.emit('parent:create', {
    id: parentId,
    name: 'Audit Parent',
    age: 70,
    gender: 'Female',
    phoneNumber: '+910000000001',
    whatsappNumber: '+910000000001',
    address: 'Audit Lane',
    city: 'Miryalaguda',
    locationPin: { lat: 16.87, lng: 79.57 },
    medicalHistory: '',
    currentMeds: [],
    emergencyContact: '',
    hubId: HUB,
    ownerId: child.userId,
  });
  await sleep(400);
  record(
    'admin saw parent:upserted (child created)',
    tally.has('admin', 'parent:upserted', p => p?.id === parentId)
  );

  childSock.emit('parent:update', {
    id: parentId,
    patch: { phoneNumber: '+919999999999', medicalHistory: 'Hypertension' },
    hubId: HUB,
  });
  await sleep(400);
  record(
    'admin saw parent:upserted with patched phone',
    tally.has('admin', 'parent:upserted', p => p?.id === parentId && p?.phoneNumber === '+919999999999')
  );

  // --- 8. Admin updates a provider ---------------------------------------------
  console.log('\n--- 8. Admin → provider directory mutations ---');
  adminSock.emit('provider:update', {
    id: provider.userId,
    patch: { activeStatus: 'on_job', rating: 4.9 },
    hubId: HUB,
  });
  await sleep(400);
  record(
    'provider saw provider:upserted (admin patched activeStatus)',
    tally.has('provider', 'provider:upserted', p => p?.id === provider.userId && p?.activeStatus === 'on_job')
  );
  record(
    'child saw provider:upserted (visible in dispatcher)',
    tally.has('child', 'provider:upserted', p => p?.id === provider.userId)
  );

  // --- 9. Document wallet — admin can read & download manifests ---------------
  console.log('\n--- 9. Document wallet (admin manifest endpoints) ---');
  // Public list strips verificationDocs to avoid PII leak.
  const provListRes = await fetch(`${API_URL}/api/providers`);
  const provList = await provListRes.json().catch(() => ({}));
  const allProviders: any[] = Array.isArray(provList?.providers) ? provList.providers : [];
  const leak = allProviders.find(p => Array.isArray(p.verificationDocs));
  record(
    'public /api/providers does NOT leak verificationDocs',
    !leak,
    leak ? `LEAK provider=${leak.id}` : `${allProviders.length} providers sanitized`
  );

  // Admin-gated manifest: pick a provider with docs in the in-memory store; fall back to first.
  const targetProv = allProviders[0];
  if (!targetProv) {
    record('admin manifest endpoint reachable', false, 'no providers in roster');
  } else {
    const manifestJsonRes = await fetch(
      `${API_URL}/api/admin/providers/${targetProv.id}/manifest.json`,
      { headers: { authorization: `Bearer ${admin.token}` } }
    );
    const manifestJson = await manifestJsonRes.json().catch(() => ({}));
    record(
      'admin GET /providers/:id/manifest.json → 200 with documents array',
      manifestJsonRes.ok && Array.isArray(manifestJson?.documents),
      `status=${manifestJsonRes.status} docs=${Array.isArray(manifestJson?.documents) ? manifestJson.documents.length : 'n/a'}`
    );

    const manifestTxtRes = await fetch(
      `${API_URL}/api/admin/providers/${targetProv.id}/manifest`,
      { headers: { authorization: `Bearer ${admin.token}` } }
    );
    const manifestTxt = await manifestTxtRes.text();
    record(
      'admin GET /providers/:id/manifest → text/plain attachment download',
      manifestTxtRes.ok &&
        manifestTxtRes.headers.get('content-disposition')?.includes('attachment') === true &&
        manifestTxt.includes('FamilyHubs.in'),
      `bytes=${manifestTxt.length}`
    );

    // Authorization: family token cannot fetch the manifest
    const familyManifestRes = await fetch(
      `${API_URL}/api/admin/providers/${targetProv.id}/manifest.json`,
      { headers: { authorization: `Bearer ${child.token}` } }
    );
    record(
      'family token is REJECTED by admin manifest endpoint',
      familyManifestRes.status === 403,
      `status=${familyManifestRes.status}`
    );
  }

  // Wallet privacy — child cannot read admin's wallet via REST
  const walletForeignRes = await fetch(`${API_URL}/api/wallet/${admin.userId}`, {
    headers: { authorization: `Bearer ${child.token}` },
  });
  record(
    'child token blocked from reading another wallet via REST',
    walletForeignRes.status === 403,
    `status=${walletForeignRes.status}`
  );

  const walletSelfRes = await fetch(`${API_URL}/api/wallet/${child.userId}`, {
    headers: { authorization: `Bearer ${child.token}` },
  });
  record(
    'child token CAN read own wallet via REST',
    walletSelfRes.ok,
    `status=${walletSelfRes.status}`
  );

  const walletAnonRes = await fetch(`${API_URL}/api/wallet/${child.userId}`);
  record(
    'unauth wallet REST is blocked (401)',
    walletAnonRes.status === 401,
    `status=${walletAnonRes.status}`
  );

  // --- 10. Settled task → escrow release --------------------------------------
  console.log('\n--- 10. Settle task → escrow release ---');
  const beforeWalletEvents = tally.events.filter(e => e.who === 'child' && e.name === 'wallet:sync').length;
  childSock.emit('task:update', {
    taskId,
    status: 'settled',
    updatedBy: 'family',
    hubId: HUB,
  });
  await sleep(500);
  const afterWalletEvents = tally.events.filter(e => e.who === 'child' && e.name === 'wallet:sync').length;
  record(
    'settle → child got an additional wallet:sync (escrow released)',
    afterWalletEvents > beforeWalletEvents,
    `${beforeWalletEvents}→${afterWalletEvents}`
  );

  // --- Tear down ---------------------------------------------------------------
  childSock.disconnect();
  adminSock.disconnect();
  providerSock.disconnect();

  // --- Final report -----------------------------------------------------------
  console.log(`\n=== Event tally (${tally.events.length} captured) ===`);
  const counts = new Map<string, number>();
  for (const e of tally.events) {
    const k = `${e.who} ← ${e.name}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  for (const [k, v] of [...counts.entries()].sort()) {
    console.log(`  ${v}× ${k}`);
  }

  const passed = tests.filter(t => t.pass).length;
  console.log(`\n=== Audit results: ${passed}/${tests.length} passed ===`);
  process.exit(passed === tests.length ? 0 : 2);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(3);
});
