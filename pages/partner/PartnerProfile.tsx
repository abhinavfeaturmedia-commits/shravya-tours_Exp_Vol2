import React, { useState } from 'react';
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
      upiId: partner.bankDetails?.upiId || '',
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
          bankDetails: { accountName: form.bankAccountName, accountNumber: form.bankAccountNumber, bankName: form.bankName, ifsc: form.ifsc, upiId: form.upiId },
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
              { label: 'Commission Rate', value: partner.commissionType === 'Percentage' ? `${partner.commissionValue}% per booking` : `₹${partner.commissionValue} flat per booking`, icon: 'percent' },
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
