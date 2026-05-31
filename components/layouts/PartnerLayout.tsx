import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/partner/dashboard', icon: 'dashboard' },
  { name: 'Tour Packages', path: '/partner/packages', icon: 'travel_explore' },
  { name: 'Submit Lead', path: '/partner/leads/new', icon: 'person_add' },
  { name: 'My Leads', path: '/partner/leads', icon: 'groups' },
  { name: 'Earnings', path: '/partner/earnings', icon: 'payments' },
  { name: 'Profile', path: '/partner/profile', icon: 'manage_accounts' },
];

export const PartnerLayout: React.FC = () => {
  const { partner, isAuthenticated, isLoading, logout } = usePartnerAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/partner/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/partner/login', { replace: true });
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/partner/dashboard' && location.pathname.startsWith(path));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950">
        <div className="flex flex-col items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-xl animate-pulse">
            <span className="material-symbols-outlined text-[28px]">handshake</span>
          </div>
          <p className="text-white/60 font-semibold text-sm animate-pulse">Loading Partner Portal…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !partner) return null;

  const initials = partner.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'PP';

  return (
    <div className="min-h-screen flex bg-slate-950 relative text-white font-sans overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 w-[280px]
        bg-white/5 backdrop-blur-xl border-r border-white/10
        transform transition-transform duration-300 z-[110] flex flex-col shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-white/10">
          <Link to="/partner/dashboard" className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-[20px]">handshake</span>
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-tight leading-none block">SHRAWELLO</span>
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">Partner Portal</span>
            </div>
          </Link>
          <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Partner Badge */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{partner.name}</p>
                <p className="text-[11px] text-violet-300 truncate">{partner.companyName || partner.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${partner.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
              <span className={`text-[11px] font-bold ${partner.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'}`}>{partner.status}</span>
              <span className="text-[11px] text-white/40 ml-auto">
                {partner.commissionType === 'Percentage' ? `${partner.commissionValue}% commission` : `₹${partner.commissionValue} flat`}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm
                  ${active
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${active ? 'text-white' : 'text-white/40'}`}>
                  {item.icon}
                </span>
                {item.name}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link to="/" target="_blank" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            View Website
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-20 shrink-0">
          <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <span className="font-black text-white">SHRAWELLO</span>
            <span className="text-[10px] text-violet-400 font-bold">Partner</span>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{partner.name}</p>
              <p className="text-[10px] text-white/50">Partner Account</p>
            </div>
            <div className="size-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
