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
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-500/30 mb-5">
            <span className="material-symbols-outlined text-white text-[32px]">handshake</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Travel Associate Portal</h1>
          <p className="text-white/50 mt-2 text-sm font-medium">Sign in to your SHRAWELLO Travel Associate account</p>
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
                <input id="partner-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="partner@company.com" required autoFocus
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl pl-12 pr-4 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 material-symbols-outlined text-[20px]">lock</span>
                <input id="partner-password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Your password" required
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl pl-12 pr-12 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <ForgotPasswordPanel portal="partner" />
            </div>
            <button type="submit" id="partner-login-btn" disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading ? (<><div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing In…</>) : (<><span className="material-symbols-outlined text-[20px]">login</span>Sign In to Partner Portal</>)}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-3">
            <p className="text-white/50 text-sm">Don't have an account?{' '}<Link to="/partner/register" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">Register as Travel Associate</Link></p>
            <p className="text-white/30 text-xs"><Link to="/login" className="hover:text-white/50 transition-colors">Staff Login →</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ForgotPasswordPanel: React.FC<{ portal: string }> = ({ portal }) => {
  const [phase, setPhase] = React.useState<'closed'|'email'|'otp'|'newpass'>('closed');
  const [fpEmail, setFpEmail] = React.useState('');
  const [otp, setOtp] = React.useState(['','','','','','']);
  const [resetToken, setResetToken] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const otpRefs = React.useRef<(HTMLInputElement|null)[]>([]);

  const startCooldown = () => {
    setCooldown(60);
    const t = setInterval(() => setCooldown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
  };

  const sendOTP = async () => {
    setErr(''); setMsg('');
    if (!fpEmail.trim()) { setErr('Enter your email'); return; }
    setLoading(true);
    try {
      const endpoint = portal === 'partner' ? '/api/partner/auth/forgot-password' : portal === 'customer' ? '/api/customer/auth/forgot-password' : '/api/auth/forgot-password';
      await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fpEmail.trim() }) });
      setPhase('otp'); startCooldown(); setMsg('OTP sent! Check your inbox.');
    } catch { setErr('Failed to send OTP'); } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    setErr(''); setMsg('');
    const code = otp.join('');
    if (code.length < 6) { setErr('Enter complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fpEmail.trim(), otp: code, portal }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Invalid OTP'); return; }
      setResetToken(data.reset_session_token); setPhase('newpass');
    } catch { setErr('Verification failed'); } finally { setLoading(false); }
  };

  const resetPass = async () => {
    setErr('');
    if (newPass.length < 6) { setErr('Password must be at least 6 characters'); return; }
    if (newPass !== confirm) { setErr('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset_session_token: resetToken, newPassword: newPass, portal }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Reset failed'); return; }
      setMsg('✅ Password updated! You can now log in.'); setTimeout(() => { setPhase('closed'); setOtp(['','','','','','']); }, 2500);
    } catch { setErr('Reset failed'); } finally { setLoading(false); }
  };

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const u = [...otp]; u[i] = v; setOtp(u);
    if (v && i < 5) otpRefs.current[i+1]?.focus();
  };

  if (phase === 'closed') return (
    <div className="text-right mt-1">
      <button type="button" onClick={() => setPhase('email')} className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-medium transition-colors">
        Forgot Password?
      </button>
    </div>
  );

  return (
    <div className="mt-3 border border-violet-500/30 bg-violet-500/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">
          {phase === 'email' && '🔑 Reset Password'}{phase === 'otp' && '📩 Enter OTP'}{phase === 'newpass' && '🔒 New Password'}
        </p>
        <button type="button" onClick={() => { setPhase('closed'); setOtp(['','','','','','']); setErr(''); setMsg(''); }} className="text-white/30 hover:text-white/60 text-xs">✕ Cancel</button>
      </div>
      {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
      {msg && <p className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">{msg}</p>}
      {phase === 'email' && (<>
        <input type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="Your registered email"
          className="w-full h-10 px-3 bg-white/10 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-violet-500/50" />
        <button type="button" onClick={sendOTP} disabled={loading}
          className="w-full h-9 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
          {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📨 Send OTP'}
        </button>
      </>)}
      {phase === 'otp' && (<>
        <p className="text-xs text-white/50">OTP sent to <span className="text-violet-300 font-semibold">{fpEmail}</span>. Expires in 10 min.</p>
        <div className="flex gap-2 justify-center">
          {otp.map((d, i) => (
            <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" maxLength={1} value={d}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => e.key === 'Backspace' && !otp[i] && i > 0 && otpRefs.current[i-1]?.focus()}
              className="w-10 h-12 text-center text-xl font-bold bg-white/10 border-2 border-white/20 rounded-xl text-white outline-none focus:border-violet-400 transition-all" />
          ))}
        </div>
        <button type="button" onClick={verifyOTP} disabled={loading}
          className="w-full h-9 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
          {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✅ Verify OTP'}
        </button>
        <p className="text-xs text-center text-white/40">{cooldown > 0 ? `Resend in ${cooldown}s` : <button type="button" onClick={() => setPhase('email')} className="text-violet-400 hover:underline">← Resend OTP</button>}</p>
      </>)}
      {phase === 'newpass' && (<>
        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password (min 6 chars)"
          className="w-full h-10 px-3 bg-white/10 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-violet-500/50" />
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password"
          className="w-full h-10 px-3 bg-white/10 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-violet-500/50" />
        <button type="button" onClick={resetPass} disabled={loading}
          className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
          {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔒 Update Password'}
        </button>
      </>)}
    </div>
  );
};
