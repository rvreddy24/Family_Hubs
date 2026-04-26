/**
 * FamilyHubs.in — Application Entry Point
 * Wraps the app with Socket.io and App state providers.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SocketProvider } from './context/SocketContext';
import { AppProvider } from './context/AppContext';
import { LiveSignalToaster } from './components/ui/LiveSignalToaster';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <AppProvider>
        <App />
        <LiveSignalToaster />
      </AppProvider>
    </SocketProvider>
  </StrictMode>,
);
