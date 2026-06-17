import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const CustomerLogin: React.FC = () => {
  const { login } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/my-account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#FBF7F0' }}>

      {/* ── Left decorative panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-14"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=85&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(150deg, rgba(201,115,42,0.88) 0%, rgba(13,23,16,0.82) 60%, rgba(45,106,79,0.72) 100%)' }} />
        {/* Top grain texture overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />

        {/* Brand */}
        <div className="relative z-10">
          <div className="h-12 w-auto bg-white/90 p-2 rounded-2xl shadow-lg backdrop-blur-sm inline-block">
            <img src="/logo.png" alt="SHRAWELLO Travel Hub" className="h-full object-contain" />
          </div>
        </div>

        {/* Copy */}
        <div className="relative z-10">
          {/* Pill tag */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="material-symbols-outlined text-white text-[16px]">auto_awesome</span>
            <span className="text-white text-xs font-semibold tracking-wider uppercase">Your Travel, Simplified</span>
          </div>

          <h1 className="text-white font-display text-5xl xl:text-6xl font-bold leading-[1.1] mb-6 drop-shadow-xl"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            Every Journey<br />
            <span style={{ color: '#F4B88A' }}>Begins Here.</span>
          </h1>
          <p className="text-white/70 text-base font-light leading-relaxed mb-10 max-w-sm">
            Track your bookings, manage itineraries, and discover new destinations — all in one place.
          </p>

          {/* Trust badges */}
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { icon: 'luggage', label: '2,000+ Trips' },
              { icon: 'star', label: '4.9 Rating' },
              { icon: 'support_agent', label: '24/7 Support' },
            ].map(b => (
              <div key={b.icon} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-2">
                <span className="material-symbols-outlined text-[#F4B88A] text-[18px]">{b.icon}</span>
                <span className="text-white text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16 xl:px-20 py-12 relative overflow-hidden">

        {/* Ambient blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C9732A 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #2D6A4F 0%, transparent 70%)' }} />

        {/* Top accent bar on mobile */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C9732A, #E8935B, #2D6A4F)' }} />

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 mt-4">
          <img src="/logo.png" alt="SHRAWELLO" className="h-10 object-contain" />
        </div>

        <div className="w-full max-w-md reveal">

          {/* Header */}
          <div className="mb-8">
            {/* Icon bubble */}
            <div className="inline-flex items-center justify-center size-14 rounded-2xl mb-5 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #C9732A 0%, #E8935B 100%)' }}>
              <span className="material-symbols-outlined text-white text-[28px]">person</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
              Welcome back<span style={{ color: '#C9732A' }}>.</span>
            </h1>
            <p className="text-slate-500 text-sm font-light">
              Sign in to manage your bookings and travel plans.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl text-sm border"
              style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748B' }}>
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>
                  mail
                </span>
                <input
                  id="customer-login-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-13 pl-12 pr-4 rounded-2xl text-sm font-medium outline-none transition-all"
                  style={{
                    height: '52px',
                    background: '#FFFFFF',
                    border: '1.5px solid #EDE8DF',
                    color: '#1E293B',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#C9732A'; e.target.style.boxShadow = '0 0 0 3px rgba(201,115,42,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#EDE8DF'; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Password
                </label>
                <a href="#" className="text-xs font-medium transition-colors"
                  style={{ color: '#C9732A' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#A85E1E')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#C9732A')}>
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>
                  lock
                </span>
                <input
                  id="customer-login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 rounded-2xl text-sm font-medium outline-none transition-all"
                  style={{
                    height: '52px',
                    background: '#FFFFFF',
                    border: '1.5px solid #EDE8DF',
                    color: '#1E293B',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#C9732A'; e.target.style.boxShadow = '0 0 0 3px rgba(201,115,42,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#EDE8DF'; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#C4B5A0' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#C4B5A0')}>
                  <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="customer-login-btn"
              type="submit"
              disabled={loading}
              className="w-full font-bold rounded-2xl flex items-center justify-center gap-2 transition-all btn-glow disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                height: '52px',
                background: loading ? '#C9732A' : 'linear-gradient(135deg, #C9732A 0%, #E8935B 100%)',
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(201,115,42,0.32)',
                fontSize: '15px',
              }}
            >
              {loading ? (
                <>
                  <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px" style={{ background: '#EDE8DF' }} />
            <span className="text-xs font-medium" style={{ color: '#C4B5A0' }}>New to Shrawello?</span>
            <div className="flex-1 h-px" style={{ background: '#EDE8DF' }} />
          </div>

          {/* Register CTA */}
          <Link
            to="/customer/register"
            id="customer-register-link"
            className="w-full font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              height: '52px',
              background: 'transparent',
              border: '1.5px solid #C9732A',
              color: '#C9732A',
              fontSize: '15px',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(201,115,42,0.06)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'transparent';
            }}
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Create Free Account
          </Link>

          {/* Back links */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#C9732A')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Homepage
            </Link>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] mt-8 font-light" style={{ color: '#C4B5A0' }}>
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline" style={{ color: '#C9732A' }}>Terms of Service</Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline" style={{ color: '#C9732A' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
