import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vendor } from '../../types';

interface VendorSearchSelectProps {
    vendors: Vendor[];
    selectedVendorId?: string;
    onSelect: (vendor: Vendor | null) => void;
    placeholder?: string;
    required?: boolean;
    activeServiceType?: string; // used for smart pre-filtering
    className?: string;
}

export const VendorSearchSelect: React.FC<VendorSearchSelectProps> = ({
    vendors,
    selectedVendorId,
    onSelect,
    placeholder = 'Search & select a vendor...',
    required = false,
    activeServiceType,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Selected vendor object
    const selectedVendor = useMemo(() => {
        return vendors.find(v => v.id === selectedVendorId) || null;
    }, [vendors, selectedVendorId]);

    // Available categories from actual vendor data + standard categories
    const categoryStats = useMemo(() => {
        const counts: Record<string, number> = {};
        vendors.forEach(v => {
            const cat = v.category || 'Other';
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const list = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        return { counts, list, total: vendors.length };
    }, [vendors]);

    // Sync active category if serviceType changes (Smart Pre-filtering)
    useEffect(() => {
        if (!activeServiceType) return;
        const normalized = activeServiceType.toLowerCase();
        const match = categoryStats.list.find(c => c.toLowerCase() === normalized);
        if (match) {
            setSelectedCategory(match);
        }
    }, [activeServiceType, categoryStats.list]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Close on click outside or escape key
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Filtered vendor list
    const filteredVendors = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return vendors.filter(v => {
            // Category match
            if (selectedCategory !== 'All' && v.category !== selectedCategory) {
                return false;
            }

            // Search query match across multiple fields
            if (!q) return true;
            const matchName = v.name?.toLowerCase().includes(q);
            const matchCat = v.category?.toLowerCase().includes(q);
            const matchSubCat = v.subCategory?.toLowerCase().includes(q);
            const matchLoc = v.location?.toLowerCase().includes(q);
            const matchContact = v.contactName?.toLowerCase().includes(q);
            const matchPhone = v.contactPhone?.toLowerCase().includes(q);

            return matchName || matchCat || matchSubCat || matchLoc || matchContact || matchPhone;
        });
    }, [vendors, selectedCategory, searchQuery]);

    // Category styling helper
    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'Transport':
                return {
                    icon: 'directions_car',
                    style: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                };
            case 'Hotel':
                return {
                    icon: 'hotel',
                    style: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                };
            case 'DMC':
                return {
                    icon: 'public',
                    style: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                };
            case 'Activity':
                return {
                    icon: 'local_activity',
                    style: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                };
            case 'Guide':
                return {
                    icon: 'person_pin',
                    style: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
                };
            default:
                return {
                    icon: 'business',
                    style: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                };
        }
    };

    const handleSelect = (vendor: Vendor) => {
        onSelect(vendor);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(null);
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Main Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isOpen
                        ? 'border-primary ring-2 ring-primary/20 shadow-sm bg-white dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                {selectedVendor ? (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`material-symbols-outlined text-[18px] shrink-0 ${getCategoryBadge(selectedVendor.category).style.split(' ')[1]}`}>
                            {getCategoryBadge(selectedVendor.category).icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {selectedVendor.name}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${getCategoryBadge(selectedVendor.category).style}`}>
                                    {selectedVendor.category}
                                </span>
                            </div>
                            {(selectedVendor.location || selectedVendor.contactPhone) && (
                                <p className="text-[11px] text-slate-400 truncate">
                                    {selectedVendor.location && <span>{selectedVendor.location}</span>}
                                    {selectedVendor.location && selectedVendor.contactPhone && <span> • </span>}
                                    {selectedVendor.contactPhone && <span>{selectedVendor.contactPhone}</span>}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">storefront</span>
                        <span>{placeholder}</span>
                    </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                    {selectedVendor && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="Clear selection"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    )}
                    <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
                        expand_more
                    </span>
                </div>
            </div>

            {/* Hidden Input for HTML5 form validation */}
            {required && (
                <input
                    type="text"
                    required
                    value={selectedVendorId || ''}
                    onChange={() => {}}
                    className="sr-only"
                    tabIndex={-1}
                />
            )}

            {/* Dropdown Popover Panel */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[280px] sm:max-h-[320px]">
                    {/* Header: Search Box */}
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                                search
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, location, contact, phone..."
                                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white placeholder-slate-400 font-medium"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                                </button>
                            )}
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('All')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                                    selectedCategory === 'All'
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>All</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedCategory === 'All' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                    {categoryStats.total}
                                </span>
                            </button>

                            {categoryStats.list.map(cat => {
                                const isCatSelected = selectedCategory === cat;
                                const count = categoryStats.counts[cat] || 0;
                                const badge = getCategoryBadge(cat);

                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                            isCatSelected
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-[14px] ${isCatSelected ? 'text-white' : ''}`}>
                                            {badge.icon}
                                        </span>
                                        <span>{cat}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isCatSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Vendor List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                        {filteredVendors.length === 0 ? (
                            <div className="py-8 text-center px-4">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1 block">
                                    search_off
                                </span>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No vendors found</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different name or category</p>
                                {(searchQuery || selectedCategory !== 'All') && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                                        className="mt-2.5 text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">refresh</span> Reset filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredVendors.map(vendor => {
                                const isSelected = vendor.id === selectedVendorId;
                                const badge = getCategoryBadge(vendor.category);

                                return (
                                    <div
                                        key={vendor.id}
                                        onClick={() => handleSelect(vendor)}
                                        className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                            isSelected
                                                ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {vendor.name}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${badge.style}`}>
                                                    <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
                                                    {vendor.category}
                                                </span>
                                                {vendor.subCategory && (
                                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                        {vendor.subCategory}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                                                {vendor.location && (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[12px] text-slate-400">location_on</span>
                                                        <span className="truncate max-w-[200px]">{vendor.location}</span>
                                                    </span>
                                                )}
                                                {vendor.contactPhone && (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[12px] text-slate-400">call</span>
                                                        <span>{vendor.contactPhone}</span>
                                                    </span>
                                                )}
                                                {vendor.contactName && (
                                                    <span className="text-slate-400 italic">
                                                        ({vendor.contactName})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="size-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer counter */}
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
                        {selectedCategory !== 'All' && (
                            <span className="font-semibold text-primary">Category: {selectedCategory}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
