import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    fallbackSrc?: string;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
    showSkeleton?: boolean;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80&auto=format&fit=crop';

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    fallbackSrc = FALLBACK_IMAGE,
    aspectRatio = 'auto',
    showSkeleton = true,
    className = '',
    ...props
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const aspectRatioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        auto: '',
    };

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden ${aspectRatioClasses[aspectRatio]} ${className}`}
        >
            {/* Skeleton Loader */}
            {showSkeleton && isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
            )}

            {/* Actual Image */}
            {isInView && (
                <img
                    src={hasError || !src ? fallbackSrc : src}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'
                        }`}
                    loading="lazy"
                    decoding="async"
                    {...props}
                />
            )}
        </div>
    );
};

export default OptimizedImage;
