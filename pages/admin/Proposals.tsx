import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Plus, Search, Filter, MoreHorizontal,
    Edit, Trash2, Send, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export const Proposals: React.FC = () => {
    const { proposals, deleteProposal, leads } = useData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProposals = (proposals || []).filter(p =>
        (p?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <FileText className="text-purple-600" /> Proposals
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Manage quotations and proposals for your leads.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/proposals/new')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm px-5 py-2.5 shadow-lg shadow-purple-600/20 active:scale-95 transition-all btn-glow"
                >
                    <Plus size={18} /> Create Proposal
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {/* Search & Filters */}
                <div className="mb-6 flex gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search proposals..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2633] font-medium outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>
                </div>

                {/* Proposals Grid */}
                {filteredProposals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProposals.map(proposal => (
                            <div key={proposal.id} className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${proposal.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                                        proposal.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                            proposal.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {proposal.status}
                                    </span>
                                    <div className="relative group/actions">
                                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                            <MoreHorizontal size={18} />
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover/actions:block z-20">
                                            <button onClick={() => navigate(`/admin/proposals/${proposal.id}`)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                                <Edit size={14} /> Edit
                                            </button>
                                            <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                                <Copy size={14} /> Duplicate
                                            </button>
                                            <button onClick={() => handleDelete(proposal.id)} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 line-clamp-1">{proposal.title}</h3>
                                <p className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-1">
                                    Customer: <span className="text-purple-600">{getLeadName(proposal.leadId)}</span>
                                </p>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                        <span>Created</span>
                                        <span className="text-slate-900 dark:text-white">{new Date(proposal.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                        <span>Options</span>
                                        <span className="text-slate-900 dark:text-white">{proposal.options?.length || 0} Variants</span>
                                    </div>
                                </div>

                                <button onClick={() => navigate(`/admin/proposals/${proposal.id}`)} className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2">
                                    Open Proposal
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
        </div>
    );
};
