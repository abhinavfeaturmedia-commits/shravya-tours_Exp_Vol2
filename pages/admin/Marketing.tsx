
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Campaign } from '../../types';
import { generateMarketingContent } from '../../src/lib/gemini';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import BrandSelect from '../../components/ui/BrandSelect';

export const Marketing: React.FC = () => {
    const { campaigns, addCampaign } = useData();
    const [activeTab, setActiveTab] = useState<'Campaigns' | 'Templates' | 'Subscribers'>('Campaigns');

    // New Campaign Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({ name: '', type: 'Email', audience: 'Leads' });

    // AI State
    const [aiMode, setAiMode] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiTone, setAiTone] = useState('Professional & Engaging');
    const [generating, setGenerating] = useState(false);
    const [aiPreview, setAiPreview] = useState<{ subject?: string; content?: string; hashtags?: string } | null>(null);

    const handleGenerate = async () => {
        if (!aiTopic) return toast.error("Please enter a topic");
        setGenerating(true);
        const toastId = toast.loading("Writing your campaign...");
        try {
            const res = await generateMarketingContent(aiTopic, newCampaign.type as any, aiTone);

            // Auto-fill the campaign details
            setNewCampaign(prev => ({
                ...prev,
                name: res.subject || `${aiTopic} Campaign`,
            }));
            setAiPreview(res);

            toast.dismiss(toastId);
            toast.success("Content Generated! Preview added below.");

        } catch (e) {
            console.error(e);
            toast.dismiss(toastId);
            toast.error("Generation failed");
        } finally {
            setGenerating(false);
        }
    };

    const handleCreate = () => {
        if (!newCampaign.name) return;
        addCampaign({
            id: `CMP-${Date.now()}`,
            name: newCampaign.name!,
            type: newCampaign.type as any,
            audience: newCampaign.audience as any,
            status: 'Scheduled',
            metrics: { sent: 0, opened: 0, clicked: 0 }
        });
        setIsModalOpen(false);
        setNewCampaign({ name: '', type: 'Email', audience: 'Leads' });
        setAiMode(false);
        setAiTopic('');
    };

    return (
        <div className="flex flex-col h-full admin-page-bg">
            {/* ... Existing header code ... */}
            <div className="p-6 md:p-8 bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display text-4xl">Marketing Hub</h1>
                        <p className="text-slate-500 mt-1">Manage Email & WhatsApp campaigns to boost engagement.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all btn-glow">
                        <span className="material-symbols-outlined">add</span> Create Campaign
                    </button>
                </div>
                {/* Tabs */}
                <div className="flex items-center gap-1 mt-6 border-b border-slate-100 dark:border-slate-800">
                    {['Campaigns', 'Templates', 'Subscribers'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {activeTab === 'Campaigns' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {campaigns.map(camp => (
                            <div key={camp.id} className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${camp.type === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{camp.type}</span>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">{camp.name}</h3>
                                        <p className="text-xs text-slate-500">Target: {camp.audience}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${camp.status === 'Sent' ? 'bg-slate-100 text-slate-600' : 'bg-yellow-100 text-yellow-700'}`}>{camp.status}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-center">
                                        <p className="text-xl kpi-number text-slate-900 dark:text-white">{camp.metrics.sent}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Sent</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl kpi-number text-slate-900 dark:text-white">{camp.metrics.opened}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Opened</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl kpi-number text-slate-900 dark:text-white">{camp.metrics.clicked}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Clicked</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'Templates' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white">Holiday Promo Template {i}</h4>
                                    <p className="text-xs text-slate-500 mt-1">Last edited 2 days ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Campaign</h3>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase ${aiMode ? 'text-purple-600' : 'text-slate-400'}`}>AI Assist</span>
                                <button
                                    onClick={() => setAiMode(!aiMode)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${aiMode ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${aiMode ? 'left-5.5' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Type</label>
                                    <BrandSelect className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm font-bold" value={newCampaign.type} onChange={e => setNewCampaign({ ...newCampaign, type: e.target.value as any })}>
                                        <option>Email</option>
                                        <option>WhatsApp</option>
                                    </BrandSelect>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Audience</label>
                                    <BrandSelect className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm font-bold" value={newCampaign.audience} onChange={e => setNewCampaign({ ...newCampaign, audience: e.target.value as any })}>
                                        <option>Leads</option>
                                        <option>Customers</option>
                                        <option>Agents</option>
                                    </BrandSelect>
                                </div>
                            </div>

                            {aiMode ? (
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/50 space-y-3 relative overflow-hidden">
                                    <Sparkles className="absolute -top-4 -right-4 text-purple-200 dark:text-purple-900/20 w-24 h-24 rotate-12" />
                                    <div className="relative z-10">
                                        <label className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase block mb-1">Topic / Offer</label>
                                        <input
                                            placeholder="e.g. Summer Sale 20% Off"
                                            className="w-full bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800 p-2.5 rounded-xl text-sm"
                                            value={aiTopic}
                                            onChange={e => setAiTopic(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative z-10">
                                        <label className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase block mb-1">Tone</label>
                                        <BrandSelect
                                            className="w-full bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800 p-2.5 rounded-xl text-sm"
                                            value={aiTone}
                                            onChange={e => setAiTone(e.target.value)}
                                        >
                                            <option>Professional & Engaging</option>
                                            <option>Fun & Exciting</option>
                                            <option>Urgent (FOMO)</option>
                                            <option>Luxury & Elegant</option>
                                        </BrandSelect>
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 relative z-10 disabled:opacity-70 transition-all"
                                    >
                                        {generating ? <span className="animate-spin material-symbols-outlined text-sm">rotate_right</span> : <Sparkles size={16} />}
                                        {generating ? 'Writing...' : 'Auto-Generate Content'}
                                    </button>
                                    {aiPreview && (
                                        <div className="relative z-10 mt-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/60 text-xs space-y-1.5">
                                            <p className="font-bold text-purple-700 dark:text-purple-300">Subject: {aiPreview.subject}</p>
                                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{aiPreview.content}</p>
                                            {aiPreview.hashtags && <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">{aiPreview.hashtags}</p>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Campaign Name</label>
                                    <input placeholder="Campaign Name" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-medium" value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} />
                                </div>
                            )}

                            <button onClick={handleCreate} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                                {aiMode ? 'Review & Create Draft' : 'Create Draft'}
                            </button>
                            <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-500 py-2 text-sm font-bold hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
