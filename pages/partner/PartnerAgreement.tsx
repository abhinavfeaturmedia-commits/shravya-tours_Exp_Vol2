import React from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import { Link } from 'react-router-dom';

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
    title: 'Roles & Responsibilities of Travel Associate',
    content: '• Generate genuine leads\n• Explain only approved packages\n• Never alter prices\n• Maintain professionalism\n• Protect customer data\n• Coordinate bookings with Sales team until completion',
  },
  {
    title: 'Booking SOP to be Followed',
    content: '1. Identify lead\n2. Understand requirement\n3. Share enquiry through Travel Associate portal\n4. Company (Sales person) prepares quotation\n5. Customer negotiation and confirmation\n6. Customer pays Company 100% booking amount\n7. Company books services\n8. Customer avails travel services as per agreement\n9. Associate receives eligible commission within 7 working days from travel completion',
  },
  {
    title: 'Commission Policy (Can vary based on package or services)',
    content: '• Tour Package: 3% of final selling amount\n• Cab: ₹100\n• Bus: ₹50\n• Train: ₹50\n• Flight: ₹100\n\nCommission payable only after successful booking, full payment and subject to cancellation policy.\n\nSHRAWELLO Travel Hub & Events LLP reserves the right to revise or modify the commission structure at any time at its sole discretion.',
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
    content: 'Professional behaviors, honesty, compliance with law, respectful communication & anti-fraud.',
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

export const PartnerAgreement: React.FC = () => {
  const { partner } = usePartnerAuth();

  if (!partner) return null;

  const rawAgreedAt = (partner as any).terms_agreed_at;
  const agreedVersion = (partner as any).terms_version || 'v1.0';

  const agreedDateFormatted = rawAgreedAt
    ? new Date(rawAgreedAt).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : 'Accepted during onboarding';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-full">
      {/* Header Actions (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-violet-400 font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Legal & Policy Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Policy & Terms Agreement</h1>
          <p className="text-white/50 text-sm mt-1">
            Your accepted agreement copy with SHRAWELLO Travel Hub & Events LLP
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Acceptance Status Banner Card */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-purple-950/60 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden print:border-slate-300 print:bg-white print:text-black">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold print:border-emerald-600 print:text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse print:hidden" />
              Active Agreement • Digital Record Verified
            </div>
            <h2 className="text-xl font-black text-white print:text-black">
              SHRAWELLO Travel Associate Policy
            </h2>
            <p className="text-white/70 text-sm print:text-slate-700">
              Associate Name: <strong className="text-white print:text-black">{partner.name}</strong> ({partner.companyName || 'Independent'})
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs space-y-1.5 shrink-0 print:bg-slate-50 print:border-slate-200 print:text-slate-800">
            <div className="flex justify-between gap-4">
              <span className="text-white/50 print:text-slate-500 font-medium">Acceptance Date:</span>
              <span className="text-emerald-400 font-bold print:text-emerald-700">{agreedDateFormatted}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50 print:text-slate-500 font-medium">Policy Version:</span>
              <span className="text-white font-mono font-bold print:text-black">{agreedVersion}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50 print:text-slate-500 font-medium">Associate Email:</span>
              <span className="text-violet-300 font-semibold print:text-slate-900">{partner.email}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50 print:text-slate-500 font-medium">Associate ID:</span>
              <span className="text-white font-mono print:text-black">{partner.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Content Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        {/* Printable Header */}
        <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-black">SHRAWELLO Travel Associate - Policy & Terms and Conditions</h1>
          <p className="text-xs text-slate-600">Issued by: SHRAWELLO Travel Hub & Events LLP</p>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 text-sm text-white/80 leading-relaxed print:bg-slate-100 print:border-slate-200 print:text-black">
          This document sets out the policies governing <strong className="text-violet-300 print:text-black">SHRAWELLO Travel Associates</strong>. 
          A Travel Associate is an <strong className="text-white print:text-black">independent referral associate</strong> and not an employee, partner, franchisee or agent.
        </div>

        {/* Policy Sections List */}
        <div className="space-y-6">
          {POLICY_SECTIONS.map((section, idx) => (
            <div key={idx} className="border-b border-white/10 pb-6 last:border-none print:border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-6 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-300 flex items-center justify-center text-xs font-black shrink-0 print:bg-slate-200 print:border-slate-300 print:text-black">
                  {idx + 1}
                </div>
                <h3 className="text-base font-black text-white print:text-black tracking-tight">{section.title}</h3>
              </div>
              <div className="ml-9 text-sm text-white/70 print:text-slate-800 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Declaration Box */}
        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-5 mt-8 print:bg-slate-50 print:border-slate-300">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-violet-400 text-[22px] shrink-0 mt-0.5 print:hidden">task_alt</span>
            <div>
              <p className="text-white font-bold text-sm print:text-black">Declaration & Acceptance Confirmation</p>
              <p className="text-white/70 text-xs mt-1 leading-relaxed print:text-slate-700">
                I have read and agree to abide by this Policy. By maintaining an active account with SHRAWELLO Travel Hub & Events LLP,
                I reaffirm my commitment to these terms and conditions.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 print:border-slate-300 print:text-slate-600">
                <span>Electronically accepted by: <strong>{partner.name}</strong></span>
                <span>Date: <strong>{agreedDateFormatted}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Official Footer / Seal */}
        <div className="text-center pt-4 border-t border-white/10 text-xs text-white/40 print:border-slate-300 print:text-slate-600">
          <p>© {new Date().getFullYear()} SHRAWELLO Travel Hub & Events LLP. All Rights Reserved.</p>
          <p className="mt-1 text-[10px]">Independent Referral Associate Program Document • Version {agreedVersion}</p>
        </div>
      </div>
    </div>
  );
};
