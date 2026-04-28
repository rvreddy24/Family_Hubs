/**
 * FamilyHubs.in — REST API
 * REST returns snapshots; primary state sync is over Socket.io.
 *
 * Privacy posture:
 *   - Public read-only endpoints (state, hubs, providers list) expose ONLY the
 *     anonymized roster used by marketing pages. They never include wallet,
 *     transactions, parent profiles, or chat threads.
 *   - Per-user wallet snapshots and parent directories are gated behind admin or
 *     owner-bearer-token checks; see below and routes/admin.ts.
 */
import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getFullSnapshot,
  getWallet,
  getTxnsForUser,
} from '../store';
import { paymentsRouter } from './payments';
import { commsRouter } from './comms';
import { adminRouter } from './admin';
import { providersRouter } from './providers';

export const apiRouter = Router();

// Debug-only log forwarder so browser code can emit runtime evidence without CORS issues.
// It forwards *non-sensitive* diagnostics to the local debug ingest endpoint.
apiRouter.post('/__debug/log', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const body = (req.body || {}) as Record<string, any>;
  const safe = {
    sessionId: '5a9e75',
    runId: String(body.runId || 'baseline'),
    hypothesisId: String(body.hypothesisId || 'H?'),
    location: String(body.location || 'browser'),
    message: String(body.message || 'log'),
    data: typeof body.data === 'object' && body.data ? body.data : {},
    timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
  };
  // #region agent log
  fetch('http://127.0.0.1:7598/ingest/cb2fe1b3-4802-4408-9788-1811b0db491c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a9e75'},body:JSON.stringify(safe)}).catch(()=>{});
  // #endregion
  return res.status(204).end();
});

/**
 * Public snapshot — used by marketing landing pages and as the unauthenticated
 * seed for the React app before Socket.io joins (which then re-syncs full data).
 * PII fields are intentionally stripped:
 *   - tasks: drop `verificationCode` and `instructions`
 *   - providers: drop `verificationDocs` (admins must hit /api/admin/providers/:id/manifest)
 *   - parents: not exposed at all (full medical history / phone live there)
 *   - notes: not exposed at all (could contain personal context)
 */
function publicSnapshot() {
  const full = getFullSnapshot();
  const tasks = (full.tasks || []).map((t: any) => {
    const { verificationCode, instructions, ...rest } = t || {};
    void verificationCode;
    void instructions;
    return rest;
  });
  const providers = (full.providers || []).map((p: any) => {
    const { verificationDocs, ...rest } = p || {};
    void verificationDocs;
    return rest;
  });
  return {
    tasks,
    hubs: full.hubs || [],
    providers,
    parents: [],
    notes: [],
  };
}

apiRouter.get('/state', (_req, res) => {
  return res.json(publicSnapshot());
});

apiRouter.get('/status', (_req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7598/ingest/cb2fe1b3-4802-4408-9788-1811b0db491c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a9e75'},body:JSON.stringify({sessionId:'5a9e75',runId:'baseline',hypothesisId:'H2',location:'server/routes/api.ts:/status',message:'GET /api/status',data:{ok:true},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return res.json({
    service: 'FamilyHubs.in API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/tasks', (_req, res) => {
  return res.json({ tasks: publicSnapshot().tasks });
});

apiRouter.post('/tasks', (req, res) => {
  return res.status(201).json({
    task: req.body,
    message: 'Prefer task:create over Socket; persistence via Supabase when enabled.',
  });
});

apiRouter.get('/hubs', (_req, res) => {
  const { hubs } = getFullSnapshot();
  return res.json({ hubs });
});

apiRouter.get('/parents', (_req, res) => {
  return res.status(401).json({
    error: 'Authentication required. Admins: GET /api/admin/parents?hubId=…',
  });
});

apiRouter.get('/notes', (_req, res) => {
  return res.status(401).json({
    error: 'Authentication required. Notes are hub-scoped via Socket.io once you sign in.',
  });
});

/**
 * GET /api/wallet/:userId — owner OR admin only.
 *
 * The Socket.io `wallet:sync` channel is the canonical real-time path. This REST
 * read is for tooling (admin audits, signed-in user inspection). It rejects
 * unauthenticated calls and refuses to disclose another user's balance unless the
 * caller has admin role in their JWT app_metadata.
 */
let walletAuthClient: SupabaseClient | null = null;
function getWalletAuthClient(): SupabaseClient | null {
  if (walletAuthClient) return walletAuthClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  walletAuthClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return walletAuthClient;
}

apiRouter.get('/wallet/:userId', async (req: Request, res: Response) => {
  const sb = getWalletAuthClient();
  if (!sb) {
    return res.status(503).json({ error: 'Wallet endpoint requires Supabase configuration' });
  }
  const auth = req.header('authorization') || req.header('Authorization');
  const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Bearer token required' });
  }
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const callerId = data.user.id;
  const callerRole = String((data.user.app_metadata as Record<string, any>)?.role || '').toLowerCase();
  const isAdmin = callerRole === 'admin' || callerRole === 'hub_admin';
  if (callerId !== req.params.userId && !isAdmin) {
    return res.status(403).json({ error: 'You can only read your own wallet' });
  }
  const { userId } = req.params;
  return res.json({
    userId,
    wallet: getWallet(userId),
    transactions: getTxnsForUser(userId),
  });
});

/** Stub for future FCM / device token registration */
apiRouter.post('/push/device', (req, res) => {
  return res.status(501).json({
    message: 'Not implemented. Wire Firebase Admin or an Edge Function for device tokens.',
    received: { keys: Object.keys(req.body || {}) },
  });
});

apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/comms', commsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/providers', providersRouter);
