import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/admin';

    // Forgot password state
    const [fpPhase, setFpPhase] = useState<'none'|'email'|'otp'|'newpass'>('none');
    const [fpEmail, setFpEmail] = useState('');
    const [fpOtp, setFpOtp] = useState(['','','','','','']);
    const [fpResetToken, setFpResetToken] = useState('');
    const [fpNewPass, setFpNewPass] = useState('');
    const [fpConfirmPass, setFpConfirmPass] = useState('');
    const [fpLoading, setFpLoading] = useState(false);
    const [fpResendCooldown, setFpResendCooldown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement|null)[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const success = await login(email.trim(), password);
            if (success) {
                toast.success("Welcome back!");
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            toast.error(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    const startResendCooldown = () => {
        setFpResendCooldown(60);
        const timer = setInterval(() => {
            setFpResendCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
        }, 1000);
    };

    const handleSendOTP = async () => {
        if (!fpEmail.trim()) return toast.error('Enter your email address');
        setFpLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fpEmail.trim() }) });
            await res.json();
            setFpPhase('otp');
            startResendCooldown();
            toast.success('OTP sent! Check your email.');
        } catch { toast.error('Failed to send OTP'); } finally { setFpLoading(false); }
    };

    const handleVerifyOTP = async () => {
        const otp = fpOtp.join('');
        if (otp.length < 6) return toast.error('Enter the complete 6-digit OTP');
        setFpLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fpEmail.trim(), otp, portal: 'admin' }) });
            const data = await res.json();
            if (!res.ok) return toast.error(data.error || 'Invalid OTP');
            setFpResetToken(data.reset_session_token);
            setFpPhase('newpass');
        } catch { toast.error('OTP verification failed'); } finally { setFpLoading(false); }
    };

    const handleResetPassword = async () => {
        if (fpNewPass.length < 6) return toast.error('Password must be at least 6 characters');
        if (fpNewPass !== fpConfirmPass) return toast.error('Passwords do not match');
        setFpLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset_session_token: fpResetToken, newPassword: fpNewPass, portal: 'admin' }) });
            const data = await res.json();
            if (!res.ok) return toast.error(data.error || 'Password reset failed');
            toast.success('Password updated! You can now log in.');
            setFpPhase('none');
            setFpOtp(['','','','','','']);
        } catch { toast.error('Password reset failed'); } finally { setFpLoading(false); }
    };

    const handleOtpChange = (idx: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const updated = [...fpOtp]; updated[idx] = val;
        setFpOtp(updated);
        if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };
    const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !fpOtp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Left panel: atmospheric image + editorial copy ── */}
            <div
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85&auto=format&fit=crop')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/30" />

                {/* Warm amber accent stripe at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent z-10" />

                {/* Brand mark */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-12 w-auto bg-white/90 p-1.5 rounded-xl shadow-lg backdrop-blur-sm">
                        <img src="/logo.png" alt="SHRAWELLO Travel Hub Logo" className="h-full object-contain" />
                    </div>
                </div>

                {/* Editorial quote + caption */}
                <div className="relative z-10">
                    <blockquote className="font-display text-white text-4xl xl:text-5xl font-bold italic leading-[1.15] mb-6 drop-shadow-2xl">
                        "The world is a book, and those who do not travel read only one page."
                    </blockquote>
                    <p className="text-white/60 text-sm font-light tracking-widest uppercase">— Saint Augustine</p>

                    <div className="mt-10 flex items-center gap-6">
                        <div className="flex -space-x-2">
                            {['K', 'R', 'A', 'S'].map((l, i) => (
                                <div
                                    key={i}
                                    className="size-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold"
                                    style={{ background: `hsl(${20 + i * 30}, 60%, 45%)` }}
                                >
                                    {l}
                                </div>
                            ))}
                        </div>
                        <p className="text-white/70 text-sm font-light">
                            Trusted by <span className="text-white font-semibold">50,000+</span> happy travelers
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right panel: login form ── */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center bg-[#FBF7F0] dark:bg-background-dark px-6 sm:px-12 md:px-16 lg:px-20 xl:px-24 relative">

                {/* Top amber accent bar (mobile only) */}
                <div className="lg:hidden absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent" />

                {/* Mobile brand mark */}
                <div className="lg:hidden flex justify-center mb-10 pt-8">
                    <div className="h-14 w-auto drop-shadow-md">
                        <img src="/logo.png" alt="SHRAWELLO Travel Hub Logo" className="h-full object-contain" />
                    </div>
                </div>

                <div className="max-w-md w-full mx-auto reveal">
                    {/* Heading */}
                    <div className="mb-10">
                        <h1 className="font-display text-5xl font-bold text-slate-900 dark:text-white italic leading-tight mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-light text-base">
                            Sign in to your admin panel to manage tours, bookings & content.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Email Address
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-white dark:bg-white/5 border border-[#EDE8DF] dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm font-light"
                                placeholder="admin@shravyatours.com"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full h-12 pl-4 pr-12 rounded-xl bg-white dark:bg-white/5 border border-[#EDE8DF] dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm font-light"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                            {/* Forgot Password Link */}
                            <div className="text-right">
                                <button type="button" onClick={() => setFpPhase('email')} className="text-xs text-primary hover:underline font-medium">
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Inline Panel */}
                        {fpPhase !== 'none' && (
                            <div className="border border-primary/20 bg-primary/5 rounded-2xl p-5 space-y-4 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-slate-700 dark:text-white">
                                        {fpPhase === 'email' && '🔑 Reset Password'}
                                        {fpPhase === 'otp' && '📩 Enter OTP'}
                                        {fpPhase === 'newpass' && '🔒 Set New Password'}
                                    </p>
                                    <button type="button" onClick={() => { setFpPhase('none'); setFpOtp(['','','','','','']); }} className="text-slate-400 hover:text-slate-600 text-xs">✕ Cancel</button>
                                </div>

                                {fpPhase === 'email' && (
                                    <>
                                        <p className="text-xs text-slate-500">Enter your registered email. We'll send a 6-digit OTP.</p>
                                        <input type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="Your registered email" className="w-full h-10 px-4 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                                        <button type="button" onClick={handleSendOTP} disabled={fpLoading} className="w-full h-10 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                                            {fpLoading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📨 Send OTP'}
                                        </button>
                                    </>
                                )}
                                {fpPhase === 'otp' && (
                                    <>
                                        <p className="text-xs text-slate-500">OTP sent to <strong>{fpEmail}</strong>. Expires in 10 minutes.</p>
                                        <div className="flex gap-2 justify-center">
                                            {fpOtp.map((d, i) => (
                                                <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" maxLength={1} value={d}
                                                    onChange={e => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                                    className="w-10 h-12 text-center text-xl font-bold bg-white dark:bg-white/10 border-2 border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                />
                                            ))}
                                        </div>
                                        <button type="button" onClick={handleVerifyOTP} disabled={fpLoading} className="w-full h-10 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                                            {fpLoading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✅ Verify OTP'}
                                        </button>
                                        <div className="text-center">
                                            {fpResendCooldown > 0 ? (
                                                <p className="text-xs text-slate-400">Resend in {fpResendCooldown}s</p>
                                            ) : (
                                                <button type="button" onClick={() => { setFpPhase('email'); }} className="text-xs text-primary hover:underline">← Change email / Resend</button>
                                            )}
                                        </div>
                                    </>
                                )}
                                {fpPhase === 'newpass' && (
                                    <>
                                        <p className="text-xs text-slate-500">OTP verified! Set your new password.</p>
                                        <input type="password" value={fpNewPass} onChange={e => setFpNewPass(e.target.value)} placeholder="New password (min 6 chars)" className="w-full h-10 px-4 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                                        <input type="password" value={fpConfirmPass} onChange={e => setFpConfirmPass(e.target.value)} placeholder="Confirm new password" className="w-full h-10 px-4 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                                        <button type="button" onClick={handleResetPassword} disabled={fpLoading} className="w-full h-10 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                                            {fpLoading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔒 Update Password'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2"
                        >
                            {loading ? (
                                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <span className="material-symbols-outlined text-lg">arrow_forward</span></>
                            )}
                        </button>

                        <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-light">
                            Protected area — authorized personnel only.
                        </p>

                        {/* Back link */}
                        <div className="pt-2 flex flex-col items-center gap-2">
                            <a
                                href="/"
                                className="text-slate-400 hover:text-primary text-sm font-medium flex items-center gap-2 transition-colors no-underline"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Back to Homepage
                            </a>
                            <a
                                href="#/partner/login"
                                className="text-slate-400 hover:text-violet-500 text-xs font-medium flex items-center gap-2 transition-colors mt-2"
                            >
                                Travel Associate Portal →
                            </a>
                        </div>
                    </form>
                </div>

                {/* Bottom watermark */}
                <p className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-slate-300 dark:text-slate-700 tracking-widest uppercase font-light">
                    © 2025 SHRAWELLO Travel Hub · All rights reserved
                </p>
            </div>
        </div>
    );
};
