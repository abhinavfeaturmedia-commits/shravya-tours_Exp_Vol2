import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, X, MessageSquare, Bot, Sparkles, User, HelpCircle, Gift, 
    Mic, MicOff, Compass, ExternalLink, Star, MessageCircle, 
    Flame, CheckCircle2, ChevronRight, ShieldCheck, RotateCcw, 
    Copy, Check, Calendar, MapPin, Tag, ArrowRight, Clock, Award 
} from 'lucide-react';
import { COMPANY_WHATSAPP } from '../../src/lib/constants';

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
    const [activeSuggestions, setActiveSuggestions] = useState<string[]>([
        "🏔️ 5-Day Kashmir Honeymoon",
        "🏖️ Goa Beach Getaway Under ₹20k",
        "❄️ Manali Family Snow Tour",
        "🚗 Book Outstation Taxi / Fleet",
        "💎 Membership Discounts"
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    // Initialise session & Hormozi opening greeting
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

        initWelcomeMessage();
    }, []);

    const initWelcomeMessage = () => {
        setMessages([
            {
                id: 'welcome',
                sender: 'ai',
                message: `### Welcome to Shrawello Travel Concierge! ✨\n\nI'm your **AI Travel Specialist**. Tell me where you want to travel, your dates & group size, and I'll craft you a **custom VIP day-by-day itinerary** with secret insider perks & early-bird rates in under 30 seconds!\n\n**Who are you traveling with?** Select your travel style below or type your dream destination:`,
                timestamp: new Date(),
                suggestions: [
                    "💑 Couple / Honeymoon",
                    "👨‍👩‍👧 Family with Kids / Parents",
                    "🏔️ Friends & Adventure Group",
                    "💼 Corporate / Solo Retreat"
                ]
            }
        ]);
    };

    // Scroll to bottom when messages or loading changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input on desktop when opened
    useEffect(() => {
        if (isOpen && window.innerWidth > 640) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Reset conversation
    const handleResetChat = () => {
        const newSessionId = `SESS-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem('shrawello_chatbot_session', newSessionId);
        setSessionId(newSessionId);
        initWelcomeMessage();
        setActiveSuggestions([
            "🏔️ 5-Day Kashmir Honeymoon",
            "🏖️ Goa Beach Getaway Under ₹20k",
            "❄️ Manali Family Snow Tour",
            "🚗 Book Outstation Taxi / Fleet",
            "💎 Membership Discounts"
        ]);
    };

    // Web Speech API Voice Recognition
    const toggleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
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

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
                }
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.warn("Speech recognition initialization error:", err);
            setIsListening(false);
        }
    };

    const handleSendMessage = async (textToSend: string) => {
        if (!textToSend.trim() || isLoading) return;

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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId,
                    visitorId,
                    message: textToSend
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
            
            if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                setActiveSuggestions(data.suggestions);
            }
            
            if (data.leadCreated) {
                setLeadCaptured(true);
                setTimeout(() => setLeadCaptured(false), 9000);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMsg: ChatMessage = {
                id: `msg-err-${Date.now()}`,
                sender: 'ai',
                message: "I am having trouble connecting to the travel servers right now. You can chat directly with our Senior Destination Concierge on WhatsApp for instant VIP assistance!",
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

    const handleQuickReply = (option: string) => {
        handleSendMessage(option);
    };

    const copyCouponCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCoupon(code);
        setTimeout(() => setCopiedCoupon(null), 3000);
    };

    const openWhatsAppHandoff = () => {
        const waText = encodeURIComponent(`Hi Shrawello Travel Hub! I am exploring tour packages on your website and would love a custom quote with early-bird discounts.`);
        window.open(`https://wa.me/${COMPANY_WHATSAPP}?text=${waText}`, '_blank');
    };

    // Format currency cleanly without unwanted decimals
    const formatPrice = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val;
        if (isNaN(num)) return val;
        return `₹${Math.round(num).toLocaleString('en-IN')}`;
    };

    // Advanced Rich Markdown & Content Parser
    const renderRichContent = (rawText: string) => {
        if (!rawText) return null;
        let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // Split into paragraphs / lines
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];

        lines.forEach((line, lineIdx) => {
            const trimmed = line.trim();
            if (!trimmed) {
                elements.push(<div key={`spacer-${lineIdx}`} className="h-1.5" />);
                return;
            }

            // Horizontal Divider (--- or ***)
            if (/^(---|___|\*\*\*)$/.test(trimmed)) {
                elements.push(<hr key={`hr-${lineIdx}`} className="my-2.5 border-slate-200 dark:border-slate-700/80" />);
                return;
            }

            // Headers (### or ## or #)
            if (trimmed.startsWith('### ')) {
                elements.push(
                    <h4 key={`h3-${lineIdx}`} className="text-xs font-black text-slate-900 dark:text-white mt-2 mb-1 flex items-center gap-1.5 tracking-tight">
                        <Sparkles className="size-3 text-amber-500 shrink-0" />
                        {parseInlineStyles(trimmed.replace('### ', ''))}
                    </h4>
                );
                return;
            }
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h3 key={`h2-${lineIdx}`} className="text-sm font-black text-slate-900 dark:text-white mt-2.5 mb-1 tracking-tight">
                        {parseInlineStyles(trimmed.replace('## ', ''))}
                    </h3>
                );
                return;
            }

            // Day-by-Day Timeline Parser (e.g. "Day 1:", "Day 2:", "• Day 1 -")
            const dayMatch = trimmed.match(/^(?:[-*•]\s*)?(\bDay\s*\d+[\s:-]+)(.*)$/i);
            if (dayMatch) {
                elements.push(
                    <div key={`day-${lineIdx}`} className="flex items-start gap-2 my-1 pl-1 bg-amber-500/5 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                        <div className="size-5 rounded-lg bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            {dayMatch[1].replace(/[^0-9]/g, '') || '•'}
                        </div>
                        <div className="flex-1 min-w-0 text-[11px] text-slate-800 dark:text-slate-200">
                            <span className="font-black text-amber-600 dark:text-amber-400 mr-1">{dayMatch[1]}</span>
                            {parseInlineStyles(dayMatch[2])}
                        </div>
                    </div>
                );
                return;
            }

            // Bullet Lists (- or * or •)
            if (/^[-*•]\s+/.test(trimmed)) {
                const bulletContent = trimmed.replace(/^[-*•]\s+/, '');
                elements.push(
                    <div key={`bullet-${lineIdx}`} className="flex items-start gap-2 my-1 text-[11px] text-slate-750 dark:text-slate-250 leading-snug pl-1">
                        <span className="size-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 shrink-0"></span>
                        <div className="flex-1 min-w-0">
                            {parseInlineStyles(bulletContent)}
                        </div>
                    </div>
                );
                return;
            }

            // Numbered Lists (1. 2. 3.)
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
                elements.push(
                    <div key={`num-${lineIdx}`} className="flex items-start gap-2 my-1 text-[11px] text-slate-750 dark:text-slate-250 leading-snug pl-1">
                        <span className="size-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                            {numMatch[1]}
                        </span>
                        <div className="flex-1 min-w-0">
                            {parseInlineStyles(numMatch[2])}
                        </div>
                    </div>
                );
                return;
            }

            // Standard Paragraph Line
            elements.push(
                <p key={`p-${lineIdx}`} className="my-1 text-[11.5px] leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
                    {parseInlineStyles(trimmed)}
                </p>
            );
        });

        return <div className="space-y-0.5">{elements}</div>;
    };

    // Helper to parse bold, italics, coupon badges, and package links inside text
    const parseInlineStyles = (content: string): React.ReactNode => {
        // Regex to split on markdown links [Text](#/packages/:id), Coupon codes [COUPON], and Bold **text**
        const tokens: React.ReactNode[] = [];
        let remaining = content;
        let keyCounter = 0;

        while (remaining.length > 0) {
            // Match 1: Markdown Package Link [Title](#/packages/id)
            const linkMatch = remaining.match(/\[([^\]]+)\]\((#\/packages\/[^)]+)\)/);
            // Match 2: Coupon Token e.g. `ONETIMECOUPON` or [ONETIMECOUPON] or code `...`
            const couponMatch = remaining.match(/\[([A-Z0-9_-]{5,20})\]|`([A-Z0-9_-]{5,20})`/);
            // Match 3: Bold **text**
            const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

            // Find closest match
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

            // Push preceding plain text
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
                        className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-1.5 py-0.5 rounded-md transition-all shadow-2xs border border-blue-200/60 dark:border-blue-700/50 mx-0.5 align-middle"
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
                        className={`inline-flex items-center gap-1 font-mono font-black text-[10px] px-2 py-0.5 rounded-lg border transition-all mx-0.5 align-middle shadow-2xs ${
                            isCopied 
                                ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse' 
                                : 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
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
                    <strong key={`bold-${keyCounter++}`} className="font-extrabold text-slate-900 dark:text-white">
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
                <div className="fixed bottom-24 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-2rem)] sm:w-84 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-3xl shadow-2xl flex items-start gap-3 border border-emerald-400/40 z-[10000] animate-bounce">
                    <div className="size-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                        <Sparkles className="size-5 text-amber-300 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xs tracking-tight flex items-center gap-1.5">
                            VIP Request Received! ✈️
                            <span className="text-[9px] bg-emerald-400/30 px-1.5 py-0.5 rounded-full font-bold uppercase">Locked</span>
                        </h4>
                        <p className="text-[11px] text-emerald-50 opacity-95 leading-snug mt-0.5">
                            Your trip request & early-bird rates have been forwarded. A Senior Concierge is preparing your custom quote!
                        </p>
                    </div>
                </div>
            )}

            {/* Chatbot Floating Window Modal */}
            {isOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 w-full h-full sm:w-[420px] sm:h-[630px] sm:max-h-[calc(100vh-3.5rem)] shadow-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-0 sm:border border-slate-200/90 dark:border-slate-800 flex flex-col z-[9999] transition-all duration-300">
                    
                    {/* Ultra-Luxury Concierge Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-3.5 px-4 flex items-center justify-between shadow-md shrink-0 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="size-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center border border-white/25 shadow-inner">
                                    <Bot className="size-5 text-white" />
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse"></span>
                            </div>
                            <div>
                                <h3 className="font-black text-xs tracking-tight flex items-center gap-1.5 text-white">
                                    Shrawello AI Concierge
                                    <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                                        PRO
                                    </span>
                                </h3>
                                <p className="text-[10px] text-slate-300/90 font-medium flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                    <span>Online • Instant Custom Itineraries</span>
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleResetChat}
                                title="Reset conversation"
                                className="p-1.5 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                            >
                                <RotateCcw className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={openWhatsAppHandoff}
                                title="Chat with Human Agent on WhatsApp"
                                className="p-1.5 px-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold border border-emerald-400/30"
                            >
                                <MessageCircle className="size-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsOpen(false)} 
                                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
                                aria-label="Close chat"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>

                    {/* Trust & Guarantee Banner */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border-b border-slate-200/80 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        <span className="flex items-center gap-1">
                            <Star className="size-3 text-amber-500 fill-amber-500" />
                            4.9★ Rated • 1,200+ Verified Trips
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                            <ShieldCheck className="size-3" /> Best Price Guarantee
                        </span>
                    </div>

                    {/* Chat Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/60">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`flex gap-2.5 max-w-[94%] break-words ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                            >
                                <div className={`size-7 rounded-full shrink-0 flex items-center justify-center text-white shadow-xs mt-1 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-tr from-slate-900 to-slate-700'}`}>
                                    {msg.sender === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                                </div>
                                
                                <div className={`p-3.5 rounded-2xl ${
                                    msg.sender === 'user' 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md font-medium text-xs' 
                                        : 'bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 rounded-tl-none shadow-sm'
                                }`}>
                                    
                                    {/* Render formatted message content */}
                                    {msg.sender === 'user' ? (
                                        <p className="text-xs leading-relaxed">{msg.message}</p>
                                    ) : (
                                        renderRichContent(msg.message)
                                    )}

                                    {/* Luxury Interactive Package Cards */}
                                    {msg.matchedPackages && msg.matchedPackages.length > 0 && (
                                        <div className="mt-3.5 space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1">
                                                <Flame className="size-3 text-amber-500" /> Featured Options & Early-Bird Quotes
                                            </p>
                                            {msg.matchedPackages.map((pkg) => (
                                                <div 
                                                    key={pkg.id} 
                                                    className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col gap-2.5"
                                                >
                                                    <div className="flex gap-3 items-center">
                                                        <div className="size-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 relative border border-slate-200 dark:border-slate-700">
                                                            {pkg.image ? (
                                                                <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                                                                    <Compass className="size-6" />
                                                                </div>
                                                            )}
                                                            {pkg.tag && (
                                                                <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[7.5px] font-black px-1.5 py-0.2 rounded shadow-xs">
                                                                    {pkg.tag}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{pkg.title}</h4>
                                                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                <span className="flex items-center gap-0.5"><Clock className="size-2.5" /> {pkg.days} Days</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-0.5 truncate"><MapPin className="size-2.5" /> {pkg.location}</span>
                                                                <span className="ml-auto text-amber-500 font-bold flex items-center shrink-0">
                                                                    <Star className="size-2.5 fill-amber-400 text-amber-400 mr-0.5" /> {pkg.rating || 4.9}
                                                                </span>
                                                            </p>
                                                            <div className="mt-1 flex items-baseline gap-1">
                                                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                                    {formatPrice(pkg.price)}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 font-medium">/ all-inclusive</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                                        <a
                                                            href={`#/packages/${pkg.id}`}
                                                            onClick={() => setIsOpen(false)}
                                                            className="flex-1 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-[10.5px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-center shadow-2xs"
                                                        >
                                                            View Details
                                                            <ExternalLink className="size-2.5" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickReply(`Let's customize the ${pkg.title} package for me!`)}
                                                            className="flex-1 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10.5px] font-bold rounded-xl shadow-xs hover:opacity-95 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            Select & Lock Deal
                                                            <ArrowRight className="size-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <span className={`text-[8.5px] block mt-1.5 text-right font-mono ${msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="flex gap-2.5 max-w-[85%]">
                                <div className="size-7 rounded-full bg-slate-800 flex items-center justify-center text-white shrink-0 mt-1">
                                    <Bot className="size-3.5" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <span className="size-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="size-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="size-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-1">Advisor is preparing your personalized plan...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Dynamic Quick Reply Action Chips (Hormozi Friction-Reducer) */}
                    {activeSuggestions.length > 0 && (
                        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shrink-0 scrollbar-none">
                            {activeSuggestions.map((sugg, idx) => (
                                <button 
                                    key={idx}
                                    type="button"
                                    onClick={() => handleQuickReply(sugg)} 
                                    className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-2xs"
                                >
                                    <Sparkles className="size-2.5 text-blue-500 shrink-0" />
                                    {sugg}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* WhatsApp Fast Escalation Bar */}
                    <div className="px-3.5 py-1.5 bg-slate-100/90 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] shrink-0">
                        <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                            <MessageCircle className="size-3 text-emerald-500" /> Prefer chatting with human expert?
                        </span>
                        <button
                            type="button"
                            onClick={openWhatsAppHandoff}
                            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                        >
                            WhatsApp Concierge <ChevronRight className="size-3" />
                        </button>
                    </div>

                    {/* Listening Wave Overlay (When Mic active) */}
                    {isListening && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-800/60 p-2 flex items-center justify-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse shrink-0">
                            <Mic className="size-4 animate-bounce" />
                            <span>Listening to your voice... Speak now</span>
                            <button
                                type="button"
                                onClick={toggleVoiceInput}
                                className="ml-2 text-[10px] underline hover:opacity-80"
                            >
                                Stop
                            </button>
                        </div>
                    )}

                    {/* Input Form Bar */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Where to? (e.g. 5-day Kashmir trip with family)"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-full text-base sm:text-xs bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                        
                        {/* Browser-Native Speech-to-Text Button */}
                        <button
                            type="button"
                            onClick={toggleVoiceInput}
                            title={isListening ? "Listening... click to stop" : "Speak your query (Voice Input)"}
                            className={`size-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                isListening 
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                        </button>

                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="size-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-all shrink-0 hover:scale-105 active:scale-95"
                            aria-label="Send message"
                        >
                            <Send className="size-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Float Button (When closed) */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 z-[9999]">
                    <button 
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="size-14 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 relative group"
                        aria-label="Open AI Travel Advisor"
                    >
                        <span className="absolute inset-0 rounded-full bg-indigo-500/20 group-hover:animate-ping -z-10"></span>
                        <MessageSquare className="size-6 text-white animate-pulse" />
                        
                        <span className="absolute right-16 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xl border border-slate-800 transition-all origin-right flex items-center gap-1.5 whitespace-nowrap">
                            <Sparkles className="size-3 text-amber-300 animate-pulse" />
                            Ask AI Travel Concierge
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};
