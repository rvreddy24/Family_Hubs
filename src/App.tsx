/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type DragEvent, type FormEvent, type SetStateAction } from 'react';
import IdentityGuardModal from './components/admin/IdentityGuardModal';
import ProviderApp from './components/provider/ProviderApp';
import { ConnectionIndicator } from './components/ui/LiveSignalToaster';
import { Navigate } from 'react-router-dom';
import { useApp, type AppView, type AuthMode } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
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
  FileDown,
  FileText,
  Heart,
  HelpCircle,
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
  Send,
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
import { MOCK_USER, MOCK_ADMIN, MOCK_PROVIDER_USER } from './constants';
import { toast } from 'sonner';
import { FamilyVaultDocument, ServiceCategory, User as UserType } from './types';

const PROFILE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const VAULT_FILE_MAX_BYTES = 10 * 1024 * 1024;
const VAULT_MAX_FILES = 12;

function FamilyDocumentVaultCard({
  parent,
  onAddDocument,
  onRemoveDocument,
}: {
  parent: { id: string; vaultDocuments?: FamilyVaultDocument[] } | undefined;
  onAddDocument: (doc: FamilyVaultDocument) => void;
  onRemoveDocument: (docId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dropActive, setDropActive] = useState(false);
  const docs = parent?.vaultDocuments ?? [];

  const ingestFile = (file: File) => {
    if (!parent) return;
    if (file.size > VAULT_FILE_MAX_BYTES) {
      alert(`Please choose a file under ${VAULT_FILE_MAX_BYTES / 1024 / 1024} MB.`);
      return;
    }
    if (docs.length >= VAULT_MAX_FILES) {
      alert(`You can store up to ${VAULT_MAX_FILES} documents. Remove one to add another.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      onAddDocument({
        id: `vault_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name.slice(0, 120),
        mimeType: file.type || 'application/octet-stream',
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => alert('Could not read that file. Try a different file.');
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    ingestFile(file);
  };

  const handleDropZoneDragEnter = (e: DragEvent) => {
    if (!parent) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setDropActive(true);
  };

  const handleDropZoneDragLeave = (e: DragEvent) => {
    if (!parent) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDropActive(false);
  };

  const handleDropZoneDragOver = (e: DragEvent) => {
    if (!parent) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropZoneDrop = (e: DragEvent) => {
    if (!parent) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    ingestFile(file);
  };

  return (
    <div className="uc-card p-6 border-dashed border-2 border-gray-100 bg-white/50 group hover:border-accent/40 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-50 text-gray-400 group-hover:bg-accent group-hover:text-white rounded-xl flex items-center justify-center transition-all">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-primary">Document Vault</h4>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Prescriptions • Reports</p>
        </div>
      </div>
      {!parent && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3 leading-snug">
          Select a family profile in the care roster first — then you can add prescriptions and reports here.
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
        <button
          type="button"
          disabled={!parent}
          title={parent ? 'Click or drop a prescription or report (images or PDF)' : 'Select a family profile first'}
          onClick={() => parent && fileInputRef.current?.click()}
          onDragEnter={handleDropZoneDragEnter}
          onDragLeave={handleDropZoneDragLeave}
          onDragOver={handleDropZoneDragOver}
          onDrop={handleDropZoneDrop}
          className={`aspect-[3/4] bg-gray-50 rounded-lg border p-2 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-accent/5 transition-colors shrink-0 ${
            dropActive && parent ? 'border-accent ring-2 ring-accent/30 bg-accent/5' : 'border-gray-100 hover:border-accent/30'
          }`}
        >
          <div className="w-full h-full border border-dashed border-gray-200 rounded flex flex-col items-center justify-center gap-1 text-center px-1 pointer-events-none">
            <Plus className="w-4 h-4 text-gray-400" />
            <span className="text-[8px] font-bold text-gray-400 uppercase leading-tight">Add file</span>
            {parent && (
              <span className="text-[7px] font-semibold text-gray-400 normal-case tracking-normal leading-tight px-0.5">
                Click or drop
              </span>
            )}
          </div>
        </button>
        {docs.map((d) => {
          const isImage = d.mimeType.startsWith('image/');
          return (
            <div
              key={d.id}
              className="aspect-[3/4] rounded-lg border border-gray-100 p-1 relative overflow-hidden bg-white shrink-0"
            >
              {isImage ? (
                <img src={d.dataUrl} alt="" className="w-full h-full object-cover rounded-md" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 rounded-md">
                  <FileText className="w-6 h-6 text-blue-600 mb-1" />
                  <p className="text-[8px] font-black text-blue-600 text-center px-1 line-clamp-3 break-all">{d.name}</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-0.5 p-1 bg-black/55 backdrop-blur-[2px]">
                <a
                  href={d.dataUrl}
                  download={d.name}
                  className="flex-1 text-center text-[8px] font-black text-white bg-accent rounded py-1 hover:bg-blue-700"
                >
                  Save
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Remove this document from the vault?')) onRemoveDocument(d.id);
                  }}
                  className="flex-1 text-center text-[8px] font-black text-white bg-red-600 rounded py-1 hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Components ---

const Navbar = ({
  onViewChange,
  currentView,
  user,
  onLogout,
  onSOS,
  isAuthed,
  onSignIn,
  onSignUp,
}: {
  onViewChange: (v: AppView) => void;
  currentView: AppView;
  user: any;
  onLogout: () => void;
  onSOS: () => void;
  isAuthed: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (v: AppView) => {
    onViewChange(v);
    setIsMenuOpen(false);
  };

  const Logo = (
    <button
      type="button"
      onClick={() => handleNav('landing')}
      className="text-lg md:text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
    >
      <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-white">
        <Heart className="w-4 h-4 fill-current" />
      </div>
      <span>FamilyHubs</span>
    </button>
  );

  // Public landing nav — guest visitor: clean, no SOS / profile / logout junk.
  if (currentView === 'landing' && !isAuthed) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        {Logo}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onSignIn}
            className="px-3 md:px-4 py-2 text-[11px] md:text-xs font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-colors"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onSignUp}
            className="px-3 md:px-4 py-2 bg-primary text-white rounded-xl text-[11px] md:text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors flex items-center gap-2"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    );
  }

  // Landing nav for signed-in users — slim, no SOS (landing isn't an emergency context).
  if (currentView === 'landing' && isAuthed) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        {Logo}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => handleNav(user.role === 'admin' ? 'admin-dashboard' : 'dashboard')}
            className="px-3 md:px-4 py-2 bg-primary text-white rounded-xl text-[11px] md:text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors"
          >
            Open dashboard
          </button>
          <button
            type="button"
            onClick={() => handleNav('profile')}
            className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden hover:ring-2 hover:ring-accent transition-all flex items-center justify-center"
            title={user.name}
          >
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>
    );
  }

  // In-app nav (dashboard / services / resources / wallet / profile)
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        {Logo}
        <div className="hidden md:flex items-center gap-6 border-l border-gray-100 pl-6">
          <button onClick={() => handleNav('dashboard')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'dashboard' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Dashboard</button>
          {user.role === 'admin' && (
            <button onClick={() => handleNav('admin-dashboard')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'admin-dashboard' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Hub Admin</button>
          )}
          <button onClick={() => handleNav('services')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'services' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Services</button>
          <button onClick={() => handleNav('resources')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'resources' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Library</button>
          <button onClick={() => handleNav('wallet')} className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'wallet' ? 'text-accent' : 'text-gray-400 hover:text-primary'}`}>Wallet</button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {(user as { location?: string }).location && (
          <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <MapPin className="w-4 h-4" />
            {(user as { location?: string }).location}
          </div>
        )}

        <div className="flex items-center gap-2 border-l border-gray-100 pl-2 md:pl-4">
          {user.role === 'child' && (
            <button
              onClick={onSOS}
              className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
              title="Send emergency SOS"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNav('profile')}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-gray-500" />
              )}
            </span>
            <span className="text-sm font-semibold hidden md:inline">{user.name}</span>
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-50 rounded-lg md:hidden"
            title="Menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={onLogout}
            className="hidden md:flex p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-6 shadow-xl md:hidden flex flex-col gap-4"
          >
            <button onClick={() => handleNav('dashboard')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Dashboard <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            {user.role === 'admin' && (
              <button onClick={() => handleNav('admin-dashboard')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Hub Admin <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            )}
            <button onClick={() => handleNav('services')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Services <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={() => handleNav('resources')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Library <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={() => handleNav('wallet')} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-gray-50">Wallet <ChevronRight className="w-5 h-5 text-gray-400" /></button>
            <button onClick={onLogout} className="flex items-center justify-between font-bold text-lg p-2 rounded-xl hover:bg-red-50 text-red-600">Sign out <LogOut className="w-5 h-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const PROVIDER_SKILL_OPTIONS: { id: string; label: string }[] = [
  { id: 'medical', label: 'Medical' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'essentials', label: 'Essentials' },
  { id: 'admin', label: 'Admin/Bills' },
  { id: 'transport', label: 'Transport' },
];

type SignupKind = 'family' | 'provider';

const AuthPage = ({
  mode,
  onSwitch,
  isSupabaseConfigured,
  onLogin,
  onSignUp,
  onDemo,
}: {
  mode: AuthMode;
  onSwitch: (m: AuthMode) => void;
  isSupabaseConfigured: boolean;
  onLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'child' | 'admin' | 'provider'
  ) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  onDemo: (role: 'child' | 'admin' | 'provider') => void;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [signupKind, setSignupKind] = useState<SignupKind>('family');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const fullName = String(fd.get('name') || '').trim();
    try {
      if (mode === 'login') {
        const res = await onLogin(email, password);
        if (res.error) setError(res.error);
        return;
      }

      if (signupKind === 'family') {
        // Family path → regular Supabase signUp; role is forced to 'child' by AuthContext.
        const res = await onSignUp(email, password, fullName || email.split('@')[0], 'child');
        if (res.error) {
          setError(res.error);
        } else if (res.needsConfirmation) {
          setInfo('Account created. Please confirm via the email we just sent, then sign in.');
        }
        return;
      }

      // Provider path → public application endpoint. The server uses the service-role key
      // to set role + create a Provider record with verified:false. The applicant can sign
      // in immediately but cannot be assigned tasks until a hub admin verifies them.
      const phone = String(fd.get('phone') || '').trim();
      const city = String(fd.get('city') || '').trim();
      const skills = PROVIDER_SKILL_OPTIONS
        .map(s => s.id)
        .filter(id => fd.get(`skill_${id}`) === 'on');
      const docsNote = String(fd.get('docs') || '').trim();
      const documents = docsNote
        ? docsNote
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .slice(0, 6)
            .map(line => ({ label: line.slice(0, 60), note: line }))
        : [];

      const res = await fetch('/api/providers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          phone,
          city,
          skills,
          documents,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Application failed (${res.status})`);
        return;
      }
      // Auto sign-in after a successful application — provider portal will show pending
      // state since verified:false at this point.
      const signin = await onLogin(email, password);
      if (signin.error) {
        setInfo(json.message || "Application submitted. We'll email you when verified.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-100 mb-4">
            <Heart className="w-7 h-7 fill-current" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            {mode === 'login'
              ? 'Welcome back'
              : signupKind === 'provider'
                ? 'Become a provider partner'
                : 'Create your account'}
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            {mode === 'login'
              ? 'Sign in to coordinate care for your family.'
              : signupKind === 'provider'
                ? 'Apply once, get verified by your hub, and start taking jobs.'
                : 'Join FamilyHubs to manage care for your family.'}
          </p>
          {!isSupabaseConfigured && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3">
              Demo mode — any email/password works.
            </p>
          )}
        </div>

        <div className="uc-card p-8 space-y-6">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl">
              {(['family', 'provider'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setSignupKind(k); setError(null); setInfo(null); }}
                  className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    signupKind === k
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-primary'
                  }`}
                >
                  {k === 'family' ? 'I need help' : 'I provide services'}
                </button>
              ))}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input name="name" type="text" placeholder="Your full name" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input name="email" type="email" placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input name="password" type="password" placeholder="••••••••" minLength={mode === 'signup' && signupKind === 'provider' ? 8 : 6} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:outline-none focus:border-accent" required />
              </div>
            </div>

            {mode === 'signup' && signupKind === 'provider' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Phone</label>
                    <input name="phone" type="tel" placeholder="+91 …" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">City</label>
                    <input name="city" type="text" placeholder="Miryalaguda" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Services I can offer</label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_SKILL_OPTIONS.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                        <input type="checkbox" name={`skill_${s.id}`} className="accent-accent" />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Documents you can share for verification</label>
                  <textarea
                    name="docs"
                    placeholder={'One per line — e.g.\nAadhaar card\nDriving licence\nPolice clearance'}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm resize-none"
                  />
                  <p className="text-[10px] text-gray-400 leading-snug">
                    Don't upload documents here. Your hub admin will reach out to collect them after they review your application.
                  </p>
                </div>
              </>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
            )}
            {info && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{info}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-accent text-white rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {submitting
                ? '…'
                : mode === 'login'
                  ? 'Sign in'
                  : signupKind === 'provider'
                    ? 'Submit application'
                    : 'Create account'}
            </button>

            {mode === 'signup' && signupKind === 'family' && (
              <p className="text-[11px] text-gray-500 text-center leading-snug">
                Hub admin accounts are not available via public sign-up. They are issued directly by the hub.
              </p>
            )}
          </form>

          {!isSupabaseConfigured && mode === 'login' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Demo mode</span></div>
              </div>
              <button
                onClick={() => onDemo('child')}
                className="w-full py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest"
              >
                Continue as family demo
              </button>
              <p className="text-[10px] text-gray-400 text-center leading-snug">
                Admin and provider personas are disabled in demo mode for security.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-sm font-medium text-gray-500">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
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

const FamilyNoticeboardCard = ({
  notes,
  onPost,
  userImage,
}: {
  notes: { id: string; authorName: string; body: string }[];
  onPost: (body: string) => void;
  userImage?: string;
}) => {
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    onPost(body);
    setDraft('');
    setComposing(false);
  };
  const latest = notes[0];

  return (
    <div className="uc-card p-6 bg-accent border-none shadow-xl shadow-blue-500/10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        <MessageSquare className="w-20 h-20 text-white" />
      </div>
      <div className="relative z-10 space-y-4">
        <h4 className="font-bold text-white text-lg">Family Noticeboard</h4>
        <p className="text-white/60 text-[11px] leading-tight font-medium">
          Leave a note for the next care manager visit. Your hub admin and provider see it instantly.
        </p>
        <div className="flex items-start gap-3 p-4 bg-white/10 rounded-2xl border border-white/10">
          {userImage ? (
            <img src={userImage} alt="" className="w-8 h-8 rounded-full border-2 border-white/20" />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">You</div>
          )}
          <div className="flex-1 min-w-0">
            {latest ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Latest · {latest.authorName}</p>
                <p className="text-[12px] text-white/90 leading-snug line-clamp-2">{latest.body}</p>
              </>
            ) : (
              <p className="text-[11px] text-white/80 font-bold">No messages yet. Post when you have an update for the care team.</p>
            )}
          </div>
        </div>
        {composing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Share an update with the care team…"
              className="w-full min-h-[80px] p-3 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:outline-none focus:border-white/40 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={!draft.trim()}
                className="flex-1 py-2.5 bg-white text-accent rounded-xl font-bold text-xs disabled:opacity-50"
              >
                Post note
              </button>
              <button
                onClick={() => { setComposing(false); setDraft(''); }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setComposing(true)}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all border border-white/10"
          >
            Post New Note
          </button>
        )}
      </div>
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

/** Normalise a provider's verificationDocs (legacy = plain strings, new = {label,note,url}). */
function normalizeProviderDocs(docs: any): { label: string; note?: string; url?: string }[] {
  if (!Array.isArray(docs)) return [];
  return docs
    .map((d: any) => {
      if (typeof d === 'string') return { label: d };
      if (d && typeof d === 'object') {
        return {
          label: String(d.label || d.type || 'Document'),
          note: d.note ? String(d.note) : undefined,
          url: d.url ? String(d.url) : undefined,
        };
      }
      return null;
    })
    .filter(Boolean) as { label: string; note?: string; url?: string }[];
}

/** Build a plain-text application manifest the admin can save to disk. */
function buildProviderManifest(prov: any): string {
  const docs = normalizeProviderDocs(prov.verificationDocs);
  const lines = [
    'FamilyHubs.in — Provider application manifest',
    '─'.repeat(60),
    `Generated:        ${new Date().toISOString()}`,
    `Provider ID:      ${prov.id || '—'}`,
    `Name:             ${prov.name || '—'}`,
    `Email:            ${prov.email || '—'}`,
    `Phone:            ${prov.phone || '—'}`,
    `City:             ${prov.city || '—'}`,
    `Hub:              ${prov.hubId || '—'}`,
    `Joined:           ${prov.joinedAt || '—'}`,
    `Status:           ${prov.activeStatus || '—'}`,
    `Verified:         ${prov.verified ? 'YES' : 'NO (pending review)'}`,
    `Rating:           ${typeof prov.rating === 'number' ? prov.rating : '—'}`,
    `Total jobs:       ${typeof prov.totalJobs === 'number' ? prov.totalJobs : '—'}`,
    `Skills:           ${(prov.skills || []).join(', ') || '—'}`,
    '',
    `Self-declared documents (${docs.length}):`,
  ];
  if (docs.length === 0) {
    lines.push('  (none submitted)');
  } else {
    docs.forEach((d, idx) => {
      lines.push(`  ${idx + 1}. ${d.label}${d.note ? ` — ${d.note}` : ''}${d.url ? ` (${d.url})` : ''}`);
    });
  }
  lines.push('', '─'.repeat(60), 'Review checklist:', '  [ ] Identity proof verified', '  [ ] Phone verified', '  [ ] Address verified', '  [ ] Background check complete');
  return lines.join('\n');
}

function downloadProviderManifest(prov: any) {
  const safeName = String(prov.name || 'provider').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40);
  const blob = new Blob([buildProviderManifest(prov)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_application.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Support sidebar pill (shows unread badge sourced from chatThreads) ---
const SupportSidebarItem = ({
  onSelect,
  active,
}: {
  onSelect: (id: 'support') => void;
  active: boolean;
}) => {
  const { chatThreads } = useApp();
  const unread = chatThreads.reduce((sum, t) => sum + (t.unreadForAdmin || 0), 0);
  return (
    <button
      onClick={() => onSelect('support')}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        active ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-50 hover:text-primary'
      }`}
    >
      <HelpCircle className="w-5 h-5" />
      <span className="flex-1 text-left">Support</span>
      {unread > 0 && (
        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black grid place-items-center ${
          active ? 'bg-white text-accent' : 'bg-red-500 text-white'
        }`}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

// --- Admin Support Console (live inbox + reply pane) ----------------------
const SupportConsole = ({ hubId }: { hubId: string }) => {
  const { isConnected } = useSocket();
  const {
    chatThreads,
    chatMessages,
    joinChatThread,
    sendChatMessage,
    markChatRead,
    resolveChatThread,
    reopenChatThread,
  } = useApp();

  const hubThreads = chatThreads.filter(t => !hubId || t.hubId === hubId);
  const [filter, setFilter] = useState<'all' | 'family' | 'provider' | 'awaiting'>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const filteredThreads = hubThreads.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'awaiting') return t.status === 'awaiting_human';
    return t.kind === filter;
  });

  useEffect(() => {
    if (!activeId && filteredThreads.length > 0) {
      setActiveId(filteredThreads[0].id);
    }
    if (activeId && !hubThreads.find(t => t.id === activeId)) {
      setActiveId(filteredThreads[0]?.id || null);
    }
  }, [filteredThreads, activeId, hubThreads]);

  useEffect(() => {
    if (activeId) {
      joinChatThread(activeId);
      markChatRead(activeId);
    }
  }, [activeId, joinChatThread, markChatRead]);

  const activeThread = activeId ? hubThreads.find(t => t.id === activeId) : null;
  const messages = activeId ? chatMessages[activeId] || [] : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeId]);

  const submit = () => {
    if (!activeThread) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendChatMessage(activeThread.id, trimmed);
    setDraft('');
  };

  return (
    <div className="uc-card bg-white p-0 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] min-h-[640px]">
        {/* Inbox column */}
        <div className="border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Inbox</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {hubThreads.length} thread{hubThreads.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex gap-1 text-[10px] font-black uppercase tracking-widest">
              {(['all', 'awaiting', 'family', 'provider'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${
                    filter === f ? 'bg-accent text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f === 'awaiting' ? 'New' : f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-xs font-black uppercase tracking-widest">No conversations yet</p>
                <p className="text-[11px] mt-1">Family & partner messages land here.</p>
              </div>
            ) : (
              filteredThreads.map(t => {
                const isActive = activeId === t.id;
                const ts = t.updatedAt ? new Date(t.updatedAt) : null;
                const tsLabel = ts
                  ? ts.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      isActive ? 'bg-accent/5 border-l-4 border-l-accent' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-sm text-primary truncate">{t.userName}</span>
                      {t.unreadForAdmin > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {t.unreadForAdmin > 9 ? '9+' : t.unreadForAdmin}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        t.kind === 'provider' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {t.kind}
                      </span>
                      {t.status === 'awaiting_human' && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Awaiting
                        </span>
                      )}
                      {t.status === 'resolved' && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          Resolved
                        </span>
                      )}
                    </div>
                    {t.lastMessage && (
                      <p className="text-xs text-gray-500 truncate mt-1">{t.lastMessage}</p>
                    )}
                    {tsLabel && (
                      <p className="text-[10px] text-gray-400 mt-1">{tsLabel}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation column */}
        <div className="flex flex-col min-h-[480px]">
          {activeThread ? (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-white">
                <div className="min-w-0">
                  <div className="font-black text-sm text-primary truncate">{activeThread.userName}</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                    <span>{activeThread.kind === 'provider' ? 'Partner' : 'Family'}</span>
                    {activeThread.userEmail && (
                      <>
                        <span>·</span>
                        <span className="truncate normal-case tracking-normal text-gray-500 font-semibold">
                          {activeThread.userEmail}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {activeThread.status === 'resolved' ? (
                    <button
                      type="button"
                      onClick={() => reopenChatThread(activeThread.id)}
                      disabled={!isConnected}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 text-gray-600 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-40"
                    >
                      Reopen thread
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resolveChatThread(activeThread.id)}
                      disabled={!isConnected}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors disabled:opacity-40"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/40">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-xs font-bold uppercase tracking-widest">
                    No messages yet
                  </div>
                ) : (
                  messages.map(m => {
                    const isAdmin = m.authorRole === 'admin';
                    const isSystem = m.kind === 'system' || m.authorRole === 'bot';
                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                            {m.body}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={m.id}
                        className={`flex my-1.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                            isAdmin
                              ? 'bg-accent text-white rounded-br-md'
                              : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                          }`}
                        >
                          {!isAdmin && (
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                              {m.authorName || activeThread.userName}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                {!isConnected && (
                  <p className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
                    Offline — reconnect to send or change thread status.
                  </p>
                )}
                {activeThread.status === 'resolved' && isConnected && (
                  <p className="text-[10px] font-bold text-gray-500 mb-2">
                    This thread is resolved. Reopen it above to send another message.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder={
                      activeThread.status === 'resolved'
                        ? 'Reopen the thread to reply…'
                        : 'Reply to the customer…'
                    }
                    rows={1}
                    disabled={activeThread.status === 'resolved' || !isConnected}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent focus:bg-white resize-none max-h-32 disabled:opacity-50"
                  />
                  <button
                    onClick={submit}
                    disabled={
                      !draft.trim() || activeThread.status === 'resolved' || !isConnected
                    }
                    className="w-10 h-10 grid place-items-center rounded-xl bg-accent text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                  Press Enter to send · Shift+Enter for new line
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-gray-400 text-sm">
              <div className="text-center px-6">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-black uppercase tracking-widest text-xs">Select a conversation</p>
                <p className="text-[11px] mt-1">Or wait for the next family or partner to reach out.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ hubId, tasks, setTasks, hubs, setHubs, onLogout }: { hubId: string, tasks: any[], setTasks: Dispatch<SetStateAction<any[]>>, hubs: any[], setHubs: Dispatch<SetStateAction<any[]>>, onLogout?: () => void }) => {
  const {
    parents,
    providers,
    transactions,
    logs,
    resources: resourceList,
    upsertProvider,
    patchProvider,
    assignTaskToProvider,
  } = useApp();
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'users' | 'jobs' | 'finances' | 'alerts' | 'support'>('overview');
  const [providerFilter, setProviderFilter] = useState<'all' | 'active'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { socket } = useSocket();
  const emptyHub = { id: hubId, name: 'Your hub', city: '—', totalProviders: 0, activeJobs: 0, emergencyAlerts: 0, revenue: 0 };
  const currentHub = hubs.find(h => h.id === hubId) || hubs[0] || emptyHub;
  const pendingVerifications = providers.filter(p => !p.verified);
  const activeTasks = tasks.filter(t => t.status !== 'settled');

  // Identity Guard state
  const [identityGuardOpen, setIdentityGuardOpen] = useState(false);
  const [pendingDispatch, setPendingDispatch] = useState<{ taskId: string; provider: any } | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);

  const handleUpdateStatus = (taskId: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    if (socket) {
      socket.emit('task:update', {
        taskId,
        status,
        updatedBy: 'Hub Admin',
        hubId: currentHub.id,
      });
    }
  };

  const pickProviderForTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    if (task.careManager?.id) {
      const matched = providers.find(p => p.id === task.careManager.id || p.name === task.careManager.name);
      if (matched) return matched;
    }
    const skill = task.category === 'medical' ? 'medical' : task.category;
    const skilled = providers.find(p => p.verified && p.activeStatus !== 'offline' && (p.skills || []).includes(skill));
    if (skilled) return skilled;
    return providers.find(p => p.verified) || providers[0] || null;
  };

  const handleDispatchWithGuard = (taskId: string) => {
    const provider = pickProviderForTask(taskId);
    if (!provider) {
      setOnboardOpen(true);
      return;
    }
    setPendingDispatch({ taskId, provider });
    setIdentityGuardOpen(true);
  };

  const handleIdentityVerified = () => {
    if (pendingDispatch) {
      assignTaskToProvider(pendingDispatch.taskId, {
        id: pendingDispatch.provider.id,
        name: pendingDispatch.provider.name,
        photo: pendingDispatch.provider.photo,
      });
      patchProvider(pendingDispatch.provider.id, { activeStatus: 'on_job', verified: true });
    }
    setPendingDispatch(null);
  };

  const handleOnboardProvider = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    skills: string[];
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!accessToken) {
      return { ok: false, error: 'Sign in as a hub admin to invite providers.' };
    }
    try {
      const res = await fetch('/api/admin/providers/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          phone: data.phone,
          skills: data.skills,
          hubId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: json.error || `Failed (${res.status})` };
      }
      // Mirror locally so the admin sees the new provider immediately; the server has
      // already broadcast `provider:upserted` over the hub socket too.
      if (json.provider) {
        upsertProvider(json.provider);
      }
      setOnboardOpen(false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
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
          <SupportSidebarItem onSelect={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} active={activeTab === 'support'} />
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
            <ConnectionIndicator />
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
                {activeTab === 'support' && 'Live Support Inbox'}
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="flex-1 md:text-right">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">Hub Capacity</p>
                 <div className="flex items-center gap-2 mt-1">
                   <div className="flex-1 md:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.round(((currentHub.activeJobs || 0) / Math.max(1, (currentHub.totalProviders || 1))) * 100))}%` }} />
                   </div>
                   <span className="text-[10px] font-black">{Math.min(100, Math.round(((currentHub.activeJobs || 0) / Math.max(1, (currentHub.totalProviders || 1))) * 100))}%</span>
                 </div>
               </div>
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
                        <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-accent transition-all">
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
                                  onClick={(e) => { e.stopPropagation(); handleDispatchWithGuard(task.id); }}
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
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setProviderFilter('all')}
                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${
                          providerFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-primary'
                        }`}
                      >
                        All ({providers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setProviderFilter('active')}
                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${
                          providerFilter === 'active' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-primary'
                        }`}
                      >
                        Active ({providers.filter(p => p.activeStatus !== 'offline').length})
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const visibleProviders = providerFilter === 'active'
                      ? providers.filter(p => p.activeStatus !== 'offline')
                      : providers;
                    if (visibleProviders.length === 0) {
                      return (
                        <div className="p-10 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                          {providers.length === 0
                            ? 'No providers onboarded yet. Use the Verification Queue card to add one.'
                            : 'No active providers right now.'}
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleProviders.map(prov => {
                          const docs = normalizeProviderDocs(prov.verificationDocs);
                          return (
                            <div key={prov.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all flex flex-col gap-4">
                              <div className="flex items-center gap-4">
                                {prov.photo ? (
                                  <img src={prov.photo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-primary flex items-center gap-2 truncate">
                                    {prov.name}
                                    {prov.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                  </h4>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate">
                                    {(prov.skills || []).join(' • ') || 'No skills set'}
                                  </span>
                                </div>
                                <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                                  prov.activeStatus === 'idle' ? 'bg-blue-50 text-blue-600' :
                                  prov.activeStatus === 'on_job' ? 'bg-emerald-50 text-emerald-600' :
                                  'bg-gray-100 text-gray-400'
                                }`}>
                                  {prov.activeStatus.replace('_', ' ')}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                                <a href={`mailto:${prov.email || ''}`} className="flex items-center gap-1.5 truncate hover:text-accent" title={prov.email}>
                                  <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{prov.email || '—'}</span>
                                </a>
                                <a href={`tel:${prov.phone || ''}`} className="flex items-center gap-1.5 truncate hover:text-accent" title={prov.phone}>
                                  <Phone className="w-3 h-3 shrink-0" /> <span className="truncate">{prov.phone || '—'}</span>
                                </a>
                              </div>

                              <details className="group rounded-xl bg-gray-50/60 border border-gray-100 px-3 py-2">
                                <summary className="flex items-center justify-between cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary list-none">
                                  <span className="flex items-center gap-1.5">
                                    <FileText className="w-3 h-3 text-accent" /> Document wallet ({docs.length})
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-gray-400 group-open:rotate-90 transition-transform" />
                                </summary>
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                                  {docs.length === 0 ? (
                                    <p className="text-[10px] text-gray-400 italic">No documents on file.</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {docs.map((d, i) => (
                                        <li key={i} className="text-[11px] flex items-start gap-2">
                                          <span className="w-4 h-4 rounded-full bg-accent/10 text-accent text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                          <span className="flex-1 min-w-0">
                                            <span className="font-bold text-gray-900">{d.label}</span>
                                            {d.note && <span className="text-gray-500"> — {d.note}</span>}
                                            {d.url && (
                                              <a href={d.url} target="_blank" rel="noreferrer" className="ml-1.5 underline text-accent text-[10px]">Open</a>
                                            )}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => downloadProviderManifest(prov)}
                                    className="mt-2 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-accent/5 hover:border-accent text-[10px] font-black uppercase text-gray-600 hover:text-accent flex items-center gap-1.5"
                                  >
                                    <FileDown className="w-3 h-3" /> Download manifest
                                  </button>
                                </div>
                              </details>

                              <div className="flex items-center justify-between pt-4 border-t border-gray-50 gap-4">
                                <div className="flex gap-6 text-xs">
                                  <div>
                                     <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Rating</p>
                                     <span className="font-black">{prov.rating || '—'}</span>
                                  </div>
                                  <div>
                                     <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Jobs</p>
                                     <span className="font-black">{prov.totalJobs ?? 0}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => patchProvider(prov.id, { activeStatus: prov.activeStatus === 'offline' ? 'idle' : 'offline' })}
                                  className="text-[10px] font-black text-accent uppercase hover:underline tracking-tighter"
                                >
                                  {prov.activeStatus === 'offline' ? 'Reactivate' : 'Set offline'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'users' && (
                <div className="uc-card p-5 md:p-8 bg-white">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">Family Registry</h3>
                  </div>
                  <div className="space-y-4">
                    {parents.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No parent profiles in your hub yet.</p>
                    )}
                    {parents.map(parent => (
                      <div key={parent.id} className="p-5 bg-gray-50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-100">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                              <Heart className="w-6 h-6 text-red-500" />
                           </div>
                           <div>
                             <h4 className="font-bold text-primary">{parent.name}</h4>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{parent.address || `${parent.age || '—'} yrs · ${parent.gender || ''}`.trim()}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                           {parent.phoneNumber ? (
                             <a
                               href={`tel:${parent.phoneNumber}`}
                               className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 text-center"
                             >
                               Call {parent.phoneNumber}
                             </a>
                           ) : null}
                           <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600">
                             {tasks.filter(t => t.parentId === parent.id).length} active
                           </span>
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
                    {transactions.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No ledger activity yet.</p>
                    )}
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-4">
                           <div className={`p-2 rounded-xl ${tx.amount < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {tx.amount < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                           </div>
                           <div>
                             <p className="font-bold text-sm text-primary">{tx.description}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{tx.id} • {new Date(tx.timestamp).toLocaleDateString()}</p>
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
                       <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-200">
                          <ShieldAlert className="w-10 h-10" />
                       </div>
                       <div className="space-y-2">
                         <h4 className="text-2xl font-black text-red-600">High-priority alert</h4>
                         <p className="text-gray-600 text-sm font-medium">
                           SOS signal{parents[0] ? ` — family contact: ${parents[0].name}${parents[0].phoneNumber ? ` (${parents[0].phoneNumber})` : ''}` : ' — no family profile linked; verify with the requester directly.'}
                         </p>
                       </div>
                       <div className="flex gap-3 max-w-md mx-auto">
                         {parents[0]?.phoneNumber ? (
                           <a
                             href={`tel:${parents[0].phoneNumber}`}
                             className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-md shadow-red-200 uppercase tracking-widest text-xs text-center"
                           >
                             Call family
                           </a>
                         ) : null}
                         <button
                           onClick={() => {
                             setHubs(prev => prev.map(h => h.id === hubId ? { ...h, emergencyAlerts: 0 } : h));
                             if (socket) {
                               socket.emit('sos:acknowledge', { hubId, acknowledgedBy: 'Hub Admin' });
                             }
                           }}
                           className="flex-1 py-4 bg-white border border-red-100 text-red-600 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-red-100/50 transition-colors"
                         >
                           Acknowledge
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="p-20 text-center space-y-4 opacity-40">
                       <ShieldCheck className="w-14 h-14 mx-auto text-gray-300" />
                       <p className="font-black text-gray-400 uppercase tracking-widest text-xs">No active SOS signals</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'support' && (
                <SupportConsole hubId={hubId} />
              )}
            </div>

            <div className="xl:col-span-4 space-y-8">
              <div className="uc-card p-8 bg-indigo-600 text-white border-none relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet className="w-32 h-32" /></div>
                 <div className="relative z-10 space-y-6">
                   <div>
                     <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Hub revenue (recorded)</p>
                     <h3 className="text-3xl sm:text-4xl font-black mt-1">${currentHub.revenue.toFixed(2)}</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/10 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-white/40 uppercase mb-1">Active jobs</p>
                       <p className="font-bold text-sm sm:text-base">{currentHub.activeJobs}</p>
                     </div>
                     <div className="bg-white/10 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-white/40 uppercase mb-1">Providers</p>
                       <p className="font-bold text-sm sm:text-base text-accent">{currentHub.totalProviders}</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 text-[10px] font-black text-white/40 uppercase">
                     <div>
                       <p className="mb-1">Avg ticket</p>
                       <p className="text-base font-bold text-white">${currentHub.activeJobs > 0 ? (currentHub.revenue / Math.max(1, currentHub.activeJobs)).toFixed(0) : '—'}</p>
                     </div>
                     <div>
                       <p className="mb-1">Verified providers</p>
                       <p className="text-base font-bold text-accent">{providers.filter(p => p.verified).length}/{providers.length}</p>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="uc-card p-6 md:p-8 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-black text-primary text-sm uppercase tracking-widest">Verification Queue</h4>
                  <button
                    type="button"
                    onClick={() => setOnboardOpen(true)}
                    className="px-3 py-1.5 bg-accent text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-blue-700 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Onboard
                  </button>
                </div>
                <div className="space-y-4">
                  {pendingVerifications.map(prov => {
                    const docs = normalizeProviderDocs(prov.verificationDocs);
                    return (
                      <div key={prov.id} className="p-4 rounded-[24px] border border-gray-100 bg-gray-50/50 space-y-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          {prov.photo ? (
                            <img src={prov.photo} alt="" className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{prov.name}</p>
                            <p className="text-[9px] font-black text-gray-400 uppercase truncate">{(prov.skills || []).join(' • ') || 'No skills set'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                          <a href={`mailto:${prov.email || ''}`} className="flex items-center gap-1.5 truncate hover:text-accent" title={prov.email}>
                            <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{prov.email || '—'}</span>
                          </a>
                          <a href={`tel:${prov.phone || ''}`} className="flex items-center gap-1.5 truncate hover:text-accent" title={prov.phone}>
                            <Phone className="w-3 h-3 shrink-0" /> <span className="truncate">{prov.phone || '—'}</span>
                          </a>
                          {prov.city && (
                            <div className="flex items-center gap-1.5 truncate col-span-2" title={prov.city}>
                              <MapPin className="w-3 h-3 shrink-0 text-gray-400" /> <span className="truncate">{prov.city}</span>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl bg-white border border-gray-100 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-3.5 h-3.5 text-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Document wallet ({docs.length})</span>
                          </div>
                          {docs.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">No documents declared yet. Reach out to applicant for KYC.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {docs.map((d, i) => (
                                <li key={i} className="text-[11px] flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-accent/10 text-accent text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                  <span className="flex-1 min-w-0">
                                    <span className="font-bold text-gray-900">{d.label}</span>
                                    {d.note && <span className="text-gray-500"> — {d.note}</span>}
                                    {d.url && (
                                      <a href={d.url} target="_blank" rel="noreferrer" className="ml-1.5 underline text-accent text-[10px]">Open</a>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => patchProvider(prov.id, { verified: true, activeStatus: 'idle' })}
                            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-accent transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => downloadProviderManifest(prov)}
                            className="px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-accent/5 hover:border-accent transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-600 hover:text-accent"
                            title="Download application manifest"
                          >
                            <FileDown className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => patchProvider(prov.id, { activeStatus: 'offline' })}
                            className="px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors group"
                            title="Reject (mark offline)"
                          >
                            <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {pendingVerifications.length === 0 && <p className="text-center text-[10px] text-gray-400 font-bold uppercase py-4">Queue Clear</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  toast.info('Hub protocol templates and escalation rules are managed in your ops console.', {
                    duration: 5000,
                  })
                }
                className="uc-card w-full text-left p-6 border-dashed border-2 border-gray-200 bg-white flex items-center gap-4 group cursor-pointer hover:border-accent hover:bg-gray-50 transition-all"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-accent transition-colors">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-sm">System Protocols</h5>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Configure Hub Settings</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Identity Guard Modal */}
      {pendingDispatch && (
        <IdentityGuardModal
          isOpen={identityGuardOpen}
          onClose={() => { setIdentityGuardOpen(false); setPendingDispatch(null); }}
          provider={pendingDispatch.provider}
          taskId={pendingDispatch.taskId}
          onVerified={handleIdentityVerified}
        />
      )}

      <OnboardProviderModal
        isOpen={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onSubmit={handleOnboardProvider}
      />
    </div>
  );
};

const OnboardProviderModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    skills: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
  const SKILL_OPTIONS: { id: string; label: string }[] = [
    { id: 'medical', label: 'Medical' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'essentials', label: 'Essentials' },
    { id: 'admin', label: 'Admin/Bills' },
    { id: 'transport', label: 'Transport' },
  ];
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" onClick={onClose} />
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          const fd = new FormData(e.currentTarget);
          const skills = SKILL_OPTIONS
            .map(s => s.id)
            .filter(id => fd.get(`skill_${id}`) === 'on');
          const res = await onSubmit({
            name: String(fd.get('name') || '').trim(),
            email: String(fd.get('email') || '').trim(),
            phone: String(fd.get('phone') || '').trim(),
            password: String(fd.get('password') || ''),
            skills,
          });
          setSubmitting(false);
          if (!res.ok) setError(res.error || 'Failed to invite provider');
        }}
        className="relative bg-white w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight">Invite Provider</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-50 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full name</label>
            <input name="name" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm" placeholder="e.g. Venu K." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</label>
              <input name="email" type="email" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm" placeholder="venu@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</label>
              <input name="phone" type="tel" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm" placeholder="+91 …" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Temporary Password</label>
            <input name="password" type="text" minLength={8} required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-accent text-sm font-mono" placeholder="At least 8 characters" />
            <p className="text-[10px] text-gray-400">Share securely with the provider; they should change it after first login.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                  <input type="checkbox" name={`skill_${s.id}`} className="accent-accent" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="flex-1 py-3 bg-accent text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-60">
            {submitting ? 'Inviting…' : 'Invite provider'}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-3 bg-gray-50 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest">
            Cancel
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center">
          Creates a real provider login secured by Supabase. Auto-verified on save.
        </p>
      </motion.form>
    </div>
  );
};

// --- Main Views ---

export default function App() {
  const {
    session,
    setSession,
    authMode,
    setAuthMode,
    user,
    setUser,
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
    upsertParent,
    patchParent,
    deleteParent,
    editingParentId,
    setEditingParentId,
    selectedParentId,
    setSelectedParentId,
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
    services,
    providers,
    transactions,
    wallet,
    topUpWallet,
    notes,
    postNote,
    assignTaskToProvider,
    upsertProvider,
    isSupabaseConfigured,
    signUp,
    logs,
    resources,
  } = useApp();

  const filteredServices = services.filter(s => 
    (activeCategory === 'all' || s.id === activeCategory) &&
    (s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentEditingParent = parents.find(p => p.id === editingParentId) ?? (parents[0] ?? null);
  const childHub = hubs.find((h) => h.id === (user as { hubId?: string }).hubId) ||
    hubs[0] || {
    id: 'default',
    name: 'Your hub',
    city: '—',
    totalProviders: 0,
    activeJobs: 0,
    emergencyAlerts: 0,
    revenue: 0,
  };

  const stats = [
    { label: 'Upcoming Tasks', value: tasks.filter(t => t.status !== 'settled').length.toString().padStart(2, '0'), icon: Activity, color: 'text-blue-600' },
    { label: 'Care Quality', value: '—', icon: ShieldCheck, color: 'text-green-600' },
    { label: 'Escrow Lock', value: `$${user.escrowBalance.toFixed(2)}`, icon: Lock, color: 'text-indigo-600' },
  ];

  // /app/* is the authenticated experience. If nobody's signed in, send them to the
  // public family landing page; the role-specific landings (/providers, /hubs) are
  // also reachable from there. This means AuthPage is now only used at landing pages.
  if (!session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`min-h-screen bg-white ${view !== 'admin-dashboard' && view !== 'provider-dashboard' ? 'pt-20' : ''}`}>
      {view !== 'admin-dashboard' && view !== 'provider-dashboard' && (
        <Navbar
          onViewChange={setView}
          currentView={view}
          user={user}
          onLogout={logout}
          onSOS={() => setShowSOS(true)}
          isAuthed={!!session}
          onSignIn={() => { setAuthMode('login'); setView('dashboard'); }}
          onSignUp={() => { setAuthMode('signup'); setView('dashboard'); }}
        />
      )}

      <AnimatePresence>
        {showSOS && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/80 backdrop-blur-sm"
              onClick={() => setShowSOS(false)}
            />
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-primary">Emergency SOS</h2>
                <p className="text-gray-500 font-medium text-sm md:text-base">
                  Confirm to broadcast your live location and medical card to nearby hubs and pre-verified neighbours.
                </p>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-red-50 rounded-2xl border border-red-100">
                <span className="text-[10px] font-black text-red-900 uppercase tracking-widest">Channel ready</span>
                <CheckCircle2 className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSOS(false)}
                  className="flex-1 py-3.5 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSOS(false);
                    handleSOS();
                  }}
                  className="flex-[2] py-3.5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors"
                >
                  Send SOS now
                </button>
              </div>
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
                  Coordinate health, essentials, and home logistics for your parents with hub-backed verification and real-time status.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-10 justify-center md:justify-start">
                  <button
                    onClick={() => { setAuthMode('signup'); setView('dashboard'); }}
                    className="group relative px-10 py-6 bg-primary text-white rounded-[32px] font-black text-xl overflow-hidden active:scale-95 transition-all shadow-2xl shadow-gray-200"
                  >
                    <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-expo" />
                    <span className="relative flex items-center gap-3">
                       Get Started
                       <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                  <button
                    onClick={() => { setAuthMode('login'); setView('dashboard'); }}
                    className="px-10 py-6 bg-white border-2 border-gray-100 text-primary rounded-[32px] font-black text-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-accent transition-all active:scale-95 group"
                  >
                    Sign In
                    <LayoutDashboard className="w-6 h-6 text-accent group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
                {!isSupabaseConfigured && (
                  <p className="pt-4 text-xs text-gray-400 font-medium">
                    Running in demo mode —{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setUser(MOCK_PROVIDER_USER as any);
                        setView('provider-dashboard');
                        setSession({ id: 'prov_1' });
                      }}
                      className="underline hover:text-accent transition-colors"
                    >
                      open the provider dashboard
                    </button>
                    {' '}to preview the service-provider experience.
                  </p>
                )}
              </div>
              <div className="flex-1 w-full max-w-lg relative order-1 md:order-2">
                <div className="absolute -inset-4 bg-accent/5 rounded-3xl -rotate-2" />
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl shadow-xl aspect-square bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
                    <Heart className="w-16 h-16 text-accent/40" />
                  </div>
                  <div className="grid grid-rows-2 gap-4">
                    <div className="rounded-2xl shadow-xl h-full min-h-0 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-gray-300" />
                    </div>
                    <div className="rounded-2xl shadow-xl h-full min-h-0 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 flex items-center justify-center">
                      <User className="w-10 h-10 text-emerald-200" />
                    </div>
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
                {services.slice(0, 3).map(s => (
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

        {view === 'provider-dashboard' && user.role === 'provider' && (
          <motion.div 
            key="provider-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <ProviderApp onLogout={logout} />
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
                  <MapPin className="w-3.5 h-3.5 text-accent" /> {childHub.name}{childHub.city && childHub.city !== '—' ? ` · ${childHub.city}` : ''}
                </p>
              </div>
              {logs.length > 0 && (
                <div className="flex-1 max-w-md hidden xl:block">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 overflow-hidden">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-tighter truncate">
                      {logs[0].note}
                    </div>
                  </div>
                </div>
              )}
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
                {parents.length === 0 && (
                  <div className="w-full uc-card p-8 text-center text-gray-500 text-sm border-dashed">
                    <p className="mb-3">No family profiles yet. Add a parent to start care tracking.</p>
                    <button type="button" onClick={() => setView('add-parent')} className="text-accent font-black text-xs uppercase">Add family member</button>
                  </div>
                )}
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
                          <div className="text-xs font-black">{p.vitals.glucose?.split(' ')?.[0] ?? '—'}</div>
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
                          <h4 className="font-bold">Local coverage</h4>
                          <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">{childHub.name}</p>
                       </div>
                    </div>
                    <div className="space-y-4 pt-2">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/60">Network providers (hub)</span>
                          <span className="text-[10px] font-black">{childHub.totalProviders} registered</span>
                       </div>
                       <div className="flex -space-x-2">
                          {providers.slice(0, 5).map((p) => (
                            p.photo ? (
                              <img key={p.id} src={p.photo} alt="" className="w-6 h-6 rounded-full border-2 border-primary object-cover" />
                            ) : (
                              <div key={p.id} className="w-6 h-6 rounded-full border-2 border-primary bg-white/20 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-white/80" />
                              </div>
                            )
                          ))}
                          {providers.length === 0 && (
                            <span className="text-[10px] text-white/50 pl-1">—</span>
                          )}
                       </div>
                       <p className="text-[10px] text-white/40 leading-tight">Verified providers in your hub appear here. Add active jobs in admin to build local response capacity.</p>
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
                    <p className="text-sm text-emerald-800/80 p-3 bg-white/60 rounded-xl border border-emerald-100/50">
                      No linked prescriptions. When your care plan and pharmacy are connected, schedules will show here.
                    </p>
                  </div>
                  <button type="button" className="w-full py-3 bg-emerald-600/50 text-white rounded-xl font-bold text-xs cursor-not-allowed" disabled>
                    Connect care plan
                  </button>
                </div>
              </div>

              <FamilyNoticeboardCard notes={notes} onPost={postNote} userImage={user.profileImage} />

              <FamilyDocumentVaultCard
                parent={parents.find(p => p.id === selectedParentId)}
                onAddDocument={(doc) => {
                  const p = parents.find(x => x.id === selectedParentId);
                  if (!p) return;
                  const existing = p.vaultDocuments ?? [];
                  patchParent(p.id, { vaultDocuments: [...existing, doc] });
                }}
                onRemoveDocument={(docId) => {
                  const p = parents.find(x => x.id === selectedParentId);
                  if (!p) return;
                  const existing = p.vaultDocuments ?? [];
                  patchParent(p.id, { vaultDocuments: existing.filter(d => d.id !== docId) });
                }}
              />
            </div>

            {notes.length > 0 && (
              <div className="uc-card p-6 bg-white border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-accent" /> Recent family notes
                  </h3>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{notes.length} entries</span>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar">
                  {notes.slice(0, 20).map(n => (
                    <div key={n.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{n.authorName} <span className="text-gray-300">·</span> <span className="text-accent">{n.authorRole}</span></p>
                        <p className="text-[9px] font-bold text-gray-400">{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                      <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{n.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

                <FamilyDocumentVaultCard
                  parent={parents.find(p => p.id === selectedParentId)}
                  onAddDocument={(doc) => {
                    const p = parents.find(x => x.id === selectedParentId);
                    if (!p) return;
                    const existing = p.vaultDocuments ?? [];
                    patchParent(p.id, { vaultDocuments: [...existing, doc] });
                  }}
                  onRemoveDocument={(docId) => {
                    const p = parents.find(x => x.id === selectedParentId);
                    if (!p) return;
                    const existing = p.vaultDocuments ?? [];
                    patchParent(p.id, { vaultDocuments: existing.filter(d => d.id !== docId) });
                  }}
                />

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
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Verification ready</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Share code with the family member</span>
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
                        {logs.filter(l => l.taskId === selectedTask).map((log, idx) => (
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

                      {(() => {
                        const t = tasks.find(t => t.id === selectedTask);
                        if (!t || t.status !== 'completed') return null;
                        const cost = (t as any).cost || 0;
                        return (
                          <button
                            onClick={() => handleTaskStatusUpdate(t.id, 'settled')}
                            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-base hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all active:scale-[0.98] flex flex-col items-center gap-1"
                          >
                            Approve & settle
                            {cost > 0 && (
                              <span className="text-[10px] opacity-70 font-medium">Releases ${cost.toFixed(2)} from escrow to provider</span>
                            )}
                          </button>
                        );
                      })()}

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
                  <div className="relative">
                    <button
                      onClick={() => {
                        const raw = prompt('Add money to wallet (USD):', '50');
                        const amt = Number(raw);
                        if (!Number.isFinite(amt) || amt <= 0) return;
                        topUpWallet(amt, 'Manual top-up');
                      }}
                      className="w-full bg-accent py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-5 h-5" /> Add money
                    </button>
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
                    <History className="w-5 h-5 text-gray-400" /> Ledger history
                  </h3>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{transactions.length} entries</span>
                </div>
                <div className="uc-card p-2 space-y-1 shadow-sm border border-gray-100 max-h-[500px] overflow-y-auto no-scrollbar">
                  {transactions.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-8">No transactions yet. Fund a booking to see activity here.</p>
                  )}
                  {transactions.map(tx => (
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

            {resources.length === 0 && (
              <p className="text-center text-gray-500 py-12">No library entries yet. Your hub can add hospitals, pharmacies, and emergency contacts here.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {resources.map(res => (
                <motion.div 
                  key={res.id}
                  whileHover={{ y: -4 }}
                  className="uc-card p-6 group border-gray-50 hover:border-accent/10"
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
                    {res.phone && <p className="flex items-center gap-1.5 truncate"><Phone className="w-3 h-3" /> {res.phone}</p>}
                  </div>
                  {res.phone ? (
                    <a
                      href={`tel:${res.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="w-full py-3 border border-gray-100 group-hover:border-accent group-hover:text-accent rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      Call now
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="w-full py-3 border border-dashed border-gray-100 text-gray-300 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                      Listing only
                    </span>
                  )}
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
                        const s = services.find(sv => sv.id === catId);
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
                      disabled={selectedCategories.length === 0}
                      onClick={() => {
                        if (selectedCategories.length === 0) return;
                        const cat0 = selectedCategories[0] || 'essentials';
                        const inst =
                          (document.querySelector('textarea') as HTMLTextAreaElement)?.value ||
                          'No specific instructions provided.';
                        const id = `task_${Math.random().toString(36).slice(2, 11)}`;
                        const now = new Date().toISOString();
                        const targetParent = parents.find(p => p.id === selectedParentId) || parents[0];
                        const newTask = {
                          id,
                          childId: user.id,
                          parentId: targetParent?.id || `parent_${Date.now().toString(36)}`,
                          hubId: (user as { hubId?: string }).hubId || 'hub_mgl',
                          category: cat0 === 'hospital' ? 'medical' : (cat0 as any),
                          title:
                            selectedCategories.length > 1
                              ? `${selectedCategories.length} Combined Services`
                              : services.find(s => s.id === selectedCategories[0])?.title || 'Care Service',
                          description: 'Booked via FamilyHubs',
                          instructions: inst,
                          status: 'created',
                          verificationCode: String(Math.floor(1000 + Math.random() * 9000)),
                          createdAt: now,
                          updatedAt: now,
                          cost: selectedCategories.length * 15,
                        };
                        createTask(newTask);
                        setView('dashboard');
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

        {view === 'edit-parent' && !currentEditingParent && (
          <motion.div key="edit-parent-empty" className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
            <p className="text-gray-500">Add a family profile first, then you can edit it here.</p>
            <button type="button" onClick={() => { setView('add-parent'); }} className="text-accent font-bold">Add family member</button>
            <button type="button" onClick={() => setView('dashboard')} className="block w-full text-sm text-gray-400">Back to dashboard</button>
          </motion.div>
        )}

        {view === 'edit-parent' && currentEditingParent && (
          <motion.div 
            key="edit-parent"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto px-6 py-12"
          >
            <form
              className="uc-card p-10 space-y-10"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const targetId = currentEditingParent.id;
                const patch = {
                  name: String(fd.get('name') || currentEditingParent.name).trim() || currentEditingParent.name,
                  age: Number(fd.get('age') || currentEditingParent.age) || currentEditingParent.age,
                  gender: (fd.get('gender') as 'Male' | 'Female' | 'Other') || currentEditingParent.gender,
                  bloodGroup: String(fd.get('bloodGroup') || '').trim() || currentEditingParent.bloodGroup,
                  allergies: String(fd.get('allergies') || '').trim() || currentEditingParent.allergies,
                  address: String(fd.get('address') || currentEditingParent.address).trim(),
                  medicalHistory: String(fd.get('medicalHistory') || currentEditingParent.medicalHistory).trim(),
                  phoneNumber: String(fd.get('phoneNumber') || currentEditingParent.phoneNumber).trim(),
                  whatsappNumber: String(fd.get('whatsappNumber') || currentEditingParent.whatsappNumber).trim(),
                  emergencyContact: String(fd.get('emergencyContact') || currentEditingParent.emergencyContact).trim(),
                };
                patchParent(targetId, patch);
                setEditingParentId(null);
                setView('dashboard');
              }}
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-accent rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Edit2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Edit Parent Profile</h2>
                <p className="text-gray-500">Update details for {currentEditingParent.name}.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">FullName</label>
                    <input name="name" type="text" defaultValue={currentEditingParent?.name} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Age</label>
                    <input name="age" type="number" defaultValue={currentEditingParent?.age} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Gender</label>
                    <select name="gender" defaultValue={currentEditingParent?.gender} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Blood Group</label>
                    <input name="bloodGroup" type="text" defaultValue={currentEditingParent?.bloodGroup} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="e.g. O+" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Allergies</label>
                    <input name="allergies" type="text" defaultValue={currentEditingParent?.allergies} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Peanuts, Penicillin..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Home Address (Miryalaguda/Nalgonda)</label>
                  <textarea name="address" defaultValue={currentEditingParent?.address} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent min-h-[100px]" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Critical Medical Info</label>
                  <textarea name="medicalHistory" defaultValue={currentEditingParent?.medicalHistory} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Primary Phone Number</label>
                    <input name="phoneNumber" type="tel" defaultValue={currentEditingParent?.phoneNumber} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 font-black text-emerald-600">WhatsApp for Safety Relay</label>
                    <input name="whatsappNumber" type="tel" defaultValue={currentEditingParent?.whatsappNumber} className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 focus:outline-none focus:border-emerald-500 placeholder:text-gray-300" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Local Emergency Contact</label>
                    <input name="emergencyContact" type="text" defaultValue={currentEditingParent?.emergencyContact} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-black shadow-xl shadow-gray-200">
                    Save Changes
                  </button>
                  <button type="button" onClick={() => { setEditingParentId(null); setView('dashboard'); }} className="w-full mt-4 text-sm font-bold text-gray-400 hover:text-primary">Cancel</button>
                </div>
              </div>
            </form>
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
                  <label
                    title="Upload profile photo"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > PROFILE_PHOTO_MAX_BYTES) {
                          alert(`Please choose an image under ${PROFILE_PHOTO_MAX_BYTES / 1024 / 1024} MB.`);
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            updateProfile({ profileImage: reader.result });
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
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
            <form
              className="uc-card p-10 space-y-10"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get('name') || '').trim();
                if (!name) return;
                const id = `parent_${Date.now().toString(36)}`;
                const newParent = {
                  id,
                  name,
                  age: Number(fd.get('age') || 0) || 0,
                  gender: (fd.get('gender') as 'Male' | 'Female' | 'Other') || 'Male',
                  bloodGroup: String(fd.get('bloodGroup') || '').trim() || undefined,
                  allergies: String(fd.get('allergies') || '').trim() || undefined,
                  address: String(fd.get('address') || '').trim(),
                  city: 'Miryalaguda' as const,
                  locationPin: { lat: 16.8736, lng: 79.5662 },
                  medicalHistory: String(fd.get('medicalHistory') || '').trim(),
                  currentMeds: [] as string[],
                  phoneNumber: String(fd.get('phoneNumber') || '').trim(),
                  whatsappNumber: String(fd.get('whatsappNumber') || '').trim(),
                  emergencyContact: String(fd.get('emergencyContact') || '').trim(),
                };
                upsertParent(newParent);
                setSelectedParentId(id);
                setView('dashboard');
              }}
            >
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
                    <input name="name" required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="e.g. S. Raghava" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Age</label>
                    <input name="age" type="number" min={0} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="68" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Gender</label>
                    <select name="gender" defaultValue="Male" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Blood Group</label>
                    <input name="bloodGroup" type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="e.g. O+" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Allergies</label>
                    <input name="allergies" type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Peanuts, Penicillin..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Home Address (Miryalaguda/Nalgonda)</label>
                  <textarea name="address" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent min-h-[100px]" placeholder="Detailed address with landmarks..." />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Critical Medical Info</label>
                  <textarea name="medicalHistory" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Allergies, chronic conditions..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Primary Phone Number</label>
                    <input name="phoneNumber" type="tel" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 font-black text-emerald-600">WhatsApp Number</label>
                    <input name="whatsappNumber" type="tel" className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 focus:outline-none focus:border-emerald-500 placeholder:text-gray-300" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Local Emergency Contact</label>
                    <input name="emergencyContact" type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:border-accent" placeholder="Neighbor/Relative's Phone Number" />
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-black shadow-xl shadow-gray-200">
                    Register Profile
                  </button>
                  <button 
                    type="button"
                    onClick={() => setView('dashboard')}
                    className="w-full mt-4 text-sm font-bold text-gray-400 hover:text-primary"
                  >
                    Cancel Onboarding
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
