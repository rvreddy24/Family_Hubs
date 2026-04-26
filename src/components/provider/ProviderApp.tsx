import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, ArrowRight, Camera, CheckCircle2, Clock,
  Heart, History, LogOut, MapPin, Menu, Navigation, Phone, ShieldCheck,
  Star, User, Wallet, X, Briefcase, Upload, Lock
} from 'lucide-react';
import { ConnectionIndicator } from '../ui/LiveSignalToaster';
import { useApp } from '../../context/AppContext';
import type { Provider, ServiceCategory } from '../../types';

type ProviderView = 'home' | 'active-job' | 'earnings' | 'profile' | 'history';
type JobStep = 'assigned' | 'en_route' | 'arrived' | 'checked_in' | 'in_progress' | 'completed' | 'settled';

const STEP_ORDER: JobStep[] = ['assigned','en_route','arrived','checked_in','in_progress','completed','settled'];

function providerForUser(
  user: { id: string; name: string; email?: string; phoneNumber?: string; profileImage?: string },
  providers: Provider[]
): Provider {
  const p = providers.find((x) => x.id === user.id);
  if (p) return p;
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    phone: user.phoneNumber || '',
    photo: user.profileImage || '',
    skills: [] as ServiceCategory[],
    verified: false,
    activeStatus: 'idle',
    rating: 0,
    totalJobs: 0,
    joinedAt: new Date().toISOString(),
    verificationDocs: []
  };
}

export default function ProviderApp({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<ProviderView>('home');
  const [isMobileNav, setIsMobileNav] = useState(false);
  const { user, tasks, handleTaskStatusUpdate, parents, providers } = useApp();
  const provider = useMemo(() => providerForUser(user, providers as Provider[]), [user, providers]);

  if (!provider.verified) {
    return <ProviderPendingReview provider={provider} onLogout={onLogout} />;
  }

  const myTasks = tasks.filter(t => t.providerId === provider.id);

  const activeJob = myTasks.find(t => t.status !== 'settled' && t.status !== 'completed');
  const completedJobs = myTasks.filter(t => t.status === 'settled');
  const earningsRows = useMemo(
    () =>
      completedJobs.map((j) => ({
        id: j.id,
        task: j.title,
        amount: j.cost,
        date: (j.evidence?.completedAt || j.updatedAt || j.createdAt).slice(0, 10),
        status: 'paid' as const
      })),
    [completedJobs]
  );
  const totalEarnings = earningsRows.reduce((s, e) => s + e.amount, 0);
  const thisMonthEarnings = useMemo(() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth();
    return completedJobs
      .filter((j) => {
        const d = new Date(j.evidence?.completedAt || j.updatedAt || j.createdAt);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((s, j) => s + j.cost, 0);
  }, [completedJobs]);
  const jobTotalDisplay = Math.max(provider.totalJobs, completedJobs.length);

  const advanceJobStep = (taskId: string) => {
    const t = myTasks.find(x => x.id === taskId);
    if (!t) return;
    const idx = STEP_ORDER.indexOf(t.status as JobStep);
    if (idx < 0 || idx >= STEP_ORDER.length - 1) return;
    const next = STEP_ORDER[idx + 1];
    handleTaskStatusUpdate(taskId, next);
  };

  const stepLabel = (s: string) => {
    const map: Record<string, string> = {
      assigned: 'Accept & Start Commute', en_route: 'Confirm Arrival',
      arrived: 'Enter Safety Code', checked_in: 'Take Selfie & Begin',
      in_progress: 'Upload Completion Photo', completed: 'Awaiting Settlement',
    };
    return map[s] || s;
  };

  const stepIcon = (s: string) => {
    const map: Record<string, any> = {
      assigned: Navigation, en_route: MapPin, arrived: Lock,
      checked_in: Camera, in_progress: Upload, completed: Clock,
    };
    const I = map[s] || CheckCircle2;
    return <I className="w-5 h-5" />;
  };

  const NavBtn = ({ id, icon: Icon, label }: { id: ProviderView; icon: any; label: string }) => (
    <button onClick={() => { setView(id); setIsMobileNav(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm w-full transition-all ${
        view === id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
      }`}>
      <Icon className="w-5 h-5" /> {label}
    </button>
  );

  // ---- ACTIVE JOB WORKFLOW ----
  const ActiveJobView = ({ job }: { job: any }) => {
    const [code, setCode] = useState('');
    const parent = parents.find((p) => p.id === job.parentId) ?? null;
    const stepIdx = STEP_ORDER.indexOf(job.status);

    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="flex gap-1">
          {STEP_ORDER.slice(0, -1).map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= stepIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Job header */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">{job.title}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                {job.category} • Task #{job.id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-emerald-600">${job.cost}</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase">Escrow Locked</p>
            </div>
          </div>
        </div>

        {/* Parent info */}
        {parent ? (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
          <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Parent Details</h4>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Heart className="w-7 h-7 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{parent.name}</p>
              <p className="text-xs text-gray-500">{parent.address}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/80 p-3 rounded-xl text-center">
              <p className="text-[8px] font-bold text-gray-400 uppercase">Age</p>
              <p className="font-black">{parent.age}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl text-center">
              <p className="text-[8px] font-bold text-gray-400 uppercase">Blood</p>
              <p className="font-black">{parent.bloodGroup}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl text-center">
              <p className="text-[8px] font-bold text-gray-400 uppercase">BP</p>
              <p className="font-black">{parent.vitals?.bloodPressure || '—'}</p>
            </div>
          </div>
          <div className="bg-white/60 p-3 rounded-xl">
            <p className="text-[8px] font-bold text-red-500 uppercase mb-1">Medical Alert</p>
            <p className="text-xs font-medium text-gray-700">{parent.medicalHistory}</p>
          </div>
          <a href={`tel:${parent.phoneNumber}`}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">
            <Phone className="w-4 h-4" /> Call Parent
          </a>
        </div>
        ) : (
        <div className="bg-gray-100 p-6 rounded-3xl border border-dashed border-gray-200 text-center text-sm text-gray-500">
          <p>Family member details for this visit are not in your hub yet. Use task notes and the safety flow until the care profile is linked.</p>
        </div>
        )}

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Child's Instructions</p>
          <p className="text-sm italic text-amber-900 leading-relaxed">"{job.instructions}"</p>
        </div>

        {/* Step-specific action */}
        {job.status === 'arrived' ? (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="font-bold text-center">Enter 4-Digit Safety Code</h4>
            <p className="text-xs text-gray-500 text-center">Ask the parent for the code shared by their child.</p>
            <div className="flex justify-center gap-2">
              {[0,1,2,3].map(i => (
                <input key={i} maxLength={1} className="w-14 h-16 text-center text-2xl font-black border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  value={code[i] || ''} onChange={e => {
                    const v = code.split(''); v[i] = e.target.value; setCode(v.join(''));
                    if (e.target.value && e.target.nextElementSibling) (e.target.nextElementSibling as HTMLInputElement).focus();
                  }}
                />
              ))}
            </div>
            <button onClick={() => { if (code.length === 4) advanceJobStep(job.id); }}
              disabled={code.length < 4}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all shadow-lg">
              Verify Safety Handshake
            </button>
          </div>
        ) : job.status !== 'completed' && job.status !== 'settled' ? (
          <button onClick={() => advanceJobStep(job.id)}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 active:scale-95 transition-all">
            {stepIcon(job.status)} {stepLabel(job.status)}
          </button>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="font-bold text-emerald-900">Task Completed</p>
            <p className="text-xs text-emerald-700">Waiting for the NRI child to review evidence and release payment.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile nav backdrop */}
      <AnimatePresence>
        {isMobileNav && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileNav(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110] lg:hidden" />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col p-6 z-[120] transition-transform lg:translate-x-0 ${isMobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">FieldOps</h1>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Provider Portal</p>
            </div>
          </div>
          <button onClick={() => setIsMobileNav(false)} className="lg:hidden p-2 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {/* Provider avatar */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
          {provider.photo ? (
            <img src={provider.photo} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
          )}
          <div>
            <p className="font-bold text-sm">{provider.name}</p>
            <div className="flex items-center gap-1">
              {provider.verified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
              <span className="text-[9px] font-bold text-gray-400 uppercase">Verified</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavBtn id="home" icon={Activity} label="Dashboard" />
          <NavBtn id="active-job" icon={Briefcase} label="Active Job" />
          <NavBtn id="earnings" icon={Wallet} label="Earnings" />
          <NavBtn id="history" icon={History} label="Job History" />
          <NavBtn id="profile" icon={User} label="My Profile" />
        </nav>

        <div className="pt-4 border-t border-gray-100 space-y-3">
          <ConnectionIndicator />
          <button onClick={onLogout} className="w-full py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-600 transition-all">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-[100]">
          <button onClick={() => setIsMobileNav(true)} className="p-2"><Menu className="w-6 h-6" /></button>
          <div className="text-center">
            <h2 className="text-sm font-black">FieldOps</h2>
            <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest">Provider Portal</p>
          </div>
          {provider.photo ? (
            <img src={provider.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
          )}
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
          <AnimatePresence mode="wait">
            {/* ===== HOME ===== */}
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black">Welcome, {provider.name.split(' ')[0]} 👋</h2>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{(user as { hubId?: string }).hubId || 'Your hub'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-2xl font-black text-emerald-600">{jobTotalDisplay}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Total Jobs</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <p className="text-2xl font-black">{provider.rating}</p>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Rating</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-2xl font-black text-emerald-600">${totalEarnings}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Earned</p>
                  </div>
                </div>

                {/* Active job card */}
                {activeJob ? (
                  <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Active Assignment</span>
                      </div>
                      <h3 className="text-xl font-black">{activeJob.title}</h3>
                      <p className="text-white/60 text-xs">{activeJob.description}</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">{activeJob.status.replace('_', ' ')}</span>
                        <span className="font-black">${activeJob.cost}</span>
                      </div>
                      <button onClick={() => setView('active-job')}
                        className="w-full py-4 bg-white text-emerald-700 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                        Open Workflow <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-3">
                    <Briefcase className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-bold text-gray-400">No Active Jobs</p>
                    <p className="text-xs text-gray-400">Waiting for the hub admin to assign a task.</p>
                  </div>
                )}

                {/* Recent earnings */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Earnings</h3>
                  {earningsRows.length === 0 ? (
                    <p className="text-sm text-gray-400">No settled payouts yet.</p>
                  ) : (
                    earningsRows.slice(0, 3).map((e) => (
                    <div key={e.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{e.task}</p>
                          <p className="text-[10px] text-gray-400">{e.date}</p>
                        </div>
                      </div>
                      <p className="font-black text-emerald-600">+${e.amount.toFixed(2)}</p>
                    </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ===== ACTIVE JOB ===== */}
            {view === 'active-job' && (
              <motion.div key="active-job" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-black mb-6">Active Job Workflow</h2>
                {activeJob ? <ActiveJobView job={activeJob} /> : (
                  <div className="bg-white p-16 rounded-3xl border border-gray-100 text-center space-y-3">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="font-bold text-gray-400">No active assignments</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== EARNINGS ===== */}
            {view === 'earnings' && (
              <motion.div key="earnings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h2 className="text-2xl font-black">Earnings</h2>
                <div className="bg-emerald-600 p-8 rounded-3xl text-white shadow-xl">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Earned</p>
                  <h3 className="text-5xl font-black mt-2">${totalEarnings.toFixed(2)}</h3>
                  <div className="flex gap-4 mt-6">
                    <div className="bg-white/10 p-4 rounded-2xl flex-1">
                      <p className="text-[10px] font-black text-white/40 uppercase">This Month</p>
                      <p className="font-bold text-lg">${thisMonthEarnings.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl flex-1">
                      <p className="text-[10px] font-black text-white/40 uppercase">Jobs Done</p>
                      <p className="font-bold text-lg">{completedJobs.length}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction History</h3>
                  {earningsRows.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center text-gray-400 text-sm">No transactions yet. Completed, settled jobs appear here.</div>
                  ) : (
                    earningsRows.map((e) => (
                    <div key={e.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
                        <div>
                          <p className="font-bold text-sm">{e.task}</p>
                          <p className="text-[10px] text-gray-400">{e.date} • {e.status}</p>
                        </div>
                      </div>
                      <p className="font-black text-emerald-600">+${e.amount.toFixed(2)}</p>
                    </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ===== HISTORY ===== */}
            {view === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h2 className="text-2xl font-black">Job History</h2>
                {completedJobs.length > 0 ? completedJobs.map(j => (
                  <div key={j.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
                      <div>
                        <p className="font-bold">{j.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{j.category} • ${j.cost}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">Settled</span>
                  </div>
                )) : (
                  <div className="bg-white p-16 rounded-3xl border border-gray-100 text-center">
                    <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold">No completed jobs yet</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== PROFILE ===== */}
            {view === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h2 className="text-2xl font-black">My Profile</h2>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center space-y-4">
                  {provider.photo ? (
                    <img src={provider.photo} alt="" className="w-20 h-20 rounded-2xl mx-auto border-4 border-emerald-100 object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl mx-auto border-4 border-emerald-100 bg-gray-100 flex items-center justify-center"><User className="w-10 h-10 text-gray-400" /></div>
                  )}
                  <div>
                    <h3 className="text-xl font-black">{provider.name}</h3>
                    <p className="text-gray-400 text-sm">{provider.email}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {provider.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    <span className="text-xs font-bold text-emerald-600">Identity Verified</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Skills</p>
                    <p className="font-bold mt-1">{provider.skills.length ? provider.skills.join(', ') : '—'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Phone</p>
                    <p className="font-bold mt-1">{provider.phone}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Rating</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-black">{provider.rating}</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Joined</p>
                    <p className="font-bold mt-1">{new Date(provider.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ProviderPendingReview({
  provider,
  onLogout,
}: {
  provider: Provider;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <span className="font-black tracking-tight">FamilyHubs Partners</span>
        </div>
        <button
          onClick={onLogout}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary flex items-center gap-1.5"
        >
          Sign out <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          <div className="uc-card p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                Application under review
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Hi {provider.name.split(' ')[0] || 'there'}, you're almost in.
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your application has been submitted to your hub. A hub admin will reach out
                to verify your documents. Once approved, you'll see your dispatch queue
                here automatically — no need to re-apply.
              </p>
            </div>
          </div>

          <div className="uc-card p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">What happens next</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[11px] font-black shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <span>You created your account.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-[11px] font-black shrink-0">2</span>
                <span>The hub admin reviews your details and contacts you for documents.</span>
              </li>
              <li className="flex gap-3 text-gray-400">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[11px] font-black shrink-0">3</span>
                <span>You're verified. Jobs start appearing on this dashboard in real time.</span>
              </li>
            </ol>
          </div>

          {provider.skills.length > 0 && (
            <div className="uc-card p-6 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Your application</h3>
              <div className="flex flex-wrap gap-1.5">
                {provider.skills.map((s, i) => (
                  <span key={i} className="text-[10px] font-bold uppercase tracking-widest bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg text-gray-500">
                    {s}
                  </span>
                ))}
              </div>
              {provider.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> {provider.phone}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
