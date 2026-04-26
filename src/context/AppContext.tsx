/**
 * FamilyHubs.in — Global Application State Context
 * Shared state for tasks, parents, hubs, user session, and cross-component actions.
 * Integrates with Socket.io for real-time sync.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { ServiceCategory, User as UserType } from '../types';
import {
  MOCK_USER,
  MOCK_ADMIN,
  MOCK_PARENTS,
  MOCK_TASKS,
  MOCK_HUBS,
  MOCK_PROVIDERS,
  MOCK_TRANSACTIONS,
  MOCK_LOGS,
  MOCK_RESOURCES,
  SERVICES,
} from '../constants';

// --- Types ---
export type AppView =
  | 'landing'
  | 'dashboard'
  | 'booking'
  | 'wallet'
  | 'resources'
  | 'add-parent'
  | 'edit-parent'
  | 'profile'
  | 'services'
  | 'admin-dashboard';

export type AuthMode = 'login' | 'signup';

interface AppContextValue {
  // Session
  session: { id: string } | null;
  authMode: AuthMode;
  setAuthMode: (m: AuthMode) => void;
  user: UserType;
  login: () => void;
  logout: () => void;
  switchToAdmin: () => void;
  switchToUser: () => void;
  updateProfile: (data: Partial<UserType>) => void;

  // Navigation
  view: AppView;
  setView: (v: AppView) => void;

  // Tasks
  tasks: any[];
  setTasks: React.Dispatch<React.SetStateAction<any[]>>;
  selectedTask: string | null;
  setSelectedTask: (id: string | null) => void;
  handleTaskStatusUpdate: (taskId: string, status: string) => void;
  createTask: (task: any) => void;

  // Parents
  parents: any[];
  setParents: React.Dispatch<React.SetStateAction<any[]>>;
  editingParentId: string | null;
  setEditingParentId: (id: string | null) => void;
  selectedParentId: string;
  setSelectedParentId: (id: string) => void;
  deleteParent: (id: string) => void;

  // Hubs
  hubs: any[];
  setHubs: React.Dispatch<React.SetStateAction<any[]>>;

  // Services
  selectedCategories: ServiceCategory[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<ServiceCategory[]>>;
  toggleCategory: (cat: ServiceCategory) => void;
  startBooking: (category?: ServiceCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;

  // SOS
  showSOS: boolean;
  setShowSOS: (s: boolean) => void;
  handleSOS: () => void;
  handleSOSAcknowledge: (hubId: string) => void;

  // Static data
  providers: typeof MOCK_PROVIDERS;
  transactions: typeof MOCK_TRANSACTIONS;
  logs: typeof MOCK_LOGS;
  resources: typeof MOCK_RESOURCES;
  services: typeof SERVICES;
}

const AppContext = createContext<AppContextValue>({} as AppContextValue);

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();

  // --- Session State ---
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<UserType>(MOCK_USER);
  const [view, setView] = useState<AppView>('landing');

  // --- Data State ---
  const [tasks, setTasks] = useState(MOCK_TASKS as any[]);
  const [parents, setParents] = useState(MOCK_PARENTS as any[]);
  const [hubs, setHubs] = useState(MOCK_HUBS as any[]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>(MOCK_PARENTS[0].id);
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showSOS, setShowSOS] = useState(false);

  // --- Socket.io: Sync state on connect ---
  useEffect(() => {
    if (socket && isConnected) {
      // Initialize server with current state
      socket.emit('state:init', { tasks, hubs });

      // Join role-based room
      socket.emit('join:room', {
        role: user.role,
        hubId: user.hubId || 'hub_mgl',
      });
    }
  }, [socket, isConnected]);

  // --- Socket.io: Listen for real-time events ---
  useEffect(() => {
    if (!socket) return;

    // Task status updated by another client
    const handleTaskUpdated = (data: { taskId: string; status: string }) => {
      setTasks(prev =>
        prev.map(t => (t.id === data.taskId ? { ...t, status: data.status } : t))
      );
    };

    // New task created by another client
    const handleTaskCreated = (data: any) => {
      setTasks(prev => {
        // Avoid duplicates
        if (prev.find(t => t.id === data.id)) return prev;
        return [data, ...prev];
      });
    };

    // SOS broadcast received
    const handleSOSBroadcast = (data: any) => {
      setHubs(prev =>
        prev.map(h =>
          h.id === data.hubId
            ? { ...h, emergencyAlerts: (h.emergencyAlerts || 0) + 1 }
            : h
        )
      );
    };

    // SOS acknowledged
    const handleSOSAcknowledged = (data: { hubId: string }) => {
      setHubs(prev =>
        prev.map(h => (h.id === data.hubId ? { ...h, emergencyAlerts: 0 } : h))
      );
    };

    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:created', handleTaskCreated);
    socket.on('sos:broadcast', handleSOSBroadcast);
    socket.on('sos:acknowledged', handleSOSAcknowledged);

    return () => {
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:created', handleTaskCreated);
      socket.off('sos:broadcast', handleSOSBroadcast);
      socket.off('sos:acknowledged', handleSOSAcknowledged);
    };
  }, [socket]);

  // --- Actions ---
  const handleTaskStatusUpdate = useCallback(
    (taskId: string, status: string) => {
      // Update local state immediately (optimistic)
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status } : t)));

      // Broadcast via Socket.io
      if (socket && isConnected) {
        socket.emit('task:update', {
          taskId,
          status,
          updatedBy: user.name,
        });
      }
    },
    [socket, isConnected, user.name]
  );

  const createTask = useCallback(
    (task: any) => {
      setTasks(prev => [task, ...prev]);

      if (socket && isConnected) {
        socket.emit('task:create', task);
      }
    },
    [socket, isConnected]
  );

  const handleSOS = useCallback(() => {
    const hubId = user.hubId || 'hub_mgl';

    // Local update (optimistic)
    setHubs(prev =>
      prev.map(h =>
        h.id === hubId ? { ...h, emergencyAlerts: h.emergencyAlerts + 1 } : h
      )
    );

    // Broadcast via Socket.io
    if (socket && isConnected) {
      socket.emit('sos:trigger', {
        userId: user.id,
        hubId,
        parentName: parents[0]?.name || 'Parent',
        location: 'Miryalaguda Sector 4',
      });
    }
  }, [socket, isConnected, user, parents]);

  const handleSOSAcknowledge = useCallback(
    (hubId: string) => {
      setHubs(prev => prev.map(h => (h.id === hubId ? { ...h, emergencyAlerts: 0 } : h)));

      if (socket && isConnected) {
        socket.emit('sos:acknowledge', {
          hubId,
          acknowledgedBy: user.name,
        });
      }
    },
    [socket, isConnected, user.name]
  );

  const login = () => {
    if (user.email.toLowerCase().includes('admin')) {
      setUser(MOCK_ADMIN as any);
      setView('admin-dashboard');
    } else {
      setUser(MOCK_USER as any);
      setView('dashboard');
    }
    setSession({ id: user.id });
  };

  const logout = () => {
    setSession(null);
    setView('landing');
  };

  const switchToAdmin = () => {
    setUser(MOCK_ADMIN as any);
    setView('admin-dashboard');
  };

  const switchToUser = () => {
    setUser(MOCK_USER as any);
    setView('dashboard');
  };

  const updateProfile = (data: Partial<UserType>) => {
    setUser(prev => ({ ...prev, ...data }));
    setView('dashboard');
  };

  const deleteParent = (id: string) => {
    if (confirm('Are you sure you want to delete this parent profile?')) {
      setParents(parents.filter(p => p.id !== id));
    }
  };

  const toggleCategory = (cat: ServiceCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const startBooking = (category?: ServiceCategory) => {
    setSelectedCategories(category ? [category] : []);
    setView('booking');
  };

  return (
    <AppContext.Provider
      value={{
        session,
        authMode,
        setAuthMode,
        user,
        login,
        logout,
        switchToAdmin,
        switchToUser,
        updateProfile,
        view,
        setView,
        tasks,
        setTasks,
        selectedTask,
        setSelectedTask,
        handleTaskStatusUpdate,
        createTask,
        parents,
        setParents,
        editingParentId,
        setEditingParentId,
        selectedParentId,
        setSelectedParentId,
        deleteParent,
        hubs,
        setHubs,
        selectedCategories,
        setSelectedCategories,
        toggleCategory,
        startBooking,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        showSOS,
        setShowSOS,
        handleSOS,
        handleSOSAcknowledge,
        providers: MOCK_PROVIDERS,
        transactions: MOCK_TRANSACTIONS,
        logs: MOCK_LOGS,
        resources: MOCK_RESOURCES,
        services: SERVICES,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
