/**
 * Removes the smoke-test parent + note rows created by scripts/smoke-persist.ts.
 * Safe to delete after running once.
 */
import { io } from 'socket.io-client';

const URL = process.env.SMOKE_URL || 'http://localhost:3001';

(async () => {
  const res = await fetch(`${URL}/api/state`);
  const state = (await res.json()) as { parents: any[]; notes: any[] };
  const parentIds = state.parents.filter(p => /^smoke_/.test(p.id || '')).map(p => p.id);
  const noteIds = state.notes.filter(n => /^note_/.test(n.id || '') && /smoke/i.test(n.body || '')).map(n => n.id);

  if (parentIds.length === 0 && noteIds.length === 0) {
    console.log('[cleanup] nothing to clean');
    process.exit(0);
  }

  const socket = io(URL, { transports: ['websocket'] });
  socket.on('connect', () => {
    socket.emit('join:room', { hubId: 'hub_mgl', userId: 'cleanup', role: 'child' });
    setTimeout(() => {
      for (const id of parentIds) socket.emit('parent:delete', { id, hubId: 'hub_mgl' });
      // notes don't have a delete event yet — log them for manual removal
      if (noteIds.length) console.log('[cleanup] notes left in store (no delete event yet):', noteIds);
      console.log(`[cleanup] removed ${parentIds.length} smoke parent(s)`);
      setTimeout(() => { socket.disconnect(); process.exit(0); }, 1000);
    }, 400);
  });
})();
