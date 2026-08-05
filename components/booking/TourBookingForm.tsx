import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { TOUR_CATEGORIES as FALLBACK_CATEGORIES, TOUR_PACKAGES as FALLBACK_PACKAGES, TourCategoryType, TourPackage, getTourCatalogFromPackages } from '../../constants/tourCatalog';
import { TourSelectorModal } from './TourSelectorModal';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

// Validation schema
const tourBookingSchema = z.object({
  departureCity: z.string().min(2, 'Departure city is required'),
  destination: z.string().min(2, 'Destination or tour name is required'),
  startDate: z.string().min(1, 'Travel date is required'),
  tourCategory: z.string().min(1, 'Please select a tour theme'),
  selectedPackageName: z.string().min(1, 'Please select a tour package'),
  adults: z.number().min(1, 'At least 1 adult required'),
  children: z.number().min(0),
  rooms: z.number().min(1, 'At least 1 room required'),
  hotelClass: z.enum(['3-Star', '4-Star', '5-Star']),
});

type TourFormData = z.infer<typeof tourBookingSchema>;

export interface TourBookingData {
  destination: string;
  tripType: 'Domestic' | 'International' | 'Weekend Trips' | 'Custom Tour';
  tourCategory: TourCategoryType;
  selectedPackageId: string;
  selectedPackageName: string;
  departureCity: string;
  startDate: string;
  duration: string;
  travelers: {
    adults: number;
    children: number;
    rooms: number;
  };
  hotelClass: '3-Star' | '4-Star' | '5-Star';
}

interface TourBookingFormProps {
  onSubmit: (data: TourBookingData) => void;
}

export const TourBookingForm: React.FC<TourBookingFormProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const { packages: realPackages } = useData();
  const today = new Date().toISOString().split('T')[0];

  // Dynamically compute categories and packages from real database packages
  const { categories: TOUR_CATEGORIES, packages: TOUR_PACKAGES } = useMemo(() => {
    return getTourCatalogFromPackages(realPackages);
  }, [realPackages]);

  const [tripType, setTripType] = useState<'Domestic' | 'International' | 'Weekend Trips' | 'Custom Tour'>('Domestic');
  const [selectedCategory, setSelectedCategory] = useState<TourCategoryType>('Heritage');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Available packages for selected category
  const availablePackages = useMemo(() => {
    const matched = TOUR_PACKAGES.filter(p => p.categoryId === selectedCategory);
    return matched.length > 0 ? matched : TOUR_PACKAGES;
  }, [selectedCategory, TOUR_PACKAGES]);

  // Sync selected package ID when packages or category change
  useEffect(() => {
    if (availablePackages.length > 0 && (!selectedPackageId || !availablePackages.some(p => p.id === selectedPackageId))) {
      const topPkg = availablePackages[0];
      setSelectedPackageId(topPkg.id);
    }
  }, [availablePackages, selectedPackageId]);

  // Active Selected Package Object
  const activePackageObj = useMemo(() => {
    return TOUR_PACKAGES.find(p => p.id === selectedPackageId) || availablePackages[0] || TOUR_PACKAGES[0];
  }, [selectedPackageId, availablePackages, TOUR_PACKAGES]);

  // Category Object
  const activeCatObj = useMemo(() => {
    return TOUR_CATEGORIES.find(c => c.id === selectedCategory) || TOUR_CATEGORIES[0];
  }, [selectedCategory, TOUR_CATEGORIES]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TourFormData>({
    resolver: zodResolver(tourBookingSchema),
    defaultValues: {
      departureCity: '',
      destination: activePackageObj?.destination || 'India',
      startDate: '',
      tourCategory: selectedCategory,
      selectedPackageName: activePackageObj?.name || '',
      adults: 2,
      children: 0,
      rooms: 1,
      hotelClass: '3-Star',
    }
  });

  // Keep form values in sync with activePackageObj
  useEffect(() => {
    if (activePackageObj) {
      setValue('selectedPackageName', activePackageObj.name);
      setValue('destination', activePackageObj.destination);
    }
  }, [activePackageObj, setValue]);

  // Category Change Handler
  const handleCategoryChange = (category: TourCategoryType) => {
    setSelectedCategory(category);
    setValue('tourCategory', category);

    // Default top package in new category
    const defaultPkg = TOUR_PACKAGES.find(p => p.categoryId === category) || TOUR_PACKAGES[0];
    setSelectedPackageId(defaultPkg.id);
    setValue('selectedPackageName', defaultPkg.name);
    setValue('destination', defaultPkg.destination);
  };

  // Modal Package Selection Handler
  const handlePackageSelectFromModal = (category: TourCategoryType, packageId: string, packageName: string) => {
    setSelectedCategory(category);
    setSelectedPackageId(packageId);

    const pkgObj = TOUR_PACKAGES.find(p => p.id === packageId);
    setValue('tourCategory', category);
    setValue('selectedPackageName', packageName);
    if (pkgObj) {
      setValue('destination', pkgObj.destination);
    }
  };

  const onFormSubmit = (data: TourFormData) => {
    onSubmit({
      destination: data.destination || activePackageObj.destination,
      tripType,
      tourCategory: selectedCategory,
      selectedPackageId,
      selectedPackageName: data.selectedPackageName || activePackageObj.name,
      departureCity: data.departureCity,
      startDate: data.startDate,
      duration: activePackageObj.duration,
      travelers: {
        adults: Number(data.adults) || 2,
        children: Number(data.children) || 0,
        rooms: Number(data.rooms) || 1,
      },
      hotelClass: data.hotelClass,
    });
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Modal Component ── */}
      <TourSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCategory={selectedCategory}
        selectedPackageId={selectedPackageId}
        onSelectPackage={handlePackageSelectFromModal}
      />

      {/* ── Top Bar: Trip Mode Filter Pills & Explore Catalog Button ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['Domestic', 'International', 'Weekend Trips', 'Custom Tour'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tripType === type
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {type === 'Domestic' && '🇮🇳 '}
              {type === 'International' && '✈️ '}
              {type === 'Weekend Trips' && '⏱️ '}
              {type === 'Custom Tour' && '🎨 '}
              {type}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/packages')}
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 transition-all hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">explore</span>
          Explore All Tour Packages
        </button>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">

        {/* ── STEP 1: Select Tour Theme / Category ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] flex items-center justify-center font-bold">1</span>
              SELECT TOUR THEME / CATEGORY
            </label>
            <span className="text-[11px] text-slate-400 font-semibold">{TOUR_CATEGORIES.length} Categories Available</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {TOUR_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between group overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/30 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  {/* Selection Pin */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500 animate-pulse" />
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`material-symbols-outlined text-2xl transition-transform group-hover:scale-110 ${
                      isSelected ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {cat.icon}
                    </span>
                  </div>

                  <div>
                    <h4 className={`text-xs font-black leading-tight line-clamp-1 ${
                      isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-white'
                    }`}>
                      {cat.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                      {cat.count} Packages
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: Choose Specific Package (Top Packages in Selected Category) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] flex items-center justify-center font-bold">2</span>
              CHOOSE SPECIFIC TOUR PACKAGE (FEATURED IN {activeCatObj.name.toUpperCase()})
            </label>
            
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              View Specs & Itinerary Modal
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            
            {/* Left Preview Card */}
            <div className="lg:col-span-7 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-3 sm:p-4 text-white flex flex-col sm:flex-row items-center gap-3 sm:gap-4 shadow-lg border border-slate-700/70 relative overflow-hidden">
              <div className="w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden relative shrink-0 bg-slate-950">
                <OptimizedImage
                  src={activePackageObj.image}
                  fallbackSrc={activePackageObj.fallbackImage}
                  alt={activePackageObj.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  {activePackageObj.duration}
                </span>
              </div>

              <div className="flex-1 w-full text-left">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                    {activeCatObj.displayName}
                  </span>
                  <span className="text-amber-400 font-extrabold text-sm">
                    ₹{activePackageObj.startingPrice.toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-normal">/person</span>
                  </span>
                </div>

                <h4 className="text-sm font-black text-white line-clamp-1">
                  {activePackageObj.name}
                </h4>

                <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5 line-clamp-1">
                  <span className="material-symbols-outlined text-xs text-amber-400">location_on</span>
                  {activePackageObj.destination}
                </p>

                {/* Inclusions summary */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {activePackageObj.inclusions.slice(0, 3).map((inc, i) => (
                    <span key={i} className="text-[9px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700">
                      ✓ {inc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Dropdown & Full Specs Modal Button */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-center space-y-2">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Select Package Variant:
              </label>
              
              <div className="relative">
                <select
                  value={selectedPackageId}
                  onChange={(e) => {
                    const pkgId = e.target.value;
                    setSelectedPackageId(pkgId);
                    const pkg = TOUR_PACKAGES.find(p => p.id === pkgId);
                    if (pkg) {
                      setValue('selectedPackageName', pkg.name);
                      setValue('destination', pkg.destination);
                    }
                  }}
                  className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 appearance-none"
                >
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.duration} - ₹{pkg.startingPrice.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-base">
                  expand_more
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm text-amber-500">menu_book</span>
                View Full Itinerary & Inclusions Modal
              </button>
            </div>

          </div>
        </div>

        {/* ── STEP 3: Search Inputs (Departure, Destination, Date, Travelers, Hotel Rating) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-end">
          
          {/* Departure City */}
          <div className="md:col-span-3">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block pl-1">
              DEPARTURE CITY (FROM)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">flight_takeoff</span>
              <input
                {...register('departureCity')}
                type="text"
                placeholder="e.g. Mumbai, Delhi, Ahmedabad"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/50 transition-all ${
                  errors.departureCity ? 'border-red-400' : 'border-transparent'
                }`}
              />
            </div>
            {errors.departureCity && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.departureCity.message}</p>}
          </div>

          {/* Destination */}
          <div className="md:col-span-3">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block pl-1">
              DESTINATION (TO)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">location_on</span>
              <input
                {...register('destination')}
                type="text"
                placeholder="Search destination..."
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/50 transition-all ${
                  errors.destination ? 'border-red-400' : 'border-transparent'
                }`}
              />
            </div>
            {errors.destination && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.destination.message}</p>}
          </div>

          {/* Travel Date */}
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block pl-1">
              TRAVEL DATE
            </label>
            <div className="relative">
              <input
                {...register('startDate')}
                type="date"
                min={today}
                className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 transition-all ${
                  errors.startDate ? 'border-red-400' : 'border-transparent'
                }`}
              />
            </div>
            {errors.startDate && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.startDate.message}</p>}
          </div>

          {/* Travellers & Rooms */}
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block pl-1">
              TRAVELLERS & ROOMS
            </label>
            <div className="relative">
              <select
                {...register('adults', { valueAsNumber: true })}
                className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50"
              >
                <option value={1}>1 Adult, 1 Room</option>
                <option value={2}>2 Adults, 1 Room</option>
                <option value={4}>4 Adults, 2 Rooms</option>
                <option value={6}>6 Adults, 3 Rooms</option>
                <option value={8}>8+ Group Tour</option>
              </select>
            </div>
          </div>

          {/* Hotel Star Rating */}
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block pl-1">
              HOTEL CATEGORY
            </label>
            <select
              {...register('hotelClass')}
              className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="3-Star">3★ Standard</option>
              <option value="4-Star">4★ Deluxe</option>
              <option value="5-Star">5★ Luxury</option>
            </select>
          </div>

        </div>

        {/* ── Dynamic CTA Submit Button ── */}
        <div className="pt-1">
          <button
            type="submit"
            className="w-full h-13 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">send</span>
            Get Custom Quote for {activePackageObj.name}
          </button>
        </div>

      </form>
    </div>
  );
};

export default TourBookingForm;
