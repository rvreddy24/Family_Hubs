import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Coins,
  Heart,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import { MarketingNav } from '../components/marketing/MarketingNav';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'apply';

const SKILL_OPTIONS: { id: string; label: string }[] = [
  { id: 'medical', label: 'Medical' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'essentials', label: 'Essentials' },
  { id: 'admin', label: 'Admin/Bills' },
  { id: 'transport', label: 'Transport' },
];

export default function ProviderLanding() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('apply');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (auth.session) navigate('/app', { replace: true });
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
    try {
      if (mode === 'signin') {
        const res = await auth.signInWithPassword(email, password);
        if (res.error) setError(res.error);
        return;
      }

      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const city = String(fd.get('city') || '').trim();
      const skills = SKILL_OPTIONS
        .map(s => s.id)
        .filter(id => fd.get(`skill_${id}`) === 'on');
      const docsNote = String(fd.get('docs') || '').trim();
      const documents = docsNote
        ? docsNote
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean)
            .slice(0, 6)
            .map(line => ({ label: line.slice(0, 60), note: line }))
        : [];

      const res = await fetch('/api/providers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, city, skills, documents }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Application failed (${res.status})`);
        return;
      }
      setInfo(json.message || 'Application submitted. Signing you in…');
      const signin = await auth.signInWithPassword(email, password);
      if (signin.error) {
        // Couldn't auto-sign-in (rare). Switch to sign-in mode so they can try.
        setMode('signin');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white">
      <MarketingNav active="provider" />

      <main className="container mx-auto px-4 md:px-8 py-12 md:py-20">
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase">
              <Shield className="w-3.5 h-3.5" />
              Verified partners only
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05]">
              Earn flexibly.<br />
              <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-4">Help your neighbours.</span>
            </h1>
            <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-xl font-medium">
              Pharmacy runs, doctor visits, errands. Pick what fits your day. Get paid the moment a family
              confirms the job is done — funds released straight from escrow.
            </p>

            <ul className="space-y-2.5 pt-2">
              {[
                'Real jobs from local families, not gig brokers',
                'Daily payouts the moment work is verified',
                'You choose your skills, hours, and area',
                'Hub admins back you up — verified accounts only',
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
                onClick={() => setMode('apply')}
                className="px-7 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98]"
              >
                Apply to be a partner <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#auth"
                onClick={() => setMode('signin')}
                className="px-7 py-4 bg-white border border-gray-200 text-primary rounded-2xl font-black text-sm tracking-wide hover:border-emerald-500 transition-all"
              >
                I already have an account
              </a>
            </div>

            <p className="text-xs text-gray-400 pt-2">
              Looking for help instead?{' '}
              <Link to="/" className="text-emerald-600 font-bold hover:underline">For families</Link>
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-tight">
                  {mode === 'signin' ? 'Partner sign-in' : 'Apply to be a partner'}
                </h2>
                <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-full shrink-0">
                  {(['apply', 'signin'] as Mode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(null); setInfo(null); }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        mode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      {m === 'apply' ? 'Apply' : 'Sign in'}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'apply' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="name" type="text" required placeholder="Your full name" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="email" type="email" required placeholder="you@example.com" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="password" type="password" required minLength={mode === 'apply' ? 8 : 6} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>

                {mode === 'apply' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input name="phone" type="tel" required placeholder="+91 …" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">City</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input name="city" type="text" required placeholder="Miryalaguda" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Services I can offer</label>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_OPTIONS.map(s => (
                          <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                            <input type="checkbox" name={`skill_${s.id}`} className="accent-emerald-600" />
                            {s.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Documents you can share</label>
                      <textarea
                        name="docs"
                        rows={3}
                        placeholder={'One per line — e.g.\nAadhaar card\nDriving licence\nPolice clearance'}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                      />
                      <p className="text-[10px] text-gray-400 leading-snug">
                        Don't upload here. The hub admin will collect documents directly after reviewing your application.
                      </p>
                    </div>
                  </>
                )}

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                {info && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{info}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? '…' : mode === 'signin' ? 'Sign in' : 'Submit application'}
                </button>
              </form>
            </div>
          </motion.div>
        </section>

        <section className="mt-24 md:mt-32 grid md:grid-cols-3 gap-6">
          {[
            { icon: Coins, title: 'Daily payouts', body: 'No 30-day waits. Payment is released the instant a family confirms the work.' },
            { icon: Briefcase, title: 'You choose your jobs', body: 'Browse incoming requests in your area. Take only what fits your skills and schedule.' },
            { icon: Calendar, title: 'Cancel anytime', body: 'No exclusivity, no quotas. FamilyHubs is a side gig or a full-time hustle — your call.' },
          ].map(f => (
            <div key={f.title} className="p-7 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-black mt-4 mb-1.5 text-lg">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 md:mt-28 mb-10 p-8 md:p-12 rounded-3xl bg-emerald-600 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 opacity-20"><Heart className="w-32 h-32" /></div>
          <div className="relative max-w-2xl space-y-4">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight">Three steps to your first job</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black shrink-0">1</span><span>Apply with your details and the services you want to offer.</span></li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black shrink-0">2</span><span>Hub admin reviews your documents and verifies you.</span></li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black shrink-0">3</span><span>Live jobs appear on your dashboard. Accept and earn.</span></li>
            </ol>
            <a href="#auth" onClick={() => setMode('apply')} className="inline-block mt-2 px-6 py-3 bg-white text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors">
              Start your application
            </a>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400 pb-12">
          FamilyHubs.in · Partners ·{' '}
          <Link to="/" className="hover:text-emerald-600">Families</Link>{' '}·{' '}
          <Link to="/hubs" className="hover:text-emerald-600">Hubs</Link>
        </footer>
      </main>
    </div>
  );
}
