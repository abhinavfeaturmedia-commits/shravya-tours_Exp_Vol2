import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { VideoPlayerModal, TrainingVideo } from '../../components/training/VideoPlayerModal';
import { extractYouTubeId } from '../../utils/youtube';
import { toast } from 'sonner';

const CATEGORIES = [
  'All',
  'Onboarding',
  'CRM & Leads',
  'Bookings & Operations',
  'Partner Payouts & Earnings',
  'Itinerary Builder',
  'Invoices & Payments',
  'General'
];

export const TrainingManager: React.FC = () => {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAudience, setSelectedAudience] = useState<'all_roles' | 'staff' | 'partner' | 'all'>('all_roles');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [activeVideoForPreview, setActiveVideoForPreview] = useState<TrainingVideo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<TrainingVideo> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/training-videos?role=admin');
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Failed to load training videos');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleOpenAddModal = () => {
    setEditingVideo({
      title: '',
      description: '',
      youtube_url: '',
      category: 'Onboarding',
      target_audience: 'all',
      duration: '03:00',
      pdf_attachment_url: '',
      display_order: 0,
      is_featured: false,
      is_published: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (video: TrainingVideo) => {
    setEditingVideo(video);
    setIsEditModalOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo?.title || !editingVideo?.youtube_url) {
      toast.error('Title and YouTube URL are required');
      return;
    }

    setIsSaving(true);
    try {
      const isUpdating = Boolean(editingVideo.id);
      const url = isUpdating 
        ? `/api/training-videos/${editingVideo.id}` 
        : '/api/training-videos';
      
      const method = isUpdating ? 'PUT' : 'POST';

      const payload = {
        title: editingVideo.title,
        description: editingVideo.description,
        youtubeUrl: editingVideo.youtube_url,
        category: editingVideo.category,
        targetAudience: editingVideo.target_audience,
        duration: editingVideo.duration,
        pdfAttachmentUrl: editingVideo.pdf_attachment_url,
        displayOrder: editingVideo.display_order,
        isFeatured: editingVideo.is_featured,
        isPublished: editingVideo.is_published,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save video');
      }

      toast.success(isUpdating ? 'Video updated successfully' : 'Video published successfully');
      setIsEditModalOpen(false);
      setEditingVideo(null);
      fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error saving video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this training video?')) return;

    try {
      const res = await fetch(`/api/training-videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete video');
      toast.success('Video deleted');
      fetchVideos();
    } catch (err: any) {
      toast.error('Error deleting video');
    }
  };

  // Live preview YouTube ID extraction
  const livePreviewYoutubeId = useMemo(() => {
    if (!editingVideo?.youtube_url) return '';
    return extractYouTubeId(editingVideo.youtube_url);
  }, [editingVideo?.youtube_url]);

  // Filter logic
  const filteredVideos = videos.filter((vid) => {
    const matchesCategory = selectedCategory === 'All' || vid.category === selectedCategory;
    const matchesAudience = selectedAudience === 'all_roles' || vid.target_audience === selectedAudience;
    const matchesSearch = searchQuery === '' || 
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      vid.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesAudience && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">video_library</span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Video Training Manager</h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            Publish training tutorials and set strict role-based visibility for Staff & Travel Associates.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all text-xs sm:text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Training Video
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-lg">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <span className="material-symbols-outlined absolute left-3 top-3 text-slate-500 text-lg">search</span>
          <input
            type="text"
            placeholder="Search tutorials by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Target Audience Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setSelectedAudience('all_roles')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedAudience === 'all_roles' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Audiences
            </button>
            <button
              onClick={() => setSelectedAudience('staff')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedAudience === 'staff' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Staff Only
            </button>
            <button
              onClick={() => setSelectedAudience('partner')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedAudience === 'partner' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Associates Only
            </button>
          </div>

          {/* Category Filter Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="aspect-video bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <span className="material-symbols-outlined text-4xl text-slate-600">ondemand_video</span>
          <p className="text-slate-400 font-medium text-sm">No training videos found matching filters.</p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add First Training Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Thumbnail Container */}
              <div 
                className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" 
                onClick={() => setActiveVideoForPreview(video)}
              >
                <img
                  src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtube_id}/0.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                  <div className="size-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl fill-1">play_arrow</span>
                  </div>
                </div>

                {/* Duration Badge */}
                {video.duration && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white tracking-wider">
                    {video.duration}
                  </span>
                )}

                {/* Featured Badge */}
                {video.is_featured ? (
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-extrabold text-slate-950 uppercase tracking-wider shadow">
                    ★ Featured
                  </span>
                ) : null}
              </div>

              {/* Body Details */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                      {video.category}
                    </span>

                    {/* Audience Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        video.target_audience === 'staff'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : video.target_audience === 'partner'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {video.target_audience === 'staff'
                        ? '🧑‍💼 Staff Only'
                        : video.target_audience === 'partner'
                        ? '🤝 Travel Associate'
                        : '🌐 All Roles'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {video.title}
                  </h3>

                  {video.description && (
                    <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>

                {/* Action Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        video.is_published ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-slate-400 text-[11px] font-medium">
                      {video.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(video)}
                      className="min-h-[36px] min-w-[36px] p-2 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-400 transition-colors flex items-center justify-center"
                      title="Edit Video"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="min-h-[36px] min-w-[36px] p-2 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 transition-colors flex items-center justify-center"
                      title="Delete Video"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {activeVideoForPreview && (
        <VideoPlayerModal
          video={activeVideoForPreview}
          onClose={() => setActiveVideoForPreview(null)}
        />
      )}

      {/* Add / Edit Form Modal */}
      {isEditModalOpen && editingVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-xl p-5 sm:p-6 space-y-4 shadow-2xl my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingVideo.id ? 'Edit Training Video' : 'Add New Training Video'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="size-10 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to Submit & Track Leads in Partner Portal"
                  value={editingVideo.title || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  YouTube Video Link or ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
                  value={editingVideo.youtube_url || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, youtube_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />

                {/* Live Thumbnail Preview */}
                {livePreviewYoutubeId ? (
                  <div className="mt-2.5 p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center gap-3">
                    <img
                      src={`https://img.youtube.com/vi/${livePreviewYoutubeId}/hqdefault.jpg`}
                      alt="Thumbnail Preview"
                      className="w-24 aspect-video object-cover rounded-lg border border-slate-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${livePreviewYoutubeId}/0.jpg`;
                      }}
                    />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span> YouTube Link Verified
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Video ID: {livePreviewYoutubeId}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Audience *
                  </label>
                  <select
                    value={editingVideo.target_audience || 'all'}
                    onChange={(e) =>
                      setEditingVideo({
                        ...editingVideo,
                        target_audience: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="staff">🧑‍💼 Staff Only</option>
                    <option value="partner">🤝 Travel Associate (Partner) Only</option>
                    <option value="all">🌐 All Roles (Staff & Associates)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category / Module
                  </label>
                  <select
                    value={editingVideo.category || 'Onboarding'}
                    onChange={(e) => setEditingVideo({ ...editingVideo, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration (e.g. 04:30)
                  </label>
                  <input
                    type="text"
                    placeholder="04:30"
                    value={editingVideo.duration || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, duration: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Companion SOP PDF Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/sop-guide.pdf"
                    value={editingVideo.pdf_attachment_url || ''}
                    onChange={(e) =>
                      setEditingVideo({ ...editingVideo, pdf_attachment_url: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description & Key Learnings
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide a quick overview of what is covered in this training video..."
                  value={editingVideo.description || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingVideo.is_featured || false}
                    onChange={(e) =>
                      setEditingVideo({ ...editingVideo, is_featured: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 size-4"
                  />
                  Featured Video (Pin to Top)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingVideo.is_published ?? true}
                    onChange={(e) =>
                      setEditingVideo({ ...editingVideo, is_published: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-0 size-4"
                  />
                  Published
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {isSaving && <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editingVideo.id ? 'Save Changes' : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
