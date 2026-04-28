/**
 * FamilyHubs.in — Socket.io Client Provider
 * Re-creates the socket when the session token changes (Supabase).
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

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
  const { accessToken, isSupabaseConfigured } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // #region agent log
    fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'baseline',hypothesisId:'H1',location:'src/context/SocketContext.tsx:45',message:'Socket init',data:{socketUrl:SOCKET_URL,isSupabaseConfigured,hasAccessToken:!!accessToken},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: isSupabaseConfigured && accessToken ? { token: accessToken } : {},
    });

    setSocket(s);
    s.on('connect', () => {
      console.log('[FamilyHubs] Real-time engine connected:', s.id);
      // #region agent log
      fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'baseline',hypothesisId:'H1',location:'src/context/SocketContext.tsx:58',message:'Socket connected',data:{socketId:s.id ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setIsConnected(true);
    });
    s.on('disconnect', reason => {
      console.log('[FamilyHubs] Disconnected:', reason);
      setIsConnected(false);
    });
    s.on('connect_error', err => {
      console.warn('[FamilyHubs] Connection error:', err.message);
      // #region agent log
      fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'baseline',hypothesisId:'H1',location:'src/context/SocketContext.tsx:68',message:'Socket connect_error',data:{message:String(err?.message||''),name:String((err as any)?.name||''),description:String((err as any)?.description||''),context:String((err as any)?.context||'')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setIsConnected(false);
    });
    s.on('notification:push', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [accessToken, isSupabaseConfigured]);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, clearNotification }}>
      {children}
    </SocketContext.Provider>
  );
}
