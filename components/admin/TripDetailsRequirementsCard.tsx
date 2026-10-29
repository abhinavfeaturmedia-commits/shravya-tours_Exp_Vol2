import React, { useState, useEffect } from 'react';
import { api } from '../../src/lib/api';
import { copyToClipboard } from '../../utils/clipboard';
import { toast } from 'sonner';
import { 
    FileText, Users, Calendar, MapPin, BedDouble, Car, 
    Utensils, Compass, Plane, Tag, CheckCircle2, Copy, 
    Check, ExternalLink, Loader2, AlertCircle, RefreshCw 
} from 'lucide-react';
import { TripFormShareButton } from './TripFormShareButton';

interface TripDetailsRequirementsCardProps {
    entityType: 'lead' | 'booking' | 'customer';
    entityId: string;
    clientName?: string;
    clientPhone?: string;
    compact?: boolean;
}

export const TripDetailsRequirementsCard: React.FC<TripDetailsRequirementsCardProps> = ({
    entityType,
    entityId,
    clientName,
    clientPhone,
    compact = false
}) => {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<any | null>(null);
    const [copiedRoster, setCopiedRoster] = useState(false);

    const loadForm = async () => {
        setLoading(true);
        try {
            const res = await api.getTripFormByEntity(entityType, entityId);
            if (res && res.form) {
                setForm(res.form);
            } else {
                setForm(null);
            }
        } catch {
            setForm(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entityId) {
            loadForm();
        }
    }, [entityType, entityId]);

    const handleCopyPassengerRoster = async () => {
        if (!form || !form.passengers || form.passengers.length === 0) {
            toast.error('No passengers registered yet.');
            return;
        }

        const lines = [
            `*PASSENGER ROSTER - SHRAWELLO TRAVEL HUB*`,
            `Destination: ${form.destination || 'N/A'}`,
            `Travel Dates: ${form.start_date || 'N/A'} to ${form.end_date || 'N/A'}`,
            `Total Pax: ${form.passengers.length}`,
            `----------------------------------------`,
            ...form.passengers.map((p: any, idx: number) => {
                const parts = [
                    `${idx + 1}. ${p.name || 'N/A'}`,
                    p.dob_or_age ? `Age/DOB: ${p.dob_or_age}` : null,
                    p.gender ? `Gender: ${p.gender}` : null,
                    p.aadhar_no ? `Aadhaar: ${p.aadhar_no}` : null,
                    p.mobile ? `Mobile: ${p.mobile}` : null,
                    p.relation ? `(${p.relation})` : null
                ].filter(Boolean);
                return parts.join(' | ');
            }),
            `----------------------------------------`
        ];

        const ok = await copyToClipboard(lines.join('\n'));
        if (ok) {
            setCopiedRoster(true);
            toast.success('Passenger roster copied to clipboard!');
            setTimeout(() => setCopiedRoster(false), 2500);
        } else {
            toast.error('Could not copy roster automatically. Please select text manually.');
        }
    };

    if (loading) {
        return (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 size={16} className="animate-spin text-amber-500" />
                <span>Checking customer trip details form...</span>
            </div>
        );
    }

    // When no form exists yet
    if (!form) {
        return (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/40 to-slate-50 dark:from-slate-800/40 dark:to-slate-900 border border-amber-200/50 dark:border-slate-800 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                            <FileText size={16} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Customer Trip Details Form
                            </h4>
                            <p className="text-[11px] text-slate-400">Automate passenger and trip specifications collection</p>
                        </div>
                    </div>

                    <TripFormShareButton
                        leadId={entityType === 'lead' ? entityId : undefined}
                        bookingId={entityType === 'booking' ? entityId : undefined}
                        customerId={entityType === 'customer' ? entityId : undefined}
                        clientName={clientName}
                        clientPhone={clientPhone}
                    />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Generate and share a unique link with the client. When submitted, all passenger details, hotel stars, meal plans, and vehicle preferences will automatically appear here.
                </p>
            </div>
        );
    }

    const isSubmitted = form.status === 'Submitted';
    const passengers: any[] = form.passengers || [];

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Header */}
            <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                isSubmitted
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
                    : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
            }`}>
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                        isSubmitted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                    }`}>
                        {isSubmitted ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                Client Trip Input Checklist
                            </h3>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isSubmitted
                                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            }`}>
                                {isSubmitted ? '✓ Form Submitted' : 'Form Link Sent'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            {isSubmitted && form.submitted_at
                                ? `Submitted on ${new Date(form.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : `Created on ${new Date(form.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                        type="button"
                        onClick={loadForm}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <a
                        href={`/trip-details/${form.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
                        title="View Public Form"
                    >
                        <ExternalLink size={12} />
                        <span>View Form</span>
                    </a>
                    <TripFormShareButton
                        leadId={entityType === 'lead' ? entityId : undefined}
                        bookingId={entityType === 'booking' ? entityId : undefined}
                        customerId={entityType === 'customer' ? entityId : undefined}
                        clientName={clientName || form.customer_name}
                        clientPhone={clientPhone || form.customer_phone}
                        status={form.status}
                    />
                </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 space-y-6">
                
                {/* Key Requirements Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Destinations</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{form.destination || 'Not Specified'}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Travel Dates</span>
                        <strong className="text-slate-900 dark:text-white block truncate">
                            {form.start_date ? new Date(form.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Flexible'}
                            {form.end_date ? ` to ${new Date(form.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                        </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rooms & Bed Type</span>
                        <strong className="text-slate-900 dark:text-white block truncate">
                            {form.rooms_count || 1} Room(s) • {form.room_type_preference || 'Standard Bed'}
                        </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vehicle Preference</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{form.vehicle_preference || 'Standard'}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hotel Category</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{form.hotel_preference || '3 Star'}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meal Plan</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{form.meal_plan_preference || 'MAP'}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Food / Dietary</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{form.food_preference || 'Vegetarian'}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sightseeing Pace</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{form.sightseeing_pace || 'Moderate'}</strong>
                    </div>
                </div>

                {/* Additional Details (Pickup, Transportation, Flights, Special Needs) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Pickup & Drop Location:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{form.pickup_drop_location || 'Not provided'}</p>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Mode & Flight/Train Details:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                            {form.flight_train_details || form.transportation_mode || 'Let Shrawello recommend'}
                        </p>
                    </div>
                    {form.special_requirements && (
                        <div className="sm:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Special Requirements:</span>
                            <p className="font-semibold text-amber-700 dark:text-amber-300 mt-0.5">{form.special_requirements}</p>
                        </div>
                    )}
                    {form.additional_notes && (
                        <div className="sm:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Notes & Remarks:</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{form.additional_notes}</p>
                        </div>
                    )}
                    {form.applied_coupon_code && (
                        <div className="sm:col-span-2 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300">
                            <span className="font-bold flex items-center gap-1.5"><Tag size={13} /> Applied Coupon: {form.applied_coupon_code}</span>
                            <span className="font-black">₹{Number(form.coupon_discount_amount || 0).toLocaleString('en-IN')} Discount</span>
                        </div>
                    )}
                </div>

                {/* Passenger Roster Section (Table from Excel) */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-amber-500" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                Passenger Roster ({passengers.length} Registered)
                            </h4>
                        </div>

                        {passengers.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopyPassengerRoster}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
                            >
                                {copiedRoster ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                <span>{copiedRoster ? 'Roster Copied!' : 'Copy Passenger Roster'}</span>
                            </button>
                        )}
                    </div>

                    {passengers.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                            No passengers registered yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2 w-10 text-center">Sr.</th>
                                        <th className="px-3 py-2">Name of Traveller</th>
                                        <th className="px-3 py-2">DOB / Age</th>
                                        <th className="px-3 py-2">Gender</th>
                                        <th className="px-3 py-2">Aadhaar Card No.</th>
                                        <th className="px-3 py-2">Mobile No.</th>
                                        <th className="px-3 py-2">Relation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {passengers.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="px-3 py-2.5 font-bold text-slate-400 text-center">{idx + 1}</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                                                {p.name || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                                {p.dob_or_age || p.dob || p.age || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                                {p.gender || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                                {p.aadhar_no || p.aadharCardNo || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                                {p.mobile || p.phone || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-500">
                                                {p.relation || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

