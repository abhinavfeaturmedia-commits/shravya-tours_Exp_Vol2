import React, { useState, useEffect, useRef, useId } from 'react';
import {
    Send, X, Sparkles, User, Mic, MicOff, Compass, ExternalLink, Star,
    MessageCircle, CheckCircle2, ShieldCheck, RotateCcw, Copy, Check,
    MapPin, Tag, ArrowRight, Clock, Lock
} from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { BotAvatar } from 'bot-avatars';
import { COMPANY_WHATSAPP } from '../../src/lib/constants';
import { toast } from 'sonner';

interface MatchedPackage {
    id: string | number;
    title: string;
    price: number | string;
    location: string;
    days: number;
    tag?: string;
    image?: string;
    rating?: number;
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    message: string;
    timestamp: Date;
    suggestions?: string[];
    matchedPackages?: MatchedPackage[];
}

interface TravelerProfile {
    name: string;
    phone: string;
    email?: string;
    destination?: string;
    leadId?: string;
}

const DEFAULT_SUGGESTIONS = [
    "🏔️ 5-Day Kashmir Honeymoon",
    "🏖️ Goa Getaway Under ₹20k",
    "❄️ Manali Family Snow Tour",
    "🚗 Private Outstation Cab",
    "💎 Membership Perks"
];

const DESTINATION_OPTIONS = [
    { label: "🏔️ Kashmir", value: "Kashmir" },
    { label: "🏖️ Goa", value: "Goa" },
    { label: "❄️ Himachal", value: "Himachal" },
    { label: "🌴 Kerala", value: "Kerala" },
    { label: "🚗 Outstation Cab", value: "Outstation Cab" },
    { label: "✨ Custom Trip", value: "Custom Trip" }
];

export const PublicChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [visitorId, setVisitorId] = useState('');
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
    const [activeSuggestions, setActiveSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

    // Pre-Chat Lead Gate & Traveler Profile States
    const [traveler, setTraveler] = useState<TravelerProfile | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [leadDest, setLeadDest] = useState('');
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [leadFormError, setLeadFormError] = useState('');
    const [fieldError, setFieldError] = useState<'name' | 'phone' | null>(null);

    // Proactive Floating Hook Teaser Bubble State
    const [showHookTeaser, setShowHookTeaser] = useState(false);

    const dialogRef = useRef<HTMLDialogElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const dialogTitleId = useId();
    const gateHeadingId = useId();
    const nameId = useId();
    const phoneId = useId();
    const phoneHintId = useId();
    const errorId = useId();
    const chatInputId = useId();

    const initGenericWelcome = () => {
        setMessages([
            {
                id: 'welcome',
                sender: 'ai',
                message: `### Welcome to Shrawello Trip Planner ✨\n\nTell me where you want to go, your travel dates, and group size—I'll craft a **custom day-by-day holiday itinerary** with handpicked stays, private cab, and transparent all-inclusive pricing in 15 seconds.\n\n**Who is traveling?** Tap an option below or type your dream destination:`,
                timestamp: new Date(),
                suggestions: [
                    "💑 Couple / Honeymoon",
                    "👨‍👩‍👧 Family with Kids / Parents",
                    "🏔️ Friends & Adventure Group",
                    "💼 Corporate / Solo Trip"
                ]
            }
        ]);
    };

    const initPersonalizedWelcome = (fullName: string, dest?: string) => {
        const firstName = fullName.split(' ')[0] || fullName;
        setMessages([
            {
                id: 'welcome',
                sender: 'ai',
                message: `### Welcome, ${firstName}! ✨\n\nYour **Free Custom Itinerary & ₹2,500 Early-Bird Trip Credit** are unlocked! Every quote includes handpicked stays, a verified private cab, tolls, parking, and **7-day free date rescheduling**.\n\n${dest ? `I see you're eyeing **${dest}**! ` : ''}Share your rough travel dates & group size, and I'll build your personalized plan right away:`,
                timestamp: new Date(),
                suggestions: dest ? [
                    `🏔️ 5-Day ${dest} Plan`,
                    `💰 ${dest} Under ₹25k`,
                    "💑 Couple / Honeymoon",
                    "👨‍👩‍👧 Family Trip"
                ] : [
                    "🏔️ 5-Day Kashmir Honeymoon",
                    "🏖️ Goa Getaway Under ₹20k",
                    "❄️ Manali Family Snow Tour",
                    "🚗 Private Outstation Cab"
                ]
            }
        ]);
    };

    // Initialise session, returning traveler memory & opening greeting
    useEffect(() => {
        let sId = sessionStorage.getItem('shrawello_chatbot_session');
        if (!sId) {
            sId = `SESS-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            sessionStorage.setItem('shrawello_chatbot_session', sId);
        }
        setSessionId(sId);

        let vId = localStorage.getItem('shrawello_visitor_id');
        if (!vId) {
            vId = `VIS-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            localStorage.setItem('shrawello_visitor_id', vId);
        }
        setVisitorId(vId);

        const savedLeadStr = localStorage.getItem('shrawello_lead_profile');
        if (savedLeadStr) {
            try {
                const parsed = JSON.parse(savedLeadStr);
                if (parsed.name && parsed.phone) {
                    setTraveler(parsed);
                    setIsRegistered(true);
                    setLeadName(parsed.name);
                    setLeadPhone(parsed.phone);
                    setLeadDest(parsed.destination || '');
                    initPersonalizedWelcome(parsed.name, parsed.destination);
                } else {
                    initGenericWelcome();
                }
            } catch {
                initGenericWelcome();
            }
        } else {
            initGenericWelcome();
        }

        const teaserTimer = setTimeout(() => {
            setShowHookTeaser(true);
        }, 4500);

        return () => clearTimeout(teaserTimer);
    }, []);

    // Non-modal <dialog> visibility sync (page remains scrollable & interactive behind widget)
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                try {
                    dialog.show();
                } catch {
                    dialog.setAttribute('open', '');
                }
            }
            requestAnimationFrame(() => {
                if (isRegistered) {
                    chatInputRef.current?.focus();
                } else {
                    nameInputRef.current?.focus();
                }
            });
        } else if (dialog.open) {
            dialog.close();
        }
    }, [isOpen, isRegistered]);

    // Sync Esc-key dismissal back to React state
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const onClose = () => setIsOpen(false);
        dialog.addEventListener('close', onClose);
        return () => dialog.removeEventListener('close', onClose);
    }, []);

    // Smooth auto-scroll to latest message
    useEffect(() => {
        if (isOpen && isRegistered) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages, isLoading, isOpen, isRegistered]);

    // Pre-Chat Lead Gate Submission (Hormozi Low-Friction Opt-In)
    const handlePreChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLeadFormError('');
        setFieldError(null);

        const cleanName = leadName.trim();
        const cleanPhone = leadPhone.trim().replace(/\D/g, '');

        if (!cleanName || cleanName.length < 2) {
            setLeadFormError('Please enter your name so we can personalize your itinerary.');
            setFieldError('name');
            nameInputRef.current?.focus();
            return;
        }

        if (!cleanPhone || cleanPhone.length < 10) {
            setLeadFormError('Please enter a valid 10-digit WhatsApp number.');
            setFieldError('phone');
            phoneInputRef.current?.focus();
            return;
        }

        setIsSubmittingLead(true);

        try {
            const res = await fetch('/api/public/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: cleanName,
                    phone: cleanPhone,
                    email: null,
                    destination: leadDest || 'Custom Tour Inquiry',
                    source: 'AI Trip Planner',
                    priority: 'High',
                    type: 'Tour',
                    status: 'New',
                    preferences: {
                        initialDestination: leadDest || 'General',
                        channel: 'AI Trip Planner',
                        tripCreditUnlocked: 2500,
                        sessionId
                    }
                })
            });

            const data = await res.json();
            const createdLeadId = data?.id || data?.leadId || `LD-${Date.now()}`;

            const newProfile: TravelerProfile = {
                name: cleanName,
                phone: cleanPhone,
                destination: leadDest,
                leadId: createdLeadId
            };

            localStorage.setItem('shrawello_lead_profile', JSON.stringify(newProfile));
            setTraveler(newProfile);
            setIsRegistered(true);
            setLeadCaptured(true);
            setTimeout(() => setLeadCaptured(false), 7000);

            initPersonalizedWelcome(cleanName, leadDest);

            if (leadDest) {
                setTimeout(() => {
                    handleSendMessage(`I'd love a custom trip plan for ${leadDest}!`, newProfile);
                }, 350);
            }
        } catch (err) {
            console.error('Failed to submit pre-chat lead:', err);
            const fallbackProfile: TravelerProfile = {
                name: cleanName,
                phone: cleanPhone,
                destination: leadDest
            };
            localStorage.setItem('shrawello_lead_profile', JSON.stringify(fallbackProfile));
            setTraveler(fallbackProfile);
            setIsRegistered(true);
            initPersonalizedWelcome(cleanName, leadDest);
        } finally {
            setIsSubmittingLead(false);
        }
    };

    const handleResetChat = () => {
        const newSessionId = `SESS-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem('shrawello_chatbot_session', newSessionId);
        setSessionId(newSessionId);
        if (traveler?.name) {
            initPersonalizedWelcome(traveler.name, traveler.destination);
        } else {
            initGenericWelcome();
        }
        setActiveSuggestions(DEFAULT_SUGGESTIONS);
    };

    const toggleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice input is not supported in this browser. Try Chrome, Edge, or Safari.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
                }
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.warn('Speech recognition initialization error:', err);
            setIsListening(false);
        }
    };

    const handleSendMessage = async (textToSend: string, explicitProfile?: TravelerProfile) => {
        if (!textToSend.trim() || isLoading) return;

        const currentProfile = explicitProfile || traveler;

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'user',
            message: textToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/public/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    visitorId,
                    message: textToSend,
                    travelerName: currentProfile?.name || '',
                    travelerPhone: currentProfile?.phone || '',
                    travelerEmail: currentProfile?.email || '',
                    leadId: currentProfile?.leadId || null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const aiMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                sender: 'ai',
                message: data.reply,
                timestamp: new Date(),
                suggestions: data.suggestions || [],
                matchedPackages: data.matchedPackages || []
            };

            setMessages(prev => [...prev, aiMsg]);

            if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                setActiveSuggestions(data.suggestions);
            }

            if (data.leadCreated) {
                setLeadCaptured(true);
                setTimeout(() => setLeadCaptured(false), 7000);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMsg: ChatMessage = {
                id: `msg-err-${Date.now()}`,
                sender: 'ai',
                message: "I'm having trouble reaching our trip planner right now. Tap **WhatsApp** at the top to chat directly with our travel specialist!",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(input);
    };

    const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) {
            e.preventDefault();
        }
    };

    const handleQuickReply = (option: string) => {
        handleSendMessage(option);
    };

    const copyCouponCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCoupon(code);
        setTimeout(() => setCopiedCoupon(null), 3000);
    };

    const openWhatsAppHandoff = () => {
        const nameIntro = traveler?.name ? `I am ${traveler.name}` : `I am exploring holiday packages on your website`;
        const destIntro = traveler?.destination ? ` for ${traveler.destination}` : '';
        const waText = encodeURIComponent(`Hi Shrawello Travel Hub! ${nameIntro} and would love a custom trip quote${destIntro} with my ₹2,500 early-bird trip credit.`);
        window.open(`https://wa.me/${COMPANY_WHATSAPP}?text=${waText}`, '_blank', 'noopener,noreferrer');
    };

    const formatPrice = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val;
        if (isNaN(num)) return val;
        return `₹${Math.round(num).toLocaleString('en-IN')}`;
    };

    const renderRichContent = (rawText: string) => {
        if (!rawText) return null;
        const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];

        lines.forEach((line, lineIdx) => {
            const trimmed = line.trim();
            if (!trimmed) {
                elements.push(<div key={`spacer-${lineIdx}`} className="h-1.5" />);
                return;
            }

            if (/^(---|___|\*\*\*)$/.test(trimmed)) {
                elements.push(<hr key={`hr-${lineIdx}`} className="my-2.5 border-slate-200 dark:border-slate-700/80" />);
                return;
            }

            if (trimmed.startsWith('### ')) {
                elements.push(
                    <h4 key={`h3-${lineIdx}`} className="text-[13px] font-bold text-slate-900 dark:text-white mt-1.5 mb-1 flex items-center gap-1.5 tracking-tight">
                        <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                        {parseInlineStyles(trimmed.replace('### ', ''))}
                    </h4>
                );
                return;
            }
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h3 key={`h2-${lineIdx}`} className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1 tracking-tight">
                        {parseInlineStyles(trimmed.replace('## ', ''))}
                    </h3>
                );
                return;
            }

            const dayMatch = trimmed.match(/^(?:[-*•]\s*)?(\bDay\s*\d+[\s:-]+)(.*)$/i);
            if (dayMatch) {
                elements.push(
                    <div key={`day-${lineIdx}`} className="flex items-start gap-2 my-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                        <div className="size-5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {dayMatch[1].replace(/[^0-9]/g, '') || '•'}
                        </div>
                        <div className="flex-1 min-w-0 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            <span className="font-bold text-amber-700 dark:text-amber-400 mr-1">{dayMatch[1]}</span>
                            {parseInlineStyles(dayMatch[2])}
                        </div>
                    </div>
                );
                return;
            }

            if (/^[-*•]\s+/.test(trimmed)) {
                const bulletContent = trimmed.replace(/^[-*•]\s+/, '');
                elements.push(
                    <div key={`bullet-${lineIdx}`} className="flex items-start gap-2 my-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed pl-0.5">
                        <span className="size-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">{parseInlineStyles(bulletContent)}</div>
                    </div>
                );
                return;
            }

            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
                elements.push(
                    <div key={`num-${lineIdx}`} className="flex items-start gap-2 my-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed pl-0.5">
                        <span className="size-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {numMatch[1]}
                        </span>
                        <div className="flex-1 min-w-0">{parseInlineStyles(numMatch[2])}</div>
                    </div>
                );
                return;
            }

            elements.push(
                <p key={`p-${lineIdx}`} className="my-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                    {parseInlineStyles(trimmed)}
                </p>
            );
        });

        return <div className="space-y-0.5">{elements}</div>;
    };

    const parseInlineStyles = (content: string): React.ReactNode => {
        const tokens: React.ReactNode[] = [];
        let remaining = content;
        let keyCounter = 0;

        while (remaining.length > 0) {
            const linkMatch = remaining.match(/\[([^\]]+)\]\((#\/packages\/[^)]+)\)/);
            const couponMatch = remaining.match(/\[([A-Z0-9_-]{5,20})\]|`([A-Z0-9_-]{5,20})`/);
            const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

            const matches = [
                { type: 'link', match: linkMatch, index: linkMatch ? linkMatch.index! : Infinity },
                { type: 'coupon', match: couponMatch, index: couponMatch ? couponMatch.index! : Infinity },
                { type: 'bold', match: boldMatch, index: boldMatch ? boldMatch.index! : Infinity }
            ].sort((a, b) => a.index - b.index);

            const closest = matches[0];

            if (!closest || closest.index === Infinity) {
                tokens.push(remaining);
                break;
            }

            if (closest.index > 0) {
                tokens.push(remaining.substring(0, closest.index));
            }

            if (closest.type === 'link' && closest.match) {
                const linkText = closest.match[1];
                const href = closest.match[2];
                tokens.push(
                    <a
                        key={`link-${keyCounter++}`}
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded-md transition-colors border border-indigo-200/70 dark:border-indigo-800/60 mx-0.5 align-middle"
                    >
                        <span>{linkText}</span>
                        <ExternalLink className="size-2.5 inline" />
                    </a>
                );
                remaining = remaining.substring(closest.index + closest.match[0].length);
            } else if (closest.type === 'coupon' && closest.match) {
                const code = closest.match[1] || closest.match[2];
                const isCopied = copiedCoupon === code;
                tokens.push(
                    <button
                        key={`coupon-${keyCounter++}`}
                        type="button"
                        onClick={() => copyCouponCode(code)}
                        title="Click to copy coupon code"
                        className={`inline-flex items-center gap-1 font-mono font-bold text-[10.5px] px-2 py-0.5 rounded-lg border transition-all mx-0.5 align-middle ${
                            isCopied
                                ? 'bg-emerald-500 text-white border-emerald-400'
                                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        }`}
                    >
                        <Tag className="size-2.5 shrink-0" />
                        <span>{code}</span>
                        {isCopied ? <Check className="size-2.5 text-white" /> : <Copy className="size-2.5 opacity-70" />}
                    </button>
                );
                remaining = remaining.substring(closest.index + closest.match[0].length);
            } else if (closest.type === 'bold' && closest.match) {
                const boldText = closest.match[1];
                tokens.push(
                    <strong key={`bold-${keyCounter++}`} className="font-bold text-slate-900 dark:text-white">
                        {boldText}
                    </strong>
                );
                remaining = remaining.substring(closest.index + closest.match[0].length);
            }
        }

        return tokens.length > 0 ? tokens : content;
    };

    return (
        <div className="font-sans">
            {/* Lead Captured Toast Notification */}
            {leadCaptured && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-80 bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-start gap-3 border border-emerald-400/40 z-[10000]"
                >
                    <CheckCircle2 className="size-5 text-emerald-100 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs">Trip Credit & Request Saved</h4>
                        <p className="text-[11px] text-emerald-50 leading-snug mt-0.5">
                            Your ₹2,500 early-bird trip credit is active. Our travel planner is ready to help!
                        </p>
                    </div>
                </div>
            )}

            {/* Non-Modal Floating Chat Panel (<dialog> without bare display:flex so closed state stays hidden) */}
            <dialog
                ref={dialogRef}
                aria-labelledby={dialogTitleId}
                className="hidden open:flex flex-col fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 m-0 p-0 w-full h-full sm:w-[400px] sm:h-[590px] sm:max-h-[calc(100vh-3rem)] shadow-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-0 sm:border border-slate-200/90 dark:border-slate-800 z-[9999]"
            >
                {/* Clean Concierge Header */}
                <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className="size-9 rounded-xl bg-slate-800 flex items-center justify-center border border-white/15 overflow-hidden">
                                <BotAvatar type="ghost" size={34} state={isLoading ? 'working' : 'default'} />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 id={dialogTitleId} className="font-bold text-sm tracking-tight text-white truncate">
                                    Shrawello Trip Planner
                                </h2>
                                {traveler?.name && (
                                    <button
                                        type="button"
                                        onClick={() => setIsRegistered(false)}
                                        title="Edit your contact details"
                                        className="text-[10px] bg-white/10 hover:bg-white/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                    >
                                        <User className="size-2.5" />
                                        <span className="truncate max-w-[60px]">{traveler.name.split(' ')[0]}</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                                <span>Replies in seconds • Personal Holiday Concierge</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {isRegistered && (
                            <button
                                type="button"
                                onClick={handleResetChat}
                                title="Start fresh chat"
                                aria-label="Start fresh chat"
                                className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                                <RotateCcw className="size-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={openWhatsAppHandoff}
                            title="Chat with our travel expert on WhatsApp"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-semibold border border-emerald-400/30 cursor-pointer"
                        >
                            <MessageCircle className="size-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-xl hover:bg-white/15 transition-colors text-slate-300 hover:text-white cursor-pointer"
                            aria-label="Close trip planner"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </header>

                {/* Pre-Chat Gate OR Active Conversation */}
                {!isRegistered ? (
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
                        <div className="space-y-4">
                            {/* Clean Hormozi Customer Offer Hero */}
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                                    <Sparkles className="size-3 text-amber-500" />
                                    <span>Free Custom Itinerary + ₹2,500 Trip Credit</span>
                                </div>
                                <h3 id={gateHeadingId} className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                                    Plan Your Dream Trip in 15 Seconds
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
                                    Handpicked stays, private cab &amp; transparent all-inclusive pricing—zero hidden charges.
                                </p>
                                <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
                                        <Star className="size-3 text-amber-500 fill-amber-500" /> 4.9 (1,200+ Trips)
                                    </span>
                                    <span aria-hidden="true">•</span>
                                    <span>Free Rescheduling</span>
                                    <span aria-hidden="true">•</span>
                                    <span>Price Match</span>
                                </div>
                            </div>

                            {/* Accessible Error Banner */}
                            {leadFormError && (
                                <div
                                    id={errorId}
                                    role="alert"
                                    aria-live="polite"
                                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2"
                                >
                                    <X className="size-3.5 shrink-0" />
                                    <span>{leadFormError}</span>
                                </div>
                            )}

                            {/* Clean 2-Field + 1-Tap Destination Form */}
                            <form onSubmit={handlePreChatSubmit} noValidate aria-labelledby={gateHeadingId} className="space-y-3.5">
                                <div>
                                    <label htmlFor={nameId} className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                        Your Full Name <span className="text-rose-500" aria-hidden="true">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            ref={nameInputRef}
                                            id={nameId}
                                            name="name"
                                            type="text"
                                            autoComplete="name"
                                            enterKeyHint="next"
                                            required
                                            aria-invalid={fieldError === 'name' ? true : undefined}
                                            aria-describedby={fieldError === 'name' ? errorId : undefined}
                                            value={leadName}
                                            onChange={(e) => {
                                                setLeadName(e.target.value);
                                                if (fieldError === 'name') {
                                                    setFieldError(null);
                                                    setLeadFormError('');
                                                }
                                            }}
                                            placeholder="e.g. Rahul Sharma"
                                            className="w-full min-h-[44px] pl-9 pr-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor={phoneId} className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                        WhatsApp Number <span className="text-rose-500" aria-hidden="true">*</span>
                                    </label>
                                    <div className={`flex rounded-xl overflow-hidden border bg-slate-50 dark:bg-slate-800/90 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-colors ${
                                        fieldError === 'phone' ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'
                                    }`}>
                                        <span className="px-3 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 shrink-0 select-none">
                                            🇮🇳 +91
                                        </span>
                                        <input
                                            ref={phoneInputRef}
                                            id={phoneId}
                                            name="tel"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            enterKeyHint="done"
                                            maxLength={10}
                                            required
                                            aria-invalid={fieldError === 'phone' ? true : undefined}
                                            aria-describedby={`${phoneHintId}${fieldError === 'phone' ? ` ${errorId}` : ''}`}
                                            value={leadPhone}
                                            onChange={(e) => {
                                                setLeadPhone(e.target.value.replace(/\D/g, ''));
                                                if (fieldError === 'phone') {
                                                    setFieldError(null);
                                                    setLeadFormError('');
                                                }
                                            }}
                                            placeholder="10-digit mobile number"
                                            className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-transparent focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                        />
                                    </div>
                                    <p id={phoneHintId} className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                        We&apos;ll send your custom itinerary &amp; ₹2,500 credit here.
                                    </p>
                                </div>

                                <fieldset>
                                    <legend className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                                        Where would you like to go? <span className="text-slate-400 font-normal">(optional)</span>
                                    </legend>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DESTINATION_OPTIONS.map((dest) => {
                                            const selected = leadDest === dest.value;
                                            return (
                                                <button
                                                    key={dest.value}
                                                    type="button"
                                                    aria-pressed={selected}
                                                    onClick={() => setLeadDest(selected ? '' : dest.value)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                                                        selected
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    {dest.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>

                                <button
                                    type="submit"
                                    disabled={isSubmittingLead}
                                    className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                                >
                                    {isSubmittingLead ? (
                                        <>
                                            <ThinkingOrb size={20} state="composing" theme="dark" />
                                            <span>Preparing Your Trip Planner...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Get My Free Itinerary &amp; ₹2,500 Credit</span>
                                            <ArrowRight className="size-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Minimal 1-Line Privacy Footer */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                                <Lock className="size-3 text-emerald-500 shrink-0" />
                                <span>100% private &amp; spam-free • Takes 15 seconds</span>
                            </p>
                            {traveler?.name && (
                                <button
                                    type="button"
                                    onClick={() => setIsRegistered(true)}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold mt-1 inline-block cursor-pointer"
                                >
                                    Resume chat as {traveler.name} →
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Active Chat Messages Body */}
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/60">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-2.5 max-w-[92%] break-words ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                                >
                                    <div className={`size-7 rounded-full shrink-0 flex items-center justify-center text-white mt-0.5 overflow-hidden ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-slate-900'}`}>
                                        {msg.sender === 'user' ? <User className="size-3.5" /> : <BotAvatar type="ghost" size={26} state="default" />}
                                    </div>

                                    <div className={`p-3.5 rounded-2xl ${
                                        msg.sender === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm text-xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-sm shadow-xs'
                                    }`}>
                                        {msg.sender === 'user' ? (
                                            <p className="text-xs leading-relaxed">{msg.message}</p>
                                        ) : (
                                            renderRichContent(msg.message)
                                        )}

                                        {/* Clean Interactive Package Cards */}
                                        {msg.matchedPackages && msg.matchedPackages.length > 0 && (
                                            <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Recommended Holiday Packages
                                                </p>
                                                {msg.matchedPackages.map((pkg) => (
                                                    <div
                                                        key={pkg.id}
                                                        className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-2.5 flex flex-col gap-2"
                                                    >
                                                        <div className="flex gap-2.5 items-center">
                                                            <div className="size-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 relative">
                                                                {pkg.image ? (
                                                                    <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                                                                        <Compass className="size-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{pkg.title}</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                    <span className="flex items-center gap-0.5"><Clock className="size-2.5" /> {pkg.days} Days</span>
                                                                    <span>•</span>
                                                                    <span className="flex items-center gap-0.5 truncate"><MapPin className="size-2.5" /> {pkg.location}</span>
                                                                </p>
                                                                <div className="mt-1 flex items-baseline gap-1">
                                                                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                        {formatPrice(pkg.price)}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">all-inclusive</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                                            <a
                                                                href={`#/packages/${pkg.id}`}
                                                                onClick={() => setIsOpen(false)}
                                                                className="flex-1 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                View Details
                                                                <ExternalLink className="size-2.5" />
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuickReply(`Customize the ${pkg.title} package for my dates`)}
                                                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                            >
                                                                Customize Trip
                                                                <ArrowRight className="size-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <span className={`text-[9px] block mt-1.5 text-right ${msg.sender === 'user' ? 'text-white/75' : 'text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Typing Indicator */}
                            {isLoading && (
                                <div className="flex gap-2.5 max-w-[88%]" role="status" aria-live="polite">
                                    <div className="size-7 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5 overflow-hidden">
                                        <BotAvatar type="ghost" size={26} state="working" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-2.5">
                                        <ThinkingOrb size={20} state="composing" theme="auto" />
                                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                            Crafting your custom itinerary...
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Reply Chips */}
                        {activeSuggestions.length > 0 && (
                            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 scrollbar-none">
                                {activeSuggestions.map((sugg, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleQuickReply(sugg)}
                                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-600 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
                                    >
                                        {sugg}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Voice Listening Banner */}
                        {isListening && (
                            <div className="bg-slate-900 text-white border-t border-indigo-500/30 px-4 py-2 flex items-center justify-between text-xs shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span className="font-medium text-slate-100">Listening... Speak your trip idea</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                                >
                                    Stop
                                </button>
                            </div>
                        )}

                        {/* Chat Input Form */}
                        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
                            <label htmlFor={chatInputId} className="sr-only">
                                Ask about a destination, travel dates, or trip budget
                            </label>
                            <input
                                ref={chatInputRef}
                                id={chatInputId}
                                name="message"
                                type="text"
                                enterKeyHint="send"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleChatKeyDown}
                                placeholder="Where to? (e.g. 5-day Kashmir family trip)"
                                disabled={isLoading}
                                className="flex-1 min-h-[42px] px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-full text-base sm:text-xs bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder:text-slate-400"
                            />

                            <button
                                type="button"
                                onClick={toggleVoiceInput}
                                title={isListening ? 'Stop voice input' : 'Speak your trip query'}
                                aria-label={isListening ? 'Stop voice input' : 'Speak your trip query'}
                                className={`size-10 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                    isListening
                                        ? 'bg-rose-500 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                            </button>

                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="size-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-sm transition-all shrink-0 cursor-pointer"
                                aria-label="Send message"
                            >
                                <Send className="size-4" />
                            </button>
                        </form>
                    </>
                )}
            </dialog>

            {/* Floating Launcher & Subtle Hook Teaser (When closed) */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2.5">
                    {showHookTeaser && (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 px-3.5 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2.5 max-w-[270px]">
                            <button
                                type="button"
                                onClick={() => { setIsOpen(true); setShowHookTeaser(false); }}
                                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                            >
                                <div className="size-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                                    <Sparkles className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[11.5px] leading-tight text-white flex items-center gap-1.5">
                                        Free Trip Plan
                                        <span className="text-[9.5px] bg-emerald-500/25 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                                            ₹2,500 Off
                                        </span>
                                    </p>
                                    <p className="text-[10.5px] text-slate-300 leading-tight mt-0.5">
                                        Get your custom itinerary in 15 sec
                                    </p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowHookTeaser(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                                aria-label="Dismiss trip planner teaser"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => { setIsOpen(true); setShowHookTeaser(false); }}
                        className="size-15 rounded-full bg-slate-900 hover:bg-slate-800 hover:scale-105 border border-white/15 text-white flex items-center justify-center shadow-2xl transition-all duration-200 relative group cursor-pointer"
                        aria-label="Open Shrawello Trip Planner"
                    >
                        <div className="size-11 rounded-full flex items-center justify-center overflow-hidden">
                            <BotAvatar type="ghost" size={42} state="default" />
                        </div>

                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900" />
                        </span>

                        <span className="absolute right-17 scale-0 group-hover:scale-100 bg-slate-900/95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xl border border-white/10 transition-all origin-right flex items-center gap-1.5 whitespace-nowrap pointer-events-none">
                            <Sparkles className="size-3.5 text-amber-300" />
                            {traveler?.name ? `Resume Chat (${traveler.name.split(' ')[0]})` : 'Plan Your Trip'}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};
