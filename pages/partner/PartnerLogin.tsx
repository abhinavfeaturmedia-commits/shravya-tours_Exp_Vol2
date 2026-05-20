import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

export const PartnerLogin: React.FC = () => {
  const { login } = usePartnerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/partner/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      {/* Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-500/30 mb-5">
            <span className="material-symbols-outlined text-white text-[32px]">handshake</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Partner Portal</h1>
          <p className="text-white/50 mt-2 text-sm font-medium">Sign in to your Shrawello partner account</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 material-symbols-outlined text-[20px]">email</span>
                <input
                  id="partner-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="partner@company.com"
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl pl-12 pr-4 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 material-symbols-outlined text-[20px]">lock</span>
                <input
                  id="partner-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl pl-12 pr-12 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="partner-login-btn"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing In…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  Sign In to Partner Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-3">
            <p className="text-white/50 text-sm">
              Don't have an account?{' '}
              <Link to="/partner/register" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
                Register as Partner
              </Link>
            </p>
            <p className="text-white/30 text-xs">
              <Link to="/login" className="hover:text-white/50 transition-colors">Staff Login →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
