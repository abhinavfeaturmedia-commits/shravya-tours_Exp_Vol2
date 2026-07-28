import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../src/lib/api';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  templateType?: 'custom' | 'agent_intro' | 'proposal' | 'invoice';
  refId?: string; // Lead ID, Proposal ID, or Booking ID
  title?: string;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  defaultSubject = '',
  defaultMessage = '',
  templateType = 'custom',
  refId = '',
  title = 'Send Email'
}) => {
  const [recipient, setRecipient] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [smtpType, setSmtpType] = useState<'general' | 'billing'>(templateType === 'invoice' ? 'billing' : 'general');
  const [selectedTemplate, setSelectedTemplate] = useState<'custom' | 'agent_intro' | 'proposal' | 'invoice'>(templateType);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setRecipient(defaultEmail);
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setSelectedTemplate(templateType);
    setSmtpType(templateType === 'invoice' ? 'billing' : 'general');
  }, [defaultEmail, defaultSubject, defaultMessage, templateType, isOpen]);

  if (!isOpen) return null;

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
        refId: refId || undefined
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

  return (
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
              <p className="text-[11px] text-slate-400">Dispatch transactional or custom branded emails</p>
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
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                System Template Selected
              </p>
              <p>
                Sending will automatically populate the official branded email template using database record details for reference ID: <strong>{refId}</strong>.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
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
        </form>
      </div>
    </div>
  );
};
