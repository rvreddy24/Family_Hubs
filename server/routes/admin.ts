/**
 * Admin-only REST routes.
 *
 * All endpoints in this router verify the caller's Supabase JWT via the service-role
 * client and require `app_metadata.role === 'admin'`. The role check is always against
 * `app_metadata` (server-controlled) — never `user_metadata` — to make role escalation
 * impossible by client-side manipulation.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  addProvider,
  ensureHub,
  updateHubCounts,
  getProvidersRef,
  getWallet,
  getTxnsForUser,
  getParentsForHub,
} from '../store';
import { persistState } from '../persistence';

const adminRouter = Router();

let serviceClient: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

interface AdminRequest extends Request {
  caller?: { id: string; email?: string; role: string; hubId?: string };
}

async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const sb = getServiceClient();
  if (!sb) {
    return res.status(503).json({ error: 'Supabase not configured on server' });
  }
  const auth = req.header('authorization') || req.header('Authorization');
  const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const appMeta = (data.user.app_metadata || {}) as Record<string, any>;
  const role = String(appMeta.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'hub_admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  req.caller = {
    id: data.user.id,
    email: data.user.email,
    role,
    hubId: typeof appMeta.hubId === 'string' ? appMeta.hubId : undefined,
  };
  return next();
}

/**
 * POST /api/admin/providers/invite
 * Body: { email, password, name, phone?, skills?: string[], hubId? }
 *
 * Creates a Supabase Auth user with `app_metadata.role = 'provider'` and the matching
 * provider record in the live store. The provider's auth user ID is reused as the
 * provider record ID so the provider portal sees their own jobs.
 */
adminRouter.post('/providers/invite', requireAdmin, async (req: AdminRequest, res: Response) => {
  const sb = getServiceClient()!;
  const body = (req.body || {}) as Record<string, any>;
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const skills = Array.isArray(body.skills) ? body.skills.map((s: any) => String(s)) : [];
  const hubId = String(body.hubId || req.caller?.hubId || 'hub_mgl');

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr || !list) {
    return res.status(500).json({ error: listErr?.message || 'Failed to list users' });
  }
  const existing = list.users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
  let userId: string | undefined;
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone, hubId },
      app_metadata: { role: 'provider', hubId },
    });
    if (error) return res.status(500).json({ error: error.message });
    userId = existing.id;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone, hubId },
      app_metadata: { role: 'provider', hubId },
    });
    if (error) return res.status(500).json({ error: error.message });
    userId = data.user?.id;
  }
  if (!userId) {
    return res.status(500).json({ error: 'Failed to obtain user id' });
  }

  const provider = {
    id: userId,
    name,
    email,
    phone,
    photo: '',
    skills,
    verified: true,
    activeStatus: 'idle' as const,
    rating: 0,
    totalJobs: 0,
    joinedAt: new Date().toISOString(),
    verificationDocs: [],
    hubId,
  };
  addProvider(provider);
  ensureHub(hubId);
  updateHubCounts(hubId);
  await persistState().catch(() => {});

  return res.status(201).json({
    provider,
    invitedBy: req.caller?.email,
    message: 'Provider account created. Share the temporary password securely; the provider should change it after first login.',
  });
});

/**
 * Document wallet helpers — admins can download the provider's application manifest
 * (the bundle of self-declared docs + KYC notes). Two formats:
 *   GET /api/admin/providers/:id/manifest        → text/plain (printable)
 *   GET /api/admin/providers/:id/manifest.json   → application/json (machine-readable)
 *
 * The text version is intentionally identical to what the in-app "Download manifest"
 * button produces, so admins can share/curl/save the same artifact off-platform.
 */
function normaliseDocs(docs: any): { label: string; note?: string; url?: string }[] {
  if (!Array.isArray(docs)) return [];
  return docs
    .map((d: any) => {
      if (typeof d === 'string') return { label: d };
      if (d && typeof d === 'object') {
        return {
          label: String(d.label || d.type || 'Document'),
          note: d.note ? String(d.note) : undefined,
          url: d.url ? String(d.url) : undefined,
        };
      }
      return null;
    })
    .filter(Boolean) as { label: string; note?: string; url?: string }[];
}

function buildManifestText(prov: any): string {
  const docs = normaliseDocs(prov.verificationDocs);
  const lines = [
    'FamilyHubs.in — Provider application manifest',
    '─'.repeat(60),
    `Generated:        ${new Date().toISOString()}`,
    `Provider ID:      ${prov.id || '—'}`,
    `Name:             ${prov.name || '—'}`,
    `Email:            ${prov.email || '—'}`,
    `Phone:            ${prov.phone || '—'}`,
    `City:             ${prov.city || '—'}`,
    `Hub:              ${prov.hubId || '—'}`,
    `Joined:           ${prov.joinedAt || '—'}`,
    `Status:           ${prov.activeStatus || '—'}`,
    `Verified:         ${prov.verified ? 'YES' : 'NO (pending review)'}`,
    `Rating:           ${typeof prov.rating === 'number' ? prov.rating : '—'}`,
    `Total jobs:       ${typeof prov.totalJobs === 'number' ? prov.totalJobs : '—'}`,
    `Skills:           ${(prov.skills || []).join(', ') || '—'}`,
    '',
    `Self-declared documents (${docs.length}):`,
  ];
  if (docs.length === 0) {
    lines.push('  (none submitted)');
  } else {
    docs.forEach((d, idx) => {
      lines.push(`  ${idx + 1}. ${d.label}${d.note ? ` — ${d.note}` : ''}${d.url ? ` (${d.url})` : ''}`);
    });
  }
  lines.push(
    '',
    '─'.repeat(60),
    'Review checklist:',
    '  [ ] Identity proof verified',
    '  [ ] Phone verified',
    '  [ ] Address verified',
    '  [ ] Background check complete'
  );
  return lines.join('\n');
}

function safeFilename(name: string): string {
  return String(name || 'provider').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'provider';
}

adminRouter.get(
  '/providers/:id/manifest.json',
  requireAdmin,
  (req: AdminRequest, res: Response) => {
    const provider = getProvidersRef().find((p: any) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    const docs = normaliseDocs(provider.verificationDocs);
    return res.json({
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        city: provider.city,
        hubId: provider.hubId,
        joinedAt: provider.joinedAt,
        verified: !!provider.verified,
        activeStatus: provider.activeStatus,
        skills: Array.isArray(provider.skills) ? provider.skills : [],
        rating: provider.rating ?? null,
        totalJobs: provider.totalJobs ?? 0,
      },
      documents: docs,
      generatedAt: new Date().toISOString(),
      reviewedBy: req.caller?.email || null,
    });
  }
);

adminRouter.get(
  '/providers/:id/manifest',
  requireAdmin,
  (req: AdminRequest, res: Response) => {
    const provider = getProvidersRef().find((p: any) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    const text = buildManifestText(provider);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename(provider.name)}_application.txt"`
    );
    return res.send(text);
  }
);

/**
 * GET /api/admin/parents?hubId=hub_mgl
 * Returns the parents directory scoped to the caller's hub. Used by ops tools that
 * need to audit who's onboarded; family REST is intentionally hidden so individual
 * parent profiles aren't browseable without a JWT.
 */
adminRouter.get('/parents', requireAdmin, (req: AdminRequest, res: Response) => {
  const hubId = String(req.query.hubId || req.caller?.hubId || 'hub_mgl');
  return res.json({ hubId, parents: getParentsForHub(hubId) });
});

/**
 * GET /api/admin/wallet/:userId
 * Admins can audit any wallet (e.g. before refunding); regular users go through
 * the socket `wallet:sync` channel which already targets only the wallet owner.
 */
adminRouter.get('/wallet/:userId', requireAdmin, (req: AdminRequest, res: Response) => {
  const { userId } = req.params;
  return res.json({
    userId,
    wallet: getWallet(userId),
    transactions: getTxnsForUser(userId),
  });
});

export { adminRouter };
