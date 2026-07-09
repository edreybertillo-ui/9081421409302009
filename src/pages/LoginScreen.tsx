import { useState, type FormEvent } from 'react';
import { Droplets, Shield, Lock, Mail, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-cyan-900 relative overflow-hidden flex items-center justify-center p-8 lg:p-16">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Droplets className="w-7 h-7 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Water Distribution</h1>
              <p className="text-sm text-cyan-200">Monitoring System</p>
            </div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-balance">
            Real-time monitoring for your building's water network
          </h2>
          <p className="text-cyan-100/80 text-lg mb-10 leading-relaxed">
            Track pressure, tank levels, and sensor health across all floors. Detect leaks and respond before occupants are affected.
          </p>

          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Secure institutional SSO access only' },
              { icon: Droplets, text: 'Live pressure & tank level monitoring' },
              { icon: Building2, text: 'Multi-floor building sensor network' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-cyan-100">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                  <f.icon className="w-5 h-5 text-cyan-300" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Sign In</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Authorized personnel only. Use your institutional credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  required
                  className="input pl-11"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input pl-11"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-error-50 dark:bg-error-950/50 border border-error-200 dark:border-error-900 animate-fade-in">
                <AlertCircle className="w-4.5 h-4.5 text-error-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="w-4.5 h-4.5" />
                  Sign in via SSO
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>Unauthorized access is prohibited. All login attempts are logged.</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Only @institution.edu email addresses are authorized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
