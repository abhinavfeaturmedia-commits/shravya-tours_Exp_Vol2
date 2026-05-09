import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItinerary } from './ItineraryContext';
import { useData } from '../../context/DataContext';
import { StepDayPlanner } from './steps/StepDayPlanner';
import { StepTripDetails } from './steps/StepTripDetails';
import { StepPricing } from './steps/StepPricing';
import { StepReview } from './steps/StepReview';
import {
    MapPin, Hotel, Car, Zap, DollarSign, Send,
    Save, ChevronLeft, ChevronRight, Sparkles, CalendarDays, Users, Tag
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActivePanel = 'board' | 'details' | 'pricing' | 'review';

interface SidebarItem {
    id: ActivePanel | string;
    label: string;
    icon: React.ReactNode;
    panel?: ActivePanel;
}

// ─── Sidebar Nav Items ────────────────────────────────────────────────────────
const NAV_ITEMS: SidebarItem[] = [
    { id: 'details',   label: 'Destinations', icon: <MapPin size={18} />,    panel: 'details'  },
    { id: 'hotels',    label: 'Hotels',        icon: <Hotel size={18} />,     panel: 'board'    },
    { id: 'transport', label: 'Transport',     icon: <Car size={18} />,       panel: 'board'    },
    { id: 'activities',label: 'Activities',   icon: <Zap size={18} />,       panel: 'board'    },
    { id: 'pricing',   label: 'Pricing',       icon: <DollarSign size={18} />,panel: 'pricing'  },
    { id: 'publish',   label: 'Publish',       icon: <Send size={18} />,      panel: 'review'   },
];

// ─── Tier Badge ───────────────────────────────────────────────────────────────
function getTier(grandTotal: number): { label: string; cls: string } {
    if (grandTotal > 200000) return { label: 'HIGH-END TIER',  cls: 'bg-amber-50 text-amber-700 border border-amber-300' };
    if (grandTotal > 50000)  return { label: 'MID-RANGE TIER', cls: 'bg-blue-50 text-blue-700 border border-blue-300'   };
    return                          { label: 'BUDGET TIER',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-300' };
}

// ─── Main Wizard Shell ────────────────────────────────────────────────────────
const WizardContent: React.FC = () => {
    const { tripDetails, updateTripDetails, grandTotal, editPackageId, setStep, items, clearDraft } = useItinerary();
    const { masterLocations } = useData();

    // Resolve location ID → name
    const destinationName = masterLocations?.find(l => String(l.id) === String(tripDetails.destination))?.name || tripDetails.destination || '';
    const [activePanel, setActivePanel] = useState<ActivePanel>('board');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingTitle && titleRef.current) titleRef.current.focus();
    }, [editingTitle]);

    const tier = getTier(grandTotal);

    const handleNavClick = (item: SidebarItem) => {
        if (item.panel) setActivePanel(item.panel);
    };

    // Format date range for top bar
    const formatDateRange = () => {
        if (!tripDetails.startDate) return '─';
        const start = new Date(tripDetails.startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + tripDetails.days - 1);
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        return `${fmt(start)} – ${fmt(end)}`;
    };

    // Warn on navigate away with unsaved changes (Fix 2.7)
    useEffect(() => {
        const hasContent = items.length > 0 || !!tripDetails.title?.trim();
        if (!hasContent) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [items.length, tripDetails.title]);

    // Sync setStep for panels that read the wizard step
    useEffect(() => {
        if (activePanel === 'details')  setStep(1);
        if (activePanel === 'board')    setStep(2);
        if (activePanel === 'pricing')  setStep(3);
        if (activePanel === 'review')   setStep(4);
    }, [activePanel, setStep]);

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-[#F5F0E8] font-sans select-none">
            {/* ── TOP BAR ──────────────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-4 px-6 py-3 bg-white border-b border-stone-200 shadow-sm z-20">
                {/* Left: Logo + Project */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 shadow">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-0.5">
                            Active Project
                        </p>
                        {editingTitle ? (
                            <input
                                ref={titleRef}
                                value={tripDetails.title}
                                onChange={e => updateTripDetails({ title: e.target.value })}
                                onBlur={() => setEditingTitle(false)}
                                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                                className="text-lg font-black text-stone-900 bg-transparent border-none outline-none w-64 border-b-2 border-amber-400"
                            />
                        ) : (
                            <h1
                                className="text-lg font-black text-stone-900 truncate max-w-xs cursor-pointer hover:text-amber-600 transition-colors"
                                onClick={() => setEditingTitle(true)}
                                title="Click to edit title"
                            >
                                {tripDetails.title || 'Untitled Itinerary'}
                            </h1>
                        )}
                    </div>
                </div>

                {/* Center: Meta pills */}
                <div className="flex items-center gap-2 ml-4 flex-wrap">
                    {tripDetails.startDate && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                            <CalendarDays size={12} className="text-amber-500" />
                            {formatDateRange()}
                        </span>
                    )}
                    {destinationName && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                            <MapPin size={12} className="text-rose-500" />
                            {destinationName}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                        <Users size={12} className="text-indigo-500" />
                        {(tripDetails.adults || 0) + (tripDetails.children || 0)} Guests
                    </span>
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg ${tier.cls}`}>
                        <Tag size={12} />
                        {tier.label}
                    </span>
                </div>

                {/* Right: Actions */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to start a new itinerary? This will clear all current unsaved data.")) {
                                clearDraft();
                            }
                        }}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all mr-2"
                        title="Clear draft and start fresh"
                    >
                        Start Fresh
                    </button>
                    <button
                        onClick={() => setActivePanel('board')}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                            activePanel === 'board'
                                ? 'bg-stone-900 text-white shadow'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        Board
                    </button>
                    <button
                        onClick={() => setActivePanel('review')}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow transition-all active:scale-95"
                    >
                        <Save size={14} />
                        {editPackageId ? 'Update Package' : 'Save Draft'}
                    </button>
                </div>
            </header>

            {/* ── BODY (sidebar + main) ─────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
                <aside className={`
                    flex flex-col bg-white border-r border-stone-200 shrink-0 transition-all duration-300 overflow-hidden
                    ${sidebarCollapsed ? 'w-14' : 'w-52'}
                `}>
                    {/* Collapse toggle */}
                    <button
                        onClick={() => setSidebarCollapsed(v => !v)}
                        className="w-full flex items-center justify-end px-3 py-2.5 border-b border-stone-100 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors text-[10px] font-bold gap-1"
                    >
                        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        {!sidebarCollapsed && <span>Collapse</span>}
                    </button>

                    {/* Nav Items */}
                    <nav className="flex-1 py-2 overflow-y-auto">
                        {NAV_ITEMS.map(item => {
                            const isActive = activePanel === item.panel;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item)}
                                    title={sidebarCollapsed ? item.label : undefined}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all
                                        ${isActive
                                            ? 'bg-stone-900 text-white'
                                            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                                        }
                                        ${sidebarCollapsed ? 'justify-center' : ''}
                                    `}
                                >
                                    <span className="shrink-0">{item.icon}</span>
                                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom save button */}
                    {!sidebarCollapsed && (
                        <div className="p-3 border-t border-stone-100">
                            <button
                                onClick={() => setActivePanel('review')}
                                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={14} /> Save Draft
                            </button>
                        </div>
                    )}
                </aside>

                {/* ── MAIN CONTENT AREA ─────────────────────────────── */}
                <main className="flex-1 overflow-hidden relative">
                    {/* Board / Day Planner — always mounted, shown based on panel */}
                    <div className={`absolute inset-0 transition-opacity duration-200 ${activePanel === 'board' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <StepDayPlanner onOpenPricing={() => setActivePanel('pricing')} onOpenTripDetails={() => setActivePanel('details')} />
                    </div>

                    {/* Trip Details Panel */}
                    {activePanel === 'details' && (
                        <div className="absolute inset-0 z-20 bg-[#F5F0E8] overflow-y-auto">
                            <StepTripDetails onDone={() => setActivePanel('board')} />
                        </div>
                    )}

                    {/* Pricing Panel */}
                    {activePanel === 'pricing' && (
                        <div className="absolute inset-0 z-20 bg-[#F5F0E8] overflow-y-auto">
                            <StepPricing onBack={() => setActivePanel('board')} onDone={() => setActivePanel('review')} />
                        </div>
                    )}

                    {/* Review / Publish Panel */}
                    {activePanel === 'review' && (
                        <div className="absolute inset-0 z-20 bg-[#F5F0E8] overflow-y-auto">
                            <StepReview onBack={() => setActivePanel('pricing')} onSaved={() => setActivePanel('board')} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// ─── Named export wrapper (handles edit-mode loading) ─────────────────────────
export const ItineraryWizard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { packages, masterLocations } = useData();
    const { loadPackage } = useItinerary();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId && !isLoaded) {
            const pkgToEdit = packages.find(p => p.id === editId);
            // Fix 2.5: pass masterLocations so legacy destination names can be resolved to IDs
            if (pkgToEdit) loadPackage(pkgToEdit, masterLocations || []);
            setIsLoaded(true);
        }
    }, [searchParams, packages, loadPackage, isLoaded]);

    return <WizardContent />;
};
