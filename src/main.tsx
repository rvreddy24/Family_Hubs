/**
 * FamilyHubs.in — Application Entry Point
 * Auth → real-time socket → app state.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AppProvider } from './context/AppContext';
import { LiveSignalToaster } from './components/ui/LiveSignalToaster';
import SupportChatWidget from './components/support/SupportChatWidget';
import App from './App.tsx';
import FamilyLanding from './pages/FamilyLanding';
import ProviderLanding from './pages/ProviderLanding';
import HubAdminLanding from './pages/HubAdminLanding';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<FamilyLanding />} />
              <Route path="/providers" element={<ProviderLanding />} />
              <Route path="/hubs" element={<HubAdminLanding />} />
              <Route
                path="/app/*"
                element={
                  <>
                    <App />
                    <LiveSignalToaster />
                    <SupportChatWidget />
                  </>
                }
              />
            </Routes>
          </AppProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
