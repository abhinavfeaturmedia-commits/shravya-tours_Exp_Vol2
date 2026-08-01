import React, { useState, useEffect, useCallback } from 'react';
import { VideoPlayerModal, TrainingVideo } from '../../components/training/VideoPlayerModal';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import { toast } from 'sonner';

const CATEGORIES = [
  'All',
  'Onboarding',
  'Submitting Leads',
  'Partner Payouts & Earnings',
  'KYC & Agreement',
  'General'
];

export const PartnerTraining: React.FC = () => {
  const { partner } = usePartnerAuth();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<TrainingVideo | null>(null);

  const fetchPartnerVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const partnerId = partner?.id || 'partner_user';
      const res = await fetch(`/api/training-videos?role=partner&user_id=${partnerId}&user_type=partner`);
      if (!res.ok) throw new Error('Failed to load partner training');
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Could not load partner training videos');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [partner]);

  useEffect(() => {
    fetchPartnerVideos();
  }, [fetchPartnerVideos]);

  const handleMarkCompleted = async (videoId: number) => {
    const partnerId = partner?.id || 'partner_user';
    try {
      const res = await fetch(`/api/training-videos/${videoId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: partnerId, user_type: 'partner' }),
      });
      if (!res.ok) throw new Error('Failed to record progress');

      toast.success('Marked as completed!');
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isCompleted: true } : v));
      if (activeVideo?.id === videoId) {
        setActiveVideo(prev => prev ? { ...prev, isCompleted: true } : null);
      }
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const filteredVideos = videos.filter((vid) => {
    const matchesCategory = selectedCategory === 'All' || vid.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      vid.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const completedCount = videos.filter(v => v.isCompleted).length;
  const progressPercentage = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 p-6 sm:p-8 rounded-3xl border border-violet-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-base">smart_display</span>
              Travel Associate Academy
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Shrawello Partner Video Tutorials
            </h1>
            <p className="text-violet-200/80 text-xs sm:text-sm leading-relaxed">
              Watch step-by-step video guides on submitting high-converting leads, tracking your commission earnings, and maximizing your payouts.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-violet-500/30 p-4 sm:p-5 rounded-2xl min-w-[240px] space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-violet-200">
              <span>Partner Learning Progress</span>
              <span className="text-purple-400 font-bold text-sm">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-violet-900">
              <div
                className="bg-gradient-to-r from-violet-500 to-purple-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-violet-300/70 text-center font-medium">
              {completedCount} of {videos.length} videos completed
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0 scrollbar-none snap-x">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all snap-start ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg">search</span>
          <input
            type="text"
            placeholder="Search partner guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="aspect-video bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <span className="material-symbols-outlined text-4xl text-slate-600">ondemand_video</span>
          <p className="text-slate-400 font-medium text-sm">No partner training videos available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-purple-500/10 cursor-pointer active:scale-[0.99] transition-all duration-300 flex flex-col justify-between"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                  <div className="size-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl fill-1">play_arrow</span>
                  </div>
                </div>

                {video.duration && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white tracking-wider">
                    {video.duration}
                  </span>
                )}

                {video.isCompleted && (
                  <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 flex items-center gap-1 shadow">
                    <span className="material-symbols-outlined text-xs">check</span> Completed
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-purple-400 border border-slate-700">
                    {video.category}
                  </span>
                  <h3 className="font-bold text-white text-sm sm:text-base leading-snug mt-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-purple-400 font-semibold">
                  <span className="flex items-center gap-1 group-hover:underline">
                    Watch Video <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                  {video.pdf_attachment_url && (
                    <span className="flex items-center gap-1 text-slate-400 text-[11px]" title="PDF SOP Available">
                      <span className="material-symbols-outlined text-sm">picture_as_pdf</span> SOP
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onMarkCompleted={handleMarkCompleted}
        />
      )}
    </div>
  );
};
