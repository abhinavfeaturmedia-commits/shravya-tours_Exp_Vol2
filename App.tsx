
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { MasterDataProvider } from './context/MasterDataContext';
import { ToastProvider } from './components/ui/Toast';

// Lazy load pages to reduce initial bundle size
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Packages = lazy(() => import('./pages/Packages').then(module => ({ default: module.Packages })));
const PackageDetail = lazy(() => import('./pages/PackageDetail').then(module => ({ default: module.PackageDetail })));
const About = lazy(() => import('./pages/About').then(module => ({ default: module.About })));
const Contact = lazy(() => import('./pages/Contact').then(module => ({ default: module.Contact })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation').then(module => ({ default: module.BookingConfirmation })));
const Terms = lazy(() => import('./pages/Terms').then(module => ({ default: module.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(module => ({ default: module.Privacy })));
const Cancellation = lazy(() => import('./pages/Cancellation').then(module => ({ default: module.Cancellation })));




const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Inventory = lazy(() => import('./pages/admin/Inventory').then(module => ({ default: module.Inventory })));
const Analytics = lazy(() => import('./pages/admin/Analytics').then(module => ({ default: module.Analytics })));
const Operations = lazy(() => import('./pages/admin/Operations').then(module => ({ default: module.Operations })));
const ItineraryBuilder = lazy(() => import('./pages/admin/ItineraryBuilder').then(module => ({ default: module.ItineraryBuilder })));
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement').then(module => ({ default: module.StaffManagement })));
const TeamPerformance = lazy(() => import('./pages/admin/TeamPerformance').then(module => ({ default: module.TeamPerformance })));
const Bookings = lazy(() => import('./pages/admin/Bookings').then(module => ({ default: module.Bookings })));
const AdminLeads = lazy(() => import('./pages/admin/Leads').then(module => ({ default: module.Leads })));
const AdminCustomers = lazy(() => import('./pages/admin/Customers').then(module => ({ default: module.Customers })));
const AdminPackages = lazy(() => import('./pages/admin/Packages').then(module => ({ default: module.AdminPackages })));
const Vendors = lazy(() => import('./pages/admin/Vendors').then(module => ({ default: module.Vendors })));
const AdminAccounts = lazy(() => import('./pages/admin/Accounts').then(module => ({ default: module.Accounts })));
const AdminExpenses = lazy(() => import('./pages/admin/Expenses').then(module => ({ default: module.Expenses })));
const AdminProposals = lazy(() => import('./pages/admin/Proposals').then(module => ({ default: module.Proposals })));
const ProposalBuilder = lazy(() => import('./pages/admin/ProposalBuilder').then(module => ({ default: module.ProposalBuilder })));
const Masters = lazy(() => import('./pages/admin/Masters').then(module => ({ default: module.Masters })));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs').then(module => ({ default: module.AuditLogs })));
const Productivity = lazy(() => import('./pages/admin/Productivity').then(module => ({ default: module.Productivity })));
const FinanceVerification = lazy(() => import('./pages/admin/FinanceVerification').then(module => ({ default: module.FinanceVerification })));


// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm font-medium animate-pulse">Loading...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MasterDataProvider>
        <DataProvider>
          <ToastProvider />
          <HashRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes using PublicLayout (Header/Footer) */}
                <Route path="/" element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="packages" element={<Packages />} />
                  <Route path="packages/:id" element={<PackageDetail />} />
                  <Route path="tours" element={<Navigate to="/packages" replace />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="booking-confirmation" element={<BookingConfirmation />} />
                  <Route path="terms" element={<Terms />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="cancellation" element={<Cancellation />} />
                </Route>

                <Route path="/login" element={<Login />} />

                {/* Admin Routes using AdminLayout (Sidebar/Topbar) */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="operations" element={<Operations />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="vendors" element={<Vendors />} />
                  <Route path="itinerary-builder" element={<ItineraryBuilder />} />
                  <Route path="accounts" element={<AdminAccounts />} />
                  <Route path="expenses" element={<AdminExpenses />} />
                  <Route path="finance-verification" element={<FinanceVerification />} />
                  <Route path="proposals" element={<AdminProposals />} />
                  <Route path="proposals/:id" element={<ProposalBuilder />} />

                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="leads" element={<AdminLeads />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="productivity" element={<Productivity />} />
                  <Route path="staff" element={<StaffManagement />} />
                  <Route path="team-performance" element={<TeamPerformance />} />
                  <Route path="packages" element={<AdminPackages />} />
                  <Route path="masters" element={<Masters />} />
                  <Route path="*" element={<div className="p-10">Page Under Construction</div>} />
                </Route>

                {/* Fallback for unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </HashRouter>
        </DataProvider>
      </MasterDataProvider>
    </AuthProvider>
  );
};

export default App;
