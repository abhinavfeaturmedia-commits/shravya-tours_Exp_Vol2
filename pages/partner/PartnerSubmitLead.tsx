import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const PartnerSubmitLead: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', location: '', destination: '',
    startDate: '', endDate: '', travelers: '2 Adults', budget: '',
    type: 'Tour', potentialValue: '', preferences: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.phone || !form.destination) {
      setError('Customer name, phone, and destination are required.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('shrawello_partner_jwt');
      const res = await fetch(`${API_BASE}/api/partner/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit lead');
      navigate('/partner/leads');
    } catch (err: any) {
      setError(err.message || 'Failed to submit lead');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all";
  const selectClass = "w-full h-11 bg-slate-800 border border-white/15 rounded-xl px-4 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Submit New Lead</h1>
        <p className="text-white/50 text-sm mt-1">Enter your customer's travel details and we'll follow up to convert the booking</p>
      </div>

      {/* Commission reminder */}
      <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
        <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5">payments</span>
        <p className="text-sm text-white/70">
          You'll earn your commission once this customer's booking is <strong className="text-emerald-300">completed and payment is verified</strong>. Commission will appear in your Earnings page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <p>{error}</p>
          </div>
        )}

        {/* Customer Info */}
        <div>
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-400 text-[18px]">person</span>
            Customer Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Customer Name *</label>
              <input name="name" type="text" required value={form.name} onChange={handleChange} placeholder="Full name" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Phone Number *</label>
              <input name="phone" type="tel" required value={form.phone} onChange={handleChange} placeholder="+91 9XXXXXXXXX" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="customer@email.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Customer Location</label>
              <input name="location" type="text" value={form.location} onChange={handleChange} placeholder="City, State" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Travel Details */}
        <div>
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-400 text-[18px]">travel_explore</span>
            Travel Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Destination *</label>
              <input name="destination" type="text" required value={form.destination} onChange={handleChange} placeholder="e.g. Goa, Kerala, Manali" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Start Date</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">End Date</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Travelers</label>
              <input name="travelers" type="text" value={form.travelers} onChange={handleChange} placeholder="e.g. 2 Adults, 1 Child" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Trip Type</label>
              <select name="type" value={form.type} onChange={handleChange} className={selectClass}>
                <option>Tour</option><option>Hotel</option><option>Car</option><option>Bus</option><option>Flight</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Budget (₹)</label>
              <input name="budget" type="text" value={form.budget} onChange={handleChange} placeholder="e.g. 50,000 – 80,000" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Potential Value (₹)</label>
              <input name="potentialValue" type="number" value={form.potentialValue} onChange={handleChange} placeholder="Estimated booking amount" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wide">Special Preferences / Notes</label>
              <textarea name="preferences" value={form.preferences} onChange={handleChange as any} rows={3} placeholder="Accommodation preferences, dietary requirements, special requests..."
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => navigate('/partner/leads')}
            className="flex-1 h-11 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-sm transition-all border border-white/15">
            Cancel
          </button>
          <button type="submit" id="submit-lead-btn" disabled={loading}
            className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60">
            {loading ? (
              <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">send</span>Submit Lead</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
