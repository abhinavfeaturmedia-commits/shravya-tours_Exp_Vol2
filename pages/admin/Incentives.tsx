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
    Unlock, FileSpreadsheet, Building2, Send, Target, Copy, Save, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface IncentivesProps {
    defaultTab?: string;
}

export const Incentives: React.FC<IncentivesProps> = ({ defaultTab = 'overview' }) => {
    const { currentUser, hasPermission, staff: authStaff = [] } = useAuth();
    const { bookings } = useData();
    const [staffList, setStaffList] = useState<any[]>([]);

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

    // ─── Target & Rule Settings State (Super Admin) ───
    const nextMonthStr = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const [targetMonth, setTargetMonth] = useState<string>(() => {
        const todayDay = new Date().getDate();
        if (todayDay >= 20) {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [targetsList, setTargetsList] = useState<any[]>([]);
    const [targetsLoading, setTargetsLoading] = useState<boolean>(false);
    const [savingTargetStaffId, setSavingTargetStaffId] = useState<number | null>(null);
    const [savingAllTargets, setSavingAllTargets] = useState<boolean>(false);
    const [targetsMeta, setTargetsMeta] = useState<any>({
        totalStaff: 0,
        targetsSet: 0,
        targetsPending: 0,
        deadlineDate: '',
        isPastDeadline: false
    });

    // Editable Plan & Rules State
    const [editingPlanForm, setEditingPlanForm] = useState({
        maximumBookingPercentage: 7.0,
        gpProtectionPercentage: 40.0,
        baseRate: 2.0
    });
    const [editingSlabs, setEditingSlabs] = useState<any[]>([
        { min_pct: 0, max_pct: 69.99, rate_pct: 0.0, label: 'Below 70%' },
        { min_pct: 70, max_pct: 89.99, rate_pct: 1.0, label: '70% – 89%' },
        { min_pct: 90, max_pct: 99.99, rate_pct: 1.5, label: '90% – 99%' },
        { min_pct: 100, max_pct: 119.99, rate_pct: 2.0, label: '100% – 119%' },
        { min_pct: 120, max_pct: 149.99, rate_pct: 2.5, label: '120% – 149%' },
        { min_pct: 150, max_pct: 999.99, rate_pct: 3.0, label: '150%+' }
    ]);
    const [savingRuleParams, setSavingRuleParams] = useState<boolean>(false);

    // Check permissions
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'Administrator' || currentUser?.userType === 'Admin';
    const isLead = currentUser?.role?.toLowerCase().includes('lead') || currentUser?.role?.toLowerCase().includes('manager');

    // ─── Staff Synchronization ───
    useEffect(() => {
        if (Array.isArray(authStaff) && authStaff.length > 0) {
            setStaffList(authStaff);
        } else {
            api.getStaff().then(res => {
                if (Array.isArray(res) && res.length > 0) {
                    setStaffList(res);
                }
            }).catch(err => {
                console.warn('[Incentives] Failed to load staff members:', err);
            });
        }
    }, [authStaff]);

    const staffMembers = useMemo(() => {
        if (Array.isArray(staffList) && staffList.length > 0) return staffList;
        if (Array.isArray(authStaff) && authStaff.length > 0) return authStaff;
        return [];
    }, [staffList, authStaff]);

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

    const [savingAdj, setSavingAdj] = useState<boolean>(false);

    // Submit Adjustment
    const handleCreateAdjustment = async () => {
        const empId = Number(adjForm.employeeId);
        if (!empId || empId === 0) {
            toast.error('Please select an employee.');
            return;
        }
        const amt = parseFloat(adjForm.amount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid amount greater than ₹0.');
            return;
        }
        if (!adjForm.reason || !adjForm.reason.trim()) {
            toast.error('Please provide a mandatory audit reason.');
            return;
        }

        setSavingAdj(true);
        try {
            const res = await api.addIncentiveAdjustment({
                employeeId: empId,
                bookingId: adjForm.bookingId || undefined,
                incentiveRunId: adjForm.incentiveRunId || undefined,
                adjustmentType: adjForm.adjustmentType,
                amount: amt,
                reason: adjForm.reason.trim(),
                supportingDocument: adjForm.supportingDocument || undefined
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
            } else {
                toast.error(res.error || 'Failed to record adjustment');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to record adjustment');
        } finally {
            setSavingAdj(false);
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

    // ─── Target Matrix Handlers (Super Admin) ───
    const fetchTargets = useCallback(async (month: string) => {
        setTargetsLoading(true);
        try {
            const res = await api.getStaffMonthlyTargets({ monthYear: month });
            if (res?.success) {
                setTargetsList(res.targets || []);
                setTargetsMeta({
                    totalStaff: res.totalStaff,
                    targetsSet: res.targetsSet,
                    targetsPending: res.targetsPending,
                    deadlineDate: res.deadlineDate,
                    isPastDeadline: res.isPastDeadline
                });
            }
        } catch (err: any) {
            console.error('[Target Fetch Error]:', err);
        } finally {
            setTargetsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'rules') {
            fetchTargets(targetMonth);
        }
    }, [activeTab, targetMonth, fetchTargets]);

    const handleTargetRowChange = (staffId: number, field: string, val: any) => {
        setTargetsList(prev => prev.map(t => {
            if (t.staffId === staffId) {
                return { ...t, [field]: val };
            }
            return t;
        }));
    };

    const handleSaveSingleTarget = async (item: any) => {
        setSavingTargetStaffId(item.staffId);
        try {
            const res = await api.saveStaffMonthlyTargets({
                monthYear: targetMonth,
                targets: [{
                    staffId: item.staffId,
                    targetAmount: parseFloat(String(item.targetAmount || 0)),
                    targetBookings: parseInt(String(item.targetBookings || 0)),
                    notes: item.notes || ''
                }]
            });
            if (res?.success) {
                toast.success(`Target for ${item.name} saved!`);
                fetchTargets(targetMonth);
            } else {
                toast.error(res?.error || 'Failed to save target');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error saving target');
        } finally {
            setSavingTargetStaffId(null);
        }
    };

    const handleSaveAllTargets = async () => {
        setSavingAllTargets(true);
        try {
            const payload = targetsList.map(t => ({
                staffId: t.staffId,
                targetAmount: parseFloat(String(t.targetAmount || 0)),
                targetBookings: parseInt(String(t.targetBookings || 0)),
                notes: t.notes || ''
            }));
            const res = await api.saveStaffMonthlyTargets({
                monthYear: targetMonth,
                targets: payload
            });
            if (res?.success) {
                toast.success(`All ${payload.length} targets saved for ${targetMonth}!`);
                fetchTargets(targetMonth);
            } else {
                toast.error(res?.error || 'Failed to save targets');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error saving targets');
        } finally {
            setSavingAllTargets(false);
        }
    };

    const handleRollForwardTargets = async (multiplier: number) => {
        try {
            const res = await api.copyStaffMonthlyTargets({
                sourceMonth: currentMonthStr,
                targetMonth: targetMonth,
                multiplier
            });
            if (res?.success) {
                toast.success(res.message || `Targets copied with ${multiplier}x multiplier!`);
                fetchTargets(targetMonth);
            } else {
                toast.error(res?.error || 'Failed to copy targets');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error copying targets');
        }
    };

    const handleSavePlanSettings = async () => {
        if (!plans || plans.length === 0) return;
        const activePlan = plans.find((p: any) => p.status === 'Active') || plans[0];
        setSavingRuleParams(true);
        try {
            const res = await api.updateIncentivePlan(activePlan.id, {
                maximumBookingPercentage: editingPlanForm.maximumBookingPercentage,
                gpProtectionPercentage: editingPlanForm.gpProtectionPercentage
            });
            if (res?.success) {
                const salesRule = (activePlan as any).rules?.find((r: any) => r.department?.toLowerCase() === 'sales') || (activePlan as any).rules?.[0];
                if (salesRule) {
                    await api.updateIncentiveRule(salesRule.id, {
                        percentage: editingPlanForm.baseRate,
                        slabs: editingSlabs
                    });
                }
                toast.success('Incentive calculation parameters & slabs updated successfully!');
                fetchData();
            } else {
                toast.error(res?.error || 'Failed to update plan');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error updating settings');
        } finally {
            setSavingRuleParams(false);
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

    // Trace Parsing Helper
    const parseTrace = (trace: any) => {
        if (!trace) return null;
        if (typeof trace === 'object') return trace;
        try {
            return JSON.parse(trace);
        } catch (_) {
            return null;
        }
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
                                {(runs || []).map((r: IncentiveRun) => {
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
                                {(summaries || []).map((s: IncentiveEmployeeSummary) => (
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
                                    <th className="py-3 px-4">Attribution / Split</th>
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
                                {(ledger || []).map((item: IncentiveLedgerItem) => {
                                    const trace = parseTrace(item.calculation_trace);
                                    return (
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
                                            <td className="py-3 px-4">
                                                {trace?.isSplit ? (
                                                    trace.splitTag === 'TRANSFER_30_ORIGINATOR' ? (
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                <Users className="size-3" />
                                                                30% Originator
                                                            </span>
                                                            {trace.partnerName && (
                                                                <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={`To closer: ${trace.partnerName}`}>
                                                                    → {trace.partnerName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                <Award className="size-3" />
                                                                70% Closer
                                                            </span>
                                                            {trace.partnerName && (
                                                                <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={`From originator: ${trace.partnerName}`}>
                                                                    ← {trace.partnerName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                        100% Solo
                                                    </span>
                                                )}
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
                                    );
                                })}
                                {ledger.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="py-8 text-center text-slate-400">
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
                TAB 5: TARGETS & CALCULATION RULES (Super Admin Editable Matrix)
               ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'rules' && (
                <div className="space-y-6">
                    {/* ─── Super Admin Monthly Target Setting Matrix ─── */}
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
                                        <Target className="size-5" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        Staff Monthly Targets Setting Matrix
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                        Super Admin Control
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    Set individual monthly booking quotas and revenue targets for each staff member. Next month targets must be finalized on or before the 25th of the current month.
                                </p>
                            </div>

                            {/* Month Switcher & Quick Tools */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => {
                                        setTargetMonth(currentMonthStr);
                                        fetchTargets(currentMonthStr);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                        targetMonth === currentMonthStr 
                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    Current Month ({currentMonthStr})
                                </button>
                                <button
                                    onClick={() => {
                                        setTargetMonth(nextMonthStr);
                                        fetchTargets(nextMonthStr);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                                        targetMonth === nextMonthStr 
                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800'
                                    }`}
                                >
                                    <Calendar className="size-3.5" />
                                    <span>Next Month ({nextMonthStr})</span>
                                </button>

                                {isAdmin && (
                                    <button
                                        onClick={handleSaveAllTargets}
                                        disabled={savingAllTargets || targetsLoading}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
                                    >
                                        <Save className="size-3.5" />
                                        <span>{savingAllTargets ? 'Saving...' : 'Save All Targets'}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 25th Deadline Status Banner */}
                        {(() => {
                            const todayDay = new Date().getDate();
                            const isViewingNextMonth = targetMonth === nextMonthStr;
                            const daysLeft = 25 - todayDay;

                            if (isViewingNextMonth) {
                                if (todayDay <= 25) {
                                    return (
                                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl">
                                                    <Clock className="size-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                                        Next Month Target Setting Period: Due on or before 25th ({daysLeft} days remaining)
                                                    </h4>
                                                    <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                                                        Setting next month's targets before the 25th ensures staff members can view their upcoming goals on their dashboards and plan their pipelines in advance.
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-black bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white">
                                                {targetsMeta.targetsSet} / {targetsMeta.totalStaff} Configured
                                            </span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 rounded-xl">
                                                    <AlertTriangle className="size-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                                                        Deadline Alert: Next Month Target Setting was due on the 25th
                                                    </h4>
                                                    <p className="text-xs text-rose-700 dark:text-rose-300/80 mt-0.5">
                                                        {targetsMeta.targetsPending > 0 
                                                            ? `${targetsMeta.targetsPending} staff members still do not have confirmed targets for ${targetMonth}. Please assign them now.` 
                                                            : `All staff targets for ${targetMonth} are set and locked.`}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-black bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-white">
                                                {targetsMeta.targetsPending > 0 ? `${targetsMeta.targetsPending} Pending` : 'All Set'}
                                            </span>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}

                        {/* 1-Click Roll Forward / Target Auto-Fill Tools (Super Admin) */}
                        {isAdmin && (
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Copy className="size-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Quick 1-Click Roll Forward:
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Auto-fill targets from current month into {targetMonth}:
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        onClick={() => handleRollForwardTargets(1.0)}
                                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 transition"
                                        title="Copy exact target values"
                                    >
                                        Flat Copy (1.0x)
                                    </button>
                                    <button
                                        onClick={() => handleRollForwardTargets(1.05)}
                                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition"
                                        title="Increase by 5%"
                                    >
                                        +5% Growth
                                    </button>
                                    <button
                                        onClick={() => handleRollForwardTargets(1.10)}
                                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-bold border border-emerald-300 dark:border-emerald-700 transition"
                                        title="Seasonal +10% increase"
                                    >
                                        +10% Growth (Recommended)
                                    </button>
                                    <button
                                        onClick={() => handleRollForwardTargets(1.20)}
                                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold border border-purple-200 dark:border-purple-800 transition"
                                        title="Peak season +20% increase"
                                    >
                                        +20% High Peak
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Staff Target Matrix Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Staff Member</th>
                                        <th className="py-3 px-4">Department & Role</th>
                                        <th className="py-3 px-4">Monthly Target Revenue (₹)</th>
                                        <th className="py-3 px-4">Target Bookings</th>
                                        <th className="py-3 px-4">Notes / Focus</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {targetsLoading ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-emerald-600" />
                                                Loading target matrix...
                                            </td>
                                        </tr>
                                    ) : targetsList.map((t: any) => (
                                        <tr key={t.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                                                        {t.name ? t.name.slice(0, 2).toUpperCase() : 'ST'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">{t.name}</div>
                                                        <div className="text-xs text-slate-400">{t.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{t.department || 'Sales'}</div>
                                                <div className="text-[11px] text-slate-400">{t.role || 'Sales Executive'}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {isAdmin ? (
                                                    <div className="relative max-w-[160px]">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                                        <input
                                                            type="number"
                                                            step="10000"
                                                            value={t.targetAmount || 0}
                                                            onChange={(e) => handleTargetRowChange(t.staffId, 'targetAmount', Number(e.target.value))}
                                                            className="w-full pl-7 pr-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        ₹{parseFloat(String(t.targetAmount || 0)).toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isAdmin ? (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={t.targetBookings || 5}
                                                        onChange={(e) => handleTargetRowChange(t.staffId, 'targetBookings', Number(e.target.value))}
                                                        className="w-20 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {t.targetBookings || 5} Bookings
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isAdmin ? (
                                                    <input
                                                        type="text"
                                                        placeholder="Add focus or note..."
                                                        value={t.notes || ''}
                                                        onChange={(e) => handleTargetRowChange(t.staffId, 'notes', e.target.value)}
                                                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-slate-400">{t.notes || '—'}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {t.isSet ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        <CheckCircle2 className="size-3" /> Confirmed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                        Default (Pending)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleSaveSingleTarget(t)}
                                                        disabled={savingTargetStaffId === t.staffId}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                                                    >
                                                        {savingTargetStaffId === t.staffId ? 'Saving...' : 'Save'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {targetsList.length === 0 && !targetsLoading && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                No active staff members found to assign targets.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ─── Calculation Settings & Safety Caps (Editable by Super Admin) ─── */}
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Incentive Plan & Safety Parameters</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                        Version 1.0 (Audit-Tracked)
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">Super Admins can calibrate safety caps and base percentages. Edits produce version increments to protect historical payroll runs.</p>
                            </div>

                            {isAdmin && (
                                <button
                                    onClick={handleSavePlanSettings}
                                    disabled={savingRuleParams}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                                >
                                    <Save className="size-3.5" />
                                    <span>{savingRuleParams ? 'Updating...' : 'Save Calculation Settings'}</span>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Default Hard Ceiling</span>
                                {isAdmin ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.25"
                                            value={editingPlanForm.maximumBookingPercentage}
                                            onChange={(e) => setEditingPlanForm(prev => ({ ...prev, maximumBookingPercentage: parseFloat(e.target.value) || 7 }))}
                                            className="w-24 px-3 py-1.5 text-xl font-bold bg-white dark:bg-slate-900 border border-emerald-300 rounded-xl text-emerald-700 dark:text-emerald-300"
                                        />
                                        <span className="text-sm font-bold text-emerald-600">%</span>
                                    </div>
                                ) : (
                                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">7.00%</div>
                                )}
                                <p className="text-xs text-slate-500">Maximum % of eligible booking revenue allowed for company pool</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                                <span className="text-xs font-semibold text-blue-800 dark:text-blue-400">Gross Profit (GP) Protection</span>
                                {isAdmin ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="1.0"
                                            value={editingPlanForm.gpProtectionPercentage}
                                            onChange={(e) => setEditingPlanForm(prev => ({ ...prev, gpProtectionPercentage: parseFloat(e.target.value) || 40 }))}
                                            className="w-24 px-3 py-1.5 text-xl font-bold bg-white dark:bg-slate-900 border border-blue-300 rounded-xl text-blue-700 dark:text-blue-300"
                                        />
                                        <span className="text-sm font-bold text-blue-600">%</span>
                                    </div>
                                ) : (
                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">40.00%</div>
                                )}
                                <p className="text-xs text-slate-500">Configurable safety cap on net gross margins</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
                                <span className="text-xs font-semibold text-purple-800 dark:text-purple-400">Base Sales Commission Rate</span>
                                {isAdmin ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={editingPlanForm.baseRate}
                                            onChange={(e) => setEditingPlanForm(prev => ({ ...prev, baseRate: parseFloat(e.target.value) || 2 }))}
                                            className="w-24 px-3 py-1.5 text-xl font-bold bg-white dark:bg-slate-900 border border-purple-300 rounded-xl text-purple-700 dark:text-purple-300"
                                        />
                                        <span className="text-sm font-bold text-purple-600">%</span>
                                    </div>
                                ) : (
                                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">2.00%</div>
                                )}
                                <p className="text-xs text-slate-500">Standard commission rate before target slab multipliers</p>
                            </div>
                        </div>
                    </div>

                    {/* ─── Lead Transfer Split Policy & Slabs ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Multiple Salespersons & Transfer Split Policy Card */}
                        <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <Users className="size-5 text-indigo-600" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Multi-Salesperson & Lead Transfer Split Logic
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500">
                                When a lead or booking involves more than one sales rep after an approved transfer, incentive and target quota are divided transparently:
                            </p>

                            <div className="space-y-3">
                                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-xs text-amber-900 dark:text-amber-200">1st Employee (Lead Originator)</div>
                                        <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">Captures requirements & initiates transfer</div>
                                    </div>
                                    <span className="text-xl font-black text-amber-600">30%</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">2nd Employee (Lead Closer / Primary Handler)</div>
                                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">Builds itinerary, handles follow-up & secures booking</div>
                                    </div>
                                    <span className="text-xl font-black text-emerald-600">70%</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <span className="font-bold">Example: </span> For a booking of ₹2,00,000 yielding ₹4,000 commission, the 1st employee receives ₹1,200 (credited ₹60k target volume) and the 2nd employee receives ₹2,800 (credited ₹140k target volume).
                            </div>
                        </div>

                        {/* Editable Target Slabs Rule Card */}
                        <div className="bg-white dark:bg-[#1A2633] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900 dark:text-white text-base">Sales Target Achievement Slabs</h4>
                                <span className="text-xs font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold">
                                    Target-Calibrated
                                </span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                {editingSlabs.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}:</span>
                                        {isAdmin ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={s.rate_pct}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setEditingSlabs(prev => prev.map((item, i) => i === idx ? { ...item, rate_pct: val } : item));
                                                    }}
                                                    className="w-16 px-2 py-0.5 text-right font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none"
                                                />
                                                <span className="font-bold text-slate-500">%</span>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-emerald-600">{s.rate_pct}%</span>
                                        )}
                                    </div>
                                ))}
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
                                {(adjustments || []).map((a: IncentiveAdjustment) => (
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
                                {(payouts || []).map((p: IncentivePayout) => (
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

                    {/* ─── Target & Quota Pacing Cards (Current Month + Advance Next Month Target) ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current Month Target Card */}
                        <div className="bg-gradient-to-br from-emerald-500/10 via-slate-50 to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-[#1A2633] p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        <Target className="size-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                            Current Month Target ({mySummary?.targetsInfo?.currentMonth?.monthYear || selectedMonth})
                                        </h3>
                                        <p className="text-[11px] text-slate-400">Assigned individual monthly revenue & booking quota</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    (mySummary?.summaries?.[0]?.target_achievement_pct || 0) >= 100
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                }`}>
                                    {(mySummary?.summaries?.[0]?.target_achievement_pct || 0) >= 100 ? 'Target Achieved' : 'In Progress'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Revenue Quota</span>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                                        ₹{(mySummary?.targetsInfo?.currentMonth?.targetAmount || 500000).toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 mt-0.5">
                                        ₹{parseFloat(String(mySummary?.summaries?.[0]?.eligible_business || 0)).toLocaleString('en-IN')} Achieved
                                    </div>
                                </div>

                                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Bookings Quota</span>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                                        {mySummary?.targetsInfo?.currentMonth?.targetBookings || 5} Bookings
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        {mySummary?.recentBookings?.length || 0} Bookings Closed
                                    </div>
                                </div>
                            </div>

                            {/* Pacing Progress Bar */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-500">Pacing & Achievement</span>
                                    <span className="font-bold text-emerald-600">
                                        {mySummary?.summaries?.[0]?.target_achievement_pct || 0}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" 
                                        style={{ width: `${Math.min(100, mySummary?.summaries?.[0]?.target_achievement_pct || 0)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Month Advance Target Card (25th Deadline Protocol) */}
                        <div className="bg-gradient-to-br from-indigo-500/10 via-slate-50 to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-[#1A2633] p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                        <Calendar className="size-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                            Upcoming Month Target ({mySummary?.targetsInfo?.nextMonth?.monthYear || nextMonthStr})
                                        </h3>
                                        <p className="text-[11px] text-slate-400">Advance target visibility (Deadline: 25th of month)</p>
                                    </div>
                                </div>
                                {mySummary?.targetsInfo?.nextMonth?.isSet ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                        <Check className="size-3" /> Target Confirmed
                                    </span>
                                ) : mySummary?.targetsInfo?.nextMonth?.isBeforeDeadline25th ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                        <Clock className="size-3" /> Finalizing by 25th
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                        Pending Publication
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Target Revenue</span>
                                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                        ₹{(mySummary?.targetsInfo?.nextMonth?.targetAmount || 500000).toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {mySummary?.targetsInfo?.nextMonth?.isSet ? 'Confirmed by Admin' : 'Projected Baseline'}
                                    </div>
                                </div>

                                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Booking Goal</span>
                                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                        {mySummary?.targetsInfo?.nextMonth?.targetBookings || 5} Bookings
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Next Month Goal</div>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                                <span>{mySummary?.targetsInfo?.nextMonth?.statusMessage || 'Advance targets ensure seamless planning before month start.'}</span>
                            </div>
                        </div>
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
                                        <th className="py-2.5 px-4">Attribution</th>
                                        <th className="py-2.5 px-4">Booking Value</th>
                                        <th className="py-2.5 px-4">Applicable Rate</th>
                                        <th className="py-2.5 px-4">Incentive</th>
                                        <th className="py-2.5 px-4">Date</th>
                                        <th className="py-2.5 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {(mySummary?.recentBookings || []).map((b: any) => {
                                        const bTrace = parseTrace(b.calculation_trace);
                                        return (
                                            <tr key={b.id}>
                                                <td className="py-2.5 px-4 font-bold">BK-{String(b.booking_number || b.booking_id).slice(-4)}</td>
                                                <td className="py-2.5 px-4">
                                                    <div className="font-semibold text-xs text-slate-900 dark:text-white">{b.customer_name}</div>
                                                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{b.tour_title}</div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    {bTrace?.isSplit ? (
                                                        bTrace.splitTag === 'TRANSFER_30_ORIGINATOR' ? (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                    <Users className="size-3" />
                                                                    30% Originator
                                                                </span>
                                                                {bTrace.partnerName && (
                                                                    <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={`Transferred to: ${bTrace.partnerName}`}>
                                                                        → {bTrace.partnerName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                    <Award className="size-3" />
                                                                    70% Closer
                                                                </span>
                                                                {bTrace.partnerName && (
                                                                    <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={`Handled from: ${bTrace.partnerName}`}>
                                                                        ← {bTrace.partnerName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                            100% Solo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 font-medium">₹{parseFloat(b.booking_value || 0).toLocaleString('en-IN')}</td>
                                                <td className="py-2.5 px-4 font-semibold text-purple-600">{b.applicable_rate}%</td>
                                                <td className="py-2.5 px-4 font-bold text-emerald-600">₹{parseFloat(b.final_incentive || 0).toLocaleString('en-IN')}</td>
                                                <td className="py-2.5 px-4 text-xs text-slate-400">{b.booking_date}</td>
                                                <td className="py-2.5 px-4">{getStatusBadge(b.status)}</td>
                                            </tr>
                                        );
                                    })}
                                    {(!mySummary?.recentBookings || mySummary.recentBookings.length === 0) && (
                                        <tr>
                                            <td colSpan={8} className="py-6 text-center text-slate-400">
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
                                    {(plans || []).map(p => (
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
                    {(() => {
                        const itemTrace = parseTrace(selectedLedgerItemForTrace.calculation_trace);
                        return (
                            <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Booking Calculation Breakdown</h3>
                                    <button onClick={() => setSelectedLedgerItemForTrace(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                        <X className="size-4" />
                                    </button>
                                </div>

                                {itemTrace?.isSplit && (
                                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="size-3.5 text-amber-600" />
                                                <span>Multi-Salesperson Lead Split</span>
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-[11px] font-black">
                                                {(itemTrace.splitRatio * 100).toFixed(0)}% Share
                                            </span>
                                        </div>
                                        <div className="text-xs text-amber-800 dark:text-amber-300">
                                            {itemTrace.splitTag === 'TRANSFER_30_ORIGINATOR'
                                                ? `1st Employee (Originator): Awarded 30% quota & incentive. Lead transferred to ${itemTrace.partnerName || 'Closer'}.`
                                                : `2nd Employee (Closer): Awarded 70% quota & incentive. Handled closing from ${itemTrace.partnerName || 'Originator'}.`}
                                        </div>
                                    </div>
                                )}

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
                                    {itemTrace?.formula && (
                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            <div className="text-[10px] text-slate-400 font-sans uppercase font-bold mb-1">Formula Trace</div>
                                            {itemTrace.formula}
                                        </div>
                                    )}
                                    <div className="flex justify-between py-2 pt-2 text-sm font-bold text-emerald-600 border-t border-slate-100 dark:border-slate-800">
                                        <span>Final Incentive:</span>
                                        <span>₹{parseFloat(String(selectedLedgerItemForTrace.final_incentive)).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedLedgerItemForTrace(null)}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
                                >
                                    Got It
                                </button>
                            </div>
                        );
                    })()}
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
                            <button onClick={() => setShowAdjustmentModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    Employee <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={adjForm.employeeId}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, employeeId: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                                >
                                    <option value={0}>Select Staff Member</option>
                                    {(staffMembers || []).map((s: any) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.department || 'General'} · {s.role || 'Staff'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    Adjustment Type <span className="text-rose-500">*</span>
                                </label>
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
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    Amount (₹) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 2000"
                                    value={adjForm.amount}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    Target Incentive Run (Optional)
                                </label>
                                <select
                                    value={adjForm.incentiveRunId}
                                    onChange={(e) => setAdjForm(prev => ({ ...prev, incentiveRunId: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                                >
                                    <option value="">General Adjustment (Applies to all/next runs)</option>
                                    {(runs || []).map((r: any) => (
                                        <option key={r.id} value={r.id}>
                                            {r.run_number} ({r.month_year})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    Mandatory Audit Reason <span className="text-rose-500">*</span>
                                </label>
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
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAdjustment}
                                disabled={savingAdj}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
                            >
                                {savingAdj ? (
                                    <>
                                        <RefreshCw className="size-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Adjustment</span>
                                )}
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
