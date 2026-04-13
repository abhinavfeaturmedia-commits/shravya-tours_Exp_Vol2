
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { DailySlot, BookingType } from '../../types';

// Mock Assets removed - using masterTransports instead



export const Inventory: React.FC = () => {
    const { inventory, updateInventory, packages, bookings, masterTransports, vendors, leads } = useData();

    // Derived Assets from Masters and Vendors
    const carAssets = useMemo(() => {
        const fromMaster = masterTransports.filter(t => ['Sedan', 'SUV', 'Hatchback'].includes(t.type));
        const fromVendors = vendors.filter(v => v.category === 'Transport' && (v.subCategory === 'Taxi/Cab' || !v.subCategory)).map(v => ({ id: v.id, name: v.name, type: 'Vendor Car' as any, capacity: 4, baseRate: 0, status: 'Active' as any }));
        return [...fromMaster, ...fromVendors];
    }, [masterTransports, vendors]);

    const busAssets = useMemo(() => {
        const fromMaster = masterTransports.filter(t => ['Bus', 'Tempo Traveller'].includes(t.type));
        const fromVendors = vendors.filter(v => v.category === 'Transport' && v.subCategory === 'Bus').map(v => ({ id: v.id, name: v.name, type: 'Vendor Bus' as any, capacity: 40, baseRate: 0, status: 'Active' as any }));
        return [...fromMaster, ...fromVendors];
    }, [masterTransports, vendors]);

    // State
    const [inventoryType, setInventoryType] = useState<'Tour' | 'Car' | 'Bus'>('Tour');
    const [selectedAssetId, setSelectedAssetId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [viewDate, setViewDate] = useState(new Date());

    // Edit Form (Only for Tours currently)
    const [editForm, setEditForm] = useState({ capacity: 20, price: 0, isBlocked: false });

    // Derived Date Logic
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const currentMonthName = viewDate.toLocaleString('default', { month: 'short' });
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon=0

    // Reset selection when switching types
    useEffect(() => {
        setSelectedDate(null);
        if (inventoryType === 'Tour') {
            if (packages.length > 0) setSelectedAssetId(packages[0].id);
        } else if (inventoryType === 'Car') {
            if (carAssets.length > 0) setSelectedAssetId(carAssets[0].id);
        } else if (inventoryType === 'Bus') {
            if (busAssets.length > 0) setSelectedAssetId(busAssets[0].id);
        }
    }, [inventoryType, packages, carAssets, busAssets]);

    // CORE LOGIC: Get Slot Data
    const getSlot = (day: number): DailySlot => {
        // Construct date string YYYY-MM-DD
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 1. TOUR LOGIC (Dynamic Calculation + Manual Settings)
        if (inventoryType === 'Tour') {
            const defaultSlot = { date: day, capacity: 0, booked: 0, price: 35000, isBlocked: false };
            const slotSettings = inventory[day] || defaultSlot;

            // Calculate booked count from meaningful bookings
            const matchingBookings = bookings.filter(b =>
                b.type === 'Tour' &&
                b.date === dateStr &&
                b.status !== 'Cancelled'
            ).reduce((acc, curr) => {
                // Try to parse "2 Adults, 1 Child" -> 3 guests
                // Or default to 1 if parsing fails
                let count = 0;
                if (curr.guests) {
                    const parts = curr.guests.split(',');
                    parts.forEach(p => {
                        const num = parseInt(p.trim().split(' ')[0] || '0');
                        if (!isNaN(num)) count += num;
                    });
                }
                return acc + (count || 1);
            }, 0);

            return {
                ...slotSettings,
                capacity: 0, // Enforce unlimited (0) for Tours
                booked: matchingBookings
            };
        }

        // 2. CAR & BUS LOGIC (Dynamic Calculation from Bookings)

        let asset;
        let matchingBookings = 0;

        if (inventoryType === 'Car') {
            asset = carAssets.find(c => c.id === selectedAssetId) || carAssets[0];
            if (!asset) return { date: day, capacity: 0, booked: 0, price: 0, isBlocked: false };

            // Find bookings that match the date, type='Car', and contain the car name/type in title/details
            matchingBookings = bookings.filter(b =>
                b.type === 'Car' &&
                b.date === dateStr &&
                (b.title.includes(asset!.name) || (b.details && b.details.includes(asset!.name)))
            ).length;
        } else {
            asset = busAssets.find(b => b.id === selectedAssetId) || busAssets[0];
            if (!asset) return { date: day, capacity: 0, booked: 0, price: 0, isBlocked: false };

            // For buses, we count 'guests' or 'seats' usually
            matchingBookings = bookings.filter(b =>
                b.type === 'Bus' &&
                b.date === dateStr
            ).reduce((acc, curr) => {
                // Parse guests string "2 Adults" -> 2
                let count = 0;
                if (curr.guests) {
                    const parts = curr.guests.split(',');
                    parts.forEach(p => {
                        const num = parseInt(p.trim().split(' ')[0] || '0');
                        count += isNaN(num) ? 0 : num;
                    });
                }
                return acc + (count || 1);
            }, 0);
        }

        return {
            date: day,
            capacity: asset.capacity,
            booked: matchingBookings,
            price: asset.baseRate,
            isBlocked: false
        };
    };

    // Sync form with selected date
    useEffect(() => {
        if (selectedDate) {
            const slot = getSlot(selectedDate);
            setEditForm({
                capacity: slot.capacity,
                price: slot.price,
                isBlocked: slot.isBlocked
            });
        }
    }, [selectedDate, inventoryType, selectedAssetId]); // Re-run if context changes

    const handleUpdate = () => {
        if (inventoryType !== 'Tour') {
            alert("Dynamic inventory (Cars/Buses) is calculated based on bookings. To adjust availability, manage your bookings or fleet settings.");
            return;
        }
        if (selectedDate) {
            // Update the global inventory context (only supports Tour slots currently)
            updateInventory(selectedDate, {
                date: selectedDate,
                capacity: editForm.capacity,
                price: editForm.price,
                isBlocked: editForm.isBlocked,
                booked: editForm.isBlocked ? 0 : (inventory[selectedDate]?.booked || 0)
            });
        }
    };

    const handleExport = () => {
        const csvHeader = "Date,Type,Item,Capacity,Booked,Price,Status\n";
        const rows = [];
        const itemName = inventoryType === 'Tour'
            ? packages.find(p => p.id === selectedAssetId)?.title
            : inventoryType === 'Car'
                ? carAssets.find(c => c.id === selectedAssetId)?.name || selectedAssetId
                : busAssets.find(b => b.id === selectedAssetId)?.name || selectedAssetId;

        for (let i = 1; i <= daysInMonth; i++) {
            const slot = getSlot(i);
            const status = slot.isBlocked ? 'Blocked' : slot.booked >= slot.capacity ? 'Sold Out' : 'Available';
            rows.push(`${currentYear}-${currentMonth + 1}-${i},${inventoryType},${itemName},${slot.capacity},${slot.booked},${slot.price},${status}`);
        }
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvHeader + rows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `inventory_${inventoryType}_${currentMonthName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const changeMonth = (delta: number) => {
        setSelectedDate(null);
        setViewDate(new Date(currentYear, currentMonth + delta, 1));
    };

    const getStatus = (slot: DailySlot) => {
        if (slot.isBlocked) return 'blocked';
        if (slot.capacity > 0 && slot.booked >= slot.capacity) return 'full';
        if (slot.capacity > 0 && slot.booked >= slot.capacity * 0.75) return 'filling';
        return 'avail';
    };

    // Calculate advanced metrics for selected date
    const getAdvancedMetrics = () => {
        if (!selectedDate) return { pendingInquiries: 0, driversAssigned: 0, totalAssignedNeeded: 0 };
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
        
        let pendingInquiries = 0;
        if (leads && leads.length > 0) {
            pendingInquiries = leads.filter(l => 
                ['New', 'Warm', 'Hot', 'Offer Sent'].includes(l.status) &&
                l.startDate?.startsWith(dateStr)
            ).length;
        }
        
        let driversAssigned = 0;
        let totalAssignedNeeded = 0;
        if (bookings && bookings.length > 0) {
            let relevantBookings = [];
            if (inventoryType === 'Tour') {
                relevantBookings = bookings.filter(b => b.type === 'Tour' && b.packageId === selectedAssetId && b.date?.startsWith(dateStr));
            } else {
                const asset = inventoryType === 'Car' ? carAssets.find(c => c.id === selectedAssetId) : busAssets.find(b => b.id === selectedAssetId);
                relevantBookings = bookings.filter(b => b.type === inventoryType && b.details && asset && b.details.includes(asset.name) && b.date?.startsWith(dateStr));
            }
            totalAssignedNeeded = relevantBookings.length;
            driversAssigned = relevantBookings.filter(b => b.assignedTo).length;
        }
        
        return { pendingInquiries, driversAssigned, totalAssignedNeeded };
    };
    const advancedMetrics = getAdvancedMetrics();

    return (
        <div className="flex h-full overflow-hidden relative admin-page-bg">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Toolbar */}
                <div className="px-4 md:px-6 py-4 flex flex-col gap-4 bg-white dark:bg-[#1A2633] border-b border-border-light dark:border-border-dark shadow-sm shrink-0 z-10">

                    {/* Top Row: Title & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display text-3xl">Inventory & Availability</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
                                {inventoryType === 'Tour' ? 'Manage tour slots and dates.' :
                                    inventoryType === 'Car' ? 'Monitor fleet availability.' :
                                        'Track bus seat occupancy.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleExport} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors btn-glow">
                                <span className="material-symbols-outlined text-[20px]">download</span> Export
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full lg:w-auto">

                            {/* Type Selector */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                                {['Tour', 'Car', 'Bus'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setInventoryType(type as any)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${inventoryType === type ? 'bg-white dark:bg-[#1A2633] shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {/* Asset Selector */}
                            <div className="relative w-full lg:min-w-[240px]">
                                <select
                                    value={selectedAssetId}
                                    onChange={(e) => setSelectedAssetId(e.target.value)}
                                    className="appearance-none w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                >
                                    {inventoryType === 'Tour' && packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    {inventoryType === 'Car' && carAssets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    {inventoryType === 'Bus' && busAssets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 material-symbols-outlined">expand_more</span>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400 lg:pl-4 lg:border-l border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-green-500"></div><span>Avail</span></div>
                                <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-yellow-500"></div><span>Filling</span></div>
                                <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-red-500"></div><span>Full</span></div>
                            </div>
                        </div>

                        {/* Month Navigation */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-auto sm:ml-0">
                            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                            <span className="px-4 text-sm font-semibold min-w-[120px] text-center text-slate-900 dark:text-white">{currentMonthName} {currentYear}</span>
                            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-slate-50 dark:bg-[#101922]">
                    <div className="max-w-[1400px] mx-auto bg-white dark:bg-[#1A2633] rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/30">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="py-3 text-center text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-[100px] md:auto-rows-[140px] text-sm">
                            {/* Empty Slots for Start Offset */}
                            {Array.from({ length: startOffset }).map((_, i) => (
                                <div key={`empty-${i}`} className="p-2 md:p-3 border-b border-r border-border-light dark:border-border-dark bg-slate-50/30 dark:bg-slate-900/30"></div>
                            ))}

                            {/* Actual Days */}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                const slot = getSlot(day);
                                const status = getStatus(slot);

                                let colorClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
                                if (status === 'full') colorClass = 'bg-red-50/30 dark:bg-red-900/5 hover:bg-red-50 dark:hover:bg-red-900/10';
                                if (status === 'blocked') colorClass = 'bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80';

                                const occupancyPct = slot.capacity > 0 ? (slot.booked / slot.capacity) * 100 : 0;

                                return (
                                    <div
                                        key={day}
                                        onClick={() => setSelectedDate(day)}
                                        className={`group relative p-2 md:p-3 border-b border-r border-border-light dark:border-border-dark transition-colors cursor-pointer flex flex-col justify-between ${colorClass} ${selectedDate === day ? 'ring-2 ring-inset ring-primary z-10 bg-primary/5' : ''}`}
                                    >
                                        <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">{day}</span>
                                        {status === 'blocked' ? (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-1 opacity-60">
                                                <span className="material-symbols-outlined text-slate-400 text-[18px] md:text-[20px]">block</span>
                                                <span className="text-[10px] md:text-xs font-medium text-slate-500 hidden md:inline">Blocked</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 md:space-y-1.5">
                                                <div className="flex justify-between text-[10px] md:text-xs text-slate-600 dark:text-slate-400">
                                                    <span className="hidden md:inline">{inventoryType === 'Bus' ? 'Seats' : 'Units'}</span>
                                                    <span className={`font-medium ml-auto ${status === 'full' ? 'text-red-600' : ''}`}>
                                                        {slot.capacity > 0 ? `${slot.booked}/${slot.capacity}` : `${slot.booked} Booked`}
                                                    </span>
                                                </div>
                                                {slot.capacity > 0 && (
                                                    <div className="h-1.5 md:h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${status === 'full' ? 'bg-red-500' : status === 'filling' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${occupancyPct}%` }}></div>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${status === 'full' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{status === 'full' ? 'Sold Out' : 'Available'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Context Sidebar (Responsive Slide-over) */}
            <div
                className={`
            fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden transition-opacity duration-300
            ${selectedDate ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
         `}
                onClick={() => setSelectedDate(null)}
            />
            <aside
                className={`
            fixed inset-y-0 right-0 z-50 w-80 md:w-96 bg-white dark:bg-[#1A2633] border-l border-border-light dark:border-border-dark shadow-2xl xl:shadow-none xl:static xl:translate-x-0
            transform transition-transform duration-300 flex flex-col
            ${selectedDate ? 'translate-x-0' : 'translate-x-full'}
         `}
            >
                {selectedDate && (
                    <>
                        <div className="p-6 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-white dark:bg-[#1A2633] z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daily Summary</h2>
                                <p className="text-sm text-slate-500">{currentMonthName} {selectedDate}, {currentYear}</p>
                            </div>
                            <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600 p-2"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex flex-col items-center justify-center text-center border border-blue-100 dark:border-blue-900/20">
                                    <span className="text-4xl kpi-number text-primary">{getSlot(selectedDate).booked}</span>
                                    <span className="text-sm font-medium text-primary/80 uppercase tracking-wide mt-1">Total Confirmed Bookings</span>
                                </div>
                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 flex flex-col items-center justify-center text-center border border-amber-100 dark:border-amber-900/20">
                                    <span className="text-3xl kpi-number text-amber-600">{advancedMetrics.pendingInquiries}</span>
                                    <span className="text-xs font-medium text-amber-600/80 uppercase tracking-wide mt-1">Pending Inquiries</span>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 flex flex-col items-center justify-center text-center border border-purple-100 dark:border-purple-900/20">
                                    <span className="text-3xl kpi-number text-purple-600">{advancedMetrics.driversAssigned}/{advancedMetrics.totalAssignedNeeded}</span>
                                    <span className="text-xs font-medium text-purple-600/80 uppercase tracking-wide mt-1">Staffing Readiness</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{getSlot(selectedDate).capacity > 0 ? 'Occupancy Rate' : 'Total Booked'}</h3><span className="text-sm font-bold text-slate-700 dark:text-slate-300">{getSlot(selectedDate).capacity > 0 ? `${Math.round((getSlot(selectedDate).booked / getSlot(selectedDate).capacity) * 100)}%` : getSlot(selectedDate).booked}</span></div>
                                {getSlot(selectedDate).capacity > 0 && (
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden"><div className="bg-primary h-3 rounded-full" style={{ width: `${(getSlot(selectedDate).booked / getSlot(selectedDate).capacity) * 100}%` }}></div></div>
                                )}
                            </div>

                            {/* Type specific notice */}
                            {inventoryType !== 'Tour' && (
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl text-sm text-orange-800 dark:text-orange-200">
                                    <p className="font-bold mb-1">Automated Inventory</p>
                                    <p className="opacity-90">Availability for Cars and Buses is calculated automatically based on active bookings. To free up slots, cancel or reschedule existing bookings in the Bookings tab.</p>
                                </div>
                            )}

                            {/* Manual Override Form (Tours Only) */}
                            <div className={`space-y-4 ${inventoryType !== 'Tour' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                                    Overrides {inventoryType !== 'Tour' && '(Disabled)'}
                                </h3>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#1A2633]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600"><span className="material-symbols-outlined text-[20px]">block</span></div>
                                        <div className="flex flex-col"><span className="text-sm font-medium text-slate-900 dark:text-white">Stop Sell</span><span className="text-xs text-slate-500">Block bookings</span></div>
                                    </div>
                                    <input type="checkbox" checked={editForm.isBlocked} onChange={e => setEditForm({ ...editForm, isBlocked: e.target.checked })} className="w-11 h-6 rounded-full text-primary focus:ring-primary/20 cursor-pointer" />
                                </div>

                                <button onClick={handleUpdate} className="w-full py-3 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-colors mt-2">
                                    Update Availability
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
};
