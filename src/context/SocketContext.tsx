/**
 * FamilyHubs.in — Socket.io Client Provider
 * Manages real-time connection and event handling.
 */

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  priority?: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  clearNotification: (id: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  notifications: [],
  clearNotification: () => {},
});

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[FamilyHubs] Real-time engine connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[FamilyHubs] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[FamilyHubs] Connection error:', err.message);
      setIsConnected(false);
    });

    // --- Live Notification Channel ---
    socket.on('notification:push', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        notifications,
        clearNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
