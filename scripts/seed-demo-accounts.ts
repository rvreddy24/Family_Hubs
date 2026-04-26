/**
 * Seed demo accounts in Supabase Auth.
 *
 * Idempotent: if a user already exists we update its password + metadata.
 *
 * Run with:
 *   npx tsx scripts/seed-demo-accounts.ts
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (already loaded by dotenv).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';

type Role = 'child' | 'admin' | 'provider';

interface DemoUser {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  hubId?: string;
  phone?: string;
  location?: string;
}

const HUB = 'hub_mgl';

const DEMO_USERS: DemoUser[] = [
  {
    email: 'family.demo@familyhubs.in',
    password: 'FamilyDemo2026!',
    fullName: 'Anita Reddy',
    role: 'child',
    location: 'San Francisco, USA',
    phone: '+14155550101',
  },
  {
    email: 'admin.demo@familyhubs.in',
    password: 'AdminDemo2026!',
    fullName: 'Hub Admin (Miryalaguda)',
    role: 'admin',
    hubId: HUB,
    location: 'Miryalaguda',
    phone: '+919999900001',
  },
  {
    email: 'provider.demo@familyhubs.in',
    password: 'ProviderDemo2026!',
    fullName: 'Ramesh Provider',
    role: 'provider',
    hubId: HUB,
    location: 'Miryalaguda',
    phone: '+919999900002',
  },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env');
    process.exit(1);
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of DEMO_USERS) {
    // Profile-style data goes to user_metadata (the user can edit these themselves).
    const userMetadata = {
      full_name: u.fullName,
      hubId: u.hubId,
      phone: u.phone,
      location: u.location,
    };
    // Role + hub assignment live in app_metadata — only the service-role key can write
    // here, so a user cannot self-promote via supabase.auth.updateUser.
    const appMetadata = {
      role: u.role,
      hubId: u.hubId,
    };

    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) {
      console.error(`[${u.email}] listUsers failed:`, listErr.message);
      continue;
    }
    const existing = list.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());

    if (existing) {
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
        password: u.password,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: appMetadata,
      });
      if (updErr) {
        console.error(`[${u.email}] update failed:`, updErr.message);
      } else {
        console.log(`[${u.email}] updated · id=${existing.id} · role=${u.role}`);
      }
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: appMetadata,
      });
      if (error) {
        console.error(`[${u.email}] createUser failed:`, error.message);
      } else {
        console.log(`[${u.email}] created · id=${data.user?.id} · role=${u.role}`);
      }
    }
  }

  // Capture user IDs by role so we can wire a provider record + parent record.
  const { data: list2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const ids: Record<Role, string | undefined> = { child: undefined, admin: undefined, provider: undefined };
  for (const u of DEMO_USERS) {
    const found = list2?.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
    if (found) ids[u.role] = found.id;
  }

  await seedRelationsViaSocket(ids);

  console.log('\n=== Demo credentials ===');
  for (const u of DEMO_USERS) {
    console.log(`${u.role.padEnd(8)} | ${u.email.padEnd(34)} | ${u.password}`);
  }
}

async function seedRelationsViaSocket(ids: Record<Role, string | undefined>): Promise<void> {
  const URL = process.env.SMOKE_URL || 'http://localhost:3001';

  return new Promise((resolve) => {
    const socket = io(URL, { transports: ['websocket'] });
    const done = () => {
      try { socket.disconnect(); } catch {}
      resolve();
    };
    const failTimer = setTimeout(() => {
      console.warn('[seed] could not reach socket server at', URL, '— skipping live seed');
      done();
    }, 4000);

    socket.on('connect', () => {
      clearTimeout(failTimer);
      console.log('[seed] socket connected', socket.id);

      socket.emit('join:room', {
        hubId: HUB,
        userId: ids.admin || 'demo-admin',
        role: 'admin',
      });

      // Create provider record matching the auth user id (so provider app sees their own jobs).
      if (ids.provider) {
        socket.emit('provider:create', {
          id: ids.provider,
          name: 'Ramesh Provider',
          email: 'provider.demo@familyhubs.in',
          phone: '+919999900002',
          photo: '',
          skills: ['medical', 'essentials'],
          verified: true,
          activeStatus: 'idle',
          rating: 0,
          totalJobs: 0,
          joinedAt: new Date().toISOString(),
          verificationDocs: [],
          hubId: HUB,
        });
        console.log('[seed] provider:create emitted');
      }

      // Create a starter parent under the child account so they have a profile to dispatch services for.
      if (ids.child) {
        socket.emit('parent:create', {
          id: `parent_demo_${ids.child.slice(0, 8)}`,
          name: 'Lakshmi Reddy',
          age: 72,
          gender: 'Female',
          bloodGroup: 'B+',
          phoneNumber: '+919999912345',
          whatsappNumber: '+919999912345',
          address: 'Plot 14, Krishnanagar, Miryalaguda',
          city: 'Miryalaguda',
          locationPin: { lat: 16.8716, lng: 79.5658 },
          medicalHistory: 'Type 2 diabetes, mild hypertension.',
          currentMeds: ['Metformin 500mg', 'Amlodipine 5mg'],
          emergencyContact: '+919999912346',
          allergies: 'Penicillin',
          hubId: HUB,
          ownerId: ids.child,
        });
        console.log('[seed] parent:create emitted');
      }

      // Give the demo family account a small wallet balance so escrow flows can be exercised.
      if (ids.child) {
        socket.emit('wallet:topup', {
          userId: ids.child,
          amount: 100,
          description: 'Demo opening balance',
        });
        console.log('[seed] wallet:topup emitted ($100 to family demo)');
      }

      setTimeout(done, 1000);
    });

    socket.on('connect_error', (e) => {
      clearTimeout(failTimer);
      console.warn('[seed] socket connect error:', e.message);
      done();
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
