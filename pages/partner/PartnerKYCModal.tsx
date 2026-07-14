import React, { useState, useRef } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

interface PartnerKYCModalProps {
  onComplete?: () => void;
}

export const PartnerKYCModal: React.FC<PartnerKYCModalProps> = ({ onComplete }) => {
  const { partner, refreshPartner } = usePartnerAuth() as any;

  const kycStatus = partner?.kyc_status || 'Pending';
  const bankComplete = partner?.bank_complete || false;

  const needsKYC = kycStatus !== 'Verified' || !bankComplete;
  if (!needsKYC) return null;

  return <KYCWizard partner={partner} onComplete={async () => { await refreshPartner?.(); onComplete?.(); }} />;
};

const STEPS = ['Bank Details', 'PAN Card', 'Aadhaar Card', 'Other Documents'];

const KYCWizard: React.FC<{ partner: any; onComplete: () => void }> = ({ partner, onComplete }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Bank details
  const [bank, setBank] = useState({
    accountName: partner?.bank_details?.accountName || '',
    accountNumber: partner?.bank_details?.accountNumber || '',
    bankName: partner?.bank_details?.bankName || '',
    ifsc: partner?.bank_details?.ifsc || '',
    upi: partner?.bank_details?.upi || '',
  });

  // KYC fields
  const [panNumber, setPanNumber] = useState(partner?.kyc_pan_number || '');
  const [panFront, setPanFront] = useState<File | null>(null);
  const [panBack, setPanBack] = useState<File | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState(partner?.kyc_aadhaar_number || '');
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [passport, setPassport] = useState<File | null>(null);
  const [dl, setDl] = useState<File | null>(null);

  const token = localStorage.getItem('shrawello_partner_jwt');

  const saveBankDetails = async () => {
    if (!bank.accountName || !bank.accountNumber || !bank.bankName || !bank.ifsc) {
      setError('Account Name, Account Number, Bank Name, and IFSC are required'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/partner/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bankDetails: bank }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setStep(1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const submitKYC = async () => {
    if (!panNumber || !panFront || !panBack) { setError('PAN number and both PAN photos are required'); return; }
    if (!aadhaarNumber || !aadhaarFront || !aadhaarBack) { setError('Aadhaar number and both Aadhaar photos are required'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('panNumber', panNumber);
      fd.append('aadhaarNumber', aadhaarNumber);
      fd.append('pan_front', panFront);
      fd.append('pan_back', panBack);
      fd.append('aadhaar_front', aadhaarFront);
      fd.append('aadhaar_back', aadhaarBack);
      if (passport) fd.append('passport', passport);
      if (dl) fd.append('driving_licence', dl);

      const res = await fetch('/api/partner/kyc/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'KYC upload failed');
      setSuccess(true);
      await onComplete();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const kycStatus = partner?.kyc_status;

  // Already submitted - show awaiting state
  if (kycStatus === 'Submitted') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-violet-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="size-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-amber-400 text-3xl">hourglass_top</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">KYC Under Review</h2>
          <p className="text-white/60 text-sm mb-4">Your documents have been submitted. Our team will verify them within 1–2 business days. You'll receive an email once verified.</p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <p className="text-amber-300 text-xs font-semibold">⏳ Pending Verification</p>
          </div>
          <p className="text-white/30 text-xs mt-4">Contact support: hello@shrawello.com</p>
        </div>
      </div>
    );
  }

  // Rejected - show rejection reason + resubmit
  if (kycStatus === 'Rejected') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="size-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-400 text-3xl">cancel</span>
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-2">KYC Rejected</h2>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-300 text-sm font-semibold">Reason:</p>
            <p className="text-red-200 text-sm mt-1">{partner?.kyc_rejection_reason || 'Documents could not be verified'}</p>
          </div>
          <p className="text-white/60 text-sm mb-4 text-center">Please resubmit with clear, high-resolution photos of all required documents.</p>
          <button onClick={() => window.location.reload()} className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors">
            Resubmit KYC Documents
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="size-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">KYC Submitted!</h2>
          <p className="text-white/60 text-sm">Your documents are under review. You'll be notified once verified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-white text-2xl">verified_user</span>
            <div>
              <h2 className="text-lg font-bold text-white">Complete Your KYC Verification</h2>
              <p className="text-violet-200 text-xs">Required to activate your partner account</p>
            </div>
          </div>
          {/* Progress Steps */}
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-white' : 'bg-white/20'}`} />
                <p className={`text-[9px] mt-1 font-medium truncate ${i <= step ? 'text-white' : 'text-white/40'}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-red-400 text-lg shrink-0">error</span>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Step 0: Bank Details */}
          {step === 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">🏦 Bank Details</h3>
              <p className="text-white/50 text-xs">Required for commission payouts. All fields except UPI are mandatory.</p>
              {[
                { label: 'Account Holder Name*', key: 'accountName', placeholder: 'As per bank records' },
                { label: 'Account Number*', key: 'accountNumber', placeholder: 'Bank account number' },
                { label: 'Bank Name*', key: 'bankName', placeholder: 'e.g., HDFC Bank' },
                { label: 'IFSC Code*', key: 'ifsc', placeholder: 'e.g., HDFC0001234' },
                { label: 'UPI ID (optional)', key: 'upi', placeholder: 'name@upi' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-white/60 mb-1 block">{f.label}</label>
                  <input value={(bank as any)[f.key]} onChange={e => setBank(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
              ))}
              <button onClick={saveBankDetails} disabled={loading}
                className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Save & Continue <span className="material-symbols-outlined text-lg">arrow_forward</span></>}
              </button>
            </div>
          )}

          {/* Step 1: PAN Card */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">🪪 PAN Card <span className="text-red-400 text-xs">*Mandatory</span></h3>
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1 block">PAN Number*</label>
                <input value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F" maxLength={10}
                  className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/50 font-mono tracking-widest uppercase" />
              </div>
              <FileUploadBox label="PAN Card — Front Side*" file={panFront} onChange={setPanFront} />
              <FileUploadBox label="PAN Card — Back Side*" file={panBack} onChange={setPanBack} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 h-11 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/5 transition-colors">← Back</button>
                <button onClick={() => { if (!panNumber || !panFront || !panBack) { setError('All PAN fields are required'); return; } setError(''); setStep(2); }}
                  className="flex-1 h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Aadhaar */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">🪪 Aadhaar Card <span className="text-red-400 text-xs">*Mandatory</span></h3>
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1 block">Aadhaar Number* (last 4 digits stored)</label>
                <input value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="XXXX XXXX XXXX" maxLength={12}
                  className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/50 font-mono tracking-widest" />
              </div>
              <FileUploadBox label="Aadhaar Card — Front Side*" file={aadhaarFront} onChange={setAadhaarFront} />
              <FileUploadBox label="Aadhaar Card — Back Side*" file={aadhaarBack} onChange={setAadhaarBack} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 h-11 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/5 transition-colors">← Back</button>
                <button onClick={() => { if (!aadhaarNumber || !aadhaarFront || !aadhaarBack) { setError('All Aadhaar fields are required'); return; } setError(''); setStep(3); }}
                  className="flex-1 h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Optional Documents */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">📋 Other Documents <span className="text-white/40 text-xs">(Optional)</span></h3>
              <p className="text-white/50 text-xs">Upload Passport or Driving Licence for stronger verification. You can skip this step.</p>
              <FileUploadBox label="Passport (optional)" file={passport} onChange={setPassport} />
              <FileUploadBox label="Driving Licence (optional)" file={dl} onChange={setDl} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="flex-1 h-11 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/5 transition-colors">← Back</button>
                <button onClick={submitKYC} disabled={loading}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✅ Submit KYC'}
                </button>
              </div>
              <button onClick={submitKYC} disabled={loading} className="w-full text-white/40 hover:text-white/60 text-xs py-2 transition-colors">
                Skip optional docs & submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FileUploadBox: React.FC<{ label: string; file: File | null; onChange: (f: File) => void }> = ({ label, file, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="text-xs font-semibold text-white/60 mb-1 block">{label}</label>
      <div onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/15 hover:border-violet-500/50 bg-white/3'}`}>
        <span className={`material-symbols-outlined text-2xl ${file ? 'text-emerald-400' : 'text-white/30'}`}>
          {file ? 'check_circle' : 'upload_file'}
        </span>
        <div className="flex-1 min-w-0">
          {file ? (
            <p className="text-emerald-300 text-xs font-semibold truncate">{file.name}</p>
          ) : (
            <p className="text-white/40 text-xs">Click to upload (JPG, PNG, PDF — max 10MB)</p>
          )}
        </div>
        {file && <button type="button" onClick={e => { e.stopPropagation(); onChange(null as any); }} className="text-white/30 hover:text-red-400 text-xs">✕</button>}
      </div>
      <input ref={ref} type="file" accept="image/*,.pdf" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0]); }} />
    </div>
  );
};
