import 'dotenv/config';
/**
 * FamilyHubs.in — Express + Socket.io Server
 * Real-time engine for task sync, SOS broadcast, and live notifications.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { setupSocketHandlers } from './socket';
import { apiRouter } from './routes/api';
import { attachSocketAuth } from './socketAuth';
import { hydrateFromDatabase, isPersistenceEnabled, persistState } from './persistence';

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowedOrigins = [CLIENT_URL, ...EXTRA_ORIGINS];

const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) {
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  console.warn(`[CORS] Blocked origin: ${origin}`);
  return callback(new Error('Not allowed by CORS'));
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// --- Rate limiting (tune per environment) ---
const restLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', restLimiter);

// --- Middleware ---
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// --- API Routes ---
app.use('/api', apiRouter);

// --- Health (before static catch-all in prod) ---
app.get('/health', (_req, res) => {
  return res.json({
    status: 'operational',
    service: 'FamilyHubs.in',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- Socket.io ---
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

attachSocketAuth(io);
setupSocketHandlers(io);

// --- Static Serving (Production) ---
if (IS_PRODUCTION) {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Start ---
const start = async () => {
  try {
    await hydrateFromDatabase();
    if (isPersistenceEnabled()) {
      await persistState();
      console.log('[Server] Supabase snapshot synced (fh_app_state).');
    }
  } catch (e) {
    console.warn('[Server] DB hydrate optional skip:', (e as Error).message);
  }
  httpServer.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  FamilyHubs.in — Real-Time Engine        ║`);
    console.log(`  ║  Server:  http://localhost:${PORT}          ║`);
    console.log(
      `  ║  Mode:    ${IS_PRODUCTION ? 'Production' : 'Development'}                  ║`
    );
    console.log(`  ║  Socket:  Active                         ║`);
    if (isPersistenceEnabled()) {
      console.log(`  ║  DB:      Supabase persistence ON        ║`);
    }
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
};

void start();

export { io };
