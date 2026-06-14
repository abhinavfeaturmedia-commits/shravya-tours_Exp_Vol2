import React from 'react';

interface Props {
    className?: string;
    showLabel?: boolean;
}

export const PaymentLogos: React.FC<Props> = ({ className = '', showLabel = true }) => {
    return (
        <div className={`flex flex-col gap-2.5 ${className}`}>
            {showLabel && (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined text-[13px] text-emerald-500">shield_lock</span>
                    100% Safe & Secure Payments
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                {/* UPI Badge */}
                <div 
                    className="flex h-8 px-3 items-center justify-center bg-white border border-slate-200/85 rounded-lg shadow-xs hover:border-slate-350 hover:shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 select-none"
                    title="UPI (Unified Payments Interface)"
                >
                    <img 
                        src="/payments/upi.svg" 
                        alt="UPI" 
                        className="h-3.5 w-auto object-contain"
                        loading="lazy"
                    />
                </div>

                {/* Google Pay (GPay) Badge */}
                <div 
                    className="flex h-8 px-3 items-center justify-center bg-white border border-slate-200/85 rounded-lg shadow-xs hover:border-slate-350 hover:shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 select-none"
                    title="Google Pay"
                >
                    <img 
                        src="/payments/googlepay.svg" 
                        alt="Google Pay" 
                        className="h-3.5 w-auto object-contain"
                        loading="lazy"
                    />
                </div>

                {/* PhonePe Badge */}
                <div 
                    className="flex h-8 px-3 items-center justify-center bg-white border border-slate-200/85 rounded-lg shadow-xs hover:border-slate-350 hover:shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 select-none"
                    title="PhonePe"
                >
                    <img 
                        src="/payments/phonepe.svg" 
                        alt="PhonePe" 
                        className="h-3.5 w-auto object-contain"
                        loading="lazy"
                    />
                </div>

                {/* Paytm Badge */}
                <div 
                    className="flex h-8 px-3 items-center justify-center bg-white border border-slate-200/85 rounded-lg shadow-xs hover:border-slate-350 hover:shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 select-none"
                    title="Paytm"
                >
                    <img 
                        src="/payments/paytm.svg" 
                        alt="Paytm" 
                        className="h-3.5 w-auto object-contain"
                        loading="lazy"
                    />
                </div>

                {/* Bank Transfer Badge (IMPS & RTGS) */}
                <div 
                    className="flex h-8 px-3 items-center gap-2 bg-white border border-slate-200/85 rounded-lg shadow-xs hover:border-slate-350 hover:shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 select-none"
                    title="Bank Transfer (IMPS, RTGS available)"
                >
                    <span className="material-symbols-outlined text-[15px] text-slate-500">account_balance</span>
                    <div className="flex flex-col leading-none text-left">
                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight">Bank Transfer</span>
                        <span className="text-[7px] font-bold text-slate-400">IMPS / RTGS</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
