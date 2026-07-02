import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Package, MasterLocation } from '../../types';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { formatPrice, getLocationName } from '../../utils/packageUtils';
import { copyToClipboard } from '../../utils/clipboard';
import { Calendar, Users, MapPin, Search, Edit3, Link as LinkIcon, Trash2, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'Confirmed':
            return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={10} /> Confirmed</span>;
        case 'Sent':
            return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><Send size={10} /> Sent</span>;
        case 'Cancelled':
            return <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><XCircle size={10} /> Cancelled</span>;
        default:
            return <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><Edit3 size={10} /> Draft</span>;
    }
};

interface ItineraryCardProps {
    pkg: Package;
    masterLocations: MasterLocation[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onCopyLink: (id: string) => void;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({ 
    pkg, 
    masterLocations,
    onEdit, 
    onDelete, 
    onCopyLink 
}) => {
    // Determine the status. For custom itineraries, we use itinerary_status if available, otherwise 'Draft'.
    const status = (pkg as any).itinerary_status || 'Draft';
    const clientName = (pkg as any).client_name || '';
    const validityDate = (pkg as any).validity_date || '';

    // Check if expired
    const isExpired = validityDate && new Date(validityDate) < new Date() && status !== 'Confirmed';

    return (
        <div className={`group bg-white border rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-lg transition-all ${isExpired ? 'border-rose-200' : 'border-stone-200 hover:border-amber-300'}`}>
            {/* Image */}
            <div className="size-20 rounded-xl bg-stone-100 overflow-hidden shrink-0 relative">
                {pkg.image ? (
                    <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <MapPin size={24} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-stone-900 text-lg truncate">{pkg.title || 'Untitled Itinerary'}</h3>
                    <StatusBadge status={status} />
                    {isExpired && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>}
                </div>
                
                {clientName && (
                    <p className="text-xs font-bold text-indigo-600 mb-2">👤 {clientName}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {getLocationName(pkg.location, masterLocations)}</span>
                    {pkg.days > 0 && <span className="flex items-center gap-1"><Calendar size={12} /> {pkg.days} Days</span>}
                    {pkg.groupSize && <span className="flex items-center gap-1"><Users size={12} /> {pkg.groupSize} Guests</span>}
                </div>
            </div>

            {/* Metrics */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 md:pr-4 md:border-r border-stone-100">
                <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Total Price</p>
                    <p className="font-black text-stone-900 text-lg">{formatPrice(pkg.price)}</p>
                </div>
                {validityDate && (
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-1 justify-end"><Clock size={10} /> Valid Until</p>
                        <p className={`font-bold text-sm ${isExpired ? 'text-rose-600' : 'text-stone-600'}`}>
                            {new Date(validityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="w-full md:w-auto flex items-center justify-end gap-3">
                <button
                    onClick={() => onEdit(pkg.id)}
                    className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors flex items-center gap-1.5"
                >
                    <Edit3 size={14} /> Edit
                </button>
                <ActionMenu>
                    <button onClick={() => onCopyLink(pkg.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors w-full text-left font-bold">
                        <LinkIcon size={16} /> Copy Web Link
                    </button>
                    <div className="my-1 border-t border-stone-100" />
                    <button onClick={() => onDelete(pkg.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors w-full text-left font-bold">
                        <Trash2 size={16} /> Delete
                    </button>
                </ActionMenu>
            </div>
        </div>
    );
};

export const ItinerariesDashboard: React.FC = () => {
    const { packages, deletePackage, masterLocations: rawMasterLocations } = useData();
    const masterLocations: MasterLocation[] = rawMasterLocations || [];
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // Filter itineraries: packages with theme "Custom"
    const itineraries = useMemo(() => {
        return packages.filter(p => p.theme === 'Custom' || p.theme === 'Generated');
    }, [packages]);

    const filteredItineraries = useMemo(() => {
        let result = itineraries;
        
        if (statusFilter !== 'All') {
            result = result.filter(p => ((p as any).itinerary_status || 'Draft') === statusFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p => 
                (p.title || '').toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q) ||
                ((p as any).client_name || '').toLowerCase().includes(q)
            );
        }

        // Sort by updated_at descending
        return result.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    }, [itineraries, search, statusFilter]);

    const stats = useMemo(() => {
        let confirmed = 0, sent = 0, draft = 0;
        let revenue = 0;
        
        itineraries.forEach(p => {
            const status = (p as any).itinerary_status || 'Draft';
            if (status === 'Confirmed') {
                confirmed++;
                revenue += p.price;
            }
            else if (status === 'Sent') sent++;
            else if (status === 'Draft') draft++;
        });

        return {
            total: itineraries.length,
            confirmed,
            sent,
            draft,
            revenue
        };
    }, [itineraries]);

    const handleEdit = (id: string) => navigate(`/admin/itinerary-builder?edit=${id}`);
    
    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this itinerary? This action cannot be undone.')) {
            deletePackage(id);
        }
    };

    const handleCopyLink = (id: string) => {
        const url = `${window.location.origin}${window.location.pathname}#/itinerary/${id}`;
        copyToClipboard(url).then(success => {
            if (success) {
                import('sonner').then(({ toast }) => toast.success('Interactive Web Link copied!'));
            } else {
                import('sonner').then(({ toast }) => toast.error('Failed to copy link'));
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-stone-50/50">
            {/* Header & Stats */}
            <div className="p-6 md:p-8 flex flex-col gap-6 border-b border-stone-200 bg-white shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-stone-900 tracking-tight">Custom Itineraries</h1>
                        <p className="text-stone-500 mt-1 font-medium text-sm">Manage, track, and update all custom-built proposals.</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/itinerary-builder')}
                        className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-6 py-3 rounded-xl font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Edit3 size={20} />
                        Create New Proposal
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500"><Edit3 size={18} /></div>
                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Total Drafts</p>
                            <p className="text-xl font-black text-stone-900">{stats.draft}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Send size={18} /></div>
                        <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Proposals Sent</p>
                            <p className="text-xl font-black text-stone-900">{stats.sent}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={18} /></div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Confirmed</p>
                            <p className="text-xl font-black text-stone-900">{stats.confirmed}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><span className="material-symbols-outlined text-[20px]">payments</span></div>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Confirmed Revenue</p>
                            <p className="text-xl font-black text-stone-900">{formatPrice(stats.revenue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 md:px-8 py-4 bg-stone-100/50 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                        className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-400 outline-none placeholder:font-normal"
                        placeholder="Search by title, location, or client..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    {['All', 'Draft', 'Sent', 'Confirmed', 'Cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                                statusFilter === s 
                                    ? 'bg-stone-800 text-white shadow-md' 
                                    : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
                <div className="space-y-4 max-w-5xl mx-auto">
                    {filteredItineraries.length > 0 ? (
                        filteredItineraries.map((pkg: Package) => (
                            <ItineraryCard
                                key={pkg.id}
                                pkg={pkg}
                                masterLocations={masterLocations}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onCopyLink={handleCopyLink}
                            />
                        ))
                    ) : (
                        <div className="text-center py-24 bg-white border border-stone-200 border-dashed rounded-2xl">
                            <div className="size-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Edit3 size={24} />
                            </div>
                            <h3 className="text-lg font-black text-stone-900 mb-1">No itineraries found</h3>
                            <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
                                You haven't created any custom itineraries matching your current filters yet.
                            </p>
                            <button
                                onClick={() => navigate('/admin/itinerary-builder')}
                                className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all mx-auto"
                            >
                                <Edit3 size={16} /> Create One Now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
