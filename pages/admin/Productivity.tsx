import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskStatus, TaskPriority, DailyTarget, UserActivity, TimeSession, AssignmentRule, AssignmentStrategy } from '../../types';
import { toast } from 'sonner';
import {
    Users, Target, BarChart3, Activity, Plus, Calendar, Clock, CheckCircle2,
    AlertCircle, TrendingUp, Filter, Search, MoreHorizontal, Edit2, Trash2, X,
    Trophy, Crown, Medal, Zap, RefreshCw, UserCheck, Flame, Award,
    Timer, Play, Pause, Square, Settings, Shuffle, GitBranch
} from 'lucide-react';

// Tab Component
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${active
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
    >
        {icon}
        {label}
    </button>
);

// Status Badge
const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
    const colors: Record<TaskStatus, string> = {
        'Pending': 'bg-amber-100 text-amber-700',
        'In Progress': 'bg-blue-100 text-blue-700',
        'Completed': 'bg-emerald-100 text-emerald-700',
        'Overdue': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colors[status]}`}>{status}</span>;
};

// Priority Badge
const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
    const colors: Record<TaskPriority, string> = {
        'Low': 'bg-slate-100 text-slate-600',
        'Medium': 'bg-blue-100 text-blue-600',
        'High': 'bg-orange-100 text-orange-600',
        'Urgent': 'bg-red-100 text-red-600'
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[priority]}`}>{priority}</span>;
};

export const Productivity: React.FC = () => {
    const {
        tasks, addTask, updateTask, deleteTask, dailyTargets, addDailyTarget, updateDailyTarget,
        userActivities, logUserActivity, leads, bookings,
        timeSessions, startTimeSession, updateTimeSession, endTimeSession, getActiveSession,
        assignmentRules, addAssignmentRule, updateAssignmentRule, deleteAssignmentRule
    } = useData();
    const { staff, currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'activity' | 'tasks' | 'targets' | 'reports' | 'settings'>('activity');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Phase 2 State
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month'>('week');

    // Phase 3 State - Time Tracking
    const [timerElapsed, setTimerElapsed] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [ruleForm, setRuleForm] = useState({
        name: '',
        strategy: 'round-robin' as AssignmentStrategy,
        triggerOn: 'new-lead' as 'new-lead' | 'new-booking' | 'new-task',
        eligibleStaffIds: [] as number[],
        isActive: true
    });

    // Timer Effect
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setTimerElapsed(prev => prev + 1000);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    // Timer Handlers
    const handleStartTimer = () => {
        if (currentUser) {
            const sessionId = startTimeSession(currentUser.id);
            setActiveSessionId(sessionId);
            setIsTimerRunning(true);
            setTimerElapsed(0);
            toast.success('Timer started');
        }
    };

    const handlePauseTimer = () => {
        setIsTimerRunning(false);
        if (activeSessionId) {
            updateTimeSession(activeSessionId, { status: 'Paused' });
        }
        toast.info('Timer paused');
    };

    const handleResumeTimer = () => {
        setIsTimerRunning(true);
        if (activeSessionId) {
            updateTimeSession(activeSessionId, { status: 'Active' });
        }
    };

    const handleStopTimer = () => {
        setIsTimerRunning(false);
        if (activeSessionId) {
            endTimeSession(activeSessionId);
            setActiveSessionId(null);
            setTimerElapsed(0);
            toast.success('Time session saved');
        }
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / 60000) % 60;
        const hours = Math.floor(ms / 3600000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Rule Handlers
    const handleAddRule = () => {
        if (!ruleForm.name) {
            toast.error('Rule name is required');
            return;
        }
        const rule: AssignmentRule = {
            id: `RULE-${Date.now()}`,
            ...ruleForm,
            priority: assignmentRules.length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        addAssignmentRule(rule);
        setShowRuleModal(false);
        setRuleForm({ name: '', strategy: 'round-robin', triggerOn: 'new-lead', eligibleStaffIds: [], isActive: true });
        toast.success('Assignment rule created');
    };


    // Task Form State
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assignedTo: 0,
        priority: 'Medium' as TaskPriority,
        dueDate: '',
        relatedLeadId: '',
        relatedBookingId: ''
    });

    // Target Form State
    const [targetForm, setTargetForm] = useState({
        staffId: 0,
        date: new Date().toISOString().split('T')[0],
        targetLeads: 5,
        targetCalls: 10,
        targetConversions: 2,
        targetBookings: 1
    });

    // Filtered & Sorted Tasks
    const filteredTasks = useMemo(() => {
        let result = tasks.filter(t => t.source === 'manual');
        if (taskFilter !== 'all') {
            result = result.filter(t => t.status === taskFilter);
        }
        if (searchQuery) {
            result = result.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [tasks, taskFilter, searchQuery]);

    // Recent Activities (last 50)
    const recentActivities = useMemo(() => userActivities.slice(0, 50), [userActivities]);

    // Online Staff (mock - in real app, this would come from presence tracking)
    const onlineStaff = useMemo(() => staff.filter(s => s.status === 'Active').slice(0, 5), [staff]);

    // Leaderboard Data
    const leaderboardData = useMemo(() => {
        const now = new Date();
        const periodStart = new Date();
        if (leaderboardPeriod === 'week') {
            periodStart.setDate(now.getDate() - 7);
        } else {
            periodStart.setMonth(now.getMonth() - 1);
        }

        return staff.map(member => {
            const memberTasks = tasks.filter(t =>
                t.assignedTo === member.id &&
                t.status === 'Completed' &&
                new Date(t.completedAt || t.createdAt) >= periodStart
            );
            const memberTargets = dailyTargets.filter(t =>
                t.staffId === member.id &&
                new Date(t.date) >= periodStart
            );

            const tasksCompleted = memberTasks.length;
            const targetsAchieved = memberTargets.filter(t =>
                t.actualLeads >= t.targetLeads &&
                t.actualCalls >= t.targetCalls
            ).length;
            const score = tasksCompleted * 10 + targetsAchieved * 25;

            return {
                ...member,
                tasksCompleted,
                targetsAchieved,
                score
            };
        }).sort((a, b) => b.score - a.score).slice(0, 10);
    }, [staff, tasks, dailyTargets, leaderboardPeriod]);

    // Quick Stats
    const quickStats = useMemo(() => {
        const manualTasks = tasks.filter(t => t.source === 'manual');
        const pendingTasks = manualTasks.filter(t => t.status === 'Pending').length;
        const overdueTasks = manualTasks.filter(t => t.status === 'Overdue' || (t.status !== 'Completed' && new Date(t.dueDate) < new Date())).length;
        const todayTargets = dailyTargets.filter(t => t.date === new Date().toISOString().split('T')[0]).length;
        const recentLeads = leads.filter(l => new Date(l.createdAt || '').getTime() > Date.now() - 86400000).length;
        return { pendingTasks, overdueTasks, todayTargets, recentLeads };
    }, [tasks, dailyTargets, leads]);

    // Bulk Task Handlers
    const handleSelectAllTasks = () => {
        if (selectedTasks.length === filteredTasks.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(filteredTasks.map(t => t.id));
        }
    };

    const handleSelectTask = (taskId: string) => {
        setSelectedTasks(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleBulkStatusChange = (status: TaskStatus) => {
        selectedTasks.forEach(id => {
            updateTask(id, { status, completedAt: status === 'Completed' ? new Date().toISOString() : undefined });
        });
        toast.success(`${selectedTasks.length} tasks marked as ${status}`);
        setSelectedTasks([]);
    };

    const handleBulkDelete = () => {
        if (confirm(`Delete ${selectedTasks.length} selected tasks?`)) {
            selectedTasks.forEach(id => deleteTask(id));
            toast.success(`${selectedTasks.length} tasks deleted`);
            setSelectedTasks([]);
        }
    };

    const handleBulkReassign = (newAssignee: number) => {
        selectedTasks.forEach(id => updateTask(id, { assignedTo: newAssignee }));
        toast.success(`${selectedTasks.length} tasks reassigned`);
        setSelectedTasks([]);
    };


    // Handle Task Submit
    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title || !taskForm.assignedTo || !taskForm.dueDate) {
            toast.error('Please fill all required fields');
            return;
        }

        const newTask: Task = {
            id: editingTask?.id || `TASK-${Date.now()}`,
            title: taskForm.title,
            description: taskForm.description,
            assignedTo: taskForm.assignedTo,
            assignedBy: currentUser?.id || 0,
            status: editingTask?.status || 'Pending',
            priority: taskForm.priority,
            dueDate: taskForm.dueDate,
            createdAt: editingTask?.createdAt || new Date().toISOString(),
            relatedLeadId: taskForm.relatedLeadId || undefined,
            relatedBookingId: taskForm.relatedBookingId || undefined,
            source: editingTask?.source || 'manual'
        };

        if (editingTask) {
            updateTask(editingTask.id, newTask);
            toast.success('Task updated');
        } else {
            addTask(newTask);
            toast.success('Task created');
        }

        setShowTaskModal(false);
        setEditingTask(null);
        setTaskForm({ title: '', description: '', assignedTo: 0, priority: 'Medium', dueDate: '', relatedLeadId: '', relatedBookingId: '' });
    };

    // Handle Target Submit
    const handleTargetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetForm.staffId || !targetForm.date) {
            toast.error('Please select staff and date');
            return;
        }

        const newTarget: DailyTarget = {
            id: `TGT-${Date.now()}`,
            staffId: targetForm.staffId,
            date: targetForm.date,
            targetLeads: targetForm.targetLeads,
            targetCalls: targetForm.targetCalls,
            targetConversions: targetForm.targetConversions,
            targetBookings: targetForm.targetBookings,
            actualLeads: 0,
            actualCalls: 0,
            actualConversions: 0,
            actualBookings: 0
        };

        addDailyTarget(newTarget);
        toast.success('Target set successfully');
        setShowTargetModal(false);
        setTargetForm({ staffId: 0, date: new Date().toISOString().split('T')[0], targetLeads: 5, targetCalls: 10, targetConversions: 2, targetBookings: 1 });
    };

    // Edit Task
    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || '',
            assignedTo: task.assignedTo,
            priority: task.priority,
            dueDate: task.dueDate,
            relatedLeadId: task.relatedLeadId || '',
            relatedBookingId: task.relatedBookingId || ''
        });
        setShowTaskModal(true);
    };

    // Update Task Status
    const handleStatusChange = (taskId: string, status: TaskStatus) => {
        updateTask(taskId, {
            status,
            completedAt: status === 'Completed' ? new Date().toISOString() : undefined
        });
        toast.success(`Task marked as ${status}`);
    };

    // Delete Task
    const handleDeleteTask = (id: string) => {
        if (confirm('Delete this task?')) {
            deleteTask(id);
            toast.success('Task deleted');
        }
    };

    // Get staff name by ID
    const getStaffName = (id: number) => staff.find(s => s.id === id)?.name || 'Unknown';

    // Format relative time
    const formatRelativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto admin-page-bg min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display text-4xl">Productivity Hub</h1>
                    <p className="text-slate-500 mt-1">Monitor team activity, assign tasks, and track performance</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', assignedTo: 0, priority: 'Medium', dueDate: '', relatedLeadId: '', relatedBookingId: '' }); setShowTaskModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all btn-glow"
                    >
                        <Plus className="w-4 h-4" /> Assign Task
                    </button>
                    <button
                        onClick={() => setShowTargetModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
                    >
                        <Target className="w-4 h-4" /> Set Target
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<Activity className="w-4 h-4" />} label="Activity" />
                <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle2 className="w-4 h-4" />} label="Tasks" />
                <TabButton active={activeTab === 'targets'} onClick={() => setActiveTab('targets')} icon={<Target className="w-4 h-4" />} label="Targets" />
                <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<BarChart3 className="w-4 h-4" />} label="Leaderboard" />
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-4 h-4" />} label="Settings" />

                {/* Timer Widget */}
                <div className="ml-auto flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl">
                    <Timer className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-lg">{formatTime(timerElapsed)}</span>
                    {!activeSessionId ? (
                        <button onClick={handleStartTimer} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600">
                            <Play className="w-4 h-4" />
                        </button>
                    ) : (
                        <>
                            {isTimerRunning ? (
                                <button onClick={handlePauseTimer} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600">
                                    <Pause className="w-4 h-4" />
                                </button>
                            ) : (
                                <button onClick={handleResumeTimer} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600">
                                    <Play className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={handleStopTimer} className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600">
                                <Square className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Activity Tab */}
            {activeTab === 'activity' && (
                <div className="space-y-6">
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-cards">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
                            <div className="flex items-center justify-between">
                                <AlertCircle className="w-8 h-8 opacity-80" />
                                <span className="text-4xl kpi-number">{quickStats.pendingTasks}</span>
                            </div>
                            <p className="text-sm font-semibold mt-2 opacity-90">Pending Tasks</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white">
                            <div className="flex items-center justify-between">
                                <Flame className="w-8 h-8 opacity-80" />
                                <span className="text-4xl kpi-number">{quickStats.overdueTasks}</span>
                            </div>
                            <p className="text-sm font-semibold mt-2 opacity-90">Overdue</p>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
                            <div className="flex items-center justify-between">
                                <Target className="w-8 h-8 opacity-80" />
                                <span className="text-4xl kpi-number">{quickStats.todayTargets}</span>
                            </div>
                            <p className="text-sm font-semibold mt-2 opacity-90">Today's Targets</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                            <div className="flex items-center justify-between">
                                <Zap className="w-8 h-8 opacity-80" />
                                <span className="text-4xl kpi-number">{quickStats.recentLeads}</span>
                            </div>
                            <p className="text-sm font-semibold mt-2 opacity-90">New Leads (24h)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Online Staff */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-emerald-500" /> Active Staff
                                </h3>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">{onlineStaff.length} Online</span>
                            </div>
                            <div className="space-y-3">
                                {onlineStaff.map(member => (
                                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                        <div className={`size-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm`}>
                                            {member.initials}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-900 text-sm">{member.name}</p>
                                            <p className="text-xs text-slate-500">{member.role}</p>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                ))}
                                {onlineStaff.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-4">No staff online</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" /> Quick Actions
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', assignedTo: 0, priority: 'Medium', dueDate: '', relatedLeadId: '', relatedBookingId: '' }); setShowTaskModal(true); }}
                                    className="p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors text-center group"
                                >
                                    <Plus className="w-6 h-6 mx-auto text-indigo-600 group-hover:scale-110 transition-transform" />
                                    <p className="text-xs font-semibold text-indigo-700 mt-2">New Task</p>
                                </button>
                                <button
                                    onClick={() => setShowTargetModal(true)}
                                    className="p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-center group"
                                >
                                    <Target className="w-6 h-6 mx-auto text-emerald-600 group-hover:scale-110 transition-transform" />
                                    <p className="text-xs font-semibold text-emerald-700 mt-2">Set Target</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('tasks')}
                                    className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-center group"
                                >
                                    <CheckCircle2 className="w-6 h-6 mx-auto text-purple-600 group-hover:scale-110 transition-transform" />
                                    <p className="text-xs font-semibold text-purple-700 mt-2">View Tasks</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('reports')}
                                    className="p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors text-center group"
                                >
                                    <Trophy className="w-6 h-6 mx-auto text-amber-600 group-hover:scale-110 transition-transform" />
                                    <p className="text-xs font-semibold text-amber-700 mt-2">Leaderboard</p>
                                </button>
                            </div>
                        </div>

                        {/* Recent Activity Feed */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" /> Recent Activity
                            </h3>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto">
                                {recentActivities.length > 0 ? recentActivities.slice(0, 8).map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="size-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <Activity className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-900">
                                                <span className="font-semibold">{activity.staffName}</span> {activity.action}
                                            </p>
                                            <p className="text-xs text-slate-400">{formatRelativeTime(activity.timestamp)}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 text-slate-400">
                                        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No recent activity</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Select All Checkbox */}
                            <button
                                onClick={handleSelectAllTasks}
                                className={`size-5 rounded border-2 flex items-center justify-center transition-all mr-2 ${selectedTasks.length === filteredTasks.length && filteredTasks.length > 0
                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                    : 'border-slate-300 hover:border-indigo-400'
                                    }`}
                            >
                                {selectedTasks.length === filteredTasks.length && filteredTasks.length > 0 && (
                                    <CheckCircle2 className="w-3 h-3" />
                                )}
                            </button>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all w-64"
                                />
                            </div>
                            <select
                                value={taskFilter}
                                onChange={e => setTaskFilter(e.target.value as any)}
                                className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium"
                            >
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                        <span className="text-sm text-slate-500 font-medium">{filteredTasks.length} tasks</span>
                    </div>

                    {/* Bulk Actions Toolbar */}
                    {selectedTasks.length > 0 && (
                        <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold text-indigo-700">{selectedTasks.length} selected</span>
                            <div className="h-4 w-px bg-indigo-200" />
                            <button
                                onClick={() => handleBulkStatusChange('Completed')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Complete
                            </button>
                            <button
                                onClick={() => handleBulkStatusChange('In Progress')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                            >
                                <RefreshCw className="w-4 h-4" /> In Progress
                            </button>
                            <select
                                onChange={e => e.target.value && handleBulkReassign(Number(e.target.value))}
                                className="h-8 px-2 rounded-lg border border-indigo-200 text-sm bg-white"
                                defaultValue=""
                            >
                                <option value="" disabled>Reassign to...</option>
                                {staff.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 ml-auto"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    )}

                    {/* Task List */}
                    <div className="divide-y divide-slate-100">
                        {filteredTasks.length > 0 ? filteredTasks.map(task => (
                            <div key={task.id} className={`p-4 hover:bg-slate-50 transition-colors ${selectedTasks.includes(task.id) ? 'bg-indigo-50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    {/* Selection Checkbox */}
                                    <button
                                        onClick={() => handleSelectTask(task.id)}
                                        className={`size-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${selectedTasks.includes(task.id)
                                            ? 'bg-indigo-500 border-indigo-500 text-white'
                                            : 'border-slate-300 hover:border-indigo-400'
                                            }`}
                                    >
                                        {selectedTasks.includes(task.id) && <CheckCircle2 className="w-3 h-3" />}
                                    </button>
                                    {/* Status Toggle */}
                                    <button
                                        onClick={() => handleStatusChange(task.id, task.status === 'Completed' ? 'Pending' : 'Completed')}
                                        className={`size-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${task.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500'
                                            }`}
                                    >
                                        {task.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-slate-900 ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                                        {task.description && <p className="text-sm text-slate-500 truncate">{task.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <PriorityBadge priority={task.priority} />
                                        <StatusBadge status={task.status} />
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {task.dueDate}
                                        </span>
                                        <span className="text-xs text-slate-500">{getStaffName(task.assignedTo)}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEditTask(task)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                                <Edit2 className="w-4 h-4 text-slate-400" />
                                            </button>
                                            <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No tasks found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Targets Tab */}
            {activeTab === 'targets' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {dailyTargets.length > 0 ? dailyTargets.slice(0, 9).map(target => {
                        const staffMember = staff.find(s => s.id === target.staffId);
                        const leadsProgress = (target.actualLeads / target.targetLeads) * 100;
                        const callsProgress = (target.actualCalls / target.targetCalls) * 100;
                        const conversionsProgress = (target.actualConversions / target.targetConversions) * 100;

                        return (
                            <div key={target.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm`}>
                                            {staffMember?.initials || '?'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{staffMember?.name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-500">{target.date}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">Leads</span>
                                            <span className="font-bold">{target.actualLeads}/{target.targetLeads}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, leadsProgress)}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">Calls</span>
                                            <span className="font-bold">{target.actualCalls}/{target.targetCalls}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, callsProgress)}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">Conversions</span>
                                            <span className="font-bold">{target.actualConversions}/{target.targetConversions}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, conversionsProgress)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-2xl">
                            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No targets set yet</p>
                            <button onClick={() => setShowTargetModal(true)} className="mt-3 text-indigo-600 font-semibold text-sm hover:underline">
                                Set your first target
                            </button>
                        </div>
                    )}
                </div>
            )
            }

            {/* Reports Tab - Leaderboard */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    {/* Period Toggle */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <Trophy className="w-6 h-6 text-amber-500" /> Performance Leaderboard
                        </h2>
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setLeaderboardPeriod('week')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${leaderboardPeriod === 'week'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setLeaderboardPeriod('month')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${leaderboardPeriod === 'month'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                This Month
                            </button>
                        </div>
                    </div>

                    {/* Top 3 Podium */}
                    <div className="grid grid-cols-3 gap-4">
                        {leaderboardData.slice(0, 3).map((member, index) => {
                            const rankColors = [
                                'from-amber-400 to-yellow-500', // 1st
                                'from-slate-300 to-slate-400',   // 2nd
                                'from-amber-600 to-orange-700'   // 3rd
                            ];
                            const RankIcon = index === 0 ? Crown : index === 1 ? Medal : Award;
                            const heights = ['h-36', 'h-28', 'h-24'];
                            const order = [1, 0, 2]; // Reorder for podium: 2nd, 1st, 3rd

                            return (
                                <div key={member.id} className={`order-${order[index]} flex flex-col items-center`}>
                                    <div className={`relative size-16 rounded-full bg-gradient-to-br ${rankColors[index]} flex items-center justify-center mb-3 shadow-lg`}>
                                        <RankIcon className="w-8 h-8 text-white" />
                                        <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white text-xs font-black flex items-center justify-center shadow-md">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-center">{member.name}</p>
                                    <p className="text-2xl font-black text-indigo-600">{member.score}</p>
                                    <p className="text-xs text-slate-500">points</p>
                                    <div className={`w-full bg-gradient-to-t ${rankColors[index]} ${heights[index]} rounded-t-2xl mt-4 flex flex-col items-center justify-end pb-4`}>
                                        <p className="text-white text-xs font-bold">{member.tasksCompleted} tasks</p>
                                        <p className="text-white/80 text-xs">{member.targetsAchieved} targets</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Full Rankings Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Full Rankings</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {leaderboardData.map((member, index) => (
                                <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                    <span className={`w-8 h-8 rounded-full ${index < 3 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' : 'bg-slate-100 text-slate-600'
                                        } flex items-center justify-center font-bold text-sm`}>
                                        {index + 1}
                                    </span>
                                    <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm">
                                        {member.initials}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{member.name}</p>
                                        <p className="text-xs text-slate-500">{member.role}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-indigo-600">{member.score}</p>
                                        <p className="text-xs text-slate-400">{member.tasksCompleted} tasks • {member.targetsAchieved} targets</p>
                                    </div>
                                </div>
                            ))}
                            {leaderboardData.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No activity data yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Auto-Assignment Rules */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Shuffle className="w-5 h-5 text-indigo-500" /> Auto-Assignment Rules
                            </h3>
                            <button
                                onClick={() => setShowRuleModal(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600"
                            >
                                <Plus className="w-4 h-4" /> Add Rule
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {assignmentRules.length > 0 ? assignmentRules.map(rule => (
                                <div key={rule.id} className="p-4 flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{rule.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {rule.strategy} • Triggers on {rule.triggerOn}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateAssignmentRule(rule.id, { isActive: !rule.isActive })}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold ${rule.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                    >
                                        {rule.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                    <button onClick={() => deleteAssignmentRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400">
                                    <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No assignment rules configured</p>
                                    <button onClick={() => setShowRuleModal(true)} className="mt-2 text-indigo-600 font-semibold text-sm hover:underline">
                                        Create your first rule
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Time Session History */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Timer className="w-5 h-5 text-emerald-500" /> Time Session History
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {timeSessions.length > 0 ? timeSessions.slice(0, 20).map(session => (
                                <div key={session.id} className="p-4 flex items-center gap-4">
                                    <div className={`size-10 rounded-full ${session.status === 'Active' ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center`}>
                                        <Clock className={`w-5 h-5 ${session.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{getStaffName(session.staffId)}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(session.startTime).toLocaleDateString()} • {formatTime(session.duration)}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${session.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                        session.status === 'Paused' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        {session.status}
                                    </span>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400">
                                    <Timer className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No time sessions recorded</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Rule Modal */}
            {showRuleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Create Assignment Rule</h2>
                            <button onClick={() => setShowRuleModal(false)} className="p-2 rounded-xl hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name *</label>
                                <input
                                    type="text"
                                    value={ruleForm.name}
                                    onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                    placeholder="e.g., Round Robin Leads"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Strategy</label>
                                <select
                                    value={ruleForm.strategy}
                                    onChange={e => setRuleForm({ ...ruleForm, strategy: e.target.value as AssignmentStrategy })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200"
                                >
                                    <option value="round-robin">Round Robin</option>
                                    <option value="workload">Workload Based</option>
                                    <option value="specialty">Specialty Based</option>
                                    <option value="manual">Manual Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger On</label>
                                <select
                                    value={ruleForm.triggerOn}
                                    onChange={e => setRuleForm({ ...ruleForm, triggerOn: e.target.value as any })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200"
                                >
                                    <option value="new-lead">New Lead</option>
                                    <option value="new-booking">New Booking</option>
                                    <option value="new-task">New Task</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRuleModal(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button onClick={handleAddRule} className="flex-1 h-11 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Create Rule</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {
                showTaskModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">{editingTask ? 'Edit Task' : 'Assign New Task'}</h2>
                                <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="p-2 rounded-xl hover:bg-slate-100">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={taskForm.title}
                                        onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        placeholder="Enter task title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        value={taskForm.description}
                                        onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                        className="w-full h-20 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none resize-none"
                                        placeholder="Add details..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Assign To *</label>
                                        <select
                                            required
                                            value={taskForm.assignedTo}
                                            onChange={e => setTaskForm({ ...taskForm, assignedTo: Number(e.target.value) })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        >
                                            <option value={0}>Select staff</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                        <select
                                            value={taskForm.priority}
                                            onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={taskForm.dueDate}
                                        onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <button type="submit" className="flex-1 h-11 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">{editingTask ? 'Update Task' : 'Create Task'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Target Modal */}
            {
                showTargetModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">Set Daily Target</h2>
                                <button onClick={() => setShowTargetModal(false)} className="p-2 rounded-xl hover:bg-slate-100">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleTargetSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Staff Member *</label>
                                        <select
                                            required
                                            value={targetForm.staffId}
                                            onChange={e => setTargetForm({ ...targetForm, staffId: Number(e.target.value) })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        >
                                            <option value={0}>Select staff</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={targetForm.date}
                                            onChange={e => setTargetForm({ ...targetForm, date: e.target.value })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Leads</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={targetForm.targetLeads}
                                            onChange={e => setTargetForm({ ...targetForm, targetLeads: Number(e.target.value) })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Calls</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={targetForm.targetCalls}
                                            onChange={e => setTargetForm({ ...targetForm, targetCalls: Number(e.target.value) })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Conversions</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={targetForm.targetConversions}
                                            onChange={e => setTargetForm({ ...targetForm, targetConversions: Number(e.target.value) })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Bookings</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={targetForm.targetBookings}
                                            onChange={e => setTargetForm({ ...targetForm, targetBookings: Number(e.target.value) })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowTargetModal(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <button type="submit" className="flex-1 h-11 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Set Target</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Productivity;
