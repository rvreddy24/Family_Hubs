/**
 * Public provider self-onboarding (Uber/Zomato-style).
 *
 *  POST /api/providers/apply  — anyone can submit. Creates a Supabase Auth user with
 *  `app_metadata.role = 'provider'` AND a Provider record with `verified: false`. The
 *  applicant can sign in to the provider portal immediately, but they cannot be
 *  assigned tasks until a hub admin reviews their documents and flips `verified: true`
 *  via the Identity Guard / verification queue.
 *
 *  Security model:
 *    - The role is written server-side via the service-role key. The applicant never
 *      sees that key. They cannot tamper with `app_metadata`.
 *    - Eligibility for dispatch is gated by `provider.verified === true`, not by the
 *      role. This is enforced in `server/socket.ts` (`task:assign` rejects unverified
 *      providers) and in the admin's dispatcher UI (only verified providers appear).
 *    - A naive in-memory rate-limit by IP prevents trivial spam (one application per
 *      email and per IP every 60s).
 */
import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  addProvider,
  ensureHub,
  updateHubCounts,
  getProvidersRef,
  getFullSnapshot,
} from '../store';
import { persistState } from '../persistence';

const providersRouter = Router();

providersRouter.get('/', (_req, res) => {
  const { providers } = getFullSnapshot();
  // Public listing: strip the document wallet from the response. Admins fetch the
  // full manifest (including documents) through /api/admin/providers/:id/manifest,
  // which is JWT-gated. The smoke audit explicitly checks that path.
  const sanitized = (providers || []).map((p: any) => {
    const { verificationDocs, ...rest } = p || {};
    void verificationDocs;
    return rest;
  });
  return res.json({ providers: sanitized });
});

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

const recentApplications = new Map<string, number>();
const APPLY_COOLDOWN_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of recentApplications) {
    if (now - t > 5 * APPLY_COOLDOWN_MS) recentApplications.delete(k);
  }
  const last = recentApplications.get(key);
  if (last && now - last < APPLY_COOLDOWN_MS) return true;
  recentApplications.set(key, now);
  return false;
}

providersRouter.post('/apply', async (req: Request, res: Response) => {
  const sb = getServiceClient();
  if (!sb) {
    return res.status(503).json({ error: 'Provider applications are not yet available' });
  }

  const body = (req.body || {}) as Record<string, any>;
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const city = String(body.city || '').trim();
  const skills = Array.isArray(body.skills)
    ? body.skills.map((s: any) => String(s)).filter(Boolean).slice(0, 12)
    : [];
  // Free-text doc references the applicant claims to have. The admin reviews these in
  // the verification queue. (File upload comes later via Supabase Storage.)
  const documents = Array.isArray(body.documents)
    ? body.documents
        .map((d: any) => ({
          label: String(d?.label || '').slice(0, 60),
          note: String(d?.note || '').slice(0, 240),
        }))
        .filter((d: { label: string }) => d.label)
        .slice(0, 6)
    : [];
  const hubId = String(body.hubId || 'hub_mgl');

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
  if (isRateLimited(`email:${email}`) || isRateLimited(`ip:${ip}`)) {
    return res.status(429).json({ error: 'Too many applications. Please wait a minute and try again.' });
  }

  // If a verified provider already exists with this email, refuse — they should sign
  // in instead of re-applying. Unverified entries are blocked too (don't create dupes).
  const existingProvider = getProvidersRef().find((p: any) => (p.email || '').toLowerCase() === email);
  if (existingProvider) {
    return res.status(409).json({
      error:
        existingProvider.verified
          ? 'A verified provider account already exists for this email. Please sign in instead.'
          : 'An application for this email is already under review. We will email you when verified.',
    });
  }

  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr || !list) {
    return res.status(500).json({ error: listErr?.message || 'Failed to check existing users' });
  }
  const existingUser = list.users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
  if (existingUser) {
    return res.status(409).json({
      error: 'An account already exists for this email. Please sign in or use a different email.',
    });
  }

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, phone, city, hubId },
    app_metadata: { role: 'provider', hubId },
  });
  if (createErr || !created.user) {
    return res.status(500).json({ error: createErr?.message || 'Failed to create account' });
  }
  const userId = created.user.id;

  const provider = {
    id: userId,
    name,
    email,
    phone,
    photo: '',
    skills,
    verified: false,
    activeStatus: 'idle' as const,
    rating: 0,
    totalJobs: 0,
    joinedAt: new Date().toISOString(),
    verificationDocs: documents,
    hubId,
    city,
  };
  addProvider(provider);
  ensureHub(hubId);
  updateHubCounts(hubId);
  await persistState().catch(() => {});

  return res.status(201).json({
    ok: true,
    message:
      "Application submitted. You can sign in now, but we'll review your documents before activating dispatch. We'll notify you when you're approved.",
    providerId: userId,
  });
});

export { providersRouter };
