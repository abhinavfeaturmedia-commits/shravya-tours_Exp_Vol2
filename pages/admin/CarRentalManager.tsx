import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';
import {
    Car, User, Settings, DollarSign, Layers, Activity,
    FileText, Check, X, Search, Star, Plus, Edit, Trash2, Calendar
} from 'lucide-react';

export const CarRentalManager: React.FC = () => {
    const { vendors, customers } = useData();

    // Tabs
    const [activeTab, setActiveTab] = useState<'trips' | 'bookings' | 'vehicles' | 'drivers' | 'categories' | 'payments'>('trips');

    // Data lists
    const [categories, setCategories] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [carBookings, setCarBookings] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(false);

    // Filter states
    const [tripFilter, setTripFilter] = useState<'All' | 'Today' | 'Running' | 'Upcoming' | 'Completed' | 'Cancelled'>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal control
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [categoryForm, setCategoryForm] = useState<any>({
        name: '', rate_per_km: 0, min_km: 0, driver_allowance: 0, night_charge: 0,
        extra_km_rate: 0, extra_hour_rate: 0, waiting_charges: 0, airport_fee: 0,
        permit_charges: 0, gst_percent: 5, passenger_capacity: 4, luggage_capacity: 2
    });

    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [vehicleForm, setVehicleForm] = useState<any>({
        name: '', registration_number: '', category_id: '', ownership: 'Owned',
        vendor_id: '', model_year: new Date().getFullYear(), fuel_type: 'Diesel',
        transmission: 'Manual', fastag_number: '', current_odometer: 0, status: 'Available', notes: ''
    });

    const [showDriverModal, setShowDriverModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<any>(null);
    const [driverForm, setDriverForm] = useState<any>({
        name: '', mobile: '', license_number: '', license_expiry: '', badge_number: '',
        police_verification: 'Verified', languages: 'English, Hindi', assigned_vehicle_id: '', status: 'Available'
    });

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [editingBooking, setEditingBooking] = useState<any>(null);
    const [bookingForm, setBookingForm] = useState<any>({
        customer_id: '', customer_name: '', customer_email: '', customer_mobile: '',
        pickup_location: '', drop_location: '', pickup_date: '', pickup_time: '',
        trip_type: 'Oneway', vehicle_category_id: '', status: 'Confirmed',
        assigned_vehicle_id: '', assigned_driver_id: '', assigned_vendor_id: '',
        estimated_km: 250, days: 1, toll_charges: 0, parking_charges: 0, permit_charges: 0, notes: ''
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState<any>({
        booking_id: '', amount: 0, payment_method: 'UPI', transaction_reference: '', type: 'Payment'
    });

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState<any>({
        booking_id: '', driver_rating: 5, vehicle_rating: 5, cleanliness_rating: 5, overall_rating: 5, comments: ''
    });

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, vehRes, driRes, bookRes, payRes, revRes] = await Promise.all([
                api.getVehicleCategories(),
                api.getVehicles(),
                api.getDrivers(),
                api.getCarBookings(),
                api.getCarPayments(),
                api.getCarReviews()
            ]);
            setCategories(catRes.data || []);
            setVehicles(vehRes.data || []);
            setDrivers(driRes.data || []);
            setCarBookings(bookRes.data || []);
            setPayments(payRes.data || []);
            setReviews(revRes.data || []);
        } catch (e: any) {
            toast.error('Failed to load car rental data: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Rate details display formatting helper
    const fmt = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

    // Dynamic Quotation Calculation
    const quotation = useMemo(() => {
        const cat = categories.find(c => c.id === bookingForm.vehicle_category_id);
        if (!cat) return { base_fare: 0, driver_allowance: 0, night_charges: 0, toll: 0, parking: 0, permit: 0, gst: 0, total: 0 };
        
        const km = Number(bookingForm.estimated_km || 0);
        const days = Number(bookingForm.days || 1);
        const minKm = Number(cat.min_km || 0) * days;
        const rate = Number(cat.rate_per_km || 0);

        const base_fare = Math.max(km, minKm) * rate;
        const driver_allowance = Number(cat.driver_allowance || 0) * days;
        
        // Simple logic for night charge
        const time = bookingForm.pickup_time || '12:00';
        const hr = parseInt(time.split(':')[0], 10);
        const night_charges = (hr >= 22 || hr <= 5) ? Number(cat.night_charge || 0) * days : 0;

        const toll = Number(bookingForm.toll_charges || 0);
        const parking = Number(bookingForm.parking_charges || 0);
        const permit = Number(bookingForm.permit_charges || 0);
        
        const taxable = base_fare + driver_allowance + night_charges + permit;
        const gst = taxable * (Number(cat.gst_percent || 5) / 100);
        const total = taxable + toll + parking + gst;

        return {
            base_fare,
            driver_allowance,
            night_charges,
            toll,
            parking,
            permit,
            gst,
            total
        };
    }, [bookingForm, categories]);

    // Handle Forms
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await api.updateVehicleCategory(editingCategory.id, categoryForm);
                toast.success('Category updated successfully');
            } else {
                await api.createVehicleCategory({ ...categoryForm, id: `CAT-${Date.now()}` });
                toast.success('Category created successfully');
            }
            setShowCategoryModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Delete this category?')) return;
        try {
            await api.deleteVehicleCategory(id);
            toast.success('Category deleted');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingVehicle) {
                await api.updateVehicle(editingVehicle.id, vehicleForm);
                toast.success('Vehicle updated');
            } else {
                await api.createVehicle({ ...vehicleForm, id: `VEH-${Date.now()}` });
                toast.success('Vehicle registered');
            }
            setShowVehicleModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!confirm('Permanently remove this vehicle?')) return;
        try {
            await api.deleteVehicle(id);
            toast.success('Vehicle removed');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDriver) {
                await api.updateDriver(editingDriver.id, driverForm);
                toast.success('Driver profile updated');
            } else {
                await api.createDriver({ ...driverForm, id: `DRI-${Date.now()}` });
                toast.success('Driver registered');
            }
            setShowDriverModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteDriver = async (id: string) => {
        if (!confirm('Permanently delete driver record?')) return;
        try {
            await api.deleteDriver(id);
            toast.success('Driver deleted');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        const customer = customers.find(c => c.id === bookingForm.customer_id);
        const name = customer ? customer.name : bookingForm.customer_name;
        const email = customer ? customer.email : bookingForm.customer_email;
        const mobile = customer ? customer.phone : bookingForm.customer_mobile;

        const payload = {
            ...bookingForm,
            customer_name: name,
            customer_email: email,
            customer_mobile: mobile,
            base_fare: quotation.base_fare,
            driver_allowance: quotation.driver_allowance,
            night_charges: quotation.night_charges,
            gst_amount: quotation.gst,
            total_amount: quotation.total
        };

        try {
            if (editingBooking) {
                await api.updateCarBooking(editingBooking.id, payload);
                toast.success('Booking details updated');
            } else {
                await api.createCarBooking({ ...payload, id: `CAR-${Date.now()}` });
                toast.success('Car rental booking created!');
            }
            setShowBookingModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteBooking = async (id: string) => {
        if (!confirm('Permanently delete this booking?')) return;
        try {
            await api.deleteCarBooking(id);
            toast.success('Booking deleted');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCarPayment({
                ...paymentForm,
                id: `CPAY-${Date.now()}`,
                payment_date: new Date().toISOString().split('T')[0],
                status: 'Verified'
            });
            toast.success('Payment recorded');
            setShowPaymentModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveReview = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCarReview({
                ...reviewForm,
                id: `CREV-${Date.now()}`
            });
            toast.success('Review submitted');
            setShowReviewModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleOpenBookingModal = (booking?: any) => {
        if (booking) {
            setEditingBooking(booking);
            setBookingForm(booking);
        } else {
            setEditingBooking(null);
            setBookingForm({
                customer_id: customers[0]?.id || '',
                customer_name: '',
                customer_email: '',
                customer_mobile: '',
                pickup_location: '',
                drop_location: '',
                pickup_date: new Date().toISOString().split('T')[0],
                pickup_time: '08:00',
                trip_type: 'Oneway',
                vehicle_category_id: categories[0]?.id || '',
                status: 'Confirmed',
                assigned_vehicle_id: '',
                assigned_driver_id: '',
                assigned_vendor_id: '',
                estimated_km: 250,
                days: 1,
                toll_charges: 0,
                parking_charges: 0,
                permit_charges: 0,
                notes: ''
            });
        }
        setShowBookingModal(true);
    };

    // Computations for dashboard KPIs
    const kpis = useMemo(() => {
        const activeTrips = carBookings.filter(b => b.status === 'Running').length;
        const todayTrips = carBookings.filter(b => b.status === 'Confirmed' && b.pickup_date === new Date().toISOString().split('T')[0]).length;
        const totalBookedVal = carBookings.filter(b => b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'Running').reduce((s, b) => s + Number(b.total_amount || 0), 0);
        const paymentsRec = payments.filter(p => p.status === 'Verified').reduce((s, p) => s + Number(p.amount || 0), 0);
        
        return {
            activeTrips,
            todayTrips,
            totalBookedVal,
            paymentsRec,
            outstanding: totalBookedVal - paymentsRec
        };
    }, [carBookings, payments]);

    // Filtering active list of trips/bookings
    const filteredTrips = useMemo(() => {
        return carBookings.filter(b => {
            const matchesQuery = b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.drop_location.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesQuery) return false;

            if (tripFilter === 'All') return true;
            if (tripFilter === 'Today') return b.pickup_date === new Date().toISOString().split('T')[0];
            return b.status === tripFilter;
        });
    }, [carBookings, tripFilter, searchQuery]);

    return (
        <div className="flex flex-col h-full bg-[#FBF7F0] dark:bg-[#0F172A] text-slate-800 dark:text-slate-100">
            {/* Top Header */}
            <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Car className="text-primary" size={28} style={{ color: '#C9732A' }} />
                        <span className="font-display text-2xl font-black tracking-tight">Car Rental Hub</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">Manage corporate transportation, quotations, drivers, vehicles, and allocations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleOpenBookingModal()}
                        className="flex items-center gap-2 bg-[#C9732A] hover:bg-[#B5621F] text-white font-black rounded-xl text-xs px-4 py-2.5 shadow-md transition-all active:scale-95"
                    >
                        <Plus size={16} /> New Trip / Quotation
                    </button>
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        title="Reload Data"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.306 15h-2.306" /></svg>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-[#1E293B] px-6 border-b border-slate-200 dark:border-slate-800 sticky top-[77px] z-15 shadow-sm">
                <div className="flex gap-1 overflow-x-auto">
                    {[
                        { id: 'trips', label: 'Operations Dashboard', icon: Activity },
                        { id: 'bookings', label: 'Trips & Quotations', icon: FileText },
                        { id: 'vehicles', label: 'Fleet (Vehicles)', icon: Car },
                        { id: 'drivers', label: 'Drivers', icon: User },
                        { id: 'categories', label: 'Rates & Categories', icon: Layers },
                        { id: 'payments', label: 'Billing & Payouts', icon: DollarSign },
                    ].map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'border-[#C9732A] text-[#C9732A] bg-amber-50/20 dark:bg-[#2A2B36]'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                <Icon size={15} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Panel */}
            <div className="flex-grow p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3" style={{ borderTopColor: '#C9732A' }} />
                        <p className="text-slate-400 text-xs font-semibold">Syncing with fleet databases...</p>
                    </div>
                ) : (
                    <>
                        {/* ─── TAB 1: OPERATIONS / TRIPS DASHBOARD ─── */}
                        {activeTab === 'trips' && (
                            <div className="space-y-6">
                                {/* Dashboard Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Active Trips', val: kpis.activeTrips, desc: 'Currently running', icon: Activity, cls: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-100 dark:border-emerald-900/30' },
                                        { label: 'Today\'s Pickups', val: kpis.todayTrips, desc: 'Confirmed trips today', icon: Calendar, cls: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border-indigo-100 dark:border-indigo-900/30' },
                                        { label: 'Total Sales', val: fmt(kpis.totalBookedVal), desc: 'Booked value', icon: DollarSign, cls: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100 dark:border-amber-900/30' },
                                        { label: 'Outstanding Due', val: fmt(kpis.outstanding), desc: 'Pending collection', icon: DollarSign, cls: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 border-rose-100 dark:border-rose-900/30' }
                                    ].map((c, i) => {
                                        const Icon = c.icon;
                                        return (
                                            <div key={i} className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 ${c.cls}`}>
                                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/40 shadow-sm shrink-0">
                                                    <Icon size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
                                                    <h3 className="text-xl font-bold font-display leading-none mt-1">{c.val}</h3>
                                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{c.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Active Trips Filter Toolbar */}
                                <div className="bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { id: 'All', label: 'All Trips' },
                                            { id: 'Today', label: 'Today\'s Pickups' },
                                            { id: 'Running', label: 'Running Trips' },
                                            { id: 'Confirmed', label: 'Upcoming confirmed' },
                                            { id: 'Completed', label: 'Completed' },
                                            { id: 'Cancelled', label: 'Cancelled' },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setTripFilter(f.id as any)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    tripFilter === f.id
                                                        ? 'bg-[#C9732A] text-white shadow-sm'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative min-w-[240px]">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search passenger, route..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>

                                {/* Trips List Table */}
                                <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                    <th className="p-4">Trip details</th>
                                                    <th className="p-4">Customer</th>
                                                    <th className="p-4">Category</th>
                                                    <th className="p-4">Allocation</th>
                                                    <th className="p-4">Billing</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                                {filteredTrips.map(trip => {
                                                    const cat = categories.find(c => c.id === trip.vehicle_category_id);
                                                    const vehicle = vehicles.find(v => v.id === trip.assigned_vehicle_id);
                                                    const driver = drivers.find(d => d.id === trip.assigned_driver_id);
                                                    const paidVal = payments.filter(p => p.booking_id === trip.id && p.status === 'Verified').reduce((s, p) => s + Number(p.amount || 0), 0);
                                                    const due = Number(trip.total_amount || 0) - paidVal;

                                                    return (
                                                        <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                    <span>{trip.pickup_location}</span>
                                                                    <span className="text-slate-400">→</span>
                                                                    <span>{trip.drop_location}</span>
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                                                    {new Date(trip.pickup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} @ {trip.pickup_time.slice(0, 5)} • {trip.trip_type}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-800 dark:text-slate-200">{trip.customer_name}</div>
                                                                <div className="text-slate-400 text-[10px] mt-0.5 font-medium">{trip.customer_mobile}</div>
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                                                                {cat?.name || 'N/A'}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Cab</span>
                                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{vehicle ? `${vehicle.name} (${vehicle.registration_number})` : 'Unallocated'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Drv</span>
                                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{driver ? `${driver.name} (${driver.mobile})` : 'Unallocated'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-800 dark:text-slate-200">Total: {fmt(trip.total_amount)}</div>
                                                                <div className="text-[10px] font-bold mt-0.5 flex gap-2">
                                                                    <span className="text-emerald-600">Paid: {fmt(paidVal)}</span>
                                                                    <span className={due > 0 ? 'text-rose-500' : 'text-slate-400'}>Due: {fmt(due)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex justify-end gap-1.5">
                                                                    <button
                                                                        onClick={() => {
                                                                            setPaymentForm({ booking_id: trip.id, amount: due, payment_method: 'Cash', transaction_reference: '', type: 'Payment' });
                                                                            setShowPaymentModal(true);
                                                                        }}
                                                                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 font-bold text-[10px]"
                                                                        title="Record Payment"
                                                                    >
                                                                        ₹ Collect
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenBookingModal(trip)}
                                                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                                                                    >
                                                                        <Edit size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteBooking(trip.id)}
                                                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredTrips.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold">
                                                            No matching car bookings found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 2: TRIPS & QUOTATIONS ─── */}
                        {activeTab === 'bookings' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">Active Quotations & Bookings</h3>
                                        <button
                                            onClick={() => handleOpenBookingModal()}
                                            className="px-4 py-2 bg-[#C9732A] hover:bg-[#B5621F] text-white font-black text-xs rounded-xl"
                                        >
                                            Generate Quotation
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {carBookings.map(b => (
                                            <div key={b.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between h-48">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                            b.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                            b.status === 'Running' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {b.status}
                                                        </span>
                                                        <h4 className="font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
                                                            {b.pickup_location} <span className="text-slate-400">→</span> {b.drop_location}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                                                            {b.pickup_date} @ {b.pickup_time.slice(0, 5)} • {b.trip_type}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-slate-900 dark:text-white">{fmt(b.total_amount)}</div>
                                                        <span className="text-[9px] text-slate-400 font-bold block">{b.estimated_km} km estimate</span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                    <div className="text-[10px] text-slate-400">
                                                        Passenger: <span className="font-bold text-slate-700 dark:text-slate-300">{b.customer_name}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setReviewForm({ booking_id: b.id, driver_rating: 5, vehicle_rating: 5, cleanliness_rating: 5, overall_rating: 5, comments: '' });
                                                                setShowReviewModal(true);
                                                            }}
                                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold"
                                                        >
                                                            Add Review
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenBookingModal(b)}
                                                            className="p-1 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700"
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBooking(b.id)}
                                                            className="p-1 bg-slate-50 dark:bg-slate-800 text-red-500 rounded border border-slate-200 dark:border-slate-700"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 3: FLEET (VEHICLES) ─── */}
                        {activeTab === 'vehicles' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">Fleet List</h3>
                                        <button
                                            onClick={() => { setEditingVehicle(null); setVehicleForm({ name: '', registration_number: '', category_id: categories[0]?.id || '', ownership: 'Owned', vendor_id: '', model_year: new Date().getFullYear(), fuel_type: 'Diesel', transmission: 'Manual', fastag_number: '', current_odometer: 0, status: 'Available', notes: '' }); setShowVehicleModal(true); }}
                                            className="px-4 py-2 bg-[#C9732A] hover:bg-[#B5621F] text-white font-black text-xs rounded-xl"
                                        >
                                            Add Vehicle
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {vehicles.map(v => {
                                            const cat = categories.find(c => c.id === v.category_id);
                                            const vend = vendors.find(vd => vd.id === v.vendor_id);
                                            return (
                                                <div key={v.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700 uppercase tracking-wider">{cat?.name || 'N/A'}</span>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base mt-2">{v.name}</h4>
                                                            <p className="text-slate-400 text-[10px] font-bold font-mono tracking-wider mt-0.5">{v.registration_number}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                            v.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                                                            v.status === 'Booked' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                            {v.status}
                                                        </span>
                                                    </div>

                                                    <div className="text-[11px] text-slate-500 space-y-1">
                                                        <div className="flex justify-between"><span>Ownership:</span><span className="font-bold text-slate-700 dark:text-slate-300">{v.ownership} {vend ? `(${vend.name})` : ''}</span></div>
                                                        <div className="flex justify-between"><span>Fuel & Gear:</span><span className="font-bold text-slate-700 dark:text-slate-300">{v.fuel_type} • {v.transmission}</span></div>
                                                        <div className="flex justify-between"><span>Odometer:</span><span className="font-bold text-slate-700 dark:text-slate-300">{Number(v.current_odometer).toLocaleString()} KM</span></div>
                                                    </div>

                                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setEditingVehicle(v); setVehicleForm(v); setShowVehicleModal(true); }}
                                                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVehicle(v.id)}
                                                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 4: DRIVERS ─── */}
                        {activeTab === 'drivers' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">Driver Registry</h3>
                                        <button
                                            onClick={() => { setEditingDriver(null); setDriverForm({ name: '', mobile: '', license_number: '', license_expiry: '', badge_number: '', police_verification: 'Verified', languages: 'English, Hindi', assigned_vehicle_id: '', status: 'Available' }); setShowDriverModal(true); }}
                                            className="px-4 py-2 bg-[#C9732A] hover:bg-[#B5621F] text-white font-black text-xs rounded-xl"
                                        >
                                            Add Driver
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {drivers.map(d => {
                                            const v = vehicles.find(vh => vh.id === d.assigned_vehicle_id);
                                            return (
                                                <div key={d.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">{d.name}</h4>
                                                            <p className="text-slate-400 text-[10px] font-bold mt-0.5">{d.mobile}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                            d.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {d.status}
                                                        </span>
                                                    </div>

                                                    <div className="text-[11px] text-slate-500 space-y-1">
                                                        <div className="flex justify-between"><span>Assigned vehicle:</span><span className="font-bold text-slate-700 dark:text-slate-300">{v ? `${v.name} (${v.registration_number})` : 'None'}</span></div>
                                                        <div className="flex justify-between"><span>License no:</span><span className="font-bold text-slate-700 dark:text-slate-300">{d.license_number}</span></div>
                                                        <div className="flex justify-between"><span>Police verification:</span><span className="font-bold text-slate-700 dark:text-slate-300">{d.police_verification}</span></div>
                                                        <div className="flex justify-between"><span>Languages:</span><span className="font-bold text-slate-700 dark:text-slate-300">{d.languages}</span></div>
                                                    </div>

                                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setEditingDriver(d); setDriverForm(d); setShowDriverModal(true); }}
                                                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDriver(d.id)}
                                                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 5: VEHICLE CATEGORIES / RATES ─── */}
                        {activeTab === 'categories' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">Configurable Transport Rates</h3>
                                        <button
                                            onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', rate_per_km: 0, min_km: 0, driver_allowance: 0, night_charge: 0, extra_km_rate: 0, extra_hour_rate: 0, waiting_charges: 0, airport_fee: 0, permit_charges: 0, gst_percent: 5, passenger_capacity: 4, luggage_capacity: 2 }); setShowCategoryModal(true); }}
                                            className="px-4 py-2 bg-[#C9732A] hover:bg-[#B5621F] text-white font-black text-xs rounded-xl"
                                        >
                                            Add Category
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {categories.map(c => (
                                            <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-base">{c.name}</h4>
                                                        <p className="text-slate-400 text-[10px] font-bold mt-0.5">Capacity: {c.passenger_capacity} Pax • {c.luggage_capacity} Luggage</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-base font-black text-slate-950 dark:text-white">{fmt(c.rate_per_km)}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold block">/KM</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                                    <div>Min Travel KM: <span className="font-bold text-slate-800 dark:text-slate-200">{c.min_km} KM</span></div>
                                                    <div>Driver Allowance: <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(c.driver_allowance)}/day</span></div>
                                                    <div>Night Charges: <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(c.night_charge)}</span></div>
                                                    <div>Extra KM rate: <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(c.extra_km_rate)}</span></div>
                                                    <div>Extra Hour rate: <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(c.extra_hour_rate)}</span></div>
                                                    <div>Waiting Charges: <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(c.waiting_charges)}</span></div>
                                                </div>

                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditingCategory(c); setCategoryForm(c); setShowCategoryModal(true); }}
                                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(c.id)}
                                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 6: BILLING & TRANSACTIONS ─── */}
                        {activeTab === 'payments' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">Transaction Logs</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Trip Link</th>
                                                    <th className="p-4">Amount</th>
                                                    <th className="p-4">Method</th>
                                                    <th className="p-4">Reference</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                                {payments.map(p => {
                                                    const trip = carBookings.find(b => b.id === p.booking_id);
                                                    return (
                                                        <tr key={p.id}>
                                                            <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">{p.payment_date}</td>
                                                            <td className="p-4">
                                                                {trip ? (
                                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                        {trip.customer_name} ({trip.pickup_location} → {trip.drop_location})
                                                                    </span>
                                                                ) : 'Unknown Booking'}
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-900 dark:text-white">{fmt(p.amount)}</td>
                                                            <td className="p-4 text-slate-500">{p.payment_method}</td>
                                                            <td className="p-4 font-mono text-[10px] text-slate-400">{p.transaction_reference || 'N/A'}</td>
                                                            <td className="p-4">
                                                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wider">{p.status}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ─── MODALS ─── */}

            {/* 1. Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm">{editingCategory ? 'Edit Category' : 'Create Vehicle Category'}</h3>
                            <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Category Name *</label>
                                <input type="text" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs animate-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Rate per KM (₹) *</label>
                                    <input type="number" required step="0.01" value={categoryForm.rate_per_km} onChange={e => setCategoryForm({...categoryForm, rate_per_km: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Minimum KM per day *</label>
                                    <input type="number" required value={categoryForm.min_km} onChange={e => setCategoryForm({...categoryForm, min_km: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Driver Allowance /day *</label>
                                    <input type="number" required value={categoryForm.driver_allowance} onChange={e => setCategoryForm({...categoryForm, driver_allowance: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Night Charge *</label>
                                    <input type="number" required value={categoryForm.night_charge} onChange={e => setCategoryForm({...categoryForm, night_charge: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Pass Cap</label>
                                    <input type="number" value={categoryForm.passenger_capacity} onChange={e => setCategoryForm({...categoryForm, passenger_capacity: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Lug Cap</label>
                                    <input type="number" value={categoryForm.luggage_capacity} onChange={e => setCategoryForm({...categoryForm, luggage_capacity: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">GST %</label>
                                    <input type="number" value={categoryForm.gst_percent} onChange={e => setCategoryForm({...categoryForm, gst_percent: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-[#C9732A] text-white font-black rounded-xl text-xs shadow-md mt-4">
                                Save Category Details
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Vehicle Modal */}
            {showVehicleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm">{editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}</h3>
                            <button onClick={() => setShowVehicleModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveVehicle} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Name *</label>
                                    <input type="text" required value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" placeholder="Toyota Innova" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Plate Number *</label>
                                    <input type="text" required value={vehicleForm.registration_number} onChange={e => setVehicleForm({...vehicleForm, registration_number: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" placeholder="MH-12-XX-1234" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Category *</label>
                                    <select required value={vehicleForm.category_id} onChange={e => setVehicleForm({...vehicleForm, category_id: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Ownership *</label>
                                    <select required value={vehicleForm.ownership} onChange={e => setVehicleForm({...vehicleForm, ownership: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="Owned">Owned (In-house)</option>
                                        <option value="Vendor">Vendor allocated</option>
                                    </select>
                                </div>
                            </div>
                            {vehicleForm.ownership === 'Vendor' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Associated Vendor</label>
                                    <select value={vehicleForm.vendor_id} onChange={e => setVehicleForm({...vehicleForm, vendor_id: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fuel Type</label>
                                    <select value={vehicleForm.fuel_type} onChange={e => setVehicleForm({...vehicleForm, fuel_type: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="Diesel">Diesel</option>
                                        <option value="Petrol">Petrol</option>
                                        <option value="CNG">CNG</option>
                                        <option value="EV">EV</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Odometer (KM)</label>
                                    <input type="number" value={vehicleForm.current_odometer} onChange={e => setVehicleForm({...vehicleForm, current_odometer: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                    <select value={vehicleForm.status} onChange={e => setVehicleForm({...vehicleForm, status: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="Available">Available</option>
                                        <option value="Booked">Booked</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-[#C9732A] text-white font-black rounded-xl text-xs shadow-md mt-4">
                                Save Fleet Member
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Driver Modal */}
            {showDriverModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm">{editingDriver ? 'Edit Driver Profile' : 'Register Driver'}</h3>
                            <button onClick={() => setShowDriverModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveDriver} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Driver Name *</label>
                                    <input type="text" required value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Mobile No *</label>
                                    <input type="text" required value={driverForm.mobile} onChange={e => setDriverForm({...driverForm, mobile: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">License Number *</label>
                                    <input type="text" required value={driverForm.license_number} onChange={e => setDriverForm({...driverForm, license_number: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">License Expiry *</label>
                                    <input type="date" required value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm, license_expiry: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Assign Vehicle</label>
                                    <select value={driverForm.assigned_vehicle_id} onChange={e => setDriverForm({...driverForm, assigned_vehicle_id: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">None</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Police Verification</label>
                                    <select value={driverForm.police_verification} onChange={e => setDriverForm({...driverForm, police_verification: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="Verified">Verified</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Failed">Failed</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-[#C9732A] text-white font-black rounded-xl text-xs shadow-md mt-4">
                                Save Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. Booking Modal (Quotation Engine) */}
            {showBookingModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm">{editingBooking ? 'Modify Booking' : 'Quotation Engine & Booking Creator'}</h3>
                            <button onClick={() => setShowBookingModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveBooking} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                            {/* Customer Select */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Link CRM Customer *</label>
                                    <select value={bookingForm.customer_id} onChange={e => {
                                        const c = customers.find(x => x.id === e.target.value);
                                        setBookingForm({
                                            ...bookingForm,
                                            customer_id: e.target.value,
                                            customer_name: c ? c.name : '',
                                            customer_email: c ? c.email : '',
                                            customer_mobile: c ? c.phone : ''
                                        });
                                    }} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">-- Guest Checkout / Manual --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Trip Type</label>
                                    <select value={bookingForm.trip_type} onChange={e => setBookingForm({...bookingForm, trip_type: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="Oneway">Oneway Trip</option>
                                        <option value="Round Trip">Round Trip</option>
                                        <option value="Local Package">Local Package (8hr/80km)</option>
                                        <option value="Airport Transfer">Airport Transfer</option>
                                    </select>
                                </div>
                            </div>

                            {!bookingForm.customer_id && (
                                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Guest Name</label>
                                        <input type="text" value={bookingForm.customer_name} onChange={e => setBookingForm({...bookingForm, customer_name: e.target.value})} className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 font-bold text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Guest Email</label>
                                        <input type="email" value={bookingForm.customer_email} onChange={e => setBookingForm({...bookingForm, customer_email: e.target.value})} className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 font-bold text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Guest Phone</label>
                                        <input type="text" value={bookingForm.customer_mobile} onChange={e => setBookingForm({...bookingForm, customer_mobile: e.target.value})} className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 font-bold text-xs" />
                                    </div>
                                </div>
                            )}

                            {/* Trip Routes */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Pickup Location *</label>
                                    <input type="text" required value={bookingForm.pickup_location} onChange={e => setBookingForm({...bookingForm, pickup_location: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" placeholder="e.g. Pune Airport" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Drop Location *</label>
                                    <input type="text" required value={bookingForm.drop_location} onChange={e => setBookingForm({...bookingForm, drop_location: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" placeholder="e.g. Mahabaleshwar" />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Pickup Date *</label>
                                    <input type="date" required value={bookingForm.pickup_date} onChange={e => setBookingForm({...bookingForm, pickup_date: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Time *</label>
                                    <input type="time" required value={bookingForm.pickup_time} onChange={e => setBookingForm({...bookingForm, pickup_time: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Est. KM *</label>
                                    <input type="number" required value={bookingForm.estimated_km} onChange={e => setBookingForm({...bookingForm, estimated_km: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Days *</label>
                                    <input type="number" required value={bookingForm.days} onChange={e => setBookingForm({...bookingForm, days: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" min={1} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Class *</label>
                                    <select required value={bookingForm.vehicle_category_id} onChange={e => setBookingForm({...bookingForm, vehicle_category_id: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">-- Choose Category --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({fmt(c.rate_per_km)}/km)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Assign Cab</label>
                                    <select value={bookingForm.assigned_vehicle_id} onChange={e => setBookingForm({...bookingForm, assigned_vehicle_id: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">No vehicle allocated</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Assign Driver</label>
                                    <select value={bookingForm.assigned_driver_id} onChange={e => setBookingForm({...bookingForm, assigned_driver_id: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="">No driver allocated</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Toll Charges (₹)</label>
                                    <input type="number" value={bookingForm.toll_charges} onChange={e => setBookingForm({...bookingForm, toll_charges: Number(e.target.value)})} className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Parking (₹)</label>
                                    <input type="number" value={bookingForm.parking_charges} onChange={e => setBookingForm({...bookingForm, parking_charges: Number(e.target.value)})} className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">State Permits (₹)</label>
                                    <input type="number" value={bookingForm.permit_charges} onChange={e => setBookingForm({...bookingForm, permit_charges: Number(e.target.value)})} className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 font-bold text-xs" />
                                </div>
                            </div>

                            {/* Quotation engine summary display */}
                            {bookingForm.vehicle_category_id && (
                                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2 text-xs">
                                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs mb-3 uppercase tracking-wider">Dynamic Cost Estimator</h4>
                                    <div className="flex justify-between text-slate-500 font-semibold">
                                        <span>Base KM fare:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(quotation.base_fare)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-semibold">
                                        <span>Driver allowances:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(quotation.driver_allowance)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-semibold">
                                        <span>Night pick-up charges:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(quotation.night_charges)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-semibold">
                                        <span>Toll, parking & permits:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(quotation.toll + quotation.parking + quotation.permit)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-semibold border-t border-slate-200 dark:border-slate-800 pt-2">
                                        <span>GST Tax (calculated):</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(quotation.gst)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-2 text-sm font-black">
                                        <span className="text-[#C9732A]">Total Rental Estimate:</span>
                                        <span className="text-[#C9732A]">{fmt(quotation.total)}</span>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="w-full py-3 bg-[#C9732A] hover:bg-[#B5621F] text-white font-black rounded-xl text-xs shadow-md mt-4">
                                {editingBooking ? 'Save Booking Modifications' : 'Create Confirmed Booking'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm">Collect Ride Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Collection Amount (₹) *</label>
                                <input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Method *</label>
                                    <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                                        <option value="UPI">UPI / GPay</option>
                                        <option value="Razorpay">Razorpay Checkout</option>
                                        <option value="Cash">Cash to Driver</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Receipt Reference</label>
                                    <input type="text" value={paymentForm.transaction_reference} onChange={e => setPaymentForm({...paymentForm, transaction_reference: e.target.value})} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs" placeholder="TXN-XXXXXX" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md mt-4">
                                Verify & Deposit Payment
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm">Post Customer Review</h3>
                            <button onClick={() => setShowReviewModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveReview} className="p-6 space-y-4 text-left">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Driver Professionalism</span>
                                    <select value={reviewForm.driver_rating} onChange={e => setReviewForm({...reviewForm, driver_rating: Number(e.target.value)})} className="h-8 rounded bg-slate-50 dark:bg-slate-800 font-bold border-none text-xs">
                                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Vehicle Comfort</span>
                                    <select value={reviewForm.vehicle_rating} onChange={e => setReviewForm({...reviewForm, vehicle_rating: Number(e.target.value)})} className="h-8 rounded bg-slate-50 dark:bg-slate-800 font-bold border-none text-xs">
                                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Cleanliness & Hygiene</span>
                                    <select value={reviewForm.cleanliness_rating} onChange={e => setReviewForm({...reviewForm, cleanliness_rating: Number(e.target.value)})} className="h-8 rounded bg-slate-50 dark:bg-slate-800 font-bold border-none text-xs">
                                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Overall Rating</span>
                                    <select value={reviewForm.overall_rating} onChange={e => setReviewForm({...reviewForm, overall_rating: Number(e.target.value)})} className="h-8 rounded bg-slate-50 dark:bg-slate-800 font-bold border-none text-xs">
                                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Feedback Comments</label>
                                <textarea rows={3} value={reviewForm.comments} onChange={e => setReviewForm({...reviewForm, comments: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs" placeholder="Excellent ride, clean vehicle..."></textarea>
                            </div>
                            <button type="submit" className="w-full py-3 bg-[#C9732A] text-white font-black rounded-xl text-xs shadow-md mt-4">
                                Post Passenger Feedback
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
