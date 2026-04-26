/**
 * FamilyHubs.in — Socket.io Event Handlers
 * Real-time event channels for task sync, SOS broadcast, and notifications.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';

// --- In-memory state (replace with DB in production) ---
let tasks: any[] = [];
let hubs: any[] = [];

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const clientId = socket.id;
    console.log(`[Socket] Client connected: ${clientId}`);

    // --- Join a role-based room ---
    socket.on('join:room', (data: { role: string; hubId?: string }) => {
      socket.join(data.role);
      if (data.hubId) {
        socket.join(`hub:${data.hubId}`);
      }
      console.log(`[Socket] ${clientId} joined room: ${data.role}${data.hubId ? `, hub:${data.hubId}` : ''}`);

      // Send current state to newly connected client
      socket.emit('state:sync', { tasks, hubs });
    });

    // --- Task Status Update ---
    // When an admin updates a task status in India, the NRI child sees it instantly.
    socket.on('task:update', (data: { taskId: string; status: string; updatedBy: string }) => {
      console.log(`[Socket] Task update: ${data.taskId} → ${data.status} by ${data.updatedBy}`);

      // Update in-memory state
      tasks = tasks.map(t =>
        t.id === data.taskId ? { ...t, status: data.status, updatedAt: new Date().toISOString() } : t
      );

      // Broadcast to ALL connected clients (cross-device sync)
      io.emit('task:updated', {
        taskId: data.taskId,
        status: data.status,
        updatedBy: data.updatedBy,
        timestamp: new Date().toISOString(),
      });

      // Push notification to relevant parties
      io.emit('notification:push', {
        id: `notif_${Date.now()}`,
        type: 'task_update',
        title: 'Task Status Changed',
        message: `Task ${data.taskId} moved to "${data.status.replace('_', ' ')}"`,
        timestamp: new Date().toISOString(),
      });
    });

    // --- Task Creation ---
    socket.on('task:create', (data: any) => {
      console.log(`[Socket] New task created: ${data.id}`);
      tasks.unshift(data);

      io.emit('task:created', data);
      io.emit('notification:push', {
        id: `notif_${Date.now()}`,
        type: 'task_created',
        title: 'New Job Dispatched',
        message: `"${data.title}" has been committed with escrow lock.`,
        timestamp: new Date().toISOString(),
      });
    });

    // --- SOS Emergency Broadcast ---
    // When an NRI child triggers SOS, broadcast instantly to all hub admins.
    socket.on('sos:trigger', (data: { userId: string; hubId: string; parentName: string; location?: string }) => {
      console.log(`[Socket] ⚠️ SOS TRIGGERED by ${data.userId} for hub ${data.hubId}`);

      // Update hub emergency count
      hubs = hubs.map(h =>
        h.id === data.hubId ? { ...h, emergencyAlerts: (h.emergencyAlerts || 0) + 1 } : h
      );

      // Broadcast to ALL clients — this is a global emergency signal
      io.emit('sos:broadcast', {
        userId: data.userId,
        hubId: data.hubId,
        parentName: data.parentName,
        location: data.location,
        timestamp: new Date().toISOString(),
      });

      // Push high-priority notification
      io.emit('notification:push', {
        id: `notif_${Date.now()}`,
        type: 'sos',
        title: '🚨 EMERGENCY SOS',
        message: `SOS signal received for ${data.parentName}. Immediate response required.`,
        timestamp: new Date().toISOString(),
        priority: 'critical',
      });
    });

    // --- SOS Acknowledge ---
    socket.on('sos:acknowledge', (data: { hubId: string; acknowledgedBy: string }) => {
      console.log(`[Socket] SOS acknowledged for hub ${data.hubId} by ${data.acknowledgedBy}`);

      hubs = hubs.map(h =>
        h.id === data.hubId ? { ...h, emergencyAlerts: 0 } : h
      );

      io.emit('sos:acknowledged', {
        hubId: data.hubId,
        acknowledgedBy: data.acknowledgedBy,
        timestamp: new Date().toISOString(),
      });

      io.emit('notification:push', {
        id: `notif_${Date.now()}`,
        type: 'sos_ack',
        title: 'SOS Resolved',
        message: `Emergency alert for hub ${data.hubId} has been acknowledged.`,
        timestamp: new Date().toISOString(),
      });
    });

    // --- Identity Verification Complete ---
    socket.on('identity:verified', (data: { providerId: string; taskId: string; verifiedBy: string }) => {
      console.log(`[Socket] Identity verified: Provider ${data.providerId} for task ${data.taskId}`);

      io.emit('identity:confirmed', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      io.emit('notification:push', {
        id: `notif_${Date.now()}`,
        type: 'identity',
        title: 'Identity Handshake Complete',
        message: `Provider identity verified for task ${data.taskId}. Safe to dispatch.`,
        timestamp: new Date().toISOString(),
      });
    });

    // --- State Sync (bulk) ---
    socket.on('state:init', (data: { tasks: any[]; hubs: any[] }) => {
      tasks = data.tasks;
      hubs = data.hubs;
      console.log(`[Socket] State initialized: ${tasks.length} tasks, ${hubs.length} hubs`);
    });

    // --- Disconnect ---
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${clientId} (${reason})`);
    });
  });

  // Log connection stats every 30 seconds
  setInterval(() => {
    const count = io.engine.clientsCount;
    if (count > 0) {
      console.log(`[Socket] Active connections: ${count}`);
    }
  }, 30000);
}
