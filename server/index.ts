/**
 * FamilyHubs.in — Express + Socket.io Server
 * Real-time engine for task sync, SOS broadcast, and live notifications.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { setupSocketHandlers } from './socket';
import { apiRouter } from './routes/api';

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// --- Middleware ---
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// --- API Routes ---
app.use('/api', apiRouter);

// --- Socket.io ---
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketHandlers(io);

// --- Static Serving (Production) ---
if (IS_PRODUCTION) {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Health Check ---
app.get('/health', (_req, res) => {
  res.json({
    status: 'operational',
    service: 'FamilyHubs.in',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

// --- Start ---
httpServer.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  FamilyHubs.in — Real-Time Engine        ║`);
  console.log(`  ║  Server:  http://localhost:${PORT}          ║`);
  console.log(`  ║  Mode:    ${IS_PRODUCTION ? 'Production' : 'Development'}                  ║`);
  console.log(`  ║  Socket:  Active                         ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});

export { io };
