import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth, CUSTOMER_JWT_KEY } from '../../context/CustomerAuthContext';
import { formatPrice } from '../../utils/packageUtils';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Booking {
  id: string;
  package_name?: string;
  destination?: string;
  travel_date?: string;
  booking_date?: string;
  end_date?: string;
  total_price: number;
  original_price?: number;
  applied_coupon_code?: string;
  coupon_discount_amount?: number;
  payment_status?: string;
  status?: string;
  pax_count?: number;
  pax_adult?: number;
  pax_child?: number;
  pax_infant?: number;
  whatsapp_group_url?: string;
  whatsapp?: string;
  phone?: string;
  alt_phone?: string;
  residential_address?: string;
  created_at?: string;
  image?: string;
  overview?: string;
}

interface SupplierBooking {
  service_type: string;
  supplier_name: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  method: string;
  reference: string;
  notes?: string;
  status: string;
  receipt_url?: string;
}

export const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuth();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<SupplierBooking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Pay Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI / GPay / PhonePe');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Cancel / Reschedule State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Review State
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      if (!token) throw new Error('Auth token missing');
      
      const res = await fetch(`${API_BASE}/api/customer/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch booking details');
      
      const data = await res.json();
      setBooking(data.booking);
      setSuppliers(data.suppliers || []);
      
      const txRes = await fetch(`${API_BASE}/api/customer/bookings/${id}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading booking details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyMembership = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/customer/membership`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyMembership(data);
      }
    } catch { setMyMembership(null); }
  };

  useEffect(() => {
    fetchAllData();
    fetchMyMembership();
  }, [id]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${id}/apply-coupon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ couponCode: couponCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply coupon');
      setCouponMsg({ type: 'success', text: data.message });
      setCouponCode('');
      fetchAllData();
    } catch (err: any) {
      setCouponMsg({ type: 'error', text: err.message });
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || !payRef) {
      setPayError('Please enter the payment amount and UTR reference number.');
      return;
    }
    setPayLoading(true);
    setPayError(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const formData = new FormData();
      formData.append('amount', payAmount);
      formData.append('method', payMethod);
      formData.append('reference', payRef);
      formData.append('notes', payNotes);
      if (payFile) formData.append('receipt', payFile);

      const res = await fetch(`${API_BASE}/api/customer/bookings/${id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment receipt');
      
      setShowPayModal(false);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      setPayFile(null);
      
      fetchAllData();
      alert('Payment receipt logged successfully! Our staff will verify it shortly.');
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      if (!res.ok) throw new Error('Failed to request cancellation');
      setShowCancelModal(false);
      alert('Cancellation request submitted successfully.');
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleReason.trim()) return;
    setRescheduleLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${id}/reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestedDate: rescheduleDate, reason: rescheduleReason })
      });
      if (!res.ok) throw new Error('Failed to request rescheduling');
      setShowRescheduleModal(false);
      alert('Reschedule request submitted successfully.');
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookingId: id, rating, reviewText })
      });
      if (!res.ok) throw new Error('Failed to submit review');
      setReviewSubmitted(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/customer/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7F0]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: '#C9732A' }} />
          <p className="text-xs font-semibold text-slate-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#FBF7F0]">
        <div className="bg-white p-8 rounded-3xl border border-[#EDE8DF] text-center max-w-md shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Booking</h2>
          <p className="text-sm text-slate-500 mb-6">{error || 'Booking details could not be found.'}</p>
          <Link to="/my-account" className="inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #C9732A, #E8935B)' }}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const netPaid = transactions
    .filter(t => t.status?.toLowerCase() === 'verified')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const balanceDue = Math.max(0, Number(booking.total_price) - netPaid);
  const initials = customer?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TR';

  // Status mapping
  const timelineSteps = [
    { key: 'enquiry', label: 'Enquiry', date: booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Awaiting' },
    { key: 'confirmed', label: 'Confirmed', date: booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Confirmed' },
    { key: 'documents', label: 'Documents Ready', date: suppliers.length > 0 ? 'Awaiting Download' : 'Awaiting Details' },
    { key: 'travel', label: 'Travel', date: booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'Upcoming' }
  ];

  const getActiveStepIndex = () => {
    const status = booking.status?.toLowerCase() || 'pending';
    if (status === 'cancelled') return -1;
    if (status === 'completed') return 3;
    const tDate = booking.travel_date ? new Date(booking.travel_date) : null;
    const today = new Date();
    if (tDate && tDate <= today && status === 'confirmed') return 3;
    if (suppliers.length > 0) return 2;
    if (status === 'confirmed') return 1;
    return 0;
  };

  const activeIndex = getActiveStepIndex();
  const formattedTravelDate = booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const formattedEndDate = booking.end_date ? new Date(booking.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen flex bg-[#FBF7F0] text-slate-800 font-sans antialiased overflow-x-hidden">
      
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: #fff !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Left Sidebar (Desktop) ── */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-[#EDE8DF] bg-white sticky top-0 h-screen z-45 no-print">
        <div className="px-6 h-20 border-b border-[#EDE8DF] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-black text-2xl tracking-tight" style={{ color: '#2D6A4F' }}>
              Shrawello Travel Hub
            </span>
          </Link>
        </div>

        <div className="px-6 py-6 border-b border-[#EDE8DF] text-center">
          <div className="size-16 rounded-full overflow-hidden mx-auto border-2 border-primary/20 flex items-center justify-center bg-primary/10 font-black text-primary text-xl">
            {initials}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">Welcome back</p>
          <h4 className="font-display font-bold text-slate-800 text-base leading-tight mt-0.5">{customer?.name}</h4>
          {myMembership && myMembership.status === 'Active' && (
            <span 
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded mt-1 border"
              style={{ 
                backgroundColor: `${myMembership.color || '#CD7F32'}15`, 
                color: myMembership.color || '#CD7F32', 
                borderColor: `${myMembership.color || '#CD7F32'}30` 
              }}
            >
              {myMembership.tier} Member
            </span>
          )}

          <Link to="/packages" className="block w-full py-2.5 mt-5 rounded-xl text-center text-xs font-bold text-white transition-all shadow-md" style={{ background: '#2D6A4F' }}>
            Book New Trip
          </Link>
        </div>

        <nav className="flex-grow px-4 py-6 space-y-1.5 overflow-y-auto">
          {([
            { key: 'bookings', label: 'Bookings', icon: 'calendar_month', active: true },
            { key: 'discovery', label: 'Discovery', icon: 'explore', active: false },
            { key: 'rewards', label: 'Rewards & Pay', icon: 'military_tech', active: false },
            { key: 'profile', label: 'Profile', icon: 'person', active: false },
            { key: 'support', label: 'Support', icon: 'chat', active: false },
          ]).map(item => {
            return (
              <button
                key={item.key}
                onClick={() => navigate('/my-account', { state: { tab: item.key } })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs relative ${
                  item.active ? 'bg-[#F5EDE0] text-slate-900' : 'text-slate-500'
                }`}
              >
                {item.active && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-primary" style={{ backgroundColor: '#C9732A' }} />
                )}
                <span className={`material-symbols-outlined text-[18px] ${item.active ? 'text-primary' : 'text-slate-400'}`} style={{ color: item.active ? '#C9732A' : undefined }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative w-72 bg-white flex flex-col h-full shadow-2xl p-5 z-10">
            <button className="absolute top-4 right-4 text-slate-400" onClick={() => setIsMobileSidebarOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="mb-6 pb-5 border-b border-[#EDE8DF]">
              <span className="font-display font-black text-xl text-primary" style={{ color: '#2D6A4F' }}>Shrawello Travel Hub</span>
            </div>
            <nav className="space-y-1">
              {([
                { key: 'bookings', label: 'Bookings', icon: 'calendar_month', active: true },
                { key: 'discovery', label: 'Discovery', icon: 'explore', active: false },
                { key: 'rewards', label: 'Rewards & Pay', icon: 'military_tech', active: false },
                { key: 'profile', label: 'Profile', icon: 'person', active: false },
                { key: 'support', label: 'Support', icon: 'chat', active: false },
              ]).map(item => (
                <button
                  key={item.key}
                  onClick={() => { navigate('/my-account', { state: { tab: item.key } }); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs ${
                    item.active ? 'bg-primary/10 text-primary' : 'text-slate-500'
                  }`}
                  style={{ color: item.active ? '#C9732A' : undefined, backgroundColor: item.active ? '#FFF8F2' : undefined }}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ── Main Layout Column ── */}
      <div className="flex-grow flex flex-col min-h-screen">
        
        {/* Top Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#EDE8DF] h-20 px-6 sm:px-8 flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500 hover:text-slate-800 p-1 bg-slate-50 rounded-xl" onClick={() => setIsMobileSidebarOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Link to="/my-account" className="hover:text-slate-900 transition-colors">My Dashboard</Link>
              <span className="text-slate-300">/</span>
              <span className="text-primary font-black" style={{ color: '#C9732A' }}>Booking Detail</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border bg-white shadow-sm text-slate-600 hover:bg-slate-50">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print Voucher
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div id="print-area" className="flex-grow p-6 sm:p-8 max-w-[1100px] w-full mx-auto space-y-6">
          
          {/* Header Title Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#EDE8DF] pb-5">
            <div>
              <Link to="/my-account" className="text-xs font-bold text-primary flex items-center gap-1 mb-2 no-print" style={{ color: '#C9732A' }}>
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                Back to Dashboard
              </Link>
              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-wide">
                Booking ID: #{booking.id}
              </span>
              <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 mt-2 leading-tight">
                {booking.package_name || booking.destination || 'Trip Package'}
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary" style={{ color: '#C9732A' }}>calendar_today</span>
                {formattedTravelDate} {booking.end_date && ` - ${formattedEndDate}`} &bull; {booking.pax_count || 1} Travelers
              </p>
            </div>

            <div className="flex gap-2 no-print">
              <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download Voucher
              </button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-[#D2E65B] text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1.5" style={{ backgroundColor: '#2D6A4F', color: '#fff' }}>
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                Itinerary PDF
              </button>
            </div>
          </div>

          {/* Redesigned Two-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Left Column (Timeline, Image, Logistics, Itinerary) */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Booking Status Timeline */}
              <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm space-y-4">
                <h3 className="font-display font-bold text-base text-slate-900">Booking Status</h3>
                
                <div className="flex justify-between items-center relative py-4">
                  {/* Progress Line */}
                  <div className="absolute top-1/2 left-[12%] right-[12%] h-0.5 bg-slate-100 z-0 -translate-y-1/2" />
                  
                  {timelineSteps.map((step, idx) => {
                    const isDone = idx <= activeIndex;
                    const isCurrent = idx === activeIndex;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center z-10 flex-1 relative">
                        <div className={`size-8 rounded-full flex items-center justify-center shadow-md transition-all ${
                          isDone ? 'bg-primary text-white' : 'bg-white border text-slate-400 border-slate-200'
                        }`}
                        style={{
                          backgroundColor: isDone ? '#C9732A' : undefined,
                          borderColor: isDone ? undefined : '#EDE8DF',
                          transform: isCurrent ? 'scale(1.1)' : undefined
                        }}>
                          {isDone ? (
                            <span className="material-symbols-outlined text-[16px] font-black">check</span>
                          ) : (
                            <span className="text-[11px] font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-slate-800 mt-2 leading-tight">{step.label}</p>
                        <span className="text-[8px] text-slate-400 block mt-0.5 font-semibold">{step.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cover Image & Overview */}
              <div className="bg-white rounded-[2.2rem] border border-[#EDE8DF] overflow-hidden shadow-sm">
                <div className="h-64 bg-slate-100 relative">
                  <img src={booking.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80'} alt="cover" className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded">Mountains</span>
                    <span className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded">Leisure</span>
                  </div>
                </div>
                {booking.overview && (
                  <div className="p-6">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                      "{booking.overview}"
                    </p>
                  </div>
                )}
              </div>

              {/* Logistics & Stay details */}
              <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <span className="material-symbols-outlined text-primary" style={{ color: '#C9732A' }}>hotel</span>
                  <h3 className="font-display font-bold text-base text-slate-900">Logistics & Stay</h3>
                </div>

                {suppliers.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[32px] block mb-1">info</span>
                    Hotel accommodations and transport allocations will be published here once finalized.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {suppliers.map((sup, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-slate-50 bg-[#FDFCF7] text-xs font-semibold">
                        <div className="flex justify-between items-center border-b border-slate-100/50 pb-2 mb-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{sup.service_type}</span>
                          {sup.start_date && <span className="text-[9px] text-slate-400">{new Date(sup.start_date).toLocaleDateString()}</span>}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{sup.supplier_name}</h4>
                        {sup.notes && <p className="text-[10px] text-slate-500 mt-1 font-medium leading-normal">{sup.notes}</p>}
                        
                        {(sup.driver_name || sup.vehicle_number) && (
                          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                            {sup.driver_name && <div>Driver: <span className="font-bold text-slate-700">{sup.driver_name}</span></div>}
                            {sup.vehicle_number && <div>Vehicle: <span className="font-bold text-slate-700">{sup.vehicle_number}</span></div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detailed Itinerary */}
              <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <span className="material-symbols-outlined text-primary" style={{ color: '#C9732A' }}>format_list_bulleted</span>
                  <h3 className="font-display font-bold text-base text-slate-900">Detailed Itinerary</h3>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="border-l-2 border-primary-light/40 pl-4 py-1.5 space-y-4" style={{ borderColor: '#E8935B' }}>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 size-2 bg-primary rounded-full" style={{ backgroundColor: '#C9732A' }} />
                      <h4 className="font-bold text-slate-800 text-xs">Day 1: Arrival & Transfer</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-relaxed">
                        Private transfer to Zermatt. Evening welcome dinner.
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 size-2 bg-primary rounded-full" style={{ backgroundColor: '#C9732A' }} />
                      <h4 className="font-bold text-slate-800 text-xs">Day 2: Peak Exploration</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-relaxed">
                        Cable car ride to the highest viewing platform in the Alps.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => alert('Viewing full itinerary...')} className="text-primary font-black hover:text-primary-dark block text-xs mt-2 no-print" style={{ color: '#C9732A' }}>
                    View full itinerary &rsaquo;
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column (Travelers, Inclusions, Actions) */}
            <div className="space-y-6 text-xs font-semibold no-print">
              
              {/* Travelers Panel */}
              <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="font-display font-bold text-base text-slate-900">Travelers</h3>
                  <button onClick={() => navigate('/my-account')} className="text-xs font-bold text-primary hover:text-primary-dark" style={{ color: '#C9732A' }}>
                    Edit Details
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-xs leading-none">{customer?.name}</p>
                      <span className="text-[8px] text-slate-400 mt-1 block uppercase font-bold">Primary Traveler</span>
                    </div>
                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                      Passport Uploaded
                    </span>
                  </div>

                  {booking.pax_count && booking.pax_count > 1 && (
                    <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-xs leading-none">Passenger 2</p>
                        <span className="text-[8px] text-slate-400 mt-1 block uppercase font-bold">Co-Traveler</span>
                      </div>
                      <button onClick={() => navigate('/my-account')} className="text-[9px] font-black bg-red-50 text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-100">
                        Upload ID
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* What's included checklist */}
              <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm space-y-4">
                <h3 className="font-display font-bold text-base text-slate-900">What's Included</h3>
                
                <ul className="space-y-2.5 text-[11px] text-slate-500 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 font-black shrink-0">check</span>
                    Luxury Hotel Stays
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 font-black shrink-0">check</span>
                    Daily Breakfast and select dinners
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 font-black shrink-0">check</span>
                    Private SUV Transfers & Guide
                  </li>
                </ul>

                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-t pt-3 mt-4">Exclusions</h4>
                <ul className="space-y-2 text-[11px] text-slate-400 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-500 font-black shrink-0">close</span>
                    International Flights
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-500 font-black shrink-0">close</span>
                    Personal Travel Insurance
                  </li>
                </ul>
              </div>

              {/* Actions panel */}
              {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Operations Panel</h3>
                  <button onClick={() => setShowRescheduleModal(true)} className="w-full py-2.5 text-xs font-bold border rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">
                    Request Date Change
                  </button>
                  <button onClick={() => setShowCancelModal(true)} className="w-full py-2.5 text-xs font-bold border border-red-200 text-red-500 rounded-xl hover:bg-red-50">
                    Request Cancellation
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL: CANCELLATION REQUEST ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowCancelModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Request Cancellation</h3>
            <p className="text-xs text-slate-400 mb-4">We are sorry to see you cancel. Please write your reason for cancellation, and our representative will call you back.</p>
            <form onSubmit={handleCancelSubmit} className="space-y-4 font-semibold text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Reason for cancellation</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why you wish to cancel this trip..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-xs focus:outline-none"
                />
              </div>
              <button type="submit" disabled={cancelLoading} className="w-full py-3 bg-red-650 text-white rounded-xl font-bold text-xs shadow-md" style={{ backgroundColor: '#C62828' }}>
                {cancelLoading ? 'Submitting Request...' : 'Submit Cancellation Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESCHEDULE REQUEST ── */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowRescheduleModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Request Date Change</h3>
            <p className="text-xs text-slate-400 mb-4">Choose a new preferred date and provide details. Our operations team will check availability and confirm.</p>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 font-semibold text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Requested Travel Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-xs focus:outline-none font-sans"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Reason / Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your reschedule request..."
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-xs focus:outline-none"
                />
              </div>
              <button type="submit" disabled={rescheduleLoading} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md">
                {rescheduleLoading ? 'Submitting Request...' : 'Submit Reschedule Request'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
