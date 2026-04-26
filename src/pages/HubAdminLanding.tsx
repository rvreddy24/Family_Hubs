import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
} from 'lucide-react';
import { MarketingNav } from '../components/marketing/MarketingNav';
import { useAuth } from '../context/AuthContext';

/**
 * Hub admin landing — sign-in only, no public sign-up. Hub admin accounts are issued
 * out-of-band by FamilyHubs HQ (the seed script / Supabase dashboard) so the role
 * cannot be self-assigned.
 */
export default function HubAdminLanding() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.session) navigate('/app', { replace: true });
  }, [auth.session, navigate]);
  if (auth.session) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    try {
      const res = await auth.signInWithPassword(email, password);
      if (res.error) setError(res.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <MarketingNav active="hub" />

      <main className="container mx-auto px-4 md:px-8 py-12 md:py-20">
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Operator console
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05]">
              Run your local hub.<br />
              <span className="text-slate-700 underline decoration-slate-200 underline-offset-4">Trusted operations.</span>
            </h1>
            <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-xl font-medium">
              The control room for your FamilyHub. Verify partners, dispatch jobs, monitor SOS broadcasts,
              and keep the wallet ledger clean — all from one live console.
            </p>

            <ul className="space-y-2.5 pt-2">
              {[
                'Pending verification queue with one-click approval',
                'Live dispatch board across all active families and providers',
                'SOS broadcast and acknowledgement panel',
                'Audit log of every wallet movement, identity check, and dispatch',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-900 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Hub admin accounts are issued by FamilyHubs HQ — there's no public sign-up.
                  If you operate (or want to operate) a hub, contact us and we'll provision your account.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-2">
              Looking for help instead?{' '}
              <Link to="/" className="text-accent font-bold hover:underline">For families</Link>{' '}
              · Want to provide services?{' '}
              <Link to="/providers" className="text-emerald-600 font-bold hover:underline">For partners</Link>
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
              <div className="space-y-1.5">
                <h2 className="text-xl font-black tracking-tight">Hub admin sign-in</h2>
                <p className="text-xs text-gray-400">Use the credentials provided by FamilyHubs HQ.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hub admin email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="email" type="email" required placeholder="hub@familyhubs.in" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-slate-700" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="password" type="password" required minLength={6} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pl-11 text-sm focus:outline-none focus:border-slate-700" />
                  </div>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-slate-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? '…' : <>Sign in to console <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <a
                href="mailto:operators@familyhubs.in?subject=Hub%20admin%20account%20request"
                className="block text-center text-xs text-gray-400 hover:text-primary"
              >
                Need a hub admin account? Email operators@familyhubs.in →
              </a>
            </div>
          </motion.div>
        </section>

        <section className="mt-24 md:mt-32 grid md:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: Users, title: 'Verification queue', body: 'Review provider applications with KYC status, skills, and contact in one row.' },
            { icon: Radio, title: 'SOS broadcast', body: 'Live alerts from families with location and medical card. One-tap acknowledge.' },
            { icon: Activity, title: 'Dispatch board', body: 'See every job\u2019s status across the hub — assigned, en route, completed, settled.' },
            { icon: FileText, title: 'Audit ledger', body: 'Every wallet credit, escrow lock, identity check is recorded for compliance.' },
          ].map(f => (
            <div key={f.title} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-black mt-4 mb-1.5">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="text-center text-xs text-gray-400 pt-16 pb-12">
          FamilyHubs.in · Hub operators ·{' '}
          <Link to="/" className="hover:text-primary">Families</Link>{' '}·{' '}
          <Link to="/providers" className="hover:text-primary">Partners</Link>
        </footer>
      </main>
    </div>
  );
}
