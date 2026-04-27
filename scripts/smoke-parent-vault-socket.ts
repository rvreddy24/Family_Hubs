/**
 * No Supabase: anonymous socket + join:room, then parent:create if needed and
 * parent:update with vaultDocuments — verifies server accepts vault patches.
 *
 * Run with API already listening: npx tsx scripts/smoke-parent-vault-socket.ts
 */
import { io as ioClient } from 'socket.io-client';

const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://127.0.0.1:3001';
const HUB = 'hub_mgl';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function main() {
  let sawVault = false;
  const s = ioClient(SOCKET_URL, { transports: ['websocket', 'polling'] });
  s.on('parent:upserted', (p: any) => {
    if (Array.isArray(p?.vaultDocuments) && p.vaultDocuments.length > 0) sawVault = true;
  });

  await new Promise<void>((resolve, reject) => {
    s.once('connect_error', e => reject(e));
    s.once('connect', () => resolve());
  });

  s.once('state:sync', (data: any) => {
    const parents = data?.parents || [];
    let pid = parents[0]?.id as string | undefined;
    if (!pid) {
      pid = `parent_smoke_${Date.now().toString(36)}`;
      s.emit('parent:create', {
        id: pid,
        name: 'Smoke Vault Parent',
        age: 50,
        gender: 'Other',
        phoneNumber: '+10000000000',
        whatsappNumber: '+10000000000',
        address: 'Test',
        city: 'Miryalaguda',
        locationPin: { lat: 0, lng: 0 },
        medicalHistory: '',
        currentMeds: [],
        emergencyContact: '+10000000000',
        hubId: HUB,
        ownerId: 'smoke_vault_user',
      });
    }
    setTimeout(() => {
      s.emit('parent:update', {
        id: pid,
        hubId: HUB,
        patch: {
          vaultDocuments: [
            {
              id: 'vault_smoke_1',
              name: 'smoke.txt',
              mimeType: 'text/plain',
              dataUrl: 'data:text/plain;base64,c21va2U=',
              uploadedAt: new Date().toISOString(),
            },
          ],
        },
      });
    }, 250);
  });

  s.emit('join:room', { role: 'child', hubId: HUB, userId: 'smoke_vault_user' });
  await sleep(1500);

  if (!sawVault) {
    console.error('FAIL: did not observe parent:upserted with vaultDocuments');
    process.exit(1);
  }
  console.log('PASS: parent vault patch applied and broadcast');
  s.close();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
