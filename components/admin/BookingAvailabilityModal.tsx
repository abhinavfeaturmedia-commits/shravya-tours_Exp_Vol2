import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Send, Search, Mail, MessageCircle, Copy, RefreshCw, Trophy, CheckCircle2, XCircle, Clock, Eye, AlertTriangle, Hotel, Car, Map, Ticket, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Booking, AvailabilityRfq, AvailabilityInvite, RfqServiceType } from '../../types';
import { useData } from '../../context/DataContext';
import { api } from '../../src/lib/api';

interface Props {
    booking: Booking;
    isOpen: boolean;
    onClose: () => void;
    onAwarded?: () => void;
}

const SERVICES: { key: RfqServiceType; icon: React.ReactNode; category: string }[] = [
    { key: 'Hotel', icon: <Hotel size={16} />, category: 'Hotel' },
    { key: 'Transport', icon: <Car size={16} />, category: 'Transport' },
    { key: 'DMC', icon: <Map size={16} />, category: 'DMC' },
    { key: 'Activity', icon: <Ticket size={16} />, category: 'Activity' },
];

const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const toInputDate = (d?: string) => (d ? String(d).slice(0, 10) : '');
const money = (n: number | null) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);

const StatusBadge: React.FC<{ s: AvailabilityInvite['status'] }> = ({ s }) => {
    const map: Record<string, string> = {
        Available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
        'Not Available': 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
        Viewed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
        Sent: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    };
    const icon = s === 'Available' ? <CheckCircle2 size={12} /> : s === 'Not Available' ? <XCircle size={12} /> : s === 'Viewed' ? <Eye size={12} /> : <Clock size={12} />;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${map[s]}`}>{icon}{s === 'Sent' ? 'Awaiting' : s}</span>;
};

export const BookingAvailabilityModal: React.FC<Props> = ({ booking, isOpen, onClose, onAwarded }) => {
    const { vendors } = useData();
    const [tab, setTab] = useState<'new' | 'replies'>('new');
    const [service, setService] = useState<RfqServiceType>('Hotel');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Record<string, string>>({}); // vendorId -> email (editable)
    const [sending, setSending] = useState(false);
    const [rfqs, setRfqs] = useState<AvailabilityRfq[]>([]);
    const [loadingRfqs, setLoadingRfqs] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    // requirement fields
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [rooms, setRooms] = useState(1);
    const [roomType, setRoomType] = useState('');
    const [meal, setMeal] = useState('CP (Breakfast)');
    const [vehicle, setVehicle] = useState('');
    const [route, setRoute] = useState('');
    const [activityName, setActivityName] = useState('');
    const [extra, setExtra] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setTab('new');
        setSelected({});
        setSearch('');
        setStartDate(toInputDate(booking.date));
        setEndDate(toInputDate(booking.endDate));
        setAdults(booking.paxAdult || booking.paxCount || 2);
        setChildren(booking.paxChild || 0);
        setRooms(Math.max(1, Math.ceil((booking.paxAdult || booking.paxCount || 2) / 2)));
        setDestination('');
    }, [isOpen, booking.id]);

    const loadRfqs = useCallback(async (silent = false) => {
        if (!silent) setLoadingRfqs(true);
        try {
            setRfqs(await api.getAvailabilityRfqs(booking.id));
        } catch (e: any) {
            if (!silent) toast.error(e.message || 'Could not load replies');
        } finally {
            if (!silent) setLoadingRfqs(false);
        }
    }, [booking.id]);

    useEffect(() => {
        if (!isOpen) return;
        loadRfqs();
        const t = setInterval(() => loadRfqs(true), 30000);
        return () => clearInterval(t);
    }, [isOpen, loadRfqs]);

    const filteredVendors = useMemo(() => {
        const cat = SERVICES.find(s => s.key === service)!.category;
        const q = search.trim().toLowerCase();
        return (vendors || [])
            .filter((v: any) => v.category === cat && v.contractStatus !== 'Blacklisted')
            .filter((v: any) => !q || `${v.name} ${v.location || ''}`.toLowerCase().includes(q));
    }, [vendors, service, search]);

    const selectedCount = Object.keys(selected).length;

    const toggleVendor = (v: any) => {
        setSelected(prev => {
            const next = { ...prev };
            if (v.id in next) delete next[v.id];
            else next[v.id] = v.contactEmail || '';
            return next;
        });
    };

    const buildLines = () => {
        const L: { label: string; value: string }[] = [];
        if (destination) L.push({ label: 'Destination', value: destination });
        if (startDate) L.push({ label: service === 'Hotel' ? 'Check-in' : 'From', value: fmtDate(startDate) });
        if (endDate) L.push({ label: service === 'Hotel' ? 'Check-out' : 'To', value: fmtDate(endDate) });
        L.push({ label: 'Guests', value: `${adults} adult${adults === 1 ? '' : 's'}${children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''}` });
        if (service === 'Hotel') {
            L.push({ label: 'Rooms', value: String(rooms) });
            if (roomType) L.push({ label: 'Room type', value: roomType });
            if (meal) L.push({ label: 'Meal plan', value: meal });
        }
        if (service === 'Transport') {
            if (vehicle) L.push({ label: 'Vehicle', value: vehicle });
            if (route) L.push({ label: 'Route', value: route });
        }
        if (service === 'Activity' && activityName) L.push({ label: 'Activity', value: activityName });
        if (extra) L.push({ label: 'Other requirements', value: extra });
        return L;
    };

    const handleSend = async () => {
        if (!selectedCount) return;
        if (!startDate) { toast.error('Please set the start date'); return; }
        const picked = (vendors || []).filter((v: any) => v.id in selected);
        setSending(true);
        try {
            const res = await api.createAvailabilityRfq({
                bookingId: booking.id,
                serviceType: service,
                summaryLines: buildLines(),
                notes: notes.trim() || undefined,
                destination: destination || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                vendors: picked.map((v: any) => ({ vendorId: v.id, name: v.name, email: selected[v.id]?.trim(), phone: v.contactPhone })),
            });
            const failed = res.results.filter(r => r.emailStatus === 'Failed').length;
            if (failed === 0) toast.success(`Emails sent to ${res.results.length} vendor(s)`);
            else toast.warning(`${res.results.length - failed} sent, ${failed} failed. Use Resend / Copy link in Replies.`);
            setSelected({});
            await loadRfqs(true);
            setTab('replies');
        } catch (e: any) {
            toast.error(e.message || 'Could not send requests');
        } finally {
            setSending(false);
        }
    };

    const act = async (id: string, fn: () => Promise<any>, okMsg: string) => {
        setBusyId(id);
        try { await fn(); toast.success(okMsg); await loadRfqs(true); }
        catch (e: any) { toast.error(e.message || 'Action failed'); }
        finally { setBusyId(null); }
    };

    const copyLink = async (link: string | null) => {
        if (!link) return;
        try { await navigator.clipboard.writeText(link); toast.success('Link copied'); } catch { toast.error('Copy failed'); }
    };

    const whatsapp = (inv: AvailabilityInvite, rfq: AvailabilityRfq) => {
        const phone = (inv.vendorPhone || '').replace(/\D/g, '');
        const msg = `Hello ${inv.vendorName}, please confirm availability for our ${rfq.serviceType} request using this link: ${inv.link}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (!isOpen) return null;

    const repliedTotal = rfqs.reduce((a, r) => a + r.invites.filter(i => i.status === 'Available' || i.status === 'Not Available').length, 0);
    const inviteTotal = rfqs.reduce((a, r) => a + r.invites.length, 0);

    return (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full sm:max-w-4xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Check Availability &amp; Quotes</h2>
                        <p className="text-xs text-slate-500">BK-{String(booking.bookingNumber || 0).padStart(4, '0')} · {booking.customer} · {booking.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X size={18} /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-2 border-b border-slate-200 dark:border-slate-800">
                    {([['new', 'New request'], ['replies', `Replies (${repliedTotal}/${inviteTotal})`]] as const).map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)}
                            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === k ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{l}</button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {tab === 'new' ? (
                        <div className="p-5 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {SERVICES.map(s => (
                                    <button key={s.key} onClick={() => { setService(s.key); setSelected({}); }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${service === s.key ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        {s.icon}{s.key}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Requirements */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Requirements</h3>
                                    <div><label className={labelCls}>Destination / city</label><input className={inputCls} value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Manali" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>{service === 'Hotel' ? 'Check-in' : 'From'}</label><input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                                        <div><label className={labelCls}>{service === 'Hotel' ? 'Check-out' : 'To'}</label><input type="date" className={inputCls} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>Adults</label><input type="number" min={1} className={inputCls} value={adults} onChange={e => setAdults(Math.max(1, Number(e.target.value)))} /></div>
                                        <div><label className={labelCls}>Children</label><input type="number" min={0} className={inputCls} value={children} onChange={e => setChildren(Math.max(0, Number(e.target.value)))} /></div>
                                    </div>
                                    {service === 'Hotel' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className={labelCls}>Rooms</label><input type="number" min={1} className={inputCls} value={rooms} onChange={e => setRooms(Math.max(1, Number(e.target.value)))} /></div>
                                                <div><label className={labelCls}>Meal plan</label>
                                                    <select className={inputCls} value={meal} onChange={e => setMeal(e.target.value)}>
                                                        {['EP (Room only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All meals)'].map(m => <option key={m}>{m}</option>)}
                                                    </select></div>
                                            </div>
                                            <div><label className={labelCls}>Room type</label><input className={inputCls} value={roomType} onChange={e => setRoomType(e.target.value)} placeholder="Deluxe, Suite..." /></div>
                                        </>
                                    )}
                                    {service === 'Transport' && (
                                        <>
                                            <div><label className={labelCls}>Vehicle</label><input className={inputCls} value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Innova, Tempo Traveller..." /></div>
                                            <div><label className={labelCls}>Route</label><input className={inputCls} value={route} onChange={e => setRoute(e.target.value)} placeholder="Airport → Hotel → Sightseeing" /></div>
                                        </>
                                    )}
                                    {service === 'Activity' && (
                                        <div><label className={labelCls}>Activity</label><input className={inputCls} value={activityName} onChange={e => setActivityName(e.target.value)} placeholder="Paragliding, Rafting..." /></div>
                                    )}
                                    <div><label className={labelCls}>Other requirements</label><input className={inputCls} value={extra} onChange={e => setExtra(e.target.value)} placeholder="Extra bed, veg meals..." /></div>
                                    <div><label className={labelCls}>Note to vendor (optional)</label><textarea rows={2} className={`${inputCls} resize-none`} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                                </div>

                                {/* Vendors */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Send to vendors <span className="text-slate-400 font-normal">({selectedCount} selected)</span></h3>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input className={`${inputCls} pl-8`} placeholder={`Search ${service} vendors`} value={search} onChange={e => setSearch(e.target.value)} />
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                        {filteredVendors.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No {service} vendors found.</p>}
                                        {filteredVendors.map((v: any) => {
                                            const on = v.id in selected;
                                            return (
                                                <div key={v.id} className={`rounded-xl border p-2.5 transition-colors ${on ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                                        <input type="checkbox" checked={on} onChange={() => toggleVendor(v)} className="accent-primary w-4 h-4" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold truncate">{v.name}</p>
                                                            <p className="text-[11px] text-slate-500 truncate">{v.location}</p>
                                                        </div>
                                                        {!v.contactEmail && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><AlertTriangle size={11} />No email</span>}
                                                    </label>
                                                    {on && (
                                                        <input type="email" className={`${inputCls} mt-2`} placeholder="Vendor email" value={selected[v.id]}
                                                            onChange={e => setSelected(p => ({ ...p, [v.id]: e.target.value }))} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 space-y-5">
                            {loadingRfqs && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>}
                            {!loadingRfqs && rfqs.length === 0 && <p className="text-center text-sm text-slate-500 py-10">No requests sent yet for this booking.</p>}
                            {rfqs.map(rfq => {
                                const cheapest = rfq.invites.filter(i => i.status === 'Available' && i.quotedPrice != null).sort((a, b) => (a.quotedPrice! - b.quotedPrice!))[0];
                                return (
                                    <div key={rfq.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60">
                                            <div className="text-sm">
                                                <span className="font-bold">{rfq.serviceType}</span>
                                                <span className="text-slate-500"> · {rfq.summaryLines.map(l => l.value).slice(0, 3).join(' · ')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rfq.status === 'Open' ? 'bg-blue-100 text-blue-700' : rfq.status === 'Awarded' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{rfq.status}</span>
                                                {rfq.status === 'Open' && (
                                                    <button disabled={busyId === rfq.id} onClick={() => act(rfq.id, () => api.closeAvailabilityRfq(rfq.id), 'Request closed')} className="text-xs font-semibold text-slate-500 hover:text-rose-600">Close</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {rfq.invites.map(inv => {
                                                const isBest = cheapest?.id === inv.id;
                                                const isWinner = rfq.awardedInviteId === inv.id;
                                                return (
                                                    <div key={inv.id} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 ${isWinner ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''}`}>
                                                        <div className="min-w-0 sm:w-1/3">
                                                            <p className="text-sm font-semibold truncate flex items-center gap-1.5">{inv.vendorName}{isWinner && <Trophy size={13} className="text-amber-500" />}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <StatusBadge s={inv.status} />
                                                                {inv.emailStatus === 'Failed' && <span className="text-[10px] font-bold text-rose-600" title={inv.emailError || ''}>Email failed</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-sm">
                                                            {inv.status === 'Available' ? (
                                                                <p className={`font-bold ${isBest ? 'text-emerald-600' : ''}`}>{money(inv.quotedPrice)} <span className="text-xs font-normal text-slate-500">{inv.priceBasis}</span>{isBest && <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Lowest</span>}</p>
                                                            ) : <p className="text-slate-400">—</p>}
                                                            {inv.vendorRemark && <p className="text-xs text-slate-500 break-words">“{inv.vendorRemark}”</p>}
                                                            {inv.respondedAt && <p className="text-[11px] text-slate-400">Replied {new Date(inv.respondedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {rfq.status === 'Open' && inv.status === 'Available' && (
                                                                <button disabled={busyId === inv.id} onClick={() => act(inv.id, async () => { await api.awardAvailabilityRfq(rfq.id, inv.id); onAwarded?.(); }, 'Awarded — supplier booking created')}
                                                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50">Award</button>
                                                            )}
                                                            {rfq.status === 'Open' && (inv.status === 'Sent' || inv.status === 'Viewed') && (
                                                                <button disabled={busyId === inv.id} title="Resend email" onClick={() => {
                                                                    const email = inv.vendorEmail || window.prompt('Vendor email address?') || '';
                                                                    if (!email) return;
                                                                    act(inv.id, () => api.resendAvailabilityInvite(rfq.id, inv.id, email), 'Reminder sent');
                                                                }} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><Mail size={14} /></button>
                                                            )}
                                                            {rfq.status === 'Open' && (
                                                                <>
                                                                    <button title="Copy link" onClick={() => copyLink(inv.link)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><Copy size={14} /></button>
                                                                    {inv.vendorPhone && <button title="Send via WhatsApp" onClick={() => whatsapp(inv, rfq)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-600"><MessageCircle size={14} /></button>}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sticky footer */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    {tab === 'new' ? (
                        <>
                            <p className="text-xs text-slate-500 hidden sm:block">Vendors get an email with a private link to reply Available / Not Available with price.</p>
                            <button onClick={handleSend} disabled={!selectedCount || sending}
                                className="ml-auto inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 disabled:opacity-40 hover:brightness-110 transition">
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Send to {selectedCount || ''} vendor{selectedCount === 1 ? '' : 's'}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => loadRfqs()} className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                            <RefreshCw size={14} /> Refresh
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
