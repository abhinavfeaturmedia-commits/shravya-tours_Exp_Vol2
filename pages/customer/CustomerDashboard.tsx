import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth, CUSTOMER_JWT_KEY } from '../../context/CustomerAuthContext';
import { useData } from '../../context/DataContext';
import { getLocationName, formatPrice, formatPriceCompact, formatTripDuration } from '../../utils/packageUtils';
import { generatePackingChecklist, OPENROUTER_FREE_MODELS } from '../../src/lib/gemini';
import { InteractiveIndiaExplorer } from '../../components/customer/InteractiveIndiaExplorer';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Destination Geographic Coordinates and Currency Rates Dictionary ──
const DESTINATION_MAP: Record<string, { lat: number; lng: number; x: number; y: number; currency: string; rate: number; symbol: string }> = {
  'Dubai': { lat: 25.2048, lng: 55.2708, x: 58, y: 48, currency: 'AED', rate: 22.7, symbol: 'د.إ' },
  'Paris': { lat: 48.8566, lng: 2.3522, x: 44, y: 34, currency: 'EUR', rate: 91.0, symbol: '€' },
  'Bali': { lat: -8.4095, lng: 115.1889, x: 74, y: 72, currency: 'IDR', rate: 0.0054, symbol: 'Rp' },
  'Singapore': { lat: 1.3521, lng: 103.8198, x: 70, y: 64, currency: 'SGD', rate: 62.0, symbol: '$' },
  'Goa': { lat: 15.2993, lng: 74.1240, x: 62, y: 58, currency: 'INR', rate: 1.0, symbol: '₹' },
  'Kerala': { lat: 10.8505, lng: 76.2711, x: 63, y: 62, currency: 'INR', rate: 1.0, symbol: '₹' },
  'Kashmir': { lat: 34.0837, lng: 74.7973, x: 62, y: 45, currency: 'INR', rate: 1.0, symbol: '₹' },
  'Thailand': { lat: 15.8700, lng: 100.9925, x: 68, y: 60, currency: 'THB', rate: 2.45, symbol: '฿' }
};

const resolveDestination = (name: string) => {
  if (!name) return DESTINATION_MAP['Goa'];
  const key = Object.keys(DESTINATION_MAP).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? DESTINATION_MAP[key] : { lat: 20, lng: 77, x: 50, y: 50, currency: 'USD', rate: 83.5, symbol: '$' };
};

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
    <div className="fixed top-20 right-6 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-right duration-300"
          style={{ background: bgMap[t.type], borderColor: `${colorMap[t.type]}25`, color: colorMap[t.type] }}>
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">{title}</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-[#EDE8DF] text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors">Confirm</button>
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
  image?: string;
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

export const CustomerDashboard: React.FC = () => {
  const { customer, logout, refreshCustomer } = useCustomerAuth();
  const { packages } = useData();
  const navigate = useNavigate();

  // Primary Tab Control: 'bookings' | 'documents' | 'wishlist' | 'travelers' | 'membership'
  const [activeSubTab, setActiveSubTab] = useState<'bookings' | 'documents' | 'wishlist' | 'travelers' | 'membership'>('bookings');
  
  // Secondary drawer & modal states
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showEmergencySOS, setShowEmergencySOS] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

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

  // Membership State
  const [myMembership, setMyMembership] = useState<any>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [publicPlans, setPublicPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  // AI Packing Checklist
  const [packingChecklist, setPackingChecklist] = useState<any>(null);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [packingWeather, setPackingWeather] = useState('Mild/Mixed');
  const [packingActivity, setPackingActivity] = useState('Moderate');
  const [packingCategory, setPackingCategory] = useState('Leisure');
  const [selectedAiModel, setSelectedAiModel] = useState<string>('openrouter/free');

  // Currency Converter State
  const [inrAmount, setInrAmount] = useState('10000');
  const [targetCurrency, setTargetCurrency] = useState('AED');

  // Active Booking & Financial Summary State
  const [activeBookingTransactions, setActiveBookingTransactions] = useState<Transaction[]>([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false });
  const [selectedItineraryDay, setSelectedItineraryDay] = useState<number>(1);
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('All');

  // Form States
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', whatsapp: '', address: '', dob: '' });
  const [preferences, setPreferences] = useState({ destinations: '', dietary: 'None', budget: 'Standard', hotelType: '3 Star Standard' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
  const [coTravelerForm, setCoTravelerForm] = useState({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
  const [editingCoTravelerId, setEditingCoTravelerId] = useState<number | null>(null);
  const [docType, setDocType] = useState('Passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [referralEmail, setReferralEmail] = useState('');
  const [quoteForm, setQuoteForm] = useState({ destination: '', date: '', travelers: '2 Adults', budget: 'Standard' });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'UPI / GPay / PhonePe', reference: '', notes: '' });
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState<number>(5);
  const [commentFeedback, setCommentFeedback] = useState<string>('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/customer/login', { replace: true });
  };

  // ── Determine active booking ──
  const activeBooking = useMemo(() => {
    if (bookings.length === 0) return null;
    return bookings.find(b => b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'pending') || bookings[0] || null;
  }, [bookings]);

  // Net paid & Balance due
  const netPaid = useMemo(() => {
    return activeBookingTransactions
      .filter(t => t.status?.toLowerCase() === 'verified')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [activeBookingTransactions]);

  const balanceDue = useMemo(() => {
    if (!activeBooking) return 0;
    return Math.max(0, Number(activeBooking.total_price || 0) - netPaid);
  }, [activeBooking, netPaid]);

  // Total spent calculation
  const totalSpent = useMemo(() => {
    return bookings
      .filter(b => b.status?.toLowerCase() === 'completed' || b.status?.toLowerCase() === 'confirmed')
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  }, [bookings]);

  const completedTripsCount = useMemo(() => {
    return bookings.filter(b => b.status?.toLowerCase() === 'completed').length;
  }, [bookings]);

  // VIP Tier Information
  const vipTierInfo = useMemo(() => {
    const total = totalSpent || loyaltyPoints * 10;
    if (total >= 100000) {
      return { tier: 'Diamond VIP', badgeColor: '#D97706', gradient: 'from-amber-400 via-yellow-300 to-amber-600', nextTier: 'Max Tier', progress: 100 };
    } else if (total >= 50000) {
      return { tier: 'Platinum VIP', badgeColor: '#475569', gradient: 'from-slate-400 via-slate-200 to-slate-600', nextTier: 'Diamond VIP', progress: Math.round((total / 100000) * 100) };
    } else if (total >= 20000) {
      return { tier: 'Gold VIP', badgeColor: '#CA8A04', gradient: 'from-yellow-400 via-amber-300 to-yellow-600', nextTier: 'Platinum VIP', progress: Math.round((total / 50000) * 100) };
    } else if (total >= 5000) {
      return { tier: 'Silver VIP', badgeColor: '#64748B', gradient: 'from-gray-300 via-slate-200 to-gray-400', nextTier: 'Gold VIP', progress: Math.round((total / 20000) * 100) };
    }
    return { tier: 'Bronze Member', badgeColor: '#92400E', gradient: 'from-amber-700 via-amber-600 to-amber-900', nextTier: 'Silver VIP', progress: Math.round((total / 5000) * 100) };
  }, [totalSpent, loyaltyPoints]);

  // ── 1. Fetch Bookings ──
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

  // Fetch Packing Checklist from DB
  const fetchPackingChecklist = useCallback(async () => {
    if (!activeBooking) return;
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${activeBooking.id}/packing-checklist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPackingChecklist(data.items);
      }
    } catch (err) {
      console.warn('Failed to fetch packing checklist:', err);
    }
  }, [activeBooking]);

  // Save Packing Checklist to DB
  const handleSavePackingChecklist = async (itemsList: any) => {
    if (!activeBooking) return;
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${activeBooking.id}/packing-checklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: itemsList })
      });
      if (res.ok) {
        showToast('success', 'Packing checklist updated!');
        setPackingChecklist(itemsList);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to save packing checklist.');
    }
  };

  // Generate Packing Checklist using AI
  const handleGenerateChecklistAI = async () => {
    if (!activeBooking) return;
    setIsGeneratingChecklist(true);
    try {
      const dest = activeBooking.package_name || activeBooking.destination || 'Destination';
      const days = (activeBooking as any).durationDays || (activeBooking as any).pax_count || 5;

      const generated = await generatePackingChecklist(
        dest,
        days,
        packingWeather,
        packingActivity,
        packingCategory,
        selectedAiModel
      );

      if (generated && generated.items && Array.isArray(generated.items)) {
        await handleSavePackingChecklist(generated.items);
      } else if (generated && Array.isArray(generated)) {
        await handleSavePackingChecklist(generated);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to generate checklist.');
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  // Countdown Timer Hook
  useEffect(() => {
    if (!activeBooking || !activeBooking.travel_date) {
      setCountdown(prev => ({ ...prev, active: false }));
      return;
    }
    const updateTimer = () => {
      const targetTime = new Date(activeBooking.travel_date).getTime();
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setCountdown({ days, hours, minutes, seconds, active: true });
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBooking]);

  // Global Keyboard Listener for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Fetch Wishlist ──
  const fetchWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/wishlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(Array.isArray(data) ? data : []);
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
      const res = await fetch(`${API_BASE}/api/customer/wishlist/${pkgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setWishlist(prev => prev.filter(w => w.id !== pkgId));
        showToast('info', 'Removed from Wishlist');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Derive wishlist packages details
  const wishlistPackages = useMemo(() => {
    if (!packages || packages.length === 0) return [];
    return wishlist.map(w => {
      const matched = packages.find(p => p.id === w.id);
      return matched || w;
    });
  }, [wishlist, packages]);

  // ── Fetch Co-Travelers ──
  const fetchCoTravelers = async () => {
    setLoadingCoTravelers(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/co-travelers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCoTravelers(Array.isArray(data) ? data : []);
      }
    } catch {
      setCoTravelers([]);
    } finally {
      setLoadingCoTravelers(false);
    }
  };

  const handleAddCoTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coTravelerForm.name.trim()) return;
    setCoTravelerLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const isEditing = editingCoTravelerId !== null;
      const url = isEditing ? `${API_BASE}/api/customer/co-travelers/${editingCoTravelerId}` : `${API_BASE}/api/customer/co-travelers`;
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(coTravelerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save co-traveler');
      showToast('success', isEditing ? 'Co-traveler updated!' : 'Co-traveler added!');
      setCoTravelerForm({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
      setEditingCoTravelerId(null);
      fetchCoTravelers();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setCoTravelerLoading(false);
    }
  };

  const handleDeleteCoTraveler = (cid: number) => {
    showConfirm('Delete Co-Traveler', 'Are you sure you want to delete this co-traveler?', async () => {
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        const res = await fetch(`${API_BASE}/api/customer/co-travelers/${cid}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('info', 'Co-traveler deleted');
          fetchCoTravelers();
        }
      } catch (err: any) {
        showToast('error', err.message);
      }
      closeConfirm();
    });
  };

  // ── Fetch Documents ──
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setDocUploading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const formData = new FormData();
      formData.append('document', docFile);
      formData.append('doc_type', docType);

      const res = await fetch(`${API_BASE}/api/customer/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      showToast('success', 'Document vaulted securely!');
      setDocFile(null);
      setShowUploadModal(false);
      fetchDocuments();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = (docId: string) => {
    showConfirm('Delete Document', 'Are you sure you want to delete this document from your vault?', async () => {
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        const res = await fetch(`${API_BASE}/api/customer/documents/${docId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('info', 'Document removed');
          fetchDocuments();
        }
      } catch (err: any) {
        showToast('error', err.message);
      }
      closeConfirm();
    });
  };

  // ── Fetch Loyalty & Referrals ──
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
        setReferralCode(data.referral_code || '');
        setLoyaltyLogs(data.logs || []);
        setReferralRecords(data.referrals || []);
      }
    } catch {
      setLoyaltyPoints(0);
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const handleSendReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralEmail.trim()) return;
    setReferralLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/referral/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: referralEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      showToast('success', 'Invitation email sent successfully!');
      setReferralEmail('');
      fetchLoyalty();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setReferralLoading(false);
    }
  };

  // ── Fetch Chat ──
  const fetchChat = useCallback(async () => {
    setLoadingChat(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(Array.isArray(data) ? data : []);
      }
    } catch {
      setChatMessages([]);
    } finally {
      setLoadingChat(false);
    }
  }, []);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: msg })
      });
      if (res.ok) {
        fetchChat();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // ── Fetch Notifications ──
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      setNotifications([]);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      await fetch(`${API_BASE}/api/customer/notifications/mark-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn(err);
    }
  };

  // ── Membership API ──
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
    } catch {
      setMyMembership(null);
    } finally {
      setLoadingMembership(false);
    }
  };

  const fetchPublicPlans = async () => {
    if (publicPlans.length > 0) return;
    setLoadingPlans(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/membership-plans`);
      if (res.ok) setPublicPlans(await res.json());
    } catch {
      setPublicPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePayAndJoinMembership = async (plan: any, cycle: string) => {
    const token = localStorage.getItem(CUSTOMER_JWT_KEY);
    if (!token) return;
    setRazorpayLoading(true);
    try {
      const orderRes = await fetch(`${API_BASE}/api/customer/membership/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, billingCycle: cycle })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create payment order');

      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Shrawello Travel Hub',
        description: `${plan.name} - ${cycle} Membership`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${API_BASE}/api/customer/membership/razorpay/verify-payment`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                billingCycle: cycle,
                amount: orderData.amount
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Signature verification failed.');
            showToast('success', 'Welcome to Shrawello VIP Membership!');
            await fetchMyMembership();
          } catch (err: any) {
            showToast('error', err.message);
          } finally {
            setRazorpayLoading(false);
          }
        },
        prefill: {
          name: customer?.name || '',
          email: customer?.email || '',
          contact: customer?.phone || ''
        },
        theme: { color: '#C9732A' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast('error', err.message);
      setRazorpayLoading(false);
    }
  };

  // ── Profile and Preferences ──
  useEffect(() => {
    if (customer) {
      setProfileForm({
        name: customer.name || '',
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        address: customer.address || '',
        dob: customer.dob || ''
      });
      if (customer.travel_preferences) {
        try {
          const parsed = typeof customer.travel_preferences === 'string'
            ? JSON.parse(customer.travel_preferences)
            : customer.travel_preferences;
          setPreferences(parsed);
        } catch {}
      }
    }
  }, [customer]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      refreshCustomer();
      showToast('success', 'Profile details updated!');
      setShowProfileModal(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword) return;
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/change-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');
      showToast('success', 'Password updated successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '' });
      setShowProfileModal(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Quick Quote
  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.destination.trim()) return;
    setQuoteLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/enquiries`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customer?.name || 'Customer User',
          email: customer?.email,
          phone: customer?.phone,
          destination: quoteForm.destination.trim(),
          travel_date: quoteForm.date,
          pax: quoteForm.travelers,
          budget: quoteForm.budget,
          message: `Portal request: ${quoteForm.travelers}, ${quoteForm.budget}`
        })
      });
      if (!res.ok) throw new Error('Failed to submit quote request');
      showToast('success', 'Trip request sent! Concierge will connect with you.');
      setQuoteForm({ destination: '', date: '', travelers: '2 Adults', budget: 'Standard' });
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setQuoteLoading(false);
    }
  };

  // Balance Payment Upload
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking || !payForm.amount || !payForm.reference) {
      showToast('error', 'Please enter amount and reference.');
      return;
    }
    setPayLoading(true);
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
      if (!res.ok) throw new Error('Failed to log payment.');
      showToast('success', 'Payment proof submitted for verification!');
      setShowPayModal(false);
      setPayForm({ amount: '', method: 'UPI / GPay / PhonePe', reference: '', notes: '' });
      setPayFile(null);
      fetchTransactions();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Review submission
  const handleReviewSubmit = async (bookingId: string) => {
    setReviewLoading(true);
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${API_BASE}/api/customer/bookings/${bookingId}/review`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingFeedback, comment: commentFeedback })
      });
      if (!res.ok) throw new Error('Failed to submit review');
      showToast('success', 'Thank you for your feedback!');
      setCommentFeedback('');
      fetchBookings();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // Initial data loading on mount
  useEffect(() => {
    fetchBookings();
    fetchNotifications();
    fetchLoyalty();
    fetchMyMembership();
  }, [fetchBookings]);

  // Tab change effect
  useEffect(() => {
    if (activeSubTab === 'wishlist') fetchWishlist();
    if (activeSubTab === 'travelers') fetchCoTravelers();
    if (activeSubTab === 'documents') fetchDocuments();
    if (activeSubTab === 'membership') { fetchMyMembership(); fetchPublicPlans(); }
  }, [activeSubTab]);

  useEffect(() => {
    if (activeBooking) {
      fetchTransactions();
      fetchPackingChecklist();
    }
  }, [activeBooking, fetchTransactions, fetchPackingChecklist]);

  // Unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const initials = customer?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TR';

  // Greeting based on time of day
  const greetingWord = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (docCategoryFilter === 'All') return documents;
    return documents.filter(d => d.doc_type?.toLowerCase() === docCategoryFilter.toLowerCase());
  }, [documents, docCategoryFilter]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans flex flex-col pb-20 md:pb-12">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {/* ── 1. LUXURY FLOATING HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#EDE8DF] h-20 px-4 sm:px-8 flex items-center justify-between shadow-xs">
        {/* Brand Logo & VIP status */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-[#2D6A4F] group-hover:text-[#1e4835] transition-colors">
              Shrawello
            </span>
            <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#C9732A]/10 text-[#C9732A] hidden sm:inline-block">
              Travel Hub
            </span>
          </Link>
          {myMembership && myMembership.status === 'Active' && (
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900">
              <span className="material-symbols-outlined text-[12px] text-amber-600">workspace_premium</span>
              {myMembership.tier} Member
            </span>
          )}
        </div>

        {/* Desktop Center Navigation Pills */}
        <nav className="hidden md:flex items-center bg-[#F4EFEA] p-1.5 rounded-full border border-[#EDE8DF] shadow-inner">
          {([
            { key: 'bookings', label: 'My Trips', icon: 'flight_takeoff' },
            { key: 'documents', label: 'Vault', icon: 'folder_shared' },
            { key: 'wishlist', label: 'Wishlist', icon: 'favorite' },
            { key: 'travelers', label: 'Co-Travelers', icon: 'group' },
            { key: 'membership', label: 'VIP Perks', icon: 'workspace_premium' },
          ] as const).map(item => {
            const active = activeSubTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSubTab(item.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all duration-200 ${
                  active ? 'bg-white text-slate-900 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]" style={{ color: active ? '#C9732A' : undefined }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Utility Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search trigger */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#F9F7F2] hover:bg-white border border-[#EDE8DF] rounded-xl text-xs text-slate-500 font-medium transition-colors"
            title="Search (⌘K / Ctrl+K)"
          >
            <span className="material-symbols-outlined text-[17px] text-[#C9732A]">search</span>
            <span>Search</span>
            <kbd className="bg-white border border-[#EDE8DF] px-1 rounded text-[10px] text-slate-400">⌘K</kbd>
          </button>

          {/* Concierge Chat Icon */}
          <button
            onClick={() => { setShowSupportModal(true); fetchChat(); }}
            className="relative p-2.5 text-slate-600 hover:text-slate-900 bg-[#F9F7F2] hover:bg-white rounded-xl border border-[#EDE8DF] transition-all flex items-center justify-center"
            title="Travel Concierge Chat"
          >
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                if (!showNotificationDropdown) handleMarkNotificationsRead();
              }}
              className="relative p-2.5 text-slate-600 hover:text-slate-900 bg-[#F9F7F2] hover:bg-white rounded-xl border border-[#EDE8DF] transition-all flex items-center justify-center"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 size-2 bg-orange-600 rounded-full animate-pulse" />
              )}
            </button>

            {showNotificationDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-[#EDE8DF] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-[#EDE8DF] flex justify-between items-center bg-[#FDFBF7]">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Inbox Notifications</h3>
                  {unreadCount > 0 && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">New</span>}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#EDE8DF]">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No alerts received yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-3.5 text-xs hover:bg-slate-50 transition-colors">
                        <h4 className="font-bold text-slate-800">{n.title}</h4>
                        <p className="text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Avatar / Trigger */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-[#EDE8DF] bg-[#F9F7F2] hover:bg-white transition-all"
            title="Account Settings"
          >
            <div className="size-8 rounded-lg bg-gradient-to-tr from-[#2D6A4F] to-[#40916C] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {initials}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline-block max-w-[90px] truncate">
              {customer?.name?.split(' ')[0] || 'Account'}
            </span>
            <span className="material-symbols-outlined text-[16px] text-slate-400 hidden sm:inline-block">settings</span>
          </button>
        </div>
      </header>

      {/* ── 2. HERO CONCIERGE BANNER ── */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="bg-gradient-to-r from-[#2D6A4F]/10 via-[#C9732A]/5 to-[#2D6A4F]/5 rounded-3xl p-6 sm:p-8 border border-[#EDE8DF] relative overflow-hidden shadow-xs">
          {/* Subtle Ambient Watermark */}
          <div className="absolute right-4 -bottom-6 text-slate-900/5 select-none pointer-events-none font-display font-black text-8xl">
            SHRAWELLO
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#C9732A] bg-[#C9732A]/10 px-3 py-0.5 rounded-full inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">stars</span>
                  {vipTierInfo.tier}
                </span>
                {activeBooking && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Trip Scheduled
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 leading-tight">
                {greetingWord}, {customer?.name?.split(' ')[0] || 'Traveler'} ✨
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-xl leading-relaxed">
                {activeBooking
                  ? `Your upcoming journey to ${activeBooking.package_name || activeBooking.destination} is confirmed. Review your itinerary, flight vouchers, and day plans below.`
                  : 'Welcome to your private travel suite. Discover curated journeys, manage your family documents, and reach your concierge anytime.'}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-[#EDE8DF] shadow-xs self-start sm:self-auto shrink-0">
              <div className="px-3.5 py-1.5 text-center border-r border-[#EDE8DF]">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Loyalty</span>
                <span className="text-sm font-black text-slate-800">{loyaltyPoints} Pts</span>
              </div>
              <div className="px-3.5 py-1.5 text-center border-r border-[#EDE8DF]">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Vault</span>
                <span className="text-sm font-black text-slate-800">{documents.length} Docs</span>
              </div>
              <div className="px-3.5 py-1.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Wishlist</span>
                <span className="text-sm font-black text-slate-800">{wishlist.length} Trips</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FULL-WIDTH TAB VIEWS ── */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex-grow">

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: MY TRIPS                                               */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'bookings' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Active Journey Hero Card */}
            {activeBooking ? (
              <div className="bg-white rounded-3xl border border-[#EDE8DF] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Hero Header with destination photo */}
                <div className="h-48 sm:h-64 relative bg-slate-900 overflow-hidden">
                  <img
                    src={activeBooking.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'}
                    alt={activeBooking.package_name || 'Active Trip'}
                    className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                  {/* Top floating tags */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="bg-black/50 backdrop-blur-md text-white border border-white/20 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                      Booking #{activeBooking.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm">
                      {activeBooking.status || 'Confirmed'}
                    </span>
                  </div>

                  {/* Destination & Countdown text overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-3xl font-display font-black text-white drop-shadow-md">
                        {activeBooking.package_name || activeBooking.destination || 'Custom Journey'}
                      </h2>
                      <div className="flex items-center gap-3 text-white/90 text-xs sm:text-sm mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {activeBooking.travel_date ? new Date(activeBooking.travel_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible Dates'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">group</span>
                          {activeBooking.pax_count || 2} Travelers
                        </span>
                      </div>
                    </div>

                    {/* Flight countdown pill */}
                    {countdown.active && (
                      <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-2 text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-400 text-[20px]">flight_takeoff</span>
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-white/70 block">Departure In</span>
                          <span className="text-xs sm:text-sm font-black">
                            {countdown.days}d {countdown.hours}h {countdown.minutes}m
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons & Financial Highlights */}
                <div className="p-6 sm:p-8 bg-white border-t border-[#EDE8DF]">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#EDE8DF]">
                    {/* Financial summary */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Breakdown</span>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-black text-slate-900">{formatPrice(activeBooking.total_price || 0)}</span>
                        {balanceDue > 0 ? (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Balance Due: {formatPrice(balanceDue)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Fully Paid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {balanceDue > 0 && (
                        <button
                          onClick={() => setShowPayModal(true)}
                          className="px-4 py-2.5 bg-[#C9732A] hover:bg-[#A85E1E] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          Pay Balance
                        </button>
                      )}

                      <Link
                        to={`/my-account/booking/${activeBooking.id}`}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        View Details & Vouchers
                      </Link>

                      {activeBooking.whatsapp_group_url ? (
                        <a
                          href={activeBooking.whatsapp_group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">forum</span>
                          WhatsApp Group
                        </a>
                      ) : (
                        <button
                          onClick={() => { setShowSupportModal(true); fetchChat(); }}
                          className="px-4 py-2.5 bg-[#F4EFEA] hover:bg-[#EDE8DF] text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          Chat Concierge
                        </button>
                      )}

                      <button
                        onClick={() => setShowChecklistModal(true)}
                        className="px-4 py-2.5 bg-[#F4EFEA] hover:bg-[#EDE8DF] text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">checklist</span>
                        Packing List
                      </button>
                    </div>
                  </div>

                  {/* Day-by-Day Highlights */}
                  <div className="pt-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#C9732A]">map</span>
                      Day-by-Day Itinerary Schedule
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {[1, 2, 3, 4, 5].map(d => (
                        <button
                          key={d}
                          onClick={() => setSelectedItineraryDay(d)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            selectedItineraryDay === d
                              ? 'bg-[#2D6A4F] text-white shadow-xs'
                              : 'bg-[#F9F7F2] text-slate-600 hover:bg-[#EDE8DF]'
                          }`}
                        >
                          Day {d}: {d === 1 ? 'Arrival & Welcome' : d === 2 ? 'City Highlights' : d === 3 ? 'Excursion Tour' : d === 4 ? 'Leisure & Dining' : 'Departure'}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 p-4 bg-[#F9F7F2] rounded-2xl border border-[#EDE8DF] text-xs text-slate-600 leading-relaxed">
                      {selectedItineraryDay === 1 && 'Private airport greeting, chauffeured transfer to luxury hotel, welcome refreshers, and evening sunset stroll.'}
                      {selectedItineraryDay === 2 && 'Guided sightseeing tour including iconic landmarks, traditional gourmet lunch, and afternoon heritage walk.'}
                      {selectedItineraryDay === 3 && 'Full-day excursion to coastal spots, scenic lookout viewpoints, and private adventure activity booking.'}
                      {selectedItineraryDay === 4 && 'Free leisure morning, optional spa therapy treatments, and signature culinary dining experience.'}
                      {selectedItineraryDay === 5 && 'Buffet breakfast, souvenir shopping assistance, and private transfer back to the international airport.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Inspiring Empty State when no active booking exists */
              <div className="bg-white rounded-3xl border border-[#EDE8DF] p-8 sm:p-12 text-center space-y-6 shadow-xs">
                <div className="size-16 rounded-3xl bg-[#C9732A]/10 text-[#C9732A] flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-[32px]">flight</span>
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-2xl font-display font-black text-slate-900">Your Next Journey Awaits</h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    You do not have any active travel bookings scheduled right now. Explore our handpicked holiday packages or request a personalized private itinerary from our concierge.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    to="/packages"
                    className="px-6 py-3 bg-[#C9732A] hover:bg-[#A85E1E] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Browse Tour Packages
                  </Link>
                  <button
                    onClick={() => { setShowSupportModal(true); fetchChat(); }}
                    className="px-6 py-3 bg-[#F4EFEA] hover:bg-[#EDE8DF] text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">support_agent</span>
                    Plan Custom Trip
                  </button>
                </div>
              </div>
            )}

            {/* Interactive India Travel Circuits & Map Explorer */}
            <InteractiveIndiaExplorer onOpenConcierge={() => { setShowSupportModal(true); fetchChat(); }} />

            {/* Quick Inspiration Destinations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-slate-900">Curated International & Regional Escapes</h3>
                <Link to="/packages" className="text-xs font-bold text-[#C9732A] hover:underline flex items-center gap-1">
                  View All Packages <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Bali & Tropical Islands', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80', price: '₹42,000', days: '6D / 5N' },
                  { name: 'Dubai Skyline & Dunes', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80', price: '₹38,500', days: '5D / 4N' },
                  { name: 'Kashmir Valley & Gulmarg', img: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80', price: '₹26,999', days: '6D / 5N' },
                  { name: 'Goa Coastal Serenity', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80', price: '₹14,999', days: '4D / 3N' },
                ].map((item, idx) => (
                  <Link
                    to="/packages"
                    key={idx}
                    className="group bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="h-36 relative overflow-hidden">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {item.days}
                      </span>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h4 className="font-bold text-xs text-slate-800 truncate">{item.name}</h4>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-medium">Starting from</span>
                        <span className="font-black text-[#2D6A4F]">{item.price}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Past Completed Trips & Reviews */}
            {bookings.filter(b => b.status?.toLowerCase() === 'completed').length > 0 && (
              <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 space-y-4 shadow-xs">
                <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#2D6A4F]">task_alt</span>
                  Past Completed Journeys
                </h3>
                <div className="divide-y divide-[#EDE8DF]">
                  {bookings.filter(b => b.status?.toLowerCase() === 'completed').map(trip => (
                    <div key={trip.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{trip.package_name || trip.destination}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Travel Date: {trip.travel_date ? new Date(trip.travel_date).toLocaleDateString() : 'Completed'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Share your travel review..."
                          value={commentFeedback}
                          onChange={e => setCommentFeedback(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A] w-48 sm:w-64"
                        />
                        <button
                          onClick={() => handleReviewSubmit(trip.id)}
                          disabled={reviewLoading || !commentFeedback.trim()}
                          className="px-4 py-2 bg-[#2D6A4F] text-white text-xs font-bold rounded-xl hover:bg-[#1e4835] transition-colors disabled:opacity-50"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: SECURE DOCUMENT VAULT                                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Vault Top Controls */}
            <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-[#2D6A4F]">folder_shared</span>
                  Secure Travel Vault
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  End-to-end encrypted storage for passports, visas, flight tickets, and hotel confirmation vouchers.
                </p>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-5 py-2.5 bg-[#C9732A] hover:bg-[#A85E1E] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload Document
              </button>
            </div>

            {/* Document Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['All', 'Passport', 'Visa', 'Flight Ticket', 'Hotel Voucher', 'Insurance', 'Invoice'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setDocCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    docCategoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-[#EDE8DF] hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Documents Grid */}
            {loadingDocs ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading vault contents...</div>
            ) : filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map(doc => {
                  const isPdf = doc.filename.toLowerCase().endsWith('.pdf');
                  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc.filename);
                  return (
                    <div
                      key={doc.id}
                      className="bg-white rounded-2xl border border-[#EDE8DF] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                          isPdf ? 'bg-red-50 text-red-500' : isImage ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <span className="material-symbols-outlined text-[24px]">
                            {isPdf ? 'picture_as_pdf' : isImage ? 'image' : 'description'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {doc.doc_type || 'Document'}
                          </span>
                          <h4 className="font-bold text-xs text-slate-800 truncate mt-1" title={doc.filename}>
                            {doc.filename}
                          </h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Added {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-5 pt-3 border-t border-[#EDE8DF]">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 bg-[#F9F7F2] hover:bg-[#EDE8DF] text-slate-700 rounded-lg text-center text-xs font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Download
                        </a>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete from Vault"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#EDE8DF] p-12 text-center space-y-4 shadow-xs">
                <div className="size-14 rounded-2xl bg-[#EDE8DF] text-slate-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[28px]">folder_open</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">No Documents in This Category</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Upload your flight tickets, visa copies, or passport biodata for instant 1-click access during transit.
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Upload First File
                </button>
              </div>
            )}

            {/* Travel Vault Guidelines Card */}
            <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/60 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">verified_user</span>
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">Passport & Visa Rule Reminder</span>
                Ensure all passports have at least 6 months validity from your scheduled return date, and keep digital copies of confirmed hotel vouchers ready at immigration counters.
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: SAVED WISHLIST                                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'wishlist' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-red-500">favorite</span>
                  Saved Escapes & Shortlist
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Your shortlisted holiday itineraries. Request an instant quote or customize dates with our team.
                </p>
              </div>

              <Link
                to="/packages"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[18px]">travel</span>
                Discover More
              </Link>
            </div>

            {loadingWishlist ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading saved packages...</div>
            ) : wishlistPackages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-3xl border border-[#EDE8DF] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="h-44 relative overflow-hidden bg-slate-100">
                        <img
                          src={pkg.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80'}
                          alt={pkg.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <button
                          onClick={() => handleRemoveWishlist(pkg.id)}
                          className="absolute top-3 right-3 size-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm transition-transform active:scale-90"
                          title="Remove from Wishlist"
                        >
                          <span className="material-symbols-outlined text-[18px]">favorite</span>
                        </button>
                        <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded">
                          {pkg.days ? `${pkg.days} Days / ${pkg.nights || pkg.days - 1} Nights` : 'Curated Tour'}
                        </span>
                      </div>

                      <div className="p-5 space-y-2">
                        <h4 className="font-display font-bold text-sm text-slate-900 line-clamp-1">{pkg.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {pkg.overview || 'Scenic guided escape with premium hotel stays, transfers, and sightseeing.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="flex items-center justify-between pt-3 border-t border-[#EDE8DF]">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Starting Price</span>
                          <span className="text-sm font-black text-[#2D6A4F]">{formatPrice(pkg.price || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/packages/${pkg.id}`}
                            className="px-3.5 py-2 bg-[#C9732A] hover:bg-[#A85E1E] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => {
                              setQuoteForm(prev => ({ ...prev, destination: pkg.title }));
                              setShowSupportModal(true);
                            }}
                            className="px-3.5 py-2 bg-[#F4EFEA] hover:bg-[#EDE8DF] text-slate-800 font-bold text-xs rounded-xl transition-colors"
                          >
                            Inquire
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#EDE8DF] p-12 text-center space-y-4 shadow-xs">
                <div className="size-14 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[28px]">favorite_border</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Your Wishlist is Empty</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Explore our premier destinations and click the heart icon on any package to save it here for later.
                  </p>
                </div>
                <Link
                  to="/packages"
                  className="inline-block px-5 py-2.5 bg-[#C9732A] text-white rounded-xl text-xs font-bold hover:bg-[#A85E1E] transition-colors"
                >
                  Browse Destinations
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: CO-TRAVELERS                                           */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'travelers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-[#2D6A4F]">group</span>
                  Co-Travelers & Family Members
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Store passport numbers and family member profiles for rapid group visa processing and airline tickets.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCoTravelerId(null);
                  setCoTravelerForm({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
                  // toggle modal or focus form
                  const el = document.getElementById('co-traveler-form-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-[#2D6A4F] hover:bg-[#1e4835] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add Co-Traveler
              </button>
            </div>

            {/* Travelers Grid */}
            {loadingCoTravelers ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading saved travelers...</div>
            ) : coTravelers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coTravelers.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl border border-[#EDE8DF] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center font-bold text-xs">
                            {t.name[0]?.toUpperCase() || 'T'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                            <span className="text-[10px] font-bold text-slate-500 uppercase bg-[#F4EFEA] px-2 py-0.5 rounded">
                              {t.relation || 'Traveler'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCoTravelerId(t.id);
                              setCoTravelerForm({
                                name: t.name || '',
                                relation: t.relation || 'Friend',
                                phone: t.phone || '',
                                passport_no: t.passport_no || '',
                                dob: t.dob || ''
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCoTraveler(t.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-[#FDFBF7] p-3 rounded-xl border border-[#EDE8DF]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Passport:</span>
                          <span className="font-mono font-bold text-slate-800">{t.passport_no || 'Not Added'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="font-bold text-slate-800">{t.phone || 'N/A'}</span>
                        </div>
                        {t.dob && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">DOB:</span>
                            <span className="font-bold text-slate-800">{t.dob}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#EDE8DF] p-8 text-center text-slate-500 text-xs">
                No co-travelers saved yet. Use the form below to add your travel companions.
              </div>
            )}

            {/* Add / Edit Co-Traveler Form Card */}
            <div id="co-traveler-form-card" className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 shadow-xs">
              <h3 className="font-display font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#C9732A]">badge</span>
                {editingCoTravelerId ? 'Edit Co-Traveler Details' : 'Add New Co-Traveler'}
              </h3>

              <form onSubmit={handleAddCoTraveler} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={coTravelerForm.name}
                    onChange={e => setCoTravelerForm({ ...coTravelerForm, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relationship</label>
                  <select
                    value={coTravelerForm.relation}
                    onChange={e => setCoTravelerForm({ ...coTravelerForm, relation: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Passport Number</label>
                  <input
                    type="text"
                    value={coTravelerForm.passport_no}
                    onChange={e => setCoTravelerForm({ ...coTravelerForm, passport_no: e.target.value.toUpperCase() })}
                    placeholder="e.g. Z1234567"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={coTravelerForm.phone}
                    onChange={e => setCoTravelerForm({ ...coTravelerForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={coTravelerForm.dob}
                    onChange={e => setCoTravelerForm({ ...coTravelerForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={coTravelerLoading}
                    className="flex-1 py-2.5 bg-[#2D6A4F] hover:bg-[#1e4835] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {coTravelerLoading ? 'Saving...' : editingCoTravelerId ? 'Update Traveler' : 'Save Co-Traveler'}
                  </button>
                  {editingCoTravelerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoTravelerId(null);
                        setCoTravelerForm({ name: '', relation: 'Friend', phone: '', passport_no: '', dob: '' });
                      }}
                      className="px-4 py-2.5 border border-[#EDE8DF] text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 5: VIP MEMBERSHIP & REWARDS                               */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'membership' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Digital Membership Card & Tier Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Metallic Digital Card */}
              <div className={`lg:col-span-5 bg-gradient-to-br ${vipTierInfo.gradient} rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]`}>
                <div className="absolute right-[-20px] top-[-20px] size-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <span className="text-[10px] tracking-widest font-black uppercase text-white/80 block">Shrawello Luxury Circle</span>
                    <h3 className="font-display font-black text-2xl tracking-tight mt-0.5">{vipTierInfo.tier}</h3>
                  </div>
                  <span className="material-symbols-outlined text-[32px] text-white/80">workspace_premium</span>
                </div>

                <div className="relative z-10 pt-8 space-y-1">
                  <span className="font-mono text-sm tracking-wider opacity-90 block">
                    ID: {customer?.id ? `SHR-${customer.id.toString().padStart(6, '0')}` : 'SHR-001928'}
                  </span>
                  <span className="text-xs font-bold text-white/95 block uppercase">{customer?.name || 'Valued Member'}</span>
                </div>
              </div>

              {/* Loyalty Points & Progress */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Loyalty Points Balance</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-display font-black text-slate-900">{loyaltyPoints}</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Worth {formatPrice(loyaltyPoints * 10)} on Bookings
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Earn 10 points for every ₹1,000 spent with Shrawello. Redeem points instantly during final invoice settlements.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EDE8DF]">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">Tier Status: {vipTierInfo.tier}</span>
                    <span className="text-slate-700">{vipTierInfo.nextTier}</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F4EFEA] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-[#C9732A] rounded-full transition-all duration-500" style={{ width: `${vipTierInfo.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Engine */}
            <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px] text-[#C9732A]">card_giftcard</span>
                    Invite Friends & Earn Points
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Share your personal referral link. When a friend books their first trip, you both receive 500 bonus loyalty points.
                  </p>
                </div>

                {referralCode && (
                  <div className="flex items-center gap-2 bg-[#F9F7F2] p-2 rounded-xl border border-[#EDE8DF]">
                    <span className="font-mono text-xs font-bold text-slate-800 px-2">{referralCode}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://shrawellotours.com/customer/register?ref=${referralCode}`);
                        showToast('success', 'Referral link copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-[#C9732A] text-white rounded-lg text-xs font-bold hover:bg-[#A85E1E] transition-colors"
                    >
                      Copy Link
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Plan your next holiday with Shrawello Travel Hub! Sign up using my referral link for special perks: https://shrawellotours.com/customer/register?ref=${referralCode}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      title="Share via WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[16px]">share</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Email Invite Form */}
              <form onSubmit={handleSendReferral} className="flex gap-2 max-w-md">
                <input
                  type="email"
                  required
                  placeholder="friend@example.com"
                  value={referralEmail}
                  onChange={e => setReferralEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                />
                <button
                  type="submit"
                  disabled={referralLoading}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {referralLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>

            {/* Public Membership Plans Upgrade Gallery */}
            {publicPlans.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-slate-900">Explore Premium Club Memberships</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicPlans.map(plan => (
                    <div key={plan.id} className="bg-white rounded-3xl border border-[#EDE8DF] p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-slate-800">{plan.name}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {plan.tier}
                          </span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {formatPrice(plan.yearly_price || 9999)}
                          <span className="text-xs font-normal text-slate-400"> / year</span>
                        </div>
                        <ul className="text-xs text-slate-600 space-y-2">
                          {(plan.benefits || ['Dedicated 24/7 Concierge Manager', 'VIP Airport Lounge Access', '5% Discount on Global Packages', 'Free Room Upgrades at Partner Hotels']).map((b: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => handlePayAndJoinMembership(plan, 'Yearly')}
                        disabled={razorpayLoading}
                        className="mt-6 w-full py-2.5 bg-[#C9732A] hover:bg-[#A85E1E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                      >
                        {razorpayLoading ? 'Processing...' : 'Join with Razorpay'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── 4. STICKY MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE8DF] px-2 py-2 flex items-center justify-around shadow-lg">
        {([
          { key: 'bookings', label: 'Trips', icon: 'flight_takeoff' },
          { key: 'documents', label: 'Vault', icon: 'folder_shared' },
          { key: 'wishlist', label: 'Wishlist', icon: 'favorite' },
          { key: 'travelers', label: 'Family', icon: 'group' },
          { key: 'membership', label: 'VIP', icon: 'workspace_premium' },
        ] as const).map(item => {
          const active = activeSubTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSubTab(item.key)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                active ? 'text-[#C9732A]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${active ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] tracking-tight mt-0.5 ${active ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── 5. FLOATING CONCIERGE CHAT BUTTON ── */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-30">
        <button
          onClick={() => { setShowSupportModal(true); fetchChat(); }}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[20px]">support_agent</span>
          <span className="hidden sm:inline">Concierge Desk</span>
        </button>
      </div>

      {/* ── 6. MODALS & DRAWERS ── */}

      {/* Concierge Support Chat Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] w-full max-w-lg shadow-2xl flex flex-col h-[520px] overflow-hidden">
            <div className="p-4 border-b border-[#EDE8DF] bg-[#FDFBF7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-xs">
                  SH
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Shrawello Concierge</h4>
                  <span className="text-[10px] text-emerald-600 font-bold block">Online • Dedicated Travel Support</span>
                </div>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9F7F2]/40">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Say hello! Our travel operations desk is ready to assist with flights, hotels, or custom itineraries.
                </div>
              ) : (
                chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender_type === 'customer' ? 'bg-[#2D6A4F] text-white rounded-br-xs' : 'bg-white text-slate-800 border border-[#EDE8DF] rounded-bl-xs shadow-2xs'
                    }`}>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#EDE8DF] flex gap-2 bg-white">
              <input
                type="text"
                placeholder="Type your question or request..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#2D6A4F]"
              />
              <button type="submit" className="px-4 py-2 bg-[#2D6A4F] text-white rounded-xl text-xs font-bold hover:bg-[#1e4835] transition-colors">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-base text-slate-900">Upload to Secure Vault</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleDocUpload} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none"
                >
                  <option value="Passport">Passport Biodata</option>
                  <option value="Visa">Visa Copy</option>
                  <option value="Flight Ticket">Flight Ticket</option>
                  <option value="Hotel Voucher">Hotel Voucher</option>
                  <option value="Insurance">Travel Insurance</option>
                  <option value="Invoice">Payment Receipt / Invoice</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select File (PDF or Image)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#2D6A4F] file:text-white hover:file:bg-[#1e4835]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 border border-[#EDE8DF] text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docUploading || !docFile}
                  className="flex-1 py-2.5 bg-[#C9732A] hover:bg-[#A85E1E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {docUploading ? 'Uploading...' : 'Vault Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Settings & Password Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#EDE8DF]">
              <h3 className="font-display font-bold text-lg text-slate-900">Account & Profile Settings</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Profile Info Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-4 mb-8">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Personal Information</h4>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={profileForm.whatsapp}
                    onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#2D6A4F] text-white text-xs font-bold rounded-xl hover:bg-[#1e4835] transition-colors"
              >
                Save Details
              </button>
            </form>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-[#EDE8DF]">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Update Password</h4>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.oldPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C9732A]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Change Password
              </button>
            </form>

            {/* Logout button */}
            <div className="pt-6 border-t border-[#EDE8DF] mt-6">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Modal (⌘K) */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#EDE8DF] flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
              <input
                type="text"
                autoFocus
                placeholder="Quick jump to Trips, Documents, Wishlist, Concierge..."
                value={commandQuery}
                onChange={e => setCommandQuery(e.target.value)}
                className="flex-1 text-xs outline-none bg-transparent"
              />
              <button onClick={() => setShowCommandPalette(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto space-y-1">
              {[
                { title: 'My Trips & Bookings', tab: 'bookings' as const, icon: 'flight_takeoff' },
                { title: 'Secure Document Vault', tab: 'documents' as const, icon: 'folder_shared' },
                { title: 'Saved Wishlist Packages', tab: 'wishlist' as const, icon: 'favorite' },
                { title: 'Co-Travelers & Family Members', tab: 'travelers' as const, icon: 'group' },
                { title: 'VIP Membership & Rewards Points', tab: 'membership' as const, icon: 'workspace_premium' },
              ].filter(c => c.title.toLowerCase().includes(commandQuery.toLowerCase())).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSubTab(item.tab);
                    setShowCommandPalette(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left text-xs font-bold text-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#C9732A]">{item.icon}</span>
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Packing Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#EDE8DF]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-[#C9732A]">checklist</span>
                <h3 className="font-display font-bold text-base text-slate-900">AI Trip Packing Checklist</h3>
              </div>
              <button onClick={() => setShowChecklistModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Climate</label>
                  <select
                    value={packingWeather}
                    onChange={e => setPackingWeather(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none"
                  >
                    <option value="Tropical / Sunny">Tropical / Sunny</option>
                    <option value="Mild / Mixed">Mild / Mixed</option>
                    <option value="Snow / Winter">Snow / Winter</option>
                    <option value="Rainy / Monsoon">Rainy / Monsoon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Activity Focus</label>
                  <select
                    value={packingActivity}
                    onChange={e => setPackingActivity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none"
                  >
                    <option value="Leisure & Sightseeing">Leisure & Sightseeing</option>
                    <option value="Beach & Water Sports">Beach & Water Sports</option>
                    <option value="Trekking & Adventure">Trekking & Adventure</option>
                    <option value="Business & Events">Business & Events</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateChecklistAI}
                disabled={isGeneratingChecklist}
                className="w-full py-2.5 bg-gradient-to-r from-[#C9732A] to-[#E8935B] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                {isGeneratingChecklist ? 'Generating Checklist with AI...' : 'Generate Personalized List'}
              </button>

              {/* Items List */}
              {packingChecklist && Array.isArray(packingChecklist) && packingChecklist.length > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  <h4 className="font-bold text-xs text-slate-800">Checklist Items:</h4>
                  {packingChecklist.map((item: any, idx: number) => {
                    const text = typeof item === 'string' ? item : item.name || item.item;
                    return (
                      <label key={idx} className="flex items-center gap-2.5 p-2 bg-[#F9F7F2] rounded-xl text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="size-4 text-[#C9732A] rounded border-[#EDE8DF]"
                        />
                        <span>{text}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal for balance due */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#EDE8DF]">
              <h3 className="font-display font-bold text-base text-slate-900">Submit Payment Proof</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder={balanceDue.toString()}
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  value={payForm.method}
                  onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none"
                >
                  <option value="UPI / GPay / PhonePe">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank NEFT / RTGS">Bank NEFT / RTGS</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Transaction Ref / UTR *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 423871928371"
                  value={payForm.reference}
                  onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FDFBF7] border border-[#EDE8DF] rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Receipt Screenshot</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setPayFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#C9732A] file:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 border border-[#EDE8DF] text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="flex-1 py-2.5 bg-[#C9732A] hover:bg-[#A85E1E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {payLoading ? 'Submitting...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
