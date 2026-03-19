import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2, Hotel, Calendar,
    Check, X, FileText, DollarSign, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Proposal, ProposalOption } from '../../types';
import { generateProposalPDF, generateProformaInvoice } from '../../utils/pdfGenerator';
import { Printer } from 'lucide-react';

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
        { id: 'opt-1', name: 'Standard', price: 0, items: [], hotels: [], activities: [], inclusions: [], exclusions: [] }
    ]);
    const [activeOptionId, setActiveOptionId] = useState<string>('opt-1');

    // Load if editing
    useEffect(() => {
        if (id && id !== 'new') {
            const existing = proposals.find(p => p.id === id);
            if (existing) {
                setTitle(existing.title);
                setLeadId(existing.leadId);
                setStatus(existing.status);
                setValidUntil(existing.validUntil ? new Date(existing.validUntil).toISOString().split('T')[0] : validUntil);
                setOptions(existing.options);
                setActiveOptionId(existing.options[0]?.id || 'opt-1');
            }
        }
    }, [id, proposals]);

    const activeOption = options.find(o => o.id === activeOptionId);

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
            createdAt: id === 'new' ? new Date().toISOString() : proposals.find(p => p.id === id)?.createdAt || new Date().toISOString(),
            validUntil: new Date(validUntil).toISOString()
        };

        if (id === 'new') {
            addProposal(proposalData);
            navigate('/admin/proposals');
        } else {
            updateProposal(id!, proposalData);
            toast.success("Proposal updated");
        }
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

    const handleDownloadProforma = () => {
        if (!activeOption) return;
        if (!leadId) { toast.error("Lead must be selected"); return; }
        const lead = leads.find(l => l.id === leadId);
        if (!lead) { toast.error("Lead not found"); return; }

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
        }
    };

    const handleConvertToBooking = () => {
        if (!activeOption) return;
        if (!leadId) { toast.error("Lead is required"); return; }
        const lead = leads.find(l => l.id === leadId);
        if (!lead) { toast.error("Lead not found"); return; }

        if (confirm(`Convert "${activeOption.name}" to a confirmed booking? This will create a new Booking entry.`)) {
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
                id: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

            addBooking(newBooking);

            if (id && id !== 'new') {
                updateProposal(id, { status: 'Accepted' });
                setStatus('Accepted');
            }

            toast.success('Booking created & Proposal Accepted!');
            setTimeout(() => navigate('/admin/bookings'), 1000);
        }
    };

    const handleDownloadPDF = () => {
        if (!leadId) { toast.error("Lead must be selected to generate PDF"); return; }
        const lead = leads.find(l => l.id === leadId);
        if (!lead) { toast.error("Lead not found"); return; }

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
            generateProposalPDF(proposalData, lead, masterHotels, masterActivities);
            toast.success("PDF Downloaded!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate PDF. Make sure all fields are valid.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1116]">
            {/* Header */}
            <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/proposals')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display text-3xl">
                            {id === 'new' ? 'New Proposal' : 'Edit Proposal'}
                        </h2>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>{status}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-sm px-4 py-2.5 transition-all"
                    >
                        <Printer size={18} /> PDF
                    </button>
                    <button
                        onClick={handleDownloadProforma}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-sm px-4 py-2.5 transition-all"
                        title="Download Proforma Invoice"
                    >
                        <FileText size={18} /> Proforma
                    </button>
                    {id !== 'new' && (
                        <button
                            onClick={handleConvertToBooking}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm px-6 py-2.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                            <Check size={18} /> Convert to Booking
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm px-6 py-2.5 shadow-lg shadow-purple-600/20 active:scale-95 transition-all btn-glow"
                    >
                        <Save size={18} /> Save Proposal
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                            {options.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setActiveOptionId(opt.id)}
                                    className={`px-6 py-4 text-sm font-bold border-r border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-2
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
                                className="px-6 py-4 text-sm font-bold text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Option
                            </button>
                        </div>

                        {activeOption && (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Option Name</label>
                                        <input
                                            value={activeOption.name}
                                            onChange={(e) => updateActiveOption('name', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Price (₹)</label>
                                        <input
                                            type="number"
                                            value={activeOption.price}
                                            onChange={(e) => updateActiveOption('price', Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                {/* Hotel Selection */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Hotel size={16} className="text-purple-600" /> Select Hotels Included
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {masterHotels.map(hotel => (
                                            <div
                                                key={hotel.id}
                                                onClick={() => toggleHotel(hotel.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3
                                                    ${activeOption.hotels.includes(hotel.id)
                                                        ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/20'
                                                        : 'bg-slate-50 border-slate-100 hover:border-slate-300'}
                                                `}
                                            >
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5
                                                    ${activeOption.hotels.includes(hotel.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300'}
                                                `}>
                                                    {activeOption.hotels.includes(hotel.id) && <Check size={12} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">{hotel.name}</div>
                                                    <div className="text-xs text-slate-500">₹{hotel.pricePerNight?.toLocaleString()}/night</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {masterHotels.length === 0 && <p className="text-sm text-slate-400 italic">No hotels found in Master Data.</p>}
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
                                                        ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/20'
                                                        : 'bg-slate-50 border-slate-100 hover:border-slate-300'}
                                                `}
                                            >
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5
                                                    ${(activeOption.activities || []).includes(activity.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300'}
                                                `}>
                                                    {(activeOption.activities || []).includes(activity.id) && <Check size={12} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">{activity.name}</div>
                                                    <div className="text-xs text-slate-500">₹{activity.cost?.toLocaleString() || 0}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {masterActivities.length === 0 && <p className="text-sm text-slate-400 italic">No services/activities found in Master Data.</p>}
                                </div>

                                {/* Inclusions (Simple Text Area for now) */}
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
        </div>
    );
};
