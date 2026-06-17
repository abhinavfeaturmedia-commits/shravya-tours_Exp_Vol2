import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

type Step = 1 | 2;

export const CustomerRegister: React.FC = () => {
  const { register, login } = useCustomerAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', whatsapp: '', password: '', confirmPassword: '',
  });
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'phone' && sameAsPhone) updated.whatsapp = value;
      return updated;
    });
  };

  const validateStep1 = () => {
    if (!form.name.trim()) { setError('Please enter your full name.'); return false; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email.'); return false; }
    if (!form.phone.trim() || form.phone.length < 10) { setError('Please enter a valid phone number.'); return false; }
    return true;
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await register({
        name: form.name, email: form.email.trim(), phone: form.phone,
        whatsapp: sameAsPhone ? form.phone : form.whatsapp,
        password: form.password,
      });
      // Auto-login after registration
      try {
        await login(form.email.trim(), form.password);
        navigate('/my-account', { replace: true });
      } catch {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#FBF7F0' }}>
        <div className="w-full max-w-md text-center reveal">
          {/* Success icon */}
          <div className="inline-flex items-center justify-center size-20 rounded-3xl mb-6 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)' }}>
            <span className="material-symbols-outlined text-white text-[40px]">check_circle</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Account Created! 🎉
          </h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Welcome to Shrawello! Your account has been created. Sign in to start exploring amazing travel experiences.
          </p>
          <Link to="/customer/login"
            className="inline-flex items-center gap-2 font-bold rounded-2xl px-8 py-4 transition-all"
            style={{ background: 'linear-gradient(135deg, #C9732A, #E8935B)', color: '#fff', boxShadow: '0 8px 24px rgba(201,115,42,0.3)' }}>
            <span className="material-symbols-outlined text-[20px]">login</span>
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    height: '52px',
    background: '#FFFFFF',
    border: '1.5px solid #EDE8DF',
    color: '#1E293B',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    borderRadius: '16px',
    paddingLeft: '48px',
    paddingRight: '16px',
    width: '100%',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#C9732A';
    e.target.style.boxShadow = '0 0 0 3px rgba(201,115,42,0.12)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#EDE8DF';
    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#FBF7F0' }}>

      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-14"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=85&auto=format&fit=crop')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(155deg, rgba(45,106,79,0.9) 0%, rgba(13,23,16,0.8) 55%, rgba(201,115,42,0.75) 100%)' }} />

        <div className="relative z-10">
          <div className="h-12 w-auto bg-white/90 p-2 rounded-2xl shadow-lg inline-block">
            <img src="/logo.png" alt="SHRAWELLO" className="h-full object-contain" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="material-symbols-outlined text-white text-[16px]">travel_explore</span>
            <span className="text-white text-xs font-semibold tracking-wider uppercase">Join 50,000+ Travelers</span>
          </div>

          <h1 className="text-white font-bold text-5xl xl:text-[52px] leading-[1.1] mb-6 drop-shadow-xl"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            Your Next<br />
            <span style={{ color: '#F4B88A' }}>Adventure</span><br />
            Awaits You.
          </h1>
          <p className="text-white/70 text-sm font-light leading-relaxed mb-10 max-w-xs">
            Create your free account and unlock exclusive deals, trip tracking, and personalized travel experiences.
          </p>

          {/* Feature list */}
          {[
            { icon: 'confirmation_number', text: 'Track all your bookings in one place' },
            { icon: 'savings', text: 'Exclusive member-only discounts' },
            { icon: 'notifications_active', text: 'Real-time trip updates & alerts' },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-3 mb-3">
              <div className="size-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(244,184,138,0.2)', border: '1px solid rgba(244,184,138,0.3)' }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: '#F4B88A' }}>{item.icon}</span>
              </div>
              <span className="text-white/75 text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16 xl:px-20 py-12 relative overflow-hidden">

        {/* Ambient */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C9732A 0%, transparent 70%)' }} />

        {/* Mobile top bar */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #2D6A4F, #C9732A, #E8935B)' }} />

        {/* Mobile logo */}
        <div className="lg:hidden mb-6 mt-4">
          <img src="/logo.png" alt="SHRAWELLO" className="h-10 object-contain" />
        </div>

        <div className="w-full max-w-md reveal">

          {/* Header */}
          <div className="mb-7">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl mb-5 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)' }}>
              <span className="material-symbols-outlined text-white text-[28px]">person_add</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
              Create Account<span style={{ color: '#C9732A' }}>.</span>
            </h1>
            <p className="text-slate-500 text-sm font-light">
              Join thousands of happy travelers on Shrawello.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {([1, 2] as const).map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div
                    className="size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: step >= s ? 'linear-gradient(135deg, #C9732A, #E8935B)' : '#EDE8DF',
                      color: step >= s ? '#fff' : '#94A3B8',
                    }}
                  >
                    {step > s ? <span className="material-symbols-outlined text-[14px]">check</span> : s}
                  </div>
                  <span className="text-xs font-medium" style={{ color: step >= s ? '#C9732A' : '#94A3B8' }}>
                    {s === 1 ? 'Your Info' : 'Set Password'}
                  </span>
                </div>
                {s < 2 && <div className="flex-1 h-px" style={{ background: step > s ? '#C9732A' : '#EDE8DF' }} />}
              </React.Fragment>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl text-sm border"
              style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Full Name *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>person</span>
                  <input name="name" type="text" required value={form.name} onChange={handleChange}
                    placeholder="Rahul Sharma" autoFocus style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Email Address *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>mail</span>
                  <input name="email" type="email" required value={form.email} onChange={handleChange}
                    placeholder="you@example.com" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Phone Number *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>call</span>
                  <input name="phone" type="tel" required value={form.phone} onChange={handleChange}
                    placeholder="+91 9XXXXXXXXX" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
                    WhatsApp Number
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <div
                      onClick={() => {
                        setSameAsPhone(!sameAsPhone);
                        if (!sameAsPhone) setForm(prev => ({ ...prev, whatsapp: prev.phone }));
                      }}
                      className="relative inline-flex items-center cursor-pointer"
                    >
                      <input type="checkbox" checked={sameAsPhone} onChange={() => {}} className="sr-only" />
                      <div
                        className="w-9 h-5 rounded-full transition-all relative"
                        style={{ background: sameAsPhone ? '#C9732A' : '#E2E8F0' }}
                      >
                        <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${sameAsPhone ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>Same as phone</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>
                    chat
                  </span>
                  <input name="whatsapp" type="tel" value={sameAsPhone ? form.phone : form.whatsapp} onChange={handleChange}
                    disabled={sameAsPhone}
                    placeholder="+91 9XXXXXXXXX"
                    style={{ ...inputStyle, opacity: sameAsPhone ? 0.6 : 1, cursor: sameAsPhone ? 'not-allowed' : 'text' }}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                </div>
              </div>

              {/* Next button */}
              <button type="submit"
                className="w-full font-bold rounded-2xl flex items-center justify-center gap-2 transition-all btn-glow mt-2"
                style={{ height: '52px', background: 'linear-gradient(135deg, #C9732A 0%, #E8935B 100%)', color: '#fff', boxShadow: '0 8px 24px rgba(201,115,42,0.3)', fontSize: '15px' }}>
                Continue
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Summary card */}
              <div className="flex items-center gap-3 p-4 rounded-2xl mb-1" style={{ background: '#FFF8F2', border: '1px solid #F4D5B5' }}>
                <div className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #C9732A, #E8935B)' }}>
                  {form.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">{form.name}</p>
                  <p className="text-xs text-slate-400">{form.email}</p>
                </div>
                <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs font-medium"
                  style={{ color: '#C9732A' }}>
                  Edit
                </button>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Create Password *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>lock</span>
                  <input name="password" type={showPass ? 'text' : 'password'} required value={form.password}
                    onChange={handleChange} placeholder="Min. 6 characters" autoFocus
                    style={{ ...inputStyle, paddingRight: '48px' }} onFocus={handleFocus} onBlur={handleBlur} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: '#C4B5A0' }}>
                    <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: '#C4B5A0' }}>lock_clock</span>
                  <input name="confirmPassword" type={showPass ? 'text' : 'password'} required value={form.confirmPassword}
                    onChange={handleChange} placeholder="Repeat password"
                    style={{ ...inputStyle, borderColor: form.confirmPassword && form.confirmPassword !== form.password ? '#FCA5A5' : '#EDE8DF' }}
                    onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>Passwords don't match</p>
                )}
              </div>

              {/* Password strength */}
              {form.password.length > 0 && (
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{
                        background: form.password.length >= i * 2
                          ? i <= 1 ? '#EF4444' : i <= 2 ? '#F59E0B' : i <= 3 ? '#10B981' : '#2D6A4F'
                          : '#EDE8DF'
                      }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: form.password.length < 6 ? '#EF4444' : '#10B981' }}>
                    {form.password.length < 6 ? 'Too short' : form.password.length < 8 ? 'Fair' : form.password.length < 10 ? 'Good' : 'Strong'}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setError(''); setStep(1); }}
                  className="flex items-center gap-1 font-medium rounded-2xl px-5 transition-all"
                  style={{ height: '52px', background: '#FFF', border: '1.5px solid #EDE8DF', color: '#64748B', fontSize: '14px' }}>
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back
                </button>
                <button id="customer-register-submit" type="submit" disabled={loading}
                  className="flex-1 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all btn-glow disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ height: '52px', background: 'linear-gradient(135deg, #C9732A 0%, #E8935B 100%)', color: '#fff', boxShadow: '0 8px 24px rgba(201,115,42,0.3)', fontSize: '15px' }}>
                  {loading ? (
                    <><span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[20px]">how_to_reg</span>Create Account</>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sign in link */}
          <p className="text-center text-sm mt-6" style={{ color: '#94A3B8' }}>
            Already have an account?{' '}
            <Link to="/customer/login" className="font-bold transition-colors" style={{ color: '#C9732A' }}>
              Sign In
            </Link>
          </p>

          <p className="text-center text-[11px] mt-4 font-light" style={{ color: '#C4B5A0' }}>
            By registering, you agree to our{' '}
            <Link to="/terms" className="underline" style={{ color: '#C9732A' }}>Terms</Link> and{' '}
            <Link to="/privacy" className="underline" style={{ color: '#C9732A' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
