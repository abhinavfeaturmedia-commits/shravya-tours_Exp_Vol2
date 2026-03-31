import React, { useState } from 'react';
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
                        <img src="/logo.png" alt="Shravya Tours Logo" className="h-full object-contain" />
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
                        <img src="/logo.png" alt="Shravya Tours Logo" className="h-full object-contain" />
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
                        </div>

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
                        <div className="pt-2 flex justify-center">
                            <a
                                href="/"
                                className="text-slate-400 hover:text-primary text-sm font-medium flex items-center gap-2 transition-colors no-underline"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Back to Homepage
                            </a>
                        </div>
                    </form>
                </div>

                {/* Bottom watermark */}
                <p className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-slate-300 dark:text-slate-700 tracking-widest uppercase font-light">
                    © 2025 Shravya Tours · All rights reserved
                </p>
            </div>
        </div>
    );
};
