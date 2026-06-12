'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Building2, Lock, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin',       email: 'admin@jalpaigurimunicipality.gov.in',         role: 'Full access'        },
  { label: 'Chairman',          email: 'chairman@jalpaigurimunicipality.gov.in',       role: 'Executive view'     },
  { label: 'Municipal Officer', email: 'officer.north@jalpaigurimunicipality.gov.in',  role: 'Operations'         },
  { label: 'Field Worker',      email: 'worker.01@jalpaiguri.gov.in',                  role: 'Task management'    },
  { label: 'Citizen',           email: 'citizen.demo1@example.com',                    role: 'Report & track'     },
];

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login } = useAuth();
  const router    = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch {
      setError('Invalid credentials. Try Demo@1234 as password.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    setError('');
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col w-[480px] bg-gov-gradient text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-100" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg font-bold">Jalpaiguri</p>
              <p className="text-sm text-blue-200">Smart City Platform</p>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-3xl font-bold leading-tight mb-4">
              City Climate &<br />Civic Intelligence
            </h2>
            <p className="text-blue-200 leading-relaxed mb-10">
              A unified municipal operating system for complaint management,
              GIS intelligence, drainage monitoring, and urban green cover analysis.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: '20',   l: 'Municipal Wards'   },
                { n: '500+', l: 'Active Complaints'  },
                { n: '5K+',  l: 'Trees Monitored'    },
                { n: '60',   l: 'IoT Drain Sensors'  },
              ].map(({ n, l }) => (
                <div key={l} className="bg-white/10 rounded-xl p-4">
                  <p className="text-2xl font-bold">{n}</p>
                  <p className="text-sm text-blue-200">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-blue-300 mt-8">
            Jalpaiguri Municipality · West Bengal, India<br />
            Powered by City Intelligence Platform v1.0
          </p>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 bg-slate-50">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gov-gradient flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Jalpaiguri Smart City</p>
              <p className="text-xs text-slate-500">Municipal Platform</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-8">Access the municipal operations platform</p>

          {error && (
            <div className="alert-danger mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="officer@jalpaigurimunicipality.gov.in"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Demo accounts (password: Demo@1234)
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  onClick={() => fillDemo(acct.email)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                    bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50
                    text-left transition-colors duration-150 group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-brand-700">{acct.label}</p>
                    <p className="text-2xs text-slate-400 truncate">{acct.email}</p>
                  </div>
                  <span className="text-2xs text-slate-400 flex-shrink-0 ml-2">{acct.role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-8">
            For citizen complaints, visit{' '}
            <Link href="/report" className="text-brand-600 hover:underline">Report an Issue</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
