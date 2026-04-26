import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Wallet as WalletIcon,
  PhoneCall,
} from 'lucide-react';
import { MarketingNav } from '../components/marketing/MarketingNav';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'signup';

export default function FamilyLanding() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If a session already exists, send them straight to the app.
  useEffect(() => {
    if (auth.session) {
      navigate('/app', { replace: true });
    }
  }, [auth.session, navigate]);

  if (auth.session) return <Navigate to="/app" replace />;

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
      if (mode === 'signin') {
        const res = await auth.signInWithPassword(email, password);
        if (res.error) setError(res.error);
      } else {
        const res = await auth.signUp(email, password, fullName || email.split('@')[0], 'child');
        if (res.error) setError(res.error);
        else if (res.needsConfirmation) {
          setInfo('Account created. Confirm via the email we just sent, then sign in.');
          setMode('signin');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-white">
      <MarketingNav active="family" />

      <main className="container mx-auto px-4 md:px-8 py-12 md:py-20">
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-accent text-[10px] font-black tracking-widest uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified care, real-time
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05]">
              Care for the people<br />
              <span className="text-accent underline decoration-accent/20 underline-offset-4">you can't be there for.</span>
            </h1>
            <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-xl font-medium">
              Coordinate health, essentials, and home logistics for your parents through your local FamilyHub.
              Verified providers, escrowed payments, and live status — from anywhere in the world.
            </p>

            <ul className="space-y-2.5 pt-2">
              {[
                'Pharmacy runs, doctor visits, daily essentials — booked in seconds',
                'Every provider verified by your local hub, every job tracked live',
                'Payment held in escrow until you confirm the work is done',
                'One-tap SOS broadcasts to nearby hubs and trusted neighbours',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <a
                href="#auth"
                onClick={() => setMode('signup')}
                className="px-7 py-4 bg-accent text-white rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
              >
                Get started <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#auth"
                onClick={() => setMode('signin')}
                className="px-7 py-4 bg-white border border-gray-200 text-primary rounded-2xl font-black text-sm tracking-wide hover:border-accent transition-all"
              >
                I already have an account
              </a>
            </div>

            <p className="text-xs text-gray-400 pt-2">
              Service provider?{' '}
              <Link to="/providers" className="text-accent font-bold hover:underline">
                Apply to be a partner
              </Link>{' '}
              · Operating a hub?{' '}
              <Link to="/hubs" className="text-accent font-bold hover:underline">
                Hub admin sign-in
              </Link>
            </p>
          </motion.div>

          <motion.div
            id="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:pl-8"
          >
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 p-7 md:p-9 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight">
                  {mode === 'signin' ? 'Welcome back' : 'Create a family account'}
                </h2>
                <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-full">
                  {(['signin', 'signup'] as Mode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(null); setInfo(null); }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        mode === m ? 'bg-white text-primary shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      {m === 'signin' ? 'Sign in' : 'Sign up'}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="Your full name"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                {info && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{info}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {!auth.isSupabaseConfigured && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  Demo mode — any email/password works for sign-in.
                </p>
              )}
            </div>
          </motion.div>
        </section>

        <section className="mt-24 md:mt-32 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: ShieldCheck,
              title: 'Verified providers',
              body: 'Every partner passes hub-led document verification before they can take a job.',
            },
            {
              icon: WalletIcon,
              title: 'Escrowed payments',
              body: 'Funds are held until the family confirms the job is done. No surprises, no chasebacks.',
            },
            {
              icon: PhoneCall,
              title: 'Real-time SOS',
              body: 'One tap broadcasts location and medical info to nearby hubs and trusted neighbours.',
            },
          ].map(f => (
            <div key={f.title} className="p-7 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-11 h-11 bg-blue-50 text-accent rounded-2xl flex items-center justify-center">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-black mt-4 mb-1.5 text-lg">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 md:mt-28 mb-10 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-primary to-accent text-white relative overflow-hidden">
          <div className="absolute -top-4 -right-4 opacity-20"><Sparkles className="w-32 h-32" /></div>
          <div className="relative max-w-2xl space-y-4">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight">Built for families that live far from home.</h3>
            <p className="text-blue-100 text-sm md:text-base">
              FamilyHubs is the bridge between the elders you love and the local people who can show up for them.
              Used by families across multiple time zones to keep care continuous.
            </p>
            <a href="#auth" className="inline-block mt-2 px-6 py-3 bg-white text-primary rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors">
              Start coordinating care
            </a>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400 pb-12">
          FamilyHubs.in · Built for the families that live far from the people they love. ·{' '}
          <Link to="/providers" className="hover:text-accent">Partners</Link>{' '}
          ·{' '}
          <Link to="/hubs" className="hover:text-accent">Hubs</Link>
        </footer>
      </main>
    </div>
  );
}
