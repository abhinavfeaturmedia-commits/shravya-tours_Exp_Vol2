import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskStatus, TaskPriority, StaffMember, Lead, Booking } from '../../types';
import { toast } from 'sonner';
import {
    CheckCircle2, Clock, AlertTriangle, AlertCircle, TrendingUp,
    Users, Plus, Calendar, Search, Filter, MoreHorizontal, Edit2,
    Trash2, X, ChevronDown, Download, ArrowRight, UserCheck, Flame,
    Award, Crown, Check, Sparkles, Kanban, List, BarChart3,
    ArrowUpDown, ChevronRight, Layers, Briefcase, Eye, ShieldAlert,
    Repeat, RefreshCw, CalendarDays
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type TimeRange = 'all' | 'today' | 'week' | 'month';
type ActiveView = 'list' | 'board' | 'reports';
type RepeatFrequency = 'daily' | 'weekly' | 'custom_days' | 'monthly';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface EmployeeProductivity {
    staff: StaffMember;
    totalAssigned: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
    performanceTier: 'Top Performer' | 'On Track' | 'Needs Attention' | 'No Tasks';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const isTaskOverdue = (task: Task): boolean => {
    if (task.status === 'Completed') return false;
    if (task.status === 'Overdue') return true;
    if (!task.dueDate) return false;

    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < today.getTime();
};

const getDaysDifference = (dateStr: string): number => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const formatDueDateBadge = (dateStr: string, isCompleted: boolean) => {
    if (!dateStr) return null;
    const diffDays = getDaysDifference(dateStr);

    if (isCompleted) {
        return { text: dateStr, color: 'text-slate-400 bg-slate-50 border-slate-200' };
    }
    if (diffDays < 0) {
        return {
            text: `${Math.abs(diffDays)}d Overdue`,
            color: 'text-rose-700 bg-rose-50 border-rose-200 font-semibold'
        };
    }
    if (diffDays === 0) {
        return { text: 'Due Today', color: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold' };
    }
    if (diffDays === 1) {
        return { text: 'Due Tomorrow', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    }
    return { text: dateStr, color: 'text-slate-600 bg-slate-50 border-slate-200' };
};

// Calculate next recurrence date
const calculateNextDueDate = (currentDueDate: string, freq: RepeatFrequency, days: string[] = [], interval: number = 1): string => {
    const base = new Date(currentDueDate || new Date());
    const today = new Date();
    const start = base.getTime() > today.getTime() ? base : today;
    const next = new Date(start);

    if (freq === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (freq === 'custom_days') {
        next.setDate(next.getDate() + (interval > 0 ? interval : 1));
    } else if (freq === 'monthly') {
        next.setMonth(next.getMonth() + 1);
    } else if (freq === 'weekly') {
        if (!days.length) {
            next.setDate(next.getDate() + 7);
        } else {
            // Find next matching weekday
            const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
            const targetDayIndices = days.map(d => dayMap[d]).sort();
            let found = false;
            for (let i = 1; i <= 7; i++) {
                const check = new Date(start);
                check.setDate(check.getDate() + i);
                if (targetDayIndices.includes(check.getDay())) {
                    next.setTime(check.getTime());
                    found = true;
                    break;
                }
            }
            if (!found) next.setDate(next.getDate() + 7);
        }
    }

    return next.toISOString().split('T')[0];
};

export const Productivity: React.FC = () => {
    const { tasks, addTask, updateTask, deleteTask, leads, bookings } = useData();
    const { staff, currentUser } = useAuth();

    // ── Primary View & Filter State ──────────────────────────────────────────
    const [activeView, setActiveView] = useState<ActiveView>('list');
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'In Progress' | 'Completed' | 'Overdue'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // ── Bulk & Modal State ───────────────────────────────────────────────────
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // ── Task Form State (with Recurring) ─────────────────────────────────────
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assignedTo: 0,
        priority: 'Medium' as TaskPriority,
        dueDate: new Date().toISOString().split('T')[0],
        category: 'General',
        relatedLeadId: '',
        relatedBookingId: '',
        isRecurring: false,
        repeatFrequency: 'weekly' as RepeatFrequency,
        repeatDays: ['Mon', 'Wed', 'Fri'] as string[],
        repeatInterval: 3
    });

    const getStaffMember = (id: number | string | undefined): StaffMember | undefined => {
        if (!id) return undefined;
        return staff.find(s => String(s.id) === String(id));
    };

    const getStaffName = (id: number | string | undefined): string => {
        const member = getStaffMember(id);
        return member?.name || 'Unassigned';
    };

    // Clean display resolution for Lead & Booking without UUIDs
    const getLeadDisplay = (leadId?: string) => {
        if (!leadId) return null;
        const l = leads.find(item => item.id === leadId);
        if (!l) return null;
        return {
            name: l.name,
            code: l.leadNumber ? `LD-${l.leadNumber}` : 'Lead',
            destination: l.destination
        };
    };

    const getBookingDisplay = (bookingId?: string) => {
        if (!bookingId) return null;
        const b = bookings.find(item => item.id === bookingId);
        if (!b) return null;
        return {
            customer: b.customer || 'Guest',
            title: b.title || 'Tour Booking',
            code: b.bookingNumber ? `BK-${b.bookingNumber}` : 'Booking'
        };
    };

    // ── Scope Isolation: Only Tasks Specifically Created In This Page ────────
    const productivityTasks = useMemo(() => {
        return tasks.filter(t => {
            const isManual = t.source === 'manual';
            const isExternalChecklist = t.category === 'checklist';
            return isManual && !isExternalChecklist;
        });
    }, [tasks]);

    // ── Time Range Filtering ─────────────────────────────────────────────────
    const isWithinTimeRange = (dateStr?: string): boolean => {
        if (timeRange === 'all' || !dateStr) return true;
        const targetDate = new Date(dateStr);
        const now = new Date();

        if (timeRange === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return targetDate >= today;
        }
        if (timeRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return targetDate >= weekAgo;
        }
        if (timeRange === 'month') {
            const monthAgo = new Date();
            monthAgo.setDate(now.getDate() - 30);
            return targetDate >= monthAgo;
        }
        return true;
    };

    // ── Normalized Tasks (Dynamic Overdue Detection) ─────────────────────────
    const normalizedTasks = useMemo(() => {
        return productivityTasks.map(t => {
            const overdue = isTaskOverdue(t);
            return {
                ...t,
                isOverdue: overdue,
                effectiveStatus: overdue && t.status !== 'Completed' ? ('Overdue' as TaskStatus) : t.status
            };
        });
    }, [productivityTasks]);

    // ── Tasks Filtered by Staff & Time Range (Scope for Metrics) ──────────────
    const scopedTasks = useMemo(() => {
        return normalizedTasks.filter(t => {
            if (selectedStaffId !== 'all' && String(t.assignedTo) !== String(selectedStaffId)) return false;
            return isWithinTimeRange(t.createdAt || t.dueDate);
        });
    }, [normalizedTasks, selectedStaffId, timeRange]);

    // ── Filtered Tasks for Active Display ────────────────────────────────────
    const filteredTasks = useMemo(() => {
        return scopedTasks.filter(t => {
            // Status Filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'Overdue') {
                    if (!t.isOverdue || t.status === 'Completed') return false;
                } else if (t.status !== statusFilter) {
                    return false;
                }
            }

            // Priority Filter
            if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
                return false;
            }

            // Search Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = t.title.toLowerCase().includes(q);
                const descMatch = t.description?.toLowerCase().includes(q);
                const staffMatch = getStaffName(t.assignedTo).toLowerCase().includes(q);
                const categoryMatch = t.category?.toLowerCase().includes(q);
                const leadMatch = getLeadDisplay(t.relatedLeadId)?.name.toLowerCase().includes(q);
                const bookingMatch = getBookingDisplay(t.relatedBookingId)?.customer.toLowerCase().includes(q);
                if (!titleMatch && !descMatch && !staffMatch && !categoryMatch && !leadMatch && !bookingMatch) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (a.isOverdue && !b.isOverdue && a.status !== 'Completed') return -1;
            if (!a.isOverdue && b.isOverdue && b.status !== 'Completed') return 1;
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        });
    }, [scopedTasks, statusFilter, priorityFilter, searchQuery, staff, leads, bookings]);

    // ── Accurate Productivity Metrics ────────────────────────────────────────
    const metrics = useMemo(() => {
        const total = scopedTasks.length;
        const completed = scopedTasks.filter(t => t.status === 'Completed').length;
        const inProgress = scopedTasks.filter(t => t.status === 'In Progress').length;
        const pending = scopedTasks.filter(t => t.status === 'Pending').length;
        const overdue = scopedTasks.filter(t => t.isOverdue && t.status !== 'Completed').length;
        const activeWorkload = inProgress + pending;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            total,
            completed,
            inProgress,
            pending,
            activeWorkload,
            overdue,
            rate
        };
    }, [scopedTasks]);

    // ── Employee-Wise Productivity Aggregation ───────────────────────────────
    const employeeReports = useMemo<EmployeeProductivity[]>(() => {
        return staff.map(member => {
            const memberTasks = normalizedTasks.filter(t =>
                String(t.assignedTo) === String(member.id) &&
                isWithinTimeRange(t.createdAt || t.dueDate)
            );

            const totalAssigned = memberTasks.length;
            const completed = memberTasks.filter(t => t.status === 'Completed').length;
            const inProgress = memberTasks.filter(t => t.status === 'In Progress').length;
            const pending = memberTasks.filter(t => t.status === 'Pending').length;
            const overdue = memberTasks.filter(t => t.isOverdue && t.status !== 'Completed').length;
            const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

            let performanceTier: EmployeeProductivity['performanceTier'] = 'No Tasks';
            if (totalAssigned > 0) {
                if (completionRate >= 75 && overdue === 0) {
                    performanceTier = 'Top Performer';
                } else if (completionRate >= 40 && overdue <= 1) {
                    performanceTier = 'On Track';
                } else {
                    performanceTier = 'Needs Attention';
                }
            }

            return {
                staff: member,
                totalAssigned,
                completed,
                inProgress,
                pending,
                overdue,
                completionRate,
                performanceTier
            };
        }).sort((a, b) => {
            if (a.totalAssigned === 0 && b.totalAssigned > 0) return 1;
            if (a.totalAssigned > 0 && b.totalAssigned === 0) return -1;
            if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
            return b.totalAssigned - a.totalAssigned;
        });
    }, [staff, normalizedTasks, timeRange]);

    // ── Task Actions & Recurrence Handlers ────────────────────────────────────

    const handleToggleComplete = (task: Task) => {
        const newStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        const completedAt = newStatus === 'Completed' ? new Date().toISOString() : undefined;
        const completedBy = newStatus === 'Completed' ? (currentUser?.name || 'Admin') : undefined;

        updateTask(task.id, {
            status: newStatus,
            completedAt,
            completedBy
        });

        // If completing a recurring task, schedule the next recurrence!
        if (newStatus === 'Completed' && task.isRecurring && task.repeatFrequency) {
            const nextDueDate = calculateNextDueDate(
                task.dueDate,
                task.repeatFrequency as RepeatFrequency,
                task.repeatDays,
                task.repeatInterval
            );

            const nextTask: Task = {
                id: `TASK-${Date.now()}`,
                title: task.title,
                description: task.description,
                assignedTo: task.assignedTo,
                assignedBy: currentUser?.id || task.assignedBy,
                status: 'Pending',
                priority: task.priority,
                dueDate: nextDueDate,
                createdAt: new Date().toISOString(),
                category: task.category,
                relatedLeadId: task.relatedLeadId,
                relatedBookingId: task.relatedBookingId,
                source: 'manual',
                isRecurring: true,
                repeatFrequency: task.repeatFrequency,
                repeatDays: task.repeatDays,
                repeatInterval: task.repeatInterval,
                repeatRule: task.repeatRule
            };

            addTask(nextTask);
            toast.success(`Completed! Next recurrence automatically scheduled for ${nextDueDate}`);
        } else if (newStatus === 'Completed') {
            toast.success(`Completed: "${task.title}"`);
        } else {
            toast.info(`Reopened: "${task.title}"`);
        }
    };

    const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
        const completedAt = status === 'Completed' ? new Date().toISOString() : undefined;
        const completedBy = status === 'Completed' ? (currentUser?.name || 'Admin') : undefined;

        updateTask(taskId, {
            status,
            completedAt,
            completedBy
        });
        toast.success(`Task status: ${status}`);
    };

    const handleDeleteTask = (taskId: string) => {
        if (window.confirm('Delete this task?')) {
            deleteTask(taskId);
            toast.success('Task removed');
        }
    };

    const handleOpenCreateModal = (presetAssigneeId?: number) => {
        setEditingTask(null);
        setTaskForm({
            title: '',
            description: '',
            assignedTo: presetAssigneeId || (currentUser?.id ? Number(currentUser.id) : (staff[0]?.id || 0)),
            priority: 'Medium',
            dueDate: new Date().toISOString().split('T')[0],
            category: 'General',
            relatedLeadId: '',
            relatedBookingId: '',
            isRecurring: false,
            repeatFrequency: 'weekly',
            repeatDays: ['Mon', 'Wed', 'Fri'],
            repeatInterval: 3
        });
        setShowTaskModal(true);
    };

    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || '',
            assignedTo: Number(task.assignedTo) || 0,
            priority: task.priority || 'Medium',
            dueDate: task.dueDate || new Date().toISOString().split('T')[0],
            category: task.category || 'General',
            relatedLeadId: task.relatedLeadId || '',
            relatedBookingId: task.relatedBookingId || '',
            isRecurring: !!task.isRecurring,
            repeatFrequency: (task.repeatFrequency as RepeatFrequency) || 'weekly',
            repeatDays: task.repeatDays || ['Mon', 'Wed', 'Fri'],
            repeatInterval: task.repeatInterval || 3
        });
        setShowTaskModal(true);
    };

    const handleTaskFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title.trim()) {
            toast.error('Task title is required');
            return;
        }

        let repeatRule = '';
        if (taskForm.isRecurring) {
            if (taskForm.repeatFrequency === 'daily') {
                repeatRule = 'Daily';
            } else if (taskForm.repeatFrequency === 'weekly') {
                repeatRule = `Weekly: ${taskForm.repeatDays.join(', ') || 'Mon'}`;
            } else if (taskForm.repeatFrequency === 'custom_days') {
                repeatRule = `Every ${taskForm.repeatInterval} Days`;
            } else if (taskForm.repeatFrequency === 'monthly') {
                repeatRule = 'Monthly';
            }
        }

        const taskData: Partial<Task> = {
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            assignedTo: taskForm.assignedTo,
            assignedBy: currentUser?.id || 1,
            priority: taskForm.priority,
            dueDate: taskForm.dueDate,
            category: taskForm.category || 'General',
            relatedLeadId: taskForm.relatedLeadId || undefined,
            relatedBookingId: taskForm.relatedBookingId || undefined,
            source: 'manual',
            isRecurring: taskForm.isRecurring,
            repeatFrequency: taskForm.isRecurring ? taskForm.repeatFrequency : undefined,
            repeatDays: taskForm.isRecurring && taskForm.repeatFrequency === 'weekly' ? taskForm.repeatDays : undefined,
            repeatInterval: taskForm.isRecurring && taskForm.repeatFrequency === 'custom_days' ? taskForm.repeatInterval : undefined,
            repeatRule: taskForm.isRecurring ? repeatRule : undefined
        };

        if (editingTask) {
            updateTask(editingTask.id, taskData);
            toast.success('Task updated');
        } else {
            const newTask: Task = {
                id: `TASK-${Date.now()}`,
                title: taskData.title!,
                description: taskData.description,
                assignedTo: taskData.assignedTo!,
                assignedBy: taskData.assignedBy!,
                status: 'Pending',
                priority: taskData.priority!,
                dueDate: taskData.dueDate!,
                createdAt: new Date().toISOString(),
                category: taskData.category,
                relatedLeadId: taskData.relatedLeadId,
                relatedBookingId: taskData.relatedBookingId,
                source: 'manual',
                isRecurring: taskData.isRecurring,
                repeatFrequency: taskData.repeatFrequency,
                repeatDays: taskData.repeatDays,
                repeatInterval: taskData.repeatInterval,
                repeatRule: taskData.repeatRule
            };
            addTask(newTask);
            toast.success(taskForm.isRecurring ? 'Recurring task created' : 'New task assigned');
        }

        setShowTaskModal(false);
        setEditingTask(null);
    };

    // ── Bulk Actions ─────────────────────────────────────────────────────────

    const handleSelectAll = () => {
        if (selectedTasks.length === filteredTasks.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(filteredTasks.map(t => t.id));
        }
    };

    const handleToggleSelectTask = (taskId: string) => {
        setSelectedTasks(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const handleBulkStatus = (status: TaskStatus) => {
        if (!selectedTasks.length) return;
        selectedTasks.forEach(id => {
            updateTask(id, {
                status,
                completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
                completedBy: status === 'Completed' ? (currentUser?.name || 'Admin') : undefined
            });
        });
        toast.success(`Updated ${selectedTasks.length} tasks to ${status}`);
        setSelectedTasks([]);
    };

    const handleBulkDelete = () => {
        if (!selectedTasks.length) return;
        if (window.confirm(`Delete ${selectedTasks.length} selected tasks?`)) {
            selectedTasks.forEach(id => deleteTask(id));
            toast.success(`Deleted ${selectedTasks.length} tasks`);
            setSelectedTasks([]);
        }
    };

    // ── Export CSV Report ────────────────────────────────────────────────────
    const handleExportReport = () => {
        const rows = employeeReports.map(emp => ({
            Employee: emp.staff.name,
            Role: emp.staff.role,
            TotalAssigned: emp.totalAssigned,
            Completed: emp.completed,
            InProgress: emp.inProgress,
            Pending: emp.pending,
            Overdue: emp.overdue,
            CompletionRate: `${emp.completionRate}%`,
            StatusTier: emp.performanceTier
        }));

        if (!rows.length) {
            toast.error('No employee report data to export');
            return;
        }

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(r => headers.map(h => JSON.stringify(r[h as keyof typeof r] ?? '')).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Team_Productivity_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Productivity report exported');
    };

    const applyDatePreset = (daysFromNow: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysFromNow);
        setTaskForm(prev => ({ ...prev, dueDate: d.toISOString().split('T')[0] }));
    };

    const toggleWeekday = (day: string) => {
        setTaskForm(prev => {
            const exists = prev.repeatDays.includes(day);
            const newDays = exists ? prev.repeatDays.filter(d => d !== day) : [...prev.repeatDays, day];
            return { ...prev, repeatDays: newDays.length ? newDays : [day] };
        });
    };

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1600px] mx-auto text-slate-900">

            {/* ── 1. Compact Unified Top Bar ───────────────────────────────── */}
            <header className="bg-white/90 backdrop-blur-xl border border-slate-200/80 px-4 py-3 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-display">
                                Productivity Hub
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {metrics.total} Tasks
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Assign, track deadlines, and monitor team performance
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Timeframe Selector */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                        {(['all', 'today', 'week', 'month'] as TimeRange[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                                    timeRange === t
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t === 'week' ? '7 Days' : '30 Days'}
                            </button>
                        ))}
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-44 sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tasks, leads, bookings..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-7 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Primary Action Button */}
                    <button
                        onClick={() => handleOpenCreateModal()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 text-indigo-300" />
                        <span>Assign Task</span>
                    </button>
                </div>
            </header>

            {/* ── 2. Slimline Metric Strip ─────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Completion Rate */}
                <div className="bg-white/90 border border-slate-200/80 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completion</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-extrabold text-slate-900 font-mono">{metrics.rate}%</span>
                            <span className="text-[11px] text-slate-400">({metrics.completed}/{metrics.total})</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center font-bold text-xs">
                        <TrendingUp className={`w-4 h-4 ${metrics.rate >= 75 ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    </div>
                </div>

                {/* Completed Deliverables */}
                <div className="bg-white/90 border border-slate-200/80 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-extrabold text-emerald-600 font-mono">{metrics.completed}</span>
                            <span className="text-[11px] text-slate-400">tasks done</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                </div>

                {/* Active Workload */}
                <div className="bg-white/90 border border-slate-200/80 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Workload</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-extrabold text-indigo-600 font-mono">{metrics.activeWorkload}</span>
                            <span className="text-[11px] text-slate-400">({metrics.inProgress} in prog · {metrics.pending} pending)</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                    </div>
                </div>

                {/* Overdue / Delayed Tasks */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'Overdue' ? 'all' : 'Overdue')}
                    className={`border px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                        metrics.overdue > 0
                            ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/80'
                            : 'bg-white/90 border-slate-200/80'
                    }`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overdue</span>
                            {metrics.overdue > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-100 text-rose-700 font-bold">
                                    Needs Action
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className={`text-xl font-extrabold font-mono ${metrics.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {metrics.overdue}
                            </span>
                            <span className="text-[11px] text-slate-400">delayed tasks</span>
                        </div>
                    </div>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${metrics.overdue > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                        <AlertCircle className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* ── 3. Unified Dual-Pane Workstation ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

                {/* ── LEFT PANE: Team Roster & Quick Staff Filter (3 cols) ─── */}
                <aside className="lg:col-span-4 xl:col-span-3 bg-white/90 border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            Team Roster & Workload
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                            {staff.length} Members
                        </span>
                    </div>

                    {/* "All Team" Master Selector */}
                    <button
                        onClick={() => setSelectedStaffId('all')}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                            selectedStaffId === 'all'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                selectedStaffId === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                                👥
                            </div>
                            <div>
                                <span className="block text-xs font-bold leading-none">All Team Members</span>
                                <span className={`text-[10px] ${selectedStaffId === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {productivityTasks.length} Total Tasks
                                </span>
                            </div>
                        </div>
                        <span className={`text-xs font-mono font-bold ${selectedStaffId === 'all' ? 'text-indigo-300' : 'text-slate-600'}`}>
                            {metrics.rate}%
                        </span>
                    </button>

                    {/* Individual Staff List with Live Completion Bars */}
                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5">
                        {employeeReports.map(emp => {
                            const isSelected = String(selectedStaffId) === String(emp.staff.id);

                            return (
                                <button
                                    key={emp.staff.id}
                                    onClick={() => setSelectedStaffId(String(emp.staff.id))}
                                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                                        isSelected
                                            ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 shadow-sm'
                                            : 'bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                {emp.staff.initials || emp.staff.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate leading-tight">{emp.staff.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{emp.staff.role}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {emp.overdue > 0 && (
                                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${emp.overdue} overdue`} />
                                            )}
                                            <span className="text-[11px] font-mono font-bold text-slate-700">
                                                {emp.completionRate}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mini Progress Bar */}
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                emp.completionRate >= 75 ? 'bg-emerald-500' : emp.completionRate >= 40 ? 'bg-indigo-500' : 'bg-amber-500'
                                            }`}
                                            style={{ width: `${emp.completionRate}%` }}
                                        />
                                    </div>

                                    {/* Sub-counts */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                        <span>{emp.completed} Done</span>
                                        <span>•</span>
                                        <span>{emp.inProgress + emp.pending} Active</span>
                                        {emp.overdue > 0 && (
                                            <>
                                                <span>•</span>
                                                <span className="text-rose-600 font-semibold">{emp.overdue} Late</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Left Pane Footer Button */}
                    <button
                        onClick={() => setActiveView('reports')}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Open Performance Matrix</span>
                    </button>
                </aside>

                {/* ── RIGHT PANE: Main Tasks Stage (9 cols) ───────────────── */}
                <main className="lg:col-span-8 xl:col-span-9 space-y-3">

                    {/* View Switcher & Filter Capsule Row */}
                    <div className="bg-white/90 border border-slate-200/80 px-3.5 py-2.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
                            {[
                                { key: 'all', label: 'All', count: scopedTasks.length },
                                { key: 'Pending', label: 'Pending', count: scopedTasks.filter(t => t.status === 'Pending').length },
                                { key: 'In Progress', label: 'In Progress', count: scopedTasks.filter(t => t.status === 'In Progress').length },
                                { key: 'Completed', label: 'Completed', count: scopedTasks.filter(t => t.status === 'Completed').length },
                                { key: 'Overdue', label: 'Overdue', count: scopedTasks.filter(t => t.isOverdue && t.status !== 'Completed').length }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setStatusFilter(tab.key as any)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        statusFilter === tab.key
                                            ? tab.key === 'Overdue'
                                                ? 'bg-rose-500 text-white shadow-sm'
                                                : 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                                        statusFilter === tab.key
                                            ? 'bg-white/20 text-white'
                                            : tab.key === 'Overdue' && tab.count > 0
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* View Mode Toggle & Priority */}
                        <div className="flex items-center gap-2">
                            <select
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value as any)}
                                aria-label="Filter by priority"
                                className="h-7 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Priorities</option>
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>

                            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                                <button
                                    onClick={() => setActiveView('list')}
                                    title="Table List View"
                                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeView === 'list'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setActiveView('board')}
                                    title="Kanban Board View"
                                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeView === 'board'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <Kanban className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setActiveView('reports')}
                                    title="Team Performance Reports"
                                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeView === 'reports'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── SUB-VIEW A: LIST VIEW (High-Density Table) ───────── */}
                    {activeView === 'list' && (
                        <div className="bg-white/95 border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                            {/* Table Actions Header */}
                            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                                        onChange={handleSelectAll}
                                        aria-label="Select all tasks"
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                    />
                                    <span>
                                        {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'} Shown
                                        {selectedStaffId !== 'all' && ` (Assigned to ${getStaffName(selectedStaffId)})`}
                                    </span>
                                </div>
                                {selectedStaffId !== 'all' && (
                                    <button
                                        onClick={() => setSelectedStaffId('all')}
                                        className="text-xs text-indigo-600 hover:underline font-medium"
                                    >
                                        Show All Team Tasks
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/40 text-slate-500 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="py-2.5 px-3 w-8"></th>
                                            <th className="py-2.5 px-2 w-8"></th>
                                            <th className="py-2.5 px-3">Task Details</th>
                                            <th className="py-2.5 px-3">Assignee</th>
                                            <th className="py-2.5 px-3">Priority</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Deadline</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredTasks.map(task => {
                                            const staffMember = getStaffMember(task.assignedTo);
                                            const dueBadge = formatDueDateBadge(task.dueDate, task.status === 'Completed');
                                            const isSelected = selectedTasks.includes(task.id);
                                            const leadInfo = getLeadDisplay(task.relatedLeadId);
                                            const bookingInfo = getBookingDisplay(task.relatedBookingId);

                                            return (
                                                <tr
                                                    key={task.id}
                                                    className={`hover:bg-slate-50/80 transition-colors ${
                                                        isSelected ? 'bg-indigo-50/30' : ''
                                                    }`}
                                                >
                                                    {/* Row Checkbox */}
                                                    <td className="py-3 px-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelectTask(task.id)}
                                                            aria-label={`Select ${task.title}`}
                                                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                                                        />
                                                    </td>

                                                    {/* Quick 1-Click Complete */}
                                                    <td className="py-3 px-2">
                                                        <button
                                                            onClick={() => handleToggleComplete(task)}
                                                            title={task.status === 'Completed' ? 'Mark Incomplete' : 'Mark Completed'}
                                                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                                                task.status === 'Completed'
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                    : 'border-slate-300 hover:border-indigo-500 text-transparent hover:text-slate-300'
                                                            }`}
                                                        >
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                    </td>

                                                    {/* Task Title & Details */}
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-semibold text-slate-900 text-xs ${
                                                                    task.status === 'Completed' ? 'line-through text-slate-400' : ''
                                                                }`}>
                                                                    {task.title}
                                                                </span>
                                                                {task.isRecurring && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                        <Repeat className="w-2.5 h-2.5" />
                                                                        {task.repeatRule || 'Recurring'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {task.description && (
                                                                <span className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                                                                    {task.description}
                                                                </span>
                                                            )}

                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                {task.category && (
                                                                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                                                                        {task.category}
                                                                    </span>
                                                                )}
                                                                {leadInfo && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-100">
                                                                        <Briefcase className="w-2.5 h-2.5 text-sky-500" />
                                                                        <span>{leadInfo.name}</span>
                                                                    </span>
                                                                )}
                                                                {bookingInfo && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-100">
                                                                        <Layers className="w-2.5 h-2.5 text-purple-500" />
                                                                        <span>{bookingInfo.customer} ({bookingInfo.title})</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Assignee */}
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                                {staffMember?.initials || staffMember?.name?.substring(0, 2).toUpperCase() || 'UN'}
                                                            </div>
                                                            <span className="text-slate-700 text-xs">
                                                                {staffMember?.name || 'Unassigned'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Priority */}
                                                    <td className="py-3 px-3">
                                                        <PriorityPill priority={task.priority} />
                                                    </td>

                                                    {/* Status Dropdown */}
                                                    <td className="py-3 px-3">
                                                        <select
                                                            value={task.status}
                                                            onChange={e => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                                                            aria-label="Update status"
                                                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Completed">Completed</option>
                                                        </select>
                                                    </td>

                                                    {/* Due Date */}
                                                    <td className="py-3 px-3">
                                                        {dueBadge && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] ${dueBadge.color}`}>
                                                                <Calendar className="w-3 h-3" />
                                                                {dueBadge.text}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => handleOpenEditModal(task)}
                                                                aria-label="Edit task"
                                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                aria-label="Delete task"
                                                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {filteredTasks.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                                    <CheckCircle2 className="w-9 h-9 mx-auto mb-2 opacity-30 text-indigo-500" />
                                                    <p className="font-semibold text-xs">No tasks found for the current filter</p>
                                                    <button
                                                        onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setSearchQuery(''); }}
                                                        className="mt-2 text-indigo-600 text-xs font-semibold hover:underline"
                                                    >
                                                        Reset Filter
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── SUB-VIEW B: BOARD VIEW (Kanban) ─────────────────── */}
                    {activeView === 'board' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
                            {/* Column 1: Pending */}
                            <div className="bg-slate-100/70 border border-slate-200/70 rounded-2xl p-3 flex flex-col min-h-[420px]">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 mb-2.5 px-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                        <h3 className="font-bold text-xs text-slate-800">To Do / Pending</h3>
                                    </div>
                                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-white text-slate-600 shadow-sm">
                                        {filteredTasks.filter(t => t.status === 'Pending').length}
                                    </span>
                                </div>

                                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[60vh]">
                                    {filteredTasks
                                        .filter(t => t.status === 'Pending')
                                        .map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                staffMember={getStaffMember(task.assignedTo)}
                                                leadInfo={getLeadDisplay(task.relatedLeadId)}
                                                bookingInfo={getBookingDisplay(task.relatedBookingId)}
                                                onToggleComplete={() => handleToggleComplete(task)}
                                                onUpdateStatus={status => handleUpdateStatus(task.id, status)}
                                                onEdit={() => handleOpenEditModal(task)}
                                                onDelete={() => handleDeleteTask(task.id)}
                                            />
                                        ))}

                                    {filteredTasks.filter(t => t.status === 'Pending').length === 0 && (
                                        <div className="text-center py-10 px-3 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                            <Clock className="w-6 h-6 mx-auto mb-1 opacity-30 text-amber-500" />
                                            <p className="text-[11px]">No pending tasks</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 2: In Progress */}
                            <div className="bg-slate-100/70 border border-slate-200/70 rounded-2xl p-3 flex flex-col min-h-[420px]">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 mb-2.5 px-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                        <h3 className="font-bold text-xs text-slate-800">In Progress</h3>
                                    </div>
                                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-white text-slate-600 shadow-sm">
                                        {filteredTasks.filter(t => t.status === 'In Progress').length}
                                    </span>
                                </div>

                                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[60vh]">
                                    {filteredTasks
                                        .filter(t => t.status === 'In Progress')
                                        .map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                staffMember={getStaffMember(task.assignedTo)}
                                                leadInfo={getLeadDisplay(task.relatedLeadId)}
                                                bookingInfo={getBookingDisplay(task.relatedBookingId)}
                                                onToggleComplete={() => handleToggleComplete(task)}
                                                onUpdateStatus={status => handleUpdateStatus(task.id, status)}
                                                onEdit={() => handleOpenEditModal(task)}
                                                onDelete={() => handleDeleteTask(task.id)}
                                            />
                                        ))}

                                    {filteredTasks.filter(t => t.status === 'In Progress').length === 0 && (
                                        <div className="text-center py-10 px-3 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                            <Layers className="w-6 h-6 mx-auto mb-1 opacity-30 text-indigo-500" />
                                            <p className="text-[11px]">No active tasks in progress</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 3: Completed */}
                            <div className="bg-slate-100/70 border border-slate-200/70 rounded-2xl p-3 flex flex-col min-h-[420px]">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 mb-2.5 px-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <h3 className="font-bold text-xs text-slate-800">Completed</h3>
                                    </div>
                                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-white text-slate-600 shadow-sm">
                                        {filteredTasks.filter(t => t.status === 'Completed').length}
                                    </span>
                                </div>

                                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[60vh]">
                                    {filteredTasks
                                        .filter(t => t.status === 'Completed')
                                        .map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                staffMember={getStaffMember(task.assignedTo)}
                                                leadInfo={getLeadDisplay(task.relatedLeadId)}
                                                bookingInfo={getBookingDisplay(task.relatedBookingId)}
                                                onToggleComplete={() => handleToggleComplete(task)}
                                                onUpdateStatus={status => handleUpdateStatus(task.id, status)}
                                                onEdit={() => handleOpenEditModal(task)}
                                                onDelete={() => handleDeleteTask(task.id)}
                                            />
                                        ))}

                                    {filteredTasks.filter(t => t.status === 'Completed').length === 0 && (
                                        <div className="text-center py-10 px-3 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 opacity-30 text-emerald-500" />
                                            <p className="text-[11px]">No completed tasks yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SUB-VIEW C: EMPLOYEE PERFORMANCE MATRIX ─────────── */}
                    {activeView === 'reports' && (
                        <div className="bg-white/95 border border-slate-200/80 rounded-2xl shadow-sm p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Team Performance Matrix & Delivery Scorecard
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Completion rates, workload distribution, and delay diagnostics
                                    </p>
                                </div>
                                <button
                                    onClick={handleExportReport}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Export CSV</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="py-2.5 px-3">Employee</th>
                                            <th className="py-2.5 px-3">Assigned</th>
                                            <th className="py-2.5 px-3">Completed</th>
                                            <th className="py-2.5 px-3">In Progress</th>
                                            <th className="py-2.5 px-3">Pending</th>
                                            <th className="py-2.5 px-3">Overdue</th>
                                            <th className="py-2.5 px-3">Completion Rate</th>
                                            <th className="py-2.5 px-3">Status Tier</th>
                                            <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {employeeReports.map(emp => (
                                            <tr key={emp.staff.id} className="hover:bg-slate-50">
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                                            {emp.staff.initials || emp.staff.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-xs">{emp.staff.name}</p>
                                                            <p className="text-[10px] text-slate-400">{emp.staff.role}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 font-mono font-bold">{emp.totalAssigned}</td>
                                                <td className="py-3 px-3 font-mono text-emerald-600 font-bold">{emp.completed}</td>
                                                <td className="py-3 px-3 font-mono text-indigo-600">{emp.inProgress}</td>
                                                <td className="py-3 px-3 font-mono text-slate-600">{emp.pending}</td>
                                                <td className="py-3 px-3 font-mono text-rose-600 font-bold">
                                                    {emp.overdue > 0 ? `${emp.overdue} Late` : '0'}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    emp.completionRate >= 75 ? 'bg-emerald-500' : emp.completionRate >= 40 ? 'bg-indigo-500' : 'bg-amber-500'
                                                                }`}
                                                                style={{ width: `${emp.completionRate}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-mono font-bold text-xs">{emp.completionRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                        emp.performanceTier === 'Top Performer'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : emp.performanceTier === 'On Track'
                                                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                            : emp.performanceTier === 'Needs Attention'
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                            : 'bg-slate-50 text-slate-400 border-slate-200'
                                                    }`}>
                                                        {emp.performanceTier}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedStaffId(String(emp.staff.id));
                                                            setActiveView('list');
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold transition-all"
                                                    >
                                                        Filter Tasks
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Bulk Actions Floating Capsule ───────────────────────────── */}
            {selectedTasks.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-xl text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
                    <span className="text-xs font-semibold text-slate-300 font-mono">
                        {selectedTasks.length} selected
                    </span>
                    <div className="h-4 w-px bg-slate-700" />
                    <button
                        onClick={() => handleBulkStatus('Completed')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold transition-all"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                    </button>
                    <button
                        onClick={() => handleBulkStatus('In Progress')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold transition-all"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>In Progress</span>
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-xs font-semibold transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                    </button>
                    <button
                        onClick={() => setSelectedTasks([])}
                        className="text-xs text-slate-400 hover:text-white ml-1"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ── Apple-Inspired Task Modal (Z-[9999] High-Priority Overlay) ─ */}
            {showTaskModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
                    <div
                        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Sticky Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                                    {editingTask ? 'Edit Task' : 'Assign New Task'}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Specify responsibility, deadline, recurrence, and priority
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTaskModal(false);
                                    setEditingTask(null);
                                }}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleTaskFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                            {/* Title */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    Task Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Finalize custom quote or follow up on client visa"
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    Instructions & Deliverable Notes
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add context, instructions, or specific constraints..."
                                    value={taskForm.description}
                                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                                />
                            </div>

                            {/* Assignee & Category */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        Assign To *
                                    </label>
                                    <select
                                        required
                                        value={taskForm.assignedTo}
                                        onChange={e => setTaskForm({ ...taskForm, assignedTo: Number(e.target.value) })}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                    >
                                        <option value={0} disabled>Select staff member</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={taskForm.category}
                                        onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                    >
                                        <option value="General">General</option>
                                        <option value="Lead Follow-up">Lead Follow-up</option>
                                        <option value="Booking Coordination">Booking Coordination</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Finance & Billing">Finance & Billing</option>
                                        <option value="Ticketing">Ticketing</option>
                                        <option value="Customer Care">Customer Care</option>
                                    </select>
                                </div>
                            </div>

                            {/* Priority Level */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1.5">
                                    Priority Level
                                </label>
                                <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                                    {(['Low', 'Medium', 'High', 'Urgent'] as TaskPriority[]).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setTaskForm({ ...taskForm, priority: p })}
                                            className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                taskForm.priority === p
                                                    ? p === 'Urgent'
                                                        ? 'bg-rose-500 text-white shadow-sm'
                                                        : p === 'High'
                                                        ? 'bg-amber-500 text-white shadow-sm'
                                                        : p === 'Medium'
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-white text-slate-800 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Due Date with Quick Presets */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="font-semibold text-slate-700">
                                        Due Date *
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => applyDatePreset(0)}
                                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600"
                                        >
                                            Today
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyDatePreset(1)}
                                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600"
                                        >
                                            Tomorrow
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyDatePreset(3)}
                                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600"
                                        >
                                            +3 Days
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyDatePreset(7)}
                                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600"
                                        >
                                            Next Week
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="date"
                                    required
                                    value={taskForm.dueDate}
                                    onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>

                            {/* ── REPEAT / RECURRING TASK SECTION ────────────────── */}
                            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${taskForm.isRecurring ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            <Repeat className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-800 text-xs block">Repeat Task</span>
                                            <span className="text-[10px] text-slate-400">Schedule automatic recurring task cadence</span>
                                        </div>
                                    </div>

                                    {/* Apple Toggle Switch */}
                                    <button
                                        type="button"
                                        onClick={() => setTaskForm({ ...taskForm, isRecurring: !taskForm.isRecurring })}
                                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                                            taskForm.isRecurring ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                                        }`}
                                    >
                                        <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform" />
                                    </button>
                                </div>

                                {taskForm.isRecurring && (
                                    <div className="pt-2 border-t border-slate-200/60 space-y-3 animate-in fade-in duration-200">
                                        {/* Frequency Options */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                                                Recurrence Cadence
                                            </label>
                                            <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                                                {[
                                                    { key: 'daily', label: 'Daily' },
                                                    { key: 'weekly', label: 'Days of Week' },
                                                    { key: 'custom_days', label: 'Interval' },
                                                    { key: 'monthly', label: 'Monthly' }
                                                ].map(f => (
                                                    <button
                                                        key={f.key}
                                                        type="button"
                                                        onClick={() => setTaskForm({ ...taskForm, repeatFrequency: f.key as RepeatFrequency })}
                                                        className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                            taskForm.repeatFrequency === f.key
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : 'text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Weekly Specific Days Selector */}
                                        {taskForm.repeatFrequency === 'weekly' && (
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                                                    Repeat on Specific Days:
                                                </label>
                                                <div className="flex items-center justify-between gap-1">
                                                    {WEEKDAYS.map(day => {
                                                        const isSelected = taskForm.repeatDays.includes(day);
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => toggleWeekday(day)}
                                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                                                    isSelected
                                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom Interval (Every X Days) */}
                                        {taskForm.repeatFrequency === 'custom_days' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-600">Repeat every</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={90}
                                                    value={taskForm.repeatInterval}
                                                    onChange={e => setTaskForm({ ...taskForm, repeatInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    className="w-16 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-center"
                                                />
                                                <span className="text-xs text-slate-600">days</span>
                                            </div>
                                        )}

                                        {/* Summary text */}
                                        <div className="text-[11px] text-indigo-700 bg-indigo-50/70 px-2.5 py-1.5 rounded-xl font-medium border border-indigo-100 flex items-center gap-1.5">
                                            <RefreshCw className="w-3 h-3 text-indigo-500" />
                                            <span>
                                                {taskForm.repeatFrequency === 'daily' && 'Task will recur every single day.'}
                                                {taskForm.repeatFrequency === 'weekly' && `Task will recur weekly on: ${taskForm.repeatDays.join(', ')}`}
                                                {taskForm.repeatFrequency === 'custom_days' && `Task will recur every ${taskForm.repeatInterval} days.`}
                                                {taskForm.repeatFrequency === 'monthly' && 'Task will recur on the same day every month.'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── APPLE-STYLE SEARCHABLE LEAD & BOOKING SELECTORS ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {/* Searchable Lead Selector */}
                                <SearchableLeadSelect
                                    leads={leads}
                                    selectedLeadId={taskForm.relatedLeadId}
                                    onSelectLead={id => setTaskForm({ ...taskForm, relatedLeadId: id })}
                                />

                                {/* Searchable Booking Selector */}
                                <SearchableBookingSelect
                                    bookings={bookings}
                                    selectedBookingId={taskForm.relatedBookingId}
                                    onSelectBooking={id => setTaskForm({ ...taskForm, relatedBookingId: id })}
                                />
                            </div>

                            {/* Sticky Footer */}
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTaskModal(false);
                                        setEditingTask(null);
                                    }}
                                    className="flex-1 h-9 rounded-xl border border-slate-200 font-semibold text-xs text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
                                >
                                    {editingTask ? 'Save Changes' : taskForm.isRecurring ? 'Assign Recurring Task' : 'Assign Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

// ── Searchable Combobox for Leads (Zero Raw UUIDs!) ──────────────────────────

interface SearchableLeadSelectProps {
    leads: Lead[];
    selectedLeadId: string;
    onSelectLead: (id: string) => void;
}

const SearchableLeadSelect: React.FC<SearchableLeadSelectProps> = ({
    leads,
    selectedLeadId,
    onSelectLead
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLead = useMemo(() => {
        return leads.find(l => l.id === selectedLeadId);
    }, [leads, selectedLeadId]);

    const filteredLeads = useMemo(() => {
        if (!query.trim()) return leads.slice(0, 30);
        const q = query.toLowerCase();
        return leads.filter(l =>
            l.name?.toLowerCase().includes(q) ||
            l.destination?.toLowerCase().includes(q) ||
            l.phone?.includes(q)
        ).slice(0, 30);
    }, [leads, query]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-slate-700 mb-1 text-xs">
                Link Lead (Optional)
            </label>

            {selectedLead ? (
                <div className="h-10 px-3 rounded-xl border border-sky-200 bg-sky-50/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <Briefcase className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                        <span className="font-semibold text-sky-950 truncate">{selectedLead.name}</span>
                        {selectedLead.destination && (
                            <span className="text-[10px] text-sky-600 truncate">({selectedLead.destination})</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelectLead('')}
                        className="p-1 rounded-lg hover:bg-sky-200/50 text-sky-600 hover:text-sky-800"
                        title="Unlink Lead"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:border-slate-300 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <span>Choose related lead...</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
            )}

            {/* Floating Dropdown Panel */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-full sm:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Type client name, destination..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                            className="w-full h-8 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                        <button
                            type="button"
                            onClick={() => {
                                onSelectLead('');
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 flex items-center justify-between"
                        >
                            <span>None (No Lead)</span>
                        </button>

                        {filteredLeads.map(l => (
                            <button
                                key={l.id}
                                type="button"
                                onClick={() => {
                                    onSelectLead(l.id);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-indigo-50 hover:text-indigo-950 flex flex-col transition-colors group"
                            >
                                <span className="font-bold text-slate-900 group-hover:text-indigo-950 truncate">
                                    {l.name}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                    {l.leadNumber && <span>LD-{l.leadNumber}</span>}
                                    {l.destination && <span>• {l.destination}</span>}
                                    {l.phone && <span>• {l.phone}</span>}
                                </div>
                            </button>
                        ))}

                        {filteredLeads.length === 0 && (
                            <p className="text-center py-4 text-[11px] text-slate-400">No leads match "{query}"</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Searchable Combobox for Bookings (Zero Raw UUIDs!) ───────────────────────

interface SearchableBookingSelectProps {
    bookings: Booking[];
    selectedBookingId: string;
    onSelectBooking: (id: string) => void;
}

const SearchableBookingSelect: React.FC<SearchableBookingSelectProps> = ({
    bookings,
    selectedBookingId,
    onSelectBooking
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedBooking = useMemo(() => {
        return bookings.find(b => b.id === selectedBookingId);
    }, [bookings, selectedBookingId]);

    const filteredBookings = useMemo(() => {
        if (!query.trim()) return bookings.slice(0, 30);
        const q = query.toLowerCase();
        return bookings.filter(b =>
            b.customer?.toLowerCase().includes(q) ||
            b.title?.toLowerCase().includes(q)
        ).slice(0, 30);
    }, [bookings, query]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-slate-700 mb-1 text-xs">
                Link Booking (Optional)
            </label>

            {selectedBooking ? (
                <div className="h-10 px-3 rounded-xl border border-purple-200 bg-purple-50/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span className="font-semibold text-purple-950 truncate">
                            {selectedBooking.customer || 'Customer'}
                        </span>
                        {selectedBooking.title && (
                            <span className="text-[10px] text-purple-600 truncate">({selectedBooking.title})</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelectBooking('')}
                        className="p-1 rounded-lg hover:bg-purple-200/50 text-purple-600 hover:text-purple-800"
                        title="Unlink Booking"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:border-slate-300 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <span>Choose related booking...</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
            )}

            {/* Floating Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-full sm:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Type customer or tour name..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                            className="w-full h-8 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                        <button
                            type="button"
                            onClick={() => {
                                onSelectBooking('');
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 flex items-center justify-between"
                        >
                            <span>None (No Booking)</span>
                        </button>

                        {filteredBookings.map(b => (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                    onSelectBooking(b.id);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-purple-50 hover:text-purple-950 flex flex-col transition-colors group"
                            >
                                <span className="font-bold text-slate-900 group-hover:text-purple-950 truncate">
                                    {b.customer || 'Guest Booking'}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                    {b.bookingNumber && <span>BK-{b.bookingNumber}</span>}
                                    {b.title && <span>• {b.title}</span>}
                                    {b.date && <span>• {b.date}</span>}
                                </div>
                            </button>
                        ))}

                        {filteredBookings.length === 0 && (
                            <p className="text-center py-4 text-[11px] text-slate-400">No bookings match "{query}"</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Subcomponents ────────────────────────────────────────────────────────────

interface TaskCardProps {
    task: Task & { isOverdue?: boolean };
    staffMember?: StaffMember;
    leadInfo?: { name: string; code: string; destination: string } | null;
    bookingInfo?: { customer: string; title: string; code: string } | null;
    onToggleComplete: () => void;
    onUpdateStatus: (status: TaskStatus) => void;
    onEdit: () => void;
    onDelete: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
    task,
    staffMember,
    leadInfo,
    bookingInfo,
    onToggleComplete,
    onUpdateStatus,
    onEdit,
    onDelete
}) => {
    const dueBadge = formatDueDateBadge(task.dueDate, task.status === 'Completed');

    return (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/80 hover:shadow-md transition-all group relative flex flex-col justify-between">
            <div>
                {/* Header: Priority, Recurring & Quick Options */}
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                        <PriorityPill priority={task.priority} />
                        {task.isRecurring && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Repeat className="w-2.5 h-2.5" />
                                {task.repeatRule || 'Recurring'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={onEdit}
                            title="Edit task"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={onDelete}
                            title="Delete task"
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Title & Checkbox */}
                <div className="flex items-start gap-2 mb-1.5">
                    <button
                        onClick={onToggleComplete}
                        title={task.status === 'Completed' ? 'Mark Incomplete' : 'Mark Completed'}
                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                            task.status === 'Completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 hover:border-indigo-500 text-transparent'
                        }`}
                    >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </button>

                    <h4 className={`text-xs font-bold text-slate-900 leading-snug ${
                        task.status === 'Completed' ? 'line-through text-slate-400' : ''
                    }`}>
                        {task.title}
                    </h4>
                </div>

                {/* Description */}
                {task.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 pl-6">
                        {task.description}
                    </p>
                )}

                {/* Category & Clean Link Tags */}
                <div className="flex flex-wrap items-center gap-1 pl-6 mb-2">
                    {task.category && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                            {task.category}
                        </span>
                    )}
                    {leadInfo && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-100">
                            <Briefcase className="w-2.5 h-2.5 text-sky-500" />
                            <span>{leadInfo.name}</span>
                        </span>
                    )}
                    {bookingInfo && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-100">
                            <Layers className="w-2.5 h-2.5 text-purple-500" />
                            <span>{bookingInfo.customer} ({bookingInfo.title})</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] pl-1">
                {dueBadge && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] ${dueBadge.color}`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {dueBadge.text}
                    </span>
                )}

                <div className="flex items-center gap-1.5">
                    <select
                        value={task.status}
                        onChange={e => onUpdateStatus(e.target.value as TaskStatus)}
                        aria-label="Change status"
                        className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
                    >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>

                    <div
                        title={`Assigned to: ${staffMember?.name || 'Unassigned'}`}
                        className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0"
                    >
                        {staffMember?.initials || staffMember?.name?.substring(0, 2).toUpperCase() || 'UN'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PriorityPill: React.FC<{ priority?: TaskPriority }> = ({ priority = 'Medium' }) => {
    const config = {
        Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
        High: 'bg-amber-50 text-amber-700 border-amber-200',
        Medium: 'bg-sky-50 text-sky-700 border-sky-200',
        Low: 'bg-slate-50 text-slate-600 border-slate-200'
    }[priority];

    return (
        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${config}`}>
            {priority}
        </span>
    );
};

export default Productivity;
