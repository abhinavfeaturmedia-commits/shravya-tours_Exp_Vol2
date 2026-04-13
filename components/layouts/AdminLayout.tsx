
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import { SuggestPopup, isDismissed, isSnoozed, dismissSuggestion, snoozeSuggestion } from '../../components/ui/SuggestPopup';
import { getPaymentDueBookings } from '../../src/hooks/useSuggestions';

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/admin', icon: 'dashboard', module: 'dashboard' },
      { name: 'Analytics', path: '/admin/analytics', icon: 'bar_chart', module: 'reports' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Bookings', path: '/admin/bookings', icon: 'airplane_ticket', module: 'bookings' },
      { name: 'Inventory', path: '/admin/inventory', icon: 'calendar_month', module: 'inventory' },
      { name: 'Vendors', path: '/admin/vendors', icon: 'storefront', module: 'vendors' },
      { name: 'Itinerary Builder', path: '/admin/itinerary-builder', icon: 'map', module: 'itinerary' },
      { name: 'Live Operations', path: '/admin/operations', icon: 'traffic', module: 'bookings' },
      { name: 'Masters', path: '/admin/masters', icon: 'dataset', module: 'masters' },
    ]
  },
  {
    title: 'Growth',
    items: [
      { name: 'Leads CRM', path: '/admin/leads', icon: 'groups', module: 'leads' },
      { name: 'Customers', path: '/admin/customers', icon: 'face', module: 'customers' },
      { name: 'Accounts', path: '/admin/accounts', icon: 'account_balance', module: 'finance' },
      { name: 'Expenses', path: '/admin/expenses', icon: 'receipt_long', module: 'finance' },
      { name: 'Payment Approvals', path: '/admin/finance-verification', icon: 'fact_check', module: 'finance' },
      { name: 'Proposals', path: '/admin/proposals', icon: 'description', module: 'leads' },
    ]
  },
  {
    title: 'People & Content',
    items: [
      { name: 'Staff', path: '/admin/staff', icon: 'badge', module: 'staff' },
      { name: 'Team Performance', path: '/admin/team-performance', icon: 'monitoring', module: 'staff' },
      { name: 'Packages', path: '/admin/packages', icon: 'inventory_2', module: 'inventory' },
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'Audit Logs', path: '/admin/audit', icon: 'history', module: 'audit' },
      { name: 'Productivity', path: '/admin/productivity', icon: 'insights', module: 'staff' },
    ]
  }
];

export const AdminLayout: React.FC = () => {
  const { currentUser, logout, isAuthenticated, isLoading, isMasquerading, stopMasquerading, realUser, hasPermission } = useAuth();
  const { bookings, leads, followUps, updateFollowUp, packages, vendors } = useData(); // Connect to real data
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Smart popup state
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [paymentNudgeDismissed, setPaymentNudgeDismissed] = useState(false);
  const [vendorAlertIdx, setVendorAlertIdx] = useState(0);
  const [isUserIdle, setIsUserIdle] = useState(false);
  const [sessionBookingsProcessed, setSessionBookingsProcessed] = useState(0);
  const [showPositiveReinforcement, setShowPositiveReinforcement] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Global Notification Check for Follow-ups — guarded by isAuthenticated
  useEffect(() => {
    if (!isAuthenticated) return; // Do NOT fire toasts before login
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
          action: {
            label: 'View',
            onClick: () => navigate('/admin/leads')
          },
          duration: 10000,
        });
        setNotifiedIds(prev => new Set(prev).add(f.id));
      });
    };

    const timer = setInterval(checkFollowUps, 30000);
    checkFollowUps();
    return () => clearInterval(timer);
  }, [isAuthenticated, followUps, notifiedIds, navigate]);

  // Morning briefing — show once per day after login
  useEffect(() => {
    if (!isAuthenticated) return;
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('morning_briefing_last_shown');
    if (lastShown !== today) {
      // Slight delay so dashboard data has time to load
      const t = setTimeout(() => setShowMorningBriefing(true), 1500);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

  // Vendor alert cycling
  useEffect(() => {
    const interval = setInterval(() => setVendorAlertIdx(i => i + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  // Idle detection — triggers after 20 minutes of no interaction
  useEffect(() => {
    if (!isAuthenticated) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      setIsUserIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsUserIdle(true), 20 * 60 * 1000); // 20 minutes
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle(); // Start timer
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer);
    };
  }, [isAuthenticated]);

  // Track bookings processed this session for positive reinforcement
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

  // Route Protection: Redirect if not logged in (wait for auth to finish loading first)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    toast.dismiss(); // Clear any active toasts before leaving admin
    logout();
    navigate('/', { replace: true });
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsCommandPaletteOpen(true);
      setCommandSearch((e.target as HTMLInputElement).value);
    }
  };

  const handleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        setCommandSearch('');
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsFabOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (path: string) => {
    const active = path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);

    return active
      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900"
      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white";
  };

  // Route Protection: Permission Check
  useEffect(() => {
    if (!currentUser) return;

    // Find the closest matching route definition
    const allRoutes = NAV_GROUPS.flatMap(g => g.items)
      .sort((a, b) => b.path.length - a.path.length); // Match specific paths first

    const activeRoute = allRoutes.find(route =>
      location.pathname === route.path ||
      location.pathname.startsWith(route.path + '/')
    );

    if (activeRoute) {
      if (!hasPermission(activeRoute.module as any, 'view')) {
        toast.error(`Access Denied: You do not have permission to view ${activeRoute.name}.`);
        navigate('/admin', { replace: true });
      }
    }
  }, [location.pathname, currentUser, hasPermission, navigate]);

  const navGroups = NAV_GROUPS;

  // Filter Nav Groups based on permissions
  const visibleNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => hasPermission(item.module as any, 'view'))
  })).filter(group => group.items.length > 0);

  // Flatten nav items for command palette search
  const allNavItems = visibleNavGroups.flatMap(g => g.items);

  // Quick actions for FAB
  const quickActions = [
    { name: 'New Booking', icon: 'add_circle', path: '/admin/bookings', color: 'from-blue-500 to-indigo-600', module: 'bookings' },
    { name: 'Add Lead', icon: 'person_add', path: '/admin/leads', color: 'from-purple-500 to-pink-600', module: 'leads' },
    { name: 'Create Package', icon: 'travel_explore', path: '/admin/itinerary-builder', color: 'from-emerald-500 to-teal-600', module: 'inventory' },
    { name: 'Add Master Data', icon: 'dataset', path: '/admin/masters', color: 'from-orange-500 to-rose-500', module: 'masters' },
  ].filter(action => hasPermission(action.module as any, 'manage'));

  // Filter nav items for command palette
  const filteredNavItems = commandSearch
    ? allNavItems.filter(item =>
      item.name.toLowerCase().includes(commandSearch.toLowerCase())
    )
    : allNavItems;

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0B1116]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 animate-pulse">
            <span className="material-symbols-outlined text-[24px]">travel_explore</span>
          </div>
          <p className="text-sm font-semibold text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) return null;

  return (
    <div className="bg-slate-50 dark:bg-[#0B1116] text-slate-900 dark:text-slate-100 flex h-screen overflow-hidden font-sans relative">
      {/* Masquerade Banner */}
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
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Side Navigation - Modernized */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-[280px] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 
        transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] z-[110] flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-12 w-auto flex items-center justify-center transition-transform hover:scale-105">
              <img src="/logo.png" alt="Shravya Tours Logo" className="h-full object-contain drop-shadow-sm" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight leading-none text-slate-900 dark:text-white">Shravya</span>
              <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase tracking-[0.2em] mt-0.5">Admin Panel</span>
            </div>
          </Link>
          <button className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" onClick={closeSidebar}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6 scrollbar-thin">
          {visibleNavGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = isActive(item.path).includes('bg-slate-900');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeSidebar}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group overflow-hidden
                        ${active
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                        }
                      `}
                    >
                      {active && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      <span className={`material-symbols-outlined text-[20px] transition-all duration-200 ${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 group-hover:scale-110'}`}>
                        {item.icon}
                      </span>
                      <span className="relative z-10">{item.name}</span>
                      {active && (
                        <div className="ml-auto flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 space-y-3">
          {/* Quick Stats */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{bookings.length}</p>
              <p className="text-[9px] font-bold text-emerald-600/70 uppercase">Bookings</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">{leads.length}</p>
              <p className="text-[9px] font-bold text-amber-600/70 uppercase">Leads</p>
            </div>
          </div>

          <Link to="/" target="_blank" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 font-semibold transition-all text-xs group">
            <span className="material-symbols-outlined text-[18px] group-hover:text-indigo-500 transition-colors">open_in_new</span>
            <span>View Live Website</span>
          </Link>
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-all text-xs cursor-pointer group">
            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">logout</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50 dark:bg-[#0B1116]">

        {/* Sticky Top Header */}
        <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-[#151d29]/80 backdrop-blur-xl z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={toggleSidebar}
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            {/* Breadcrumb or Page Title placeholder could go here */}
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            {/* Modern Search Bar */}
            <div className="hidden lg:flex relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px] group-focus-within:text-primary transition-colors">search</span>
              <input
                className="h-11 w-80 bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-12 pr-12 text-sm font-semibold focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 transition-all focus:w-96 focus:bg-white dark:focus:bg-slate-900 shadow-sm"
                placeholder="Search anything..."
                type="text"
                onKeyDown={handleSearch}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">/</span>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button onClick={handleNotifications} className="relative p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {followUps.filter(f => f.status === 'Pending' && f.reminderEnabled && f.scheduledAt && new Date(f.scheduledAt) <= new Date() && !dismissedIds.has(f.id)).length > 0 && (
                  <span className="absolute top-2.5 right-2.5 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#151d29] animate-pulse"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[140]" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[150] animate-in slide-in-from-top-2">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-indigo-500">notifications_active</span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const count = followUps.filter(f => f.status === 'Pending' && f.reminderEnabled && f.scheduledAt && new Date(f.scheduledAt) <= new Date() && !dismissedIds.has(f.id)).length;
                          return count > 0 ? (
                            <span className="text-xs font-bold px-2 py-0.5 bg-red-500 text-white rounded-full">{count} overdue</span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[60vh] overflow-y-auto overscroll-contain divide-y divide-slate-50 dark:divide-slate-800/50">
                      {(() => {
                        const pendingFollowUps = followUps
                          .filter(f =>
                            f.status === 'Pending' &&
                            f.reminderEnabled &&
                            f.scheduledAt &&
                            new Date(f.scheduledAt) <= new Date() &&
                            !dismissedIds.has(f.id)
                          )
                          .sort((a, b) => {
                            const priorityVal: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
                            const pDiff = (priorityVal[b.priority || 'Medium'] as number) - (priorityVal[a.priority || 'Medium'] as number);
                            if (pDiff !== 0) return pDiff;
                            return new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime();
                          });

                        const getRelativeTime = (dateStr: string) => {
                          const diff = Date.now() - new Date(dateStr).getTime();
                          const mins = Math.floor(diff / 60000);
                          const hrs = Math.floor(mins / 60);
                          const days = Math.floor(hrs / 24);
                          if (days > 0) return `${days}d overdue`;
                          if (hrs > 0) return `${hrs}h overdue`;
                          if (mins > 0) return `${mins}m overdue`;
                          return 'Just now';
                        };

                        if (pendingFollowUps.length === 0) {
                          return (
                            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                              <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-emerald-500">check_circle</span>
                              </div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">All caught up!</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">No pending follow-ups</p>
                            </div>
                          );
                        }

                        return pendingFollowUps.map((f, idx) => (
                          <div
                            key={f.id}
                            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${
                              idx === 0 ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              {/* Icon */}
                              <div className={`size-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                                f.priority === 'High'
                                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                                  : f.priority === 'Low'
                                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                              }`}>
                                <span className="material-symbols-outlined text-[16px]">alarm</span>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    {f.leadName || 'Unknown Lead'}
                                  </p>
                                  {/* Dismiss X */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDismissedIds(prev => new Set(prev).add(f.id));
                                    }}
                                    className="shrink-0 size-5 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                    title="Dismiss"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                  {f.description || f.notes || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      f.priority === 'High' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                      : f.priority === 'Low' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                      {f.priority || 'Med'}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[11px]">schedule</span>
                                      {getRelativeTime(f.scheduledAt!)}
                                    </span>
                                  </div>

                                  {/* Mark Done button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateFollowUp(f.id, { 
                                        status: 'Done', 
                                        completedAt: new Date().toISOString() 
                                      });
                                    }}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                    title="Mark as Done"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">check</span>
                                    Done
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                      <button
                        onClick={() => {
                          // Mark all visible (non-dismissed, pending) as Completed
                          followUps
                            .filter(f => f.status === 'Pending' && f.reminderEnabled && f.scheduledAt && new Date(f.scheduledAt) <= new Date() && !dismissedIds.has(f.id))
                            .forEach(f => updateFollowUp(f.id, { 
                              status: 'Done', 
                              completedAt: new Date().toISOString() 
                            }));
                        }}
                        className="flex-1 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all border border-emerald-200 dark:border-emerald-800/50"
                      >
                        ✓ Mark All Done
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/leads');
                          setIsNotificationsOpen(false);
                        }}
                        className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                      >
                        View Leads →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700 h-8">
              <div className="text-right hidden lg:block leading-tight">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{currentUser.role} ({currentUser.userType})</p>
              </div>
              <div className={`size-10 rounded-full bg-${currentUser.color}-100 dark:bg-${currentUser.color}-900 flex items-center justify-center font-bold text-${currentUser.color}-600 dark:text-${currentUser.color}-400 text-sm ring-4 ring-slate-100 dark:ring-slate-800 shadow-md cursor-pointer hover:ring-primary/20 transition-all`}>
                {currentUser.initials}
              </div>
            </div>
          </div>
        </header>

        {/* ── Payment Collection Nudge Banner ── */}
        {(() => {
          const dueBookings = getPaymentDueBookings(bookings, 15);
          const nudgeId = 'payment-nudge-global';
          if (dueBookings.length === 0 || isDismissed(nudgeId) || isSnoozed(nudgeId)) return null;
          const first = dueBookings[0];
          const daysLeft = Math.ceil((new Date(first.date).getTime() - Date.now()) / 86_400_000);
          return (
            <div className="px-6 pt-3">
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

        {/* ── Dashboard Intelligence Banners (only shown on /admin dashboard) ── */}
        {location.pathname === '/admin' && (() => {
          // #8: Revenue drop — compare this month vs last month
          const now = new Date();
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
          const thisMonthRevenue = bookings.filter(b => b.date >= thisMonthStart && b.payment !== 'Refunded').reduce((s, b) => s + (b.amount || 0), 0);
          const lastMonthRevenue = bookings.filter(b => b.date >= lastMonthStart && b.date <= lastMonthEnd && b.payment !== 'Refunded').reduce((s, b) => s + (b.amount || 0), 0);
          const revenueDrop = lastMonthRevenue > 0 ? Math.round(((lastMonthRevenue - thisMonthRevenue) / lastMonthRevenue) * 100) : 0;

          // #9: Zero new leads this week
          const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];
          const newLeadsThisWeek = leads.filter(l => (l.createdAt || '').split('T')[0] >= weekAgo).length;

          // #10: Low conversion rate (<10% of leads converted)
          const totalLeads = leads.length;
          const convertedLeads = leads.filter(l => l.status === 'Converted').length;
          const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

          return (
            <div className="px-6 pt-2 space-y-2">
              {/* #8 Revenue Drop */}
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
              {/* #9 Zero new leads this week */}
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
              {/* #10 Low conversion rate */}
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

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <Outlet />
        </div>

        {/* ── Vendor Payment Due – Floating Alert (bottom-left) ── */}
        {(() => {
          // Gather supplier bookings with unpaid payment due within 7 days
          // We use bookings.supplierBookings which may exist on some bookings
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
            <div className="fixed bottom-6 left-[300px] z-[49]">
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

        {/* ── #15: Overdue Backlog Warning (staff login) ── */}
        {(() => {
          if (!currentUser) return null;
          const isStaff = currentUser.role === 'Staff';
          const myOverdue = followUps.filter(f =>
            f.status === 'Pending' &&
            f.scheduledAt &&
            new Date(f.scheduledAt) <= new Date()
          ).length;
          const nudgeId = `overdue-backlog-${currentUser.id}`;
          if (myOverdue < 10 || isDismissed(nudgeId) || isSnoozed(nudgeId)) return null;
          return (
            <div className="fixed bottom-24 right-6 z-[48]">
              <SuggestPopup
                id={nudgeId}
                variant="float"
                icon="warning"
                color="red"
                title={`${myOverdue} overdue follow-ups!`}
                description="Your backlog is growing. Clear overdue items before adding new leads to maintain quality."
                primaryAction={{ label: 'View Follow-ups', icon: 'alarm', onClick: () => navigate('/admin/leads') }}
                snoozeMinutes={60 * 4}
              />
            </div>
          );
        })()}

        {/* ── #16: Idle Session Warning ── */}
        {isUserIdle && !isSnoozed('idle-session-warning') && !isDismissed('idle-session-warning') && (
          <div className="fixed bottom-6 left-[300px] z-[47]">
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

        {/* ── #17: Positive Reinforcement ── */}
        {showPositiveReinforcement && (
          <div className="fixed bottom-6 left-[300px] z-[46]">
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

        {/* Floating Action Button (FAB) */}
        <div className="fixed bottom-6 right-6 z-50">
          {/* FAB Menu */}
          {isFabOpen && (
            <div className="absolute bottom-16 right-0 mb-2 space-y-2 animate-slide-up">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => { navigate(action.path); setIsFabOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 hover:scale-105 transition-all group whitespace-nowrap`}
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

          {/* Main FAB Button */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center transition-all duration-300 hover:shadow-indigo-500/50 hover:scale-105 btn-press ${isFabOpen ? 'rotate-45' : ''}`}
          >
            <span className="material-symbols-outlined text-[28px]">{isFabOpen ? 'close' : 'add'}</span>
          </button>
        </div>
      </div>

      {/* ── Morning Briefing Modal ── */}
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
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{currentUser.name.split(' ')[0]}! Here's your day {new Date().getHours() < 18 ? '☀️' : '🌙'}</h3>
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
                        <p className="text-xs text-slate-500">Check itineraries are shared</p>
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
                  {overdueFollowUps === 0 && todayDepartures === 0 && unpaidBookings === 0 && hotLeads === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                      <span className="material-symbols-outlined text-emerald-500 text-[28px]">check_circle</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">All clear! No urgent items today. Great work!</p>
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

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsCommandPaletteOpen(false)}
          />

          {/* Palette */}
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search pages, actions, or type a command..."
                className="flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder:text-slate-400 text-slate-900 dark:text-white"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">ESC</span>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {/* Pages Section */}
              <div className="px-3 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pages</p>
                <div className="space-y-1">
                  {filteredNavItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { navigate(item.path); setIsCommandPaletteOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group text-left"
                    >
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 transition-colors text-[20px]">{item.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                      <span className="ml-auto text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Go →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions Section */}
              {!commandSearch && (
                <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</p>
                  <div className="space-y-1">
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => { navigate(action.path); setIsCommandPaletteOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group text-left"
                      >
                        <div className={`size-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white`}>
                          <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{action.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">↑↓</span> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">↵</span> Select
                </span>
              </div>
              <span className="font-semibold text-indigo-500">⌘K to toggle</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
