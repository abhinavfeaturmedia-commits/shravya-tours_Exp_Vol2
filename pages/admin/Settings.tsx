import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// ─── Sidebar tabs ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'company', label: 'Company Profile', icon: 'business' },
  { id: 'finance', label: 'Finance & Tax', icon: 'account_balance' },
  { id: 'staff', label: 'Staff & Roles', icon: 'manage_accounts' },
  { id: 'integrations', label: 'Integrations & APIs', icon: 'api' },
];

// ─── Reusable field components ───────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500">{hint}</p>}
  </div>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
  />
);

const NumberInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}> = ({ value, onChange, min, max, step = 1, suffix }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
    />
    {suffix && <span className="text-sm text-slate-500 font-medium whitespace-nowrap">{suffix}</span>}
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const SectionCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─── Section: Company Profile ─────────────────────────────────────────────────
const CompanySection: React.FC = () => {
  const { settings, updateCompany, isSaving } = useSettings();
  const [form, setForm] = useState({ ...settings.company });
  const [isDirty, setIsDirty] = useState(false);

  const set = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateCompany(form);
      toast.success('Company profile saved');
      setIsDirty(false);
    } catch {
      toast.error('Failed to save company profile');
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Basic Information" description="Used in invoice headers, proposals, and email footers">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Company Name">
            <TextInput value={form.companyName} onChange={v => set('companyName', v)} placeholder="SHRAWELLO Travel Hub" />
          </Field>
          <Field label="GST Number" hint="Printed on tax invoices">
            <TextInput value={form.gstNumber} onChange={v => set('gstNumber', v)} placeholder="27AAAAA0000A1Z5" />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={v => set('email', v)} placeholder="info@shrawello.com" />
          </Field>
          <Field label="Phone / WhatsApp">
            <TextInput type="tel" value={form.phone} onChange={v => set('phone', v)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Website">
            <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://shrawello.com" />
          </Field>
          <Field label="Logo URL" hint="Appears on PDF invoices & proposals">
            <TextInput value={form.logoUrl} onChange={v => set('logoUrl', v)} placeholder="https://..." />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Registered Address" description="Used in invoice footers and legal documents">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="Street Address">
              <TextInput value={form.registeredAddress} onChange={v => set('registeredAddress', v)} placeholder="Building, Street, Area" />
            </Field>
          </div>
          <Field label="City">
            <TextInput value={form.city} onChange={v => set('city', v)} placeholder="Mumbai" />
          </Field>
          <Field label="State">
            <TextInput value={form.state} onChange={v => set('state', v)} placeholder="Maharashtra" />
          </Field>
          <Field label="PIN Code">
            <TextInput value={form.pincode} onChange={v => set('pincode', v)} placeholder="400001" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Social Media" description="Linked in marketing emails and proposals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Instagram">
            <TextInput value={form.instagram} onChange={v => set('instagram', v)} placeholder="https://instagram.com/shrawellotravelhub" />
          </Field>
          <Field label="Facebook">
            <TextInput value={form.facebook} onChange={v => set('facebook', v)} placeholder="https://facebook.com/shrawellotravelhub" />
          </Field>
        </div>
      </SectionCard>

      {isDirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">save</span>Save Changes</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Section: Finance & Tax ───────────────────────────────────────────────────
const FinanceSection: React.FC = () => {
  const { settings, updateFinance, isSaving } = useSettings();
  const [form, setForm] = useState({ ...settings.finance });
  const [isDirty, setIsDirty] = useState(false);

  const setNum = (field: string, val: number) => { setForm(p => ({ ...p, [field]: val })); setIsDirty(true); };
  const setStr = (field: string, val: string) => { setForm(p => ({ ...p, [field]: val })); setIsDirty(true); };
  const setBool = (field: string, val: boolean) => { setForm(p => ({ ...p, [field]: val })); setIsDirty(true); };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setStr('upiQrImage', reader.result as string);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await updateFinance(form);
      toast.success('Finance settings saved');
      setIsDirty(false);
    } catch {
      toast.error('Failed to save finance settings');
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="GST Configuration" description="Applied to all invoices and quotations">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="CGST %" hint="Central GST — for intra-state transactions">
            <NumberInput value={form.cgstPercent} onChange={v => setNum('cgstPercent', v)} min={0} max={14} step={0.5} suffix="%" />
          </Field>
          <Field label="SGST %" hint="State GST — for intra-state transactions">
            <NumberInput value={form.sgstPercent} onChange={v => setNum('sgstPercent', v)} min={0} max={14} step={0.5} suffix="%" />
          </Field>
          <Field label="IGST %" hint="Integrated GST — for inter-state transactions">
            <NumberInput value={form.igstPercent} onChange={v => setNum('igstPercent', v)} min={0} max={28} step={0.5} suffix="%" />
          </Field>
          <Field label="TCS %" hint="Tax Collected at Source — for international tour packages">
            <NumberInput value={form.tcsPercent} onChange={v => setNum('tcsPercent', v)} min={0} max={10} step={0.1} suffix="%" />
          </Field>
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Toggle
            checked={form.gstOnTotal}
            onChange={v => setBool('gstOnTotal', v)}
            label="Apply GST on total package price"
            description="Off = GST applied only on markup/profit. On = GST on the full invoice amount."
          />
        </div>
      </SectionCard>

      <SectionCard title="Numbering Prefixes" description="Controls how Booking IDs and Invoice numbers are generated">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Booking ID Prefix" hint="e.g. BK → BK-0001">
            <TextInput value={form.bookingPrefix} onChange={v => setStr('bookingPrefix', v)} placeholder="BK" />
          </Field>
          <Field label="Invoice Number Prefix" hint="e.g. INV → INV-0001">
            <TextInput value={form.invoicePrefix} onChange={v => setStr('invoicePrefix', v)} placeholder="INV" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Revenue Targets" description="Shown in Analytics dashboard progress indicators">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Monthly Revenue Target (₹)">
            <NumberInput value={form.monthlyRevenueTarget} onChange={v => setNum('monthlyRevenueTarget', v)} min={0} step={10000} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Bank Details" description="Printed on invoices and payment receipts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Account Holder Name">
            <TextInput value={form.bankAccountName} onChange={v => setStr('bankAccountName', v)} placeholder="SHRAWELLO TRAVELHUB AND EVENTS LLP" />
          </Field>
          <Field label="Bank Name">
            <TextInput value={form.bankName} onChange={v => setStr('bankName', v)} placeholder="KOTAK MAHINDRA BANK" />
          </Field>
          <Field label="Account Number">
            <TextInput value={form.bankAccountNumber} onChange={v => setStr('bankAccountNumber', v)} placeholder="4054789256" />
          </Field>
          <Field label="IFSC Code">
            <TextInput value={form.bankIfsc} onChange={v => setStr('bankIfsc', v)} placeholder="KKBK0002119" />
          </Field>
          <Field label="Branch">
            <TextInput value={form.bankBranch} onChange={v => setStr('bankBranch', v)} placeholder="Pune - Chikhali" />
          </Field>
          <Field label="UPI ID" hint="For QR code payments">
            <TextInput value={form.upiId} onChange={v => setStr('upiId', v)} placeholder="shrawello@upi" />
          </Field>

          <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
            <Field label="UPI QR Code Image" hint="Upload a static QR code image (e.g. from bank app). If uploaded, this overrides the dynamically generated code. Max 150KB recommended.">
              {form.upiQrImage ? (
                <div className="flex items-center gap-6 p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-850 w-fit">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                    <img src={form.upiQrImage} alt="UPI QR Preview" className="w-28 h-28 object-contain mix-blend-multiply" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Custom QR Code Active</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[280px]">Scanning this QR code will process payments using your uploaded static details.</p>
                    <button
                      type="button"
                      onClick={() => setStr('upiQrImage', '')}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-450 text-xs font-bold rounded-xl border border-rose-100/50 dark:border-rose-900/40 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      Remove Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 rounded-2xl p-6 transition-all bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all mb-2">
                    <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
                  </div>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-350">
                    Click to upload or drag & drop QR image
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Supports PNG, JPG, JPEG (Max 150KB recommended)
                  </p>
                </div>
              )}
            </Field>
          </div>
        </div>
      </SectionCard>

      {isDirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">save</span>Save Changes</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Section: Staff & Roles ───────────────────────────────────────────────────
const StaffSection: React.FC = () => {
  const { settings, updateStaffRoles, isSaving } = useSettings();
  const [form, setForm] = useState({ ...settings.staffRoles });
  const [isDirty, setIsDirty] = useState(false);

  const setNum = (field: string, val: number) => { setForm(p => ({ ...p, [field]: val })); setIsDirty(true); };
  const setBool = (field: string, val: boolean) => { setForm(p => ({ ...p, [field]: val })); setIsDirty(true); };
  const setStr = (field: string, val: string) => { setForm(p => ({ ...p, [field]: val })); setIsDirty(true); };

  const handleSave = async () => {
    try {
      await updateStaffRoles(form);
      toast.success('Staff & Roles settings saved. Reload to apply session changes.');
      setIsDirty(false);
    } catch {
      toast.error('Failed to save staff settings');
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Session Management" description="Controls how staff sessions are managed">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <Field label="Idle Timeout (minutes)" hint="Admin is warned and logged out after this period of inactivity">
            <NumberInput value={form.idleTimeoutMinutes} onChange={v => setNum('idleTimeoutMinutes', v)} min={5} max={120} step={5} suffix="min" />
          </Field>
          <Field label="Default Items Per Page" hint="Used across Bookings, Leads, Customers tables">
            <NumberInput value={form.defaultPaginationLimit} onChange={v => setNum('defaultPaginationLimit', v)} min={5} max={100} step={5} suffix="rows" />
          </Field>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <Toggle
            checked={form.allowMasquerade}
            onChange={v => setBool('allowMasquerade', v)}
            label="Allow Admin Masquerade"
            description="Lets admins switch to a staff view to debug permission issues."
          />
        </div>
      </SectionCard>

      <SectionCard title="Data Management" description="Controls how staff can delete and manage records">
        <Toggle
          checked={form.requireDeletionApproval}
          onChange={v => setBool('requireDeletionApproval', v)}
          label="Require Deletion Approval from Admin"
          description="When ON, staff members submit a deletion request instead of directly deleting records."
        />
      </SectionCard>

      <SectionCard title="CRM Defaults" description="Applied when new staff members are created">
        <Field label="Default Query Scope for New Staff">
          <select
            value={form.defaultQueryScope}
            onChange={e => setStr('defaultQueryScope', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Show All Queries">Show All Queries</option>
            <option value="Show Assigned Query Only">Show Assigned Queries Only</option>
          </select>
        </Field>
      </SectionCard>

      {isDirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">save</span>Save Changes</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── SecretInput — masked API key field ─────────────────────────────────────
const SecretInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '••••••••••••••••'}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none font-mono transition-all"
      />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 text-slate-400 hover:text-slate-600">
        <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
    enabled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
  }`}>
    <span className={`size-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {enabled ? 'Connected' : 'Not configured'}
  </span>
);

// ─── Integration Card wrapper ─────────────────────────────────────────────────
const IntegrationCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  docsUrl?: string;
  workflow?: string;
}> = ({ title, description, icon, color, enabled, onToggle, children, docsUrl, workflow }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-white dark:bg-[#1A2633] rounded-2xl border shadow-sm overflow-hidden transition-all ${
      enabled ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-slate-100 dark:border-slate-800'
    }`}>
      {/* Header row */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className={`size-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 ${color}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
            <StatusBadge enabled={enabled} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Docs ↗</a>
          )}
          <button type="button" onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
            <span className={`inline-block size-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
          <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">{open ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
      </div>
      {/* Workflow hint */}
      {workflow && enabled && (
        <div className="mx-5 mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
          <span>{workflow}</span>
        </div>
      )}
      {/* Collapsible config */}
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Section: Integrations & APIs ────────────────────────────────────────────
const IntegrationsSection: React.FC = () => {
  const { settings, updateIntegrations, isSaving } = useSettings();
  const [form, setForm] = useState({ ...settings.integrations });
  const [isDirty, setIsDirty] = useState(false);

  const setWA = (field: string, val: any) => { setForm(p => ({ ...p, whatsapp: { ...p.whatsapp, [field]: val } })); setIsDirty(true); };
  const setRZ = (field: string, val: any) => { setForm(p => ({ ...p, razorpay: { ...p.razorpay, [field]: val } })); setIsDirty(true); };
  const setSMTP = (field: string, val: any) => { setForm(p => ({ ...p, smtp: { ...p.smtp, [field]: val } })); setIsDirty(true); };
  const setSMS = (field: string, val: any) => { setForm(p => ({ ...p, sms: { ...p.sms, [field]: val } })); setIsDirty(true); };
  const setGG = (field: string, val: any) => { setForm(p => ({ ...p, google: { ...p.google, [field]: val } })); setIsDirty(true); };
  const setOR = (field: string, val: any) => { setForm(p => ({ ...p, openrouter: { ...p.openrouter, [field]: val } })); setIsDirty(true); };

  const [orModels, setOrModels] = useState<Array<{ id: string, name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    // Only fetch if OpenRouter is enabled or user opens it, but to keep it simple we fetch on mount
    setLoadingModels(true);
    fetch('https://openrouter.ai/api/v1/models')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          // Sort models alphabetically by name
          const sorted = data.data
            .map((m: any) => ({ id: m.id, name: m.name || m.id }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
          setOrModels(sorted);
        }
      })
      .catch(err => console.error('Failed to fetch OpenRouter models:', err))
      .finally(() => setLoadingModels(false));
  }, []);

  const handleSave = async () => {
    try {
      await updateIntegrations(form);
      toast.success('Integration settings saved');
      setIsDirty(false);
    } catch { toast.error('Failed to save integration settings'); }
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
        <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">lock</span>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Security:</strong> API keys and secrets are stored in your database. Never share these credentials.
          Expand each card to configure credentials. Toggle to enable/disable each service.
        </p>
      </div>

      {/* ── WhatsApp ── */}
      <IntegrationCard
        title="WhatsApp Business API"
        description="Send booking confirmations, follow-up reminders, and payment links to customers via WhatsApp"
        icon="chat" color="bg-[#25D366]"
        enabled={form.whatsapp.enabled}
        onToggle={v => setWA('enabled', v)}
        docsUrl="https://developers.facebook.com/docs/whatsapp/cloud-api"
        workflow="Workflow: Lead created → WhatsApp greeting sent → Follow-up due → Automated reminder → Booking confirmed → Confirmation message with invoice link"
      >
        <Field label="Provider">
          <select value={form.whatsapp.provider} onChange={e => setWA('provider', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none">
            <option value="meta">Meta Cloud API (Recommended — free up to 1K conversations/mo)</option>
            <option value="twilio">Twilio WhatsApp (Pay-per-message)</option>
          </select>
        </Field>

        {form.whatsapp.provider === 'meta' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Phone Number ID" hint="From Meta Developer Console → App → WhatsApp → API Setup">
              <TextInput value={form.whatsapp.metaPhoneNumberId} onChange={v => setWA('metaPhoneNumberId', v)} placeholder="1234567890" />
            </Field>
            <Field label="WhatsApp Business Account ID (WABA ID)">
              <TextInput value={form.whatsapp.metaWabaId} onChange={v => setWA('metaWabaId', v)} placeholder="9876543210" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Permanent Access Token" hint="Create a System User in Meta Business Suite with WhatsApp permission">
                <SecretInput value={form.whatsapp.metaAccessToken} onChange={v => setWA('metaAccessToken', v)} placeholder="EAAxxxxxxxx..." />
              </Field>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Account SID">
              <TextInput value={form.whatsapp.twilioAccountSid} onChange={v => setWA('twilioAccountSid', v)} placeholder="ACxxxxxxxxxxxxxxxx" />
            </Field>
            <Field label="Auth Token">
              <SecretInput value={form.whatsapp.twilioAuthToken} onChange={v => setWA('twilioAuthToken', v)} placeholder="your_auth_token" />
            </Field>
            <Field label="From WhatsApp Number" hint="Format: whatsapp:+14155238886">
              <TextInput value={form.whatsapp.twilioFromNumber} onChange={v => setWA('twilioFromNumber', v)} placeholder="whatsapp:+14155238886" />
            </Field>
          </div>
        )}
        <Field label="Default Greeting Message" hint="Sent as the first message when a lead is created">
          <TextInput value={form.whatsapp.defaultGreeting} onChange={v => setWA('defaultGreeting', v)} placeholder="Hello! Thank you for choosing SHRAWELLO Travel Hub." />
        </Field>
      </IntegrationCard>

      {/* ── Razorpay ── */}
      <IntegrationCard
        title="Razorpay"
        description="Generate payment links for bookings, collect deposits, track payments and send receipts automatically"
        icon="payments" color="bg-[#2D9CDB]"
        enabled={form.razorpay.enabled}
        onToggle={v => setRZ('enabled', v)}
        docsUrl="https://razorpay.com/docs/api/"
        workflow="Workflow: Booking created → Generate Razorpay payment link → Link sent via WhatsApp/Email → Customer pays → Webhook fires → Booking payment status auto-updated → Staff notified"
      >
        <Field label="Mode">
          <div className="flex gap-3">
            {(['test', 'live'] as const).map(m => (
              <button key={m} type="button" onClick={() => setRZ('mode', m)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                  form.razorpay.mode === m
                    ? m === 'live' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-primary text-white border-primary'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary'
                }`}>
                {m === 'test' ? '🧪 Test Mode' : '🚀 Live Mode'}
              </button>
            ))}
          </div>
        </Field>
        {form.razorpay.mode === 'live' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <span className="material-symbols-outlined text-red-500 text-[16px]">warning</span>
            <p className="text-xs text-red-700 dark:text-red-300">Live mode — real payments will be processed. Ensure webhooks are configured.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Key ID" hint={`Get from Razorpay Dashboard → Settings → API Keys (${form.razorpay.mode})`}>
            <TextInput value={form.razorpay.keyId} onChange={v => setRZ('keyId', v)} placeholder={form.razorpay.mode === 'test' ? 'rzp_test_xxxx' : 'rzp_live_xxxx'} />
          </Field>
          <Field label="Key Secret">
            <SecretInput value={form.razorpay.keySecret} onChange={v => setRZ('keySecret', v)} placeholder="••••••••••••••" />
          </Field>
          <Field label="Webhook Secret" hint="Set this in Razorpay Dashboard → Webhooks → Secret">
            <SecretInput value={form.razorpay.webhookSecret} onChange={v => setRZ('webhookSecret', v)} placeholder="webhook_secret" />
          </Field>
          <Field label="Payment Link Expiry" hint="Hours before the payment link auto-expires">
            <NumberInput value={form.razorpay.paymentLinkExpiry} onChange={v => setRZ('paymentLinkExpiry', v)} min={1} max={168} step={1} suffix="hrs" />
          </Field>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-0">
          <Toggle checked={form.razorpay.notifyCustomerOnPayment} onChange={v => setRZ('notifyCustomerOnPayment', v)}
            label="Notify customer on successful payment"
            description="Sends a WhatsApp/Email receipt automatically after payment" />
          <Toggle checked={form.razorpay.notifyStaffOnPayment} onChange={v => setRZ('notifyStaffOnPayment', v)}
            label="Notify staff on payment received"
            description="Sends a WhatsApp notification to the assigned agent" />
        </div>
      </IntegrationCard>

      {/* ── SMTP Email ── */}
      <IntegrationCard
        title="SMTP Email"
        description="Send transactional emails — booking confirmations, invoices, proposals, and password resets"
        icon="email" color="bg-indigo-500"
        enabled={form.smtp.enabled}
        onToggle={v => setSMTP('enabled', v)}
        docsUrl="https://support.google.com/mail/answer/7126229"
        workflow="Workflow: Booking confirmed → Email invoice PDF → Proposal created → Email proposal link → Lead assigned → Agent introduction email"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SMTP Host" hint="e.g. smtp.gmail.com / smtp.hostinger.com">
            <TextInput value={form.smtp.host} onChange={v => setSMTP('host', v)} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port" hint="587 for TLS, 465 for SSL, 25 for plain">
            <NumberInput value={form.smtp.port} onChange={v => setSMTP('port', v)} min={1} max={65535} />
          </Field>
          <Field label="Username / Email">
            <TextInput type="email" value={form.smtp.username} onChange={v => setSMTP('username', v)} placeholder="info@shrawello.com" />
          </Field>
          <Field label="Password / App Password" hint="Use App Password for Gmail (2FA accounts)">
            <SecretInput value={form.smtp.password} onChange={v => setSMTP('password', v)} placeholder="app_password_here" />
          </Field>
          <Field label="From Name" hint="Shown in recipient's inbox">
            <TextInput value={form.smtp.fromName} onChange={v => setSMTP('fromName', v)} placeholder="SHRAWELLO Travel Hub" />
          </Field>
          <Field label="From Email">
            <TextInput type="email" value={form.smtp.fromEmail} onChange={v => setSMTP('fromEmail', v)} placeholder="noreply@shravyatours.com" />
          </Field>
        </div>
        <Toggle checked={form.smtp.useTls} onChange={v => setSMTP('useTls', v)}
          label="Use TLS/STARTTLS" description="Recommended for all modern SMTP servers" />
      </IntegrationCard>

      {/* ── SMS ── */}
      <IntegrationCard
        title="SMS Gateway"
        description="Send OTPs, booking confirmations, and payment alerts via SMS for customers without WhatsApp"
        icon="sms" color="bg-orange-500"
        enabled={form.sms.enabled}
        onToggle={v => setSMS('enabled', v)}
        docsUrl="https://docs.msg91.com/"
        workflow="Workflow: New booking → SMS confirmation with booking ID → Payment received → SMS receipt → Departure D-1 → SMS reminder with check-in details"
      >
        <Field label="Provider">
          <select value={form.sms.provider} onChange={e => setSMS('provider', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none">
            <option value="msg91">MSG91 (Indian DLT-registered, recommended for India)</option>
            <option value="twilio">Twilio SMS</option>
            <option value="textlocal">TextLocal</option>
          </select>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.sms.provider === 'msg91' ? (
            <>
              <Field label="MSG91 Auth Key" hint="From MSG91 Dashboard → API → Auth Key">
                <SecretInput value={form.sms.msg91AuthKey} onChange={v => setSMS('msg91AuthKey', v)} placeholder="xxxxxx@gmail.com" />
              </Field>
              <Field label="DLT Template ID" hint="From TRAI DLT portal — required for all commercial SMS in India">
                <TextInput value={form.sms.msg91TemplateId} onChange={v => setSMS('msg91TemplateId', v)} placeholder="1234567890" />
              </Field>
            </>
          ) : (
            <Field label="API Key">
              <SecretInput value={form.sms.apiKey} onChange={v => setSMS('apiKey', v)} placeholder="your_api_key" />
            </Field>
          )}
          <Field label="Sender ID" hint="6-char DLT approved ID (e.g. SHRVYA)">
            <TextInput value={form.sms.senderId} onChange={v => setSMS('senderId', v)} placeholder="SHRVYA" />
          </Field>
        </div>
      </IntegrationCard>

      {/* ── Google ── */}
      <IntegrationCard
        title="Google Services"
        description="Google Maps on Contact page and Google Analytics for website traffic tracking"
        icon="travel_explore" color="bg-[#4285F4]"
        enabled={!!(form.google.mapsApiKey || form.google.analyticsId)}
        onToggle={() => {}}
        docsUrl="https://console.cloud.google.com/"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Maps API Key" hint="Enable 'Maps JavaScript API' in Google Cloud Console">
            <SecretInput value={form.google.mapsApiKey} onChange={v => setGG('mapsApiKey', v)} placeholder="AIzaSy..." />
          </Field>
          <Field label="GA4 Measurement ID" hint="From Google Analytics → Admin → Data Streams → Measurement ID">
            <TextInput value={form.google.analyticsId} onChange={v => setGG('analyticsId', v)} placeholder="G-XXXXXXXXXX" />
          </Field>
        </div>
      </IntegrationCard>

      {/* ── OpenRouter ── */}
      <IntegrationCard
        title="OpenRouter AI"
        description="Enable AI features like automated itinerary generation, smart email drafting, and query parsing using OpenRouter"
        icon="smart_toy" color="bg-purple-500"
        enabled={form.openrouter.enabled}
        onToggle={v => setOR('enabled', v)}
        docsUrl="https://openrouter.ai/"
        workflow="Workflow: Agent clicks 'Generate Itinerary' → Prompt sent to OpenRouter → AI drafts itinerary based on customer preferences"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="OpenRouter API Key" hint="Create an API key from OpenRouter settings">
            <SecretInput value={form.openrouter.apiKey} onChange={v => setOR('apiKey', v)} placeholder="sk-or-v1-..." />
          </Field>
          <Field label="Default Model">
            <select value={form.openrouter.defaultModel} onChange={e => setOR('defaultModel', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none">
              {loadingModels ? (
                <option value={form.openrouter.defaultModel}>Loading models...</option>
              ) : orModels.length > 0 ? (
                <>
                  <option value="" disabled>Select a model...</option>
                  {orModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                  ))}
                </>
              ) : (
                <>
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Fast & Cheap)</option>
                  <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (High Quality)</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Excellent Reasoning)</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                </>
              )}
            </select>
          </Field>
        </div>
      </IntegrationCard>

      {isDirty && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60">
            {isSaving
              ? <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              : <><span className="material-symbols-outlined text-[18px]">save</span>Save All Integrations</>}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Settings Page ──────────────────────────────────────────────────────
export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isLoading } = useSettings();

  // Admin-only guard
  if (currentUser && currentUser.userType !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-10">
        <span className="material-symbols-outlined text-6xl text-slate-300">lock</span>
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Admin Access Only</h2>
        <p className="text-slate-500 text-sm">Settings can only be accessed by administrators.</p>
        <button onClick={() => navigate('/admin')} className="mt-2 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full admin-page-bg">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151F2A] flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">settings</span>
            Settings
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">System Configuration</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 text-center">Changes saved to database</p>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {TABS.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'company' && 'Your brand identity used across invoices, proposals, and documents'}
              {activeTab === 'finance' && 'Tax configuration, bank details, and revenue targets'}
              {activeTab === 'staff' && 'Session timeouts, permissions, and CRM defaults'}
              {activeTab === 'integrations' && 'Connect WhatsApp, Razorpay, SMTP, SMS, and Google services'}
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="size-3.5 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              Loading settings...
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="p-8 max-w-4xl">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 p-6 animate-pulse">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3 mb-4" />
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="space-y-2">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'company' && <CompanySection />}
              {activeTab === 'finance' && <FinanceSection />}
              {activeTab === 'staff' && <StaffSection />}
              {activeTab === 'integrations' && <IntegrationsSection />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
