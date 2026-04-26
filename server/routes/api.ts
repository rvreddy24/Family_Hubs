/**
 * FamilyHubs.in — API Routes
 * REST endpoints for tasks, parents, providers, hubs, and health.
 */

import { Router } from 'express';

export const apiRouter = Router();

// --- Health ---
apiRouter.get('/status', (_req, res) => {
  res.json({
    service: 'FamilyHubs.in API',
    version: '1.0.0-alpha',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// --- Tasks ---
apiRouter.get('/tasks', (_req, res) => {
  // TODO: Replace with database query
  res.json({ tasks: [], message: 'Connect to Supabase for live data' });
});

apiRouter.post('/tasks', (req, res) => {
  const task = req.body;
  // TODO: Persist to database
  res.status(201).json({ task, message: 'Task created (in-memory)' });
});

apiRouter.patch('/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  // TODO: Update in database
  res.json({ taskId: id, status, message: 'Status updated (in-memory)' });
});

// --- Parents ---
apiRouter.get('/parents', (_req, res) => {
  res.json({ parents: [], message: 'Connect to Supabase for live data' });
});

apiRouter.post('/parents', (req, res) => {
  const parent = req.body;
  res.status(201).json({ parent, message: 'Parent profile created (in-memory)' });
});

// --- Providers ---
apiRouter.get('/providers', (_req, res) => {
  res.json({ providers: [], message: 'Connect to Supabase for live data' });
});

apiRouter.post('/providers/:id/verify', (req, res) => {
  const { id } = req.params;
  res.json({ providerId: id, verified: true, message: 'Provider verified (in-memory)' });
});

// --- Hubs ---
apiRouter.get('/hubs', (_req, res) => {
  res.json({ hubs: [], message: 'Connect to Supabase for live data' });
});

// --- Wallet ---
apiRouter.get('/wallet/:userId', (req, res) => {
  const { userId } = req.params;
  res.json({
    userId,
    balance: 0,
    escrow: 0,
    transactions: [],
    message: 'Connect to Supabase for live data',
  });
});
