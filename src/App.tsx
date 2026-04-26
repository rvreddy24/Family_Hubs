/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Baby,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Heart,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  Pill,
  Plus,
  PlusCircle,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { MOCK_USER, MOCK_ADMIN, MOCK_PARENTS, MOCK_TASKS, MOCK_LOGS, MOCK_RESOURCES, MOCK_TRANSACTIONS, SERVICES, MOCK_PROVIDERS, MOCK_HUBS } from './constants';
import { ServiceCategory, User as UserType } from './types';

// --- Components ---

type AppView = 'landing' | 'dashboard' | 'booking' | 'wallet' | 'resources' | 'add-parent' | 'edit-parent' | 'profile' | 'services' | 'admin-dashboard';
type AuthMode = 'login' | 'signup';

const Navbar = ({ onViewChange, currentView, user, onLogout, onSOS }: { onViewChange: (v: AppView) => void; currentView: AppView, user: any, onLogout: () => void, onSOS: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (v: AppView) => {
    onViewChange(v);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <h1 
          onClick={() => handleNav('landing')}
          className="text-lg md:text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-white">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <span className="hidden xs:inline">FamilyHubs</span>
        </h1>
        {currentView !== 'landing' && (
          <div className="hidden md:flex items-center gap-6 border-l border-gray-100 pl-6">
            <button onClick={() => handleNav('dashboard')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'dashboard' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Dashboard</button>
            {user.role === 'admin' && (
              <button onClick={() => handleNav('admin-dashboard')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'admin-dashboard' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Hub Admin</button>
            )}
            <button onClick={() => handleNav('services')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'services' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Services</button>
            <button onClick={() => handleNav('resources')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'resources' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Library</button>
            <button onClick={() => handleNav('wallet')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'wallet' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Wallet</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {currentView !== 'landing' && (
          <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <MapPin className="w-4 h-4" />
            Miryalaguda
          </div>
        )}
        
        <div className="flex items-center gap-2 border-l border-gray-100 pl-2 md:pl-4">
          {user.role === 'child' && (
            <button 
              onClick={onSOS}
              className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all animate-pulse shadow-lg shadow-red-100"
              title="SEND EMERGENCY SOS"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}
          
          <div 
            onClick={() => handleNav('profile')}
            className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
          >
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-gray-600" />
            )}
          </div>
          <span 
            onClick={() => handleNav('profile')}
            className="text-sm font-semibold hidden md:inline cursor-pointer hover:text-accent transition-colors"
          >
            {user.name}
          </span>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-50 rounded-lg lg:hidden"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          
          <button 
            onClick={onLogout}
            className="hidden lg:flex p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-6 shadow-xl lg:hidden flex flex-col gap-4"
          >
            <button onClick={() => handleNav('dashboard')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Dashboard <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={() => handleNav('services')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Services <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={() => handleNav('resources')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Resources <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={() => handleNav('wallet')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Wallet <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={onLogout} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-red-50 text-red-600">Logout <LogOut className="w-5 h-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const AuthPage = ({ mode, onSwitch, onLogin }: { mode: AuthMode, onSwitch: (m: AuthMode) => void, onLogin: () => void }) => {
  return (
    <div className="min-h-screen pt-20 bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-200 mb-6">
            <Heart className="w-10 h-10 fill-current" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500">
            {mode === 'login' 
              ? 'Enter your credentials to access your dashboard' 
              : 'Join FamilyHubs to manage care for your loved ones'}
          </p>
        </div>

        <div className="uc-card p-8 space-y-6">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="John Doe" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" required />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-accent text-white rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]">
              {mode === 'login' ? 'Login to Dashboard' : 'Create Free Account'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or continue with</span></div>
          </div>

          <button onClick={onLogin} className="w-full py-4 border border-gray-100 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Sign in with Google
          </button>
        </div>

        <p className="text-center text-sm font-medium text-gray-500">
          {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => onSwitch(mode === 'login' ? 'signup' : 'login')}
            className="ml-1 text-accent font-bold hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const ServiceCard = ({ icon: Icon, title, description, active = false }: { icon: any, title: string, description: string, active?: boolean }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className={`uc-card cursor-pointer transition-all duration-300 ${active ? 'border-accent ring-1 ring-accent' : 'hover:border-gray-300'}`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${active ? 'bg-accent text-white' : 'bg-gray-50 text-gray-700'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
  </motion.div>
);

// --- Admin Dashboard Components ---

const AdminDashboard = ({ hubId, tasks, setTasks, hubs, setHubs, onLogout }: { hubId: string, tasks: any[], setTasks: React.Dispatch<React.SetStateAction<any[]>>, hubs: any[], setHubs: React.Dispatch<React.SetStateAction<any[]>>, onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'users' | 'jobs' | 'finances' | 'alerts'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const providers = MOCK_PROVIDERS;
  const currentHub = hubs.find(h => h.id === hubId) || hubs[0];
  const pendingVerifications = providers.filter(p => !p.verified);
  const activeTasks = tasks.filter(t => t.status !== 'settled');

  const handleUpdateStatus = (taskId: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        activeTab === id ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-50 hover:text-primary'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden relative">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[110] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col p-6 z-[120] transition-transform duration-300 lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-10 px-2 lg:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter">SafeHub</h1>
              <p className="text-[10px] font-black text-accent uppercase tracking-widest">Admin Control</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem id="overview" icon={Activity} label="Live Feed" />
          <SidebarItem id="providers" icon={User} label="Providers" />
          <SidebarItem id="users" icon={Heart} label="Families" />
          <SidebarItem id="jobs" icon={ShieldCheck} label="Job Status" />
          <SidebarItem id="finances" icon={Wallet} label="Escrow" />
          <SidebarItem id="alerts" icon={ShieldAlert} label="Alerts" />
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase text-gray-500">System Nominal</span>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-600 transition-all">Sign Out</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Header */}
        <div className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-[100]">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-primary">
             <Menu className="w-6 h-6" />
           </button>
           <div className="text-center">
             <h2 className="text-sm font-black tracking-tight">{currentHub.name}</h2>
             <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Command Center</p>
           </div>
           <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        <div className="p-4 md:p-8 space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{currentHub.name}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                {activeTab === 'overview' && 'Central Region Operations Broadcast'}
                {activeTab === 'providers' && 'Resource Management & Verification'}
                {activeTab === 'users' && 'Family Registry & Care Management'}
                {activeTab === 'jobs' && 'Job Life-Cycle Monitoring'}
                {activeTab === 'finances' && 'Escrow & Settlement Ledger'}
                {activeTab === 'alerts' && 'Emergency Priority Command'}
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="flex-1 md:text-right">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">Hub Capacity</p>
                 <div className="flex items-center gap-2 mt-1">
                   <div className="flex-1 md:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full w-[65%]" />
                   </div>
                   <span className="text-[10px] font-black">65%</span>
                 </div>
               </div>
               <button className="p-3 bg-gray-50 rounded-xl relative hover:bg-gray-100 transition-colors">
                 <Plus className="w-5 h-5 text-gray-400" />
               </button>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-8">
              {/* Vitals Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="uc-card p-6 bg-white flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-0">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center sm:mb-3">
                      <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block sm:mb-1">Active Jobs</span>
                    <span className="text-2xl font-black text-primary">{currentHub.activeJobs}</span>
                  </div>
                </div>
                <div className="uc-card p-6 bg-white flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-0">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center sm:mb-3">
                      <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block sm:mb-1">Live Resources</span>
                    <span className="text-2xl font-black text-primary">{currentHub.totalProviders}</span>
                  </div>
                </div>
                <div className="uc-card p-6 bg-white flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-0">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center sm:mb-3">
                      <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-red-400 tracking-widest block sm:mb-1">Active Alerts</span>
                    <span className="text-2xl font-black text-red-600">{currentHub.emergencyAlerts}</span>
                  </div>
                </div>
              </div>

               {/* Main Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="uc-card p-5 md:p-8 bg-white overflow-hidden">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                      <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Operations Broadcast</h3>
                      <div className="p-2 bg-gray-50 rounded-lg"><Activity className="w-4 h-4 text-emerald-500" /></div>
                    </div>
                    <div className="space-y-4">
                      {activeTasks.map(task => (
                        <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-accent transition-all cursor-pointer">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                            {task.category === 'medical' ? <Stethoscope className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-bold text-primary">{task.title}</h4>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{task.status.replace('_', ' ')}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Care Manager: {task.careManager?.name}</p>
                          </div>
                          <div className="w-full sm:w-auto flex sm:flex-col items-center justify-between gap-2 border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0">
                            <div className="text-right sm:w-full">
                              <p className="text-xs font-black text-primary">${task.cost.toFixed(2)}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Escrow Locked</p>
                            </div>
                            <div className="flex gap-1.5 mt-1">
                              {task.status === 'pending' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'assigned'); }}
                                  className="px-2 py-1 bg-accent text-white text-[8px] font-black uppercase rounded hover:bg-black transition-all"
                                >
                                  Dispatch
                                </button>
                              )}
                              {task.status === 'assigned' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'in_progress'); }}
                                  className="px-2 py-1 bg-blue-500 text-white text-[8px] font-black uppercase rounded hover:bg-black transition-all"
                                >
                                  Start
                                </button>
                              )}
                              {task.status === 'in_progress' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'settled'); }}
                                  className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded hover:bg-black transition-all"
                                >
                                  Settled
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="uc-card p-6 bg-white">
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Weekly Jobs Growth</h4>
                        <div className="h-48 flex items-end justify-between gap-2 px-2">
                           {[45, 62, 58, 75, 90, 82, 95].map((h, i) => (
                             <div key={i} className="flex-1 bg-gray-50 rounded-t-lg relative group overflow-hidden">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  className="w-full bg-accent absolute bottom-0 group-hover:bg-primary transition-colors"
                                />
                             </div>
                           ))}
                        </div>
                        <div className="flex justify-between mt-4 text-[8px] font-black text-gray-400 uppercase tracking-widest px-2">
                           <span>Mon</span>
                           <span>Sun</span>
                        </div>
                     </div>
                     <div className="uc-card p-6 bg-white overflow-hidden relative">
                        <div className="relative z-10">
                          <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Service Mix</h4>
                          <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-600">Medical Care</span>
                                <span className="text-[10px] font-black">42%</span>
                             </div>
                             <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full w-[42%]" />
                             </div>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-600">Home Essentials</span>
                                <span className="text-[10px] font-black">35%</span>
                             </div>
                             <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-[35%]" />
                             </div>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-600">Admin Support</span>
                                <span className="text-[10px] font-black">23%</span>
                             </div>
                             <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full w-[23%]" />
                             </div>
                          </div>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'providers' && (
                <div className="uc-card p-5 md:p-8 bg-white">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Provider Pool</h3>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase">All</button>
                      <button className="px-3 py-1 text-gray-400 text-[10px] font-black uppercase">Active</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {providers.map(prov => (
                      <div key={prov.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-xl transition-all group flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <img src={prov.photo} className="w-12 h-12 rounded-xl" />
                          <div className="flex-1">
                            <h4 className="font-bold text-primary flex items-center gap-2">
                              {prov.name}
                              {prov.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{prov.skills.join(' • ')}</span>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                            prov.activeStatus === 'idle' ? 'bg-blue-50 text-blue-600' : 
                            prov.activeStatus === 'on_job' ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {prov.activeStatus.replace('_', ' ')}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                          <div className="flex gap-4">
                            <div>
                               <p className="text-[8px] font-black text-gray-400 uppercase">Rating</p>
                               <span className="text-xs font-black">{prov.rating || 'N/A'}</span>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-gray-400 uppercase">Jobs</p>
                               <span className="text-xs font-black">{prov.totalJobs}</span>
                            </div>
                          </div>
                          <button className="text-[10px] font-black text-accent uppercase hover:underline">Full Profile</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="uc-card p-5 md:p-8 bg-white">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Family Registry</h3>
                  </div>
                  <div className="space-y-4">
                    {MOCK_PARENTS.map(parent => (
                      <div key={parent.id} className="p-5 bg-gray-50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-100 group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                              <Heart className="w-6 h-6 text-red-500" />
                           </div>
                           <div>
                             <h4 className="font-bold text-primary">{parent.name}</h4>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{parent.address}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                           <button className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50">Medical History</button>
                           <button className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-accent">Contact Family</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="uc-card p-5 md:p-8 bg-white">
                   <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Job Monitoring</h3>
                  </div>
                  <div className="space-y-4">
                    {tasks.map(task => (
                      <div key={task.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm">
                               {task.category === 'medical' ? <Stethoscope className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                            </div>
                            <div>
                               <h4 className="font-bold text-sm">{task.title}</h4>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{task.id}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                            task.status === 'settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>{task.status.replace('_', ' ')}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                           <div className="bg-white p-3 rounded-xl border border-gray-100">
                             <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Provider</p>
                             <p className="text-[10px] font-bold truncate">{task.careManager?.name || 'Unassigned'}</p>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-gray-100">
                             <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Fee</p>
                             <p className="text-[10px] font-bold">${task.cost}</p>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-gray-100 col-span-2">
                             <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Instructions Snapshot</p>
                             <p className="text-[10px] font-bold truncate italic">"{task.instructions}"</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'finances' && (
                <div className="uc-card p-5 md:p-8 bg-white">
                   <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Ledger History</h3>
                  </div>
                  <div className="space-y-4">
                    {MOCK_TRANSACTIONS.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-4">
                           <div className={`p-2 rounded-xl ${tx.amount < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {tx.amount < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                           </div>
                           <div>
                             <p className="font-bold text-sm text-primary">{tx.description}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{tx.id} • {new Date(tx.date).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-sm ${tx.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                          </p>
                          <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">Settled</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="uc-card p-5 md:p-8 bg-white">
                   <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Emergency Response</h3>
                  </div>
                  {currentHub.emergencyAlerts > 0 ? (
                    <div className="p-8 bg-red-50 border border-red-100 rounded-3xl space-y-6 text-center">
                       <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-200 animate-bounce">
                          <ShieldAlert className="w-10 h-10" />
                       </div>
                       <div className="space-y-2">
                         <h4 className="text-2xl font-black text-red-600">HIGH PRIORITY ALERT</h4>
                         <p className="text-gray-600 text-sm font-medium">SOS Signal received from Miryalaguda Sector 4 (User: Parent Varshith)</p>
                       </div>
                       <div className="flex gap-4 max-w-sm mx-auto">
                         <button className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-200 uppercase tracking-widest text-xs">Dispatch Resource</button>
                         <button 
                           onClick={() => {
                             setHubs(prev => prev.map(h => h.id === hubId ? { ...h, emergencyAlerts: 0 } : h));
                           }}
                           className="px-6 py-4 bg-white border border-red-100 text-red-600 font-black rounded-2xl uppercase tracking-widest text-xs"
                         >
                           Acknowledge
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="p-20 text-center space-y-4 opacity-30">
                       <ShieldCheck className="w-16 h-16 mx-auto text-gray-300" />
                       <p className="font-black text-gray-400 uppercase tracking-widest">No Active SOS Signals</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="xl:col-span-4 space-y-8">
              <div className="uc-card p-8 bg-indigo-600 text-white border-none relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet className="w-32 h-32" /></div>
                 <div className="relative z-10 space-y-6">
                   <div>
                     <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Hub Settlement Capital</p>
                     <h3 className="text-3xl sm:text-4xl font-black mt-1">$12,450.00</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/10 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-white/40 uppercase mb-1">Locked</p>
                       <p className="font-bold text-sm sm:text-base">$8,200</p>
                     </div>
                     <div className="bg-white/10 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-white/40 uppercase mb-1">Fee Yield</p>
                       <p className="font-bold text-sm sm:text-base text-accent">$450</p>
                     </div>
                   </div>
                   <button className="w-full py-4 bg-accent hover:bg-white hover:text-accent rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Download Ledger Report</button>
                 </div>
              </div>

              <div className="uc-card p-6 md:p-8 bg-white">
                <h4 className="font-black text-primary text-sm uppercase tracking-widest mb-6">Verification Queue</h4>
                <div className="space-y-4">
                  {pendingVerifications.map(prov => (
                    <div key={prov.id} className="p-4 rounded-[24px] border border-gray-100 bg-gray-50/50 space-y-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <img src={prov.photo} className="w-10 h-10 rounded-xl" />
                        <div>
                          <p className="font-bold text-sm">{prov.name}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase">Docs Waiting Audit</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button className="flex-1 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-accent transition-all">Approve</button>
                         <button className="px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-red-50 transition-colors group">
                           <Plus className="w-4 h-4 text-gray-400 group-hover:text-red-500 rotate-45" />
                         </button>
                      </div>
                    </div>
                  ))}
                  {pendingVerifications.length === 0 && <p className="text-center text-[10px] text-gray-400 font-bold uppercase py-4">Queue Clear</p>}
                </div>
              </div>

              <div className="uc-card p-6 border-dashed border-2 border-gray-200 bg-white flex items-center gap-4 group cursor-pointer hover:border-accent hover:bg-gray-50 transition-all">
                 <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-accent transition-colors"><Settings className="w-6 h-6" /></div>
                 <div>
                    <h5 className="font-bold text-sm">System Protocols</h5>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Configure Hub Settings</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

// --- Main Views ---

export default function App() {
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [view, setView] = useState<AppView>('landing');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [parents, setParents] = useState(MOCK_PARENTS);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [hubs, setHubs] = useState(MOCK_HUBS);
  const [user, setUser] = useState<UserType>(MOCK_USER);
  const [isSOSActive, setIsSOSActive] = useState(false);

  const handleSOS = () => {
     setIsSOSActive(true);
     // Update hubs state to reflect the alert
     setHubs(prev => prev.map(h => h.id === (user.hubId || 'hub_mgl') ? { ...h, emergencyAlerts: h.emergencyAlerts + 1 } : h));
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedParentId, setSelectedParentId] = useState<string>(MOCK_PARENTS[0].id);

  const [showSOS, setShowSOS] = useState(false);

  const vitalsHistory = [
    { date: 'Apr 18', value: 120 },
    { date: 'Apr 19', value: 122 },
    { date: 'Apr 20', value: 118 },
    { date: 'Apr 21', value: 125 },
    { date: 'Apr 22', value: 121 },
    { date: 'Apr 23', value: 119 },
    { date: 'Apr 24', value: 120 },
  ];

  const filteredServices = SERVICES.filter(s => 
    (activeCategory === 'all' || s.id === activeCategory) &&
    (s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const startBooking = (category?: ServiceCategory) => {
    setSelectedCategories(category ? [category] : []);
    setView('booking');
  };

  const toggleCategory = (cat: ServiceCategory) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const deleteParent = (id: string) => {
    if (confirm('Are you sure you want to delete this parent profile?')) {
      setParents(parents.filter(p => p.id !== id));
    }
  };

  const updateProfile = (data: Partial<typeof MOCK_USER>) => {
    setUser(prev => ({ ...prev, ...data }));
    setView('dashboard');
  };

  const login = () => {
    // If it's a demo, we follow the email-based role assignment
    if (user.email.toLowerCase().includes('admin')) {
      setUser(MOCK_ADMIN);
      setView('admin-dashboard');
    } else {
      setUser(MOCK_USER);
      setView('dashboard');
    }
    setSession({ id: user.id });
  };

  const switchToAdmin = () => {
    setUser(MOCK_ADMIN);
    setView('admin-dashboard');
  };

  const switchToUser = () => {
    setUser(MOCK_USER);
    setView('dashboard');
  };

  const logout = () => {
    setSession(null);
    setView('landing');
  };

  const currentEditingParent = parents.find(p => p.id === editingParentId) || parents[0];

  const stats = [
    { label: 'Upcoming Tasks', value: tasks.filter(t => t.status !== 'settled').length.toString().padStart(2, '0'), icon: Activity, color: 'text-blue-600' },
    { label: 'Care Quality', value: '4.9/5', icon: ShieldCheck, color: 'text-green-600' },
    { label: 'Escrow Lock', value: `$${user.escrowBalance.toFixed(2)}`, icon: Lock, color: 'text-indigo-600' },
  ];

  if (!session && view !== 'landing') {
    return <AuthPage mode={authMode} onSwitch={setAuthMode} onLogin={login} />;
  }

  return (
    <div className={`min-h-screen bg-white ${view !== 'admin-dashboard' ? 'pt-20' : ''}`}>
      {view !== 'admin-dashboard' && (
        <Navbar onViewChange={setView} currentView={view} user={user} onLogout={logout} onSOS={() => setShowSOS(true)} />
      )}

            {/* SOS Modal */}
      <AnimatePresence>
        {showSOS && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/90 backdrop-blur-md"
              onClick={() => setShowSOS(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[32px] p-8 text-center space-y-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-shimmer" />
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-primary">Emergency SOS</h2>
                <p className="text-gray-500 font-medium">Broadcasting live location & medical records to nearby hubs and pre-verified neighbors.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                    <span className="text-[10px] font-black text-red-900 uppercase">Miryalaguda Hub Notified</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSOS(false);
                  handleSOS(); // Increment admin count
                }}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
              >
                Confirm SOS Broadcast
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container mx-auto px-4 md:px-6 py-6 md:py-10"
          >
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-16 md:mb-24">
              <div className="flex-1 space-y-6 md:space-y-8 order-2 md:order-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-accent text-[10px] md:text-xs font-black tracking-widest uppercase mx-auto md:mx-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Safety First
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] md:leading-[1] tracking-tighter">
                  Care for your <br className="hidden lg:block" /><span className="text-accent underline decoration-accent/20 underline-offset-4">Parents.</span>
                </h2>
                <p className="text-base md:text-lg text-gray-500 max-w-lg leading-relaxed mx-auto md:mx-0 font-medium">
                  Trusted by NRIs worldwide to manage health, essentials, and home logistics for parents in Miryalaguda and Nalgonda.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-10 justify-center md:justify-start">
                  <button 
                    onClick={() => {
                      setUser(MOCK_USER);
                      setView('dashboard');
                      setSession({ id: 'user_1' });
                    }}
                    className="group relative px-10 py-6 bg-primary text-white rounded-[32px] font-black text-xl overflow-hidden active:scale-95 transition-all shadow-2xl shadow-gray-200"
                  >
                    <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-expo" />
                    <span className="relative flex items-center gap-3">
                       Family Portal
                       <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      setUser(MOCK_ADMIN);
                      setView('admin-dashboard');
                      setSession({ id: 'admin_1' });
                    }}
                    className="px-10 py-6 bg-white border-2 border-gray-100 text-primary rounded-[32px] font-black text-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-accent transition-all active:scale-95 group"
                  >
                    Hub Admin
                    <LayoutDashboard className="w-6 h-6 text-accent group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              </div>
              <div className="flex-1 w-full max-w-lg relative order-1 md:order-2">
                <div className="absolute -inset-4 bg-accent/5 rounded-3xl -rotate-2" />
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <img 
                    src="https://images.unsplash.com/photo-1594951466034-704983050a41?auto=format&fit=crop&q=80&w=600" 
                    alt="Elderly Couple 1" 
                    className="rounded-2xl shadow-xl aspect-square object-cover"
                  />
                  <div className="grid grid-rows-2 gap-4">
                    <img 
                      src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&q=80&w=400" 
                      alt="Elderly Couple 2" 
                      className="rounded-2xl shadow-xl h-full object-cover"
                    />
                    <img 
                      src="https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=400" 
                      alt="Elderly Couple 3" 
                      className="rounded-2xl shadow-xl h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 md:space-y-12">
              <div className="text-center max-w-2xl mx-auto px-4">
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Comprehensive Support Management</h3>
                <p className="text-gray-500 mt-4 text-base md:text-lg">Every detail managed with professional precision and real-time transparency.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {SERVICES.slice(0, 3).map(s => (
                  <div key={s.id} onClick={() => startBooking(s.id as ServiceCategory)} className="cursor-pointer">
                    <ServiceCard 
                      icon={s.icon} 
                      title={s.title} 
                      description={s.desc}
                    />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <button 
                  onClick={() => setView('services')}
                  className="bg-accent text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all mx-auto"
                >
                  View All Support Services <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'admin-dashboard' && user.role === 'admin' && (
          <motion.div 
            key="admin-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <AdminDashboard 
              hubId={user.hubId || 'hub_mgl'} 
              tasks={tasks}
              setTasks={setTasks}
              hubs={hubs}
              setHubs={setHubs}
              onLogout={logout} 
            />
          </motion.div>
        )}

        {view === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8"
          >
            {/* Contextual Header & Stats Row */}
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">Control Center</h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-accent" /> Active in Miryalaguda Hub
                </p>
              </div>
              <div className="flex-1 max-w-md hidden xl:block">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center gap-3 overflow-hidden relative group">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex gap-8 animate-marquee whitespace-nowrap text-[10px] font-black uppercase text-gray-500 tracking-tighter">
                    <span>Care Manager Arrived at H.No 4-12</span>
                    <span>Dad's Morning Vitals Recorded</span>
                    <span>Escrow Released for Task #204</span>
                    <span>New Specialist Added to Library</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full lg:w-auto min-w-[300px] md:min-w-[450px]">
                {stats.map((stat, i) => (
                  <div key={i} className="uc-card p-3 md:p-4 flex flex-col items-center justify-center text-center hover:border-accent group transition-all">
                    <stat.icon className={`w-5 h-5 mb-1.5 ${stat.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter mb-0.5">{stat.label}</span>
                    <span className="text-lg font-black text-primary">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* My Parents - Horizontal Scroll */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">My Family Profiles</h3>
                <button 
                  onClick={() => setView('add-parent')}
                  className="text-[10px] font-black text-accent flex items-center gap-1 hover:underline uppercase tracking-tight"
                >
                  <Plus className="w-3 h-3" /> Add Family Member
                </button>
              </div>
              <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 no-scrollbar">
                {parents.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => { setSelectedParentId(p.id); }}
                    className={`flex-shrink-0 w-[280px] md:w-[320px] uc-card border-none group cursor-pointer overflow-hidden p-6 relative transition-all ${
                      selectedParentId === p.id ? 'bg-primary text-white shadow-2xl ring-4 ring-accent/20' : 'bg-gray-50 text-primary border border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <h4 className="text-xl font-bold">{p.name}</h4>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter ${selectedParentId === p.id ? 'text-white/40' : 'text-gray-400'}`}>
                          <MapPin className="w-3 h-3" /> {p.city} • <User className="w-3 h-3" /> {p.gender}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingParentId(p.id); setView('edit-parent'); }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedParentId === p.id ? 'bg-white/10 hover:bg-accent' : 'bg-white hover:bg-gray-100'}`}
                        >
                          <Edit2 className={`w-5 h-5 ${selectedParentId === p.id ? 'text-white' : 'text-primary'}`} />
                        </button>
                      </div>
                    </div>

                    {p.vitals && (
                      <div className={`grid grid-cols-3 gap-2 p-3 rounded-xl border ${selectedParentId === p.id ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="text-center">
                          <div className={`text-[8px] uppercase font-bold mb-0.5 ${selectedParentId === p.id ? 'text-white/40' : 'text-gray-400'}`}>BP</div>
                          <div className="text-xs font-black">{p.vitals.bloodPressure}</div>
                        </div>
                        <div className={`text-center border-x ${selectedParentId === p.id ? 'border-white/10' : 'border-gray-100'}`}>
                          <div className={`text-[8px] uppercase font-bold mb-0.5 ${selectedParentId === p.id ? 'text-white/40' : 'text-gray-400'}`}>Heart</div>
                          <div className="text-xs font-black">{p.vitals.heartRate}</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-[8px] uppercase font-bold mb-0.5 ${selectedParentId === p.id ? 'text-white/40' : 'text-gray-400'}`}>Sugar</div>
                          <div className="text-xs font-black">{p.vitals.glucose.split(' ')[0]}</div>
                        </div>
                      </div>
                    )}

                    <div className={`mt-4 pt-4 border-t flex items-center justify-between ${selectedParentId === p.id ? 'border-white/10' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className={`text-[9px] font-black uppercase ${selectedParentId === p.id ? 'text-white/40' : 'text-gray-400'}`}>Healthy Tracking</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${selectedParentId === p.id ? 'text-white/30' : 'text-gray-300'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Regional Node Status - Special for Kids */}
              <div className="uc-card p-6 bg-primary text-white border-none shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <Target className="w-20 h-20" />
                 </div>
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center">
                          <Activity className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="font-bold">Sector 4 Status</h4>
                          <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">Miryalaguda Hub</p>
                       </div>
                    </div>
                    <div className="space-y-4 pt-2">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/60">Live Care Managers</span>
                          <span className="text-[10px] font-black">12 Near You</span>
                       </div>
                       <div className="flex -space-x-2">
                          {[1,2,3,4,5].map(i => (
                            <img key={i} src={`https://i.pravatar.cc/150?u=${i+20}`} className="w-6 h-6 rounded-full border-2 border-primary" />
                          ))}
                          <div className="w-6 h-6 rounded-full bg-accent border-2 border-primary flex items-center justify-center text-[8px] font-black">+7</div>
                       </div>
                       <p className="text-[10px] text-white/40 leading-tight">Your parent is in a 'High Density' care sector. Estimated response time: &lt; 4 mins.</p>
                    </div>
                 </div>
              </div>

              <div className="uc-card p-6 bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Pill className="w-20 h-20 text-emerald-600" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 leading-tight">Medicine Schedule</h4>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Automatic Refills</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-emerald-100/50">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-emerald-900">Amlip 5mg</p>
                        <p className="text-[9px] text-emerald-600 font-bold">NEXT: MAY 12</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-emerald-100/50">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-emerald-900">Metformin 500mg</p>
                        <p className="text-[9px] text-emerald-600 font-bold">NEXT: MAY 15</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 transition-all active:scale-95">
                    Sync Subscriptions
                  </button>
                </div>
              </div>

              <div className="uc-card p-6 bg-accent border-none shadow-xl shadow-blue-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-20 h-20 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                  <h4 className="font-bold text-white text-lg">Family Noticeboard</h4>
                  <p className="text-white/60 text-[11px] leading-tight font-medium">Leave a note for the next care manager visit.</p>
                  <div className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl border border-white/10">
                    <img src={MOCK_USER.profileImage} className="w-8 h-8 rounded-full border-2 border-white/20" />
                    <p className="text-[11px] text-white/80 font-bold">"Please ask dad if he wants to visit the temple this Sunday."</p>
                  </div>
                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all border border-white/10">
                    Post New Note
                  </button>
                </div>
              </div>

              <div className="uc-card p-6 border-dashed border-2 border-gray-100 bg-white/50 group hover:border-accent/40 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-400 group-hover:bg-accent group-hover:text-white rounded-xl flex items-center justify-center transition-all">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Document Vault</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Prescriptions • Reports</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-[3/4] bg-gray-50 rounded-lg border border-gray-100 p-2 flex items-center justify-center">
                    <div className="w-full h-full border border-dashed border-gray-200 rounded flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                  <div className="aspect-[3/4] bg-blue-50 rounded-lg border border-blue-100 p-2 flex flex-col items-center justify-center">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px] mb-1 font-bold">PDF</div>
                    <p className="text-[8px] font-black text-blue-600 text-center">DR_RAO_MAR_25</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Task Area - Horizontal Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Task Sidebar/List */}
              <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Live Services</h3>
                  <button onClick={() => setView('services')} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-accent transition-all active:scale-90">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                  {tasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative shadow-sm ${
                        selectedTask === task.id ? 'bg-white border-accent ring-1 ring-accent' : 'bg-white border-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded w-fit mb-2 ${
                        task.status === 'settled' ? 'bg-green-100 text-green-700' : 
                        task.status === 'completed' ? 'bg-orange-100 text-orange-700' : 
                        task.status === 'pending' ? 'bg-gray-100 text-gray-500' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </div>
                      <h4 className="font-bold text-primary text-base mb-1 line-clamp-1">{task.title}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1">
                        <User className="w-3 h-3" /> {task.careManager?.name || 'Hub Dispatch Pending'} • ${task.cost}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Compact Wallet Widget - Now in Sidebar on Desktop */}
                <div className="uc-card bg-primary text-white border-none p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
                  <div className="relative z-10 space-y-4">
                    <div className="space-y-1">
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Available Funds</p>
                      <h3 className="text-3xl font-black">${user.walletBalance.toFixed(2)}</h3>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[9px] text-white/40 font-bold uppercase">Locked Escrow</span>
                      <span className="text-xs font-black text-accent">${user.escrowBalance.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => setView('wallet')}
                      className="w-full py-3 bg-accent hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      Manage Wallet <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="uc-card p-6 border-dashed border-2 border-gray-100 bg-white/50 group hover:border-accent/40 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-50 text-gray-400 group-hover:bg-accent group-hover:text-white rounded-xl flex items-center justify-center transition-all">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Document Vault</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Prescriptions • Reports</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-[3/4] bg-gray-50 rounded-lg border border-gray-100 p-2 flex items-center justify-center">
                      <div className="w-full h-full border border-dashed border-gray-200 rounded flex items-center justify-center">
                        <Plus className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="aspect-[3/4] bg-blue-50 rounded-lg border border-blue-100 p-2 flex flex-col items-center justify-center">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px] mb-1 font-bold">PDF</div>
                      <p className="text-[8px] font-black text-blue-600 text-center">DR_RAO_MAR_25</p>
                    </div>
                  </div>
                </div>

                <div className="uc-card p-0 overflow-hidden relative aspect-square bg-gray-100 group">
                  <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black tracking-widest text-white uppercase">Home Precinct</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-tight">{parents.find(p => p.id === selectedParentId)?.address}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black text-white uppercase border border-white/20">
                    4.2KM From Hub
                  </div>
                </div>

                <div className="uc-card p-6 bg-red-50 border-red-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span className="text-[10px] font-black tracking-widest text-red-900 uppercase">Emergency Protocol</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Local Guardian</p>
                        <p className="font-bold text-primary">{parents.find(p => p.id === selectedParentId)?.emergencyContact}</p>
                      </div>
                      <a href={`tel:${parents.find(p => p.id === selectedParentId)?.emergencyContact}`} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between border-t border-red-100 pt-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Primary Physician</p>
                        <p className="font-bold text-primary">Dr. V. Rao</p>
                      </div>
                      <a href="tel:08689243555" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Detail View (The CFO Panel) */}
              <div className="lg:col-span-8 xl:col-span-9">
                <div className="uc-card min-h-[600px] p-6 md:p-10">
                  {selectedTask ? (
                    <div className="space-y-8">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-accent" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Security Vault</h4>
                          </div>
                          <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded-md font-black tracking-tighter">BANK-GRADE LOGS</span>
                        </div>
                        
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Safe Entry Code</span>
                              <p className="text-[10px] text-accent font-black uppercase tracking-widest">Share via WhatsApp</p>
                            </div>
                            <div className="flex gap-1">
                              {(tasks.find(t => t.id === selectedTask)?.verificationCode || '----').split('').map((char, i) => (
                                <span key={i} className="w-10 h-12 bg-white border-2 border-accent/20 rounded-xl flex items-center justify-center font-black text-accent text-2xl shadow-sm">
                                  {char}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Live Verification Active</span>
                            </div>
                            <div className="flex gap-2">
                              <button className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors shadow-sm active:scale-90" title="Send to Parent via WhatsApp">
                                <Phone className="w-4 h-4" />
                              </button>
                              <button className="text-[10px] font-black text-accent hover:underline uppercase tracking-tighter">Regenerate Code</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Safety Protocol Banner */}
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-red-900 uppercase tracking-tight">Emergency Protocol</p>
                          <p className="text-[10px] text-red-700 leading-tight">If your parent feels unsafe or the provider refuses identification, instruct them to say "Safety Override" and close the door. Contact our 24/7 Miryalaguda Hub immediately.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-accent" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Provider Credentials</h4>
                          </div>
                          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Vetted Agency Partner</span>
                        </div>

                        {/* Agency Identity Badge */}
                        <div className="bg-primary rounded-2xl p-4 text-white flex items-center gap-4 shadow-lg">
                          <img src={tasks.find(t => t.id === selectedTask)?.careManager?.photo || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100'} className="w-16 h-16 rounded-xl object-cover border-2 border-white/20" />
                          <div className="flex-1">
                            <h5 className="font-bold text-lg leading-tight">{tasks.find(t => t.id === selectedTask)?.careManager?.name || 'Hub Allocating Resource...'}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex text-accent">
                                {[1,2,3,4,5].map(star => <Activity key={star} className="w-3 h-3 fill-current" />)}
                              </div>
                              <span className="text-[10px] font-bold text-white/60">4.9 (120+ Services)</span>
                            </div>
                            <p className="text-[10px] text-white/40 mt-1 uppercase font-black tracking-widest">ID: {tasks.find(t => t.id === selectedTask)?.careManager?.id || 'PENDING'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-accent" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Physical Evidence</h4>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <Activity className="w-3 h-3" />
                            Live Metadata
                          </div>
                        </div>

                        {/* Evidence Previews */}
                        {tasks.find(t => t.id === selectedTask)?.evidence && (
                          <div className="grid grid-cols-3 gap-4">
                            {tasks.find(t => t.id === selectedTask)?.evidence?.commuteSelfie && (
                              <div className="space-y-2 group">
                                <div className="relative">
                                  <img src={tasks.find(t => t.id === selectedTask)?.evidence?.commuteSelfie} className="w-full aspect-square object-cover rounded-2xl shadow-sm border-2 border-emerald-500" />
                                  <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-lg">
                                    <ShieldCheck className="w-3 h-3" />
                                  </div>
                                </div>
                                <p className="text-[8px] font-black text-center text-emerald-600 uppercase tracking-tighter">30m Identity Relay</p>
                              </div>
                            )}
                            {tasks.find(t => t.id === selectedTask)?.evidence?.initialSelfie && (
                              <div className="space-y-2 group cursor-zoom-in">
                                <div className="relative">
                                  <img src={tasks.find(t => t.id === selectedTask)?.evidence?.initialSelfie} className="w-full aspect-square object-cover rounded-2xl shadow-sm border border-gray-100 group-hover:brightness-75 transition-all" />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-black text-white bg-black/50 px-3 py-1.5 rounded-full uppercase">Verify</span>
                                  </div>
                                </div>
                                <p className="text-[8px] font-black text-center text-gray-400 uppercase">Doorstep Check</p>
                              </div>
                            )}
                            {tasks.find(t => t.id === selectedTask)?.evidence?.completionPhoto && (
                              <div className="space-y-2 group cursor-zoom-in">
                                <div className="relative">
                                  <img src={tasks.find(t => t.id === selectedTask)?.evidence?.completionPhoto} className="w-full aspect-square object-cover rounded-2xl shadow-sm border border-gray-100 group-hover:brightness-75 transition-all" />
                                </div>
                                <p className="text-[8px] font-black text-center text-gray-400 uppercase">Outcome Photo</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative border-l-2 border-gray-100 ml-3 pl-8 space-y-10">
                        {MOCK_LOGS.filter(l => l.taskId === selectedTask).map((log, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-accent border-4 border-white shadow-sm" />
                            <p className="text-xs text-gray-400 font-bold mb-1 uppercase">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-base font-bold text-primary mb-2">{log.note}</p>
                            {log.note.includes('WhatsApp') ? (
                              <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg w-fit uppercase mb-4 border border-emerald-100">
                                <ShieldCheck className="w-3 h-3" /> Encrypted Relay: Parent Informed
                              </div>
                            ) : log.status === 'arrived' && (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded w-fit capitalize">
                                  <MapPin className="w-3 h-3" /> Satellite Pin match: 98%
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                                  <div className="flex justify-between text-[8px] font-black text-gray-400">
                                    <span>GEOFENCE TARGET: 100M</span>
                                    <span className="text-accent">ACTUAL: 4M</span>
                                  </div>
                                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full" style={{ width: '4%' }} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {tasks.find(t => t.id === selectedTask)?.status === 'completed' && (
                        <button className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95 flex flex-col items-center gap-1">
                          Settlement: Approve & Pay
                          <span className="text-[10px] opacity-60 font-medium">Releases $15.00 from Escrow to Provider</span>
                        </button>
                      )}

                      <div className="pt-8 border-t border-gray-100 bg-gray-50/50 -mx-6 px-6 pb-6 rounded-b-xl">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Instructions</p>
                        <p className="text-sm leading-relaxed text-gray-600 italic">
                          "{tasks.find(t => t.id === selectedTask)?.instructions}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center rotate-3">
                        <History className="w-10 h-10 text-gray-200" />
                      </div>
                      <h5 className="text-lg font-bold mt-6">Select Activity</h5>
                      <p className="text-gray-400 text-sm mt-2 max-w-[200px]">Click any card on the left to see live photos and manager updates.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'wallet' && (
          <motion.div 
            key="wallet"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-10"
          >
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Wallet Hero */}
              <div className="flex-1">
                <div className="bg-primary p-8 md:p-12 rounded-[40px] text-white space-y-8 md:space-y-12 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                  <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative">
                    <div className="space-y-4">
                      <p className="text-white/40 uppercase tracking-[0.2em] font-black text-xs text-center md:text-left">Available Funds</p>
                      <h2 className="text-6xl md:text-7xl font-black text-center md:text-left">${user.walletBalance.toFixed(2)}</h2>
                    </div>
                    <div className="w-full md:w-auto h-px md:h-20 md:w-px bg-white/10 hidden md:block" />
                    <div className="space-y-4">
                      <p className="text-accent uppercase tracking-[0.2em] font-black text-xs text-center md:text-left">Escrow Secured</p>
                      <h3 className="text-4xl md:text-5xl font-black text-center md:text-left">${user.escrowBalance.toFixed(2)}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <button className="bg-accent py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
                      <PlusCircle className="w-5 h-5" /> Add Money
                    </button>
                    <button className="bg-white/10 py-5 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 active:scale-[0.98]">Manage Auto-Pay</button>
                  </div>
                </div>
              </div>

              {/* Security Sidecards */}
              <div className="lg:w-80 space-y-4">
                <div className="uc-card bg-gray-50 border-gray-100 p-6 space-y-3">
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold">Escrow Shield</h4>
                  <p className="text-[11px] text-gray-500 leading-tight">Funds are only released to providers after you approve the evidence photos. Professional peace of mind for every NRI child.</p>
                </div>
                <div className="uc-card bg-gray-50 border-gray-100 p-6 space-y-3">
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold">Real-time Audit</h4>
                  <p className="text-[11px] text-gray-500 leading-tight">Every transaction is logged with bank-grade precision. Total transparency of your hard-earned money.</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              {/* Transaction History */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <History className="w-5 h-5 text-gray-400" /> Ledger History
                  </h3>
                  <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">Download Audit PDF</button>
                </div>
                <div className="uc-card p-2 space-y-1 shadow-sm border border-gray-100 max-h-[500px] overflow-y-auto no-scrollbar">
                  {MOCK_TRANSACTIONS.map(tx => (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group gap-4 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 
                          tx.type === 'escrow_lock' ? 'bg-indigo-50 text-indigo-600' : 
                          'bg-red-50 text-red-600'
                        }`}>
                          {tx.type === 'credit' ? <TrendingUp className="w-4 h-4" /> : 
                           tx.type === 'escrow_lock' ? <Lock className="w-4 h-4" /> : 
                           <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{tx.description}</p>
                          <p className="text-[10px] text-gray-400 font-medium font-mono uppercase">
                            {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {tx.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center justify-between sm:justify-end">
                        <div className="text-right">
                          <p className={`text-lg font-black ${
                            tx.type === 'credit' ? 'text-emerald-600' : 
                            tx.type === 'escrow_lock' ? 'text-indigo-600' :
                            tx.type === 'escrow_release' ? 'text-amber-600' :
                            'text-gray-900'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-[8px] font-black uppercase text-gray-400">Verified</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Balance / Guarantee */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-amber-600" />
                    <h4 className="text-lg font-bold text-amber-900 uppercase tracking-tight">Audit Guarantee</h4>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed italic">"Every transaction on Family Hubs follows a strictly immutable double-entry ledger. We track every cent from Your Wallet to the Provider."</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/50 p-4 rounded-2xl flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-amber-600">Assets</p>
                      <p className="text-sm font-black font-mono text-amber-900">+${user.walletBalance.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/50 p-4 rounded-2xl flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-amber-600">Escrow</p>
                      <p className="text-sm font-black font-mono text-amber-900">-${user.escrowBalance.toFixed(2)}</p>
                    </div>
                    <div className="bg-amber-100 p-4 rounded-2xl flex justify-between items-center border border-amber-200">
                      <p className="text-[10px] font-black uppercase text-amber-900">Ledger Compliance</p>
                      <p className="text-sm font-black font-mono text-amber-900">0.00</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-amber-200 text-center">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Global Audit Hash: BH-AL9902</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'resources' && (
          <motion.div 
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight">Resource Library</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Verified partner network in Nalgonda clusters</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search hospitals..." 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MOCK_RESOURCES.map(res => (
                <motion.div 
                  key={res.id}
                  whileHover={{ y: -4 }}
                  className="uc-card p-6 group cursor-pointer border-gray-50 hover:border-accent/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm group-hover:scale-110 group-hover:-rotate-3 ${
                      res.category === 'hospital' ? 'bg-blue-50 text-blue-600' : 
                      res.category === 'pharmacy' ? 'bg-green-50 text-green-600' : 
                      'bg-red-50 text-red-600'
                    } group-hover:bg-accent group-hover:text-white`}>
                      {res.category === 'hospital' && <Stethoscope className="w-6 h-6" />}
                      {res.category === 'pharmacy' && <ShoppingBag className="w-6 h-6" />}
                      {res.category === 'ambulance' && <Phone className="w-6 h-6" />}
                    </div>
                    {res.rating && (
                      <div className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                        ★ {res.rating}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-1 leading-tight">{res.name}</h3>
                  <div className="space-y-1 text-[11px] text-gray-400 mb-6">
                    <p className="flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3" /> {res.address}</p>
                  </div>
                  <button className="w-full py-3 border border-gray-100 group-hover:border-accent group-hover:text-accent rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    Referral
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'booking' && (
          <motion.div 
            key="booking"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-6xl mx-auto px-4 md:px-6 py-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Details & Instructions */}
              <div className="lg:col-span-7 space-y-6">
                <div className="uc-card p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Care Instructions</h2>
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-1">"The more details you provide, the better we care."</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Selected Modules</label>
                      <button onClick={() => setView('services')} className="text-accent text-[10px] font-black hover:underline uppercase tracking-tighter">Modify Library</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map(catId => {
                        const s = SERVICES.find(sv => sv.id === catId);
                        return s ? (
                          <div key={catId} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                            <span className="text-[11px] font-bold">{s.title}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Step-by-Step Task Brief</label>
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">Child Authorized</span>
                    </div>
                    <textarea 
                      placeholder="Example: 'Ensure Dad carries his reports. Ask the doctor if the new medicine should be taken before breakfast.'"
                      className="w-full min-h-[200px] p-6 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all text-base leading-relaxed text-primary shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Escrow & Security Summary */}
              <div className="lg:col-span-5 space-y-6">
                <div className="uc-card p-8 space-y-8 sticky top-24">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Escrow Secured</label>
                      <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black">LOCKED</span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-indigo-600" />
                        <p className="text-sm font-bold text-indigo-900">Total Commitment: ${(selectedCategories.length * 15).toFixed(2)}</p>
                      </div>
                      <p className="text-[11px] text-indigo-700 leading-tight">Funds moved from Wallet → Escrow. Only released after you approve photo evidence.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Handshake Protocol</label>
                      <span className="text-[10px] text-accent font-black uppercase">Auto-Generated</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-bold">4-Digit Entry Pin</p>
                        <p className="text-[9px] text-gray-400 font-medium">Provided instantly after booking.</p>
                      </div>
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => <div key={i} className="w-5 h-7 bg-gray-100 rounded-md animate-pulse" />)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <p className="text-[10px] font-black text-emerald-900 uppercase">Universal Selfie Relay: ACTIVE</p>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-tight">
                      For every job, the provider MUST upload a live selfie 30 minutes before arrival. This photo is instantly relayed to your WhatsApp so you can verify their identity before they reach the door.
                    </p>
                  </div>

                  <div className="pt-4 space-y-4">
                    <button 
                      onClick={() => {
                        const newTask = {
                          id: `job_${Math.random().toString(36).substr(2, 9)}`,
                          title: selectedCategories.length > 1 ? `${selectedCategories.length} Combined Services` : SERVICES.find(s => s.id === selectedCategories[0])?.title || 'Care Service',
                          status: 'pending',
                          category: selectedCategories[0] === 'hospital' ? 'medical' : 'essential',
                          date: new Date().toISOString(),
                          cost: selectedCategories.length * 15,
                          instructions: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || 'No specific instructions provided.',
                          hubId: user.hubId || 'hub_mgl',
                          customer: {
                            name: user.name,
                            parent: parents[0]?.name || 'Parent'
                          }
                        };
                        setTasks(prev => [newTask, ...prev]);
                        setView('dashboard');
                        // Reset selection
                        setSelectedCategories([]);
                      }}
                      className={`w-full py-5 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 ${
                      selectedCategories.length > 0 ? 'bg-accent hover:bg-blue-700 active:scale-95' : 'bg-gray-200 cursor-not-allowed'
                    }`}>
                      Fund & Commit Booking
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setView('dashboard')}
                      className="w-full text-xs font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
                    >
                      Return to Hub
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'edit-parent' && (
          <motion.div 
            key="edit-parent"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto px-6 py-12"
          >
            <div className="uc-card p-10 space-y-10">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-accent rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Edit2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Edit Parent Profile</h2>
                <p className="text-gray-500">Update details for {currentEditingParent?.name}.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">FullName</label>
                    <input type="text" defaultValue={currentEditingParent?.name} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Age</label>
                    <input type="number" defaultValue={currentEditingParent?.age} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Gender</label>
                    <select defaultValue={currentEditingParent?.gender} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Blood Group</label>
                    <input type="text" defaultValue={currentEditingParent?.bloodGroup} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="e.g. O+" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Allergies</label>
                    <input type="text" defaultValue={currentEditingParent?.allergies} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Peanuts, Penicillin..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Home Address (Miryalaguda/Nalgonda)</label>
                  <textarea defaultValue={currentEditingParent?.address} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent min-h-[100px]" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Critical Medical Info</label>
                  <textarea defaultValue={currentEditingParent?.medicalHistory} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Primary Phone Number</label>
                    <input type="tel" defaultValue={currentEditingParent?.phoneNumber} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 font-black text-emerald-600">WhatsApp for Safety Relay</label>
                    <input type="tel" defaultValue={currentEditingParent?.whatsappNumber} className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 focus:outline-none focus:border-emerald-500 placeholder:text-gray-300" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Local Emergency Contact</label>
                    <input type="text" defaultValue={currentEditingParent?.emergencyContact} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div className="pt-6">
                  <button onClick={() => setView('dashboard')} className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-black shadow-xl shadow-gray-200">
                    Save Changes
                  </button>
                  <button onClick={() => setView('dashboard')} className="w-full mt-4 text-sm font-bold text-gray-400 hover:text-primary">Cancel</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto px-6 py-12"
          >
            <div className="uc-card p-10 space-y-10">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-gray-400 mt-6 mx-auto" />
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
                  <p className="text-gray-500 italic">Manage your account and contact details.</p>
                </div>
              </div>

              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateProfile({
                  name: formData.get('name') as string,
                  location: formData.get('location') as string,
                  phoneNumber: formData.get('phone') as string,
                });
              }}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Your Full Name</label>
                  <input name="name" type="text" defaultValue={user.name} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address (Registered)</label>
                  <input type="email" defaultValue={user.email} className="w-full bg-gray-200 border border-gray-100 rounded-xl p-4 cursor-not-allowed text-gray-500" disabled />
                  <p className="text-[10px] text-gray-400 font-medium">Email cannot be changed once verification is complete.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="phone" type="tel" defaultValue={user.phoneNumber} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Current Country</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="location" type="text" defaultValue={user.location} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" />
                    </div>
                  </div>
                </div>
                <div className="pt-6 space-y-4">
                  <button type="submit" className="w-full py-5 bg-accent text-white rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]">
                    Save Profile Changes
                  </button>
                  <button type="button" onClick={() => setView('dashboard')} className="w-full text-sm font-bold text-gray-400 hover:text-primary">Discard and Back</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {view === 'services' && (
          <motion.div 
            key="services"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight">Support Library</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Select care modules for Miryalaguda Hub</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search services..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {selectedCategories.length > 0 && (
                  <button 
                    onClick={() => setView('booking')}
                    className="bg-accent text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                  >
                    Setup Booking ({selectedCategories.length})
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredServices.map(s => {
                const isSelected = selectedCategories.includes(s.id as ServiceCategory);
                return (
                  <div 
                    key={s.id} 
                    onClick={() => toggleCategory(s.id as ServiceCategory)}
                    className={`uc-card p-6 cursor-pointer border-2 transition-all relative overflow-hidden group ${
                      isSelected ? 'border-accent bg-blue-50/50 ring-1 ring-accent' : 'border-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all shadow-sm group-hover:scale-110 group-hover:rotate-3 ${
                      isSelected ? 'bg-accent text-white shadow-lg shadow-blue-200 ring-2 ring-white' : `${s.bg} ${s.color} border border-white`
                    }`}>
                      <s.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{s.title}</h3>
                    <p className="text-[11px] text-gray-400 leading-tight mb-6 line-clamp-2 h-8">{s.desc}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 group-hover:border-accent/10 transition-colors">
                      <span className="text-[10px] font-black uppercase text-accent font-mono">$15.00 BASE</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      ) : (
                        <PlusCircle className="w-5 h-5 text-gray-200 group-hover:text-accent transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === 'add-parent' && (
          <motion.div 
            key="add-parent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto px-6 py-12"
          >
            <div className="uc-card p-10 space-y-10">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-accent rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Baby className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">New Parent Profile</h2>
                <p className="text-gray-500">Connecting your home to the FamilyHub network.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">FullName</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="e.g. S. Raghava" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Age</label>
                    <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="68" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Gender</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Blood Group</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="e.g. O+" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Allergies</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Peanuts, Penicillin..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Home Address (Miryalaguda/Nalgonda)</label>
                  <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent min-h-[100px]" placeholder="Detailed address with landmarks..." />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Critical Medical Info</label>
                  <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Allergies, chronic conditions..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Primary Phone Number</label>
                    <input type="tel" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 font-black text-emerald-600">WhatsApp Number</label>
                    <input type="tel" className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 focus:outline-none focus:border-emerald-500 placeholder:text-gray-300" placeholder="Relays provider's live photo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Local Emergency Contact</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Neighbor/Relative's Phone Number" />
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-black shadow-xl shadow-gray-200">
                    Register Profile
                  </button>
                  <button 
                    onClick={() => setView('dashboard')}
                    className="w-full mt-4 text-sm font-bold text-gray-400 hover:text-primary"
                  >
                    Cancel Onboarding
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
