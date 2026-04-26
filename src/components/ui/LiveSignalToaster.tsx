/**
 * FamilyHubs.in — Live Signal Notification System
 * Toast-based real-time notifications powered by Socket.io events.
 */

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useSocket } from '../../context/SocketContext';

/**
 * LiveSignalToaster component.
 * Drop this into the app layout to enable real-time toast notifications.
 * Listens for Socket.io 'notification:push' events and fires toast alerts.
 */
export function LiveSignalToaster() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: {
      id: string;
      type: string;
      title: string;
      message: string;
      priority?: string;
    }) => {
      const toastConfig: any = {
        id: data.id,
        description: data.message,
        duration: data.priority === 'critical' ? 10000 : 5000,
      };

      switch (data.type) {
        case 'sos':
          toast.error(data.title, {
            ...toastConfig,
            duration: 15000,
            important: true,
          });
          break;
        case 'sos_ack':
          toast.success(data.title, toastConfig);
          break;
        case 'task_update':
          toast.info(data.title, toastConfig);
          break;
        case 'task_created':
          toast.success(data.title, toastConfig);
          break;
        case 'identity':
          toast.success(data.title, {
            ...toastConfig,
            icon: '🛡️',
          });
          break;
        default:
          toast(data.title, toastConfig);
      }
    };

    socket.on('notification:push', handleNotification);

    return () => {
      socket.off('notification:push', handleNotification);
    };
  }, [socket]);

  // Show connection status toast
  useEffect(() => {
    if (isConnected) {
      toast.success('Live Signal Active', {
        description: 'Real-time sync engine connected.',
        duration: 3000,
        id: 'connection-status',
      });
    }
  }, [isConnected]);

  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: '"Inter", sans-serif',
          fontWeight: 600,
        },
      }}
    />
  );
}

/**
 * ConnectionIndicator — shows live connection status in the UI.
 * A small pulsing dot that reflects Socket.io connection state.
 */
export function ConnectionIndicator() {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected
            ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-300'
            : 'bg-red-500 animate-pulse'
        }`}
      />
      <span className={isConnected ? 'text-emerald-600' : 'text-red-500'}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
