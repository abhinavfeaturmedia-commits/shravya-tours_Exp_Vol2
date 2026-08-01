import React, { useEffect } from 'react';

export interface TrainingVideo {
  id: number;
  title: string;
  description: string;
  youtube_url: string;
  youtube_id: string;
  category: string;
  target_audience: 'staff' | 'partner' | 'all';
  thumbnail_url: string;
  duration?: string;
  pdf_attachment_url?: string;
  display_order?: number;
  is_featured?: boolean;
  is_published?: boolean;
  isCompleted?: boolean;
  created_at?: string;
}

interface VideoPlayerModalProps {
  video: TrainingVideo | null;
  onClose: () => void;
  onMarkCompleted?: (videoId: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
  onMarkCompleted,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!video) return null;

  const embedUrl = `https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <span className="material-symbols-outlined text-rose-500 text-2xl shrink-0">
              play_circle
            </span>
            <div className="min-w-0">
              <span className="inline-block px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                {video.category || 'Training'}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug mt-0.5 truncate">
                {video.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] size-11 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black shrink-0">
          <iframe
            src={embedUrl}
            title={video.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Content Footer / Meta */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-400">
              {video.duration && (
                <span className="flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                  {video.duration}
                </span>
              )}
              <span className="flex items-center gap-1 capitalize px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
                <span className="material-symbols-outlined text-base text-indigo-400">groups</span>
                Audience: {video.target_audience === 'all' ? 'Staff & Associates' : video.target_audience}
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
              {video.pdf_attachment_url && (
                <a
                  href={video.pdf_attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 active:bg-indigo-500/30 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  <span>SOP Guide</span>
                </a>
              )}

              {onMarkCompleted && (
                <button
                  onClick={() => onMarkCompleted(video.id)}
                  disabled={video.isCompleted}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    video.isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {video.isCompleted ? 'check_circle' : 'task_alt'}
                  </span>
                  <span>{video.isCompleted ? 'Watched & Completed' : 'Mark as Watched'}</span>
                </button>
              )}
            </div>
          </div>

          {video.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Module Summary & Instructions
              </h4>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                {video.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
