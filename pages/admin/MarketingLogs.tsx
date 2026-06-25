import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../src/lib/api';
import { generateWeeklyStandupSummary } from '../../src/lib/gemini';
import { DailyMarketingLog, StaffMember, MarketingTarget, LogComment, LogReaction, InAppNotification, Lead, Booking } from '../../types';
import { toast } from 'sonner';
import {
    Flame, Sparkles, Plus, Calendar, Search, Edit2, Trash2, X, Check,
    TrendingUp, Award, BarChart3, Users, DollarSign, Mail, MessageSquare, Phone,
    FileText, Lightbulb, AlertTriangle, ArrowRight, Copy, Share2, MessageCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts';

export const MarketingLogs: React.FC = () => {
    const { currentUser } = useAuth();
    const [logs, setLogs] = useState<DailyMarketingLog[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [targets, setTargets] = useState<MarketingTarget[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyMarketingLog | null>(null);

    // AI standup state
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
    const [selectedRating, setSelectedRating] = useState<string>('all');

    // Quick-Log wizard form state
    const [formStep, setFormStep] = useState(1);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        emailsSent: 0,
        socialDms: 0,
        callsMade: 0,
        followUps: 0,
        proposalsSent: 0,
        dealsClosed: 0,
        revenueGenerated: 0,
        metaSpend: 0,
        metaLeads: 0,
        adCreativeNotes: '',
        dailySummary: '',
        keyLearnings: ''
    });

    const [taggedLeads, setTaggedLeads] = useState<string[]>([]);
    const [taggedBookings, setTaggedBookings] = useState<string[]>([]);

    const [targetFormData, setTargetFormData] = useState({
        targetEmails: 30,
        targetDms: 15,
        targetCalls: 5,
        targetSpend: 2000
    });

    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

    // Load initial data
    const loadData = async () => {
        setLoading(true);
        try {
            const [logsData, staffData, leadsData, bookingsData, targetsData] = await Promise.all([
                api.getMarketingLogs(),
                api.getStaff(),
                api.getLeads(),
                api.getBookings(),
                api.getMarketingTargets()
            ]);
            setLogs(logsData);
            setStaff(staffData);
            setLeads(leadsData);
            setBookings(bookingsData);
            setTargets(targetsData);
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to load marketing logs data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Create mapping of staff ID to name
    const staffNamesMap = useMemo(() => {
        const mapping: Record<number, string> = {};
        staff.forEach(s => {
            mapping[s.id] = s.name;
        });
        return mapping;
    }, [staff]);

    // Handle momentum and rating calculations dynamically
    const computedMomentum = useMemo(() => {
        let score = 0;
        score += formData.emailsSent * 1;
        score += formData.socialDms * 1.5;
        score += formData.callsMade * 2;
        score += formData.followUps * 2.5;
        score += formData.proposalsSent * 8;
        score += formData.dealsClosed * 20;
        if (formData.metaLeads > 0) score += 5; // Meta ads conversion bonus
        return Math.min(100, Math.round(score));
    }, [formData]);

    const computedRating = useMemo(() => {
        if (computedMomentum >= 80) return 'unstoppable';
        if (computedMomentum >= 50) return 'high-momentum';
        if (computedMomentum >= 20) return 'steady';
        return 'sluggish';
    }, [computedMomentum]);

    // Streak logic calculation (consecutive dates with logs logged by ANY/CURRENT user)
    const currentStreak = useMemo(() => {
        if (logs.length === 0) return 0;
        
        // Filter logs to current user or group depending on accountability partner structure
        const myLogs = logs.filter(l => l.staffId === currentUser?.staffId);
        if (myLogs.length === 0) return 0;

        // Get unique sorted dates (newest first)
        const uniqueDates = (Array.from(new Set(myLogs.map(l => l.date))) as string[]).sort((a, b) => b.localeCompare(a));
        
        let streak = 0;
        let expectedDate = new Date(); // Start checking from today
        
        // If the latest log isn't today or yesterday, streak is broken/0
        const latestLogDate = new Date(uniqueDates[0]);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        const isLatestToday = latestLogDate.toDateString() === today.toDateString();
        const isLatestYesterday = latestLogDate.toDateString() === yesterday.toDateString();
        
        if (!isLatestToday && !isLatestYesterday) {
            return 0;
        }

        // Loop back through dates
        let currentDateCheck = new Date(uniqueDates[0]);
        streak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevLogDate = new Date(uniqueDates[i]);
            const diffTime = Math.abs(currentDateCheck.getTime() - prevLogDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak++;
                currentDateCheck = prevLogDate;
            } else if (diffDays > 1) {
                break; // Streak broken
            }
        }

        return streak;
    }, [logs, currentUser]);

    // Handle submit
    const handleSubmitLog = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser?.staffId) {
            toast.error("You must be logged in as staff to submit logs.");
            return;
        }

        const logPayload = {
            id: editingLog?.id || undefined,
            date: formData.date,
            staffId: currentUser.staffId,
            momentumScore: computedMomentum,
            rating: computedRating,
            emailsSent: Number(formData.emailsSent),
            socialDms: Number(formData.socialDms),
            callsMade: Number(formData.callsMade),
            followUps: Number(formData.followUps),
            proposalsSent: Number(formData.proposalsSent),
            dealsClosed: Number(formData.dealsClosed),
            revenueGenerated: Number(formData.revenueGenerated),
            metaSpend: Number(formData.metaSpend),
            metaLeads: Number(formData.metaLeads),
            adCreativeNotes: formData.adCreativeNotes || undefined,
            dailySummary: formData.dailySummary || undefined,
            keyLearnings: formData.keyLearnings || undefined,
            taggedLeads,
            taggedBookings
        };

        const loadToast = toast.loading(editingLog ? "Updating your log..." : "Submitting your log...");
        try {
            if (editingLog) {
                await api.updateMarketingLog(editingLog.id, logPayload);
                toast.success("Marketing log updated successfully!", { id: loadToast });
            } else {
                await api.createMarketingLog(logPayload);
                toast.success("Marketing log saved to MySQL!", { id: loadToast });
            }

            // Milestone Notification
            if (Number(formData.dealsClosed) >= 1 || Number(formData.revenueGenerated) >= 100000) {
                const milestoneTitle = `Milestone Achieved! 🎉`;
                const milestoneMsg = `${currentUser.name} closed ${formData.dealsClosed} deal(s) and generated ₹${Number(formData.revenueGenerated).toLocaleString()} in revenue today!`;
                await Promise.all(
                    staff
                        .filter(s => s.id !== currentUser.staffId)
                        .map(s => api.createInAppNotification({
                            staffId: s.id,
                            senderId: currentUser.staffId,
                            title: milestoneTitle,
                            message: milestoneMsg,
                            type: 'milestone'
                        }))
                );
            }

            // 3-day Sluggish Alert
            if (computedRating === 'sluggish') {
                const myLogs = logs
                    .filter(l => l.staffId === currentUser.staffId && l.id !== editingLog?.id)
                    .sort((a, b) => b.date.localeCompare(a.date));
                if (myLogs.length >= 2 && myLogs[0].rating === 'sluggish' && myLogs[1].rating === 'sluggish') {
                    const adminMsg = `Accountability Alert: ${currentUser.name} has recorded sluggish marketing momentum for 3 consecutive days. Check in to support them.`;
                    await Promise.all(
                        staff
                            .filter(s => s.role === 'Admin' && s.id !== currentUser.staffId)
                            .map(s => api.createInAppNotification({
                                staffId: s.id,
                                senderId: currentUser.staffId,
                                title: `Sluggish momentum warning ⚠️`,
                                message: adminMsg,
                                type: 'alert'
                            }))
                    );
                }
            }

            setIsLogModalOpen(false);
            resetForm();
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Failed to submit marketing log", { id: loadToast });
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm("Are you sure you want to delete this marketing log permanently from the database?")) return;
        const loadToast = toast.loading("Deleting log...");
        try {
            await api.deleteMarketingLog(id);
            toast.success("Log deleted successfully", { id: loadToast });
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Failed to delete log", { id: loadToast });
        }
    };

    const handleEditLog = (log: DailyMarketingLog) => {
        setEditingLog(log);
        setFormData({
            date: log.date,
            emailsSent: log.emailsSent,
            socialDms: log.socialDms,
            callsMade: log.callsMade,
            followUps: log.followUps,
            proposalsSent: log.proposalsSent,
            dealsClosed: log.dealsClosed,
            revenueGenerated: log.revenueGenerated,
            metaSpend: log.metaSpend,
            metaLeads: log.metaLeads,
            adCreativeNotes: log.adCreativeNotes || '',
            dailySummary: log.dailySummary || '',
            keyLearnings: log.keyLearnings || ''
        });
        setTaggedLeads(log.taggedLeads || []);
        setTaggedBookings(log.taggedBookings || []);
        setFormStep(1);
        setIsLogModalOpen(true);
    };

    const handleGenerateSummary = async () => {
        if (logs.length === 0) {
            toast.error("No logs logged yet to summarize!");
            return;
        }

        setIsAiLoading(true);
        setIsAiModalOpen(true);
        try {
            // Get past 7 logs for summary
            const recentLogs = logs.slice(0, 7);
            const summary = await generateWeeklyStandupSummary(recentLogs, staffNamesMap);
            setAiSummary(summary);
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to generate weekly summary. Check your API key.");
            setIsAiModalOpen(false);
        } finally {
            setIsAiLoading(false);
        }
    };

    const resetForm = () => {
        setEditingLog(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            emailsSent: 0,
            socialDms: 0,
            callsMade: 0,
            followUps: 0,
            proposalsSent: 0,
            dealsClosed: 0,
            revenueGenerated: 0,
            metaSpend: 0,
            metaLeads: 0,
            adCreativeNotes: '',
            dailySummary: '',
            keyLearnings: ''
        });
        setTaggedLeads([]);
        setTaggedBookings([]);
        setFormStep(1);
    };

    const handleSaveTargets = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.staffId) return;
        const loadToast = toast.loading("Saving targets...");
        try {
            await api.upsertMarketingTarget({
                staffId: currentUser.staffId,
                date: new Date().toISOString().split('T')[0],
                targetEmails: Number(targetFormData.targetEmails),
                targetDms: Number(targetFormData.targetDms),
                targetCalls: Number(targetFormData.targetCalls),
                targetSpend: Number(targetFormData.targetSpend)
            });
            toast.success("Targets updated for today!", { id: loadToast });
            setIsTargetModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save targets", { id: loadToast });
        }
    };

    const handleToggleReaction = async (logId: string, type: string) => {
        if (!currentUser?.staffId) return;
        try {
            await api.toggleReaction(logId, currentUser.staffId, type);
            loadData();
        } catch (e: any) {
            toast.error("Failed to update reaction");
        }
    };

    const handleAddComment = async (logId: string) => {
        const text = commentInputs[logId]?.trim();
        if (!text) return;
        if (!currentUser?.staffId) return;
        try {
            await api.addLogComment({ logId, staffId: currentUser.staffId, commentText: text });
            setCommentInputs(prev => ({ ...prev, [logId]: '' }));
            loadData();
            toast.success("Comment added!");
        } catch (e: any) {
            toast.error("Failed to add comment");
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            await api.deleteLogComment(commentId);
            loadData();
            toast.success("Comment deleted");
        } catch (e: any) {
            toast.error("Failed to delete comment");
        }
    };

    // Filtered logs list
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                (log.dailySummary?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (log.keyLearnings?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (log.adCreativeNotes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (staffNamesMap[log.staffId]?.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesStaff = selectedStaffId === 'all' || String(log.staffId) === selectedStaffId;
            const matchesRating = selectedRating === 'all' || log.rating === selectedRating;

            return matchesSearch && matchesStaff && matchesRating;
        });
    }, [logs, searchQuery, selectedStaffId, selectedRating, staffNamesMap]);

    // Weekly performance summary stats
    const stats = useMemo(() => {
        // filter logs for last 7 days
        const last7Days = logs.slice(0, 7);
        const totalOutreach = last7Days.reduce((sum, l) => sum + l.emailsSent + l.socialDms + l.callsMade, 0);
        const totalNurtured = last7Days.reduce((sum, l) => sum + l.followUps, 0);
        const totalMetaSpend = last7Days.reduce((sum, l) => sum + l.metaSpend, 0);
        const totalMetaLeads = last7Days.reduce((sum, l) => sum + l.metaLeads, 0);
        const revenueGenerated = last7Days.reduce((sum, l) => sum + l.revenueGenerated, 0);
        
        const avgCpl = totalMetaLeads > 0 ? (totalMetaSpend / totalMetaLeads) : 0;
        
        return {
            outreach: totalOutreach,
            nurtured: totalNurtured,
            spend: totalMetaSpend,
            leads: totalMetaLeads,
            revenue: revenueGenerated,
            avgCpl: Math.round(avgCpl * 100) / 100
        };
    }, [logs]);

    // Formatting date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Chart Data (Meta Ads Performance Trends)
    const adsChartData = useMemo(() => {
        // Reverse logs to chronological order and limit to 10 entries for cleaner chart
        return [...logs].slice(0, 10).reverse().map(l => ({
            date: l.date.split('-').slice(1).join('/'), // format as MM/DD
            Spend: l.metaSpend,
            Leads: l.metaLeads,
            CPL: l.metaLeads > 0 ? Math.round((l.metaSpend / l.metaLeads) * 10) / 10 : 0
        }));
    }, [logs]);

    // Chart Data (Outreach Channels Split)
    const channelsChartData = useMemo(() => {
        return [...logs].slice(0, 8).reverse().map(l => ({
            date: l.date.split('-').slice(1).join('/'),
            Emails: l.emailsSent,
            DMs: l.socialDms,
            Calls: l.callsMade
        }));
    }, [logs]);

    // Rating badges utility
    const ratingStyles: Record<string, { bg: string, text: string, icon: string }> = {
        'unstoppable': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', icon: '⚡ Unstoppable' },
        'high-momentum': { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400', icon: '🚀 High Momentum' },
        'steady': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', icon: '📈 Steady' },
        'sluggish': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', icon: '⚠️ Sluggish' }
    };

    const handleCopySummary = () => {
        navigator.clipboard.writeText(aiSummary);
        toast.success("Summary copied to clipboard!");
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto admin-page-bg min-h-screen font-sans">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight text-4xl">Marketing Accountability Ledger</h1>
                    <p className="text-slate-500 mt-1">Log daily customer acquisition outreach, paid spend, and key learnings to build business momentum.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsTemplateDrawerOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                        <FileText size={16} className="text-indigo-600" /> Templates Library
                    </button>
                    <button
                        onClick={handleGenerateSummary}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                        <Sparkles size={16} className="text-indigo-600 animate-pulse" /> Weekly Summary
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsLogModalOpen(true); }}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/25 flex items-center gap-2 active:scale-95 transition-all btn-glow"
                    >
                        <Plus size={18} /> Log Today's Work
                    </button>
                </div>
            </div>

            {/* Top widgets and Streak */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Streak flame card */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/10 relative overflow-hidden group">
                    <Flame className="absolute -bottom-8 -right-8 w-36 h-36 opacity-15 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Marketing Streak</p>
                            <h3 className="text-4xl kpi-number font-black mt-2">{currentStreak} Days</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                            <Flame size={28} className="text-amber-200 animate-bounce" />
                        </div>
                    </div>
                    <p className="text-xs mt-4 opacity-80 font-medium">
                        {currentStreak > 0 
                            ? "Consistency yields compounds. Keep logging daily!" 
                            : "Submit a log today to restart your marketing momentum!"}
                    </p>
                </div>

                {/* Meta ads overview widget */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Meta Ads Spend (7d)</span>
                        <DollarSign size={20} className="text-primary" />
                    </div>
                    <h3 className="text-3xl kpi-number font-black text-slate-900 dark:text-white mt-2">₹{stats.spend.toLocaleString()}</h3>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-semibold">{stats.leads} Leads Generated</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-bold">CPL: ₹{stats.avgCpl}</span>
                    </div>
                </div>

                {/* Organic outreach overview */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Outbound Outreach (7d)</span>
                        <Mail size={20} className="text-indigo-600" />
                    </div>
                    <h3 className="text-3xl kpi-number font-black text-slate-900 dark:text-white mt-2">{stats.outreach} Contacts</h3>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-semibold">{stats.nurtured} Leads Nurtured</span>
                        <span className="text-xs text-indigo-600 font-bold">Channels Active</span>
                    </div>
                </div>

                {/* Pipeline generated */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Sales Closed (7d)</span>
                        <Award size={20} className="text-emerald-600" />
                    </div>
                    <h3 className="text-3xl kpi-number font-black text-slate-900 dark:text-white mt-2">₹{stats.revenue.toLocaleString()}</h3>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-semibold">Tours Booking Revenue</span>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg font-bold">Closed Deals</span>
                    </div>
                </div>
            </div>

            {/* Daily Target Progress Section */}
            <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-indigo-600" size={20} /> Today's Grind Targets
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Comparing today's actual logged marketing actions against set targets.</p>
                    </div>
                    <button
                        onClick={() => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const myTarget = targets.find(t => t.staffId === currentUser?.staffId && t.date === todayStr);
                            if (myTarget) {
                                setTargetFormData({
                                    targetEmails: myTarget.targetEmails,
                                    targetDms: myTarget.targetDms,
                                    targetCalls: myTarget.targetCalls,
                                    targetSpend: myTarget.targetSpend
                                });
                            } else {
                                setTargetFormData({ targetEmails: 30, targetDms: 15, targetCalls: 5, targetSpend: 2000 });
                            }
                            setIsTargetModalOpen(true);
                        }}
                        className="text-xs bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1 self-start"
                    >
                        <Edit2 size={12} /> Set Targets
                    </button>
                </div>
                
                {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const myTarget = targets.find(t => t.staffId === currentUser?.staffId && t.date === todayStr) || {
                        targetEmails: 30,
                        targetDms: 15,
                        targetCalls: 5,
                        targetSpend: 2000
                    };
                    
                    const myLogsToday = logs.filter(l => l.date === todayStr && l.staffId === currentUser?.staffId);
                    const actEmails = myLogsToday.reduce((sum, l) => sum + l.emailsSent, 0);
                    const actDms = myLogsToday.reduce((sum, l) => sum + l.socialDms, 0);
                    const actCalls = myLogsToday.reduce((sum, l) => sum + l.callsMade, 0);
                    const actSpend = myLogsToday.reduce((sum, l) => sum + l.metaSpend, 0);
                    
                    const getPct = (act: number, tgt: number) => {
                        if (tgt <= 0) return 100;
                        return Math.min(100, Math.round((act / tgt) * 100));
                    };

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                            {/* Emails sent progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Emails Sent</span>
                                    <span>{actEmails} / {myTarget.targetEmails} ({getPct(actEmails, myTarget.targetEmails)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${getPct(actEmails, myTarget.targetEmails)}%` }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                                    />
                                </div>
                            </div>
                            {/* DMs progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Social DMs</span>
                                    <span>{actDms} / {myTarget.targetDms} ({getPct(actDms, myTarget.targetDms)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${getPct(actDms, myTarget.targetDms)}%` }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                                    />
                                </div>
                            </div>
                            {/* Calls progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Cold Calls</span>
                                    <span>{actCalls} / {myTarget.targetCalls} ({getPct(actCalls, myTarget.targetCalls)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${getPct(actCalls, myTarget.targetCalls)}%` }}
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-500"
                                    />
                                </div>
                            </div>
                            {/* Max spend progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Ad Spend Limit</span>
                                    <span>₹{actSpend} / ₹{myTarget.targetSpend} ({getPct(actSpend, myTarget.targetSpend)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${getPct(actSpend, myTarget.targetSpend)}%` }}
                                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${actSpend > myTarget.targetSpend ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-teal-600'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Visual Analytics / Recharts */}
            {logs.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Meta ads performance trend */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="text-primary" size={20} /> Meta Ads Performance Trends
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={adsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C9732A" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#C9732A" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Legend iconType="circle" />
                                    <Area type="monotone" dataKey="Spend" name="Ad Spend (₹)" stroke="#C9732A" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Leads" name="Leads Generated" stroke="#2D6A4F" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Outreach channels split trend */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" size={20} /> Outreach Channel Activity (Organic)
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={channelsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="Emails" name="Emails Sent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="DMs" name="Social DMs" fill="#A855F7" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Calls" name="Cold Calls" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Side-by-side Grind Metrics & Gamification Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Heatmap calendar & Date Comparer (left 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Heatmap calendar */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="text-orange-500" size={20} /> Daily Grind & Contribution Matrix
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 p-2 overflow-x-auto scrollbar-thin">
                            {Array.from({ length: 30 }).map((_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (29 - i));
                                const formattedCheck = date.toISOString().split('T')[0];
                                const logOnDate = logs.find(l => l.date === formattedCheck);
                                
                                let colorClass = "bg-slate-100 dark:bg-slate-850 hover:bg-slate-200";
                                if (logOnDate) {
                                    if (logOnDate.rating === 'unstoppable') colorClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
                                    else if (logOnDate.rating === 'high-momentum') colorClass = "bg-primary hover:bg-primary-dark text-white";
                                    else if (logOnDate.rating === 'steady') colorClass = "bg-indigo-400 hover:bg-indigo-500 text-white";
                                    else colorClass = "bg-amber-300 hover:bg-amber-400 text-slate-900";
                                }

                                return (
                                    <div
                                        key={i}
                                        className={`size-8 rounded-md transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold ${colorClass}`}
                                        title={`${date.toDateString()}${logOnDate ? ` - rating: ${logOnDate.rating}` : ' - No Log'}`}
                                    >
                                        {date.getDate()}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400 font-medium justify-end">
                            <span>Grind Level:</span>
                            <span className="flex items-center gap-1"><span className="size-3 rounded bg-slate-100 dark:bg-slate-850" /> Rest</span>
                            <span className="flex items-center gap-1"><span className="size-3 rounded bg-amber-300" /> Sluggish</span>
                            <span className="flex items-center gap-1"><span className="size-3 rounded bg-indigo-400" /> Steady</span>
                            <span className="flex items-center gap-1"><span className="size-3 rounded bg-primary" /> Active</span>
                            <span className="flex items-center gap-1"><span className="size-3 rounded bg-emerald-600" /> Unstoppable</span>
                        </div>
                    </div>

                    {/* Date Comparer card */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="text-indigo-600" size={20} /> Period-over-Period Performance Comparer
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Analyze and compare key growth metrics between the current week and the previous week.</p>
                            </div>
                            <div className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-xl border border-indigo-100/30 self-start">
                                Auto: Past 7 days vs Previous 7 days
                            </div>
                        </div>

                        {(() => {
                            const getPeriodStats = (daysAgoStart: number, daysAgoEnd: number) => {
                                const start = new Date();
                                start.setDate(start.getDate() - daysAgoStart);
                                const startStr = start.toISOString().split('T')[0];

                                const end = new Date();
                                end.setDate(end.getDate() - daysAgoEnd);
                                const endStr = end.toISOString().split('T')[0];

                                const pLogs = logs.filter(l => l.date >= startStr && l.date <= endStr);
                                const outreach = pLogs.reduce((sum, l) => sum + l.emailsSent + l.socialDms + l.callsMade, 0);
                                const spend = pLogs.reduce((sum, l) => sum + l.metaSpend, 0);
                                const leads = pLogs.reduce((sum, l) => sum + l.metaLeads, 0);
                                const revenue = pLogs.reduce((sum, l) => sum + l.revenueGenerated, 0);
                                return { outreach, spend, leads, revenue };
                            };

                            const currentPeriod = getPeriodStats(7, 0);
                            const previousPeriod = getPeriodStats(14, 8);

                            const getChangePill = (curr: number, prev: number) => {
                                if (prev === 0) return curr > 0 ? <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">+100%</span> : <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">0%</span>;
                                const pct = Math.round(((curr - prev) / prev) * 100);
                                if (pct > 0) return <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">+{pct}%</span>;
                                if (pct < 0) return <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">{pct}%</span>;
                                return <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">0%</span>;
                            };

                            return (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Outreach</p>
                                        <div className="flex flex-wrap items-baseline gap-1 mt-2">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{currentPeriod.outreach}</span>
                                            <span className="text-[10px] text-slate-400">vs {previousPeriod.outreach}</span>
                                            {getChangePill(currentPeriod.outreach, previousPeriod.outreach)}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Meta Leads</p>
                                        <div className="flex flex-wrap items-baseline gap-1 mt-2">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{currentPeriod.leads}</span>
                                            <span className="text-[10px] text-slate-400">vs {previousPeriod.leads}</span>
                                            {getChangePill(currentPeriod.leads, previousPeriod.leads)}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Meta Spend</p>
                                        <div className="flex flex-wrap items-baseline gap-1 mt-2">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">₹{currentPeriod.spend}</span>
                                            <span className="text-[10px] text-slate-400">vs ₹{previousPeriod.spend}</span>
                                            {getChangePill(currentPeriod.spend, previousPeriod.spend)}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Revenue Won</p>
                                        <div className="flex flex-wrap items-baseline gap-1 mt-2">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">₹{currentPeriod.revenue}</span>
                                            <span className="text-[10px] text-slate-400">vs {previousPeriod.revenue}</span>
                                            {getChangePill(currentPeriod.revenue, previousPeriod.revenue)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Leaderboard and Nudges sidebar (right 1 col) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Leaderboard card */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Award className="text-amber-500" size={20} /> Weekly Growth Leaderboard
                        </h3>
                        <div className="space-y-4">
                            {(() => {
                                const weekAgo = new Date();
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                const weekAgoStr = weekAgo.toISOString().split('T')[0];

                                const leaderboardData = staff.map(s => {
                                    const sLogs = logs.filter(l => l.staffId === s.id && l.date >= weekAgoStr);
                                    const avgMomentum = sLogs.length > 0 ? Math.round(sLogs.reduce((sum, l) => sum + l.momentumScore, 0) / sLogs.length) : 0;
                                    const totalRev = sLogs.reduce((sum, l) => sum + l.revenueGenerated, 0);
                                    const deals = sLogs.reduce((sum, l) => sum + l.dealsClosed, 0);
                                    
                                    // calculate streak
                                    const sAllLogs = logs.filter(l => l.staffId === s.id).sort((a,b) => b.date.localeCompare(a.date));
                                    let streak = 0;
                                    if (sAllLogs.length > 0) {
                                        const uniqueDates = Array.from(new Set(sAllLogs.map(l => l.date))) as string[];
                                        const latestLog = new Date(uniqueDates[0]);
                                        const today = new Date();
                                        const yesterday = new Date();
                                        yesterday.setDate(today.getDate() - 1);
                                        if (latestLog.toDateString() === today.toDateString() || latestLog.toDateString() === yesterday.toDateString()) {
                                            streak = 1;
                                            let checkD = new Date(uniqueDates[0]);
                                            for (let i = 1; i < uniqueDates.length; i++) {
                                                const nextD = new Date(uniqueDates[i]);
                                                const diff = Math.ceil(Math.abs(checkD.getTime() - nextD.getTime()) / 86400000);
                                                if (diff === 1) {
                                                    streak++;
                                                    checkD = nextD;
                                                } else {
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    
                                    return {
                                        id: s.id,
                                        name: s.name,
                                        avgMomentum,
                                        totalRev,
                                        deals,
                                        streak
                                    };
                                }).sort((a, b) => b.avgMomentum - a.avgMomentum || b.totalRev - a.totalRev);

                                return leaderboardData.slice(0, 5).map((entry, idx) => {
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-400 w-6">
                                                    {medal || `#${idx + 1}`}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{entry.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-semibold">{entry.streak} Day Streak • {entry.deals} Deals</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{entry.avgMomentum} pts</p>
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">₹{entry.totalRev.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Teammate Accountability Nudges tracker */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="text-indigo-600" size={20} /> Teammate grind alerts
                        </h3>
                        <div className="space-y-4">
                            {(() => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                const staffWhoLoggedToday = new Set(logs.filter(l => l.date === todayStr).map(l => l.staffId));
                                const teammatesToNudge = staff.filter(s => s.id !== currentUser?.staffId);

                                if (teammatesToNudge.length === 0) {
                                    return <p className="text-xs text-slate-400">No other team members found.</p>;
                                }

                                return teammatesToNudge.map(teammate => {
                                    const hasLogged = staffWhoLoggedToday.has(teammate.id);
                                    return (
                                        <div key={teammate.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                    {teammate.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-250">{teammate.name}</p>
                                                    <p className="text-[9px] font-bold uppercase mt-0.5 tracking-wider">
                                                        {hasLogged ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400">✓ Logged Today</span>
                                                        ) : (
                                                            <span className="text-rose-600 dark:text-rose-400">⚠️ Pending Log</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {!hasLogged && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.createInAppNotification({
                                                                staffId: teammate.id,
                                                                senderId: currentUser?.staffId || 0,
                                                                title: `Accountability Nudge! 🔥`,
                                                                message: `${currentUser?.name} nudged you to log your daily marketing work. Don't break the streak!`,
                                                                type: 'nudge'
                                                            });
                                                            toast.success(`Nudged ${teammate.name} successfully!`);
                                                        } catch (e: any) {
                                                            toast.error("Failed to nudge teammate");
                                                        }
                                                    }}
                                                    className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 px-2.5 py-1.5 rounded-lg font-bold border border-indigo-100/30 transition-all flex items-center gap-1"
                                                >
                                                    🔥 Nudge
                                                </button>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs timeline & listing */}
            <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                {/* Timeline filter bar */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText size={22} className="text-slate-500" /> Marketing Ledger Logs
                    </h3>
                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px] lg:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search logs, staff, learnings..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                            />
                        </div>
                        {/* Staff filter */}
                        <select
                            value={selectedStaffId}
                            onChange={e => setSelectedStaffId(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">All Members</option>
                            {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {/* Momentum rating filter */}
                        <select
                            value={selectedRating}
                            onChange={e => setSelectedRating(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">All Ratings</option>
                            <option value="unstoppable">⚡ Unstoppable</option>
                            <option value="high-momentum">🚀 High Momentum</option>
                            <option value="steady">📈 Steady</option>
                            <option value="sluggish">⚠️ Sluggish</option>
                        </select>
                    </div>
                </div>

                {/* Timeline feed list */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                            <span>Fetching logs from MySQL Database...</span>
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        filteredLogs.map(log => {
                            const badge = ratingStyles[log.rating];
                            return (
                                <div key={log.id} className="p-6 hover:bg-slate-50/40 dark:hover:bg-[#1D2B3B]/20 transition-all flex flex-col gap-4">
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        {/* Date and Momentum Rating Block */}
                                        <div className="w-full md:w-44 shrink-0 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{formatDate(log.date)}</span>
                                            </div>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                                                {badge.icon}
                                            </span>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score: {log.momentumScore} / 100</p>
                                            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 pt-1">
                                                <span className="size-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-black">
                                                    {staffNamesMap[log.staffId]?.substring(0,2).toUpperCase()}
                                                </span>
                                                {staffNamesMap[log.staffId] || `Staff #${log.staffId}`}
                                            </p>
                                        </div>

                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full bg-slate-50 dark:bg-[#1E293B]/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Outreach Split</p>
                                                <div className="flex gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5">
                                                    <span title="Emails" className="flex items-center gap-1"><Mail size={12} className="text-blue-500"/>{log.emailsSent}</span>
                                                    <span title="DMs" className="flex items-center gap-1"><MessageSquare size={12} className="text-purple-500"/>{log.socialDms}</span>
                                                    <span title="Calls" className="flex items-center gap-1"><Phone size={12} className="text-amber-500"/>{log.callsMade}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Meta Ads Spend</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5">
                                                    ₹{log.metaSpend.toLocaleString()} <span className="text-[10px] text-slate-400">({log.metaLeads} leads)</span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Follow-ups</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5">{log.followUps} nurtured</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Deals Closed</p>
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                                                    ₹{log.revenueGenerated.toLocaleString()} <span className="text-[10px] text-slate-400">({log.dealsClosed} deals)</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Summaries */}
                                        <div className="flex-1 space-y-3 w-full">
                                            {log.dailySummary && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Daily Grind Summary</p>
                                                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mt-1">{log.dailySummary}</p>
                                                </div>
                                            )}
                                            {log.keyLearnings && (
                                                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-100/50 dark:border-amber-900/20 flex gap-2.5 items-start">
                                                    <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Key Learning / Experiment Result</p>
                                                        <p className="text-slate-700 dark:text-slate-300 text-xs mt-1 leading-relaxed">{log.keyLearnings}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {log.adCreativeNotes && (
                                                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex gap-2.5 items-start">
                                                    <Sparkles size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase">Ad Creative Insights</p>
                                                        <p className="text-slate-700 dark:text-slate-300 text-xs mt-1 leading-relaxed">{log.adCreativeNotes}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons (only owner can modify/delete) */}
                                        {currentUser?.staffId === log.staffId && (
                                            <div className="flex gap-2 self-end shrink-0 pt-4 md:pt-0">
                                                <button
                                                    onClick={() => handleEditLog(log)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30"
                                                    title="Edit Log"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tagged CRM Entities (Leads/Bookings) */}
                                    {((log.taggedLeads && log.taggedLeads.length > 0) || (log.taggedBookings && log.taggedBookings.length > 0)) && (
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                            {log.taggedLeads?.map(leadId => {
                                                const lRecord = leads.find(l => l.id === leadId);
                                                return (
                                                    <a
                                                        key={leadId}
                                                        href={`/admin/leads?id=${leadId}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-lg text-[10px] font-bold border border-purple-150"
                                                    >
                                                        <Users size={10} /> Lead: {lRecord?.name || `Lead #${leadId.substring(0,6)}`}
                                                    </a>
                                                );
                                            })}
                                            {log.taggedBookings?.map(bookingId => {
                                                const bRecord = bookings.find(b => b.id === bookingId);
                                                return (
                                                    <a
                                                        key={bookingId}
                                                        href={`/admin/bookings?id=${bookingId}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-150"
                                                    >
                                                        <TrendingUp size={10} /> Booking: {bRecord?.customer || `Booking #${bookingId.substring(0,6)}`}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Social Reactions block */}
                                    {(() => {
                                        const reactionTypes = ['🔥', '👍', '👏'];
                                        return (
                                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                                {reactionTypes.map(type => {
                                                    const count = (log.reactions || []).filter(r => r.reactionType === type).length;
                                                    const userReacted = (log.reactions || []).some(r => r.reactionType === type && r.staffId === currentUser?.staffId);
                                                    return (
                                                        <button
                                                            key={type}
                                                            onClick={() => handleToggleReaction(log.id, type)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                                                userReacted
                                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400 scale-105'
                                                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-850'
                                                            }`}
                                                        >
                                                            <span>{type}</span>
                                                            <span>{count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}

                                    {/* Comments section */}
                                    <div className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comments ({log.comments?.length || 0})</p>
                                        
                                        {/* Comment List */}
                                        {log.comments && log.comments.length > 0 && (
                                            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                                {log.comments.map(c => (
                                                    <div key={c.id} className="flex gap-2 items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850/50">
                                                        <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                                                            {staffNamesMap[c.staffId]?.substring(0, 2).toUpperCase() || "ST"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                    {staffNamesMap[c.staffId] || `Staff #${c.staffId}`}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-[9px] text-slate-400">
                                                                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                    </span>
                                                                    {(currentUser?.staffId === c.staffId || currentUser?.role === 'Admin') && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(c.id)}
                                                                            className="text-slate-350 hover:text-red-500 transition-colors"
                                                                            title="Delete Comment"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed mt-0.5">{c.commentText}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add Comment Input */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={commentInputs[log.id] || ''}
                                                onChange={e => setCommentInputs({ ...commentInputs, [log.id]: e.target.value })}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddComment(log.id);
                                                }}
                                                placeholder="Write a comment..."
                                                className="flex-1 bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/30"
                                            />
                                            <button
                                                onClick={() => handleAddComment(log.id)}
                                                className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold"
                                            >
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
                            <AlertTriangle size={36} className="text-slate-300" />
                            <p className="font-semibold text-slate-600">No logs found matching your filters</p>
                            <p className="text-xs">Start logging daily inputs to hold yourself accountable!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Log Today Modal Wizard */}
            {isLogModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-850 dark:to-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Flame className="text-orange-500" size={20} />
                                    {editingLog ? "Edit Marketing Log" : "Daily Grind Log"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Step {formStep} of 3 — Let's log your pipeline activity</p>
                            </div>
                            <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form Wizard */}
                        <form onSubmit={handleSubmitLog} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Step 1: Outbound & Nurture */}
                            {formStep === 1 && (
                                <div className="space-y-4 animate-in slide-in-from-right-2">
                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 mb-2">
                                        <p className="text-xs text-indigo-800 dark:text-indigo-400 font-semibold leading-relaxed">
                                            Outreach keeps the pipeline alive. Log your outbound contacts and lead nurturing details.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Emails Sent</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.emailsSent}
                                                onChange={e => setFormData({ ...formData, emailsSent: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Social DMs</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.socialDms}
                                                onChange={e => setFormData({ ...formData, socialDms: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Cold Calls</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.callsMade}
                                                onChange={e => setFormData({ ...formData, callsMade: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Leads Nurtured (Follow-ups)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.followUps}
                                            onChange={e => setFormData({ ...formData, followUps: Number(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Paid Ads & Sales */}
                            {formStep === 2 && (
                                <div className="space-y-4 animate-in slide-in-from-right-2">
                                    <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Paid Marketing (Meta Ads)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ad Spend (₹)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.metaSpend}
                                                onChange={e => setFormData({ ...formData, metaSpend: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Leads Generated</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.metaLeads}
                                                onChange={e => setFormData({ ...formData, metaLeads: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ad Creative Tested & Notes</label>
                                        <textarea
                                            placeholder="What ad hook, creative or audience did you test today?"
                                            value={formData.adCreativeNotes}
                                            onChange={e => setFormData({ ...formData, adCreativeNotes: e.target.value })}
                                            rows={2}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm"
                                        />
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pt-2 pb-2">Sales & Closing</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Proposals Sent</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.proposalsSent}
                                                onChange={e => setFormData({ ...formData, proposalsSent: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Deals Closed</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.dealsClosed}
                                                onChange={e => setFormData({ ...formData, dealsClosed: Number(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Revenue Won (₹)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.revenueGenerated}
                                            onChange={e => setFormData({ ...formData, revenueGenerated: Number(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold"
                                        />
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pt-2 pb-2">Tag CRM Pipeline Links</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Tag Associated Leads</label>
                                            <select
                                                multiple
                                                value={taggedLeads}
                                                onChange={e => {
                                                    const opts = Array.from(e.target.selectedOptions, o => (o as HTMLOptionElement).value);
                                                    setTaggedLeads(opts);
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-xs min-h-[100px] focus:ring-2 focus:ring-primary/20"
                                            >
                                                {leads.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name} ({l.destination || 'No Destination'})</option>
                                                ))}
                                            </select>
                                            <p className="text-[9px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple leads.</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Tag Associated Bookings</label>
                                            <select
                                                multiple
                                                value={taggedBookings}
                                                onChange={e => {
                                                    const opts = Array.from(e.target.selectedOptions, o => (o as HTMLOptionElement).value);
                                                    setTaggedBookings(opts);
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-xs min-h-[100px] focus:ring-2 focus:ring-primary/20"
                                            >
                                                {bookings.map(b => (
                                                    <option key={b.id} value={b.id}>{b.customer} - {b.title} (₹{b.amount.toLocaleString()})</option>
                                                ))}
                                            </select>
                                            <p className="text-[9px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple bookings.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: reflection & momentum score */}
                            {formStep === 3 && (
                                <div className="space-y-4 animate-in slide-in-from-right-2">
                                    {/* Real-time calculated momentum badge */}
                                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-center relative overflow-hidden">
                                        <Sparkles className="absolute -top-3 -right-3 text-indigo-500/20 w-16 h-16 rotate-12" />
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Calculated Momentum Level</p>
                                        <h4 className="text-5xl font-black mt-2 tracking-tight kpi-number">{computedMomentum} <span className="text-sm font-semibold opacity-70">/ 100</span></h4>
                                        <span className={`inline-block mt-3 text-xs font-bold uppercase px-3 py-1 rounded-full ${computedMomentum >= 50 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                                            Rating: {computedRating}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Daily Marketing Summary (What you did)</label>
                                        <textarea
                                            placeholder="Summarize your marketing actions today (e.g. built summer itinerary, launched Facebook campaign)..."
                                            value={formData.dailySummary}
                                            onChange={e => setFormData({ ...formData, dailySummary: e.target.value })}
                                            rows={3}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Key Learning / Experiment Result</label>
                                        <textarea
                                            placeholder="What insight did you gain? What copy hooks performed best? What failed?"
                                            value={formData.keyLearnings}
                                            onChange={e => setFormData({ ...formData, keyLearnings: e.target.value })}
                                            rows={2}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer Controls */}
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                                {formStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setFormStep(prev => prev - 1)}
                                        className="px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm active:scale-95 transition-all"
                                    >
                                        Back
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsLogModalOpen(false)}
                                        className="px-5 py-3 text-slate-400 hover:text-slate-600 font-bold text-sm"
                                    >
                                        Cancel
                                    </button>
                                )}

                                {formStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => setFormStep(prev => prev + 1)}
                                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-all ml-auto"
                                    >
                                        Next Step <ArrowRight size={14} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-all ml-auto btn-glow"
                                    >
                                        <Check size={16} /> Save Daily Log
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Summary Modal */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-850 dark:to-slate-800">
                            <div className="flex items-center gap-2">
                                <Sparkles className="text-indigo-600" size={22} />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Weekly Marketing Standup</h3>
                            </div>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                            {isAiLoading ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                                    <div className="size-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2">Gemini is synthesizing your weekly marketing reports...</p>
                                    <p className="text-xs text-slate-400">Reviewing outreach, Meta spend, and lessons learned.</p>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm leading-relaxed font-sans">
                                    {aiSummary}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!isAiLoading && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/40">
                                <button
                                    onClick={handleCopySummary}
                                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors"
                                >
                                    <Copy size={14} /> Copy to Clipboard
                                </button>
                                <button
                                    onClick={() => setIsAiModalOpen(false)}
                                    className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Target Modal */}
            {isTargetModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-850 dark:to-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="text-indigo-600" size={20} />
                                    Configure Daily Targets
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Set goals for organic outreach & paid ads</p>
                            </div>
                            <button onClick={() => setIsTargetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTargets} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Target Emails Sent</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={targetFormData.targetEmails}
                                    onChange={e => setTargetFormData({ ...targetFormData, targetEmails: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Target Social DMs</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={targetFormData.targetDms}
                                    onChange={e => setTargetFormData({ ...targetFormData, targetDms: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Target Cold Calls</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={targetFormData.targetCalls}
                                    onChange={e => setTargetFormData({ ...targetFormData, targetCalls: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Max Ad Spend (₹)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={targetFormData.targetSpend}
                                    onChange={e => setTargetFormData({ ...targetFormData, targetSpend: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTargetModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-850"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 btn-glow"
                                >
                                    Save Targets
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Outreach Templates Slide-out Drawer */}
            {isTemplateDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsTemplateDrawerOpen(false)}
                    />
                    
                    <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
                        <div className="w-screen max-w-md bg-white dark:bg-[#1A2633] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full transform transition-transform duration-300 translate-x-0">
                            {/* Drawer Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-850 dark:to-slate-800 shrink-0">
                                <div className="flex items-center gap-2">
                                    <FileText className="text-primary" size={22} />
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Outreach Templates</h3>
                                        <p className="text-[10px] text-slate-500">Proven copy & scripts for customer conversion</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsTemplateDrawerOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                                {/* Template 1 */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">WhatsApp Follow-up</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText("Hey [Client Name]! Hope you are doing great. just checking in to see if you had a chance to review the customized itinerary we sent over for your upcoming trip to [Destination]? We have a few slots closing soon for the best hotel deals. Let me know if you would like any changes! - Shrawya Tours");
                                                toast.success("WhatsApp template copied!");
                                            }}
                                            className="text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 px-2 py-1 rounded-md font-bold flex items-center gap-1 border border-slate-250/20"
                                        >
                                            <Copy size={10} /> Copy
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                                        Hey [Client Name]! Hope you are doing great. just checking in to see if you had a chance to review the customized itinerary we sent over for your upcoming trip to [Destination]? We have a few slots closing soon for the best hotel deals. Let me know if you would like any changes! - Shrawya Tours
                                    </div>
                                </div>

                                {/* Template 2 */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Cold Email Outreach</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText("Subject: Custom Travel Itinerary for [Company Name]\n\nHi [Name],\n\nHope this email finds you well. I noticed [Company Name] is planning its annual retreat / employee tour. At Shrawya Tours, we specialize in organizing seamless, premium, and fully-customized group trips.\n\nWe would love to design a complimentary draft itinerary for your team. Let me know if you have 5 minutes for a quick call this week?\n\nBest regards,\n[Your Name]\nShrawya Tours");
                                                toast.success("Email template copied!");
                                            }}
                                            className="text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 px-2 py-1 rounded-md font-bold flex items-center gap-1 border border-slate-250/20"
                                        >
                                            <Copy size={10} /> Copy
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                                        Subject: Custom Travel Itinerary for [Company Name]

Hi [Name],

Hope this email finds you well. I noticed [Company Name] is planning its annual retreat / employee tour. At Shrawya Tours, we specialize in organizing seamless, premium, and fully-customized group trips.

We would love to design a complimentary draft itinerary for your team. Let me know if you have 5 minutes for a quick call this week?

Best regards,
[Your Name]
Shrawya Tours
                                    </div>
                                </div>

                                {/* Template 3 */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Cold Call Script</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText("Intro: \"Hi [Name], this is [Your Name] from Shrawya Tours. I'm calling because we recently launched our premium summer packages to Kashmir and Himachal, and I saw you expressed interest in traveling there recently.\"\n\nHook: \"We are offering a custom 10% early-bird discount on all customized bookings this month, including high-end resort stays and personal guides.\"\n\nClose: \"Would it be okay if I send a quick draft itinerary with travel options to your WhatsApp so you can review it at your convenience?\"");
                                                toast.success("Call script copied!");
                                            }}
                                            className="text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 px-2 py-1 rounded-md font-bold flex items-center gap-1 border border-slate-250/20"
                                        >
                                            <Copy size={10} /> Copy
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
Intro: "Hi [Name], this is [Your Name] from Shrawya Tours. I'm calling because we recently launched our premium summer packages to Kashmir and Himachal, and I saw you expressed interest in traveling there recently."

Hook: "We are offering a custom 10% early-bird discount on all customized bookings this month, including high-end resort stays and personal guides."

Close: "Would it be okay if I send a quick draft itinerary with travel options to your WhatsApp so you can review it at your convenience?"
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
