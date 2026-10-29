import React, { useState } from 'react';
import { api } from '../../src/lib/api';
import { copyToClipboard } from '../../utils/clipboard';
import { toast } from 'sonner';
import { 
    FileText, Copy, MessageCircle, Check, Loader2, 
    ExternalLink, CheckCircle2, X, Share2, QrCode
} from 'lucide-react';

interface TripFormShareButtonProps {
    leadId?: string;
    bookingId?: string;
    customerId?: string;
    clientName?: string;
    clientPhone?: string;
    status?: 'Not Sent' | 'Sent' | 'Submitted' | 'Reviewed' | string;
    variant?: 'button' | 'icon' | 'badge-button';
    className?: string;
}

export const TripFormShareButton: React.FC<TripFormShareButtonProps> = ({
    leadId,
    bookingId,
    customerId,
    clientName,
    clientPhone,
    status = 'Not Sent',
    variant = 'button',
    className = ''
}) => {
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [modalData, setModalData] = useState<{ url: string; waText: string } | null>(null);

    const generateLink = async () => {
        setLoading(true);
        try {
            const res = await api.generateTripFormLink({
                leadId,
                bookingId,
                customerId
            });
            return res;
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate trip form link');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const res = await generateLink();
        if (!res || !res.shareableUrl) return;

        const success = await copyToClipboard(res.shareableUrl);
        if (success) {
            setCopied(true);
            toast.success('Trip form link copied to clipboard!');
            setTimeout(() => setCopied(false), 2500);
            setShowMenu(false);
        } else {
            // In case automatic copy was blocked by browser sandbox/HTTP, open the interactive modal
            setModalData({
                url: res.shareableUrl,
                waText: res.whatsappShareText
            });
            toast.info('Please copy the link from the share dialog');
        }
    };

    const handleWhatsApp = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const res = await generateLink();
        if (!res || !res.shareableUrl) return;

        const phone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
        const text = encodeURIComponent(res.whatsappShareText || `Hello ${clientName || 'Valued Traveler'}! Please fill your trip preferences here: ${res.shareableUrl}`);
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        
        window.open(waUrl, '_blank', 'noreferrer');
        setShowMenu(false);
        toast.success('Opening WhatsApp with pre-composed trip form link!');
    };

    const handleOpenInNewTab = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const res = await generateLink();
        if (!res || !res.shareableUrl) return;
        window.open(res.shareableUrl, '_blank', 'noreferrer');
        setShowMenu(false);
    };

    const handleOpenShareModal = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const res = await generateLink();
        if (!res || !res.shareableUrl) return;
        setModalData({
            url: res.shareableUrl,
            waText: res.whatsappShareText
        });
        setShowMenu(false);
    };

    const isSubmitted = status === 'Submitted';

    // ─── Modal Dialog Component (rendered when modalData is set) ───
    const renderShareModal = () => {
        if (!modalData) return null;
        return (
            <div 
                className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                onClick={(e) => { e.stopPropagation(); setModalData(null); }}
            >
                <div 
                    className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 text-left font-sans"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                    Customer Trip Details Form
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    {clientName ? `For: ${clientName}` : 'Self-service traveler form'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setModalData(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Shareable Public Link
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={modalData.url}
                                onFocus={(e) => e.target.select()}
                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    const ok = await copyToClipboard(modalData.url);
                                    if (ok) {
                                        toast.success('Link copied to clipboard!');
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    } else {
                                        toast.error('Press Ctrl+C to copy the highlighted link');
                                    }
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                const phone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
                                const text = encodeURIComponent(modalData.waText || `Hello! Please fill your trip details: ${modalData.url}`);
                                const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
                                window.open(waUrl, '_blank', 'noreferrer');
                            }}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                        >
                            <MessageCircle size={15} />
                            <span>WhatsApp Form</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.open(modalData.url, '_blank', 'noreferrer')}
                            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                        >
                            <ExternalLink size={15} />
                            <span>Open Form</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Variant 1: Badge button for table rows
    if (variant === 'badge-button') {
        return (
            <div className={`relative inline-block ${className}`} onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all shadow-xs ${
                        isSubmitted
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                    }`}
                    title={isSubmitted ? "Client submitted trip requirements & passenger list" : "Share customer trip form link"}
                >
                    {loading ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : isSubmitted ? (
                        <CheckCircle2 size={12} className="text-emerald-600" />
                    ) : (
                        <FileText size={12} className="text-amber-600" />
                    )}
                    <span>{isSubmitted ? 'Trip Form ✓' : 'Trip Form'}</span>
                </button>

                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-[250] animate-in fade-in zoom-in-95 text-left">
                        <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700/60 mb-1 flex items-center justify-between">
                            <span>Customer Trip Form</span>
                            <span className={isSubmitted ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                {isSubmitted ? 'Submitted' : 'Pending'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                        >
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-amber-500" />}
                            <span>{copied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors"
                        >
                            <MessageCircle size={14} className="text-emerald-500" />
                            <span>Send via WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink size={13} />
                            <span>Preview Form Page</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenShareModal}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700/50 mt-1 pt-1.5"
                        >
                            <Share2 size={13} />
                            <span>Share Dialog & Link</span>
                        </button>
                    </div>
                )}

                {renderShareModal()}
            </div>
        );
    }

    // Variant 2: Icon only (for compact mobile list rows)
    if (variant === 'icon') {
        return (
            <div className={`relative inline-block ${className}`} onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    disabled={loading}
                    title={isSubmitted ? "Trip Form Submitted (Click to copy/share)" : "Share Trip Details Form Link"}
                    className={`p-1 rounded-md transition-colors ${
                        isSubmitted
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                >
                    {loading ? (
                        <Loader2 size={13} className="animate-spin" />
                    ) : isSubmitted ? (
                        <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                        <FileText size={13} />
                    )}
                </button>

                {showMenu && (
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 animate-in fade-in zoom-in-95 text-left">
                        <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                            Trip Requirements Link
                        </div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            {copied ? 'Copied Link!' : 'Copy Form Link'}
                        </button>
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2"
                        >
                            <MessageCircle size={13} />
                            Send via WhatsApp
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                        >
                            <ExternalLink size={13} />
                            Open Form
                        </button>
                    </div>
                )}

                {renderShareModal()}
            </div>
        );
    }

    // Variant 3: Default full button set (for modal headers)
    return (
        <div className={`relative inline-flex items-center gap-2 ${className}`}>
            <button
                type="button"
                onClick={handleCopy}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs ${
                    isSubmitted
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/60 hover:bg-amber-100'
                }`}
                title="Copy Customer Self-Service Trip Details Form Link"
            >
                {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : copied ? (
                    <Check size={14} className="text-emerald-600" />
                ) : (
                    <Copy size={14} className="text-amber-600" />
                )}
                <span>{copied ? 'Link Copied!' : 'Copy Trip Form Link'}</span>
            </button>

            <button
                type="button"
                onClick={handleWhatsApp}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs hover:scale-[1.02]"
                title="Send Trip Form directly to Customer via WhatsApp"
            >
                <MessageCircle size={15} />
                <span>WhatsApp Form</span>
            </button>

            <button
                type="button"
                onClick={handleOpenInNewTab}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
                title="Open Form in New Tab"
            >
                <ExternalLink size={15} />
            </button>

            {renderShareModal()}
        </div>
    );
};
