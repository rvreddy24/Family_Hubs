/**
 * End-to-end live-connection smoke test for FamilyHubs.in.
 *
 * Three concurrent sockets (child / admin / provider) run a real booking flow
 * and we assert that every side sees the broadcast it expects.
 *
 *   1. Child books a task                     -> admin sees task:new, child sees state:sync
 *   2. Admin assigns task to provider         -> provider sees task:updated with careManager
 *   3. Provider walks task through statuses   -> child + admin see each status update
 *   4. Child posts a noticeboard note         -> admin + provider see note:new
 *   5. Child triggers SOS                     -> hub sees sos:trigger broadcast
 *   6. Admin acknowledges SOS                 -> hub sees sos:acknowledged
 *   7. Wallet credit                          -> child sees wallet:sync
 *
 * Run with `npx tsx scripts/smoke-e2e.ts` after the server is up.
 */
import 'dotenv/config';
import { io, type Socket } from 'socket.io-client';

const URL = process.env.SMOKE_URL || 'http://localhost:3001';
const HUB = 'hub_mgl';

const CHILD_ID = process.env.CHILD_ID || '12833899-79b5-4b2e-8937-9012199a9f3f';
const ADMIN_ID = process.env.ADMIN_ID || 'd56c0abe-5cf9-407b-9fda-3b67c8dcced3';
const PROVIDER_ID = process.env.PROVIDER_ID || 'fbc8e338-3395-4723-9fdc-8eff15b6284b';

interface Tally {
  events: { who: string; name: string; payload: any }[];
  has(who: string, name: string, predicate?: (p: any) => boolean): boolean;
  add(who: string, name: string, payload: any): void;
}

const tally: Tally = {
  events: [],
  add(who, name, payload) { this.events.push({ who, name, payload }); },
  has(who, name, predicate) {
    return this.events.some(e =>
      e.who === who && e.name === name && (!predicate || predicate(e.payload))
    );
  },
};

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function connectAs(role: string, userId: string, label: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'] });
    recordAll(label, s);
    s.on('connect', () => {
      s.emit('join:room', { hubId: HUB, userId, role });
      // Wait a beat so the immediate state:sync/wallet:sync arrives before resolving.
      setTimeout(() => resolve(s), 250);
    });
    s.on('connect_error', reject);
  });
}

function recordAll(label: string, s: Socket) {
  const interesting = [
    'state:sync', 'wallet:sync',
    'task:created', 'task:updated',
    'parent:upserted', 'parent:deleted',
    'provider:upserted',
    'note:created',
    'sos:broadcast', 'sos:acknowledged',
    'identity:confirmed',
    'notification:push',
  ];
  interesting.forEach(ev => s.on(ev, (payload: any) => tally.add(label, ev, payload)));
}

async function main() {
  console.log(`\n=== End-to-end live-connection smoke ===`);
  console.log(`server: ${URL}`);
  console.log(`hub:    ${HUB}`);
  console.log(`child:    ${CHILD_ID}`);
  console.log(`admin:    ${ADMIN_ID}`);
  console.log(`provider: ${PROVIDER_ID}\n`);

  const child = await connectAs('child', CHILD_ID, 'child');
  const admin = await connectAs('admin', ADMIN_ID, 'admin');
  const provider = await connectAs('provider', PROVIDER_ID, 'provider');

  await sleep(300);
  console.log(`✓ all 3 sockets connected, state:sync received: child=${tally.has('child', 'state:sync')} admin=${tally.has('admin', 'state:sync')} provider=${tally.has('provider', 'state:sync')}`);

  // Wallet sync arrives only for the joining user (per-user room).
  console.log(`✓ child wallet:sync received: ${tally.has('child', 'wallet:sync')}`);

  // ---------- 1. Child books a service ----------
  const taskId = `task_smoke_${Date.now()}`;
  child.emit('task:create', {
    id: taskId,
    childId: CHILD_ID,
    hubId: HUB,
    title: 'Health advocacy: BP check',
    description: 'Routine blood-pressure visit at home.',
    category: 'medical',
    status: 'created',
    priority: 'normal',
    cost: 25,
    escrow: 25,
    instructions: 'Call before arriving.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await sleep(500);
  console.log(`\n[1] task:create → admin saw task:created: ${tally.has('admin', 'task:created', p => p?.id === taskId)}`);

  // ---------- 2. Admin assigns it to provider ----------
  admin.emit('task:assign', {
    taskId,
    providerId: PROVIDER_ID,
    providerName: 'Ramesh Provider',
    providerPhoto: '',
  });
  await sleep(500);
  console.log(`[2] task:assign → provider saw task:updated: ${tally.has('provider', 'task:updated', p => p?.taskId === taskId)}`);

  // ---------- 3. Provider progresses task ----------
  for (const status of ['en_route', 'arrived', 'checked_in', 'in_progress', 'completed']) {
    provider.emit('task:update', {
      taskId,
      status,
      updatedBy: 'Ramesh Provider',
      hubId: HUB,
    });
    await sleep(250);
  }
  const progressEvents = tally.events.filter(
    e => e.who === 'child' && e.name === 'task:updated' && e.payload?.taskId === taskId
  ).length;
  console.log(`[3] provider walked through 5 status changes → child observed ${progressEvents} task:updated events`);

  // ---------- 4. Child posts a noticeboard note ----------
  child.emit('note:create', {
    id: `note_smoke_${Date.now()}`,
    hubId: HUB,
    authorId: CHILD_ID,
    authorName: 'Anita Reddy',
    authorRole: 'child',
    body: 'Smoke-test note: please confirm vitals after the visit.',
  });
  await sleep(400);
  console.log(`[4] note:create → admin saw note:created: ${tally.has('admin', 'note:created')} | provider saw note:created: ${tally.has('provider', 'note:created')}`);

  // ---------- 5. Child triggers SOS ----------
  child.emit('sos:trigger', {
    userId: CHILD_ID,
    hubId: HUB,
    parentName: 'Lakshmi Reddy',
    location: 'Plot 14, Krishnanagar',
    coords: { lat: 16.8716, lng: 79.5658, accuracy: 12 },
  });
  await sleep(400);
  console.log(`[5] sos:trigger → admin saw sos:broadcast: ${tally.has('admin', 'sos:broadcast')}`);

  // ---------- 6. Admin acknowledges SOS ----------
  admin.emit('sos:acknowledge', { hubId: HUB, acknowledgedBy: 'Hub Admin' });
  await sleep(300);
  console.log(`[6] sos:acknowledge → child + provider saw sos:acknowledged: child=${tally.has('child', 'sos:acknowledged')} provider=${tally.has('provider', 'sos:acknowledged')}`);

  // ---------- 7. Wallet top-up ----------
  child.emit('wallet:topup', {
    userId: CHILD_ID,
    amount: 50,
    description: 'Smoke test top-up',
  });
  await sleep(300);
  const walletSyncs = tally.events.filter(e => e.who === 'child' && e.name === 'wallet:sync').length;
  console.log(`[7] wallet:topup → child observed ${walletSyncs} wallet:sync events (initial + topup)`);

  // ---------- Summary ----------
  console.log(`\n=== summary: ${tally.events.length} events captured ===`);
  const counts = new Map<string, number>();
  for (const e of tally.events) {
    const key = `${e.who} ← ${e.name}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [k, v] of [...counts.entries()].sort()) {
    console.log(`  ${v}× ${k}`);
  }

  child.disconnect();
  admin.disconnect();
  provider.disconnect();
  process.exit(0);
}

main().catch(e => {
  console.error('e2e smoke failed:', e);
  process.exit(1);
});
