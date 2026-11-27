import React, { useEffect, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TOUR_PACKAGES as FALLBACK_PACKAGES,
  TourCategoryType,
  getTourCatalogFromPackages,
} from '../../constants/tourCatalog';
import { TourSelectorModal } from './TourSelectorModal';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useData } from '../../context/DataContext';
import { BrandSelect } from '../ui/BrandSelect';
import { BrandDatePicker } from '../ui/BrandDatePicker';

type TripMode = 'Domestic' | 'International' | 'Weekend Trips' | 'Custom Tour';

const TRIP_MODES: { value: TripMode; label: string }[] = [
  { value: 'Domestic', label: 'Domestic' },
  { value: 'International', label: 'International' },
  { value: 'Weekend Trips', label: 'Weekend' },
  { value: 'Custom Tour', label: 'Custom Tour' },
];

const SHORT_CATEGORY_LABELS: Record<TourCategoryType, string> = {
  Heritage: 'Heritage',
  Hills: 'Hills',
  Beach: 'Beach',
  Spiritual: 'Pilgrimage',
  Wildlife: 'Wildlife',
  Honeymoon: 'Honeymoon',
};

const tourBookingSchema = z.object({
  departureCity: z.string().min(2, 'Enter departure city'),
  destination: z.string().min(2, 'Enter destination'),
  startDate: z.string().min(1, 'Select travel date'),
  tourCategory: z.string().min(1),
  selectedPackageName: z.string().min(1),
  adults: z.number().min(1, 'At least 1 adult required'),
  children: z.number().min(0),
  rooms: z.number().min(1),
  hotelClass: z.enum(['3-Star', '4-Star', '5-Star']),
});

type TourFormData = z.infer<typeof tourBookingSchema>;

export interface TourBookingData {
  destination: string;
  tripType: TripMode;
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
  const autoId = useId();
  const packageSelectId = `${autoId}-tour-package`;
  const fromId = `${autoId}-tour-from`;
  const fromErrId = `${autoId}-tour-from-err`;
  const toId = `${autoId}-tour-to`;
  const toErrId = `${autoId}-tour-to-err`;
  const dateId = `${autoId}-tour-date`;
  const dateErrId = `${autoId}-tour-date-err`;
  const travellersId = `${autoId}-tour-travellers`;
  const hotelId = `${autoId}-tour-hotel`;

  const { packages: realPackages, masterLocations } = useData();
  const today = new Date().toISOString().split('T')[0];

  const { categories: TOUR_CATEGORIES, packages: TOUR_PACKAGES } = useMemo(
    () => getTourCatalogFromPackages(realPackages, masterLocations),
    [realPackages, masterLocations]
  );

  const [tripType, setTripType] = useState<TripMode>('Domestic');
  const [selectedCategory, setSelectedCategory] = useState<TourCategoryType | 'All'>('All');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isCustomMode = tripType === 'Custom Tour';

  // Filter packages genuinely by active trip mode
  const modePackages = useMemo(() => {
    if (tripType === 'Custom Tour') return [];

    if (tripType === 'International') {
      const intl = TOUR_PACKAGES.filter((p) => p.isInternational);
      if (intl.length > 0) return intl;
      return FALLBACK_PACKAGES.filter((p) => p.isInternational);
    }

    if (tripType === 'Weekend Trips') {
      const weekend = TOUR_PACKAGES.filter((p) => p.daysCount <= 4);
      if (weekend.length > 0) return weekend;
      return [...TOUR_PACKAGES].sort((a, b) => a.daysCount - b.daysCount).slice(0, 6);
    }

    // Domestic
    const domestic = TOUR_PACKAGES.filter((p) => !p.isInternational);
    return domestic.length > 0 ? domestic : TOUR_PACKAGES;
  }, [tripType, TOUR_PACKAGES]);

  // Categories that actually have packages in the active mode
  const visibleCategories = useMemo(() => {
    const presentIds = new Set(modePackages.map((p) => p.categoryId));
    return TOUR_CATEGORIES.filter((c) => presentIds.has(c.id));
  }, [TOUR_CATEGORIES, modePackages]);

  const availablePackages = useMemo(() => {
    if (selectedCategory === 'All') return modePackages;
    const matched = modePackages.filter((p) => p.categoryId === selectedCategory);
    return matched.length > 0 ? matched : modePackages;
  }, [modePackages, selectedCategory]);

  // Keep selected category valid for current mode
  useEffect(() => {
    if (selectedCategory !== 'All' && !visibleCategories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [visibleCategories, selectedCategory]);

  // Sync selected package ID when filtered packages change
  useEffect(() => {
    if (isCustomMode) return;
    if (availablePackages.length > 0 && !availablePackages.some((p) => p.id === selectedPackageId)) {
      setSelectedPackageId(availablePackages[0].id);
    }
  }, [availablePackages, selectedPackageId, isCustomMode]);

  const activePackageObj = useMemo(() => {
    if (isCustomMode) return undefined;
    return availablePackages.find((p) => p.id === selectedPackageId) || availablePackages[0];
  }, [availablePackages, selectedPackageId, isCustomMode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<TourFormData>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(tourBookingSchema),
    defaultValues: {
      departureCity: '',
      destination: activePackageObj?.destination || '',
      startDate: '',
      tourCategory: 'Heritage',
      selectedPackageName: activePackageObj?.name || 'Custom Tour',
      adults: 2,
      children: 0,
      rooms: 1,
      hotelClass: '3-Star',
    },
  });

  // Sync destination & package name when package or mode changes
  useEffect(() => {
    if (isCustomMode) {
      setValue('selectedPackageName', 'Custom Tour Package');
      setValue('tourCategory', 'Heritage');
      const currentDest = getValues('destination');
      if (TOUR_PACKAGES.some((p) => p.destination === currentDest)) {
        setValue('destination', '');
      }
      return;
    }

    if (activePackageObj) {
      setValue('selectedPackageName', activePackageObj.name);
      setValue('destination', activePackageObj.destination, { shouldValidate: false });
      setValue('tourCategory', activePackageObj.categoryId);
    }
  }, [activePackageObj, isCustomMode, setValue, getValues, TOUR_PACKAGES]);

  const handleModeChange = (mode: TripMode) => {
    setTripType(mode);
    setSelectedCategory('All');
  };

  const handlePackageSelectFromModal = (
    category: TourCategoryType,
    packageId: string,
    packageName: string
  ) => {
    const pkgObj = TOUR_PACKAGES.find((p) => p.id === packageId) || FALLBACK_PACKAGES.find((p) => p.id === packageId);
    if (pkgObj?.isInternational) {
      setTripType('International');
    } else if (tripType === 'Custom Tour') {
      setTripType('Domestic');
    }
    setSelectedCategory(category);
    setSelectedPackageId(packageId);
    setValue('tourCategory', category);
    setValue('selectedPackageName', packageName);
    if (pkgObj) {
      setValue('destination', pkgObj.destination);
    }
  };

  const onFormSubmit = (data: TourFormData) => {
    const cleanAdults = Number(data.adults) || 2;
    const derivedRooms = Math.max(1, Math.ceil(cleanAdults / 2));

    onSubmit({
      destination: data.destination,
      tripType,
      tourCategory: (activePackageObj?.categoryId ||
        (selectedCategory !== 'All' ? selectedCategory : 'Heritage')) as TourCategoryType,
      selectedPackageId: isCustomMode ? 'custom' : activePackageObj?.id || selectedPackageId,
      selectedPackageName: isCustomMode
        ? `Custom ${data.destination} Tour`
        : activePackageObj?.name || data.selectedPackageName,
      departureCity: data.departureCity,
      startDate: data.startDate,
      duration: isCustomMode ? 'Flexible' : activePackageObj?.duration || '5 Days / 4 Nights',
      travelers: {
        adults: cleanAdults,
        children: Number(data.children) || 0,
        rooms: derivedRooms,
      },
      hotelClass: data.hotelClass,
    });
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <TourSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCategory={selectedCategory === 'All' ? 'Heritage' : selectedCategory}
        selectedPackageId={selectedPackageId}
        onSelectPackage={handlePackageSelectFromModal}
      />

      {/* Top Row: Trip Mode & Single Browse Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div
          role="group"
          aria-label="Tour type"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
        >
          {TRIP_MODES.map(({ value, label }) => {
            const active = tripType === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => handleModeChange(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[34px] ${
                  active
                    ? 'bg-[#C9732A] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-[#C9732A] dark:text-amber-400 hover:underline flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            explore
          </span>
          Browse All Packages
        </button>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="space-y-4">
        {/* Compact Theme Filter + Single Package Picker (hidden in Custom Tour mode) */}
        {!isCustomMode && (
          <div className="space-y-3">
            {visibleCategories.length > 1 && (
              <div
                role="group"
                aria-label="Filter by tour theme"
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <button
                  type="button"
                  aria-pressed={selectedCategory === 'All'}
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                    selectedCategory === 'All'
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  All Themes
                </button>
                {visibleCategories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-[#C9732A] dark:text-amber-300 border-[#C9732A] dark:border-amber-400'
                          : 'bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        {cat.icon}
                      </span>
                      {SHORT_CATEGORY_LABELS[cat.id]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Clean Package Select + Slim 1-Line Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-6">
                <label
                  htmlFor={packageSelectId}
                  className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
                >
                  Tour Package ({availablePackages.length})
                </label>
                <BrandSelect
                  id={packageSelectId}
                  value={activePackageObj?.id || ''}
                  labelText="Tour Package"
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-3.5 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                >
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.duration} · ₹{pkg.startingPrice.toLocaleString('en-IN')})
                    </option>
                  ))}
                </BrandSelect>
              </div>

              {activePackageObj && (
                <div className="lg:col-span-6 flex items-center justify-between gap-3 px-3.5 py-2 min-h-[52px] rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700">
                      <OptimizedImage
                        src={activePackageObj.image}
                        fallbackSrc={activePackageObj.fallbackImage}
                        alt={activePackageObj.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {activePackageObj.destination}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {activePackageObj.duration} ·{' '}
                        <strong className="text-[#C9732A] dark:text-amber-400">
                          ₹{activePackageObj.startingPrice.toLocaleString('en-IN')}
                        </strong>
                        /person
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="shrink-0 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#C9732A] dark:hover:text-amber-400 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    Details
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Core Trip Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-start">
          {/* Departure City */}
          <div className="lg:col-span-3">
            <label
              htmlFor={fromId}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
            >
              From
            </label>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
                aria-hidden="true"
              >
                flight_takeoff
              </span>
              <input
                id={fromId}
                {...register('departureCity')}
                type="text"
                autoComplete="address-level2"
                placeholder="Departure city"
                aria-invalid={errors.departureCity ? 'true' : undefined}
                aria-describedby={errors.departureCity ? fromErrId : undefined}
                className={`w-full pl-10 pr-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400/80 focus:ring-2 focus:ring-primary/50 transition-all ${
                  errors.departureCity ? 'border-red-400' : 'border-transparent'
                }`}
              />
            </div>
            {errors.departureCity && (
              <p id={fromErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
                {errors.departureCity.message}
              </p>
            )}
          </div>

          {/* Destination */}
          <div className="lg:col-span-3">
            <label
              htmlFor={toId}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
            >
              Destination
            </label>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
                aria-hidden="true"
              >
                location_on
              </span>
              <input
                id={toId}
                {...register('destination')}
                type="text"
                placeholder={isCustomMode ? 'e.g. Goa, Bali, Manali' : 'Destination'}
                aria-invalid={errors.destination ? 'true' : undefined}
                aria-describedby={errors.destination ? toErrId : undefined}
                className={`w-full pl-10 pr-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400/80 focus:ring-2 focus:ring-primary/50 transition-all ${
                  errors.destination ? 'border-red-400' : 'border-transparent'
                }`}
              />
            </div>
            {errors.destination && (
              <p id={toErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
                {errors.destination.message}
              </p>
            )}
          </div>

          {/* Travel Date */}
          <div className="lg:col-span-2">
            <label
              htmlFor={dateId}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
            >
              Travel Date
            </label>
            <BrandDatePicker
              id={dateId}
              {...register('startDate')}
              min={today}
              labelText="Travel Date"
              placeholder="Select date"
              aria-invalid={errors.startDate ? 'true' : undefined}
              aria-describedby={errors.startDate ? dateErrId : undefined}
              className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all ${
                errors.startDate ? 'border-red-400' : 'border-transparent'
              }`}
            />
            {errors.startDate && (
              <p id={dateErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* Travellers */}
          <div className="lg:col-span-2">
            <label
              htmlFor={travellersId}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
            >
              Travellers
            </label>
            <BrandSelect
              id={travellersId}
              {...register('adults', { valueAsNumber: true })}
              labelText="Travellers"
              className="w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
            >
              <option value={1}>1 Adult</option>
              <option value={2}>2 Adults</option>
              <option value={4}>4 Adults</option>
              <option value={6}>6 Adults</option>
              <option value={8}>8+ Group</option>
            </BrandSelect>
          </div>

          {/* Stay Category + Submit aligned cleanly */}
          <div className="lg:col-span-2">
            <label
              htmlFor={hotelId}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
            >
              Hotel Stay
            </label>
            <BrandSelect
              id={hotelId}
              {...register('hotelClass')}
              labelText="Hotel Stay"
              className="w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
            >
              <option value="3-Star">3★ Standard</option>
              <option value="4-Star">4★ Deluxe</option>
              <option value="5-Star">5★ Luxury</option>
            </BrandSelect>
          </div>
        </div>

        {/* Clean Submit Bar */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="w-full sm:w-auto sm:min-w-[200px] h-[52px] px-6 bg-[#C9732A] hover:bg-[#b56320] text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#C9732A]/25 hover:-translate-y-0.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              send
            </span>
            Get Tour Quote
          </button>
        </div>
      </form>
    </div>
  );
};

export default TourBookingForm;
