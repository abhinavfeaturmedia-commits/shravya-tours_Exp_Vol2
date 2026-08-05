import React, { useState } from 'react';
import { VehicleCategoryType } from '../../constants/vehicleCatalog';

interface VehicleCardImageProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  category: VehicleCategoryType;
  modelName: string;
  brand?: string;
  className?: string;
  badge?: string;
}

export const VehicleCardImage: React.FC<VehicleCardImageProps> = ({
  src,
  fallbackSrc,
  alt,
  category,
  modelName,
  brand,
  className = 'w-full h-full object-cover',
  badge,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);
  const [hasTriedFallback, setHasTriedFallback] = useState<boolean>(false);

  const handleError = () => {
    if (!hasTriedFallback && fallbackSrc && fallbackSrc !== imgSrc) {
      setHasTriedFallback(true);
      setImgSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  // Color schemes for vector fallback based on vehicle category
  const categoryGradients: Record<VehicleCategoryType, string> = {
    Hatchback: 'from-emerald-900 via-teal-900 to-slate-900 text-teal-300',
    Sedan: 'from-blue-950 via-slate-900 to-indigo-950 text-sky-300',
    SUV: 'from-amber-950 via-orange-950 to-slate-900 text-amber-300',
    MPV: 'from-purple-950 via-indigo-950 to-slate-900 text-purple-300',
    Van: 'from-rose-950 via-red-950 to-slate-900 text-rose-300',
    Bus: 'from-cyan-950 via-blue-950 to-slate-900 text-cyan-300',
  };

  const categoryIcons: Record<VehicleCategoryType, string> = {
    Hatchback: 'directions_car',
    Sedan: 'minor_crash',
    SUV: 'car_tag',
    MPV: 'airport_shuttle',
    Van: 'departure_board',
    Bus: 'directions_bus',
  };

  if (hasError) {
    return (
      <div className={`relative w-full h-full bg-gradient-to-br ${categoryGradients[category]} p-3 flex flex-col justify-between overflow-hidden group`}>
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />

        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900/80 text-white border border-white/10">
            {brand || category}
          </span>
          {badge && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
              {badge}
            </span>
          )}
        </div>

        {/* Center Vehicle Vector Showcase */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-2">
          <span className="material-symbols-outlined text-4xl mb-1 transition-transform group-hover:scale-110 duration-300">
            {categoryIcons[category]}
          </span>
          <h5 className="text-xs font-black text-white tracking-tight leading-tight">
            {modelName}
          </h5>
          <span className="text-[9px] font-bold opacity-75 uppercase tracking-wider mt-0.5">
            {category} Tier
          </span>
        </div>

        {/* Bottom Bar */}
        <div className="relative z-10 flex items-center justify-between text-[8px] font-extrabold opacity-60 uppercase">
          <span>Verified Vehicle</span>
          <span>Shravyawello Fleet</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      loading="lazy"
    />
  );
};
