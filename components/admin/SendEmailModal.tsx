import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../src/lib/api';
import { useSettings } from '../../context/SettingsContext';

export interface SendEmailDetails {
  clientName?: string;
  tripTitle?: string;
  destination?: string;
  travelDates?: string;
  documentNo?: string;
  documentType?: string;
  totalAmount?: number | string;
  amountPaid?: number | string;
  balanceDue?: number | string;
  paymentStatus?: string;
  notes?: string;
}

export type EmailTemplateTheme = 'luxury_indigo' | 'royal_emerald' | 'sunset_coral' | 'minimal_clean';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  templateType?: 'custom' | 'agent_intro' | 'proposal' | 'invoice';
  refId?: string; // Lead ID, Proposal ID, or Booking ID
  title?: string;
  details?: SendEmailDetails;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  defaultSubject = '',
  defaultMessage = '',
  templateType = 'custom',
  refId = '',
  title = 'Send Email',
  details
}) => {
  const { settings } = useSettings();
  const defaultTheme = (settings.company.emailTemplateTheme as EmailTemplateTheme) || 'luxury_indigo';

  const [recipient, setRecipient] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [smtpType, setSmtpType] = useState<'general' | 'billing'>(templateType === 'invoice' ? 'billing' : 'general');
  const [selectedTemplate, setSelectedTemplate] = useState<'custom' | 'agent_intro' | 'proposal' | 'invoice'>(templateType);
  const [selectedTheme, setSelectedTheme] = useState<EmailTemplateTheme>(defaultTheme);
  const [isSending, setIsSending] = useState(false);

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    setRecipient(defaultEmail);
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setSelectedTemplate(templateType);
    setSmtpType(templateType === 'invoice' ? 'billing' : 'general');
    setSelectedTheme(defaultTheme);
  }, [defaultEmail, defaultSubject, defaultMessage, templateType, isOpen, defaultTheme]);

  if (!isOpen) return null;

  const handlePreview = async () => {
    setLoadingPreview(true);
    setIsPreviewOpen(true);
    try {
      const res = await api.previewEmail({
        templateType: selectedTemplate,
        refId: refId || undefined,
        theme: selectedTheme,
        subject: subject.trim() || undefined,
        message: message.trim() || undefined
      });
      if (res && res.html) {
        setPreviewHtml(res.html);
      }
    } catch (err: any) {
      toast.error('Failed to generate email preview');
      setIsPreviewOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      toast.error('Recipient email address is required');
      return;
    }

    if (selectedTemplate === 'custom' && (!subject.trim() || !message.trim())) {
      toast.error('Please enter both subject and message body');
      return;
    }

    setIsSending(true);
    const toastId = toast.loading('Sending email...');

    try {
      await api.sendManualEmail({
        smtpType,
        to: recipient.trim(),
        subject: subject.trim(),
        message: message.trim(),
        templateType: selectedTemplate,
        refId: refId || undefined,
        theme: selectedTheme
      });

      toast.dismiss(toastId);
      toast.success(`Email successfully sent to ${recipient.trim()}`);
      onClose();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Failed to send email. Please check SMTP settings.');
    } finally {
      setIsSending(false);
    }
  };

  // Clean reference calculation
  const cleanRef = details?.documentNo || (refId ? (refId.length > 15 ? `#BK-${refId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}` : `#${refId}`) : null);

  const THEMES: Array<{ id: EmailTemplateTheme; name: string; icon: string; border: string }> = [
    { id: 'luxury_indigo', name: 'Luxury Indigo', icon: 'auto_awesome', border: 'border-indigo-500' },
    { id: 'royal_emerald', name: 'Royal Emerald', icon: 'diamond', border: 'border-emerald-500' },
    { id: 'sunset_coral', name: 'Sunset Coral', icon: 'wb_sunny', border: 'border-rose-500' },
    { id: 'minimal_clean', name: 'Minimal Slate', icon: 'business', border: 'border-blue-500' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="w-full max-w-lg bg-white dark:bg-[#1A2633] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
                <p className="text-[11px] text-slate-400">Dispatch transactional or branded emails</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Template Selector (If refId is available) */}
            {refId && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Action Type
                </label>
                <select
                  value={selectedTemplate}
                  onChange={e => {
                    const val = e.target.value as any;
                    setSelectedTemplate(val);
                    if (val === 'invoice') setSmtpType('billing');
                    else setSmtpType('general');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="custom">✍️ Custom Composed Message</option>
                  <option value="agent_intro">👤 Resend Agent Introduction Email</option>
                  <option value="proposal">📄 Send / Resend Proposal Link</option>
                  <option value="invoice">🧾 Send / Resend Tax Invoice & Booking Summary</option>
                </select>
              </div>
            )}

            {/* Email Theme Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Design Theme
                </label>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  Live Preview
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {THEMES.map(th => {
                  const isActive = selectedTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setSelectedTheme(th.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isActive
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                          {th.icon}
                        </span>
                        <span className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                          {th.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="customer@example.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            {/* SMTP Account Choice */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Send Via SMTP Account
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSmtpType('general')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    smtpType === 'general'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  General SMTP
                </button>
                <button
                  type="button"
                  onClick={() => setSmtpType('billing')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    smtpType === 'billing'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  Billing SMTP
                </button>
              </div>
            </div>

            {/* Custom Message Fields */}
            {selectedTemplate === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Subject Line <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Travel Itinerary Update & Quote Options"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Dear Customer,&#10;&#10;Thank you for reaching out..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                  />
                </div>
              </>
            ) : (
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900/50 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl text-xs space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600 dark:text-indigo-400">verified</span>
                    <span>Official Branded Summary</span>
                  </div>
                  {cleanRef && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                      {cleanRef}
                    </span>
                  )}
                </div>

                {/* Trip & Document Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-indigo-100/80 dark:border-indigo-800/30 text-[11px]">
                  {details?.clientName && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Client Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{details.clientName}</span>
                    </div>
                  )}
                  {details?.totalAmount !== undefined && Number(details.totalAmount) > 0 && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Total Amount</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">₹{Math.round(Number(details.totalAmount)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {details?.amountPaid !== undefined && Number(details.amountPaid) > 0 && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Amount Paid</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{Math.round(Number(details.amountPaid)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {details?.balanceDue !== undefined && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Balance Due</span>
                      <span className={`font-bold ${Number(details.balanceDue) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        ₹{Math.round(Number(details.balanceDue)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {(details?.destination || details?.tripTitle) && (
                    <div className="col-span-2">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Trip / Itinerary</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{details.destination || details.tripTitle}</span>
                    </div>
                  )}
                  {details?.travelDates && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Travel Dates</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{details.travelDates}</span>
                    </div>
                  )}
                  {details?.paymentStatus && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Payment Status</span>
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        /paid/i.test(details.paymentStatus) && !/unpaid|partially/i.test(details.paymentStatus)
                          ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300' 
                          : /partially|deposit/i.test(details.paymentStatus)
                          ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'text-rose-700 bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                      }`}>
                        {details.paymentStatus}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed pt-1">
                  The client will automatically receive a responsive branded email with this trip summary and payment overview.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePreview}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Preview Email
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {isSending ? (
                    <>
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      Send Email Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Live HTML Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-3xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[22px]">preview</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Email Design Live Preview</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Theme: {THEMES.find(t => t.id === selectedTheme)?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-y-auto flex items-center justify-center">
              {loadingPreview ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <span className="size-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-bold">Rendering responsive template...</p>
                </div>
              ) : previewHtml ? (
                <div className="w-full max-w-[620px] bg-white rounded-xl shadow-lg overflow-hidden my-auto">
                  <iframe
                    title="Email Preview Frame"
                    srcDoc={previewHtml}
                    className="w-full h-[620px] border-0"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400">No preview generated.</p>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Responsive HTML format tested across Apple Mail, Gmail, and Outlook.
              </p>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary/90"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
