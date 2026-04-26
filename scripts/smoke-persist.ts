/**
 * One-shot persistence smoke test.
 * Connects to the running server via Socket.io, creates a parent + a note, then exits.
 * Use this only against the local dev server.
 */
import { io } from 'socket.io-client';

const URL = process.env.SMOKE_URL || 'http://localhost:3001';

const socket = io(URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('[smoke] connected', socket.id);
  socket.emit('join:room', { hubId: 'hub_mgl', userId: 'smoke-tester', role: 'child' });

  setTimeout(() => {
    const parentId = `smoke_${Date.now()}`;
    const noteId = `note_${Date.now()}`;

    socket.emit('parent:create', {
      id: parentId,
      name: 'Smoke Test Parent',
      age: 70,
      gender: 'Other',
      hubId: 'hub_mgl',
      ownerId: 'smoke-tester',
      childId: 'smoke-tester',
    });

    socket.emit('note:create', {
      id: noteId,
      hubId: 'hub_mgl',
      authorId: 'smoke-tester',
      authorName: 'Smoke Tester',
      authorRole: 'child',
      body: 'Persistence smoke note',
    });

    console.log('[smoke] emitted parent:create + note:create');
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 1500);
  }, 500);
});

socket.on('connect_error', (err) => {
  console.error('[smoke] connect_error', err.message);
  process.exit(1);
});
