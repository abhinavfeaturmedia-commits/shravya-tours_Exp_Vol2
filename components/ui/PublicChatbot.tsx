import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Bot, Sparkles, User, HelpCircle, Gift } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    message: string;
    timestamp: Date;
}

export const PublicChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [visitorId, setVisitorId] = useState('');
    const [leadCaptured, setLeadCaptured] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialise session on mount
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

        // Load greeting message if empty
        setMessages([
            {
                id: 'welcome',
                sender: 'ai',
                message: "Hello! 👋 Welcome to Shrawello Travel Hub. I am your AI Travel Advisor. I can help you find tour packages, show you our premium membership plans, or customise your dream itinerary. What destination are you planning to visit?",
                timestamp: new Date()
            }
        ]);
    }, []);

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
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            
            if (data.leadCreated) {
                setLeadCaptured(true);
                setTimeout(() => setLeadCaptured(false), 8000); // Hide after 8s
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMsg: ChatMessage = {
                id: `msg-err-${Date.now()}`,
                sender: 'ai',
                message: "Sorry, I am having trouble connecting right now. Please try again or reach out to us on our Contact page!",
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

    // Helper to format text and render markdown links
    const formatMessageText = (text: string) => {
        const linkRegex = /\[([^\]]+)\]\((#\/packages\/[^\)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            const linkText = match[1];
            const href = match[2];
            parts.push(
                <a 
                    key={match.index} 
                    href={href} 
                    onClick={() => setIsOpen(false)} // Close chatbot on navigation
                    className="underline text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                    {linkText}
                </a>
            );
            lastIndex = linkRegex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* Lead Captured Toast Notification */}
            {leadCaptured && (
                <div className="fixed bottom-24 right-4 sm:absolute sm:bottom-20 sm:right-0 w-[calc(100vw-2rem)] sm:w-80 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-bounce border border-emerald-400/30 z-[10000]">
                    <Sparkles className="size-6 shrink-0 text-amber-300 animate-pulse" />
                    <div>
                        <h4 className="font-bold text-xs">Request Received! ✈️</h4>
                        <p className="text-[10px] text-emerald-50 opacity-90 leading-tight mt-0.5">Your tour preference has been registered as a premium lead. Our team will contact you shortly!</p>
                    </div>
                </div>
            )}

            {/* Chatbot Window */}
            {isOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 w-full h-full sm:w-[380px] sm:h-[580px] sm:max-h-[calc(100vh-5rem)] shadow-2xl sm:rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0 sm:border border-slate-100 dark:border-slate-800/80 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-8 sm:zoom-in-95 z-[9999]">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shadow-md shrink-0 safe-top">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <Bot className="size-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                                    Shrawello AI Advisor
                                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                                </h3>
                                <p className="text-[10px] text-blue-100 opacity-90 font-medium">Converts your dreams into itineraries</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="p-2 rounded-full hover:bg-white/15 transition-colors text-white/80 hover:text-white"
                            aria-label="Close chat"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`flex gap-2 max-w-[88%] break-words animate-in fade-in slide-in-from-bottom-2 duration-200 ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                            >
                                <div className={`size-7 rounded-full shrink-0 flex items-center justify-center text-white ${msg.sender === 'user' ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                    {msg.sender === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                                </div>
                                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                    msg.sender === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm'
                                }`}>
                                    <div className="whitespace-pre-line text-left">
                                        {typeof msg.message === 'string' ? formatMessageText(msg.message) : msg.message}
                                    </div>
                                    <span className={`text-[8px] block mt-1 text-right opacity-50 ${msg.sender === 'user' ? 'text-white' : 'text-slate-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="flex gap-2 max-w-[80%]">
                                <div className="size-7 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">
                                    <Bot className="size-4" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                    <span className="size-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="size-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="size-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Reply Actions - Horizontally scrollable and saved space */}
                    <div className="px-4 py-2.5 flex gap-2 overflow-x-auto whitespace-nowrap border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shrink-0 scrollbar-thin">
                        <button 
                            onClick={() => handleQuickReply("Show me popular tour packages")} 
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-650 dark:text-slate-350 flex items-center gap-1 transition-colors shrink-0"
                        >
                            <HelpCircle className="size-3 text-blue-500" />
                            Popular Packages
                        </button>
                        <button 
                            onClick={() => handleQuickReply("What are the membership benefits?")} 
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-650 dark:text-slate-350 flex items-center gap-1 transition-colors shrink-0"
                        >
                            <Gift className="size-3 text-purple-500" />
                            Membership Offers
                        </button>
                        <button 
                            onClick={() => handleQuickReply("Connect me to a human agent")} 
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-650 dark:text-slate-350 flex items-center gap-1 transition-colors shrink-0"
                        >
                            <User className="size-3 text-rose-500" />
                            Talk to Agent
                        </button>
                    </div>

                    {/* Input Area - text-base prevents iOS Safari zoom while sm:text-xs maintains neat desktop look */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0 safe-bottom">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about tours, discounts, itinerary customisation..."
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-full text-base sm:text-xs bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="size-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white flex items-center justify-center shadow transition-all shrink-0 hover:scale-105 active:scale-95"
                            aria-label="Send message"
                        >
                            <Send className="size-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Float Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="size-14 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 relative group"
                    aria-label="Open AI Planner Chat"
                >
                    <span className="absolute inset-0 rounded-full bg-indigo-500/20 group-hover:animate-ping -z-10"></span>
                    <MessageSquare className="size-6 text-white animate-pulse" />
                    
                    <span className="absolute right-16 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-800 transition-all origin-right flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles className="size-3 text-amber-300 animate-pulse" />
                        Chat with AI Planner
                    </span>
                </button>
            )}
        </div>
    );
};
