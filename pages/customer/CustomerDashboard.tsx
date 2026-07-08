import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth, CUSTOMER_JWT_KEY } from '../../context/CustomerAuthContext';
import { useData } from '../../context/DataContext';
import { getLocationName, formatPrice, formatPriceCompact } from '../../utils/packageUtils';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Toast Notification System ──
interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

let toastIdCounter = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  const iconMap = { success: 'check_circle', error: 'error', info: 'info' };
  const bgMap = { success: '#E8F5E9', error: '#FFEBEE', info: '#E3F2FD' };
  const colorMap = { success: '#2E7D32', error: '#C62828', info: '#1565C0' };
  return (
    <div className="fixed top-24 right-6 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border animate-in slide-in-from-right duration-300"
          style={{ background: bgMap[t.type], borderColor: `${colorMap[t.type]}20`, color: colorMap[t.type] }}>
          <span className="material-symbols-outlined text-[20px] shrink-0">{iconMap[t.type]}</span>
          <span className="text-xs font-bold flex-grow">{t.text}</span>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Confirmation Modal ──
function ConfirmModal({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 bg-red-50 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-[22px]">warning</span>
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">{title}</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-[#EDE8DF] text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs shadow-sm transition-colors">Confirm</button>
        </div>
      </div>
    </div>
  );
}

interface Booking {
  id: string;
  package_name?: string;
  destination?: string;
  travel_date?: string;
  total_price?: number;
  payment_status?: string;
  status?: string;
  pax_count?: number;
  created_at?: string;
  whatsapp_group_url?: string;
}

interface CoTraveler {
  id: number;
  name: string;
  relation?: string;
  phone?: string;
  passport_no?: string;
  dob?: string;
}

interface DocVaultItem {
  id: string;
  doc_type: string;
  filename: string;
  file_url: string;
  created_at: string;
}

interface LoyaltyPointsLog {
  id: number;
  points: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface ReferralRecord {
  id: number;
  referred_email: string;
  status: string;
  created_at: string;
}

interface ChatMessage {
  id: number;
  sender_type: 'customer' | 'staff';
  message: string;
  created_at: string;
}

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    confirmed:   { label: 'Confirmed',  bg: '#E8F5E9', color: '#2E7D32' },
    pending:     { label: 'Pending',    bg: '#FFF8E1', color: '#F57F17' },
    cancelled:   { label: 'Cancelled',  bg: '#FFEBEE', color: '#C62828' },
    paid:        { label: 'Paid',       bg: '#E8F5E9', color: '#2E7D32' },
    deposit:     { label: 'Partial',    bg: '#FFF8E1', color: '#F57F17' },
    completed:   { label: 'Completed',  bg: '#F3E5F5', color: '#6A1B9A' },
  };
  const cfg = map[status?.toLowerCase()] || { label: status, bg: '#F1F5F9', color: '#64748B' };
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export const CustomerDashboard: React.FC = () => {
  const { customer, logout, refreshCustomer } = useCustomerAuth();
  const { packages, masterLocations } = useData();
  const navigate = useNavigate();
  
  // Tab control
  type TabType = 'bookings' | 'discovery' | 'rewards' | 'profile' | 'support';
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // MindMate redesign states
  const [activeSubTab, setActiveSubTab] = useState<'bookings' | 'wishlist' | 'travelers' | 'documents' | 'membership'>('bookings');
  const [selectedItineraryDay, setSelectedItineraryDay] = useState<number>(1);
  const [ratingFeedback, setRatingFeedback] = useState<number>(5);
  const [commentFeedback, setCommentFeedback] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  
  // Toast & Confirm state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  
  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ open: true, title, message, onConfirm });
  }, []);
  
  const closeConfirm = useCallback(() => {
    setConfirmState({ open: false, title: '', message: '', onConfirm: () => {} });
  }, []);

  // Notification outside-click ref
  const notifRef = useRef<HTMLDivElement>(null);

  // Form submission guards
  const [coTravelerLoading, setCoTravelerLoading] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  // ── Membership State ──
  const [myMembership, setMyMembership] = useState<any>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [publicPlans, setPublicPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [membershipRequestLoading, setMembershipRequestLoading] = useState(false);
  const [membershipMsg, setMembershipMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'Monthly' | 'Quarterly' | '6 Months' | 'Yearly'>('Yearly');
  const [showMembershipJoinModal, setShowMembershipJoinModal] = useState(false);
  const [joiningPlan, setJoiningPlan] = useState<any>(null);
  
  // Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  
  const [coTravelers, setCoTravelers] = useState<CoTraveler[]>([]);
  const [loadingCoTravelers, setLoadingCoTravelers] = useState(false);
  
  const [documents, setDocuments] = useState<DocVaultItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [loyaltyLogs, setLoyaltyLogs] = useState<LoyaltyPointsLog[]>([]);
  const [referralRecords, setReferralRecords] = useState<ReferralRecord[]>([]);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [anniversaryPromo, setAnniversaryPromo] = useState<{ title: string; code: string; description: string } | null>(null);

  // Forms States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    dob: ''
  });
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Preferences State
  const [preferences, setPreferences] = useState({
    destinations: '',
    dietary: 'None',
    budget: 'Standard',
    hotelType: '3 Star Standard'
  });
  const [preferencesMsg, setPreferencesMsg] = useState<string | null>(null);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // CoTraveler Add Form
  const [coTravelerForm, setCoTravelerForm] = useState({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
  const [coTravelerError, setCoTravelerError] = useState<string | null>(null);
  const [editingCoTravelerId, setEditingCoTravelerId] = useState<number | null>(null);

  // Doc Vault Add Form
  const [docType, setDocType] = useState('Passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Referral Invite Email Form
  const [referralEmail, setReferralEmail] = useState('');
  const [referralMsg, setReferralMsg] = useState<string | null>(null);

  // Quick Quote Form
  const [quoteForm, setQuoteForm] = useState({
    destination: '',
    date: '',
    travelers: '2 Adults',
    budget: 'Standard'
  });
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Active Booking & Financial Summary State
  const [activeBookingTransactions, setActiveBookingTransactions] = useState<Transaction[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'UPI / GPay / PhonePe', reference: '', notes: '' });
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/customer/login', { replace: true });
  };

  // Determine active booking
  const activeBooking = useMemo(() => {
    if (bookings.length === 0) return null;
    return bookings.find(b => b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'pending') || bookings[0] || null;
  }, [bookings]);

  // Calculate net paid from transactions
  const netPaid = useMemo(() => {
    return activeBookingTransactions
      .filter(t => t.status?.toLowerCase() === 'verified')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [activeBookingTransactions]);

  const balanceDue = useMemo(() => {
    if (!activeBooking) return 0;
    return Math.max(0, Number(activeBooking.total_price || 0) - netPaid);
  }, [activeBooking, netPaid]);

  // 1. Fetch Bookings
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Fetch transactions for active booking
  const fetchTransactions = useCallback(async () => {
    if (!activeBooking) return;
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${activeBooking.id}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveBookingTransactions(data || []);
      }
    } catch (err) {
      console.warn(err);
    }
  }, [activeBooking]);

  useEffect(() => {
    if (activeBooking) {
      fetchTransactions();
    }
  }, [activeBooking, fetchTransactions]);

  // 2. Fetch Wishlist
  const fetchWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/wishlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json() as any;
        setWishlist(data);
      }
    } catch {
      setWishlist([]);
    } finally {
      setLoadingWishlist(false);
    }
  };

  const handleRemoveWishlist = async (pkgId: string) => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ packageId: pkgId })
      });
      if (res.ok) {
        fetchWishlist();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Fetch CoTravelers
  const fetchCoTravelers = async () => {
    setLoadingCoTravelers(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/co-travelers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json() as any;
        setCoTravelers(data);
      }
    } catch {
      setCoTravelers([]);
    } finally {
      setLoadingCoTravelers(false);
    }
  };

  const handleAddCoTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coTravelerForm.name.trim() || coTravelerLoading) return;
    setCoTravelerError(null);
    setCoTravelerLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const isEdit = editingCoTravelerId !== null;
      const url = isEdit
        ? `${API_BASE}/api/customer/co-travelers/${editingCoTravelerId}`
        : `${API_BASE}/api/customer/co-travelers`;
      
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(coTravelerForm)
      });
      if (!res.ok) throw new Error(isEdit ? 'Failed to update co-traveler' : 'Failed to add co-traveler');
      
      setCoTravelerForm({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
      setEditingCoTravelerId(null);
      fetchCoTravelers();
      showToast('success', isEdit ? 'Co-traveler updated successfully!' : 'Co-traveler added successfully!');
    } catch (err: any) {
      setCoTravelerError(err.message);
    } finally {
      setCoTravelerLoading(false);
    }
  };

  const handleEditClick = (traveler: any) => {
    const formatLocalIso = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        if (d.getFullYear() <= 1900) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    setEditingCoTravelerId(traveler.id);
    setCoTravelerForm({
      name: traveler.name,
      relation: traveler.relation || 'Friend',
      phone: traveler.phone || '',
      passport_no: traveler.passport_no || '',
      dob: formatLocalIso(traveler.dob)
    });
  };

  const handleCancelEdit = () => {
    setEditingCoTravelerId(null);
    setCoTravelerForm({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
  };

  const handleDeleteCoTraveler = (cid: number) => {
    showConfirm('Delete Co-Traveler', 'Are you sure you want to remove this traveler? This action cannot be undone.', async () => {
      closeConfirm();
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        const res = await fetch(`${API_BASE}/api/customer/co-travelers/${cid}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchCoTravelers();
          showToast('success', 'Co-traveler removed.');
        }
      } catch (err) {
        showToast('error', 'Failed to delete co-traveler.');
      }
    });
  };

  // 4. Fetch Documents
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      setDocUploadError('Please select a file.');
      return;
    }
    if (docUploading) return;
    setDocUploadError(null);
    setDocUploading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const formData = new FormData();
      formData.append('doc_type', docType);
      formData.append('file', docFile);

      const res = await fetch(`${API_BASE}/api/customer/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload document.');
      setDocFile(null);
      setShowUploadModal(false);
      fetchDocuments();
      showToast('success', 'Document uploaded to secure vault!');
    } catch (err: any) {
      setDocUploadError(err.message);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = (docId: string) => {
    showConfirm('Delete Document', 'Remove this document from your secure vault? This cannot be undone.', async () => {
      closeConfirm();
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        const res = await fetch(`${API_BASE}/api/customer/documents/${docId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchDocuments();
          showToast('success', 'Document removed.');
        }
      } catch (err) {
        showToast('error', 'Failed to delete document.');
      }
    });
  };

  // 5. Fetch Loyalty & Referrals
  const fetchLoyalty = async () => {
    setLoadingLoyalty(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/loyalty`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoyaltyPoints(data.points || 0);
        setReferralCode(data.referral_code);
        setLoyaltyLogs(data.history || []);
        setReferralRecords(data.referrals || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const handleSendReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralEmail.trim() || referralLoading) return;
    setReferralMsg(null);
    setReferralLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/referral`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: referralEmail.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Referral invitation sent successfully!');
        setReferralEmail('');
        fetchLoyalty();
      } else {
        setReferralMsg(data.error || 'Failed to send referral.');
      }
    } catch {
      setReferralMsg('Error logging referral.');
    } finally {
      setReferralLoading(false);
    }
  };

  // 6. Fetch Chat Messages
  const fetchChat = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch {
      // silent
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: chatInput })
      });
      if (res.ok) {
        setChatInput('');
        fetchChat();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Fetch Notifications & Anniversary Promo
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
      
      // Birthday promo
      const promoRes = await fetch(`${API_BASE}/api/customer/special-offers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (promoRes.ok) {
        const pData = await promoRes.json();
        setAnniversaryPromo(pData.promo);
      }
    } catch {
      // silent
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      await fetch(`${API_BASE}/api/customer/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Initialize
  useEffect(() => {
    fetchBookings();
    fetchNotifications();
    
    // Polling — pause when tab is hidden
    const int = setInterval(() => {
      if (document.hidden) return;
      fetchNotifications();
      if (showSupportModal) fetchChat();
    }, 12000);
    return () => clearInterval(int);
  }, [fetchBookings, showSupportModal]);

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!showNotificationDropdown) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotificationDropdown]);

  // Sub-tab load triggers
  useEffect(() => {
    if (activeSubTab === 'wishlist') fetchWishlist();
    if (activeSubTab === 'travelers') { fetchCoTravelers(); }
    if (activeSubTab === 'documents') fetchDocuments();
    if (activeSubTab === 'membership') { fetchMyMembership(); fetchPublicPlans(); }
  }, [activeSubTab]);

  // ── Membership API calls ──
  const fetchMyMembership = async () => {
    setLoadingMembership(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/membership`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyMembership(data);
      }
    } catch { setMyMembership(null); }
    finally { setLoadingMembership(false); }
  };

  const fetchPublicPlans = async () => {
    if (publicPlans.length > 0) return; // cached
    setLoadingPlans(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/membership-plans`);
      if (res.ok) setPublicPlans(await res.json());
    } catch { setPublicPlans([]); }
    finally { setLoadingPlans(false); }
  };

  const handleRequestMembership = async (plan: any, cycle: string) => {
    setMembershipRequestLoading(true);
    setMembershipMsg(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/membership/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, billingCycle: cycle })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMembershipMsg({ type: 'success', text: data.message });
      setShowMembershipJoinModal(false);
      await fetchMyMembership();
      showToast('success', 'Membership request submitted!');
    } catch (err: any) {
      setMembershipMsg({ type: 'error', text: err.message });
    } finally { setMembershipRequestLoading(false); }
  };

  const handleCancelMembership = async () => {
    showConfirm(
      'Cancel Membership',
      'Are you sure you want to cancel your membership? This action cannot be undone.',
      async () => {
        try {
          const token = localStorage.getItem(CUSTOMER_JWT_KEY);
          const res = await fetch(`${API_BASE}/api/customer/membership`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed');
          showToast('success', data.message);
          setMyMembership(null);
          setMembershipMsg(null);
        } catch (err: any) {
          showToast('error', err.message);
        }
        closeConfirm();
      }
    );
  };

  // Always load loyalty on mount
  useEffect(() => {
    fetchLoyalty();
  }, []);

  // Profile modal: sync form from customer
  useEffect(() => {
    if (showProfileModal && customer) {
      setProfileForm({
        name: customer.name || '',
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        address: customer.address || '',
        dob: customer.dob || ''
      });
      let savedPrefs = { destinations: '', dietary: 'None', budget: 'Standard', hotelType: '3 Star Standard' };
      if (customer.travel_preferences) {
        try {
          savedPrefs = typeof customer.travel_preferences === 'string'
            ? JSON.parse(customer.travel_preferences)
            : customer.travel_preferences;
        } catch {
          // fallback
        }
      }
      setPreferences(savedPrefs);
    }
  }, [showProfileModal, customer]);

  // Handle Edit profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setProfileMsg({ type: 'success', text: 'Profile details saved successfully!' });
      setIsEditingProfile(false);
      refreshCustomer();
      showToast('success', 'Profile updated!');
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    }
  };

  // Handle Preferences
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesMsg(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ travel_preferences: preferences })
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      setPreferencesMsg('Preferences saved successfully!');
      refreshCustomer();
    } catch {
      setPreferencesMsg('Error saving preferences.');
    }
  };

  // Handle change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!passwordForm.oldPassword || !passwordForm.newPassword) return;
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ oldPassword: '', newPassword: '' });
      showToast('success', 'Password changed successfully!');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    }
  };

  // Quick Quote Submission
  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.destination.trim()) return;
    setQuoteLoading(true);
    setQuoteSuccess(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/enquiries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: customer?.name || 'Customer Portal user',
          email: customer?.email,
          phone: customer?.phone,
          destination: quoteForm.destination.trim(),
          travel_date: quoteForm.date,
          pax: quoteForm.travelers,
          budget: quoteForm.budget,
          message: `Custom quick quote request. Travelers: ${quoteForm.travelers}. Budget: ${quoteForm.budget}.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quote request');
      setQuoteSuccess('Quote request submitted successfully! Our agents will contact you shortly.');
      setQuoteForm({ destination: '', date: '', travelers: '2 Adults', budget: 'Standard' });
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setQuoteLoading(false);
    }
  };

  // Rewards Payment Upload Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    if (!payForm.amount || !payForm.reference) {
      setPayError('Please enter amount and reference.');
      return;
    }
    setPayLoading(true);
    setPayError(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const formData = new FormData();
      formData.append('amount', payForm.amount);
      formData.append('method', payForm.method);
      formData.append('reference', payForm.reference);
      formData.append('notes', payForm.notes);
      if (payFile) formData.append('receipt', payFile);

      const res = await fetch(`${API_BASE}/api/customer/bookings/${activeBooking.id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log receipt.');
      
      setShowPayModal(false);
      setPayForm({ amount: '', method: 'UPI / GPay / PhonePe', reference: '', notes: '' });
      setPayFile(null);
      fetchTransactions();
      showToast('success', 'Receipt uploaded! Staff verification pending.');
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Apply Coupon (Rewards tab)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${activeBooking.id}/apply-coupon`, {
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
      fetchBookings();
    } catch (err: any) {
      setCouponMsg({ type: 'error', text: err.message });
    } finally {
      setCouponLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const initials = customer?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TR';

  // Derived stats
  const completedTripsCount = bookings.filter(b => b.status?.toLowerCase() === 'completed').length;
  const totalSpent = bookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  // Derive wishlist package cards details
  const wishlistPackages = useMemo(() => {
    if (!packages || packages.length === 0) return [];
    return wishlist.map(w => {
      const matched = packages.find(p => p.id === w.id);
      return matched || w;
    });
  }, [wishlist, packages]);

  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) {
      showToast('error', 'No active booking to submit feedback for.');
      return;
    }
    setReviewLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: activeBooking.id,
          rating: ratingFeedback,
          reviewText: commentFeedback || "Travel reflection rating"
        })
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      setReviewSubmitted(true);
      setCommentFeedback('');
      showToast('success', 'Thank you for your travel reflection feedback!');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const greetingWord = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Dynamic itinerary from active booking (falls back to placeholder if no itinerary data)
  const itineraryHighlights = useMemo(() => {
    // Try to derive from active booking's itinerary data if available
    if (activeBooking && (activeBooking as any).itinerary && Array.isArray((activeBooking as any).itinerary)) {
      return (activeBooking as any).itinerary.map((item: any, i: number) => ({
        day: i + 1,
        title: item.title || `Day ${i + 1}`,
        desc: item.description || item.desc || 'Details pending confirmation.'
      }));
    }
    // Derive day count from travel dates
    const dayCount = (() => {
      if (activeBooking?.travel_date && (activeBooking as any).end_date) {
        const start = new Date(activeBooking.travel_date);
        const end = new Date((activeBooking as any).end_date);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diff);
      }
      return 0;
    })();
    if (dayCount > 0) {
      return Array.from({ length: dayCount }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1}`,
        desc: 'Detailed itinerary will be shared by your trip coordinator before departure.'
      }));
    }
    return [];
  }, [activeBooking]);

  const selectedDayInfo = useMemo(() => {
    return itineraryHighlights.find(h => h.day === selectedItineraryDay) || itineraryHighlights[0];
  }, [selectedItineraryDay, itineraryHighlights]);

  // Payment percentage calculation
  const paymentPercent = useMemo(() => {
    if (!activeBooking || !activeBooking.total_price) return 0;
    return Math.min(100, Math.round((netPaid / activeBooking.total_price) * 100));
  }, [activeBooking, netPaid]);

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-slate-800 font-sans antialiased overflow-x-hidden flex flex-col">
      
      {/* ── HEADER NAVIGATION ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDE8DF] h-20 px-6 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-[#2D6A4F]">
              Shravya Tours
            </span>
          </Link>
          <span className="hidden sm:inline-block text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
            {loyaltyPoints >= 1000 ? 'Gold Elite Member' : loyaltyPoints >= 500 ? 'Silver Elite Member' : 'Elite Member'}
          </span>
        </div>

        {/* Center navigation pills (desktop) */}
        <nav className="hidden md:flex items-center bg-[#F5EDE0]/60 p-1 rounded-full border border-[#EDE8DF]">
          {([
            { key: 'bookings', label: 'Dashboard', icon: 'dashboard' },
            { key: 'wishlist', label: 'Wishlist', icon: 'favorite' },
            { key: 'travelers', label: 'Co-Travelers', icon: 'group' },
            { key: 'documents', label: 'Secure Vault', icon: 'folder_shared' },
            { key: 'membership', label: 'Membership', icon: 'workspace_premium' },
          ] as const).map(item => {
            const active = activeSubTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSubTab(item.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs transition-all ${
                  active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: active ? '#C9732A' : undefined }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Mobile menu indicator */}
          <button className="md:hidden p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-xl flex items-center justify-center border border-[#EDE8DF]" onClick={() => setIsMobileSidebarOpen(true)}>
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          {/* Quick Package Search */}
          <Link to="/packages" className="p-2 text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-[#EDE8DF] transition-colors">
            <span className="material-symbols-outlined text-[20px]">travel</span>
          </Link>

          {/* Notification Inbox */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => { setShowNotificationDropdown(!showNotificationDropdown); if(!showNotificationDropdown) handleMarkNotificationsRead(); }}
              className="relative p-2 text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-[#EDE8DF] transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-orange-600 rounded-full animate-pulse" />
              )}
            </button>
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-[#EDE8DF] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-[#EDE8DF] flex justify-between items-center bg-[#FDFCF7]">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Inbox Notifications</h3>
                  {unreadCount > 0 && <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">New</span>}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No alerts received yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-4 text-xs hover:bg-slate-50/50">
                        <h4 className="font-bold text-slate-800">{n.title}</h4>
                        <p className="text-slate-500 mt-1">{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-1.5">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Concierge support */}
          <button onClick={() => setShowSupportModal(true)} className="p-2 text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-[#EDE8DF] transition-colors">
            <span className="material-symbols-outlined text-[20px]">chat</span>
          </button>

          {/* Profile settings */}
          <button onClick={() => setShowProfileModal(true)} className="p-2 text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-[#EDE8DF] transition-colors">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>

          {/* Logout (desktop) */}
          <button onClick={handleLogout} className="hidden md:flex p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl items-center justify-center border border-[#EDE8DF] transition-colors" title="Sign Out">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>

          <div onClick={() => setShowProfileModal(true)} className="size-9 rounded-full bg-primary/10 border border-[#C9732A]/20 overflow-hidden flex items-center justify-center font-bold text-primary text-sm cursor-pointer hover:scale-105 active:scale-95 transition-all">
            {initials}
          </div>
        </div>
      </header>

      {/* ── MOBILE MENU DRAWER ── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative w-72 bg-white flex flex-col h-full shadow-2xl p-5 z-10">
            <button className="absolute top-4 right-4 text-slate-400" onClick={() => setIsMobileSidebarOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="mb-6 pb-5 border-b border-[#EDE8DF]">
              <span className="font-display font-black text-xl text-[#2D6A4F]">Shravya Tours</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">Welcome back</p>
              <h4 className="font-display font-bold text-slate-800 text-sm mt-0.5">{customer?.name}</h4>
            </div>
            <nav className="flex-1 space-y-1">
              {([
                { key: 'bookings', label: 'My Bookings', icon: 'dashboard' },
                { key: 'wishlist', label: 'Wishlist & Discovery', icon: 'favorite' },
                { key: 'travelers', label: 'Co-Travelers', icon: 'group' },
                { key: 'documents', label: 'Secure Vault', icon: 'folder_shared' },
                { key: 'membership', label: 'Membership', icon: 'workspace_premium' },
              ] as const).map(item => {
                const active = activeSubTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { setActiveSubTab(item.key); setIsMobileSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-colors ${
                      active ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                    style={{ color: active ? '#C9732A' : undefined, backgroundColor: active ? '#FFF8F2' : undefined }}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t pt-4 space-y-2 mt-auto">
              <button onClick={() => { setShowProfileModal(true); setIsMobileSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50">
                <span className="material-symbols-outlined text-[18px]">person</span> Account Settings
              </button>
              <button onClick={() => { setShowSupportModal(true); setIsMobileSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50">
                <span className="material-symbols-outlined text-[18px]">chat</span> Help Concierge
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-red-500 text-xs font-bold hover:bg-red-50">
                <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── THREE COLUMN DASHBOARD GRID ── */}
      <main className="flex-grow max-w-[1400px] w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN: Greeting, sub-tabs & context-aware lists ── */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Greeting Header */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm">
            <span className="text-[10px] text-[#C9732A] uppercase font-black tracking-widest block mb-1">Customer Portal</span>
            <h1 className="text-2xl font-display font-black text-slate-900 leading-tight">
              {greetingWord}, {customer?.name?.split(' ')[0] || 'Traveler'} ☀️
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
              Explore your upcoming escapes, manage co-travelers and download invoices.
            </p>
            
            {/* Sub-tab navigation selector */}
            <div className="flex gap-1 bg-slate-50 border p-1 rounded-2xl mt-5 overflow-x-auto select-none no-scrollbar">
              {([
                { key: 'bookings', label: 'Trips', icon: 'explore' },
                { key: 'wishlist', label: 'Wishlist', icon: 'favorite' },
                { key: 'travelers', label: 'Travelers', icon: 'group' },
                { key: 'documents', label: 'Vault', icon: 'folder_shared' },
                { key: 'membership', label: 'VIP', icon: 'workspace_premium' }
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-[10px] font-bold transition-all min-w-[50px] ${
                    activeSubTab === tab.key ? 'bg-white text-slate-900 shadow-sm border border-[#EDE8DF]' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] mb-0.5" style={{ color: activeSubTab === tab.key ? '#C9732A' : undefined }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context Card Block */}
          {activeSubTab === 'bookings' && (
            <div className="space-y-6">
              
              {/* Upcoming Trip Hero Card */}
              {activeBooking ? (
                <div className="bg-white rounded-[2rem] border border-[#EDE8DF] overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    <img 
                      src={activeBooking.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80'} 
                      alt="Upcoming Trip" 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    
                    <span className="absolute top-4 left-4 bg-black/45 backdrop-blur-md text-white text-[9px] font-black uppercase px-2.5 py-1 rounded">
                      {activeBooking.status || 'Active'}
                    </span>
                    
                    <span className="absolute top-4 right-4 bg-white/95 text-slate-800 text-[9px] font-black uppercase px-2.5 py-1 rounded shadow-sm">
                      {(() => {
                        if (activeBooking.travel_date && (activeBooking as any).end_date) {
                          const start = new Date(activeBooking.travel_date);
                          const end = new Date((activeBooking as any).end_date);
                          const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          return `${days} Days Trip`;
                        }
                        return activeBooking.pax_count ? `${activeBooking.pax_count} Travelers` : 'Trip';
                      })()}
                    </span>

                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="text-[9px] text-[#E8935B] uppercase font-black tracking-wide block">Next Departure</span>
                      <h3 className="font-display font-bold text-white text-lg leading-tight truncate">
                        {activeBooking.package_name || activeBooking.destination || 'Custom Adventure'}
                      </h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Travel Date</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {activeBooking.travel_date ? new Date(activeBooking.travel_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending Confirmation'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Travelers</span>
                        <p className="font-bold text-slate-800 mt-0.5">{activeBooking.pax_count || 1} Person(s)</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-4 flex gap-2">
                      <Link 
                        to={`/my-account/booking/${activeBooking.id}`}
                        className="flex-1 py-2.5 bg-[#2D6A4F] text-white font-bold text-xs text-center rounded-xl hover:bg-[#204a37] shadow-sm transition-colors"
                      >
                        View Voucher
                      </Link>
                      <button 
                        onClick={() => setShowPayModal(true)}
                        className="px-4 py-2.5 border border-[#EDE8DF] rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-600"
                        title="Upload receipt payment"
                      >
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#EDE8DF] shadow-sm">
                  <span className="material-symbols-outlined text-[36px] text-slate-300 block mb-2">flight_takeoff</span>
                  <h4 className="font-bold text-slate-800 text-xs">No active itineraries found</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                    Ready to book your next trip? Browse our premium listings.
                  </p>
                  <Link to="/packages" className="inline-block mt-4 px-5 py-2 bg-primary text-white text-[10px] font-bold rounded-lg" style={{ backgroundColor: '#C9732A' }}>
                    Find Packages
                  </Link>
                </div>
              )}

              {/* Other Bookings List */}
              <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2">All Booking Logs</h3>
                <div className="space-y-3">
                  {loadingBookings ? (
                    <p className="text-[10px] text-slate-400">Loading booking records...</p>
                  ) : bookings.length <= 1 ? (
                    <p className="text-[10px] text-slate-400 py-2">No other booking histories found.</p>
                  ) : (
                    bookings.filter(b => b.id !== activeBooking?.id).map(b => (
                      <Link to={`/my-account/booking/${b.id}`} key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-50 bg-[#FDFCF7]/60 hover:bg-slate-50/50 transition-colors group">
                        <div className="size-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 text-primary" style={{ color: '#C9732A', backgroundColor: '#FFF8F2' }}>
                          <span className="material-symbols-outlined text-[16px]">travel</span>
                        </div>
                        <div className="min-w-0 flex-grow">
                          <h4 className="font-bold text-slate-800 text-xs truncate group-hover:text-primary transition-colors" style={{ color: '#C9732A' }}>{b.package_name || b.destination}</h4>
                          <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{b.travel_date ? new Date(b.travel_date).toLocaleDateString() : 'No date'}</span>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover:translate-x-0.5 transition-all">chevron_right</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'wishlist' && (
            <div className="space-y-6">
              
              {/* Featured Wishlist Package Hero */}
              {wishlistPackages.length > 0 ? (
                <div className="bg-white rounded-[2rem] border border-[#EDE8DF] overflow-hidden shadow-sm group">
                  <div className="h-40 bg-slate-100 relative">
                    <img src={wishlistPackages[0].image} alt="Featured Saved" className="w-full h-full object-cover" />
                    <button onClick={() => handleRemoveWishlist(wishlistPackages[0].id)} className="absolute top-3 right-3 size-7 bg-white rounded-full flex items-center justify-center text-red-500 shadow-md">
                      <span className="material-symbols-outlined text-[14px] fill-current">favorite</span>
                    </button>
                    <div className="absolute bottom-3 left-3 bg-black/45 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-white">
                      Featured Shortlist
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <h4 className="font-display font-bold text-slate-800 text-sm">{wishlistPackages[0].title}</h4>
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {wishlistPackages[0].overview || 'Fabulous itinerary matched to your choices.'}
                    </p>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Estimated Cost</span>
                        <span className="text-xs font-black text-slate-800">{formatPrice(wishlistPackages[0].price)}</span>
                      </div>
                      <Link to={`/packages/${wishlistPackages[0].id}`} className="px-4 py-2 bg-slate-900 text-white font-bold text-[10px] rounded-lg">
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#EDE8DF]">
                  <span className="material-symbols-outlined text-[36px] text-slate-300 block mb-1">favorite_border</span>
                  <h4 className="font-bold text-slate-800 text-xs">Wishlist is empty</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                    Tap the heart icon on holiday listings to save them here.
                  </p>
                </div>
              )}

              {/* Wishlist Saved Packages List */}
              {wishlistPackages.length > 1 && (
                <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Saved Favorites</h3>
                  <div className="space-y-2.5">
                    {wishlistPackages.slice(1).map(pkg => (
                      <div key={pkg.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <img src={pkg.image} alt={pkg.title} className="size-11 rounded-lg object-cover" />
                        <div className="min-w-0 flex-grow">
                          <h4 className="font-bold text-slate-800 text-xs truncate">{pkg.title}</h4>
                          <span className="text-[9px] font-black text-slate-600 block mt-0.5">{formatPrice(pkg.price)}</span>
                        </div>
                        <button onClick={() => handleRemoveWishlist(pkg.id)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-350 hover:text-red-500">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'travelers' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Add Co-Traveler Form */}
              <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">
                    {editingCoTravelerId ? 'Edit Co-Traveler' : 'Add Co-Traveler'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {editingCoTravelerId ? 'Modify co-traveler info and save changes.' : 'Register co-traveler info to expedite booking check-ins.'}
                  </p>
                </div>
                {coTravelerError && (
                  <div className="p-2 bg-red-50 text-red-500 text-[10px] font-bold rounded-lg">{coTravelerError}</div>
                )}
                <form onSubmit={handleAddCoTraveler} className="space-y-3 text-xs font-semibold">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase block mb-1">Full Name</label>
                    <input
                      type="text" required placeholder="Enter passenger name"
                      value={coTravelerForm.name}
                      onChange={e => setCoTravelerForm({ ...coTravelerForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/40 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Relation</label>
                      <select 
                        value={coTravelerForm.relation}
                        onChange={e => setCoTravelerForm({ ...coTravelerForm, relation: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option>Friend</option>
                        <option>Spouse</option>
                        <option>Child</option>
                        <option>Parent</option>
                        <option>Sibling</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Passport / ID</label>
                      <input
                        type="text" placeholder="Optional"
                        value={coTravelerForm.passport_no}
                        onChange={e => setCoTravelerForm({ ...coTravelerForm, passport_no: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Phone</label>
                      <input
                        type="tel" placeholder="Mobile"
                        value={coTravelerForm.phone}
                        onChange={e => setCoTravelerForm({ ...coTravelerForm, phone: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">DOB</label>
                      <input
                        type="date"
                        value={coTravelerForm.dob}
                        onChange={e => setCoTravelerForm({ ...coTravelerForm, dob: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  {editingCoTravelerId ? (
                    <div className="flex gap-2 mt-1">
                      <button type="submit" disabled={coTravelerLoading} className="flex-grow py-2 bg-[#C9732A] text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-60">
                        {coTravelerLoading ? 'Updating...' : 'Update Passenger'}
                      </button>
                      <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                  <button type="submit" disabled={coTravelerLoading} className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs mt-1 disabled:opacity-60">
                      {coTravelerLoading ? 'Adding...' : 'Add Passenger'}
                    </button>
                  )}
                </form>
              </div>

              {/* Co-Travelers List */}
              <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Registered Passengers</h3>
                {loadingCoTravelers ? (
                  <p className="text-[10px] text-slate-400">Loading travelers list...</p>
                ) : coTravelers.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">No companion profiles saved.</p>
                ) : (
                  <div className="space-y-2">
                    {coTravelers.map(c => (
                      <div key={c.id} className="p-3 rounded-xl border border-slate-50 bg-[#FDFCF7]/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800 leading-none">{c.name}</p>
                          <div className="flex gap-2 text-[9px] text-slate-400 font-bold mt-1.5 uppercase">
                            <span>{c.relation}</span>
                            <span>&bull;</span>
                            <span>{c.passport_no || 'No ID Logged'}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleEditClick(c)} className="p-1 text-slate-400 hover:text-slate-650 rounded-lg" title="Edit Companion">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteCoTraveler(c.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-lg" title="Delete Companion">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'documents' && (
            <div className="space-y-6">
              
              {/* Document Vault Actions */}
              <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Secure Document Vault</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Upload passports, visas, or insurance copies. All files are encrypted.</p>
                </div>
                <button onClick={() => setShowUploadModal(true)} className="w-full py-3 border-2 border-dashed border-[#EDE8DF] rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                  <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upload Document</span>
                </button>
              </div>

              {/* Document Vault List */}
              <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Saved Files</h3>
                {loadingDocs ? (
                  <p className="text-[10px] text-slate-400">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">Vault is empty.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-3 rounded-xl border border-slate-50 bg-[#FDFCF7]/60 flex items-center justify-between text-xs gap-3">
                        <div className="min-w-0 flex-grow">
                          <h4 className="font-bold text-slate-800 text-xs truncate">{doc.filename}</h4>
                          <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">{doc.doc_type}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a href={`${API_BASE}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </a>
                          <button onClick={() => handleDeleteDoc(doc.id)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── MEMBERSHIP TAB PANEL ─── */}
          {activeSubTab === 'membership' && (
            <div className="space-y-5 animate-in fade-in duration-300">

              {/* Error/success message */}
              {membershipMsg && (
                <div className={`flex items-start gap-3 p-4 rounded-2xl text-xs font-bold border ${
                  membershipMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <span className="material-symbols-outlined text-[16px] shrink-0">{membershipMsg.type === 'success' ? 'check_circle' : 'error'}</span>
                  <span>{membershipMsg.text}</span>
                  <button onClick={() => setMembershipMsg(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              {loadingMembership ? (
                <div className="bg-white rounded-3xl p-8 border border-[#EDE8DF] text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-semibold">Loading your membership...</p>
                </div>
              ) : myMembership && (myMembership.status === 'Active' || myMembership.status === 'Pending' || myMembership.status === 'Suspended') ? (
                /* ── STATE B: Has a membership ── */
                <div className="space-y-4">
                  {/* Membership Status Card */}
                  <div className="relative bg-white rounded-3xl border-2 overflow-hidden shadow-lg"
                    style={{ borderColor: myMembership.color || '#CD7F32' }}>
                    {/* Colored header band */}
                    <div className="px-6 pt-6 pb-5 relative" style={{ background: `linear-gradient(135deg, ${myMembership.color}12, ${myMembership.color}06)` }}>
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10" style={{ backgroundColor: myMembership.color }} />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black px-3 py-1 rounded-full text-white uppercase tracking-wider" style={{ backgroundColor: myMembership.color }}>
                            {myMembership.tier} TIER
                          </span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                            myMembership.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                            myMembership.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {myMembership.status}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{myMembership.planName}</h3>
                        {myMembership.status === 'Pending' ? (
                          <p className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                            Your request is under review by our team. We'll activate it shortly!
                          </p>
                        ) : (
                          <div className="flex items-center gap-4 mt-3 text-xs">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Enrolled</p>
                              <p className="font-bold text-slate-800">{myMembership.enrolledOn ? new Date(myMembership.enrolledOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Valid Until</p>
                              <p className="font-bold text-slate-800">{myMembership.expiresOn ? new Date(myMembership.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Plan</p>
                              <p className="font-bold text-slate-800">{myMembership.billingCycle}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Discount Summary */}
                    {myMembership.status === 'Active' && (
                      <div className="px-6 py-4 border-t border-slate-100 space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Your Exclusive Discounts</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Global Discount</span>
                          <span className="text-base font-black" style={{ color: myMembership.color }}>
                            {myMembership.discountType === 'Flat_Amount' ? `₹${(myMembership.discountFlat || 0).toLocaleString()} Flat Off` : `${myMembership.discountPercent || 0}% Off`}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { icon: 'hotel', label: 'Hotel', val: myMembership.hotelDiscount },
                            { icon: 'flight', label: 'Flight', val: myMembership.flightDiscount },
                            { icon: 'tour', label: 'Tour', val: myMembership.tourDiscount },
                            { icon: 'local_taxi', label: 'Cab', val: myMembership.cabDiscount },
                          ].map(b => (
                            <div key={b.label} className="p-2 rounded-xl bg-slate-50 text-center">
                              <span className="material-symbols-outlined text-slate-400 text-[14px] block">{b.icon}</span>
                              <span className="text-[8px] font-bold text-slate-500 block">{b.label}</span>
                              <span className="text-xs font-black" style={{ color: myMembership.color }}>+{b.val || 0}%</span>
                            </div>
                          ))}
                        </div>
                        {/* Perks */}
                        {myMembership.perks?.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Included Perks</p>
                            {myMembership.perks.map((perk: string, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${myMembership.color}20`, color: myMembership.color }}>
                                  <span className="material-symbols-outlined text-[10px]">check</span>
                                </div>
                                <span className="text-[11px] text-slate-600 leading-snug">{perk}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                      <button
                        onClick={handleCancelMembership}
                        className="text-[11px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        {myMembership.status === 'Pending' ? 'Withdraw Request' : 'Cancel Membership'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── STATE A: No membership — Plan Browser ── */
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-500 text-[20px]">workspace_premium</span>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">Join a VIP Membership</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Unlock exclusive discounts on every booking</p>
                      </div>
                    </div>
                  </div>

                  {loadingPlans ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full mx-auto" />
                    </div>
                  ) : publicPlans.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-[#EDE8DF] text-center shadow-sm">
                      <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">card_membership</span>
                      <p className="text-xs text-slate-400 font-semibold">No membership plans are available yet.<br />Please check back soon!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {publicPlans.map(plan => (
                        <div
                          key={plan.id}
                          className="bg-white rounded-3xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                          style={{ borderColor: plan.color }}
                        >
                          <div className="p-5" style={{ background: `linear-gradient(135deg, ${plan.color}10, transparent)` }}>
                            <div className="flex items-start justify-between mb-3">
                              <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white uppercase tracking-wider" style={{ backgroundColor: plan.color }}>
                                {plan.tier}
                              </span>
                              <div className="text-right">
                                <span className="text-xl font-black text-slate-900">₹{(plan.pricePerYear || plan.price_per_year || 0).toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 font-bold block">/year</span>
                              </div>
                            </div>
                            <h4 className="font-black text-slate-900 text-sm mb-1" style={{ color: plan.color }}>{plan.name}</h4>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-black" style={{ color: plan.color }}>
                                {plan.discountType === 'Flat_Amount' ? `₹${plan.discountFlat} Flat Off` : `${plan.discountPercent}% Global Discount`}
                              </span>
                              <span className="text-[9px] text-slate-400">on all bookings</span>
                            </div>
                            {plan.perks?.slice(0, 3).map((perk: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600 mb-1">
                                <span className="w-3 h-3 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${plan.color}25`, color: plan.color }}>
                                  <span className="material-symbols-outlined text-[8px]">check</span>
                                </span>
                                {perk}
                              </div>
                            ))}
                            {plan.perks?.length > 3 && (
                              <p className="text-[10px] text-slate-400 mt-1 ml-5">+{plan.perks.length - 3} more perks</p>
                            )}
                          </div>
                          <div className="px-5 pb-5">
                            <button
                              onClick={() => { setJoiningPlan(plan); setSelectedBillingCycle('Yearly'); setShowMembershipJoinModal(true); }}
                              className="w-full py-2.5 rounded-2xl font-bold text-xs text-white transition-all hover:opacity-90 shadow-md flex items-center justify-center gap-2"
                              style={{ background: `linear-gradient(135deg, ${plan.color}cc, ${plan.color})`, boxShadow: `0 4px 15px ${plan.color}30` }}
                            >
                              <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                              Request to Join
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Join Plan Modal ── */}
              {showMembershipJoinModal && joiningPlan && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl border border-[#EDE8DF] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Modal header */}
                    <div className="p-6 pb-4 border-b border-[#EDE8DF]" style={{ background: `linear-gradient(135deg, ${joiningPlan.color}12, ${joiningPlan.color}06)` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white uppercase tracking-wider" style={{ backgroundColor: joiningPlan.color }}>
                          {joiningPlan.tier}
                        </span>
                        <button onClick={() => { setShowMembershipJoinModal(false); setMembershipMsg(null); }} className="text-slate-400 hover:text-slate-600">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                      <h3 className="font-black text-slate-900 text-lg">{joiningPlan.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Choose a billing cycle to submit your request</p>
                    </div>

                    <div className="p-6 space-y-5">
                      {/* Billing Cycle Picker */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Billing Cycle</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Monthly', value: 'Monthly', price: joiningPlan.pricePerMonth || joiningPlan.price_per_month || 0, sub: '/mo' },
                            { label: 'Quarterly', value: 'Quarterly', price: joiningPlan.pricePerQuarter || joiningPlan.price_per_quarter || 0, sub: '/3mo' },
                            { label: '6 Months', value: '6 Months', price: joiningPlan.pricePerHalfYear || joiningPlan.price_per_half_year || 0, sub: '/6mo' },
                            { label: 'Yearly', value: 'Yearly', price: joiningPlan.pricePerYear || joiningPlan.price_per_year || 0, sub: '/yr' },
                          ].map(opt => {
                            const isSelected = selectedBillingCycle === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setSelectedBillingCycle(opt.value as any)}
                                className={`p-3 rounded-2xl border-2 text-left transition-all ${isSelected ? 'shadow-md scale-[1.02]' : 'border-slate-100 hover:border-slate-200'}`}
                                style={{ borderColor: isSelected ? joiningPlan.color : undefined, backgroundColor: isSelected ? `${joiningPlan.color}08` : undefined }}
                              >
                                <span className="text-[9px] font-bold text-slate-400 block">{opt.label}</span>
                                <span className="text-sm font-black text-slate-900">₹{opt.price.toLocaleString()}</span>
                                <span className="text-[9px] text-slate-400">{opt.sub}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between font-semibold text-slate-500">
                          <span>Plan</span><span className="text-slate-900 font-bold">{joiningPlan.name}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-500">
                          <span>Billing</span><span className="text-slate-900 font-bold">{selectedBillingCycle}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-500">
                          <span>Global Discount</span>
                          <span className="font-black" style={{ color: joiningPlan.color }}>
                            {joiningPlan.discountType === 'Flat_Amount' ? `₹${joiningPlan.discountFlat} Flat Off` : `${joiningPlan.discountPercent}% Off`}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between">
                          <span className="text-slate-400 text-[10px]">Status after submit</span>
                          <span className="text-amber-600 font-black text-[10px]">Pending Admin Review</span>
                        </div>
                      </div>

                      {membershipMsg && (
                        <div className={`text-xs font-bold p-3 rounded-xl ${membershipMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {membershipMsg.text}
                        </div>
                      )}

                      <button
                        onClick={() => handleRequestMembership(joiningPlan, selectedBillingCycle)}
                        disabled={membershipRequestLoading}
                        className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${joiningPlan.color}cc, ${joiningPlan.color})`, boxShadow: `0 4px 20px ${joiningPlan.color}35` }}
                      >
                        {membershipRequestLoading ? (
                          <><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-opacity-80" />Submitting...</>
                        ) : (
                          <><span className="material-symbols-outlined text-[18px]">workspace_premium</span>Submit Request</>
                        )}
                      </button>
                      <p className="text-center text-[10px] text-slate-400">Our team will contact you to confirm payment and activate your plan.</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>


        {/* ── MIDDLE COLUMN: Stats, Payment Ring, Travel Preferences, Recommendations ── */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Mini Stats row */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Loyalty points card */}
            <div className="bg-[#E8F5E9] text-[#2E7D32] rounded-3xl p-5 border border-[#C2E7C4] shadow-sm flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-black tracking-wider text-[#388E3C]">Rewards Tier</span>
                <span className="material-symbols-outlined text-[18px]">military_tech</span>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-[#388E3C] mt-2">Loyalty points</h4>
                <p className="text-xl font-bold font-display leading-tight">{loyaltyPoints.toLocaleString()}</p>
                <span className="text-[9px] font-black underline cursor-pointer mt-1 block hover:opacity-85" onClick={() => { navigator.clipboard.writeText(referralCode); showToast('info', 'Referral code copied!'); }}>
                  Referral: {referralCode || 'SHRAV24X'}
                </span>
              </div>
            </div>

            {/* Travel stats card */}
            <div className="bg-[#FFF8E1] text-[#B78103] rounded-3xl p-5 border border-[#FFE082] shadow-sm flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-black tracking-wider text-[#D84315]">Travel Stats</span>
                <span className="material-symbols-outlined text-[18px]">flight</span>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-[#D84315] mt-2">Total Invested</h4>
                <p className="text-xl font-bold font-display leading-tight">{formatPriceCompact(totalSpent)}</p>
                <span className="text-[9px] font-bold block mt-1 uppercase tracking-wider text-[#D84315] opacity-80">
                  {completedTripsCount} Trip{completedTripsCount !== 1 ? 's' : ''} completed
                </span>
              </div>
            </div>
          </div>

          {/* Doughnut Payment Progress Card */}
          {activeBooking ? (
            <div className="bg-white rounded-3xl p-6 border border-[#EDE8DF] shadow-sm space-y-5">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Payment Progress</h3>
              
              <div className="flex items-center gap-6 justify-center py-2">
                {/* SVG Circular Doughnut */}
                <div className="relative size-24 shrink-0 flex items-center justify-center">
                  <svg className="size-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" r="16" cx="18" cy="18" />
                    <circle 
                      className="text-[#C9732A]" 
                      strokeWidth="3.5" 
                      strokeDasharray="100"
                      strokeDashoffset={100 - paymentPercent}
                      strokeLinecap="round" 
                      stroke="currentColor" 
                      fill="none" 
                      r="16" 
                      cx="18" 
                      cy="18" 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-slate-800 leading-none">{paymentPercent}%</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Paid</span>
                  </div>
                </div>

                {/* Legend keys */}
                <div className="space-y-1.5 text-[11px] font-semibold flex-grow">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-slate-300 inline-block" /> Total Price</span>
                    <span className="font-bold text-slate-800">{formatPriceCompact(activeBooking.total_price)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500 inline-block" /> Paid Amount</span>
                    <span className="font-bold">{formatPriceCompact(netPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400 inline-block" /> Pending Balance</span>
                    <span className="font-bold">{formatPriceCompact(balanceDue)}</span>
                  </div>
                </div>
              </div>

              {balanceDue > 0 && activeBooking.status !== 'cancelled' && (
                <button 
                  onClick={() => setShowPayModal(true)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md active:scale-98 transition-transform" 
                  style={{ background: 'linear-gradient(135deg, #C9732A, #E8935B)' }}
                >
                  Settle Pending Balance
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 text-center border border-[#EDE8DF]">
              <span className="material-symbols-outlined text-[32px] text-slate-300 block mb-1">payments</span>
              <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                No active booking financial summaries.
              </p>
            </div>
          )}

          {/* Travel DNA Widget */}
          <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">My Travel DNA</h3>
              <button onClick={() => setShowProfileModal(true)} className="text-[10px] font-black text-[#C9732A] uppercase hover:underline">Edit</button>
            </div>
            
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
              <span className="px-2.5 py-1 bg-[#FDFCF7] border rounded-lg flex items-center gap-1 text-slate-700">
                <span className="material-symbols-outlined text-[12px] text-[#2D6A4F]">hotel</span>
                Style: {preferences.hotelType || 'Boutique'}
              </span>
              <span className="px-2.5 py-1 bg-[#FDFCF7] border rounded-lg flex items-center gap-1 text-slate-700">
                <span className="material-symbols-outlined text-[12px] text-[#2D6A4F]">flight_class</span>
                Flight: {preferences.budget || 'Standard'}
              </span>
              <span className="px-2.5 py-1 bg-[#FDFCF7] border rounded-lg flex items-center gap-1 text-slate-700">
                <span className="material-symbols-outlined text-[12px] text-[#2D6A4F]">restaurant</span>
                Diet: {preferences.dietary || 'None'}
              </span>
            </div>
          </div>

          {/* Referral Center Invitation Card */}
          <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3.5">
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Refer & Earn Points</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Invite a friend. You get 500 bonus points upon their first trip completion!</p>
            </div>
            {referralMsg && <p className="text-[10px] font-bold text-[#C9732A]">{referralMsg}</p>}
            <form onSubmit={handleSendReferral} className="flex gap-2">
              <input 
                type="email" required placeholder="Enter friend's email"
                value={referralEmail}
                onChange={e => setReferralEmail(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              />
              <button type="submit" className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>

          {/* Recommended Activity Suggestions */}
          <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Matching Destinations</h3>
            <div className="space-y-3">
              {packages?.slice(0, 2).map(pkg => (
                <Link to={`/packages/${pkg.id}`} key={pkg.id} className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-colors group">
                  <img src={pkg.image} alt={pkg.title} className="size-11 rounded-lg object-cover" />
                  <div className="min-w-0 flex-grow">
                    <h4 className="font-bold text-slate-800 text-xs truncate group-hover:text-primary transition-colors" style={{ color: '#C9732A' }}>{pkg.title}</h4>
                    <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Recommended match &bull; {pkg.days} Days</span>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover:translate-x-0.5 transition-all">arrow_forward</span>
                </Link>
              ))}
            </div>
          </div>

        </section>

        {/* ── RIGHT COLUMN: Calendar day highlights, rating reflections, Inbox alert lists ── */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Calendar slider timeline (Switzerland or active itinerary highlights) */}
          <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Itinerary Day Calendar</h3>
              {activeBooking && <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black">Active Trip Days</span>}
            </div>

            {itineraryHighlights.length === 0 ? (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-[28px] text-slate-300 block mb-1">calendar_today</span>
                <p className="text-[10px] text-slate-400 font-semibold">Itinerary details will appear here after booking confirmation.</p>
              </div>
            ) : (
              <>
                {/* Horizontal Day Selector Slider */}
                <div className="flex justify-between gap-1 overflow-x-auto select-none py-1 border-b border-slate-50">
                  {itineraryHighlights.map(h => (
                    <button
                      key={h.day}
                      onClick={() => setSelectedItineraryDay(h.day)}
                      className={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        selectedItineraryDay === h.day
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-[#FDFCF7] border border-slate-150 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      D{h.day}
                    </button>
                  ))}
                </div>

                {/* Selected day content */}
                {selectedDayInfo && (
                  <div className="p-3 bg-[#FDFCF7] border border-slate-100 rounded-xl space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">{selectedDayInfo.title}</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                      {selectedDayInfo.desc}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Interactive Travel Reflection star/mood rating selector */}
          {activeBooking ? (
            <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Trip Reflection Dial</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Rate your active booking experience.</p>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-3.5">
                {/* Circular star rate buttons */}
                <div className="flex justify-between items-center px-1">
                  {[1, 2, 3, 4, 5].map(star => {
                    const isLit = star <= ratingFeedback;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingFeedback(star)}
                        className={`size-8 rounded-full flex items-center justify-center border transition-all text-sm ${
                          isLit 
                            ? 'bg-amber-50 text-amber-500 border-amber-300 shadow-sm scale-105' 
                            : 'bg-[#FDFCF7] border-slate-200 text-slate-300 hover:text-amber-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px] fill-current">star</span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-center">
                  <span className="text-[10px] font-black text-slate-700 uppercase bg-[#FFF8E1] px-2 py-0.5 rounded">
                    {ratingFeedback === 5 ? "🤩 Exceeded Expectations" : ratingFeedback === 4 ? "😍 Great Experience" : ratingFeedback === 3 ? "🙂 Satisfactory" : ratingFeedback === 2 ? "😐 Needs Improvement" : "☹️ Unacceptable"}
                  </span>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Short trip feedback or reflection..."
                    value={commentFeedback}
                    onChange={e => setCommentFeedback(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={reviewLoading}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-slate-800 transition-colors"
                >
                  {reviewLoading ? 'Saving...' : 'Save Feedback'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] text-center">
              <span className="material-symbols-outlined text-[32px] text-slate-300 block mb-1">rate_review</span>
              <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                No active bookings to submit reviews for.
              </p>
            </div>
          )}

          {/* Concierge support drawer/box inside portal */}
          <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Direct Travel Support</h3>
              <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>

            <div className="flex items-center gap-3">
              <div className="size-9 bg-[#FFF8F2] border border-[#C9732A]/20 rounded-full flex items-center justify-center font-bold text-[#C9732A] text-xs">
                ST
              </div>
              <div>
                <h4 className="font-bold text-slate-850 text-xs">Shravya Tours Support</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Online &bull; Operations Desk</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowSupportModal(true)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase text-center transition-colors"
              >
                Start Direct Chat
              </button>
              
              {activeBooking && activeBooking.whatsapp_group_url && (
                <a 
                  href={activeBooking.whatsapp_group_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center size-8 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl"
                  title="Join Group WhatsApp Chat"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </a>
              )}
            </div>
          </div>

          {/* Inbox notifications lists */}
          <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm space-y-3">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Recent Alerts</h3>
            <div className="space-y-2.5 max-h-44 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <>
                  <div className="text-[10px] text-slate-500 font-semibold space-y-0.5 py-1">
                    <p className="font-bold text-slate-800">Booking Confirmation</p>
                    <p className="text-slate-400">Your registration has been logged by the backend portal desk.</p>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold space-y-0.5 py-1 pt-2">
                    <p className="font-bold text-slate-800">Welcome To Shravya Tours</p>
                    <p className="text-slate-400">Refer friends or build visual itineraries in the Discovery tab.</p>
                  </div>
                </>
              ) : (
                notifications.slice(0, 3).map(n => (
                  <div key={n.id} className="text-[10px] text-slate-500 font-semibold space-y-0.5 py-2 first:pt-0">
                    <p className="font-bold text-slate-800 truncate">{n.title}</p>
                    <p className="text-slate-400 truncate">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </main>

      {/* ── MODAL: PROFILE SETTINGS (ACCOUNT HUB) ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FBF7F0] rounded-[2rem] border border-[#EDE8DF] p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="font-display font-black text-2xl text-slate-900 mb-1">Account settings & Hub</h2>
            <p className="text-xs text-slate-400 mb-6 border-b pb-4">Modify your details, edit travel DNA, or change passwords.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile details editing form */}
              <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] space-y-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Personal Details</h3>
                {profileMsg && (
                  <div className={`p-2.5 rounded-xl text-[10px] font-bold ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {profileMsg.text}
                  </div>
                )}
                <form onSubmit={handleProfileSubmit} className="space-y-3 text-xs font-semibold">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase block mb-1">Full Name</label>
                    <input 
                      type="text" required
                      value={profileForm.name}
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase block mb-1">Email (Read Only)</label>
                    <input 
                      type="email" disabled
                      value={customer?.email || ''}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 text-slate-400 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Phone</label>
                      <input 
                        type="text"
                        value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">WhatsApp</label>
                      <input 
                        type="text"
                        value={profileForm.whatsapp}
                        onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase block mb-1">Date of Birth</label>
                    <input 
                      type="date"
                      value={profileForm.dob}
                      onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#C9732A] hover:bg-[#b05f20] text-white rounded-xl font-bold transition-colors shadow-sm">
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Preferences & Password form */}
              <div className="space-y-6">
                
                {/* Change Password */}
                <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] space-y-4">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Change Password</h3>
                  {passwordMsg && (
                    <div className={`p-2 rounded-xl text-[10px] font-bold ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {passwordMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleChangePassword} className="space-y-3 text-xs font-semibold">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Current Password</label>
                      <input 
                        type="password" required placeholder="Enter old password"
                        value={passwordForm.oldPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">New Password</label>
                      <input 
                        type="password" required placeholder="Enter new password"
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors">
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Edit Preferences */}
                <div className="bg-white rounded-3xl p-5 border border-[#EDE8DF] space-y-3.5">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-2">Travel Preferences</h3>
                  {preferencesMsg && <p className="text-[10px] font-bold text-[#C9732A]">{preferencesMsg}</p>}
                  <form onSubmit={handlePreferencesSubmit} className="space-y-3 text-xs font-semibold">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Accommodation Preference</label>
                      <select 
                        value={preferences.hotelType}
                        onChange={e => setPreferences({ ...preferences, hotelType: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option>3 Star Standard</option>
                        <option>4 Star Premium</option>
                        <option>5 Star Luxury Resorts</option>
                        <option>Boutique Hotels</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase block mb-1">Dietary Requirement</label>
                      <select 
                        value={preferences.dietary}
                        onChange={e => setPreferences({ ...preferences, dietary: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="None">None (All Foods)</option>
                        <option value="Vegetarian Only">Vegetarian Only</option>
                        <option value="Jain Food Only">Jain Food Only</option>
                        <option value="Halal Certified Only">Halal Certified Only</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#2D6A4F] hover:bg-[#204a37] text-white rounded-xl font-bold transition-colors">
                      Save Preferences
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONCIERGE LIVE CHAT ── */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-[#EDE8DF] overflow-hidden w-full max-w-md shadow-2xl relative flex flex-col h-[500px]">
            <div className="p-4 border-b border-[#EDE8DF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-9 bg-[#FFF8F2] border rounded-full flex items-center justify-center font-bold text-primary text-xs">
                  ST
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Shravya Tours</h4>
                  <span className="text-[9px] text-slate-400 font-bold block">Support Concierge</span>
                </div>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-slate-650">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Direct messages content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/15">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-[10px] max-w-xs mx-auto leading-normal">
                  <span className="material-symbols-outlined text-[28px] mb-1">chat</span>
                  Hi! Send a message to connect with our operations team. We typically respond within 15 minutes.
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.sender_type === 'customer';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-semibold ${
                        isMe ? 'bg-primary text-white' : 'bg-[#FDFCF7] border text-slate-700'
                      }`}
                      style={{
                        backgroundColor: isMe ? '#C9732A' : undefined,
                        borderColor: isMe ? undefined : '#EDE8DF'
                      }}>
                        <p className="leading-relaxed">{msg.message}</p>
                        <span className={`text-[8px] block mt-1 text-right ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Send Message Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#EDE8DF] bg-white flex gap-2">
              <input 
                type="text" required placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-grow bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none"
              />
              <button type="submit" className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DOCUMENT UPLOAD ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowUploadModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-650">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-display font-bold text-base text-slate-900 mb-1">Upload Travel Document</h3>
            <p className="text-xs text-slate-400 mb-4">Select your document type and upload a PDF or image file securely.</p>
            {docUploadError && (
              <div className="p-2 bg-red-50 text-red-500 text-[10px] font-bold mb-3 rounded-lg">{docUploadError}</div>
            )}
            <form onSubmit={handleDocUpload} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Document Category</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none">
                  <option>Passport</option>
                  <option>Visa Copy</option>
                  <option>National ID / Aadhaar</option>
                  <option>PAN Card</option>
                  <option>Travel Insurance Policy</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Select File</label>
                <input
                  type="file" required
                  onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <button type="submit" disabled={docUploading} className="w-full py-2.5 bg-[#C9732A] hover:bg-[#b05f20] text-white rounded-xl font-bold text-xs shadow-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {docUploading ? (
                  <><span className="animate-spin rounded-full h-3 w-3 border-t-2 border-white border-opacity-80" />Uploading...</>
                ) : 'Upload to Secure Vault'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PAY PENDING BALANCE Receipt upload ── */}
      {showPayModal && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-650">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-display font-bold text-base text-slate-900 mb-1">Log Payment Receipt</h3>
            <p className="text-xs text-slate-400 mb-4">Please submit your transaction UTR details and receipt image/pdf for staff confirmation.</p>
            {payError && (
              <div className="p-2 bg-red-50 text-red-500 text-[10px] font-bold mb-3 rounded-lg">{payError}</div>
            )}
            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Payment Amount (₹)</label>
                <input
                  type="number" required placeholder="e.g. 22250"
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold uppercase mb-1">UTR / Transaction Reference</label>
                <input
                  type="text" required placeholder="Enter reference UTR number"
                  value={payForm.reference}
                  onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Payment Method</label>
                <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none">
                  <option>UPI / GPay / PhonePe</option>
                  <option>Net Banking / IMPS</option>
                  <option>Credit / Debit Card</option>
                  <option>Bank Deposit</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Upload Receipt File</label>
                <input
                  type="file"
                  onChange={e => setPayFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <button type="submit" disabled={payLoading} className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-sm mt-1" style={{ backgroundColor: '#C9732A' }}>
                {payLoading ? 'Logging Receipt...' : 'Submit Receipt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ANNIVERSARY/BIRTHDAY PROMO BANNER ── */}
      {anniversaryPromo && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[90] bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3">
            <div className="size-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-600 text-[22px]">celebration</span>
            </div>
            <div className="flex-grow min-w-0">
              <h4 className="font-bold text-slate-900 text-sm">{anniversaryPromo.title}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{anniversaryPromo.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">{anniversaryPromo.code}</span>
                <button onClick={() => { navigator.clipboard.writeText(anniversaryPromo.code); showToast('info', 'Promo code copied!'); }} className="text-[10px] font-bold text-amber-600 underline hover:text-amber-800">Copy Code</button>
              </div>
            </div>
            <button onClick={() => setAnniversaryPromo(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Toast & Confirmation Overlays ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={closeConfirm} />

    </div>
  );
};
