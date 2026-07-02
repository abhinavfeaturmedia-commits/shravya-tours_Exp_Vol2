/**
 * Normalizes user-entered URLs into embeddable iframe URLs.
 * Handles:
 * - YouTube: watch?v=, youtu.be/, embed/, and /shorts/
 * - Instagram: Reels and Posts (appends /embed/ for inline view)
 * - Facebook: Formats into native plugin embed URL
 */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }
    if (trimmed.length === 11 && !trimmed.includes('/')) {
      return trimmed;
    }
  } catch (error) {
    console.error('Failed to parse YouTube ID:', error);
  }
  return null;
}

export function getEmbedUrl(platform: 'youtube' | 'instagram' | 'facebook', url: string): string {
  if (!url) return '';
  
  try {
    const trimmed = url.trim();
    switch (platform) {
      case 'youtube': {
        const id = getYouTubeId(trimmed);
        if (id) {
          return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
        }
        return '';
      }

      case 'instagram': {
        const cleanUrl = trimmed.split('?')[0].replace(/\/$/, '');
        if (cleanUrl.includes('instagram.com')) {
          return `${cleanUrl}/embed/`;
        }
        return '';
      }

      case 'facebook': {
        if (trimmed.includes('facebook.com')) {
          return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0&autoplay=true`;
        }
        return '';
      }

      default:
        return '';
    }
  } catch (error) {
    console.error('Failed to parse video url:', error);
    return '';
  }
}

export function getVideoThumbnail(platform: 'youtube' | 'instagram' | 'facebook', url: string, fallbackImage?: string): string {
  if (platform === 'youtube') {
    const id = getYouTubeId(url);
    if (id) {
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  }
  
  // For Instagram/Facebook, use the package cover image or a high-quality travel image placeholder
  return fallbackImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
}
