/**
 * Live-chat smoke test for FamilyHubs.in support inbox.
 *
 * Drives three authenticated sockets (family / provider / admin) and walks the
 * Amazon-style support flow:
 *
 *   1. Family opens chat        -> admin sees chat:thread:upserted, family gets history
 *   2. Family escalates (system) -> thread.status flips to awaiting_human
 *   3. Family sends free-text   -> admin sees chat:message + notification:push
 *   4. Admin replies            -> family sees chat:message
 *   5. Provider opens chat      -> admin sees a *separate* thread (kind=provider)
 *   6. Provider sends message   -> admin inbox sees it
 *   7. Admin marks resolved     -> all parties see thread.status=resolved + system message
 *
 * Usage: npx tsx scripts/smoke-chat.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { io as ioClient, type Socket } from 'socket.io-client';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';
const HUB = 'hub_mgl';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

interface CapturedEvent {
  who: string;
  name: string;
  payload: any;
  at: number;
}
const events: CapturedEvent[] = [];
const recordEvent = (who: string, name: string, payload: any) =>
  events.push({ who, name, payload, at: Date.now() });
const has = (who: string, name: string, predicate?: (p: any) => boolean) =>
  events.some(e => e.who === who && e.name === name && (!predicate || predicate(e.payload)));
const count = (who: string, name: string, predicate?: (p: any) => boolean) =>
  events.filter(e => e.who === who && e.name === name && (!predicate || predicate(e.payload))).length;

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
  return { token: data.session.access_token, userId: data.user.id };
}

const CHAT_EVENTS = [
  'chat:list',
  'chat:thread:upserted',
  'chat:history',
  'chat:message',
  'chat:typing',
  'notification:push',
];

async function connect(label: string, role: string, token: string, userId: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioClient(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    CHAT_EVENTS.forEach(ev => s.on(ev, (payload: any) => recordEvent(label, ev, payload)));
    s.on('connect_error', err => reject(new Error(`connect_error(${label}): ${err.message}`)));
    s.on('connect', () => {
      s.emit('join:room', { hubId: HUB, userId, role });
      setTimeout(() => resolve(s), 350);
    });
  });
}

async function main() {
  console.log('\n=== FamilyHubs support chat smoke ===');
  console.log(`server: ${SOCKET_URL}`);
  console.log(`hub:    ${HUB}\n`);

  const family = await signIn('family.demo@familyhubs.in', 'FamilyDemo2026!');
  const provider = await signIn('provider.demo@familyhubs.in', 'ProviderDemo2026!');
  const admin = await signIn('admin.demo@familyhubs.in', 'AdminDemo2026!');
  console.log(`family   = ${family.userId}`);
  console.log(`provider = ${provider.userId}`);
  console.log(`admin    = ${admin.userId}\n`);

  const familySock = await connect('family', 'child', family.token, family.userId);
  const providerSock = await connect('provider', 'provider', provider.token, provider.userId);
  const adminSock = await connect('admin', 'admin', admin.token, admin.userId);
  await sleep(400);

  console.log('--- 0. Admin receives chat:list on join ---');
  record('admin chat:list received', has('admin', 'chat:list'));

  // --- 1. Family opens chat ---
  console.log('\n--- 1. Family opens support chat (FAQ → live) ---');
  familySock.emit('chat:open', {
    kind: 'family',
    hubId: HUB,
    userId: family.userId,
    userName: 'Anita Reddy',
    userEmail: 'family.demo@familyhubs.in',
  });
  await sleep(450);

  const familyThreadEvent = events.find(
    e => e.who === 'family' && e.name === 'chat:thread:upserted' && e.payload?.kind === 'family'
  );
  const familyThreadId: string | undefined = familyThreadEvent?.payload?.id;
  record('family received its thread upsert', !!familyThreadId);
  record('family received chat:history (initial)', has('family', 'chat:history', p => p?.threadId === familyThreadId));
  record(
    'admin saw chat:thread:upserted in inbox',
    has('admin', 'chat:thread:upserted', p => p?.id === familyThreadId)
  );

  // --- 2. Family escalates (system) ---
  console.log('\n--- 2. Family escalates to live agent ---');
  familySock.emit('chat:message', {
    threadId: familyThreadId,
    body: 'I’d like to talk to a live agent please.',
    kind: 'system',
  });
  await sleep(350);
  record(
    'admin saw escalation message',
    has('admin', 'chat:message', p => p?.threadId === familyThreadId && p?.kind === 'system')
  );
  record(
    'thread flipped to awaiting_human',
    has('admin', 'chat:thread:upserted', p => p?.id === familyThreadId && p?.status === 'awaiting_human')
  );

  // --- 3. Family sends a real question ---
  console.log('\n--- 3. Family sends a support question ---');
  familySock.emit('chat:message', {
    threadId: familyThreadId,
    body: 'My provider is 30 minutes late, can you check on them?',
  });
  await sleep(350);
  record(
    'admin received family text message',
    has('admin', 'chat:message', p =>
      p?.threadId === familyThreadId && p?.authorRole === 'family' && /30 minutes late/.test(p?.body || '')
    )
  );
  record(
    'admin received notification:push for chat',
    has('admin', 'notification:push', p => p?.type === 'chat')
  );
  record(
    'admin sees unreadForAdmin > 0',
    has('admin', 'chat:thread:upserted', p => p?.id === familyThreadId && (p?.unreadForAdmin ?? 0) > 0)
  );

  // --- 4. Admin replies ---
  console.log('\n--- 4. Admin replies ---');
  adminSock.emit('chat:message', {
    threadId: familyThreadId,
    body: 'I see them en-route now — they should arrive in 5 minutes. Stay safe.',
  });
  await sleep(350);
  record(
    'family received admin reply',
    has('family', 'chat:message', p =>
      p?.threadId === familyThreadId && p?.authorRole === 'admin' && /5 minutes/.test(p?.body || '')
    )
  );
  record(
    'admin reply re-opened the thread (status=open)',
    has('admin', 'chat:thread:upserted', p => p?.id === familyThreadId && p?.status === 'open')
  );

  // --- 5. Family marks read; counter resets ---
  console.log('\n--- 5. Family marks the thread read ---');
  familySock.emit('chat:read', { threadId: familyThreadId, role: 'user' });
  await sleep(250);
  record(
    'thread.unreadForUser=0 after read',
    has('family', 'chat:thread:upserted', p => p?.id === familyThreadId && p?.unreadForUser === 0)
  );

  // --- 6. Provider opens its own thread ---
  console.log('\n--- 6. Provider opens its (separate) chat ---');
  providerSock.emit('chat:open', {
    kind: 'provider',
    hubId: HUB,
    userId: provider.userId,
    userName: 'Ramesh Provider',
    userEmail: 'provider.demo@familyhubs.in',
  });
  await sleep(450);
  const providerThreadEvent = events.find(
    e => e.who === 'provider' && e.name === 'chat:thread:upserted' && e.payload?.kind === 'provider'
  );
  const providerThreadId: string | undefined = providerThreadEvent?.payload?.id;
  record('provider received its thread upsert', !!providerThreadId);
  record(
    'provider thread is distinct from family thread',
    !!providerThreadId && providerThreadId !== familyThreadId
  );
  record(
    'admin saw provider thread in inbox',
    has('admin', 'chat:thread:upserted', p => p?.id === providerThreadId && p?.kind === 'provider')
  );

  // --- 7. Provider sends a message ---
  console.log('\n--- 7. Provider sends a question ---');
  providerSock.emit('chat:message', {
    threadId: providerThreadId,
    body: 'My payout for last week looks lower than expected, can you double check?',
  });
  await sleep(350);
  record(
    'admin received provider message',
    has('admin', 'chat:message', p =>
      p?.threadId === providerThreadId && p?.authorRole === 'provider' && /payout/.test(p?.body || '')
    )
  );
  record(
    'family did NOT receive provider message (cross-thread isolation)',
    !has('family', 'chat:message', p => p?.threadId === providerThreadId)
  );

  // --- 8. Admin resolves the family thread ---
  console.log('\n--- 8. Admin resolves the family thread ---');
  adminSock.emit('chat:resolve', { threadId: familyThreadId });
  await sleep(350);
  record(
    'thread.status=resolved broadcast',
    has('family', 'chat:thread:upserted', p => p?.id === familyThreadId && p?.status === 'resolved')
  );
  record(
    'system "marked as resolved" message arrives',
    has('family', 'chat:message', p =>
      p?.threadId === familyThreadId && p?.kind === 'system' && /resolved/i.test(p?.body || '')
    )
  );

  // --- 9. Auth: random user cannot post into someone else's thread ---
  console.log('\n--- 9. Authorization: provider cannot post into family thread ---');
  const beforeBadCount = count('admin', 'chat:message', p => p?.threadId === familyThreadId);
  providerSock.emit('chat:message', {
    threadId: familyThreadId,
    body: 'I am a malicious provider hijacking the family thread.',
  });
  await sleep(300);
  const afterBadCount = count('admin', 'chat:message', p => p?.threadId === familyThreadId);
  record(
    'rogue provider message into family thread is rejected',
    afterBadCount === beforeBadCount,
    `before=${beforeBadCount} after=${afterBadCount}`
  );

  // --- Cleanup -----------------------------------------------------------------
  familySock.close();
  providerSock.close();
  adminSock.close();

  const passed = tests.filter(t => t.pass).length;
  const failed = tests.length - passed;
  console.log(`\n=== ${passed}/${tests.length} chat checks passed${failed ? `, ${failed} FAILED` : ''} ===\n`);
  if (failed > 0) {
    for (const t of tests.filter(x => !x.pass)) console.log(`  ✗ ${t.name}${t.details ? ` (${t.details})` : ''}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
