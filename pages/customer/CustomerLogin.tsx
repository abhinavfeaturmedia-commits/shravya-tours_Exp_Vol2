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
    <div className="min-h-screen flex bg-[#FDFBF7] text-slate-800 font-sans">

      {/* ── Left Luxury Visual Showcase (Desktop) ── */}
      <div
        className="hidden lg:flex lg:w-[50%] relative overflow-hidden flex-col justify-between p-12 xl:p-16"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Soft dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/60 to-black/30" />

        {/* Brand Top Bar */}
        <div className="relative z-10 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-2xl shadow-lg backdrop-blur-md">
            <span className="font-display font-black text-xl tracking-tight text-[#2D6A4F]">Shrawello</span>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#C9732A]/10 text-[#C9732A]">
              Travel Hub
            </span>
          </Link>
        </div>

        {/* Inspirational Message & Badges */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-white">
            <span className="material-symbols-outlined text-[16px] text-amber-400">diamond</span>
            <span className="text-[11px] font-bold tracking-wider uppercase">Private Traveler Portal</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-display font-black text-white leading-tight drop-shadow-lg">
            Every Great Journey<br />
            <span className="text-amber-300">Begins in Luxury.</span>
          </h1>

          <p className="text-white/80 text-sm font-normal leading-relaxed">
            Access your confirmed itineraries, 1-click boarding passes, secure family document vault, and 24/7 dedicated concierge assistance.
          </p>

          {/* Trust Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-amber-300 font-black text-lg block">2,500+</span>
              <span className="text-white/70 text-[10px] font-bold uppercase">Trips Curated</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-amber-300 font-black text-lg block">4.9 ★</span>
              <span className="text-white/70 text-[10px] font-bold uppercase">Guest Rating</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-amber-300 font-black text-lg block">24/7</span>
              <span className="text-white/70 text-[10px] font-bold uppercase">Live Support</span>
            </div>
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10 text-[11px] text-white/50">
          © {new Date().getFullYear()} Shrawello Travel Hub. All rights reserved.
        </div>
      </div>

      {/* ── Right Panel: Sign In Form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 relative">
        {/* Subtle Ambient Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#C9732A]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#2D6A4F]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Header */}
        <div className="lg:hidden mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <span className="font-display font-black text-2xl tracking-tight text-[#2D6A4F]">Shrawello</span>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#C9732A]/10 text-[#C9732A]">
              Travel Hub
            </span>
          </Link>
          <p className="text-xs text-slate-500">Welcome to your private travel lounge</p>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="mb-8">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#C9732A] bg-[#C9732A]/10 px-3 py-1 rounded-full inline-block mb-3">
              Customer Sign In
            </span>
            <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">
              Welcome back<span className="text-[#C9732A]">.</span>
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Sign in to manage your upcoming getaways and travel documents.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl text-xs bg-red-50 border border-red-200 text-red-600 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form with Double-Bezel tactile card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8DF] shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-400">
                    mail
                  </span>
                  <input
                    id="customer-login-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-xs sm:text-sm bg-[#FDFBF7] border border-[#EDE8DF] text-slate-800 outline-none transition-all focus:bg-white focus:border-[#C9732A] focus:ring-2 focus:ring-[#C9732A]/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setError('To reset your password, contact our 24/7 concierge at hello@shrawellotours.com or WhatsApp support.')}
                    className="text-[11px] font-bold text-[#C9732A] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-400">
                    lock
                  </span>
                  <input
                    id="customer-login-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-11 rounded-xl text-xs sm:text-sm bg-[#FDFBF7] border border-[#EDE8DF] text-slate-800 outline-none transition-all focus:bg-white focus:border-[#C9732A] focus:ring-2 focus:ring-[#C9732A]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                id="customer-login-btn"
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-[#C9732A] to-[#E8935B] hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Travel Hub</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#EDE8DF]" />
              <span className="text-[11px] font-medium text-slate-400">First time traveling with us?</span>
              <div className="flex-1 h-px bg-[#EDE8DF]" />
            </div>

            {/* Register Action */}
            <Link
              to="/customer/register"
              id="customer-register-link"
              className="w-full h-12 border border-[#EDE8DF] hover:border-[#C9732A] hover:bg-[#C9732A]/5 text-[#C9732A] font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Create Free Account
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-800 flex items-center gap-1 font-medium transition-colors">
              <span className="material-symbols-outlined text-[16px]">home</span>
              Return Home
            </Link>
            <span>•</span>
            <Link to="/packages" className="hover:text-slate-800 flex items-center gap-1 font-medium transition-colors">
              <span className="material-symbols-outlined text-[16px]">explore</span>
              Browse Tours
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
};
