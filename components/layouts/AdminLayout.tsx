import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'sonner';
import { SuggestPopup, isDismissed, isSnoozed } from '../../components/ui/SuggestPopup';
import { getPaymentDueBookings } from '../../src/hooks/useSuggestions';
import { api } from '../../src/lib/api';
import { InAppNotification } from '../../types';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  module: string;
  desc?: string;
  tag?: string;
}

interface NavCategory {
  key: string;
  title: string;
  icon: string;
  altShortcut: string;
  colorTheme: 'indigo' | 'blue' | 'purple' | 'emerald' | 'amber';
  quickAction: { label: string; icon: string; path: string; module: string };
  items: NavItem[];
}

const TOP_NAV_CATEGORIES: NavCategory[] = [
  {
    key: 'overview',
    title: 'Overview',
    icon: 'dashboard',
    altShortcut: 'Alt+1',
    colorTheme: 'indigo',
    quickAction: { label: 'Go to Analytics', icon: 'bar_chart', path: '/admin/analytics', module: 'reports' },
    items: [
      { name: 'Dashboard', path: '/admin', icon: 'dashboard', module: 'dashboard', desc: 'Real-time metrics, revenue KPIs & quick ops', tag: '#Realtime' },
      { name: 'Analytics', path: '/admin/analytics', icon: 'bar_chart', module: 'reports', desc: 'Revenue breakdown, growth & sales insights', tag: '#Reports' },
    ]
  },
  {
    key: 'operations',
    title: 'Operations',
    icon: 'grid_view',
    altShortcut: 'Alt+2',
    colorTheme: 'blue',
    quickAction: { label: '+ New Booking', icon: 'add_circle', path: '/admin/bookings', module: 'bookings' },
    items: [
      { name: 'Bookings', path: '/admin/bookings', icon: 'airplane_ticket', module: 'bookings', desc: 'Trip reservations, ticketing & customer bookings', tag: '#Trips' },
      { name: 'Inventory', path: '/admin/inventory', icon: 'calendar_month', module: 'inventory', desc: 'Hotel room & vehicle allotment schedule', tag: '#Rooms' },
      { name: 'Vendors', path: '/admin/vendors', icon: 'storefront', module: 'vendors', desc: 'Suppliers, hotel contracts & vendor profiles', tag: '#Hotels' },
      { name: 'Itinerary Builder', path: '/admin/itinerary-builder', icon: 'map', module: 'itinerary', desc: 'Interactive day-by-day tour planner', tag: '#Builder' },
      { name: 'Live Operations', path: '/admin/operations', icon: 'traffic', module: 'operations', desc: 'Real-time driver, vehicle & trip tracking', tag: '#LiveOps' },
      { name: 'Car Rentals', path: '/admin/car-rental', icon: 'directions_car', module: 'operations', desc: 'Vehicle rentals, fleet schedule & driver roster', tag: '#Cars' },
      { name: 'Masters Catalog', path: '/admin/masters', icon: 'dataset', module: 'masters', desc: 'Destinations, hotels, activities & pricing catalogs', tag: '#Catalog' },
    ]
  },
  {
    key: 'crm',
    title: 'CRM & Growth',
    icon: 'rocket_launch',
    altShortcut: 'Alt+3',
    colorTheme: 'purple',
    quickAction: { label: '+ Add Lead', icon: 'person_add', path: '/admin/leads', module: 'leads' },
    items: [
      { name: 'Leads CRM', path: '/admin/leads', icon: 'groups', module: 'leads', desc: 'Sales funnel, inquiries & follow-up reminders', tag: '#Pipeline' },
      { name: 'Customers', path: '/admin/customers', icon: 'face', module: 'customers', desc: 'Traveler profiles, history & loyalty details', tag: '#Travelers' },
      { name: 'Memberships', path: '/admin/memberships', icon: 'card_membership', module: 'memberships', desc: 'VIP membership & loyalty privileges', tag: '#VIP' },
      { name: 'Support Inbox', path: '/admin/support-inbox', icon: 'forum', module: 'memberships', desc: 'Customer support tickets & messaging', tag: '#Tickets' },
      { name: 'Associates / Partners', path: '/admin/partners', icon: 'handshake', module: 'partners', desc: 'B2B agent network & partner directory', tag: '#B2B' },
      { name: 'KYC Management', path: '/admin/kyc', icon: 'verified_user', module: 'partners', desc: 'Document verification for partners & drivers', tag: '#Verification' },
      { name: 'Coupons', path: '/admin/coupons', icon: 'local_offer', module: 'marketing', desc: 'Discount vouchers, promo codes & deals', tag: '#Discounts' },
      { name: 'Marketing Logs', path: '/admin/marketing-logs', icon: 'edit_note', module: 'marketing', desc: 'Campaign broadcasting & email/SMS logs', tag: '#Campaigns' },
    ]
  },
  {
    key: 'finance',
    title: 'Finance & Billing',
    icon: 'account_balance_wallet',
    altShortcut: 'Alt+4',
    colorTheme: 'emerald',
    quickAction: { label: '+ Create Invoice', icon: 'receipt', path: '/admin/invoices', module: 'invoices' },
    items: [
      { name: 'Bank Accounts', path: '/admin/accounts', icon: 'account_balance', module: 'finance', desc: 'Bank accounts, ledgers & cash balances', tag: '#Banks' },
      { name: 'Expenses', path: '/admin/expenses', icon: 'receipt_long', module: 'finance', desc: 'Vendor payouts, operational costs & vouchers', tag: '#Payouts' },
      { name: 'Payment Approvals', path: '/admin/finance-verification', icon: 'fact_check', module: 'invoices', desc: 'Bank transaction matching & payment verification', tag: '#Audit' },
      { name: 'Proposals', path: '/admin/proposals', icon: 'description', module: 'proposals', desc: 'Client travel quotes & proposal drafts', tag: '#Quotes' },
      { name: 'Invoices', path: '/admin/invoices', icon: 'receipt', module: 'invoices', desc: 'GST invoices, billing & payment receipts', tag: '#GST' },
    ]
  },
  {
    key: 'system',
    title: 'Team & System',
    icon: 'tune',
    altShortcut: 'Alt+5',
    colorTheme: 'amber',
    quickAction: { label: '+ Add Master Data', icon: 'dataset', path: '/admin/masters', module: 'masters' },
    items: [
      { name: 'Staff Members', path: '/admin/staff', icon: 'badge', module: 'staff', desc: 'Employee accounts, roles & access permissions', tag: '#Roles' },
      { name: 'Team Performance', path: '/admin/team-performance', icon: 'monitoring', module: 'staff', desc: 'Sales targets, agent KPIs & productivity', tag: '#KPIs' },
      { name: 'Tour Packages', path: '/admin/packages', icon: 'inventory_2', module: 'inventory', desc: 'Tour package catalog & holiday offerings', tag: '#Tours' },
      { name: 'Testimonials', path: '/admin/testimonials', icon: 'rate_review', module: 'testimonials', desc: 'Client reviews & website testimonials', tag: '#Reviews' },
      { name: 'Trending Spots', path: '/admin/trending', icon: 'trending_up', module: 'cms', desc: 'Homepage featured destinations & spots', tag: '#Spots' },
      { name: 'Offer Banners', path: '/admin/offer-banners', icon: 'local_offer', module: 'cms', desc: 'Homepage promotional banners', tag: '#Banners' },
      { name: 'Video Training', path: '/admin/training', icon: 'video_library', module: 'staff', desc: 'Video training content & tutorials', tag: '#Videos' },
      { name: 'Staff Training Hub', path: '/admin/staff-training', icon: 'school', module: 'staff', desc: 'Employee onboarding & learning center', tag: '#Hub' },
      { name: 'Activity Feed', path: '/admin/activity', icon: 'pending_actions', module: 'audit', desc: 'Live system user activity stream', tag: '#Feed' },
      { name: 'Audit Logs', path: '/admin/audit', icon: 'history', module: 'audit', desc: 'Security logs, system changes & history', tag: '#Audit' },
      { name: 'System Settings', path: '/admin/settings', icon: 'settings', module: 'settings', desc: 'Global settings, branding & preferences', tag: '#Config' },
    ]
  }
];

export const AdminLayout: React.FC = () => {
  const { currentUser, logout, isAuthenticated, isLoading, isMasquerading, stopMasquerading, hasPermission } = useAuth();
  const { bookings, leads, followUps, updateFollowUp } = useData();
  const { settings } = useSettings();
  
  const [activeMegaCategory, setActiveMegaCategory] = useState<string | null>(null);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [vendorAlertIdx, setVendorAlertIdx] = useState(0);
  const [isUserIdle, setIsUserIdle] = useState(false);
  const [sessionBookingsProcessed, setSessionBookingsProcessed] = useState(0);
  const [showPositiveReinforcement, setShowPositiveReinforcement] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        setActiveMegaCategory(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveMegaCategory(null);
    setIsMobileDrawerOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
  }, [location.pathname]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.staffId) return;
    try {
      const data = await api.getInAppNotifications();
      const myNotifs = data.filter(n => n.staffId === currentUser.staffId);
      setInAppNotifications(myNotifs);

      const unread = myNotifs.filter(n => !n.isRead && !notifiedIds.has(n.id));
      unread.forEach(n => {
        toast.info(n.title, {
          description: n.message,
          duration: 8000
        });
        setNotifiedIds(prev => new Set(prev).add(n.id));
      });
    } catch (e) {
      console.error("Failed to load in-app notifications:", e);
    }
  }, [currentUser, notifiedIds]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const checkFollowUps = () => {
      const now = new Date();
      const pendingFollowUps = followUps.filter(f =>
        f.status === 'Pending' &&
        f.reminderEnabled &&
        f.scheduledAt &&
        new Date(f.scheduledAt) <= now &&
        !notifiedIds.has(f.id)
      );

      pendingFollowUps.forEach(f => {
        toast.info(`Follow-up Due: ${f.leadName || 'Unknown Lead'}`, {
          description: f.description || f.notes || 'No notes provided',
          action: { label: 'View', onClick: () => navigate('/admin/leads') },
          duration: 10000,
        });
        setNotifiedIds(prev => new Set(prev).add(f.id));
      });
    };

    const timer = setInterval(checkFollowUps, 30000);
    checkFollowUps();
    return () => clearInterval(timer);
  }, [isAuthenticated, followUps, notifiedIds, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('morning_briefing_last_shown');
    if (lastShown !== today) {
      const t = setTimeout(() => setShowMorningBriefing(true), 1500);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const interval = setInterval(() => setVendorAlertIdx(i => i + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      setIsUserIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsUserIdle(true), (settings.staffRoles.idleTimeoutMinutes || 20) * 60 * 1000);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer);
    };
  }, [isAuthenticated, settings.staffRoles.idleTimeoutMinutes]);

  useEffect(() => {
    const key = 'session_bookings_count';
    const stored = parseInt(sessionStorage.getItem(key) || '0');
    setSessionBookingsProcessed(stored);
  }, [bookings.length]);

  useEffect(() => {
    const key = 'session_bookings_count';
    const prev = parseInt(sessionStorage.getItem(key) || '0');
    if (bookings.length > prev) {
      const newCount = prev + (bookings.length - prev);
      sessionStorage.setItem(key, String(newCount));
      setSessionBookingsProcessed(newCount);
      if (newCount > 0 && newCount % 5 === 0) {
        setShowPositiveReinforcement(true);
        setTimeout(() => setShowPositiveReinforcement(false), 8000);
      }
    }
  }, [bookings.length]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  const handleLogout = () => {
    toast.dismiss();
    logout();
    navigate('/', { replace: true });
  };

  const handleMarkNotificationRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const unread = inAppNotifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => api.markNotificationRead(n.id)));
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const visibleCategories = useMemo(() => {
    return TOP_NAV_CATEGORIES.map(category => ({
      ...category,
      items: category.items.filter(item => hasPermission(item.module as any, 'view'))
    })).filter(category => category.items.length > 0);
  }, [hasPermission]);

  const allNavItems = useMemo(() => visibleCategories.flatMap(c => c.items), [visibleCategories]);

  const activeCategoryInfo = useMemo(() => {
    for (const cat of visibleCategories) {
      for (const item of cat.items) {
        const isMatch = item.path === '/admin'
          ? location.pathname === '/admin'
          : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        if (isMatch) return { activeCat: cat, activeItem: item };
      }
    }
    return { activeCat: visibleCategories[0] || TOP_NAV_CATEGORIES[0], activeItem: (visibleCategories[0] || TOP_NAV_CATEGORIES[0]).items[0] };
  }, [visibleCategories, location.pathname]);

  useEffect(() => {
    if (!currentUser) return;
    const sortedRoutes = [...allNavItems].sort((a, b) => b.path.length - a.path.length);
    const matchedRoute = sortedRoutes.find(route =>
      location.pathname === route.path || location.pathname.startsWith(route.path + '/')
    );
    if (matchedRoute && !hasPermission(matchedRoute.module as any, 'view')) {
      toast.error(`Access Denied: You do not have permission to view ${matchedRoute.name}.`);
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, currentUser, hasPermission, navigate, allNavItems]);

  useEffect(() => {
    const handleAltNav = (e: KeyboardEvent) => {
      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (visibleCategories[idx] && visibleCategories[idx].items.length > 0) {
          navigate(visibleCategories[idx].items[0].path);
          toast.info(`Switched to ${visibleCategories[idx].title}`, { duration: 2000 });
        }
      }
    };
    window.addEventListener('keydown', handleAltNav);
    return () => window.removeEventListener('keydown', handleAltNav);
  }, [visibleCategories, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        setCommandSearch('');
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsFabOpen(false);
        setIsNotificationsOpen(false);
        setActiveMegaCategory(null);
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getCategoryStatBadge = useCallback((categoryKey: string) => {
    switch (categoryKey) {
      case 'operations': return `${bookings.length} Bookings`;
      case 'crm': return `${leads.length} Leads`;
      case 'finance': return `₹45.8k Due`;
      case 'system': return `11 Modules`;
      default: return `2 Reports`;
    }
  }, [bookings.length, leads.length]);

  const quickActions = useMemo(() => [
    { name: 'New Booking', icon: 'add_circle', path: '/admin/bookings', color: 'from-blue-500 to-indigo-600', module: 'bookings' },
    { name: 'Add Lead', icon: 'person_add', path: '/admin/leads', color: 'from-purple-500 to-pink-600', module: 'leads' },
    { name: 'Create Package', icon: 'travel_explore', path: '/admin/itinerary-builder', color: 'from-emerald-500 to-teal-600', module: 'inventory' },
    { name: 'Add Master Data', icon: 'dataset', path: '/admin/masters', color: 'from-orange-500 to-rose-500', module: 'masters' },
  ].filter(action => hasPermission(action.module as any, 'manage')), [hasPermission]);

  const unifiedItems = useMemo(() => {
    const list: any[] = [];
    const pendingFollowUps = followUps.filter(f =>
      f.status === 'Pending' &&
      f.reminderEnabled &&
      f.scheduledAt &&
      new Date(f.scheduledAt) <= new Date() &&
      !dismissedIds.has(f.id)
    );
    pendingFollowUps.forEach(f => {
      list.push({
        id: f.id,
        title: `Follow-up: ${f.leadName || 'Unknown Lead'}`,
        message: f.description || f.notes || 'No notes provided.',
        date: f.scheduledAt || '',
        type: 'followup',
        isRead: false,
        rawItem: f
      });
    });
    inAppNotifications.forEach(n => {
      list.push({
        id: n.id,
        title: n.title,
        message: n.message,
        date: n.createdAt || '',
        type: n.type || 'info',
        isRead: n.isRead,
        rawItem: n
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [followUps, dismissedIds, inAppNotifications]);

  const filteredNavItems = commandSearch
    ? allNavItems.filter(item => item.name.toLowerCase().includes(commandSearch.toLowerCase()))
    : allNavItems;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0B1116]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 animate-pulse">
            <span className="material-symbols-outlined text-[24px]">travel_explore</span>
          </div>
          <p className="text-sm font-semibold text-slate-400">Loading SHRAWELLO Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) return null;

  return (
    <div className="bg-slate-50 dark:bg-[#0B1116] text-slate-900 dark:text-slate-100 flex flex-col min-h-screen print:h-auto font-sans relative">
      
      {isMasquerading && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-amber-400 text-amber-900 z-[200] flex items-center justify-center text-xs font-bold gap-4 shadow-sm animate-in slide-in-from-top">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Viewing system as {currentUser?.name}
          </span>
          <button onClick={stopMasquerading} className="bg-amber-900 text-white px-3 h-6 rounded-full hover:bg-black transition-colors flex items-center gap-1">
            Exit View
          </button>
        </div>
      )}

      <header className={`print:hidden sticky ${isMasquerading ? 'top-8' : 'top-0'} z-[110] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all`}>
        <div className="max-w-[1700px] mx-auto h-16 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0 pr-3 xl:pr-5 border-r border-slate-200/60 dark:border-slate-800/60">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Open Navigation Menu"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>

            <Link to="/admin" className="flex items-center gap-2.5 group">
              <div className="h-9 w-auto flex items-center justify-center transition-transform group-hover:scale-105">
                <img src="/logo.png" alt="SHRAWELLO Logo" className="h-full object-contain drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-base tracking-tight leading-none text-slate-900 dark:text-white">SHRAWELLO</span>
                <span className="text-[9px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase tracking-[0.18em] mt-0.5">Admin Hub</span>
              </div>
            </Link>
          </div>
          {/* Desktop Top Primary Categories Navigation Tabs */}
          <nav ref={megaMenuRef} className="hidden lg:flex items-center gap-1 xl:gap-1.5 relative h-full shrink-0">
            {visibleCategories.map((category, catIdx) => {
              const isCategoryActive = category.items.some(item =>
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              );
              const isOpen = activeMegaCategory === category.key;
              const liveStatBadge = getCategoryStatBadge(category.key);
              const isRightAligned = catIdx >= Math.floor(visibleCategories.length / 2);

              return (
                <div
                  key={category.key}
                  className="relative h-full flex items-center shrink-0"
                  onMouseEnter={() => setActiveMegaCategory(category.key)}
                >
                  <button
                    onClick={() => setActiveMegaCategory(isOpen ? null : category.key)}
                    className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isCategoryActive || isOpen
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md ring-2 ring-indigo-500/30 scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 ${
                      isCategoryActive || isOpen ? 'text-indigo-400 dark:text-indigo-600' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {category.icon}
                    </span>
                    <span className="whitespace-nowrap tracking-tight">{category.title}</span>
                    
                    {/* Live Stat Badge Pill */}
                    <span className={`hidden 2xl:inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                      isCategoryActive || isOpen
                        ? 'bg-indigo-500/30 text-indigo-200 dark:bg-indigo-100 dark:text-indigo-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50'
                    }`}>
                      {liveStatBadge}
                    </span>

                    <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'
                    }`}>
                      expand_more
                    </span>
                  </button>

                  {/* 2-Column Pro Max Mega-Menu Dropdown Popover with Smart Alignment */}
                  {isOpen && (
                    <div
                      onMouseLeave={() => setActiveMegaCategory(null)}
                      className={`absolute top-full mt-2 w-[680px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-950/20 border border-slate-200/90 dark:border-slate-800 z-[150] animate-in fade-in zoom-in-95 overflow-hidden flex ${
                        isRightAligned ? 'right-0' : 'left-0'
                      }`}
                    >
                      {/* Left Column: Category Summary & Quick Action Card */}
                      <div className="w-56 bg-gradient-to-b from-slate-50/80 to-indigo-50/40 dark:from-slate-900 dark:to-slate-800/50 p-4 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between shrink-0">
                        <div>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="size-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                              <span className="material-symbols-outlined text-[18px]">{category.icon}</span>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{category.title}</p>
                              <p className="text-[10px] font-semibold text-slate-400">{category.items.length} Active Modules</p>
                            </div>
                          </div>

                          <div className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm space-y-1 mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Metric</p>
                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{liveStatBadge}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Synced with MySQL tables</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {/* Quick Action Trigger */}
                          {hasPermission(category.quickAction.module as any, 'manage') && (
                            <button
                              onClick={() => {
                                navigate(category.quickAction.path);
                                setActiveMegaCategory(null);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">{category.quickAction.icon}</span>
                              <span className="truncate">{category.quickAction.label}</span>
                            </button>
                          )}

                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
                            <span>Shortcut</span>
                            <span className="bg-slate-200/70 dark:bg-slate-700/70 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono">{category.altShortcut}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Subcategories Grid */}
                      <div className="flex-1 p-3 grid grid-cols-2 gap-2 max-h-[440px] overflow-y-auto overscroll-contain">
                        {category.items.map((item) => {
                          const isItemActive = item.path === '/admin'
                            ? location.pathname === '/admin'
                            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setActiveMegaCategory(null)}
                              className={`flex items-start gap-2.5 p-2.5 rounded-2xl transition-all duration-150 group text-left ${
                                isItemActive
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                              }`}
                            >
                              <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                isItemActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-500 group-hover:text-white'
                              }`}>
                                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-xs font-bold truncate ${
                                    isItemActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white group-hover:text-indigo-500'
                                  }`}>
                                    {item.name}
                                  </p>
                                  {item.tag && (
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-1 shrink-0">
                                      {item.tag}
                                    </span>
                                  )}
                                </div>
                                {item.desc && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                                    {item.desc}
                                  </p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Section Header Controls (Anchored & Shrink-0) */}
          <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
            
            {/* Search Bar Input Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 h-10 px-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium border border-transparent"
              title="Search System (Cmd/Ctrl + K)"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span className="hidden xl:inline text-slate-400">Search...</span>
              <span className="hidden xl:inline-flex text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                ⌘K
              </span>
            </button>

            {/* Quick KPI Stats Pills (Shown on 2xl+ monitors) */}
            <div className="hidden 2xl:flex items-center gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200/50 dark:border-emerald-800/30">
                <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                <span>{bookings.length} Bookings</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-amber-200/50 dark:border-amber-800/30">
                <span className="material-symbols-outlined text-[14px]">groups</span>
                <span>{leads.length} Leads</span>
              </div>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative size-10 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors border border-transparent"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {(followUps.some(f => f.status === 'Pending' && f.reminderEnabled && f.scheduledAt && new Date(f.scheduledAt) <= new Date() && !dismissedIds.has(f.id)) ||
                  inAppNotifications.some(n => !n.isRead)) && (
                  <span className="absolute top-2 right-2 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0F172A] animate-pulse" />
                )}
              </button>

              {/* Notifications Popover */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[140]" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[150] animate-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-indigo-500">notifications_active</span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                      </div>
                      {unifiedItems.length > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-red-500 text-white rounded-full">
                          {unifiedItems.length} active
                        </span>
                      )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto overscroll-contain divide-y divide-slate-50 dark:divide-slate-800/50">
                      {unifiedItems.length === 0 ? (
                        <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                          <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-emerald-500">check_circle</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">All caught up!</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">No pending notifications</p>
                        </div>
                      ) : (
                        unifiedItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (item.type === 'followup') {
                                navigate('/admin/leads');
                                setIsNotificationsOpen(false);
                              } else {
                                handleMarkNotificationRead(item.id);
                              }
                            }}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          >
                            <div className="flex gap-3">
                              <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">
                                  {item.type === 'followup' ? 'alarm' : 'notifications'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{item.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="flex-1 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-200"
                      >
                        ✓ Mark All Read
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Avatar & Dropdown (Always Anchored & Visible) */}
            <div ref={profileMenuRef} className="relative shrink-0">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                <div className="size-9 lg:size-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs lg:text-sm shadow-md ring-2 ring-indigo-500/20 shrink-0">
                  {currentUser.initials}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-tight pr-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{currentUser.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{currentUser.role}</span>
                </div>
                <span className="hidden xl:inline material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
              </button>

              {/* Profile Menu Popover */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[150] animate-in slide-in-from-top-2 p-2 space-y-1">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">{currentUser.email || currentUser.role}</p>
                  </div>
                  <Link
                    to="/"
                    target="_blank"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-indigo-500">open_in_new</span>
                    <span>View Live Website</span>
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-purple-500">settings</span>
                    <span>Account Settings</span>
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Secondary Horizontal Sub-Navigation Bar */}
      <div className="print:hidden bg-slate-100/90 dark:bg-[#0B1116] border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-8 py-2 transition-all">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          
          {/* Breadcrumb Context Path */}
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto text-slate-500 font-medium py-0.5 scrollbar-none">
            <Link to="/admin" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-[16px] text-slate-400">home</span>
              <span>Admin</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
              <span className="material-symbols-outlined text-[15px] text-indigo-500">{activeCategoryInfo.activeCat.icon}</span>
              <span>{activeCategoryInfo.activeCat.title}</span>
            </div>
            
            {/* Vertical Separator */}
            <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700/70 mx-0.5" />

            {/* Active Page Indicator */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              <span>{activeCategoryInfo.activeCat.items.length} Modules</span>
            </span>
          </div>

          {/* Floating Segmented Control Track for Sub-Navigation Tabs */}
          {activeCategoryInfo.activeCat.items.length > 1 && (
            <div className="relative flex-1 md:flex-initial min-w-0 max-w-full">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto scrollbar-none shadow-inner">
                {activeCategoryInfo.activeCat.items.map((subItem) => {
                  const isSubActive = subItem.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/');
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 select-none ${
                        isSubActive
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-700 transform scale-[1.02]'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[15px] transition-colors ${
                        isSubActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {subItem.icon}
                      </span>
                      <span className="whitespace-nowrap">{subItem.name}</span>
                      
                      {isSubActive && (
                        <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse ml-0.5" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[300px] bg-white dark:bg-[#0F172A] shadow-2xl flex flex-col z-[210] animate-in slide-in-from-left">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">SHRAWELLO</span>
              </div>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {visibleCategories.map((category) => {
                const isExpanded = mobileExpandedCat === category.key;
                return (
                  <div key={category.key} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setMobileExpandedCat(isExpanded ? null : category.key)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 font-bold text-xs text-slate-900 dark:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-[18px]">{category.icon}</span>
                        <span>{category.title}</span>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="p-2 space-y-1 bg-white dark:bg-[#0F172A]">
                        {category.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600"
                          >
                            <span className="material-symbols-outlined text-[18px] text-slate-400">{item.icon}</span>
                            <span>{item.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const dueBookings = getPaymentDueBookings(bookings, 15);
        const nudgeId = 'payment-nudge-global';
        if (dueBookings.length === 0 || isDismissed(nudgeId) || isSnoozed(nudgeId)) return null;
        const first = dueBookings[0];
        const daysLeft = Math.ceil((new Date(first.date).getTime() - Date.now()) / 86_400_000);
        return (
          <div className="max-w-[1700px] mx-auto w-full px-4 lg:px-8 pt-3">
            <SuggestPopup
              id={nudgeId}
              variant="banner"
              icon="payments"
              color="red"
              title={`${dueBookings.length} booking${dueBookings.length > 1 ? 's' : ''} with unpaid balance before departure!`}
              description={`${first.customer}'s trip departs in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — collect ₹${(first.amount - (first.payment === 'Deposit' ? Math.round(first.amount * 0.3) : 0)).toLocaleString()} now.`}
              primaryAction={{ label: 'View Bookings', icon: 'open_in_new', onClick: () => navigate('/admin/bookings?filter=unpaid') }}
              snoozeMinutes={60 * 4}
            />
          </div>
        );
      })()}

      {location.pathname === '/admin' && (() => {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        const thisMonthRevenue = bookings.filter(b => b.date >= thisMonthStart && b.payment !== 'Refunded').reduce((s, b) => s + (b.amount || 0), 0);
        const lastMonthRevenue = bookings.filter(b => b.date >= lastMonthStart && b.date <= lastMonthEnd && b.payment !== 'Refunded').reduce((s, b) => s + (b.amount || 0), 0);
        const revenueDrop = lastMonthRevenue > 0 ? Math.round(((lastMonthRevenue - thisMonthRevenue) / lastMonthRevenue) * 100) : 0;
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];
        const newLeadsThisWeek = leads.filter(l => (l.createdAt || '').split('T')[0] >= weekAgo).length;
        const totalLeads = leads.length;
        const convertedLeads = leads.filter(l => l.status === 'Converted').length;
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
        return (
          <div className="max-w-[1700px] mx-auto w-full px-4 lg:px-8 pt-2 space-y-2">
            {revenueDrop >= 15 && !isSnoozed('dashboard-revenue-drop') && !isDismissed('dashboard-revenue-drop') && (
              <SuggestPopup
                id="dashboard-revenue-drop"
                variant="banner"
                icon="trending_down"
                color="red"
                title={`Revenue is ${revenueDrop}% below last month`}
                description="Consider launching a promotional offer or following up with warm leads to boost this month's numbers."
                primaryAction={{ label: 'View Analytics', icon: 'bar_chart', onClick: () => navigate('/admin/analytics') }}
                snoozeMinutes={60 * 24}
              />
            )}
            {newLeadsThisWeek === 0 && totalLeads > 0 && !isSnoozed('dashboard-no-leads-week') && !isDismissed('dashboard-no-leads-week') && (
              <SuggestPopup
                id="dashboard-no-leads-week"
                variant="banner"
                icon="person_search"
                color="amber"
                title="No new leads this week!"
                description="Your pipeline is dry. Consider running a WhatsApp campaign or promoting a new package to generate inquiries."
                primaryAction={{ label: 'Go to Marketing', icon: 'campaign', onClick: () => navigate('/admin/marketing') }}
                snoozeMinutes={60 * 24 * 3}
              />
            )}
            {totalLeads >= 10 && conversionRate < 10 && !isSnoozed('dashboard-low-conversion') && !isDismissed('dashboard-low-conversion') && (
              <SuggestPopup
                id="dashboard-low-conversion"
                variant="banner"
                icon="funnel"
                color="purple"
                title={`Only ${conversionRate}% of leads are converting`}
                description="Review your proposal quality and follow-up frequency. Hot leads older than 3 days with no contact are likely going cold."
                primaryAction={{ label: 'View Leads', icon: 'groups', onClick: () => navigate('/admin/leads') }}
                snoozeMinutes={60 * 24 * 7}
              />
            )}
          </div>
        );
      })()}

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 lg:px-8 py-6 print:p-0 scroll-smooth overflow-x-hidden min-w-0">
        <ErrorBoundary fallbackTitle="Page failed to load">
          <Outlet />
        </ErrorBoundary>
      </main>

      {(() => {
        const vendorDue: Array<{ name: string; amount: number; daysLeft: number }> = [];
        bookings.forEach(b => {
          (b as any).supplierBookings?.forEach((sb: any) => {
            if (sb.paymentStatus === 'Unpaid' && sb.paymentDueDate) {
              const d = Math.ceil((new Date(sb.paymentDueDate).getTime() - Date.now()) / 86_400_000);
              if (d >= 0 && d <= 7) vendorDue.push({ name: sb.vendorName || 'Vendor', amount: sb.totalCost || 0, daysLeft: d });
            }
          });
        });
        if (vendorDue.length === 0) return null;
        const v = vendorDue[vendorAlertIdx % vendorDue.length];
        const nudgeId = `vendor-due-${v.name}-${v.daysLeft}`;
        if (isDismissed(nudgeId)) return null;
        return (
          <div className="fixed bottom-6 left-4 right-4 md:left-[300px] md:right-auto z-[49]">
            <SuggestPopup
              id={nudgeId}
              variant="float"
              icon="storefront"
              color="amber"
              title={`Vendor payment due in ${v.daysLeft} day${v.daysLeft !== 1 ? 's' : ''}!`}
              description={`₹${v.amount.toLocaleString()} owed to ${v.name}. Pay before the deadline to avoid issues.`}
              primaryAction={{ label: 'View Vendors', icon: 'open_in_new', onClick: () => navigate('/admin/vendors') }}
              snoozeMinutes={60 * 24}
              autoDismissMs={15000}
            />
          </div>
        );
      })()}

      {(() => {
        if (!currentUser) return null;
        const myOverdue = followUps.filter(f =>
          f.status === 'Pending' &&
          f.scheduledAt &&
          new Date(f.scheduledAt) <= new Date()
        ).length;
        const nudgeId = `overdue-backlog-${currentUser.id}`;
        if (myOverdue < 10 || isDismissed(nudgeId) || isSnoozed(nudgeId)) return null;
        return (
          <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[48]">
            <SuggestPopup
              id={nudgeId}
              variant="float"
              icon="warning"
              color="red"
              title={`${myOverdue} overdue follow-ups!`}
              description="Your backlog is growing. Clear overdue items before adding new leads to maintain quality."
              primaryAction={{ label: 'View Follow-ups', icon: 'alarm', onClick: () => navigate('/admin/leads?filter=overdue') }}
              snoozeMinutes={60 * 4}
            />
          </div>
        );
      })()}

      {isUserIdle && !isSnoozed('idle-session-warning') && !isDismissed('idle-session-warning') && (
        <div className="fixed bottom-6 left-4 right-4 md:left-[300px] md:right-auto z-[47]">
          <SuggestPopup
            id="idle-session-warning"
            variant="float"
            icon="timer"
            color="amber"
            title="Still working?"
            description="You've been inactive for 20 minutes. Save any unsaved changes — your session may expire soon."
            primaryAction={{ label: "I'm still here", icon: 'check', onClick: () => setIsUserIdle(false) }}
            snoozeMinutes={30}
            autoDismissMs={60000}
          />
        </div>
      )}

      {showPositiveReinforcement && (
        <div className="fixed bottom-6 left-4 right-4 md:left-[300px] md:right-auto z-[46]">
          <SuggestPopup
            id={`positive-reinforcement-${sessionBookingsProcessed}`}
            variant="float"
            icon="celebration"
            color="emerald"
            title={`${sessionBookingsProcessed} bookings processed today! 🔥`}
            description="You're on a roll! Great work keeping the pipeline moving. Keep it up!"
            autoDismissMs={8000}
          />
        </div>
      )}

      <div className="fixed bottom-6 right-4 lg:right-6 z-50">
        {isFabOpen && (
          <div className="absolute bottom-16 right-0 mb-2 space-y-2 animate-slide-up">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => { navigate(action.path); setIsFabOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 hover:scale-105 transition-all group whitespace-nowrap"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`size-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg`}>
                  <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{action.name}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center transition-all duration-300 hover:shadow-indigo-500/50 hover:scale-105 ${isFabOpen ? 'rotate-45' : ''}`}
        >
          <span className="material-symbols-outlined text-[28px]">{isFabOpen ? 'close' : 'add'}</span>
        </button>
      </div>

      {showMorningBriefing && (() => {
        const overdueFollowUps = followUps.filter(f => f.status === 'Pending' && f.scheduledAt && new Date(f.scheduledAt) <= new Date()).length;
        const todayDepartures = bookings.filter(b => b.date === new Date().toISOString().split('T')[0] && b.status === 'Confirmed').length;
        const unpaidBookings = bookings.filter(b => b.payment === 'Unpaid').length;
        const hotLeads = leads.filter(l => l.status === 'Hot').length;
        return (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{currentUser.name.split(' ')[0]}! Here's your day ☀️</h3>
                  </div>
                  <button onClick={() => { setShowMorningBriefing(false); localStorage.setItem('morning_briefing_last_shown', new Date().toDateString()); }} className="size-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="space-y-3 mb-6">
                  {overdueFollowUps > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                      <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">alarm</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{overdueFollowUps} overdue follow-up{overdueFollowUps > 1 ? 's' : ''}</p>
                        <p className="text-xs text-slate-500">Need immediate attention</p>
                      </div>
                    </div>
                  )}
                  {todayDepartures > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                      <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{todayDepartures} booking{todayDepartures > 1 ? 's' : ''} departing today</p>
                        <p className="text-xs text-slate-500 font-medium">Check itineraries are shared</p>
                      </div>
                    </div>
                  )}
                  {unpaidBookings > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                      <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{unpaidBookings} unpaid booking{unpaidBookings > 1 ? 's' : ''}</p>
                        <p className="text-xs text-slate-500">Collect payment before departure</p>
                      </div>
                    </div>
                  )}
                  {hotLeads > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30">
                      <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{hotLeads} hot lead{hotLeads > 1 ? 's' : ''} need a proposal</p>
                        <p className="text-xs text-slate-500">Strike while the iron is hot!</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigate('/admin/leads'); setShowMorningBriefing(false); localStorage.setItem('morning_briefing_last_shown', new Date().toDateString()); }}
                    className="flex-1 py-3 text-sm font-bold text-white rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:opacity-90 transition-opacity"
                  >
                    Start with Leads →
                  </button>
                  <button
                    onClick={() => { setShowMorningBriefing(false); localStorage.setItem('morning_briefing_last_shown', new Date().toDateString()); }}
                    className="px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCommandPaletteOpen(false)} />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search modules, pages or actions..."
                className="flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder:text-slate-400 text-slate-900 dark:text-white"
                autoFocus
              />
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">ESC</span>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              <div className="px-3 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Modules & Pages</p>
                <div className="space-y-1">
                  {filteredNavItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { navigate(item.path); setIsCommandPaletteOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group text-left"
                    >
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 transition-colors text-[20px]">{item.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{item.name}</span>
                      <span className="ml-auto text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Go →</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
