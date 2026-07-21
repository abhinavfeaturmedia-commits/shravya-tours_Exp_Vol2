import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const PartnerRegister: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', companyName: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [showTermsPreview, setShowTermsPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!termsChecked) { setError('You must read and agree to the SHRAWELLO Travel Associate Policy to register.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/partner/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          phone: form.phone, companyName: form.companyName, location: form.location,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
        {/* Dynamic Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl relative z-10">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
            <span className="material-symbols-outlined text-white text-[32px]">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Registration Submitted!</h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            Your Travel Associate account request has been sent to SHRAWELLO admin. You'll be notified via email once your account is approved. Once approved, you'll be asked to formally accept the Travel Associate Policy on your first login.
          </p>
          <Link to="/partner/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">login</span>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-10 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-500/30 mb-5">
            <span className="material-symbols-outlined text-white text-[32px]">handshake</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Become a Travel Associate</h1>
          <p className="text-white/50 mt-2 text-sm font-medium">Earn commissions by referring customers to SHRAWELLO</p>
        </div>

        {/* Commission Info */}
        <div className="bg-gradient-to-r from-violet-600/15 to-purple-600/15 border border-violet-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-violet-400 text-[20px] shrink-0 mt-0.5">info</span>
          <p className="text-sm text-white/70">
            As a <strong className="text-violet-300">SHRAWELLO Travel Associate</strong>, you earn commissions on every booking you refer. Commissions are calculated based on booking type and your assigned rate, approved by the admin after review.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Full Name *</label>
                <input name="name" type="text" required value={form.name} onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Company / Agency Name</label>
                <input name="companyName" type="text" value={form.companyName} onChange={handleChange}
                  placeholder="Your agency name"
                  className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Email Address *</label>
                <input name="email" type="email" required value={form.email} onChange={handleChange}
                  placeholder="partner@email.com"
                  className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Phone Number</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                  placeholder="+91 9XXXXXXXXX"
                  className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Location / City</label>
              <input name="location" type="text" value={form.location} onChange={handleChange}
                placeholder="Mumbai, Maharashtra"
                className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Password *</label>
                <div className="relative">
                  <input name="password" type={showPass ? 'text' : 'password'} required value={form.password} onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 pr-10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    <span className="material-symbols-outlined text-[18px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Confirm Password *</label>
                <input name="confirmPassword" type={showPass ? 'text' : 'password'} required value={form.confirmPassword} onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={e => setTermsChecked(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
                    ${termsChecked ? 'bg-violet-600 border-violet-600' : 'border-white/30 group-hover:border-violet-400'}`}>
                    {termsChecked && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                  </div>
                </div>
                <span className="text-xs text-white/70 leading-relaxed">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsPreview(true)}
                    className="text-violet-400 hover:text-violet-300 underline font-semibold transition-colors"
                  >
                    SHRAWELLO Travel Associate Policy & Terms
                  </button>.
                  {' '}A full policy acceptance will be required on your first login after admin approval.
                </span>
              </label>
            </div>

            <button type="submit" id="partner-register-btn" disabled={loading || !termsChecked}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-3">
              {loading ? (
                <><div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering…</>
              ) : (
                <><span className="material-symbols-outlined text-[20px]">how_to_reg</span>Register as Travel Associate</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              Already have a Travel Associate account?{' '}
              <Link to="/partner/login" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">Sign In</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms Preview Modal */}
      {showTermsPreview && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">SHRAWELLO Travel Hub & Events LLP</p>
                <h3 className="text-base font-black text-white">Travel Associate Policy & Terms</h3>
              </div>
              <button onClick={() => setShowTermsPreview(false)} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-white/70 space-y-4 leading-relaxed">
              <p><strong className="text-white">About SHRAWELLO:</strong> SHRAWELLO Travel Hub & Events LLP provides tours, travel, transport, corporate travel, hotel, flight, rail and event services across India.</p>
              <p><strong className="text-white">Travel Associate:</strong> An independent referral associate — not an employee, partner, franchisee or agent.</p>
              <p><strong className="text-white">Eligibility:</strong> Age 18+, valid Aadhar & PAN, bank account, mandatory policy acceptance.</p>
              <p><strong className="text-white">Commissions:</strong> Tour Package 3% · Cab ₹100 · Bus ₹50 · Train ₹50 · Flight ₹100. Payable within 7 working days of travel completion.</p>
              <p><strong className="text-white">Customer Ownership:</strong> All referred customers belong to SHRAWELLO. Associates cannot divert or solicit customers for 12 months post-termination.</p>
              <p><strong className="text-white">Confidentiality:</strong> All business information is strictly confidential. Breaches may result in legal action.</p>
              <p><strong className="text-white">Termination:</strong> SHRAWELLO may terminate for fraud, misconduct, misrepresentation or policy violations.</p>
              <p className="text-[11px] text-white/40">Full policy will be shown again on your first login for formal acceptance.</p>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-white/10">
              <button onClick={() => { setTermsChecked(true); setShowTermsPreview(false); }}
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined text-[18px]">check</span>
                I have read — Mark as agreed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
