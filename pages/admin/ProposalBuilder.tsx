import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2, Hotel, Calendar,
    Check, X, FileText, DollarSign, Image as ImageIcon, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { Proposal, ProposalOption, HotelAvailabilityRequest } from '../../types';
import { generateProposalPDF, generateProformaInvoice } from '../../utils/pdfGenerator';
import { HotelAvailabilityModal } from '../../components/admin/HotelAvailabilityModal';
import { api } from '../../src/lib/api';
import { Printer } from 'lucide-react';
import { BorderBeam } from 'border-beam';
import { ThinkingOrb } from 'thinking-orbs';

export const ProposalBuilder: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // If editing
    const navigate = useNavigate();
    const {
        proposals, addProposal, updateProposal, leads,
        masterHotels, masterActivities, addBooking,
        customers, addCustomer
    } = useData();

    // Form State
    const [title, setTitle] = useState('');
    const [leadId, setLeadId] = useState('');
    const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted' | 'Rejected'>('Draft');
    const [validUntil, setValidUntil] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [options, setOptions] = useState<ProposalOption[]>([
        { id: 'opt-1', name: 'Standard (3★)', tier: 'Standard', hotelStarRating: '3 Star', price: 0, items: [], hotels: [], activities: [], inclusions: ['Accommodation with Breakfast', 'Private Cab for Sightseeing'], exclusions: ['Personal Expenses', 'Entry Tickets'] }
    ]);
    const [activeOptionId, setActiveOptionId] = useState<string>('opt-1');
    const [isConverting, setIsConverting] = useState(false);
    const [isWeavingPDF, setIsWeavingPDF] = useState(false);
    const [isWeavingProforma, setIsWeavingProforma] = useState(false);

    // Quotation Versioning State (Phase 2.1)
    const [version, setVersion] = useState('v1');
    const [revisionNumber, setRevisionNumber] = useState(1);
    const [parentId, setParentId] = useState<string | null>(null);
    const [revisionNote, setRevisionNote] = useState('');
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [newRevisionNote, setNewRevisionNote] = useState('');

    // Hotel Availability Checks (Phase 3)
    const [availabilityModal, setAvailabilityModal] = useState<{
        isOpen: boolean;
        hotelId?: string;
        hotelName?: string;
    }>({ isOpen: false });
    const [availabilityRequests, setAvailabilityRequests] = useState<HotelAvailabilityRequest[]>([]);

    useEffect(() => {
        if (id && id !== 'new') {
            api.getHotelAvailabilityRequests({ proposalId: id }).then(res => {
                if (res) setAvailabilityRequests(res);
            }).catch(() => {});
        }
    }, [id]);

    // Hotel filter for active tier
    const [hotelStarFilter, setHotelStarFilter] = useState<string>('all');

    // Load if editing
    useEffect(() => {
        if (id && id !== 'new') {
            const existing = proposals.find(p => p.id === id);
            if (existing) {
                setTitle(existing.title);
                setLeadId(existing.leadId);
                setStatus(existing.status);
                setValidUntil(existing.validUntil ? new Date(existing.validUntil).toISOString().split('T')[0] : validUntil);
                setOptions(existing.options?.length ? existing.options : [
                    { id: 'opt-1', name: 'Standard (3★)', tier: 'Standard', hotelStarRating: '3 Star', price: 0, items: [], hotels: [], activities: [], inclusions: [], exclusions: [] }
                ]);
                setActiveOptionId(existing.options?.[0]?.id || 'opt-1');
                setVersion(existing.version || 'v1');
                setRevisionNumber(existing.revisionNumber || 1);
                setParentId(existing.parentId || null);
                setRevisionNote(existing.revisionNote || '');
            }
        }
    }, [id, proposals]);

    // Root proposal ID for revision tree
    const rootId = parentId || (id !== 'new' ? id : null);
    const relatedRevisions = useMemo(() => {
        if (!rootId) return [];
        return proposals.filter(p => p.id === rootId || p.parentId === rootId)
            .sort((a, b) => (a.revisionNumber || 1) - (b.revisionNumber || 1));
    }, [proposals, rootId]);

    const activeOption = options.find(o => o.id === activeOptionId);
    const lead = leads.find(l => l.id === leadId);

    const handleSave = () => {
        if (!title || !leadId) {
            toast.error("Please provide a Title and select a Lead.");
            return;
        }

        const proposalData: Proposal = {
            id: id === 'new' ? `PROP-${Date.now()}` : id!,
            title,
            leadId,
            status,
            options,
            version,
            revisionNumber,
            parentId,
            revisionNote,
            createdAt: id === 'new' ? new Date().toISOString() : proposals.find(p => p.id === id)?.createdAt || new Date().toISOString(),
            validUntil: new Date(validUntil).toISOString()
        };

        if (id === 'new') {
            addProposal(proposalData);
            navigate('/admin/proposals');
        } else {
            updateProposal(id!, proposalData);
            toast.success(`Proposal ${version} updated`);
        }
    };

    // ─── Create New Quotation Revision (Clone v1 -> v2) ─────────────────────────
    const handleCreateRevision = () => {
        if (!id || id === 'new') {
            toast.error("Please save the initial proposal before creating revisions.");
            return;
        }

        const nextRevNumber = revisionNumber + 1;
        const nextVersion = `v${nextRevNumber}`;
        const newProposalId = `PROP-${Date.now()}`;
        const effectiveRootId = parentId || id;

        const clonedOptions = options.map(opt => ({
            ...opt,
            id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
        }));

        const newRevisionData: Proposal = {
            id: newProposalId,
            title: title.includes('(Rev') ? title.replace(/\(Rev\s*\d+\)/, `(Rev ${nextRevNumber})`) : `${title} (Rev ${nextRevNumber})`,
            leadId,
            status: 'Draft',
            options: clonedOptions,
            version: nextVersion,
            revisionNumber: nextRevNumber,
            parentId: effectiveRootId,
            revisionNote: newRevisionNote || `Revision ${nextRevNumber} created from ${version}`,
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        addProposal(newRevisionData);
        setIsRevisionModalOpen(false);
        setNewRevisionNote('');
        toast.success(`Created Quotation Revision ${nextVersion}!`);
        navigate(`/admin/proposals/${newProposalId}`);
    };

    const addPresetTier = (tier: 'Standard' | 'Deluxe' | 'Luxury') => {
        const star = tier === 'Standard' ? '3 Star' : tier === 'Deluxe' ? '4 Star' : '5 Star';
        const newId = `opt-${Date.now()}`;
        const newOption: ProposalOption = {
            id: newId,
            name: `${tier} (${star})`,
            tier,
            hotelStarRating: star as any,
            price: 0,
            items: [],
            hotels: [],
            activities: [],
            inclusions: ['Accommodation with Breakfast', 'Private AC Vehicle for Sightseeing', 'Airport/Station Transfers'],
            exclusions: ['Flights / Trains', 'Monuments Entry Fee', 'Personal Expenses']
        };
        setOptions(prev => [...prev, newOption]);
        setActiveOptionId(newId);
    };

    const updateActiveOption = (field: keyof ProposalOption, value: any) => {
        setOptions(prev => prev.map(o => o.id === activeOptionId ? { ...o, [field]: value } : o));
    };

    const addOption = () => {
        const newId = `opt-${Date.now()}`;
        setOptions([...options, {
            id: newId,
            name: `Option ${options.length + 1}`,
            price: 0,
            items: [],
            hotels: [],
            activities: [],
            inclusions: [],
            exclusions: []
        }]);
        setActiveOptionId(newId);
    };

    const deleteOption = (id: string) => {
        if (options.length === 1) {
            toast.error("You must have at least one option.");
            return;
        }
        const newOptions = options.filter(o => o.id !== id);
        setOptions(newOptions);
        if (activeOptionId === id) setActiveOptionId(newOptions[0].id);
    };

    // Helper to toggle items in arrays (hotels, inclusions)
    const toggleHotel = (hotelId: string) => {
        if (!activeOption) return;
        const current = activeOption.hotels;
        const updated = current.includes(hotelId)
            ? current.filter(h => h !== hotelId)
            : [...current, hotelId];
        updateActiveOption('hotels', updated);
    };

    const handleDownloadProforma = async () => {
        if (!activeOption) return;
        if (!leadId) { toast.error("Lead must be selected"); return; }
        const lead = leads.find(l => l.id === leadId);
        if (!lead) { toast.error("Lead not found"); return; }

        setIsWeavingProforma(true);
        await new Promise(res => setTimeout(res, 400));
        try {
            const proposalData: Proposal = {
                id: id === 'new' ? `PROP-DRAFT` : id!,
                title,
                leadId,
                status,
                options,
                createdAt: new Date().toISOString(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            generateProformaInvoice(proposalData, activeOption.id, lead);
            toast.success("Proforma Invoice Downloaded!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate Proforma.");
        } finally {
            setIsWeavingProforma(false);
        }
    };

    const handleConvertToBooking = async () => {
        if (!activeOption || isConverting) return;
        if (!leadId) { toast.error("Lead is required"); return; }
        const lead = leads.find(l => l.id === leadId);
        if (!lead) { toast.error("Lead not found"); return; }

        if (confirm(`Convert "${activeOption.name}" to a confirmed booking? This will create a new Booking entry.`)) {
            setIsConverting(true);
            try {
                // Check for existing customer by email/phone (mirrors Leads conversion logic)
                let targetCustomerId: string | undefined;
                const existingCustomer = customers?.find((c: any) =>
                    (c.email?.toLowerCase() === lead.email?.toLowerCase()) ||
                    (c.phone === lead.phone)
                );

                if (existingCustomer) {
                    targetCustomerId = existingCustomer.id;
                } else {
                    const newCustomerId = `CU-${Date.now()}`;
                    const newCustomer = {
                        id: newCustomerId,
                        name: lead.name,
                        email: lead.email,
                        phone: lead.phone || '',
                        type: 'New',
                        status: 'Active',
                        joinedDate: new Date().toISOString(),
                        bookingsCount: 0,
                        totalSpent: 0
                    };
                    addCustomer?.(newCustomer);
                    targetCustomerId = newCustomerId;
                }

                const newBooking: any = {
                    id: '', // Auto-generated by backend
                    leadId: lead.id,
                    type: 'Tour',
                    customer: lead.name,
                    customerId: targetCustomerId,
                    email: lead.email,
                    phone: lead.phone,
                    title: `${title} - ${activeOption.name}`,
                    date: lead.startDate || new Date().toISOString().split('T')[0],
                    amount: activeOption.price,
                    guests: lead.travelers,
                    status: 'Confirmed',
                    payment: 'Unpaid',
                    details: `Converted from Proposal: ${id}. Option: ${activeOption.name}. Customer: ${existingCustomer ? 'linked' : 'created'}.`,
                    transactions: [],
                    supplierBookings: []
                };

                await addBooking(newBooking);

                if (id && id !== 'new') {
                    updateProposal(id, { status: 'Accepted' });
                    setStatus('Accepted');
                }

                toast.success('Booking created & Proposal Accepted!');
                setTimeout(() => navigate('/admin/bookings'), 1000);
            } catch (err: any) {
                toast.error(err.message || 'Failed to convert proposal to booking.');
            } finally {
                setIsConverting(false);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (!leadId) { toast.error("Lead must be selected to generate PDF"); return; }
        const lead = leads.find(l => l.id === leadId);
        if (!lead) { toast.error("Lead not found"); return; }

        setIsWeavingPDF(true);
        await new Promise(res => setTimeout(res, 400));
        try {
            const proposalData: Proposal = {
                id: id === 'new' ? `PROP-DRAFT` : id!,
                title,
                leadId,
                status,
                options,
                createdAt: new Date().toISOString(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                version,
                revisionNumber,
                parentId: parentId || undefined,
                revisionNote
            };
            generateProposalPDF(proposalData, lead, masterHotels, masterActivities);
            toast.success("PDF Downloaded!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate PDF. Make sure all fields are valid.");
        } finally {
            setIsWeavingPDF(false);
        }
    };

    const filteredMasterHotels = useMemo(() => {
        if (hotelStarFilter === 'all') return masterHotels;
        const starNum = parseInt(hotelStarFilter);
        return masterHotels.filter(h => Math.floor(h.rating) === starNum);
    }, [masterHotels, hotelStarFilter]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1116]">
            {/* Header */}
            <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/proposals')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display text-3xl">
                                {id === 'new' ? 'New Proposal' : 'Edit Proposal'}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {version}
                            </span>
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>{status}</span>
                        </div>

                        {/* Revision Lineage Breadcrumb */}
                        {relatedRevisions.length > 1 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] font-bold text-slate-400">Revisions:</span>
                                {relatedRevisions.map(rev => (
                                    <button
                                        key={rev.id}
                                        onClick={() => navigate(`/admin/proposals/${rev.id}`)}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${
                                            rev.id === id
                                                ? 'bg-purple-600 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                        title={rev.revisionNote || rev.version}
                                    >
                                        {rev.version || 'v1'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {id !== 'new' && (
                        <button
                            onClick={() => setIsRevisionModalOpen(true)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-sm px-3.5 py-2.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Clone and draft a new version (e.g. v2, v3)"
                        >
                            <Copy size={16} />
                            <span>Revise (v{revisionNumber + 1})</span>
                        </button>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isWeavingPDF}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl text-sm px-4 py-2.5 transition-all shadow-sm"
                    >
                        {isWeavingPDF ? (
                            <>
                                <ThinkingOrb state="weaving" size={20} />
                                <span>Weaving PDF...</span>
                            </>
                        ) : (
                            <>
                                <Printer size={18} />
                                <span>PDF</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleDownloadProforma}
                        disabled={isWeavingProforma}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl text-sm px-4 py-2.5 transition-all shadow-sm"
                        title="Download Proforma Invoice"
                    >
                        {isWeavingProforma ? (
                            <>
                                <ThinkingOrb state="weaving" size={20} />
                                <span>Weaving Proforma...</span>
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                <span>Proforma</span>
                            </>
                        )}
                    </button>
                    {id !== 'new' && (
                        <button
                            onClick={handleConvertToBooking}
                            disabled={isConverting}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm px-4 sm:px-6 py-2.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all ${
                                isConverting ? 'opacity-70 cursor-wait' : ''
                            }`}
                        >
                            {isConverting ? (
                                <>
                                    <div className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Converting...
                                </>
                            ) : (
                                <>
                                    <Check size={18} /> Convert to Booking
                                </>
                            )}
                        </button>
                    )}
                    <BorderBeam size="pulse-inner" colorVariant="forest" active={!!title && !!leadId}>
                        <button
                            onClick={handleSave}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm px-4 sm:px-6 py-2.5 shadow-lg shadow-purple-600/20 active:scale-95 transition-all btn-glow"
                        >
                            <Save size={18} /> Save Proposal
                        </button>
                    </BorderBeam>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Proposal Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g. Bali Honeymoon Escape"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Lead</label>
                            <select
                                value={leadId}
                                onChange={(e) => setLeadId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Select a Customer/Lead...</option>
                                {leads.map(lead => (
                                    <option key={lead.id} value={lead.id}>{lead.name} ({lead.destination})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valid Until</label>
                            <input
                                type="date"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Options Builder */}
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        
                        {/* Quick Presets Bar */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quick Tier Presets:</span>
                                <button
                                    type="button"
                                    onClick={() => addPresetTier('Standard')}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                    <span>+ Standard (3★)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addPresetTier('Deluxe')}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                    <span>+ Deluxe (4★)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addPresetTier('Luxury')}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                    <span>+ Luxury (5★)</span>
                                </button>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                Multi-tier proposals give clients 3★ vs 4★ options in one view
                            </span>
                        </div>

                        {/* Side-by-Side Tier Comparison Header Bar */}
                        {options.length > 1 && (
                            <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {options.map((opt, i) => {
                                    const basePrice = options[0]?.price || 0;
                                    const diff = opt.price - basePrice;
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => setActiveOptionId(opt.id)}
                                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                activeOptionId === opt.id
                                                    ? 'bg-white dark:bg-slate-800 border-purple-500 shadow-xs ring-2 ring-purple-500/20'
                                                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="truncate text-slate-800 dark:text-slate-200">{opt.name}</span>
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                                    {opt.hotelStarRating || opt.tier || 'Tier'}
                                                </span>
                                            </div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white mt-1">₹{opt.price.toLocaleString()}</p>
                                            {i > 0 && diff !== 0 && (
                                                <p className={`text-[10px] font-bold ${diff > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {diff > 0 ? `+₹${diff.toLocaleString()} vs Base` : `-₹${Math.abs(diff).toLocaleString()} vs Base`}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap">
                            {options.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setActiveOptionId(opt.id)}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold border-r border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-2 shrink-0
                                        ${activeOptionId === opt.id ? 'bg-slate-50 dark:bg-slate-800 text-purple-600 border-b-2 border-b-purple-600' : 'text-slate-500'}
                                    `}
                                >
                                    {opt.name}
                                    {options.length > 1 && (
                                        <Trash2
                                            size={14}
                                            className="text-slate-400 hover:text-red-500"
                                            onClick={(e) => { e.stopPropagation(); deleteOption(opt.id); }}
                                        />
                                    )}
                                </button>
                            ))}
                            <button
                                onClick={addOption}
                                className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-purple-600 hover:bg-purple-50 flex items-center gap-2 shrink-0 whitespace-nowrap"
                            >
                                <Plus size={16} /> Add Custom Option
                            </button>
                        </div>

                        {activeOption && (
                            <div className="p-4 sm:p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Option Name</label>
                                        <input
                                            value={activeOption.name}
                                            onChange={(e) => updateActiveOption('name', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Package Tier</label>
                                        <select
                                            value={activeOption.tier || 'Standard'}
                                            onChange={(e) => updateActiveOption('tier', e.target.value as any)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                                        >
                                            <option value="Budget">Budget</option>
                                            <option value="Standard">Standard (3★)</option>
                                            <option value="Deluxe">Deluxe (4★)</option>
                                            <option value="Luxury">Luxury (5★)</option>
                                            <option value="Custom">Custom</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hotel Rating</label>
                                        <select
                                            value={activeOption.hotelStarRating || '3 Star'}
                                            onChange={(e) => updateActiveOption('hotelStarRating', e.target.value as any)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                                        >
                                            <option value="3 Star">3 Star Standard</option>
                                            <option value="4 Star">4 Star Deluxe</option>
                                            <option value="5 Star">5 Star Luxury</option>
                                            <option value="Boutique / Heritage">Boutique / Heritage</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Price (₹)</label>
                                    <BorderBeam size="sm" colorVariant="gold" active={Number(activeOption.price) >= 100000}>
                                        <input
                                            type="number"
                                            value={activeOption.price}
                                            onChange={(e) => updateActiveOption('price', Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </BorderBeam>
                                </div>

                                {/* Hotel Selection with Star Rating Filters */}
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Hotel size={16} className="text-purple-600" /> Select Hotels Included
                                        </h3>
                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setHotelStarFilter('all')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                    hotelStarFilter === 'all' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                                                }`}
                                            >
                                                All ({masterHotels.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHotelStarFilter('3')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                    hotelStarFilter === '3' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                                                }`}
                                            >
                                                3★ Standard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHotelStarFilter('4')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                    hotelStarFilter === '4' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                                                }`}
                                            >
                                                4★ Deluxe
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHotelStarFilter('5')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                    hotelStarFilter === '5' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                                                }`}
                                            >
                                                5★ Luxury
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {filteredMasterHotels.map(hotel => (
                                            <div
                                                key={hotel.id}
                                                onClick={() => toggleHotel(hotel.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3
                                                    ${activeOption.hotels.includes(hotel.id)
                                                        ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/20 dark:bg-purple-950/40 dark:border-purple-800'
                                                        : 'bg-slate-50 border-slate-100 hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-800'}
                                                `}
                                            >
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5
                                                    ${activeOption.hotels.includes(hotel.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 dark:bg-slate-800'}
                                                `}>
                                                    {activeOption.hotels.includes(hotel.id) && <Check size={12} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{hotel.name}</span>
                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                            {hotel.rating}★
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">₹{hotel.pricePerNight?.toLocaleString()}/night</div>
                                                        {activeOption.hotels.includes(hotel.id) && (
                                                            (() => {
                                                                const matchingReq = availabilityRequests.find(r => r.hotelId === hotel.id || r.hotelName.toLowerCase() === hotel.name.toLowerCase());
                                                                const reqStatus = matchingReq?.status;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setAvailabilityModal({
                                                                                isOpen: true,
                                                                                hotelId: hotel.id,
                                                                                hotelName: hotel.name
                                                                            });
                                                                        }}
                                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all ${
                                                                            reqStatus === 'Available'
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                                                                : reqStatus === 'Sold Out'
                                                                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                                                                                : reqStatus === 'Alternative Offered'
                                                                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                                                                : reqStatus === 'Pending'
                                                                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200'
                                                                                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                                                                        }`}
                                                                        title={matchingReq?.hotelNotes || 'Check room availability directly with hotel'}
                                                                    >
                                                                        {reqStatus === 'Available' && <span>✓ Available</span>}
                                                                        {reqStatus === 'Sold Out' && <span>✕ Sold Out</span>}
                                                                        {reqStatus === 'Alternative Offered' && <span>⇄ Alternative</span>}
                                                                        {reqStatus === 'Pending' && <span>⏳ Pending Check</span>}
                                                                        {!reqStatus && <span>Check Availability</span>}
                                                                    </button>
                                                                );
                                                            })()
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {filteredMasterHotels.length === 0 && (
                                        <p className="text-sm text-slate-400 italic p-4 text-center">No hotels found matching {hotelStarFilter}★ rating.</p>
                                    )}
                                </div>

                                {/* Service (Activity) Selection */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Calendar size={16} className="text-purple-600" /> Select Services Included
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {masterActivities.map(activity => (
                                            <div
                                                key={activity.id}
                                                onClick={() => {
                                                    const current = activeOption.activities || [];
                                                    const updated = current.includes(activity.id)
                                                        ? current.filter(a => a !== activity.id)
                                                        : [...current, activity.id];
                                                    updateActiveOption('activities', updated);
                                                }}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3
                                                    ${(activeOption.activities || []).includes(activity.id)
                                                        ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/20 dark:bg-purple-950/40 dark:border-purple-800'
                                                        : 'bg-slate-50 border-slate-100 hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-800'}
                                                `}
                                            >
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5
                                                    ${(activeOption.activities || []).includes(activity.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 dark:bg-slate-800'}
                                                `}>
                                                    {(activeOption.activities || []).includes(activity.id) && <Check size={12} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{activity.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">₹{activity.cost?.toLocaleString() || 0}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {masterActivities.length === 0 && <p className="text-sm text-slate-400 italic">No services/activities found in Master Data.</p>}
                                </div>

                                {/* Inclusions */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Inclusions (One per line)</h3>
                                    <textarea
                                        value={activeOption.inclusions.join('\n')}
                                        onChange={(e) => updateActiveOption('inclusions', e.target.value.split('\n'))}
                                        className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                        placeholder="Welcome Drinks&#10;Breakfast&#10;Airport Transfers"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Create Quotation Revision Modal (Phase 2.1) ─── */}
            {isRevisionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Copy size={18} className="text-indigo-600" />
                                    <span>Create Quotation Revision</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Clones {title} as version <strong>v{revisionNumber + 1}</strong></p>
                            </div>
                            <button onClick={() => setIsRevisionModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-300">
                                <p>This preserves your existing quotation (<strong>{version}</strong>) in the client's proposal archive, while letting you tweak hotel tiers, nights, or pricing for the new revision.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Revision Reason / Note</label>
                                <textarea
                                    value={newRevisionNote}
                                    onChange={(e) => setNewRevisionNote(e.target.value)}
                                    rows={3}
                                    placeholder="e.g. Swapped hotel to 4★ Deluxe, adjusted prices per client WhatsApp request..."
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsRevisionModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateRevision}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                            >
                                Create Revision v{revisionNumber + 1}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hotel Availability Automation Modal (Phase 3) */}
            <HotelAvailabilityModal
                isOpen={availabilityModal.isOpen}
                onClose={() => setAvailabilityModal({ isOpen: false })}
                hotelId={availabilityModal.hotelId}
                hotelName={availabilityModal.hotelName}
                proposalId={id !== 'new' ? id : undefined}
                leadId={leadId}
                guestName={lead?.name}
                destination={lead?.destination}
                initialRoomCategory={activeOption?.hotelStarRating || 'Deluxe Room'}
                onRequestUpdated={(updatedReq) => {
                    setAvailabilityRequests(prev => {
                        const filtered = prev.filter(r => r.id !== updatedReq.id);
                        return [updatedReq, ...filtered];
                    });
                }}
            />
        </div>
    );
};
