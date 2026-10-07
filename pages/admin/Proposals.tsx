import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Plus, Search, Filter, MoreHorizontal,
    Edit, Trash2, Send, Copy, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { SendEmailModal } from '../../components/admin/SendEmailModal';
import { generateProposalPDF } from '../../utils/pdfGenerator';

export const Proposals: React.FC = () => {
    const { proposals, deleteProposal, leads, addProposal, masterHotels, masterActivities } = useData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Sent' | 'Accepted' | 'Rejected'>('All');
    const [emailModalData, setEmailModalData] = useState<{
        isOpen: boolean;
        defaultEmail?: string;
        refId?: string;
        title?: string;
        proposalTitle?: string;
        clientName?: string;
    } | null>(null);

    const filteredProposals = (proposals || []).filter(p => {
        const matchesSearch = (p?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (leads.find(l => l.id === p?.leadId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || p?.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this proposal?')) {
            deleteProposal(id);
        }
    };

    const getLeadName = (leadId: string) => {
        return leads.find(l => l.id === leadId)?.name || 'Unknown Lead';
    };

    return (
        <div className="flex flex-col h-full admin-page-bg">
            {/* Header */}
            <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display text-3xl">
                        <FileText className="text-purple-600" /> Proposals & Quotations
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Manage quotations, multi-tier packages, and client revisions.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/proposals/new')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm px-5 py-2.5 shadow-lg shadow-purple-600/20 active:scale-95 transition-all btn-glow cursor-pointer"
                >
                    <Plus size={18} /> Create Proposal
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {/* Search & Filters */}
                <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search proposals or clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2633] font-medium outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                        />
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {(['All', 'Draft', 'Sent', 'Accepted'] as const).map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    statusFilter === st
                                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Proposals Grid */}
                {filteredProposals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProposals.map(proposal => (
                            <div key={proposal.id} className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${
                                                proposal.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                                proposal.status === 'Sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                                proposal.status === 'Draft' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                                'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                            }`}>
                                                {proposal.status}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                {proposal.version || 'v1'}
                                            </span>
                                        </div>

                                        <div className="relative group/actions">
                                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer">
                                                <MoreHorizontal size={18} />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover/actions:block z-20">
                                                <button onClick={() => navigate(`/admin/proposals/${proposal.id}`)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                                                    <Edit size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const nextRev = (proposal.revisionNumber || 1) + 1;
                                                        const newId = `PROP-${Date.now()}`;
                                                        const cloned: any = {
                                                            ...proposal,
                                                            id: newId,
                                                            title: proposal.title.includes('(Rev') ? proposal.title.replace(/\(Rev\s*\d+\)/, `(Rev ${nextRev})`) : `${proposal.title} (Rev ${nextRev})`,
                                                            version: `v${nextRev}`,
                                                            revisionNumber: nextRev,
                                                            parentId: proposal.parentId || proposal.id,
                                                            revisionNote: `Cloned revision from ${proposal.version || 'v1'}`,
                                                            status: 'Draft',
                                                            createdAt: new Date().toISOString()
                                                        };
                                                        addProposal(cloned);
                                                        toast.success(`Created Revision v${nextRev}`);
                                                        navigate(`/admin/proposals/${newId}`);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Copy size={14} /> Clone / Revise
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const lead = leads.find(l => l.id === proposal.leadId) || { name: 'Valued Client', destination: 'Custom' } as any;
                                                        generateProposalPDF(proposal, lead, masterHotels, masterActivities);
                                                        toast.success(`Downloading PDF for ${proposal.title}`);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Printer size={14} /> Download PDF
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const lead = leads.find(l => l.id === proposal.leadId);
                                                        setEmailModalData({
                                                            isOpen: true,
                                                            defaultEmail: lead?.email || '',
                                                            refId: proposal.id,
                                                            title: `Email Proposal: ${proposal.title}`,
                                                            proposalTitle: proposal.title,
                                                            clientName: lead?.name || 'Valued Lead'
                                                        });
                                                    }} 
                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Send size={14} /> Email Client
                                                </button>
                                                <button onClick={() => handleDelete(proposal.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer">
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-1 line-clamp-1">{proposal.title}</h3>
                                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        Client: <span className="text-purple-600 dark:text-purple-400">{getLeadName(proposal.leadId)}</span>
                                    </p>

                                    {proposal.revisionNote && (
                                        <p className="text-[11px] text-slate-400 italic mb-3 line-clamp-1">
                                            Note: {proposal.revisionNote}
                                        </p>
                                    )}

                                    <div className="space-y-1.5 mb-4">
                                        <div className="flex justify-between text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                            <span>Created</span>
                                            <span className="text-slate-900 dark:text-white font-bold">{new Date(proposal.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                            <span>Tiers / Variants</span>
                                            <span className="text-purple-600 dark:text-purple-400 font-black">
                                                {proposal.options?.length > 0
                                                    ? proposal.options.map(o => o.tier || o.name).join(' • ')
                                                    : '1 Option'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => navigate(`/admin/proposals/${proposal.id}`)} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95">
                                    Open Proposal Builder
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Proposals Yet</h3>
                        <p className="text-slate-500 max-w-sm mb-6">Create comprehensive proposals with multiple options and share them with your leads.</p>
                        <button
                            onClick={() => navigate('/admin/proposals/new')}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm px-6 py-3 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                        >
                            Create First Proposal
                        </button>
                    </div>
                )}
            </div>

            {emailModalData && (
                <SendEmailModal
                    isOpen={emailModalData.isOpen}
                    onClose={() => setEmailModalData(null)}
                    defaultEmail={emailModalData.defaultEmail}
                    refId={emailModalData.refId}
                    templateType="proposal"
                    title={emailModalData.title || 'Email Proposal'}
                    details={{
                        tripTitle: emailModalData.proposalTitle,
                        clientName: emailModalData.clientName,
                        documentType: 'Tour Proposal'
                    }}
                />
            )}
        </div>
    );
};
