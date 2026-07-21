
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { PartnerLayout } from './components/layouts/PartnerLayout';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { PartnerAuthProvider } from './context/PartnerAuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { MasterDataProvider } from './context/MasterDataContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/ui/Toast';

import { CustomerGuard } from './components/customer/CustomerGuard';

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
const Careers = lazy(() => import('./pages/Careers').then(module => ({ default: module.Careers })));
const InteractiveItinerary = lazy(() => import('./pages/InteractiveItinerary').then(module => ({ default: module.InteractiveItinerary })));




const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Inventory = lazy(() => import('./pages/admin/Inventory').then(module => ({ default: module.Inventory })));
const Analytics = lazy(() => import('./pages/admin/Analytics').then(module => ({ default: module.Analytics })));
const Operations = lazy(() => import('./pages/admin/Operations').then(module => ({ default: module.Operations })));
const ItineraryBuilder = lazy(() => import('./pages/admin/ItineraryBuilder').then(module => ({ default: module.ItineraryBuilder })));
const ItinerariesDashboard = lazy(() => import('./pages/admin/ItinerariesDashboard').then(module => ({ default: module.ItinerariesDashboard })));
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
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs').then(module => ({ default: module.ActivityLogs })));
const Productivity = lazy(() => import('./pages/admin/Productivity').then(module => ({ default: module.Productivity })));
const FinanceVerification = lazy(() => import('./pages/admin/FinanceVerification').then(module => ({ default: module.FinanceVerification })));
const InvoicesDashboard = lazy(() => import('./pages/admin/InvoicesDashboard').then(module => ({ default: module.InvoicesDashboard })));
const DocumentEditor = lazy(() => import('./pages/admin/DocumentEditor').then(module => ({ default: module.DocumentEditor })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then(module => ({ default: module.Settings })));
const TestimonialsManager = lazy(() => import('./pages/admin/TestimonialsManager').then(module => ({ default: module.TestimonialsManager })));
const MembershipManager = lazy(() => import('./pages/admin/MembershipManager').then(module => ({ default: module.MembershipManager })));
const CarRentalManager = lazy(() => import('./pages/admin/CarRentalManager').then(module => ({ default: module.CarRentalManager })));
const SupportInbox = lazy(() => import('./pages/admin/SupportInbox').then(module => ({ default: module.SupportInbox })));
const PartnerManager = lazy(() => import('./pages/admin/PartnerManager').then(module => ({ default: module.PartnerManager })));
const CouponManager = lazy(() => import('./pages/admin/CouponManager').then(module => ({ default: module.CouponManager })));
const MarketingLogs = lazy(() => import('./pages/admin/MarketingLogs').then(module => ({ default: module.MarketingLogs })));
const TrendingDestinationsManager = lazy(() => import('./pages/admin/TrendingDestinationsManager').then(module => ({ default: module.TrendingDestinationsManager })));
const AdminKYCManager = lazy(() => import('./pages/admin/AdminKYCManager').then(module => ({ default: module.AdminKYCManager })));

// Partner Portal Pages
const PartnerLogin = lazy(() => import('./pages/partner/PartnerLogin').then(m => ({ default: m.PartnerLogin })));
const PartnerRegister = lazy(() => import('./pages/partner/PartnerRegister').then(m => ({ default: m.PartnerRegister })));
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })));
const PartnerLeads = lazy(() => import('./pages/partner/PartnerLeads').then(m => ({ default: m.PartnerLeads })));
const PartnerPackages = lazy(() => import('./pages/partner/PartnerPackages').then(m => ({ default: m.PartnerPackages })));
const PartnerSubmitLead = lazy(() => import('./pages/partner/PartnerSubmitLead').then(m => ({ default: m.PartnerSubmitLead })));
const PartnerEarnings = lazy(() => import('./pages/partner/PartnerEarnings').then(m => ({ default: m.PartnerEarnings })));
const PartnerProfile = lazy(() => import('./pages/partner/PartnerProfile').then(m => ({ default: m.PartnerProfile })));
const PartnerMilestones = lazy(() => import('./pages/partner/PartnerMilestones').then(m => ({ default: m.PartnerMilestones })));
const PartnerAgreement = lazy(() => import('./pages/partner/PartnerAgreement').then(m => ({ default: m.PartnerAgreement })));

// Customer Portal Pages
const CustomerLogin = lazy(() => import('./pages/customer/CustomerLogin').then(m => ({ default: m.CustomerLogin })));
const CustomerRegister = lazy(() => import('./pages/customer/CustomerRegister').then(m => ({ default: m.CustomerRegister })));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const BookingDetail = lazy(() => import('./pages/customer/BookingDetail').then(m => ({ default: m.BookingDetail })));

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
      <PartnerAuthProvider>
        <CustomerAuthProvider>
        <MasterDataProvider>
        <SettingsProvider>
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
                  <Route path="itinerary/:id" element={<InteractiveItinerary />} />
                  <Route path="tours" element={<Navigate to="/packages" replace />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="booking-confirmation" element={<BookingConfirmation />} />
                  <Route path="terms" element={<Terms />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="cancellation" element={<Cancellation />} />
                  <Route path="careers" element={<Careers />} />
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
                  <Route path="itineraries" element={<ItinerariesDashboard />} />
                  <Route path="itinerary-builder" element={<ItineraryBuilder />} />
                  <Route path="accounts" element={<AdminAccounts />} />
                  <Route path="expenses" element={<AdminExpenses />} />
                  <Route path="finance-verification" element={<FinanceVerification />} />
                  <Route path="proposals" element={<AdminProposals />} />
                  <Route path="proposals/:id" element={<ProposalBuilder />} />
                  <Route path="invoices" element={<InvoicesDashboard />} />
                  <Route path="invoices/new" element={<DocumentEditor />} />
                  <Route path="invoices/edit/:id" element={<DocumentEditor />} />

                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="leads" element={<AdminLeads />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="activity" element={<ActivityLogs />} />
                  <Route path="productivity" element={<Productivity />} />
                  <Route path="staff" element={<StaffManagement />} />
                  <Route path="team-performance" element={<TeamPerformance />} />
                  <Route path="packages" element={<AdminPackages />} />
                  <Route path="masters" element={<Masters />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="testimonials" element={<TestimonialsManager />} />
                  <Route path="memberships" element={<MembershipManager />} />
                  <Route path="car-rental" element={<CarRentalManager />} />
                  <Route path="support-inbox" element={<SupportInbox />} />
                  <Route path="partners" element={<PartnerManager />} />
                  <Route path="kyc" element={<AdminKYCManager />} />
                  <Route path="coupons" element={<CouponManager />} />
                  <Route path="marketing-logs" element={<MarketingLogs />} />
                  <Route path="trending" element={<TrendingDestinationsManager />} />
                  <Route path="*" element={<div className="p-10">Page Under Construction</div>} />
                </Route>

                {/* Partner Portal Routes */}
                <Route path="/partner/login" element={<PartnerLogin />} />
                <Route path="/partner/register" element={<PartnerRegister />} />
                <Route path="/partner" element={<PartnerLayout />}>
                  <Route index element={<Navigate to="/partner/dashboard" replace />} />
                  <Route path="dashboard" element={<PartnerDashboard />} />
                  <Route path="packages" element={<PartnerPackages />} />
                  <Route path="leads" element={<PartnerLeads />} />
                  <Route path="leads/new" element={<PartnerSubmitLead />} />
                  <Route path="earnings" element={<PartnerEarnings />} />
                  <Route path="profile" element={<PartnerProfile />} />
                  <Route path="milestones" element={<PartnerMilestones />} />
                  <Route path="agreement" element={<PartnerAgreement />} />
                </Route>

                {/* Customer Portal Routes */}
                <Route path="/customer/login" element={<CustomerLogin />} />
                <Route path="/customer/register" element={<CustomerRegister />} />
                <Route path="/my-account" element={
                  <CustomerGuard>
                    <CustomerDashboard />
                  </CustomerGuard>
                } />
                <Route path="/my-account/booking/:id" element={
                  <CustomerGuard>
                    <BookingDetail />
                  </CustomerGuard>
                } />

                {/* Fallback for unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </HashRouter>
        </DataProvider>
        </SettingsProvider>
        </MasterDataProvider>
        </CustomerAuthProvider>
      </PartnerAuthProvider>
    </AuthProvider>
  );
};

export default App;
