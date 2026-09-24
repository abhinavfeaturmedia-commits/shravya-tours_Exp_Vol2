import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { api } from '../../src/lib/api';
import { 
    IncentivePlan, IncentiveRun, IncentiveLedgerItem, 
    IncentiveEmployeeSummary, IncentiveAdjustment, IncentivePayout, IncentiveDispute 
} from '../../types';
import { 
    IndianRupee, TrendingUp, Award, CheckCircle2, AlertTriangle, 
    Clock, ShieldAlert, FileText, ChevronRight, X, Plus, Filter, 
    Search, Download, RefreshCw, Check, ArrowRight, Eye, AlertCircle, 
    Percent, DollarSign, Wallet, Users, Settings, HelpCircle, Lock, 
    Unlock, FileSpreadsheet, Building2, Send
} from 'lucide-react';
import { toast } from 'sonner';

interface IncentivesProps {
    defaultTab?: string;
}

export const Incentives: React.FC<IncentivesProps> = ({ defaultTab = 'overview' }) => {
    const { currentUser, hasPermission } = useAuth();
    const { bookings, staff } = useData();

    // ─── Active Tab State ───
    const [activeTab, setActiveTab] = useState<string>(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tab') || defaultTab;
    });

    // ─── Filters State ───
    const currentMonthStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
    const [ledgerSearch, setLedgerSearch] = useState<string>('');

    // ─── Data State ───
    const [loading, setLoading] = useState<boolean>(true);
    const [overviewData, setOverviewData] = useState<any>(null);
    const [plans, setPlans] = useState<IncentivePlan[]>([]);
    const [runs, setRuns] = useState<IncentiveRun[]>([]);
    const [ledger, setLedger] = useState<IncentiveLedgerItem[]>([]);
    const [summaries, setSummaries] = useState<IncentiveEmployeeSummary[]>([]);
    const [adjustments, setAdjustments] = useState<IncentiveAdjustment[]>([]);
    const [payouts, setPayouts] = useState<IncentivePayout[]>([]);
    const [mySummary, setMySummary] = useState<any>(null);

    // ─── Modals State ───
    const [showCreateRunModal, setShowCreateRunModal] = useState<boolean>(false);
    const [calculatingRun, setCalculatingRun] = useState<boolean>(false);
    const [runForm, setRunForm] = useState({
        monthYear: currentMonthStr,
        periodStart: `${currentMonthStr}-01`,
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        planId: ''
    });

    const [selectedSummaryForModal, setSelectedSummaryForModal] = useState<IncentiveEmployeeSummary | null>(null);
    const [selectedLedgerItemForTrace, setSelectedLedgerItemForTrace] = useState<IncentiveLedgerItem | null>(null);

    const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
    const [adjForm, setAdjForm] = useState({
        employeeId: 0,
        bookingId: '',
        incentiveRunId: '',
        adjustmentType: 'BONUS',
        amount: '',
        reason: '',
        supportingDocument: ''
    });

    const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
    const [selectedPayout, setSelectedPayout] = useState<IncentivePayout | null>(null);
    const [payoutForm, setPayoutForm] = useState({
        paymentReference: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer'
    });

    const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
    const [disputeReason, setDisputeReason] = useState<string>('');
    const [disputeLedgerId, setDisputeLedgerId] = useState<string>('');

    // Check permissions
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'Administrator' || currentUser?.userType === 'Admin';
    const isLead = currentUser?.role?.toLowerCase().includes('lead') || currentUser?.role?.toLowerCase().includes('manager');

    // ─── Load All Data ───
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ovRes, plansRes, runsRes, ledgerRes, sumRes, adjRes, payRes, myRes] = await Promise.all([
                api.getIncentiveOverview({ monthYear: selectedMonth !== 'all' ? selectedMonth : undefined, department: selectedDepartment !== 'all' ? selectedDepartment : undefined, employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined }).catch(() => ({ data: null })),
                api.getIncentivePlans().catch(() => ({ data: [] })),
                api.crud.getAll('incentive_runs', { order: 'created_at', asc: false }).catch(() => []),
                api.getIncentiveLedger({ limit: 100, search: ledgerSearch }).catch(() => ({ data: [] })),
                api.getIncentiveSummaries({ monthYear: selectedMonth !== 'all' ? selectedMonth : undefined, department: selectedDepartment !== 'all' ? selectedDepartment : undefined }).catch(() => ({ data: [] })),
                api.getIncentiveAdjustments().catch(() => ({ data: [] })),
                api.getIncentivePayouts().catch(() => ({ data: [] })),
                api.getMyIncentiveSummary().catch(() => ({ data: null }))
            ]);

            setOverviewData(ovRes?.data || null);
            setPlans(plansRes?.data || []);
            setRuns(Array.isArray(runsRes) ? runsRes : (runsRes?.data || []));
            setLedger(ledgerRes?.data || []);
            setSummaries(sumRes?.data || []);
            setAdjustments(adjRes?.data || []);
            setPayouts(payRes?.data || []);
            setMySummary(myRes?.data || null);

            if (plansRes?.data?.length > 0 && !runForm.planId) {
                const activePlan = plansRes.data.find((p: any) => p.status === 'Active') || plansRes.data[0];
                setRunForm(prev => ({ ...prev, planId: activePlan.id }));
            }
        } catch (err: any) {
            console.error('[Incentive Fetch Error]:', err);
            toast.error('Failed to load incentive data');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedDepartment, selectedEmployee, ledgerSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Month change in Run modal
    const handleRunMonthChange = (month: string) => {
        if (!month) return;
        const [year, m] = month.split('-').map(Number);
        const lastDay = new Date(year, m, 0).getDate();
        setRunForm(prev => ({
            ...prev,
            monthYear: month,
            periodStart: `${month}-01`,
            periodEnd: `${month}-${String(lastDay).padStart(2, '0')}`
        }));
    };

    // Calculate Run
    const handleCalculateRun = async () => {
        if (!runForm.monthYear || !runForm.periodStart || !runForm.periodEnd) {
            toast.error('Please specify month and valid period dates.');
            return;
        }

        setCalculatingRun(true);
        try {
            const res = await api.calculateIncentiveRun(runForm);
            if (res.success) {
                toast.success(res.message || 'Incentive Run calculated successfully!');
                setShowCreateRunModal(false);
                fetchData();
            } else {
                toast.error(res.error || 'Calculation failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'Calculation engine encountered an error');
        } finally {
            setCalculatingRun(false);
        }
    };

    // Advance Run Status
    const handleAdvanceRun = async (runId: string, action: string, actionName: string) => {
        try {
            const res = await api.advanceIncentiveRunStatus(runId, action);
            if (res.success) {
                toast.success(`Run successfully updated to ${res.newStatus}`);
                fetchData();
            } else {
                toast.error(res.error || 'Failed to update status');
            }
        } catch (err: any) {
            toast.error(err.message || `Approval failed for ${actionName}`);
        }
    };

    // Submit Adjustment
    const handleCreateAdjustment = async () => {
        if (!adjForm.employeeId || !adjForm.amount || !adjForm.reason) {
            toast.error('Please select an employee, enter an amount, and provide a reason.');
            return;
        }
        try {
            const res = await api.addIncentiveAdjustment({
                ...adjForm,
                amount: parseFloat(adjForm.amount)
            });
            if (res.success) {
                toast.success('Adjustment added successfully!');
                setShowAdjustmentModal(false);
                setAdjForm({
                    employeeId: 0,
                    bookingId: '',
                    incentiveRunId: '',
                    adjustmentType: 'BONUS',
                    amount: '',
                    reason: '',
                    supportingDocument: ''
                });
                fetchData();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to record adjustment');
        }
    };

    // Create Payout Batch
    const handleCreatePayoutBatch = async (runId: string) => {
        try {
            const res = await api.createIncentivePayoutBatch(runId);
            if (res.success) {
                toast.success(res.message || 'Payout batch generated successfully!');
                fetchData();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate payout batch');
        }
    };

    // Mark Payout Paid
    const handleMarkPayoutPaid = async () => {
        if (!selectedPayout) return;
        try {
            const res = await api.markIncentivePayoutPaid(selectedPayout.id, payoutForm);
            if (res.success) {
                toast.success('Payout marked as PAID and locked.');
                setShowPayoutModal(false);
                fetchData();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to mark payout as paid');
        }
    };

    // Submit Dispute
    const handleRaiseDispute = async () => {
        if (!disputeReason.trim()) {
            toast.error('Please enter the reason for your dispute.');
            return;
        }
        try {
            const res = await api.raiseIncentiveDispute({
                reason: disputeReason,
                ledgerId: disputeLedgerId || undefined
            });
            if (res.success) {
                toast.success('Dispute submitted for management review.');
                setShowDisputeModal(false);
                setDisputeReason('');
                setDisputeLedgerId('');
                fetchData();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit dispute');
        }
    };

    // Export CSV
    const exportLedgerToCSV = () => {
        if (ledger.length === 0) {
            toast.error('No ledger data to export');
            return;
        }
        const headers = ['Booking ID', 'Booking Date', 'Customer', 'Employee', 'Department', 'Role', 'Eligible Business', 'Gross Profit', 'Applicable Rate %', 'Gross Incentive', 'Final Incentive', 'Status', 'Plan Version'];
        const csvRows = [headers.join(',')];
        ledger.forEach(item => {
            csvRows.push([
                `"BK-${String(item.booking_number || item.booking_id).slice(-4)}"`,
                `"${item.booking_date || ''}"`,
                `"${item.customer_name || ''}"`,
                `"${item.employee_name || 'Staff #' + item.employee_id}"`,
                `"${item.department}"`,
                `"${item.role}"`,
                item.eligible_value,
                item.gross_profit,
                `${item.applicable_rate}%`,
                item.gross_incentive,
                item.final_incentive,
                item.status,
                `"${item.incentive_plan_version || '1.0'}"`
            ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Incentive_Ledger_${selectedMonth}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Status Badge Helpers
    const getStatusBadge = (status: string) => {
        const s = (status || '').toUpperCase();
        switch (s) {
            case 'PAID':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="size-3" /> Paid</span>;
            case 'FINAL_APPROVED':
            case 'APPROVED':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"><Check className="size-3" /> Approved</span>;
            case 'READY_FOR_PAYMENT':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"><Wallet className="size-3" /> Ready for Payment</span>;
            case 'FINANCE_APPROVED':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><Check className="size-3" /> Finance Approved</span>;
            case 'LEAD_APPROVED':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Clock className="size-3" /> Lead Approved</span>;
            case 'CALCULATED':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"><RefreshCw className="size-3" /> Calculated</span>;
            case 'REJECTED':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><X className="size-3" /> Rejected</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{status || 'Draft'}</span>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
            {/* ─── Top Header ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A2633] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                            <IndianRupee className="size-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Incentive Management System
                                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    7% Ceiling & GP Protected
                                </span>
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Booking-driven performance incentives, target slabs, operations KPI multipliers & finance payout control.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Month Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <Clock className="size-4 text-slate-400" />
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 border-none outline-none focus:ring-0 cursor-pointer"
                        >
                            <option value="all">All Months</option>
                            <option value="2026-09">September 2026</option>
                            <option value="2026-08">August 2026</option>
                            <option value="2026-07">July 2026</option>
                            <option value="2026-06">June 2026</option>
                            <option value="2026-05">May 2026</option>
                            <option value="2026-04">April 2026</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateRunModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-95"
                        >
                            <Plus className="size-4" />
                            <span>Create Incentive Run</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Navigation Tabs ─── */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
                {[
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'runs', label: 'Monthly Runs', icon: Clock },
                    { id: 'summaries', label: 'Employee Summaries', icon: Users },
                    { id: 'ledger', label: 'Incentive Ledger', icon: FileText },
                    { id: 'rules', label: 'Rules & Plans', icon: Settings },
                    { id: 'adjustments', label: 'Adjustments & Reversals', icon: AlertCircle },
                    { id: 'payouts', label: 'Payouts', icon: Wallet },
                    { id: 'my_incentives', label: 'My Incentives', icon: Award },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-medium text-sm transition-all whitespace-nowrap ${
                                isActive 
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <Icon className="size-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 1: OVERVIEW DASHBOARD
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* 10 Dashboard Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Eligible Business</span>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                ₹{(overviewData?.eligibleBookingValue || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="size-3" /> Fully Settled Trips
                            </span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Gross Profit (GP)</span>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                ₹{(overviewData?.grossProfit || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-slate-500">After Vendor Costs</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Calculated Incentive</span>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{(overviewData?.totalIncentiveCalculated || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-emerald-600 font-medium">
                                {overviewData?.incentivePctBooking || 0}% of Business
                            </span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Incentive % of GP</span>
                            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {overviewData?.incentivePctGP || 0}%
                            </div>
                            <span className="text-[11px] text-slate-500">Configured Cap: 40%</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Approval</span>
                            <div className="text-xl font-bold text-amber-500">
                                ₹{(overviewData?.pendingApproval || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-amber-600">Awaiting Lead / Finance</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Approved Payable</span>
                            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                ₹{(overviewData?.approved || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-indigo-500">Ready for disbursement</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Paid Disbursed</span>
                            <div className="text-xl font-bold text-teal-600 dark:text-teal-400">
                                ₹{(overviewData?.paid || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-teal-600">Settled to bank accounts</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">On Hold / Excluded</span>
                            <div className="text-xl font-bold text-rose-500">
                                ₹{(overviewData?.onHold || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-rose-500">Pending customer balance</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Adjustments</span>
                            <div className="text-xl font-bold text-orange-500">
                                ₹{(overviewData?.totalAdjustments || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-slate-500">Bonuses & Reversals</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ceiling Capacity</span>
                            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                ₹{(overviewData?.maximumCapacity || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] text-emerald-600">Max allowable pool</span>
                        </div>
                    </div>

                    {/* Ceiling Capacity Guard Card */}
                    <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 max-w-xl">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="size-5 text-emerald-600" />
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                    7% Ceiling & Gross Profit Protection Guard
                                </h3>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                The system ensures total employee allocations never exceed 7.00% of eligible booking value, 
                                and never exceed 40.00% of gross profit. Finalization is automatically blocked if any run breaches this ceiling.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="text-center">
                                <div className="text-xs text-slate-400">Max Capacity</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-white">
                                    ₹{(overviewData?.maximumCapacity || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="text-center">
                                <div className="text-xs text-slate-400">Actual Allocated</div>
                                <div className="text-lg font-bold text-emerald-600">
                                    ₹{(overviewData?.totalIncentiveCalculated || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="text-center">
                                <div className="text-xs text-slate-400">Remaining Cushion</div>
                                <div className="text-lg font-bold text-blue-600">
                                    ₹{Math.max(0, (overviewData?.maximumCapacity || 0) - (overviewData?.totalIncentiveCalculated || 0)).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department Distribution & Recent Runs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Department Breakdown */}
                        <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="size-4 text-emerald-600" />
                                Department Incentive Distribution
                            </h3>
                            <div className="space-y-3">
                                {(overviewData?.departmentBreakdown || []).map((dept: any, i: number) => {
                                    const total = overviewData?.totalIncentiveCalculated || 1;
                                    const pct = Math.min(100, Math.round((parseFloat(dept.incentive) / total) * 100));
                                    return (
                                        <div key={i} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{dept.department}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">{dept.staffCount} Staff</span>
                                                    <span className="font-bold text-emerald-600">₹{parseFloat(dept.incentive).toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!overviewData?.departmentBreakdown || overviewData.departmentBreakdown.length === 0) && (
                                    <div className="text-sm text-slate-400 text-center py-6">No departmental summaries calculated yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Incentive Runs */}
                        <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="size-4 text-blue-600" />
                                    Recent Incentive Runs
                                </h3>
                                <button onClick={() => setActiveTab('runs')} className="text-xs text-emerald-600 hover:underline">
                                    View All
                                </button>
                            </div>
                            <div className="space-y-2.5">
                                {(runs || []).slice(0, 5).map((run: IncentiveRun) => (
                                    <div key={run.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{run.run_number}</span>
                                                {getStatusBadge(run.status)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {run.period_start} to {run.period_end} · {run.eligible_bookings} eligible trips
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-emerald-600">
                                                ₹{parseFloat(String(run.total_incentive || 0)).toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[11px] text-slate-400">Total Payable</div>
                                        </div>
                                    </div>
                                ))}
                                {runs.length === 0 && (
                                    <div className="text-sm text-slate-400 text-center py-6">No monthly runs generated yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 2: MONTHLY INCENTIVE RUNS
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'runs' && (
                <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Incentive Runs</h2>
                            <p className="text-sm text-slate-500">Calculate, validate ceiling rules, and progress runs through the approval workflow.</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setShowCreateRunModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-medium shadow-md transition"
                            >
                                <Plus className="size-4" />
                                <span>+ New Incentive Run</span>
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Run #</th>
                                    <th className="py-3 px-4">Period</th>
                                    <th className="py-3 px-4">Trips (Eligible / Total)</th>
                                    <th className="py-3 px-4">Eligible Business</th>
                                    <th className="py-3 px-4">Gross Profit</th>
                                    <th className="py-3 px-4">Incentive</th>
                                    <th className="py-3 px-4">Ceiling Check</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {runs.map((r: IncentiveRun) => {
                                    let vFlags: any = {};
                                    try { vFlags = typeof r.validation_flags === 'string' ? JSON.parse(r.validation_flags) : r.validation_flags; } catch (_) {}
                                    const withinCeiling = vFlags?.withinCeiling !== false;

                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.run_number}</td>
                                            <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{r.month_year}</td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-emerald-600">{r.eligible_bookings}</span>
                                                <span className="text-slate-400"> / {r.total_bookings}</span>
                                            </td>
                                            <td className="py-3 px-4 font-medium">₹{parseFloat(String(r.total_booking_value || 0)).toLocaleString('en-IN')}</td>
                                            <td className="py-3 px-4 font-medium text-blue-600">₹{parseFloat(String(r.total_gross_profit || 0)).toLocaleString('en-IN')}</td>
                                            <td className="py-3 px-4 font-bold text-emerald-600">₹{parseFloat(String(r.total_incentive || 0)).toLocaleString('en-IN')}</td>
                                            <td className="py-3 px-4">
                                                {withinCeiling ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md font-medium">
                                                        <Check className="size-3" /> Within 7%
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md font-medium" title={vFlags?.warning}>
                                                        <AlertTriangle className="size-3" /> Exceeds Cap
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {/* Workflow Buttons */}
                                                    {r.status === 'CALCULATED' && (isLead || isAdmin) && (
                                                        <button
                                                            onClick={() => handleAdvanceRun(r.id, 'LEAD_APPROVE', 'Lead Approval')}
                                                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition"
                                                        >
                                                            Lead Approve
                                                        </button>
                                                    )}

                                                    {r.status === 'LEAD_APPROVED' && isAdmin && (
                                                        <button
                                                            onClick={() => handleAdvanceRun(r.id, 'FINANCE_APPROVE', 'Finance Approval')}
                                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                                                        >
                                                            Finance Approve
                                                        </button>
                                                    )}

                                                    {r.status === 'FINANCE_APPROVED' && isAdmin && (
                                                        <button
                                                            onClick={() => handleAdvanceRun(r.id, 'FINAL_APPROVE', 'Final Approval')}
                                                            disabled={!withinCeiling}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                                                withinCeiling 
                                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                                                                    : 'bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                                            }`}
                                                            title={!withinCeiling ? 'Finalization blocked: Exceeds 7% ceiling' : 'Approve Run'}
                                                        >
                                                            Final Approve
                                                        </button>
                                                    )}

                                                    {r.status === 'FINAL_APPROVED' && isAdmin && (
                                                        <button
                                                            onClick={() => handleCreatePayoutBatch(r.id)}
                                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                                                        >
                                                            Create Payouts
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            setSelectedMonth(r.month_year);
                                                            setActiveTab('ledger');
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        title="View Ledger"
                                                    >
                                                        <Eye className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {runs.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-slate-400">
                                            No monthly runs calculated yet. Click "+ New Incentive Run" to generate one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 3: EMPLOYEE SUMMARIES
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'summaries' && (
                <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Employee Monthly Summaries</h2>
                            <p className="text-sm text-slate-500">Aggregated individual earnings, target achievements, KPI scores, and net payables.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Department & Role</th>
                                    <th className="py-3 px-4">Eligible Business</th>
                                    <th className="py-3 px-4">Bookings</th>
                                    <th className="py-3 px-4">Target Achieved %</th>
                                    <th className="py-3 px-4">Base Incentive</th>
                                    <th className="py-3 px-4">Bonus / Clawback</th>
                                    <th className="py-3 px-4">Final Payable</th>
                                    <th className="py-3 px-4">Payment</th>
                                    <th className="py-3 px-4 text-right">Breakdown</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {summaries.map((s: IncentiveEmployeeSummary) => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                                                    {s.initials || s.employee_name?.slice(0, 2).toUpperCase() || 'ST'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">{s.employee_name || 'Staff #' + s.employee_id}</div>
                                                    <div className="text-xs text-slate-400">{s.employee_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.department}</div>
                                            <div className="text-[11px] text-slate-400">{s.role}</div>
                                        </td>
                                        <td className="py-3 px-4 font-medium">₹{parseFloat(String(s.eligible_business || 0)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 font-semibold">{s.booking_count}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-bold ${s.target_achievement_pct >= 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                    {s.target_achievement_pct}%
                                                </span>
                                                <span className="text-[10px] text-slate-400">({s.target_slab_rate}%)</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium">₹{parseFloat(String(s.base_incentive || 0)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 text-xs">
                                            {s.performance_bonus > 0 && <span className="text-emerald-600 font-semibold">+₹{s.performance_bonus} </span>}
                                            {s.reversal > 0 && <span className="text-rose-600 font-semibold">-₹{s.reversal}</span>}
                                            {s.performance_bonus === 0 && s.reversal === 0 && <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-emerald-600 text-base">
                                            ₹{parseFloat(String(s.final_payable || 0)).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4">{getStatusBadge(s.payment_status)}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setSelectedSummaryForModal(s)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition"
                                            >
                                                Trace Breakdown
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {summaries.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-8 text-center text-slate-400">
                                            No employee summaries found for the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 4: INCENTIVE LEDGER (Line items & exact formula)
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'ledger' && (
                <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transaction-Level Incentive Ledger</h2>
                            <p className="text-sm text-slate-500">Every single booking transaction with exact rate, gross profit, and formula trace.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search customer, staff..."
                                    value={ledgerSearch}
                                    onChange={(e) => setLedgerSearch(e.target.value)}
                                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <button
                                onClick={exportLedgerToCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition"
                            >
                                <Download className="size-3.5" />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Booking Ref</th>
                                    <th className="py-3 px-4">Customer & Tour</th>
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Eligible Value</th>
                                    <th className="py-3 px-4">Supplier Cost</th>
                                    <th className="py-3 px-4">Gross Profit</th>
                                    <th className="py-3 px-4">Rate</th>
                                    <th className="py-3 px-4">Final Incentive</th>
                                    <th className="py-3 px-4">Plan / Rule</th>
                                    <th className="py-3 px-4 text-right">Formula</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {ledger.map((item: IncentiveLedgerItem) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                            BK-{String(item.booking_number || item.booking_id).slice(-4)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 dark:text-white text-xs">{item.customer_name || 'Customer'}</div>
                                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.tour_title || 'Tour Reservation'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.employee_name || 'Staff #' + item.employee_id}</div>
                                            <div className="text-[10px] text-slate-400">{item.department} · {item.role}</div>
                                        </td>
                                        <td className="py-3 px-4 font-medium">₹{parseFloat(String(item.eligible_value || 0)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 text-slate-500">₹{parseFloat(String(item.supplier_cost || 0)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 font-medium text-blue-600">₹{parseFloat(String(item.gross_profit || 0)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 font-semibold text-purple-600">{item.applicable_rate}%</td>
                                        <td className="py-3 px-4 font-bold text-emerald-600 text-base">₹{parseFloat(String(item.final_incentive || 0)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4">
                                            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                                                v{item.rule_version || '1.0'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setSelectedLedgerItemForTrace(item)}
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                title="View Exact Calculation Formula"
                                            >
                                                <FileText className="size-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {ledger.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-8 text-center text-slate-400">
                                            No ledger transactions recorded for this filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 5: RULES & PLANS (Configurable & Versioned)
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'rules' && (
                <div className="space-y-6">
                    {/* Active Plan Overview */}
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Incentive Plan</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                        Version 1.0 (Locked & Reproducible)
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">Historical plans are never overwritten. Edits produce new versions so past payouts remain reproducible.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Default Hard Ceiling</span>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">7.00%</div>
                                <p className="text-xs text-slate-500 mt-0.5">Maximum % of eligible booking revenue allowed for company pool</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                                <span className="text-xs font-semibold text-blue-800 dark:text-blue-400">Gross Profit (GP) Protection</span>
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">40.00%</div>
                                <p className="text-xs text-slate-500 mt-0.5">Configurable safety cap on net gross margins</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                                <span className="text-xs font-semibold text-purple-800 dark:text-purple-400">Effective Period</span>
                                <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">FY 2026-27</div>
                                <p className="text-xs text-slate-500 mt-0.5">01-Apr-2026 to 31-Mar-2027</p>
                            </div>
                        </div>
                    </div>

                    {/* Department / Role Rules Table */}
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Settings className="size-4 text-emerald-600" />
                            Role-Based Configured Rules
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Sales Slabs Rule Card */}
                            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Sales Executive Target Slabs</h4>
                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-emerald-600">Base: 2.00%</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>Below 70% of target:</span>
                                        <span className="font-bold text-rose-500">0.00%</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>70% – 89% achievement:</span>
                                        <span className="font-bold text-amber-500">1.00%</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>90% – 99% achievement:</span>
                                        <span className="font-bold text-blue-500">1.50%</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>100% – 119% achievement:</span>
                                        <span className="font-bold text-emerald-600">2.00%</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>120% – 149% achievement:</span>
                                        <span className="font-bold text-emerald-600">2.50%</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>150%+ achievement:</span>
                                        <span className="font-bold text-purple-600">3.00%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Operations KPI Weights Card */}
                            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Operations KPI Weights & Multipliers</h4>
                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600">Rate: 1.25%</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>Booking Accuracy:</span>
                                        <span className="font-bold">30% Weight</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>Cost Control & Negotiation:</span>
                                        <span className="font-bold">25% Weight</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>Documents & Vouchers on Time:</span>
                                        <span className="font-bold">15% Weight</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>Avoidable Complaints:</span>
                                        <span className="font-bold">15% Weight</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                                        <span>Supplier Coordination & CRM:</span>
                                        <span className="font-bold">15% Weight</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 6: ADJUSTMENTS & REVERSALS
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'adjustments' && (
                <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Adjustments, Bonuses & Reversals</h2>
                            <p className="text-sm text-slate-500">Every manual adjustment requires an explicit audit reason. Reversals from refunds are automatically captured here.</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setShowAdjustmentModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-medium shadow-md transition"
                            >
                                <Plus className="size-4" />
                                <span>+ Add Manual Adjustment</span>
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Reason / Notes</th>
                                    <th className="py-3 px-4">Created By</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {adjustments.map((a: IncentiveAdjustment) => (
                                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                            {a.employee_name || 'Staff #' + a.employee_id}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                a.adjustment_type === 'BONUS' 
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                            }`}>
                                                {a.adjustment_type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-base">
                                            {a.adjustment_type === 'BONUS' ? '+' : '-'}₹{parseFloat(String(a.amount)).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-sm truncate">{a.reason}</td>
                                        <td className="py-3 px-4 text-xs text-slate-500">{a.created_by}</td>
                                        <td className="py-3 px-4 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">{getStatusBadge(a.status)}</td>
                                    </tr>
                                ))}
                                {adjustments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No adjustments or clawbacks recorded.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 7: PAYOUTS (Finance payment batches & locking)
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'payouts' && (
                <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Finance Payout Batches</h2>
                            <p className="text-sm text-slate-500">Only FINAL_APPROVED runs can be batched for payout. Paid records are locked against further modification.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Batch #</th>
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Payment Method</th>
                                    <th className="py-3 px-4">Reference (UTR / Txn)</th>
                                    <th className="py-3 px-4">Disbursed Date</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {payouts.map((p: IncentivePayout) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{p.batch_number}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{p.employee_name || 'Staff #' + p.employee_id}</td>
                                        <td className="py-3 px-4 font-bold text-emerald-600 text-base">₹{parseFloat(String(p.amount)).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 text-xs">{p.payment_method || 'Bank Transfer'}</td>
                                        <td className="py-3 px-4 text-xs font-mono">{p.payment_reference || '—'}</td>
                                        <td className="py-3 px-4 text-xs text-slate-500">{p.payment_date || '—'}</td>
                                        <td className="py-3 px-4">{getStatusBadge(p.payment_status)}</td>
                                        <td className="py-3 px-4 text-right">
                                            {p.payment_status !== 'PAID' && isAdmin ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedPayout(p);
                                                        setShowPayoutModal(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition"
                                                >
                                                    Mark as Paid
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                    <Lock className="size-3" /> Locked
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payouts.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            No payout batches created yet. Finalize a run to create payouts.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                TAB 8: MY INCENTIVES (Employee Restricted View)
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'my_incentives' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Award className="size-5 text-emerald-600" />
                                My Performance & Incentives
                            </h2>
                            <p className="text-sm text-slate-500">Track your monthly earned commission, target achievement, and paid vouchers.</p>
                        </div>
                        <button
                            onClick={() => setShowDisputeModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition"
                        >
                            <AlertCircle className="size-3.5 text-amber-500" />
                            <span>Raise Dispute / Review</span>
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs text-slate-400">Total Bookings Done</span>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {mySummary?.recentBookings?.length || 0}
                            </div>
                            <span className="text-xs text-emerald-600">Completed & Settled</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs text-slate-400">Total Approved Incentive</span>
                            <div className="text-2xl font-bold text-emerald-600">
                                ₹{mySummary?.summaries?.reduce((acc: number, curr: any) => acc + parseFloat(curr.final_payable || 0), 0).toLocaleString('en-IN') || 0}
                            </div>
                            <span className="text-xs text-slate-500">Approved by Management</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs text-slate-400">Total Paid Out</span>
                            <div className="text-2xl font-bold text-teal-600">
                                ₹{mySummary?.summaries?.filter((s: any) => s.payment_status === 'PAID').reduce((acc: number, curr: any) => acc + parseFloat(curr.final_payable || 0), 0).toLocaleString('en-IN') || 0}
                            </div>
                            <span className="text-xs text-teal-600">Disbursed to Bank</span>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                            <span className="text-xs text-slate-400">Active Disputes</span>
                            <div className="text-2xl font-bold text-amber-500">
                                {mySummary?.disputes?.filter((d: any) => d.status === 'SUBMITTED' || d.status === 'UNDER_REVIEW').length || 0}
                            </div>
                            <span className="text-xs text-slate-400">Under Review</span>
                        </div>
                    </div>

                    {/* Booking Ledger for Employee */}
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">My Contributing Bookings</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="py-2.5 px-4">Booking Ref</th>
                                        <th className="py-2.5 px-4">Customer & Tour</th>
                                        <th className="py-2.5 px-4">Booking Value</th>
                                        <th className="py-2.5 px-4">Applicable Rate</th>
                                        <th className="py-2.5 px-4">Incentive</th>
                                        <th className="py-2.5 px-4">Date</th>
                                        <th className="py-2.5 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {(mySummary?.recentBookings || []).map((b: any) => (
                                        <tr key={b.id}>
                                            <td className="py-2.5 px-4 font-bold">BK-{String(b.booking_number || b.booking_id).slice(-4)}</td>
                                            <td className="py-2.5 px-4">
                                                <div className="font-semibold text-xs text-slate-900 dark:text-white">{b.customer_name}</div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-xs">{b.tour_title}</div>
                                            </td>
                                            <td className="py-2.5 px-4 font-medium">₹{parseFloat(b.booking_value || 0).toLocaleString('en-IN')}</td>
                                            <td className="py-2.5 px-4 font-semibold text-purple-600">{b.applicable_rate}%</td>
                                            <td className="py-2.5 px-4 font-bold text-emerald-600">₹{parseFloat(b.final_incentive || 0).toLocaleString('en-IN')}</td>
                                            <td className="py-2.5 px-4 text-xs text-slate-400">{b.booking_date}</td>
                                            <td className="py-2.5 px-4">{getStatusBadge(b.status)}</td>
                                        </tr>
                                    ))}
                                    {(!mySummary?.recentBookings || mySummary.recentBookings.length === 0) && (
                                        <tr>
                                            <td colSpan={7} className="py-6 text-center text-slate-400">
                                                No eligible bookings recorded for your profile in recent runs.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL 1: CREATE INCENTIVE RUN
               ═══════════════════════════════════════════════════════════════════════ */}
            {showCreateRunModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                                    <Clock className="size-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Create Monthly Incentive Run</h3>
                            </div>
                            <button onClick={() => setShowCreateRunModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Incentive Month (YYYY-MM)
                                </label>
                                <input
                                    type="month"
                                    value={runForm.monthYear}
                                    onChange={(e) => handleRunMonthChange(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                        Period Start
                                    </label>
                                    <input
                                        type="date"
                                        value={runForm.periodStart}
                                        onChange={(e) => setRunForm(prev => ({ ...prev, periodStart: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                        Period End
                                    </label>
                                    <input
                                        type="date"
                                        value={runForm.periodEnd}
                                        onChange={(e) => setRunForm(prev => ({ ...prev, periodEnd: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Incentive Plan
                                </label>
                                <select
                                    value={runForm.planId}
                                    onChange={(e) => setRunForm(prev => ({ ...prev, planId: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (v{p.version} · {p.maximum_booking_percentage}% Cap · {p.gp_protection_percentage}% GP)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-500">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">Automatic Eligibility Check:</div>
                                <div>• Trip status must be Completed & Customer payment Fully Paid.</div>
                                <div>• Supplier costs must be settled and not pending.</div>
                                <div>• Ceilings will be verified: Min(7% of business, 40% of GP).</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowCreateRunModal(false)}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCalculateRun}
                                disabled={calculatingRun}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
                            >
                                {calculatingRun ? (
                                    <>
                                        <RefreshCw className="size-4 animate-spin" />
                                        <span>Calculating Engine...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="size-4" />
                                        <span>Calculate Incentives</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL 2: EMPLOYEE SUMMARY TRACE BREAKDOWN
               ═══════════════════════════════════════════════════════════════════════ */}
            {selectedSummaryForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                                    {selectedSummaryForModal.employee_name || 'Staff #' + selectedSummaryForModal.employee_id}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedSummaryForModal.department} · {selectedSummaryForModal.role} · {selectedSummaryForModal.month_year}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSummaryForModal(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div className="text-xs text-slate-400">Total Business</div>
                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                    ₹{parseFloat(String(selectedSummaryForModal.eligible_business || 0)).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div className="text-xs text-slate-400">Target Achieved</div>
                                <div className="text-base font-bold text-emerald-600">
                                    {selectedSummaryForModal.target_achievement_pct}%
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div className="text-xs text-slate-400">Slab Applied</div>
                                <div className="text-base font-bold text-purple-600">
                                    {selectedSummaryForModal.target_slab_rate}%
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div className="text-xs text-slate-400">KPI Multiplier</div>
                                <div className="text-base font-bold text-blue-600">
                                    {selectedSummaryForModal.kpi_multiplier * 100}%
                                </div>
                            </div>
                        </div>

                        {/* Calculation Formula Trace */}
                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2 text-xs">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">Exact Mathematical Formula:</span>
                            <div className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                Base = ₹{parseFloat(String(selectedSummaryForModal.eligible_business)).toLocaleString('en-IN')} × {selectedSummaryForModal.target_slab_rate}% = ₹{parseFloat(String(selectedSummaryForModal.base_incentive)).toLocaleString('en-IN')}<br/>
                                Adjusted = (Base × {selectedSummaryForModal.kpi_multiplier}) + Bonus(₹{selectedSummaryForModal.performance_bonus}) - Deduction(₹{selectedSummaryForModal.deduction}) - Clawback(₹{selectedSummaryForModal.reversal})<br/>
                                <strong className="text-emerald-600">Final Payable = ₹{parseFloat(String(selectedSummaryForModal.final_payable)).toLocaleString('en-IN')}</strong>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setSelectedSummaryForModal(null)}
                                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL 3: LEDGER FORMULA POPUP
               ═══════════════════════════════════════════════════════════════════════ */}
            {selectedLedgerItemForTrace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Booking Calculation Breakdown</h3>
                            <button onClick={() => setSelectedLedgerItemForTrace(null)} className="p-1 text-slate-400">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Booking Ref:</span>
                                <span className="font-bold">BK-{String(selectedLedgerItemForTrace.booking_number || selectedLedgerItemForTrace.booking_id).slice(-4)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Eligible Booking Value:</span>
                                <span className="font-medium">₹{parseFloat(String(selectedLedgerItemForTrace.eligible_value)).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Direct Vendor Cost:</span>
                                <span className="font-medium text-rose-500">₹{parseFloat(String(selectedLedgerItemForTrace.supplier_cost)).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Gross Profit (GP):</span>
                                <span className="font-bold text-blue-600">₹{parseFloat(String(selectedLedgerItemForTrace.gross_profit)).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Applicable Rate:</span>
                                <span className="font-bold text-purple-600">{selectedLedgerItemForTrace.applicable_rate}%</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Plan Version:</span>
                                <span className="font-mono">v{selectedLedgerItemForTrace.incentive_plan_version}</span>
                            </div>
                            <div className="flex justify-between py-2 pt-3 text-sm font-bold text-emerald-600">
                                <span>Final Incentive:</span>
                                <span>₹{parseFloat(String(selectedLedgerItemForTrace.final_incentive)).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedLedgerItemForTrace(null)}
                            className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL 4: ADD ADJUSTMENT
               ═══════════════════════════════════════════════════════════════════════ */}
            {showAdjustmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Record Incentive Adjustment</h3>
                            <button onClick={() => setShowAdjustmentModal(false)} className="p-1 text-slate-400">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Employee</label>
                                <select
                                    value={adjForm.employeeId}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, employeeId: parseInt(e.target.value) }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                                >
                                    <option value={0}>Select Staff Member</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.department} · {s.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Adjustment Type</label>
                                <select
                                    value={adjForm.adjustmentType}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, adjustmentType: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                                >
                                    <option value="BONUS">BONUS (Performance reward)</option>
                                    <option value="DEDUCTION">DEDUCTION (Policy penalty)</option>
                                    <option value="REVERSAL">REVERSAL / CLAWBACK (Customer refund reversal)</option>
                                    <option value="CORRECTION">CORRECTION (Financial adjustment)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 2000"
                                    value={adjForm.amount}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Mandatory Audit Reason</label>
                                <textarea
                                    placeholder="Explain the justification for this adjustment..."
                                    rows={3}
                                    value={adjForm.reason}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowAdjustmentModal(false)}
                                className="px-3 py-1.5 text-xs text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAdjustment}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md"
                            >
                                Save Adjustment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL 5: MARK PAYOUT PAID
               ═══════════════════════════════════════════════════════════════════════ */}
            {showPayoutModal && selectedPayout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Disburse & Lock Payout</h3>
                            <button onClick={() => setShowPayoutModal(false)} className="p-1 text-slate-400">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
                            Disbursing <strong>₹{parseFloat(String(selectedPayout.amount)).toLocaleString('en-IN')}</strong> to{' '}
                            <strong>{selectedPayout.employee_name || 'Staff #' + selectedPayout.employee_id}</strong>.
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
                                <select
                                    value={payoutForm.paymentMethod}
                                    onChange={(e) => setPayoutForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                                >
                                    <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Reference / UTR Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. UTR29384729103"
                                    value={payoutForm.paymentReference}
                                    onChange={(e) => setPayoutForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    value={payoutForm.paymentDate}
                                    onChange={(e) => setPayoutForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowPayoutModal(false)}
                                className="px-3 py-1.5 text-xs text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMarkPayoutPaid}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
                            >
                                <Lock className="size-3.5" />
                                <span>Confirm Payment & Lock</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL 6: RAISE DISPUTE
               ═══════════════════════════════════════════════════════════════════════ */}
            {showDisputeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Raise Incentive Review / Dispute</h3>
                            <button onClick={() => setShowDisputeModal(false)} className="p-1 text-slate-400">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Explanation / Discrepancy Note</label>
                                <textarea
                                    rows={4}
                                    placeholder="Explain why you believe your incentive calculation differs (e.g. missing booking, slab dispute, KPI evaluation)..."
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowDisputeModal(false)}
                                className="px-3 py-1.5 text-xs text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRaiseDispute}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
                            >
                                <Send className="size-3.5" />
                                <span>Submit Dispute</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Incentives;
