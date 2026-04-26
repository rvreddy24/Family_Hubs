/**
 * Provisions Supabase Auth demo users and seeds in-memory store (no SQL inserts).
 * Runs inside the server process after DB hydrate. Idempotent.
 */
import { createClient, type User } from '@supabase/supabase-js';
import {
  DEMO_HUB_ID,
  DEMO_FAMILY,
  DEMO_PROVIDER,
  DEMO_HUB_ADMIN,
  isDemoAutoProvisionEnabled,
  isHubAdminProvisionEnabled,
} from './demoConfig';
import {
  addParent,
  addProvider,
  ensureHub,
  getProvidersRef,
  getParentsRef,
  getWallet,
  updateHubCounts,
  walletCredit,
} from './store';
import { persistState, isPersistenceEnabled } from './persistence';

type Role = 'child' | 'admin' | 'provider';

function userRow(
  d: { email: string; password: string; fullName: string; role: Role; location?: string; phone?: string; hubId?: string }
) {
  return {
    email: d.email,
    password: d.password,
    fullName: d.fullName,
    role: d.role,
    hubId: d.hubId,
    location: d.location,
    phone: d.phone,
  };
}

/**
 * Create/update users in Supabase Auth. Returns user ids for child, provider, admin (or undefined).
 */
export async function provisionSupabaseAuthUsers(
  supabaseUrl: string,
  serviceKey: string
): Promise<{
  childId: string | undefined;
  providerId: string | undefined;
  adminId: string | undefined;
}> {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  type DemoUserRow = {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    location?: string;
    phone?: string;
    hubId?: string;
  };
  const rows: DemoUserRow[] = [userRow(DEMO_FAMILY), userRow(DEMO_PROVIDER)];
  if (isHubAdminProvisionEnabled()) {
    rows.push(userRow(DEMO_HUB_ADMIN));
  }

  const byRole: { childId?: string; providerId?: string; adminId?: string } = {};

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    console.warn(`[demo] listUsers:`, listErr.message);
    return { childId: undefined, providerId: undefined, adminId: undefined };
  }
  const authUsers = list?.users ?? [];

  for (const u of rows) {
    const userMetadata = {
      full_name: u.fullName,
      hubId: u.hubId,
      phone: u.phone,
      location: u.location,
    };
    const appMetadata = { role: u.role, hubId: u.hubId };

    const existing = authUsers.find((x) => (x.email ?? '').toLowerCase() === u.email.toLowerCase());
    const body = {
      password: u.password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    };

    let out: User | null = null;
    if (existing) {
      const { data, error } = await admin.auth.admin.updateUserById(existing.id, body);
      if (error) console.warn(`[demo] ${u.email} update:`, error.message);
      else out = data.user;
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email: u.email, ...body });
      if (error) console.warn(`[demo] ${u.email} create:`, error.message);
      else out = data.user;
    }

    const id = out?.id || existing?.id;
    if (!id) continue;
    if (u.role === 'child') byRole.childId = id;
    if (u.role === 'provider') byRole.providerId = id;
    if (u.role === 'admin') byRole.adminId = id;
  }

  if (isHubAdminProvisionEnabled()) {
    console.log(
      `[demo] Supabase users: child=${byRole.childId || '—'} provider=${byRole.providerId || '—'} admin=${byRole.adminId || '—'}`
    );
  } else {
    console.log(
      `[demo] Supabase users: child=${byRole.childId || '—'} provider=${byRole.providerId || '—'} (hub admin skipped; set DEMO_PROVISION_HUB_ADMIN=1 to enable admin.demo@)`
    );
  }

  return { childId: byRole.childId, providerId: byRole.providerId, adminId: byRole.adminId };
}

/**
 * Idempotent: ensure demo provider, parent, and starting wallet in store.
 */
export function seedInMemoryForDemos(
  childId: string | undefined,
  providerId: string | undefined
): void {
  if (!childId || !providerId) {
    console.warn('[demo] skip in-memory seed — missing child or provider id from Auth');
    return;
  }

  const hubId = DEMO_HUB_ID;
  ensureHub(hubId, { name: 'Miryalaguda Hub', city: 'Miryalaguda' } as any);

  const prows = getProvidersRef();
  if (!prows.find((p) => p.id === providerId)) {
    addProvider({
      id: providerId,
      name: DEMO_PROVIDER.fullName,
      email: DEMO_PROVIDER.email,
      phone: DEMO_PROVIDER.phone,
      photo: '',
      skills: ['medical', 'essentials'],
      verified: true,
      activeStatus: 'idle',
      rating: 4.9,
      totalJobs: 0,
      joinedAt: new Date().toISOString(),
      verificationDocs: [] as { label: string; url?: string }[],
      hubId,
    });
  }

  const parentId = `parent_demo_${childId.slice(0, 8)}`;
  const parents = getParentsRef();
  if (!parents.find((p) => p.id === parentId)) {
    addParent({
      id: parentId,
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
      hubId,
      ownerId: childId,
    });
  }

  const w = getWallet(childId);
  if (w.balance < 50) {
    walletCredit(childId, 100, 'Demo opening balance');
  }

  updateHubCounts(hubId);
  console.log('[demo] in-memory: provider + parent + wallet ok');
}

export async function runDemoProvision(): Promise<void> {
  if (!isDemoAutoProvisionEnabled()) {
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return;
  }

  try {
    const ids = await provisionSupabaseAuthUsers(url, key);
    seedInMemoryForDemos(ids.childId, ids.providerId);
    if (isPersistenceEnabled()) {
      await persistState();
    }
  } catch (e) {
    console.warn('[demo] provision error:', (e as Error).message);
  }
}
