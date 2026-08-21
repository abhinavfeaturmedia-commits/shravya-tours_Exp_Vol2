import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../src/lib/api';
import { generateWeeklyStandupSummary } from '../../src/lib/gemini';
import { DailyMarketingLog, StaffMember, MarketingTarget, LogComment, LogReaction, Lead, Booking } from '../../types';
import { toast } from 'sonner';
import {
    Flame, Sparkles, Plus, Calendar, Search, Edit2, Trash2, X, Check,
    TrendingUp, Award, BarChart3, Users, DollarSign, Mail, MessageSquare, Phone,
    FileText, Lightbulb, AlertTriangle, ArrowRight, Copy, Share2, MessageCircle,
    Target, CheckCircle2, ChevronRight, ChevronDown, RefreshCw, Zap, Layers,
    Clock, Send, BellRing, Filter, ExternalLink, Video, Instagram, Youtube,
    Globe, Radio, Megaphone, MapPin, Eye, ThumbsUp, UserCheck, CheckSquare,
    Square, ArrowUpRight, TrendingDown, HelpCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts';

// ==========================================
// TYPES FOR EXTENDED MARKETING OPERATIONS
// ==========================================

export interface MarketingTask {
    id: string;
    title: string;
    description?: string;
    assignedStaffId: number;
    category: 'content' | 'outreach' | 'paid_ads' | 'offline' | 'seo_blog' | 'design';
    channel?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    dueDate: string;
    status: 'todo' | 'in_progress' | 'review' | 'completed';
    createdAt: string;
    completedAt?: string;
    createdBy?: number;
}

export interface ContentPost {
    id: string;
    title: string;
    platform: 'instagram' | 'youtube' | 'facebook' | 'whatsapp' | 'blog' | 'linkedin';
    contentType: 'reel' | 'post' | 'story' | 'short' | 'video' | 'article' | 'broadcast';
    destinationOrTopic?: string;
    date: string;
    creatorStaffId: number;
    linkUrl?: string;
    viewsReach: number;
    likesEngagement: number;
    inquiriesGenerated: number;
    notes?: string;
}

export interface SocialAccountMetric {
    id: string;
    platform: 'instagram' | 'youtube' | 'facebook' | 'whatsapp' | 'linkedin';
    handle: string;
    followersCount: number;
    previousCount: number;
    weeklyGrowth: number;
    weeklyReach: number;
    lastUpdated: string;
}

export interface MarketingCampaign {
    id: string;
    name: string;
    channel: 'meta' | 'google' | 'youtube' | 'flyers' | 'offline_banners' | 'influencer';
    destinationOrPackage?: string;
    startDate: string;
    endDate?: string;
    status: 'active' | 'completed' | 'paused';
    spendAmount: number;
    reachImpressions: number;
    clicksCount: number;
    leadsGenerated: number;
    bookingsWon: number;
    revenueWon: number;
    notes?: string;
}

// Initial seed data for tasks, content, social accounts, and campaigns
const DEFAULT_SOCIAL_ACCOUNTS: SocialAccountMetric[] = [
    { id: 'soc-1', platform: 'instagram', handle: '@shrawyatours', followersCount: 14250, previousCount: 13900, weeklyGrowth: 350, weeklyReach: 48000, lastUpdated: new Date().toISOString().split('T')[0] },
    { id: 'soc-2', platform: 'youtube', handle: 'Shrawya Tours Official', followersCount: 5600, previousCount: 5480, weeklyGrowth: 120, weeklyReach: 32000, lastUpdated: new Date().toISOString().split('T')[0] },
    { id: 'soc-3', platform: 'facebook', handle: 'Shrawya Tours & Travels', followersCount: 8900, previousCount: 8820, weeklyGrowth: 80, weeklyReach: 21000, lastUpdated: new Date().toISOString().split('T')[0] },
    { id: 'soc-4', platform: 'whatsapp', handle: 'VIP Tour Broadcast Group', followersCount: 1850, previousCount: 1760, weeklyGrowth: 90, weeklyReach: 1850, lastUpdated: new Date().toISOString().split('T')[0] },
    { id: 'soc-5', platform: 'linkedin', handle: 'Shrawya Corporate Travel', followersCount: 2100, previousCount: 2040, weeklyGrowth: 60, weeklyReach: 8500, lastUpdated: new Date().toISOString().split('T')[0] },
];

const DEFAULT_CONTENT_POSTS: ContentPost[] = [
    { id: 'cnt-1', title: 'Top 5 Hidden Gems in Kashmir for Summer 2026', platform: 'instagram', contentType: 'reel', destinationOrTopic: 'Kashmir', date: new Date().toISOString().split('T')[0], creatorStaffId: 1, viewsReach: 18500, likesEngagement: 1420, inquiriesGenerated: 14, linkUrl: 'https://instagram.com/reel/demo1' },
    { id: 'cnt-2', title: 'Manali 5D/4N Group Tour Itinerary Breakdown', platform: 'youtube', contentType: 'short', destinationOrTopic: 'Himachal', date: new Date().toISOString().split('T')[0], creatorStaffId: 1, viewsReach: 12400, likesEngagement: 890, inquiriesGenerated: 9, linkUrl: 'https://youtube.com/shorts/demo2' },
    { id: 'cnt-3', title: 'Monsoon in Goa: Complete Travel Guide & Villa Deals', platform: 'blog', contentType: 'article', destinationOrTopic: 'Goa', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], creatorStaffId: 1, viewsReach: 3200, likesEngagement: 240, inquiriesGenerated: 6, linkUrl: 'https://shrawyatours.com/blog/goa-monsoon' },
    { id: 'cnt-4', title: 'Early Bird Kerala Backwaters Special Discount', platform: 'whatsapp', contentType: 'broadcast', destinationOrTopic: 'Kerala', date: new Date(Date.now() - 172800000).toISOString().split('T')[0], creatorStaffId: 1, viewsReach: 1850, likesEngagement: 310, inquiriesGenerated: 22, linkUrl: '' }
];

const DEFAULT_CAMPAIGNS: MarketingCampaign[] = [
    { id: 'cmp-1', name: 'Summer Kashmir Family Packages - Meta Ads', channel: 'meta', destinationOrPackage: 'Kashmir Deluxe Tour', startDate: new Date(Date.now() - 604800000).toISOString().split('T')[0], status: 'active', spendAmount: 8500, reachImpressions: 42000, clicksCount: 1150, leadsGenerated: 38, bookingsWon: 4, revenueWon: 340000, notes: 'Targeting parents aged 30-55 in Mumbai & Pune.' },
    { id: 'cmp-2', name: 'Himachal Honeymoon Google Search Intent', channel: 'google', destinationOrPackage: 'Manali & Shimla Couple Special', startDate: new Date(Date.now() - 518400000).toISOString().split('T')[0], status: 'active', spendAmount: 6200, reachImpressions: 14000, clicksCount: 820, leadsGenerated: 26, bookingsWon: 3, revenueWon: 195000, notes: 'Keywords: Manali honeymoon packages, Shimla tour booking.' },
    { id: 'cmp-3', name: 'Local Pamphlets & Flyers in Bandra & Andheri', channel: 'flyers', destinationOrPackage: 'Monsoon Weekend Getaways', startDate: new Date(Date.now() - 432000000).toISOString().split('T')[0], status: 'completed', spendAmount: 4500, reachImpressions: 5000, clicksCount: 0, leadsGenerated: 18, bookingsWon: 2, revenueWon: 90000, notes: 'Distributed 2,500 newspaper inserts.' },
    { id: 'cmp-4', name: 'Travel Influencer Ladakh Bike Expedition Video', channel: 'youtube', destinationOrPackage: 'Ladakh Bike Tour 2026', startDate: new Date(Date.now() - 345600000).toISOString().split('T')[0], status: 'active', spendAmount: 12000, reachImpressions: 68000, clicksCount: 2400, leadsGenerated: 45, bookingsWon: 5, revenueWon: 425000, notes: 'Sponsored segment on Rohit Travels YouTube channel.' }
];

const DEFAULT_TASKS: MarketingTask[] = [
    { id: 'tsk-1', title: 'Create 3 Reels for Kashmir Summer Special package', description: 'Highlight luxury houseboat stay and Gulmarg gondola ride with trending audio hook.', assignedStaffId: 1, category: 'content', channel: 'Instagram', priority: 'high', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], status: 'in_progress', createdAt: new Date().toISOString() },
    { id: 'tsk-2', title: 'Run Google Search Ad campaign for Kerala Monsoon', description: 'Set up ad group with keywords: Kerala luxury tour, Munnar resort package. Budget ₹1,000/day.', assignedStaffId: 1, category: 'paid_ads', channel: 'Google Ads', priority: 'urgent', dueDate: new Date().toISOString().split('T')[0], status: 'todo', createdAt: new Date().toISOString() },
    { id: 'tsk-3', title: 'Distribute 1,000 flyers at upcoming travel expo stall', description: 'Print A5 flyers with QR code leading to early-bird discount form.', assignedStaffId: 1, category: 'offline', channel: 'Flyers', priority: 'medium', dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0], status: 'todo', createdAt: new Date().toISOString() },
    { id: 'tsk-4', title: 'Outreach to 25 Corporate HRs on LinkedIn for Annual Offsites', description: 'Use corporate tour template to propose customized retreat packages.', assignedStaffId: 1, category: 'outreach', channel: 'LinkedIn', priority: 'high', dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], status: 'todo', createdAt: new Date().toISOString() }
];

export const MarketingLogs: React.FC = () => {
    const { currentUser } = useAuth();
    
    // Core database states
    const [logs, setLogs] = useState<DailyMarketingLog[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [targets, setTargets] = useState<MarketingTarget[]>([]);
    const [loading, setLoading] = useState(true);

    // Active Tab: tasks | content_social | ads_offline | daily_logs
    const [activeTab, setActiveTab] = useState<'tasks' | 'content_social' | 'ads_offline' | 'daily_logs'>('tasks');

    // Extended marketing states (persisted in localStorage + state)
    const [tasks, setTasks] = useState<MarketingTask[]>(() => {
        try {
            const saved = localStorage.getItem('shrawya_marketing_tasks');
            return saved ? JSON.parse(saved) : DEFAULT_TASKS;
        } catch {
            return DEFAULT_TASKS;
        }
    });

    const [contentPosts, setContentPosts] = useState<ContentPost[]>(() => {
        try {
            const saved = localStorage.getItem('shrawya_marketing_content');
            return saved ? JSON.parse(saved) : DEFAULT_CONTENT_POSTS;
        } catch {
            return DEFAULT_CONTENT_POSTS;
        }
    });

    const [socialAccounts, setSocialAccounts] = useState<SocialAccountMetric[]>(() => {
        try {
            const saved = localStorage.getItem('shrawya_marketing_social');
            return saved ? JSON.parse(saved) : DEFAULT_SOCIAL_ACCOUNTS;
        } catch {
            return DEFAULT_SOCIAL_ACCOUNTS;
        }
    });

    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => {
        try {
            const saved = localStorage.getItem('shrawya_marketing_campaigns');
            return saved ? JSON.parse(saved) : DEFAULT_CAMPAIGNS;
        } catch {
            return DEFAULT_CAMPAIGNS;
        }
    });

    // Save extended states to localStorage
    useEffect(() => {
        try { localStorage.setItem('shrawya_marketing_tasks', JSON.stringify(tasks)); } catch (e) {}
    }, [tasks]);
    useEffect(() => {
        try { localStorage.setItem('shrawya_marketing_content', JSON.stringify(contentPosts)); } catch (e) {}
    }, [contentPosts]);
    useEffect(() => {
        try { localStorage.setItem('shrawya_marketing_social', JSON.stringify(socialAccounts)); } catch (e) {}
    }, [socialAccounts]);
    useEffect(() => {
        try { localStorage.setItem('shrawya_marketing_campaigns', JSON.stringify(campaigns)); } catch (e) {}
    }, [campaigns]);

    // Modals
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Filter states
    const [taskFilterStaff, setTaskFilterStaff] = useState<string>('all');
    const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
    const [taskFilterCategory, setTaskFilterCategory] = useState<string>('all');
    const [contentFilterPlatform, setContentFilterPlatform] = useState<string>('all');
    const [campaignFilterChannel, setCampaignFilterChannel] = useState<string>('all');
    const [logSearchQuery, setLogSearchQuery] = useState('');

    // Task form state
    const [taskForm, setTaskForm] = useState<{
        id?: string;
        title: string;
        description: string;
        assignedStaffId: number;
        category: 'content' | 'outreach' | 'paid_ads' | 'offline' | 'seo_blog' | 'design';
        channel: string;
        priority: 'urgent' | 'high' | 'medium' | 'low';
        dueDate: string;
        status: 'todo' | 'in_progress' | 'review' | 'completed';
    }>({
        title: '',
        description: '',
        assignedStaffId: currentUser?.staffId || 1,
        category: 'content',
        channel: 'Instagram',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'todo'
    });

    // Content Post form state
    const [contentForm, setContentForm] = useState<{
        title: string;
        platform: 'instagram' | 'youtube' | 'facebook' | 'whatsapp' | 'blog' | 'linkedin';
        contentType: 'reel' | 'post' | 'story' | 'short' | 'video' | 'article' | 'broadcast';
        destinationOrTopic: string;
        date: string;
        creatorStaffId: number;
        linkUrl: string;
        viewsReach: number;
        likesEngagement: number;
        inquiriesGenerated: number;
        notes: string;
    }>({
        title: '',
        platform: 'instagram',
        contentType: 'reel',
        destinationOrTopic: '',
        date: new Date().toISOString().split('T')[0],
        creatorStaffId: currentUser?.staffId || 1,
        linkUrl: '',
        viewsReach: 0,
        likesEngagement: 0,
        inquiriesGenerated: 0,
        notes: ''
    });

    // Campaign form state
    const [campaignForm, setCampaignForm] = useState<{
        name: string;
        channel: 'meta' | 'google' | 'youtube' | 'flyers' | 'offline_banners' | 'influencer';
        destinationOrPackage: string;
        startDate: string;
        status: 'active' | 'completed' | 'paused';
        spendAmount: number;
        reachImpressions: number;
        clicksCount: number;
        leadsGenerated: number;
        bookingsWon: number;
        revenueWon: number;
        notes: string;
    }>({
        name: '',
        channel: 'meta',
        destinationOrPackage: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        spendAmount: 0,
        reachImpressions: 0,
        clicksCount: 0,
        leadsGenerated: 0,
        bookingsWon: 0,
        revenueWon: 0,
        notes: ''
    });

    // Social Update form state
    const [selectedSocialAccount, setSelectedSocialAccount] = useState<SocialAccountMetric | null>(null);
    const [socialUpdateForm, setSocialUpdateForm] = useState({ followersCount: 0, weeklyReach: 0 });

    // Daily Log form state
    const [dailyLogForm, setDailyLogForm] = useState({
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
        dailySummary: '',
        keyLearnings: ''
    });

    // Daily Targets form state
    const [targetFormData, setTargetFormData] = useState({
        targetEmails: 30,
        targetDms: 15,
        targetCalls: 5,
        targetSpend: 2000
    });

    // Fetch initial database data
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
            setLogs(logsData || []);
            setStaff(staffData || []);
            setLeads(leadsData || []);
            setBookings(bookingsData || []);
            setTargets(targetsData || []);
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to load marketing data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Staff map
    const staffNamesMap = useMemo(() => {
        const mapping: Record<number, string> = {};
        staff.forEach(s => {
            mapping[s.id] = s.name;
        });
        return mapping;
    }, [staff]);

    // Top Level Summary Stats
    const topStats = useMemo(() => {
        // Content posted past 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        const recentContent = contentPosts.filter(c => c.date >= weekAgoStr);
        const totalContentCount = recentContent.length;
        const totalContentInquiries = recentContent.reduce((sum, c) => sum + Number(c.inquiriesGenerated || 0), 0);

        // Multi-channel ad & promo spend
        const totalAdSpend = campaigns.reduce((sum, c) => sum + Number(c.spendAmount || 0), 0);
        const totalAdLeads = campaigns.reduce((sum, c) => sum + Number(c.leadsGenerated || 0), 0);
        const totalAdRevenue = campaigns.reduce((sum, c) => sum + Number(c.revenueWon || 0), 0);
        const avgCpl = totalAdLeads > 0 ? Math.round(totalAdSpend / totalAdLeads) : 0;
        const overallRoas = totalAdSpend > 0 ? (totalAdRevenue / totalAdSpend).toFixed(1) : '0';

        // Outreach past 7 days from logs
        const recentLogs = logs.slice(0, 7);
        const totalOutreachContacts = recentLogs.reduce((sum, l) => sum + Number(l.emailsSent || 0) + Number(l.socialDms || 0) + Number(l.callsMade || 0), 0);
        const totalFollowUps = recentLogs.reduce((sum, l) => sum + Number(l.followUps || 0), 0);

        // Social growth total
        const totalFollowers = socialAccounts.reduce((sum, s) => sum + Number(s.followersCount || 0), 0);
        const netWeeklyGain = socialAccounts.reduce((sum, s) => sum + Number(s.weeklyGrowth || 0), 0);

        // Tasks count
        const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;

        return {
            contentCount: totalContentCount,
            contentInquiries: totalContentInquiries,
            adSpend: totalAdSpend,
            adLeads: totalAdLeads,
            adRevenue: totalAdRevenue,
            avgCpl,
            overallRoas,
            outreachContacts: totalOutreachContacts,
            followUps: totalFollowUps,
            totalFollowers,
            netWeeklyGain,
            pendingTasks,
            completedTasks
        };
    }, [contentPosts, campaigns, logs, socialAccounts, tasks]);

    // Filtered Tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesStaff = taskFilterStaff === 'all' || String(t.assignedStaffId) === taskFilterStaff;
            const matchesStatus = taskFilterStatus === 'all' || t.status === taskFilterStatus;
            const matchesCategory = taskFilterCategory === 'all' || t.category === taskFilterCategory;
            return matchesStaff && matchesStatus && matchesCategory;
        });
    }, [tasks, taskFilterStaff, taskFilterStatus, taskFilterCategory]);

    // Filtered Content
    const filteredContent = useMemo(() => {
        return contentPosts.filter(c => {
            return contentFilterPlatform === 'all' || c.platform === contentFilterPlatform;
        });
    }, [contentPosts, contentFilterPlatform]);

    // Filtered Campaigns
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            return campaignFilterChannel === 'all' || c.channel === campaignFilterChannel;
        });
    }, [campaigns, campaignFilterChannel]);

    // Filtered Daily Logs
    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            return (
                !logSearchQuery ||
                l.dailySummary?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                l.keyLearnings?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                staffNamesMap[l.staffId]?.toLowerCase().includes(logSearchQuery.toLowerCase())
            );
        });
    }, [logs, logSearchQuery, staffNamesMap]);

    // ----------------------------------------------------
    // HANDLERS FOR TASKS
    // ----------------------------------------------------
    const handleSaveTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title.trim()) {
            toast.error("Please enter a task title");
            return;
        }

        if (taskForm.id) {
            // Edit existing
            setTasks(prev => prev.map(t => t.id === taskForm.id ? {
                ...t,
                title: taskForm.title,
                description: taskForm.description,
                assignedStaffId: Number(taskForm.assignedStaffId),
                category: taskForm.category,
                channel: taskForm.channel,
                priority: taskForm.priority,
                dueDate: taskForm.dueDate,
                status: taskForm.status
            } : t));
            toast.success("Marketing task updated!");
        } else {
            // New task
            const newTask: MarketingTask = {
                id: 'tsk-' + Date.now(),
                title: taskForm.title,
                description: taskForm.description,
                assignedStaffId: Number(taskForm.assignedStaffId),
                category: taskForm.category,
                channel: taskForm.channel,
                priority: taskForm.priority,
                dueDate: taskForm.dueDate,
                status: 'todo',
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.staffId || 1
            };
            setTasks(prev => [newTask, ...prev]);
            toast.success(`Task assigned to ${staffNamesMap[Number(taskForm.assignedStaffId)] || 'Staff'}!`);

            // In-app notification for assigned staff
            if (taskForm.assignedStaffId !== currentUser?.staffId) {
                api.createInAppNotification({
                    staffId: Number(taskForm.assignedStaffId),
                    senderId: currentUser?.staffId || 0,
                    title: `New Marketing Task Assigned 🎯`,
                    message: `${currentUser?.name || 'Admin'} assigned you: "${taskForm.title}" (Due: ${taskForm.dueDate})`,
                    type: 'task'
                }).catch(() => {});
            }
        }

        setIsTaskModalOpen(false);
    };

    const handleToggleTaskStatus = (task: MarketingTask) => {
        const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
        setTasks(prev => prev.map(t => t.id === task.id ? {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
        } : t));
        toast.success(nextStatus === 'completed' ? "Task marked as completed! 🎉" : "Task moved to To-Do");
    };

    const handleDeleteTask = (id: string) => {
        if (!confirm("Are you sure you want to delete this marketing task?")) return;
        setTasks(prev => prev.filter(t => t.id !== id));
        toast.success("Task deleted");
    };

    // ----------------------------------------------------
    // HANDLERS FOR CONTENT POSTS
    // ----------------------------------------------------
    const handleSaveContent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contentForm.title.trim()) {
            toast.error("Please enter a content title");
            return;
        }

        const newPost: ContentPost = {
            id: 'cnt-' + Date.now(),
            title: contentForm.title,
            platform: contentForm.platform,
            contentType: contentForm.contentType,
            destinationOrTopic: contentForm.destinationOrTopic,
            date: contentForm.date,
            creatorStaffId: Number(contentForm.creatorStaffId),
            linkUrl: contentForm.linkUrl,
            viewsReach: Number(contentForm.viewsReach || 0),
            likesEngagement: Number(contentForm.likesEngagement || 0),
            inquiriesGenerated: Number(contentForm.inquiriesGenerated || 0),
            notes: contentForm.notes
        };

        setContentPosts(prev => [newPost, ...prev]);
        toast.success("Content post recorded successfully!");
        setIsContentModalOpen(false);
    };

    const handleDeleteContent = (id: string) => {
        if (!confirm("Delete this content record?")) return;
        setContentPosts(prev => prev.filter(c => c.id !== id));
        toast.success("Content log removed");
    };

    // ----------------------------------------------------
    // HANDLERS FOR CAMPAIGNS (OUTCOME TRACKER)
    // ----------------------------------------------------
    const handleSaveCampaign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignForm.name.trim()) {
            toast.error("Please enter campaign name");
            return;
        }

        const newCamp: MarketingCampaign = {
            id: 'cmp-' + Date.now(),
            name: campaignForm.name,
            channel: campaignForm.channel,
            destinationOrPackage: campaignForm.destinationOrPackage,
            startDate: campaignForm.startDate,
            status: campaignForm.status,
            spendAmount: Number(campaignForm.spendAmount || 0),
            reachImpressions: Number(campaignForm.reachImpressions || 0),
            clicksCount: Number(campaignForm.clicksCount || 0),
            leadsGenerated: Number(campaignForm.leadsGenerated || 0),
            bookingsWon: Number(campaignForm.bookingsWon || 0),
            revenueWon: Number(campaignForm.revenueWon || 0),
            notes: campaignForm.notes
        };

        setCampaigns(prev => [newCamp, ...prev]);
        toast.success("Marketing campaign & ROI outcomes saved!");
        setIsCampaignModalOpen(false);
    };

    const handleDeleteCampaign = (id: string) => {
        if (!confirm("Delete this campaign record?")) return;
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success("Campaign record removed");
    };

    // ----------------------------------------------------
    // HANDLERS FOR SOCIAL GROWTH AUDIT
    // ----------------------------------------------------
    const handleUpdateSocialMetric = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSocialAccount) return;

        const newFollowers = Number(socialUpdateForm.followersCount);
        const prev = selectedSocialAccount.followersCount;
        const growth = newFollowers - prev;

        setSocialAccounts(prevList => prevList.map(item => item.id === selectedSocialAccount.id ? {
            ...item,
            followersCount: newFollowers,
            previousCount: prev,
            weeklyGrowth: growth,
            weeklyReach: Number(socialUpdateForm.weeklyReach || item.weeklyReach),
            lastUpdated: new Date().toISOString().split('T')[0]
        } : item));

        toast.success(`${selectedSocialAccount.platform.toUpperCase()} followers updated (+${growth} growth)!`);
        setIsSocialModalOpen(false);
    };

    // ----------------------------------------------------
    // HANDLERS FOR DAILY LOGS (MYSQL SYNC)
    // ----------------------------------------------------
    const handleSaveDailyLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.staffId) {
            toast.error("You must be logged in as staff to record a log.");
            return;
        }

        const score = Math.min(100, Math.round(
            (Number(dailyLogForm.emailsSent || 0) * 1) +
            (Number(dailyLogForm.socialDms || 0) * 1.5) +
            (Number(dailyLogForm.callsMade || 0) * 2) +
            (Number(dailyLogForm.followUps || 0) * 2.5) +
            (Number(dailyLogForm.dealsClosed || 0) * 20)
        ));

        const rating: 'sluggish' | 'steady' | 'high-momentum' | 'unstoppable' = score >= 80 ? 'unstoppable' : score >= 50 ? 'high-momentum' : score >= 20 ? 'steady' : 'sluggish';

        const payload = {
            date: dailyLogForm.date,
            staffId: currentUser.staffId,
            momentumScore: score,
            rating,
            emailsSent: Number(dailyLogForm.emailsSent || 0),
            socialDms: Number(dailyLogForm.socialDms || 0),
            callsMade: Number(dailyLogForm.callsMade || 0),
            followUps: Number(dailyLogForm.followUps || 0),
            proposalsSent: Number(dailyLogForm.proposalsSent || 0),
            dealsClosed: Number(dailyLogForm.dealsClosed || 0),
            revenueGenerated: Number(dailyLogForm.revenueGenerated || 0),
            metaSpend: Number(dailyLogForm.metaSpend || 0),
            metaLeads: Number(dailyLogForm.metaLeads || 0),
            dailySummary: dailyLogForm.dailySummary || undefined,
            keyLearnings: dailyLogForm.keyLearnings || undefined
        };

        const toastId = toast.loading("Saving daily check-in to database...");
        try {
            await api.createMarketingLog(payload);
            toast.success("Daily marketing check-in saved to MySQL!", { id: toastId });
            setIsLogModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save daily log", { id: toastId });
        }
    };

    // AI Standup
    const handleGenerateAiStandup = async () => {
        if (logs.length === 0) {
            toast.error("No daily logs recorded yet to summarize!");
            return;
        }
        setIsAiLoading(true);
        setIsAiModalOpen(true);
        try {
            const recent = logs.slice(0, 7);
            const summary = await generateWeeklyStandupSummary(recent, staffNamesMap);
            setAiSummary(summary);
        } catch (e: any) {
            toast.error("Failed to generate AI summary. Check Gemini API key.");
            setIsAiModalOpen(false);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Helper for channel badges
    const getChannelBadge = (channel: string) => {
        switch (channel?.toLowerCase()) {
            case 'meta':
            case 'instagram':
                return { bg: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/60', icon: '📸' };
            case 'google':
            case 'google ads':
                return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/60', icon: '🔍' };
            case 'youtube':
                return { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800/60', icon: '▶️' };
            case 'flyers':
            case 'offline':
            case 'offline_banners':
                return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60', icon: '📄' };
            case 'whatsapp':
                return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60', icon: '💬' };
            case 'linkedin':
                return { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800/60', icon: '💼' };
            default:
                return { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: '🎯' };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800';
            case 'high':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'medium':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1650px] mx-auto min-h-screen font-sans text-slate-800 dark:text-slate-100">
            {/* ======================================================== */}
            {/* HEADER & QUICK ACTION BAR */}
            {/* ======================================================== */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#1A2633] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Megaphone size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                            Marketing Operations & Tracker
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                            Manage staff tasks, track content & social growth, and monitor ad spend outcomes across all channels.
                        </p>
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={handleGenerateAiStandup}
                        className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                        <Sparkles size={16} className="text-amber-500" />
                        <span>AI Standup</span>
                    </button>

                    <button
                        onClick={() => {
                            setTaskForm({
                                title: '',
                                description: '',
                                assignedStaffId: currentUser?.staffId || (staff[0]?.id || 1),
                                category: 'content',
                                channel: 'Instagram',
                                priority: 'high',
                                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                status: 'todo'
                            });
                            setIsTaskModalOpen(true);
                        }}
                        className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                        <CheckSquare size={16} />
                        <span>Assign Task</span>
                    </button>

                    <button
                        onClick={() => {
                            setContentForm({
                                title: '',
                                platform: 'instagram',
                                contentType: 'reel',
                                destinationOrTopic: '',
                                date: new Date().toISOString().split('T')[0],
                                creatorStaffId: currentUser?.staffId || 1,
                                linkUrl: '',
                                viewsReach: 0,
                                likesEngagement: 0,
                                inquiriesGenerated: 0,
                                notes: ''
                            });
                            setIsContentModalOpen(true);
                        }}
                        className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                        <Video size={16} />
                        <span>Log Content</span>
                    </button>

                    <button
                        onClick={() => {
                            setCampaignForm({
                                name: '',
                                channel: 'meta',
                                destinationOrPackage: '',
                                startDate: new Date().toISOString().split('T')[0],
                                status: 'active',
                                spendAmount: 0,
                                reachImpressions: 0,
                                clicksCount: 0,
                                leadsGenerated: 0,
                                bookingsWon: 0,
                                revenueWon: 0,
                                notes: ''
                            });
                            setIsCampaignModalOpen(true);
                        }}
                        className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                        <DollarSign size={16} />
                        <span>Track Ads/ROI</span>
                    </button>

                    <button
                        onClick={() => {
                            setDailyLogForm({
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
                                dailySummary: '',
                                keyLearnings: ''
                            });
                            setIsLogModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-primary/20 btn-glow"
                    >
                        <Plus size={18} />
                        <span>Daily Log</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* 5 EXECUTIVE SUMMARY CARDS */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Content Published (7D) */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Content Posted (7D)</span>
                            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                <Video size={16} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display">
                                {topStats.contentCount}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Reels/Posts</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{topStats.contentInquiries} Inquiries won</span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                            Social Organic
                        </span>
                    </div>
                </div>

                {/* 2. Social Audience Growth */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Followers</span>
                            <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                                <Instagram size={16} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display">
                                {topStats.totalFollowers.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                            <TrendingUp size={12} /> +{topStats.netWeeklyGain} this week
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 font-bold text-[11px]">
                            Growth
                        </span>
                    </div>
                </div>

                {/* 3. Outbound Outreach (7D) */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Outreach Contacts</span>
                            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                <Mail size={16} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display">
                                {topStats.outreachContacts}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Contacted</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{topStats.followUps} Follow-ups</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                            DMs & Calls
                        </span>
                    </div>
                </div>

                {/* 4. Total Ad & Promo Spend (Multi-Channel) */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Ad Spend</span>
                            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                <DollarSign size={16} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display">
                                ₹{topStats.adSpend.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{topStats.adLeads} Leads (CPL: ₹{topStats.avgCpl})</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                            {topStats.overallRoas}x ROAS
                        </span>
                    </div>
                </div>

                {/* 5. Marketing Tasks Status */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Staff Tasks</span>
                            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                <CheckSquare size={16} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display">
                                {topStats.pendingTasks}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Pending action</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{topStats.completedTasks} Completed</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                            Team Queue
                        </span>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* MAIN NAVIGATION TABS */}
            {/* ======================================================== */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'tasks'
                            ? 'border-primary text-primary dark:text-primary-light'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <CheckSquare size={16} />
                    <span>Staff Marketing Tasks</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {tasks.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('content_social')}
                    className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'content_social'
                            ? 'border-primary text-primary dark:text-primary-light'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Video size={16} />
                    <span>Content & Social Growth</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold">
                        {contentPosts.length} Posts
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('ads_offline')}
                    className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'ads_offline'
                            ? 'border-primary text-primary dark:text-primary-light'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <DollarSign size={16} />
                    <span>Ads & Offline ROI Outcomes</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                        {campaigns.length} Campaigns
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('daily_logs')}
                    className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'daily_logs'
                            ? 'border-primary text-primary dark:text-primary-light'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <FileText size={16} />
                    <span>Daily Outreach & Goal Logs</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {logs.length}
                    </span>
                </button>
            </div>

            {/* ======================================================== */}
            {/* TAB 1: STAFF MARKETING TASKS (ASSIGN & TRACK) */}
            {/* ======================================================== */}
            {activeTab === 'tasks' && (
                <div className="space-y-4">
                    {/* Filter & Toolbar */}
                    <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            {/* Filter by Staff */}
                            <select
                                value={taskFilterStaff}
                                onChange={e => setTaskFilterStaff(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">All Staff Members</option>
                                {staff.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>

                            {/* Filter by Status */}
                            <select
                                value={taskFilterStatus}
                                onChange={e => setTaskFilterStatus(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">All Statuses</option>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Under Review</option>
                                <option value="completed">Completed</option>
                            </select>

                            {/* Filter by Category */}
                            <select
                                value={taskFilterCategory}
                                onChange={e => setTaskFilterCategory(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">All Categories</option>
                                <option value="content">Content Creation (Reels/Videos)</option>
                                <option value="outreach">Direct Outreach (DMs/Calls)</option>
                                <option value="paid_ads">Paid Advertising (Meta/Google)</option>
                                <option value="offline">Offline / Field Promotion</option>
                                <option value="seo_blog">SEO & Travel Guides</option>
                                <option value="design">Graphics & Creatives</option>
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                setTaskForm({
                                    title: '',
                                    description: '',
                                    assignedStaffId: currentUser?.staffId || (staff[0]?.id || 1),
                                    category: 'content',
                                    channel: 'Instagram',
                                    priority: 'high',
                                    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                    status: 'todo'
                                });
                                setIsTaskModalOpen(true);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all shadow-xs self-end md:self-auto"
                        >
                            <Plus size={16} />
                            <span>+ Assign New Task</span>
                        </button>
                    </div>

                    {/* Tasks List */}
                    {filteredTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTasks.map(task => {
                                const isCompleted = task.status === 'completed';
                                const channelBadge = getChannelBadge(task.channel || task.category);
                                const isOverdue = !isCompleted && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0];

                                return (
                                    <div
                                        key={task.id}
                                        className={`bg-white dark:bg-[#1A2633] rounded-2xl border p-5 shadow-xs transition-all space-y-3.5 flex flex-col justify-between ${
                                            isCompleted
                                                ? 'border-slate-200 dark:border-slate-800 opacity-75'
                                                : isOverdue
                                                ? 'border-red-300 dark:border-red-800/70 bg-red-50/20'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                        }`}
                                    >
                                        <div className="space-y-2.5">
                                            {/* Header tags */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${channelBadge.bg} ${channelBadge.text} ${channelBadge.border}`}>
                                                        {channelBadge.icon} {task.channel || task.category}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPriorityBadge(task.priority)} uppercase`}>
                                                        {task.priority}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setTaskForm({
                                                                id: task.id,
                                                                title: task.title,
                                                                description: task.description || '',
                                                                assignedStaffId: task.assignedStaffId,
                                                                category: task.category,
                                                                channel: task.channel || 'Instagram',
                                                                priority: task.priority,
                                                                dueDate: task.dueDate,
                                                                status: task.status
                                                            });
                                                            setIsTaskModalOpen(true);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                                        title="Edit Task"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                                                        title="Delete Task"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Task Title & Description */}
                                            <div>
                                                <h4 className={`text-sm font-bold text-slate-900 dark:text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                                    {task.title}
                                                </h4>
                                                {task.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Info & Toggle */}
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                            {/* Assignee */}
                                            <div className="flex items-center gap-2">
                                                <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                    {staffNamesMap[task.assignedStaffId]?.substring(0, 2).toUpperCase() || 'ST'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {staffNamesMap[task.assignedStaffId] || `Staff #${task.assignedStaffId}`}
                                                    </p>
                                                    <p className={`text-[10px] font-semibold ${isOverdue ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                        Due: {task.dueDate} {isOverdue && '⚠️ OVERDUE'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Button */}
                                            <button
                                                onClick={() => handleToggleTaskStatus(task)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    isCompleted
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                {isCompleted ? <Check size={13} /> : <Square size={13} />}
                                                <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1A2633] p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full w-fit mx-auto">
                                <CheckSquare size={24} />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">No marketing tasks found</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Delegate marketing assignments to your team to keep content and promotions on track!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: CONTENT & SOCIAL GROWTH */}
            {/* ======================================================== */}
            {activeTab === 'content_social' && (
                <div className="space-y-6">
                    {/* Social Media Accounts Growth Table */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Instagram className="text-pink-600" size={18} /> Social Media Accounts Growth Tracker
                                </h3>
                                <p className="text-xs text-slate-500">Track followers, subscribers, reach, and weekly net momentum across official channels.</p>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 self-start">
                                Weekly Audit
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                            {socialAccounts.map(acc => {
                                const badge = getChannelBadge(acc.platform);
                                return (
                                    <div
                                        key={acc.id}
                                        className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                                                    {badge.icon} {acc.platform.toUpperCase()}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSocialAccount(acc);
                                                        setSocialUpdateForm({ followersCount: acc.followersCount, weeklyReach: acc.weeklyReach });
                                                        setIsSocialModalOpen(true);
                                                    }}
                                                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5"
                                                >
                                                    <Edit2 size={11} /> Update
                                                </button>
                                            </div>

                                            <div className="mt-2.5">
                                                <p className="text-xs text-slate-400 font-medium truncate">{acc.handle}</p>
                                                <h4 className="text-xl font-black text-slate-900 dark:text-white font-display mt-0.5">
                                                    {acc.followersCount.toLocaleString()}
                                                </h4>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                                <TrendingUp size={11} /> +{acc.weeklyGrowth}
                                            </span>
                                            <span className="text-slate-400">{acc.weeklyReach.toLocaleString()} Reach</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Publishing Tracker */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Video className="text-purple-600" size={18} /> Content Publishing & Inquiries Log
                                </h3>
                                <p className="text-xs text-slate-500">Track published reels, videos, stories, articles, and the traveler inquiries they generate.</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={contentFilterPlatform}
                                    onChange={e => setContentFilterPlatform(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    <option value="all">All Platforms</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="youtube">YouTube</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="blog">Blog / Web</option>
                                </select>

                                <button
                                    onClick={() => {
                                        setContentForm({
                                            title: '',
                                            platform: 'instagram',
                                            contentType: 'reel',
                                            destinationOrTopic: '',
                                            date: new Date().toISOString().split('T')[0],
                                            creatorStaffId: currentUser?.staffId || 1,
                                            linkUrl: '',
                                            viewsReach: 0,
                                            likesEngagement: 0,
                                            inquiriesGenerated: 0,
                                            notes: ''
                                        });
                                        setIsContentModalOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                                >
                                    <Plus size={14} /> Log Post
                                </button>
                            </div>
                        </div>

                        {/* Content Posts Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="pb-3">Content Title & Topic</th>
                                        <th className="pb-3">Platform & Format</th>
                                        <th className="pb-3">Creator</th>
                                        <th className="pb-3 text-right">Reach / Views</th>
                                        <th className="pb-3 text-right">Engagement</th>
                                        <th className="pb-3 text-right">Inquiries Generated</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {filteredContent.map(post => {
                                        const pBadge = getChannelBadge(post.platform);
                                        return (
                                            <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="py-3.5 pr-3">
                                                    <p className="font-bold text-slate-900 dark:text-white text-xs">{post.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                        <span>{post.date}</span>
                                                        {post.destinationOrTopic && <span>• {post.destinationOrTopic}</span>}
                                                        {post.linkUrl && (
                                                            <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                                                                <ExternalLink size={10} /> Link
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 pr-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${pBadge.bg} ${pBadge.text} ${pBadge.border}`}>
                                                        {pBadge.icon} {post.platform} • {post.contentType}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 pr-3 text-slate-600 dark:text-slate-300">
                                                    {staffNamesMap[post.creatorStaffId] || `Staff #${post.creatorStaffId}`}
                                                </td>
                                                <td className="py-3.5 pr-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                                    {Number(post.viewsReach || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3.5 pr-3 text-right text-slate-600 dark:text-slate-300">
                                                    {Number(post.likesEngagement || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3.5 pr-3 text-right">
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                                        +{post.inquiriesGenerated} Leads
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right">
                                                    <button
                                                        onClick={() => handleDeleteContent(post.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: AD CAMPAIGNS & OFFLINE ROI TRACKER */}
            {/* ======================================================== */}
            {activeTab === 'ads_offline' && (
                <div className="space-y-6">
                    {/* Multi-Channel Ad Campaigns Summary */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <DollarSign className="text-emerald-600" size={18} /> Multi-Channel Promotional Spend & Outcome Tracker
                                </h3>
                                <p className="text-xs text-slate-500">Track ROI across Meta Ads, Google Ads, YouTube, Print Flyers, Hoardings, and Offline promotions.</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={campaignFilterChannel}
                                    onChange={e => setCampaignFilterChannel(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    <option value="all">All Channels</option>
                                    <option value="meta">Meta Ads (FB/Insta)</option>
                                    <option value="google">Google Ads (Search/Display)</option>
                                    <option value="youtube">YouTube Ads</option>
                                    <option value="flyers">Flyers / Print</option>
                                    <option value="offline_banners">Offline Events / Banners</option>
                                </select>

                                <button
                                    onClick={() => {
                                        setCampaignForm({
                                            name: '',
                                            channel: 'meta',
                                            destinationOrPackage: '',
                                            startDate: new Date().toISOString().split('T')[0],
                                            status: 'active',
                                            spendAmount: 0,
                                            reachImpressions: 0,
                                            clicksCount: 0,
                                            leadsGenerated: 0,
                                            bookingsWon: 0,
                                            revenueWon: 0,
                                            notes: ''
                                        });
                                        setIsCampaignModalOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                                >
                                    <Plus size={14} /> Track Campaign
                                </button>
                            </div>
                        </div>

                        {/* Campaign Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCampaigns.map(camp => {
                                const cBadge = getChannelBadge(camp.channel);
                                const cpl = camp.leadsGenerated > 0 ? Math.round(camp.spendAmount / camp.leadsGenerated) : 0;
                                const roas = camp.spendAmount > 0 ? (camp.revenueWon / camp.spendAmount).toFixed(1) : '0';

                                return (
                                    <div
                                        key={camp.id}
                                        className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cBadge.bg} ${cBadge.text} ${cBadge.border}`}>
                                                        {cBadge.icon} {camp.channel.toUpperCase()}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${camp.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {camp.status}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{camp.name}</h4>
                                                {camp.destinationOrPackage && (
                                                    <p className="text-xs text-primary font-semibold mt-0.5">Offer: {camp.destinationOrPackage}</p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleDeleteCampaign(camp.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                                title="Delete Campaign"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>

                                        {/* Financials & Outcomes 4-grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white dark:bg-[#1A2633] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Spend</span>
                                                <p className="font-bold text-slate-900 dark:text-white mt-0.5">₹{camp.spendAmount.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Leads Won</span>
                                                <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{camp.leadsGenerated} leads</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg CPL</span>
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{cpl}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Revenue / ROAS</span>
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    ₹{camp.revenueWon.toLocaleString()} <span className="text-[10px] font-normal">({roas}x)</span>
                                                </p>
                                            </div>
                                        </div>

                                        {camp.notes && (
                                            <p className="text-xs text-slate-500 italic bg-white/50 dark:bg-slate-900/30 p-2 rounded-lg">
                                                "{camp.notes}"
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: DAILY OUTREACH & GOAL LOGS (MYSQL DATABASE) */}
            {/* ======================================================== */}
            {activeTab === 'daily_logs' && (
                <div className="space-y-4">
                    {/* Search Toolbar */}
                    <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                value={logSearchQuery}
                                onChange={e => setLogSearchQuery(e.target.value)}
                                placeholder="Search daily logs and staff notes..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm font-medium focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setDailyLogForm({
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
                                    dailySummary: '',
                                    keyLearnings: ''
                                });
                                setIsLogModalOpen(true);
                            }}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all shadow-xs"
                        >
                            <Plus size={16} />
                            <span>+ Record Daily Check-in</span>
                        </button>
                    </div>

                    {/* Daily Logs Feed */}
                    {loading ? (
                        <div className="bg-white dark:bg-[#1A2633] p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                            <div className="size-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                            <p className="text-xs font-semibold text-slate-400">Loading daily logs from database...</p>
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        <div className="space-y-3.5">
                            {filteredLogs.map(l => (
                                <div
                                    key={l.id}
                                    className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                {staffNamesMap[l.staffId]?.substring(0, 2).toUpperCase() || 'ST'}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {staffNamesMap[l.staffId] || `Staff #${l.staffId}`}
                                                </h4>
                                                <p className="text-[10px] text-slate-400">{l.date}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                                                Momentum: {l.momentumScore}/100
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metrics summary */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Outreach</span>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                                {l.emailsSent} Emails • {l.socialDms} DMs • {l.callsMade} Calls
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Follow-ups</span>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{l.followUps} nurtured</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Paid Ad Spend</span>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">₹{l.metaSpend.toLocaleString()} ({l.metaLeads} leads)</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Revenue Won</span>
                                            <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{l.revenueGenerated.toLocaleString()} ({l.dealsClosed} deals)</p>
                                        </div>
                                    </div>

                                    {l.dailySummary && (
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {l.dailySummary}
                                        </p>
                                    )}

                                    {l.keyLearnings && (
                                        <div className="flex items-start gap-2 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-xl text-xs text-amber-900 dark:text-amber-300">
                                            <Lightbulb size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                            <span><strong>Learning:</strong> {l.keyLearnings}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1A2633] p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                            <p className="text-xs font-semibold text-slate-400">No daily logs found. Start logging daily outreach work!</p>
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: ASSIGN MARKETING TASK */}
            {/* ======================================================== */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-850">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="text-indigo-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {taskForm.id ? "Edit Marketing Task" : "Assign Marketing Task to Staff"}
                                </h3>
                            </div>
                            <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Task Title *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Shoot 3 Reels on Kashmir Packages, Run Google Search Ads..."
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs md:text-sm font-semibold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Assign to Staff Member *
                                </label>
                                <select
                                    value={taskForm.assignedStaffId}
                                    onChange={e => setTaskForm({ ...taskForm, assignedStaffId: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs md:text-sm font-semibold"
                                    required
                                >
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={taskForm.category}
                                        onChange={e => setTaskForm({ ...taskForm, category: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    >
                                        <option value="content">Content Creation</option>
                                        <option value="outreach">Direct Outreach</option>
                                        <option value="paid_ads">Paid Ads (Meta/Google)</option>
                                        <option value="offline">Offline / Field</option>
                                        <option value="seo_blog">SEO & Blogs</option>
                                        <option value="design">Design & Graphics</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Channel / Platform
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Instagram, Google Ads, Flyers..."
                                        value={taskForm.channel}
                                        onChange={e => setTaskForm({ ...taskForm, channel: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Priority
                                    </label>
                                    <select
                                        value={taskForm.priority}
                                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    >
                                        <option value="urgent">Urgent</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={taskForm.dueDate}
                                        onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Instructions & Guidelines
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Provide specific notes, target numbers, or deliverables..."
                                    value={taskForm.description}
                                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
                                >
                                    {taskForm.id ? "Update Task" : "Assign Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: LOG CONTENT POST */}
            {/* ======================================================== */}
            {isContentModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-purple-50/50 dark:bg-slate-850">
                            <div className="flex items-center gap-2">
                                <Video className="text-purple-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Published Content</h3>
                            </div>
                            <button onClick={() => setIsContentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveContent} className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Content Title / Hook *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 5 Hidden Gems in Kashmir Reel, Goa Monsoon Villa Tour..."
                                    value={contentForm.title}
                                    onChange={e => setContentForm({ ...contentForm, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs md:text-sm font-semibold"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Platform
                                    </label>
                                    <select
                                        value={contentForm.platform}
                                        onChange={e => setContentForm({ ...contentForm, platform: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    >
                                        <option value="instagram">Instagram</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="whatsapp">WhatsApp Broadcast</option>
                                        <option value="blog">Blog / Web Article</option>
                                        <option value="linkedin">LinkedIn</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Format
                                    </label>
                                    <select
                                        value={contentForm.contentType}
                                        onChange={e => setContentForm({ ...contentForm, contentType: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    >
                                        <option value="reel">Reel (Short Video)</option>
                                        <option value="post">Carousel / Single Post</option>
                                        <option value="story">Story</option>
                                        <option value="short">YouTube Short</option>
                                        <option value="video">Full Length Video</option>
                                        <option value="article">Blog / Travel Guide</option>
                                        <option value="broadcast">Broadcast Message</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Destination / Tour
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Kashmir, Himachal, Dubai..."
                                        value={contentForm.destinationOrTopic}
                                        onChange={e => setContentForm({ ...contentForm, destinationOrTopic: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Publish Date
                                    </label>
                                    <input
                                        type="date"
                                        value={contentForm.date}
                                        onChange={e => setContentForm({ ...contentForm, date: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Reach / Views</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={contentForm.viewsReach}
                                        onChange={e => setContentForm({ ...contentForm, viewsReach: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Engagement</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={contentForm.likesEngagement}
                                        onChange={e => setContentForm({ ...contentForm, likesEngagement: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Inquiries Won</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={contentForm.inquiriesGenerated}
                                        onChange={e => setContentForm({ ...contentForm, inquiriesGenerated: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Post / Reel URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://instagram.com/p/..."
                                    value={contentForm.linkUrl}
                                    onChange={e => setContentForm({ ...contentForm, linkUrl: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsContentModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs"
                                >
                                    Save Content Log
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: TRACK CAMPAIGN / ADS / OFFLINE OUTCOMES */}
            {/* ======================================================== */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50/50 dark:bg-slate-850">
                            <div className="flex items-center gap-2">
                                <DollarSign className="text-emerald-600" size={20} />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Track Ad Spend & Offline ROI Outcomes</h3>
                            </div>
                            <button onClick={() => setIsCampaignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCampaign} className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Campaign / Promotion Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Summer Kashmir Google Ads, Bandra Mall Flyers, YouTube Video..."
                                    value={campaignForm.name}
                                    onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs md:text-sm font-semibold"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Channel
                                    </label>
                                    <select
                                        value={campaignForm.channel}
                                        onChange={e => setCampaignForm({ ...campaignForm, channel: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    >
                                        <option value="meta">Meta Ads (FB & Instagram)</option>
                                        <option value="google">Google Search & Display</option>
                                        <option value="youtube">YouTube Video Ads</option>
                                        <option value="flyers">Flyers / Newspaper Inserts</option>
                                        <option value="offline_banners">Offline Banners / Expo Stalls</option>
                                        <option value="influencer">Influencer Collaboration</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Target Tour / Package
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Kashmir Luxury, Manali Honeymoon..."
                                        value={campaignForm.destinationOrPackage}
                                        onChange={e => setCampaignForm({ ...campaignForm, destinationOrPackage: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Total Spend Amount (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={campaignForm.spendAmount}
                                        onChange={e => setCampaignForm({ ...campaignForm, spendAmount: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Leads / Inquiries Generated
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={campaignForm.leadsGenerated}
                                        onChange={e => setCampaignForm({ ...campaignForm, leadsGenerated: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Bookings Won
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={campaignForm.bookingsWon}
                                        onChange={e => setCampaignForm({ ...campaignForm, bookingsWon: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Revenue Won (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={campaignForm.revenueWon}
                                        onChange={e => setCampaignForm({ ...campaignForm, revenueWon: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-bold text-emerald-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Notes & Results
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Which ad copy worked? Location or demographic notes..."
                                    value={campaignForm.notes}
                                    onChange={e => setCampaignForm({ ...campaignForm, notes: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsCampaignModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                                >
                                    Save Campaign ROI
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: UPDATE SOCIAL MEDIA STATS */}
            {/* ======================================================== */}
            {isSocialModalOpen && selectedSocialAccount && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-pink-50/50 dark:bg-slate-850">
                            <div className="flex items-center gap-2">
                                <Instagram className="text-pink-600" size={18} />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Update {selectedSocialAccount.platform.toUpperCase()} Followers
                                </h3>
                            </div>
                            <button onClick={() => setIsSocialModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSocialMetric} className="p-5 space-y-3.5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Current Follower / Subscriber Count</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={socialUpdateForm.followersCount}
                                    onChange={e => setSocialUpdateForm({ ...socialUpdateForm, followersCount: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm font-bold"
                                    required
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Previous count: {selectedSocialAccount.followersCount.toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Weekly Reach (Optional)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={socialUpdateForm.weeklyReach}
                                    onChange={e => setSocialUpdateForm({ ...socialUpdateForm, weeklyReach: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-xs font-semibold"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSocialModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs"
                                >
                                    Update Count
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: DAILY MARKETING CHECK-IN LOG (MYSQL) */}
            {/* ======================================================== */}
            {isLogModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-850">
                            <div className="flex items-center gap-2">
                                <Flame className="text-primary" size={20} />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Marketing Check-in</h3>
                            </div>
                            <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDailyLog} className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={dailyLogForm.date}
                                    onChange={e => setDailyLogForm({ ...dailyLogForm, date: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs md:text-sm font-semibold"
                                    required
                                />
                            </div>

                            {/* 3 Metric Inputs */}
                            <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Emails Sent</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyLogForm.emailsSent}
                                        onChange={e => setDailyLogForm({ ...dailyLogForm, emailsSent: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Social DMs</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyLogForm.socialDms}
                                        onChange={e => setDailyLogForm({ ...dailyLogForm, socialDms: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Phone Calls</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyLogForm.callsMade}
                                        onChange={e => setDailyLogForm({ ...dailyLogForm, callsMade: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Follow-ups Nurtured
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyLogForm.followUps}
                                        onChange={e => setDailyLogForm({ ...dailyLogForm, followUps: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Deals Closed Today
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyLogForm.dealsClosed}
                                        onChange={e => setDailyLogForm({ ...dailyLogForm, dealsClosed: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Summary of Marketing Actions
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="What outreach, campaigns, or creative assets did you work on today?"
                                    value={dailyLogForm.dailySummary}
                                    onChange={e => setDailyLogForm({ ...dailyLogForm, dailySummary: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-xs"
                                    required
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsLogModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-xs btn-glow"
                                >
                                    Save Check-in
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: AI STANDUP SUMMARY */}
            {/* ======================================================== */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-850 dark:to-slate-800">
                            <div className="flex items-center gap-2">
                                <Sparkles className="text-indigo-600" size={20} />
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Weekly Marketing Standup</h3>
                                    <p className="text-xs text-slate-500">Gemini executive summary of recent marketing momentum</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                            {isAiLoading ? (
                                <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                                    <div className="size-9 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Synthesizing weekly marketing logs...</p>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-xs md:text-sm leading-relaxed font-sans">
                                    {aiSummary}
                                </div>
                            )}
                        </div>

                        {!isAiLoading && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50 dark:bg-slate-800/40">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(aiSummary);
                                        toast.success("Summary copied to clipboard!");
                                    }}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                                >
                                    <Copy size={13} /> Copy Summary
                                </button>
                                <button
                                    onClick={() => setIsAiModalOpen(false)}
                                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
