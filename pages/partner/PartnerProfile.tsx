import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const PartnerProfile: React.FC = () => {
  const { partner, refreshPartner } = usePartnerAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', companyName: '', location: '', bankAccountName: '', bankAccountNumber: '', bankName: '', ifsc: '', upiId: '' });
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  if (!partner) return null;

  const startEdit = () => {
    setForm({
      phone: partner.phone || '',
      companyName: partner.companyName || '',
      location: partner.location || '',
      bankAccountName: partner.bankDetails?.accountName || '',
      bankAccountNumber: partner.bankDetails?.accountNumber || '',
      bankName: partner.bankDetails?.bankName || '',
      ifsc: partner.bankDetails?.ifsc || '',
      upiId: partner.bankDetails?.upi || partner.bankDetails?.upiId || '',
    });
    setEditing(true);
    setMsg('');
    setError('');
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('shrawello_partner_jwt');
      const res = await fetch(`${API_BASE}/api/partner/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phone: form.phone,
          companyName: form.companyName,
          location: form.location,
          // F4: Unified UPI key is `upi` (consistent with KYC wizard)
          bankDetails: { accountName: form.bankAccountName, accountNumber: form.bankAccountNumber, bankName: form.bankName, ifsc: form.ifsc, upi: form.upiId },
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Update failed'); }
      await refreshPartner();
      setEditing(false);
      setMsg('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) { setError('New passwords do not match'); return; }
    if (passwordForm.newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    setPwdLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('shrawello_partner_jwt');
      const res = await fetch(`${API_BASE}/api/partner/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setMsg('Password changed successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const inputClass = "w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">My Profile</h1>
          <p className="text-white/50 text-sm mt-1">Manage your partner account details</p>
        </div>
        {!editing && (
          <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-colors">
            <span className="material-symbols-outlined text-[16px]">edit</span>Edit Profile
          </button>
        )}
      </div>

      {msg && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-xl"><span className="material-symbols-outlined text-[18px]">check_circle</span>{msg}</div>}
      {error && <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}

      {/* Profile Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {/* Avatar */}
        <div className="flex items-center gap-5 pb-5 border-b border-white/10 mb-6">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
            {partner.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{partner.name}</h2>
            <p className="text-white/50 text-sm">{partner.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${partner.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {partner.status}
              </span>
              <span className="text-[11px] text-white/40">
                Joined {new Date(partner.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Phone', value: partner.phone || '—', icon: 'phone' },
              { label: 'Company / Agency', value: partner.companyName || '—', icon: 'business' },
              { label: 'Location', value: partner.location || '—', icon: 'location_on' },
              { label: 'Base Commission Rate', value: partner.commissionType === 'Percentage' ? `${partner.commissionValue}% per booking` : `₹${partner.commissionValue} flat per booking`, icon: 'percent' },
              { label: 'Cab Commission Override', value: partner.cabCommissionType === 'Percentage' ? `${partner.cabCommissionValue}% per booking` : `₹${partner.cabCommissionValue || 300} flat per booking`, icon: 'directions_car' },
              { label: 'Bus Commission Override', value: partner.busCommissionType === 'Percentage' ? `${partner.busCommissionValue}% per booking` : `₹${partner.busCommissionValue || 150} flat per booking`, icon: 'directions_bus' },
              { label: 'Train Commission Override', value: partner.trainCommissionType === 'Percentage' ? `${partner.trainCommissionValue}% per booking` : `₹${partner.trainCommissionValue || 100} flat per booking`, icon: 'train' },
              { label: 'Flight Commission Override', value: partner.flightCommissionType === 'Percentage' ? `${partner.flightCommissionValue}% per booking` : `₹${partner.flightCommissionValue || 200} flat per booking`, icon: 'flight' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-symbols-outlined text-violet-400 text-[18px] shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm text-white font-semibold mt-0.5">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={saveProfile} className="space-y-4">
            <h3 className="text-white font-bold text-sm">Edit Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="+91..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Company Name</label>
                <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} className={inputClass} placeholder="Your company" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Location</label>
                <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="City, State" />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <h4 className="text-white/70 font-bold text-xs uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">account_balance</span>Bank / UPI Details (for payouts)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Account Holder Name</label>
                  <input type="text" value={form.bankAccountName} onChange={e => setForm(p => ({ ...p, bankAccountName: e.target.value }))} className={inputClass} placeholder="Name on account" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Account Number</label>
                  <input type="text" value={form.bankAccountNumber} onChange={e => setForm(p => ({ ...p, bankAccountNumber: e.target.value }))} className={inputClass} placeholder="Bank account number" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Bank Name</label>
                  <input type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} className={inputClass} placeholder="SBI, HDFC, etc." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">IFSC Code</label>
                  <input type="text" value={form.ifsc} onChange={e => setForm(p => ({ ...p, ifsc: e.target.value }))} className={inputClass} placeholder="SBIN0001234" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">UPI ID (Optional)</label>
                  <input type="text" value={form.upiId} onChange={e => setForm(p => ({ ...p, upiId: e.target.value }))} className={inputClass} placeholder="partner@upi" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 h-11 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-sm border border-white/15 transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                {loading ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><span className="material-symbols-outlined text-[16px]">save</span>Save Changes</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* U5: KYC Status Card */}
      {(() => {
        const ks = (partner as any).kyc_status || 'Pending';
        const kycStyles: Record<string, { bg: string; border: string; icon: string; iconColor: string; label: string; desc: string }> = {
          Pending:   { bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: 'hourglass_empty', iconColor: 'text-slate-400', label: 'KYC Pending', desc: 'You have not yet submitted your KYC documents. Complete verification to activate your account.' },
          Submitted: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'pending', iconColor: 'text-amber-400', label: 'KYC Under Review', desc: 'Your documents are under review. Our team will verify them within 1–2 business days.' },
          Verified:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'verified_user', iconColor: 'text-emerald-400', label: 'KYC Verified ✓', desc: 'Your KYC is fully verified. Commission payouts are active.' },
          Rejected:  { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'cancel', iconColor: 'text-red-400', label: 'KYC Rejected', desc: (partner as any).kyc_rejection_reason || 'Your documents were rejected. Please resubmit.' },
        };
        const s = kycStyles[ks] || kycStyles.Pending;
        return (
          <div className={`${s.bg} border ${s.border} rounded-2xl p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined ${s.iconColor} text-2xl`}>{s.icon}</span>
              <div>
                <h3 className={`font-bold text-sm ${s.iconColor}`}>{s.label}</h3>
                <p className="text-white/50 text-xs mt-0.5">{s.desc}</p>
              </div>
            </div>
            {ks !== 'Pending' && ks !== 'Submitted' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
                {(partner as any).kyc_pan_number && (
                  <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                    <span className="material-symbols-outlined text-violet-400 text-[18px] shrink-0 mt-0.5">badge</span>
                    <div>
                      <p className="text-[11px] font-bold text-white/40 uppercase tracking-wide">PAN Number</p>
                      <p className="text-sm text-white font-mono mt-0.5">{(partner as any).kyc_pan_number}</p>
                    </div>
                  </div>
                )}
                {(partner as any).kyc_aadhaar_number && (
                  <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                    <span className="material-symbols-outlined text-violet-400 text-[18px] shrink-0 mt-0.5">credit_card</span>
                    <div>
                      <p className="text-[11px] font-bold text-white/40 uppercase tracking-wide">Aadhaar (masked)</p>
                      <p className="text-sm text-white font-mono mt-0.5">{(partner as any).kyc_aadhaar_number}</p>
                    </div>
                  </div>
                )}
                {ks === 'Verified' && (partner as any).kyc_verified_at && (
                  <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <p className="text-[11px] font-bold text-white/40 uppercase tracking-wide">Verified On</p>
                      <p className="text-sm text-white mt-0.5">{new Date((partner as any).kyc_verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Policy & Agreement Shortcut Card */}
      <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-violet-300 text-2xl">gavel</span>
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Travel Associate Policy & Terms</h3>
            <p className="text-white/50 text-xs mt-0.5">
              View your accepted policy document, agreement timestamp ({ (partner as any).terms_agreed_at ? new Date((partner as any).terms_agreed_at).toLocaleDateString('en-IN') : 'Active' }), and print a copy.
            </p>
          </div>
        </div>
        <Link
          to="/partner/agreement"
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-lg shadow-violet-500/20"
        >
          View Agreement
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      {/* Change Password */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-400 text-[18px]">lock_reset</span>Change Password
        </h3>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Current Password</label>
            <input type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} className={inputClass} placeholder="Current password" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">New Password</label>
              <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm(p => ({ ...p, newPass: e.target.value }))} className={inputClass} placeholder="Min 6 characters" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
              <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className={inputClass} placeholder="Repeat new password" required />
            </div>
          </div>
          <button type="submit" disabled={pwdLoading} className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60">
            {pwdLoading ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</> : <><span className="material-symbols-outlined text-[16px]">lock</span>Update Password</>}
          </button>
        </form>
      </div>
    </div>
  );
};
