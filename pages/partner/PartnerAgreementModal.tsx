import React, { useState, useRef } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * PartnerAgreementModal
 * 
 * Non-dismissable policy gate shown to all SHRAWELLO Travel Associates on their
 * first login (or whenever terms_agreed_at is null).
 * 
 * Flow:
 *  1. Partner must scroll through the full policy text
 *  2. Check "I have read and agree..." checkbox (enabled only after scrolling to bottom)
 *  3. Click "Accept & Continue" → calls /api/partner/auth/agree-terms
 *  4. Modal disappears, portal content renders
 *
 * "Decline & Logout" is always available as an escape.
 */

const POLICY_SECTIONS = [
  {
    title: 'About SHRAWELLO',
    content: 'SHRAWELLO Travel Hub & Events LLP provides tours, travel, transport, corporate travel, hotel, flight, rail and event services across India.',
  },
  {
    title: 'Purpose',
    content: 'To establish a transparent Travel Associate Program.',
  },
  {
    title: 'Definitions',
    content: 'Travel Associate means an independent referral associate. Company means SHRAWELLO Travel Hub & Events LLP. Customer means any person referred or serviced by the Company.',
  },
  {
    title: 'Eligibility',
    content: '• Age: 18+ Years\n• Valid KYC: Aadhar Card & PAN Card\n• Bank Account: Current/Saving\n• Acceptance of policies: Mandatory',
  },
  {
    title: 'Roles & Responsibilities',
    content: '• Generate genuine leads\n• Explain only approved packages\n• Never alter prices\n• Maintain professionalism\n• Protect customer data\n• Coordinate bookings with Sales team until completion',
  },
  {
    title: 'Booking SOP',
    content: '1. Identify lead\n2. Understand requirement\n3. Share enquiry through Travel Associate portal\n4. Company (Sales person) prepares quotation\n5. Customer negotiation and confirmation\n6. Customer pays Company 100% booking amount\n7. Company books services\n8. Customer avails travel services as per agreement\n9. Associate receives eligible commission within 7 working days from travel completion',
  },
  {
    title: 'Commission Policy',
    content: '• Tour Package: 3% of final selling amount\n• Cab: ₹100\n• Bus: ₹50\n• Train: ₹50\n• Flight: ₹100\n\nCommission is payable only after successful booking, full payment and subject to cancellation policy.\n\nSHRAWELLO Travel Hub & Events LLP reserves the right to revise or modify the commission structure at any time at its sole discretion.',
  },
  {
    title: 'Customer Ownership',
    content: 'All customers referred by a Travel Associate become customers of SHRAWELLO. The Company has exclusive rights to communicate, quote, receive payments, service, remarket and retain customer relationships.\n\nAssociates shall not divert customers or use customer information for personal benefit. After termination, Associates shall not solicit SHRAWELLO customers introduced through the Company for 12 months unless permitted in writing.\n\nSHRAWELLO Travel Hub & Events LLP is committed to maintaining complete transparency and fairness in its relationship with its Travel Associates. The Company will not intentionally bypass or undermine a Travel Associate to secure business for its own benefit where the customer has been genuinely introduced by that Travel Associate.',
  },
  {
    title: 'Confidentiality',
    content: 'All pricing, customer information, supplier contacts, contracts, training materials, and business information are strictly confidential. Any breach may result in disciplinary action, termination, and legal action.',
  },
  {
    title: 'Marketing',
    content: 'Only approved brochures, logos and creatives may be used. No misleading advertisements or unauthorized discounts.',
  },
  {
    title: 'Code of Conduct',
    content: 'Professional behaviour, honesty, compliance with law, respectful communication & anti-fraud.',
  },
  {
    title: 'Termination',
    content: 'Company may terminate immediately for fraud, misconduct, misrepresentation, policy violations or reputational harm.',
  },
  {
    title: 'General Terms',
    content: 'Company may amend policies. Associate is not an employee, partner, franchisee or agent and cannot legally bind the Company.',
  },
];

export const PartnerAgreementModal: React.FC = () => {
  const { partner, agreeToTerms, logout } = usePartnerAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');
    try {
      await agreeToTerms();
      // Context optimistically updates — modal will unmount via parent gate
    } catch {
      setError('Failed to record agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    logout();
    navigate('/partner/login', { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      style={{ animation: 'fadeIn 0.3s ease' }}
    >
      {/* Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-600/25 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-700/20 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-violet-700 to-purple-700 px-7 py-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-[26px]">gavel</span>
            </div>
            <div>
              <p className="text-[11px] text-violet-200 font-bold uppercase tracking-widest mb-0.5">SHRAWELLO Travel Hub & Events LLP</p>
              <h2 className="text-xl font-black text-white leading-tight">Travel Associate Policy & Terms</h2>
            </div>
          </div>
          {partner?.name && (
            <p className="mt-4 text-sm text-violet-100/80 leading-relaxed">
              Welcome, <strong className="text-white">{partner.name}</strong>. Before accessing the Travel Associate Portal, please read and accept the following policy in full.
            </p>
          )}
        </div>

        {/* Scroll indicator */}
        {!scrolledToBottom && (
          <div className="shrink-0 flex items-center gap-2 px-7 py-2 bg-amber-500/10 border-b border-amber-500/20">
            <span className="material-symbols-outlined text-amber-400 text-[16px]">info</span>
            <p className="text-[11px] text-amber-300 font-semibold">Please scroll through the complete policy to enable acceptance.</p>
          </div>
        )}

        {/* Policy Body — scrollable */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-7 py-6 space-y-6 text-sm"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Preamble */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
            <p className="text-white/80 leading-relaxed text-sm">
              This document sets out the policies governing <strong className="text-violet-300">SHRAWELLO Travel Associates</strong>.
              A Travel Associate is an <strong className="text-white">independent referral associate</strong> and not an employee, partner, franchisee or agent.
            </p>
          </div>

          {/* Policy Sections */}
          {POLICY_SECTIONS.map((section, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 mb-2">
                <div className="size-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-black">{idx + 1}</span>
                </div>
                <h3 className="text-sm font-black text-white tracking-tight">{section.title}</h3>
              </div>
              <div className="ml-7">
                <p className="text-white/65 leading-relaxed whitespace-pre-line">{section.content}</p>
              </div>
            </div>
          ))}

          {/* Declaration box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mt-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-[20px] mt-0.5 shrink-0">verified</span>
              <div>
                <p className="text-emerald-300 font-bold text-sm">Declaration</p>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">
                  I have read and agree to abide by this Policy. I understand that SHRAWELLO Travel Hub & Events LLP
                  may amend these terms, and I will be bound by the updated terms upon notification.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom padding so user knows they've reached the end */}
          <div className="h-4" />
        </div>

        {/* Footer — acceptance controls */}
        <div className="shrink-0 border-t border-white/10 bg-slate-950/80 backdrop-blur-sm px-7 py-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-4 py-2.5 rounded-xl">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          {/* Checkbox */}
          <label
            className={`flex items-start gap-3 cursor-pointer group ${!scrolledToBottom ? 'opacity-40 pointer-events-none' : ''}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                disabled={!scrolledToBottom}
                className="sr-only"
              />
              <div
                className={`size-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
                  ${agreed
                    ? 'bg-violet-600 border-violet-600'
                    : 'border-white/30 group-hover:border-violet-400'
                  }`}
              >
                {agreed && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
              </div>
            </div>
            <span className="text-sm text-white/80 leading-relaxed">
              I have read, understood, and agree to abide by the{' '}
              <strong className="text-violet-300">SHRAWELLO Travel Associate Policy & Terms and Conditions</strong>{' '}
              as stated above.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAccept}
              disabled={!agreed || loading}
              className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                         text-white font-bold rounded-xl flex items-center justify-center gap-2
                         shadow-lg shadow-violet-500/30 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  Accept & Continue
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              className="h-12 px-5 rounded-xl border border-white/15 text-white/50 hover:text-red-400
                         hover:border-red-500/40 hover:bg-red-500/10 text-sm font-semibold transition-all"
            >
              Decline & Logout
            </button>
          </div>

          <p className="text-[10px] text-center text-white/25 leading-relaxed">
            Acceptance is mandatory to access the Travel Associate Portal. By accepting, you agree to operate as an
            independent referral associate of SHRAWELLO Travel Hub & Events LLP.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};
