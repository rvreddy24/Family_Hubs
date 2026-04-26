/**
 * Central demo user definitions (not stored in SQL — created via Supabase Admin API
 * and in-memory state on the Node server when auto-provision runs).
 */
export const DEMO_HUB_ID = 'hub_mgl';

export const DEMO_FAMILY = {
  email: 'family.demo@familyhubs.in',
  password: 'FamilyDemo2026!',
  fullName: 'Anita Reddy',
  role: 'child' as const,
  location: 'San Francisco, USA',
  phone: '+14155550101',
};

export const DEMO_PROVIDER = {
  email: 'provider.demo@familyhubs.in',
  password: 'ProviderDemo2026!',
  fullName: 'Ramesh Provider',
  role: 'provider' as const,
  location: 'Miryalaguda',
  phone: '+919999900002',
  hubId: DEMO_HUB_ID,
};

/** Used only when DEMO_PROVISION_HUB_ADMIN=1 (or dev default). */
export const DEMO_HUB_ADMIN = {
  email: 'admin.demo@familyhubs.in',
  password: 'AdminDemo2026!',
  fullName: 'Hub Admin (Miryalaguda)',
  role: 'admin' as const,
  location: 'Miryalaguda',
  phone: '+919999900001',
  hubId: DEMO_HUB_ID,
};

export function isDemoAutoProvisionEnabled(): boolean {
  const v = (process.env.DEMO_AUTO_PROVISION || '').toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  // default: on when we have service role (enables one-command deploys)
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** When true, also creates/updates the hub admin account (for smoke tests & /hubs console). In production, set 0 to only expose family + provider demos. */
export function isHubAdminProvisionEnabled(): boolean {
  const v = (process.env.DEMO_PROVISION_HUB_ADMIN || '').toLowerCase();
  if (v === '1' || v === 'true' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'off') return false;
  return process.env.NODE_ENV !== 'production';
}
