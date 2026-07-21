import React, { useState, useRef } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

interface PartnerKYCModalProps {
  onComplete?: () => void;
}

export const PartnerKYCModal: React.FC<PartnerKYCModalProps> = ({ onComplete }) => {
  const { partner, refreshPartner } = usePartnerAuth() as any;

  const kycStatus = partner?.kyc_status || 'Pending';
  const bankComplete = partner?.bank_complete || false;

  // Only block if not yet verified or bank is incomplete
  const needsKYC = kycStatus !== 'Verified' || !bankComplete;
  if (!needsKYC) return null;

  return (
    <KYCWizard
      partner={partner}
      onComplete={async () => { await refreshPartner?.(); onComplete?.(); }}
    />
  );
};

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = ['Bank Details', 'PAN Card', 'Aadhaar Card', 'Other Documents'];

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const KYCWizard: React.FC<{ partner: any; onComplete: () => void }> = ({ partner, onComplete }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // F3: Use camelCase mapped key `bankDetails` (from PartnerAuthContext mapPartner)
  const [bank, setBank] = useState({
    accountName: partner?.bankDetails?.accountName || '',
    accountNumber: partner?.bankDetails?.accountNumber || '',
    bankName: partner?.bankDetails?.bankName || '',
    ifsc: partner?.bankDetails?.ifsc || '',
    upi: partner?.bankDetails?.upi || '',  // F4: unified key is `upi`
  });

  // KYC fields — pre-populate if already submitted before
  const [panNumber, setPanNumber] = useState(partner?.kyc_pan_number || '');
  const [panFront, setPanFront] = useState<File | null>(null);
  const [panBack, setPanBack] = useState<File | null>(null);
  // U3: Aadhaar display input (12 digits raw), masked display shown separately
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [passport, setPassport] = useState<File | null>(null);
  const [dl, setDl] = useState<File | null>(null);

  // U4: Dismiss flag — allow partner to use portal while KYC is under Submitted review
  const [dismissed, setDismissed] = useState(false);

  const token = localStorage.getItem('shrawello_partner_jwt');
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const kycStatus = partner?.kyc_status;

  // ── Already dismissed (Submitted state user dismissed) ──────────────────────
  if (dismissed) return null;

  // ── Already submitted — show awaiting state with dismiss option ─────────────
  if (kycStatus === 'Submitted') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-violet-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="size-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-amber-400 text-3xl">hourglass_top</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">KYC Under Review</h2>
          <p className="text-white/60 text-sm mb-4">
            Your documents have been submitted. Our team will verify them within 1–2 business days. You'll receive an email once verified.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-amber-300 text-xs font-semibold">⏳ Pending Verification</p>
          </div>
          {/* U4: Allow partner to dismiss and browse limited portal while awaiting */}
          <button
            onClick={() => setDismissed(true)}
            className="w-full h-10 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white rounded-xl font-semibold text-sm transition-colors border border-white/15 mt-2"
          >
            Browse Portal (Limited Access)
          </button>
          <p className="text-white/30 text-xs mt-4">Contact support: hello@shrawello.com</p>
        </div>
      </div>
    );
  }

  // ── Rejected — show rejection reason + resubmit button ──────────────────────
  // F1+F2: Call /api/partner/kyc/reset then show wizard (not page reload)
  if (kycStatus === 'Rejected') {
    const handleResubmit = async () => {
      setResetLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/partner/kyc/reset`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset KYC');
        // Refresh partner data so kycStatus becomes 'Pending' and wizard renders
        await (window as any).__partnerRefresh?.();
        window.location.reload(); // safe reload after reset to get fresh partner state
      } catch (e: any) {
        setError(e.message);
      } finally {
        setResetLoading(false);
      }
    };

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
          <p className="text-white/60 text-sm mb-4 text-center">
            Please resubmit with clear, high-resolution photos of all required documents.
          </p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 mb-3 text-red-300 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleResubmit}
            disabled={resetLoading}
            className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {resetLoading
              ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><span className="material-symbols-outlined text-lg">refresh</span>Resubmit KYC Documents</>
            }
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="size-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">KYC Submitted!</h2>
          <p className="text-white/60 text-sm mb-4">Your documents are under review. You'll be notified once verified.</p>
          <button
            onClick={() => setDismissed(true)}
            className="w-full h-10 bg-white/10 hover:bg-white/15 text-white/70 rounded-xl font-semibold text-sm transition-colors border border-white/15"
          >
            Browse Portal (Limited Access)
          </button>
        </div>
      </div>
    );
  }

  // ─── Step handlers ──────────────────────────────────────────────────────────
  const saveBankDetails = async () => {
    if (!bank.accountName || !bank.accountNumber || !bank.bankName || !bank.ifsc) {
      setError('Account Name, Account Number, Bank Name, and IFSC are required'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/partner/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // F4: send unified key `upi`
        body: JSON.stringify({ bankDetails: bank }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setStep(1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const validateAndGoStep2 = () => {
    // U2: PAN format validation client-side
    if (!panNumber) { setError('PAN number is required'); return; }
    if (!PAN_REGEX.test(panNumber.toUpperCase())) { setError('Invalid PAN format. Expected: ABCDE1234F (5 letters, 4 digits, 1 letter)'); return; }
    if (!panFront || !panBack) { setError('Both PAN card photos (front & back) are required'); return; }
    setError(''); setStep(2);
  };

  const validateAndGoStep3 = () => {
    if (!aadhaarRaw || aadhaarRaw.length < 12) { setError('Aadhaar number must be 12 digits'); return; }
    if (!aadhaarFront || !aadhaarBack) { setError('Both Aadhaar card photos (front & back) are required'); return; }
    setError(''); setStep(3);
  };

  const submitKYC = async () => {
    if (!panNumber || !PAN_REGEX.test(panNumber) || !panFront || !panBack) { setError('PAN number and both PAN photos are required'); return; }
    if (aadhaarRaw.length < 12 || !aadhaarFront || !aadhaarBack) { setError('Aadhaar number and both Aadhaar photos are required'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('panNumber', panNumber.toUpperCase());
      fd.append('aadhaarNumber', aadhaarRaw);
      fd.append('pan_front', panFront);
      fd.append('pan_back', panBack);
      fd.append('aadhaar_front', aadhaarFront);
      fd.append('aadhaar_back', aadhaarBack);
      if (passport) fd.append('passport', passport);
      if (dl) fd.append('driving_licence', dl);

      const res = await fetch(`${API_BASE}/api/partner/kyc/upload`, {
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

  // ─── Aadhaar formatted display (U3) ────────────────────────────────────────
  const formatAadhaar = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  };

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

          {/* ── Step 0: Bank Details ─────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">🏦 Bank Details</h3>
              <p className="text-white/50 text-xs">Required for commission payouts. UPI is optional.</p>
              {[
                { label: 'Account Holder Name*', key: 'accountName', placeholder: 'As per bank records' },
                { label: 'Account Number*', key: 'accountNumber', placeholder: 'Bank account number' },
                { label: 'Bank Name*', key: 'bankName', placeholder: 'e.g., HDFC Bank' },
                { label: 'IFSC Code*', key: 'ifsc', placeholder: 'e.g., HDFC0001234' },
                { label: 'UPI ID (optional)', key: 'upi', placeholder: 'name@upi' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-white/60 mb-1 block">{f.label}</label>
                  <input
                    value={(bank as any)[f.key]}
                    onChange={e => setBank(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              ))}
              <button
                onClick={saveBankDetails}
                disabled={loading}
                className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>Save & Continue <span className="material-symbols-outlined text-lg">arrow_forward</span></>
                }
              </button>
            </div>
          )}

          {/* ── Step 1: PAN Card ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">🪪 PAN Card <span className="text-red-400 text-xs">*Mandatory</span></h3>
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1 block">PAN Number* (Format: ABCDE1234F)</label>
                <input
                  value={panNumber}
                  onChange={e => { setPanNumber(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={`w-full h-10 px-3 bg-white/5 border rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/50 font-mono tracking-widest uppercase transition-colors ${panNumber && !PAN_REGEX.test(panNumber) ? 'border-red-500/60' : 'border-white/10'}`}
                />
                {/* U2: Live PAN format feedback */}
                {panNumber && !PAN_REGEX.test(panNumber) && (
                  <p className="text-red-400 text-[11px] mt-1">⚠ Invalid PAN format. Expected: ABCDE1234F</p>
                )}
                {panNumber && PAN_REGEX.test(panNumber) && (
                  <p className="text-emerald-400 text-[11px] mt-1">✓ Valid PAN format</p>
                )}
              </div>
              <FileUploadBox label="PAN Card — Front Side*" file={panFront} onChange={setPanFront} />
              <FileUploadBox label="PAN Card — Back Side*" file={panBack} onChange={setPanBack} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep(0); setError(''); }} className="flex-1 h-11 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/5 transition-colors">← Back</button>
                <button onClick={validateAndGoStep2} className="flex-1 h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors">Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Aadhaar ──────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">🪪 Aadhaar Card <span className="text-red-400 text-xs">*Mandatory</span></h3>
              <div>
                {/* U3: Formatted Aadhaar input with masking display and clarified label */}
                <label className="text-xs font-semibold text-white/60 mb-1 block">Aadhaar Number* (12 digits — only last 4 will be stored)</label>
                <input
                  value={formatAadhaar(aadhaarRaw)}
                  onChange={e => { setAadhaarRaw(e.target.value.replace(/\D/g, '').slice(0, 12)); setError(''); }}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                  className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/50 font-mono tracking-widest"
                />
                {aadhaarRaw.length > 0 && aadhaarRaw.length < 12 && (
                  <p className="text-amber-400 text-[11px] mt-1">⚠ {12 - aadhaarRaw.length} more digits required</p>
                )}
                {aadhaarRaw.length === 12 && (
                  <p className="text-emerald-400 text-[11px] mt-1">✓ Complete — only XXXX-XXXX-{aadhaarRaw.slice(-4)} will be stored</p>
                )}
              </div>
              <FileUploadBox label="Aadhaar Card — Front Side*" file={aadhaarFront} onChange={setAadhaarFront} />
              <FileUploadBox label="Aadhaar Card — Back Side*" file={aadhaarBack} onChange={setAadhaarBack} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep(1); setError(''); }} className="flex-1 h-11 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/5 transition-colors">← Back</button>
                <button onClick={validateAndGoStep3} className="flex-1 h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors">Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Optional Docs ────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-white font-bold">📋 Other Documents <span className="text-white/40 text-xs">(Optional)</span></h3>
              <p className="text-white/50 text-xs">Upload Passport or Driving Licence for stronger verification. You can skip this step.</p>
              <FileUploadBox label="Passport (optional)" file={passport} onChange={setPassport} />
              <FileUploadBox label="Driving Licence (optional)" file={dl} onChange={setDl} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep(2); setError(''); }} className="flex-1 h-11 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/5 transition-colors">← Back</button>
                <button
                  onClick={submitKYC}
                  disabled={loading}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
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

// ─── File Upload Box with size validation and thumbnail preview (U1, U7) ──────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const FileUploadBox: React.FC<{ label: string; file: File | null; onChange: (f: File | null) => void }> = ({ label, file, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File) => {
    setSizeError('');
    // U1: Client-side file size validation
    if (selectedFile.size > MAX_FILE_SIZE) {
      setSizeError(`File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed: 10MB`);
      return;
    }
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setSizeError('Invalid file type. Please upload JPG, PNG, WebP or PDF.');
      return;
    }
    onChange(selectedFile);
    // U7: Generate image preview thumbnail
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    setSizeError('');
    if (ref.current) ref.current.value = '';
  };

  return (
    <div>
      <label className="text-xs font-semibold text-white/60 mb-1 block">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 ${
          file ? 'border-emerald-500/50 bg-emerald-500/5' : sizeError ? 'border-red-500/50 bg-red-500/5' : 'border-white/15 hover:border-violet-500/50 bg-white/[0.03]'
        }`}
      >
        {/* U7: Show image thumbnail if available */}
        {preview ? (
          <img src={preview} alt="preview" className="size-10 rounded-lg object-cover shrink-0 border border-white/10" />
        ) : (
          <span className={`material-symbols-outlined text-2xl shrink-0 ${file ? 'text-emerald-400' : sizeError ? 'text-red-400' : 'text-white/30'}`}>
            {file && !preview ? 'picture_as_pdf' : file ? 'check_circle' : 'upload_file'}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {file ? (
            <div>
              <p className="text-emerald-300 text-xs font-semibold truncate">{file.name}</p>
              <p className="text-white/30 text-[10px]">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <p className="text-white/40 text-xs">Click to upload (JPG, PNG, PDF — max 10MB)</p>
          )}
        </div>
        {file && (
          <button type="button" onClick={handleClear} className="text-white/30 hover:text-red-400 text-xs shrink-0 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
      {/* U1: Size/type error feedback */}
      {sizeError && <p className="text-red-400 text-[11px] mt-1">⚠ {sizeError}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
      />
    </div>
  );
};
