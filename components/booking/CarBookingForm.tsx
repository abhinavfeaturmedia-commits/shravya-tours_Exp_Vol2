import React, { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  VEHICLE_CATEGORIES,
  VEHICLE_MODELS,
  VehicleCategoryType,
} from '../../constants/vehicleCatalog';
import { VehicleSelectorModal } from './VehicleSelectorModal';
import { VehicleCardImage } from '../ui/VehicleCardImage';
import { BrandSelect } from '../ui/BrandSelect';
import { BrandDatePicker } from '../ui/BrandDatePicker';

type CarTripType = 'Round Trip' | 'One Way' | 'Local Hourly';

const LOCAL_HOURLY_PACKAGES = [
  '4 Hrs / 40 Km',
  '8 Hrs / 80 Km',
  '12 Hrs / 120 Km',
] as const;

const SHORT_SEAT_LABELS: Record<VehicleCategoryType, string> = {
  Hatchback: '4+1',
  Sedan: '4+1',
  SUV: '5+1',
  MPV: '6–7',
  Van: '12–26',
  Bus: '32–50',
};

const carBookingSchema = z
  .object({
    tripType: z.enum(['Round Trip', 'One Way', 'Local Hourly']),
    pickupLocation: z.string().min(2, 'Enter pickup city or airport'),
    dropoffLocation: z.string().optional(),
    pickupDate: z.string().min(1, 'Select pickup date'),
    pickupTime: z.string().min(1, 'Select pickup time'),
    vehicleCategory: z.string().min(1),
    vehicleType: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const dropoff = (data.dropoffLocation || '').trim();
    if (data.tripType === 'One Way' && dropoff.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter drop-off location',
        path: ['dropoffLocation'],
      });
    } else if (data.tripType === 'Round Trip' && dropoff.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter destination city',
        path: ['dropoffLocation'],
      });
    }
  });

type CarFormData = z.infer<typeof carBookingSchema>;

interface CarBookingFormProps {
  onSubmit: (data: CarBookingData) => void;
}

export interface CarBookingData {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  vehicleCategory: VehicleCategoryType;
  vehicleType: string;
  sameDropOff: boolean;
  tripType: CarTripType;
  seating?: string;
  luggage?: string;
}

export const CarBookingForm: React.FC<CarBookingFormProps> = ({ onSubmit }) => {
  const autoId = useId();
  const modelSelectId = `${autoId}-car-model`;
  const pickupId = `${autoId}-car-pickup`;
  const pickupErrId = `${autoId}-car-pickup-err`;
  const dropoffId = `${autoId}-car-dropoff`;
  const dropoffErrId = `${autoId}-car-dropoff-err`;
  const dateId = `${autoId}-car-date`;
  const dateErrId = `${autoId}-car-date-err`;
  const timeId = `${autoId}-car-time`;
  const timeErrId = `${autoId}-car-time-err`;

  const today = new Date().toISOString().split('T')[0];
  const [tripType, setTripType] = useState<CarTripType>('Round Trip');
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategoryType>('Sedan');
  const [selectedModelName, setSelectedModelName] = useState<string>('Maruti Dzire');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    clearErrors,
  } = useForm<CarFormData>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(carBookingSchema),
    defaultValues: {
      tripType: 'Round Trip',
      pickupLocation: '',
      dropoffLocation: '',
      pickupDate: '',
      pickupTime: '',
      vehicleCategory: 'Sedan',
      vehicleType: 'Maruti Dzire',
    },
  });

  const dropoffValue = watch('dropoffLocation') || '';

  const availableModels = useMemo(
    () => VEHICLE_MODELS.filter((m) => m.category === selectedCategory),
    [selectedCategory]
  );

  const activeModelObj = useMemo(
    () => VEHICLE_MODELS.find((m) => m.name === selectedModelName) || availableModels[0],
    [selectedModelName, availableModels]
  );

  const activeCatObj = useMemo(
    () => VEHICLE_CATEGORIES.find((c) => c.id === selectedCategory) || VEHICLE_CATEGORIES[1],
    [selectedCategory]
  );

  const handleTripTypeChange = (nextType: CarTripType) => {
    setTripType(nextType);
    setValue('tripType', nextType);
    clearErrors('dropoffLocation');

    if (nextType === 'Local Hourly') {
      if (!LOCAL_HOURLY_PACKAGES.includes(dropoffValue as (typeof LOCAL_HOURLY_PACKAGES)[number])) {
        setValue('dropoffLocation', '8 Hrs / 80 Km');
      }
    } else if (LOCAL_HOURLY_PACKAGES.includes(dropoffValue as (typeof LOCAL_HOURLY_PACKAGES)[number])) {
      setValue('dropoffLocation', '');
    }
  };

  const handleCategoryChange = (category: VehicleCategoryType) => {
    setSelectedCategory(category);
    setValue('vehicleCategory', category);
    const defaultModel = VEHICLE_MODELS.find((m) => m.category === category);
    const newModelName = defaultModel ? defaultModel.name : `Any ${category}`;
    setSelectedModelName(newModelName);
    setValue('vehicleType', newModelName);
  };

  const handleModelSelectFromModal = (category: VehicleCategoryType, modelName: string) => {
    setSelectedCategory(category);
    setSelectedModelName(modelName);
    setValue('vehicleCategory', category);
    setValue('vehicleType', modelName);
  };

  const onFormSubmit = (data: CarFormData) => {
    const finalDropOff =
      data.tripType === 'Local Hourly'
        ? data.dropoffLocation || '8 Hrs / 80 Km'
        : (data.dropoffLocation || '').trim() || data.pickupLocation;

    onSubmit({
      pickupLocation: data.pickupLocation,
      dropoffLocation: finalDropOff,
      pickupDate: data.pickupDate,
      pickupTime: data.pickupTime,
      vehicleCategory: selectedCategory,
      vehicleType: selectedModelName,
      sameDropOff: tripType === 'Round Trip',
      tripType,
      seating: activeModelObj?.seating || activeCatObj.defaultSeating,
      luggage: activeModelObj?.luggage || activeCatObj.defaultLuggage,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      noValidate
      className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* Top Row: Trip Mode & Single Fleet Modal Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div
          role="group"
          aria-label="Trip type"
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
        >
          {(['Round Trip', 'One Way', 'Local Hourly'] as const).map((type) => {
            const active = tripType === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => handleTripTypeChange(type)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[34px] ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-primary dark:text-amber-400 hover:underline flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            garage
          </span>
          View Fleet &amp; Photos
        </button>
      </div>

      {/* Vehicle Type Pills + Model Select Row */}
      <div className="space-y-3">
        <div
          role="group"
          aria-label="Vehicle category"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {VEHICLE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-white border-primary'
                    : 'bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {cat.icon}
                </span>
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-70 font-semibold">
                  {SHORT_SEAT_LABELS[cat.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label
              htmlFor={modelSelectId}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
            >
              Preferred Model
            </label>
            <BrandSelect
              id={modelSelectId}
              value={selectedModelName}
              labelText="Preferred Model"
              onChange={(e) => {
                setSelectedModelName(e.target.value);
                setValue('vehicleType', e.target.value);
              }}
              className="w-full px-3.5 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
            >
              <option value={`Any ${selectedCategory}`}>
                Any {selectedCategory} (Best Rate)
              </option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name} ({model.seating})
                </option>
              ))}
            </BrandSelect>
          </div>

          <div className="md:col-span-6 flex items-center justify-between gap-3 px-3.5 py-2 min-h-[52px] rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700">
                <VehicleCardImage
                  src={activeModelObj?.image || activeCatObj.image}
                  fallbackSrc={activeModelObj?.fallbackImage}
                  alt={selectedModelName}
                  category={selectedCategory}
                  modelName={selectedModelName}
                  brand={activeModelObj?.brand}
                  badge={activeModelObj?.badge}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {selectedModelName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activeModelObj?.seating || activeCatObj.defaultSeating} ·{' '}
                  {activeModelObj?.luggage || activeCatObj.defaultLuggage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-primary px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Specs
            </button>
          </div>
        </div>
      </div>

      {/* Adaptive Trip Details + Submit Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-start">
        {/* Pickup Location */}
        <div className="lg:col-span-3">
          <label
            htmlFor={pickupId}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
          >
            {tripType === 'Local Hourly' ? 'City / Pickup Point' : 'Pickup Location'}
          </label>
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
              aria-hidden="true"
            >
              my_location
            </span>
            <input
              id={pickupId}
              {...register('pickupLocation')}
              type="text"
              autoComplete="address-level2"
              placeholder="City or airport"
              aria-invalid={errors.pickupLocation ? 'true' : undefined}
              aria-describedby={errors.pickupLocation ? pickupErrId : undefined}
              className={`w-full pl-10 pr-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${
                errors.pickupLocation ? 'border-red-400' : 'border-transparent'
              }`}
            />
          </div>
          {errors.pickupLocation && (
            <p id={pickupErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
              {errors.pickupLocation.message}
            </p>
          )}
        </div>

        {/* Adaptive 2nd Field: Destination (Round Trip), Drop-off (One Way), or Hours (Local Hourly) */}
        <div className="lg:col-span-3">
          <label
            htmlFor={dropoffId}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
          >
            {tripType === 'Local Hourly'
              ? 'Package Hours'
              : tripType === 'Round Trip'
              ? 'Destination City'
              : 'Drop-off Location'}
          </label>

          {tripType === 'Local Hourly' ? (
            <BrandSelect
              id={dropoffId}
              value={
                LOCAL_HOURLY_PACKAGES.includes(
                  dropoffValue as (typeof LOCAL_HOURLY_PACKAGES)[number]
                )
                  ? dropoffValue
                  : '8 Hrs / 80 Km'
              }
              labelText="Package Hours"
              onChange={(e) => setValue('dropoffLocation', e.target.value)}
              className="w-full px-3.5 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
            >
              {LOCAL_HOURLY_PACKAGES.map((pkg) => (
                <option key={pkg} value={pkg}>
                  {pkg}
                </option>
              ))}
            </BrandSelect>
          ) : (
            <>
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
                  aria-hidden="true"
                >
                  location_on
                </span>
                <input
                  id={dropoffId}
                  {...register('dropoffLocation')}
                  type="text"
                  placeholder={
                    tripType === 'Round Trip' ? 'e.g. Lonavala, Shirdi' : 'Drop-off city or hotel'
                  }
                  aria-invalid={errors.dropoffLocation ? 'true' : undefined}
                  aria-describedby={errors.dropoffLocation ? dropoffErrId : undefined}
                  className={`w-full pl-10 pr-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${
                    errors.dropoffLocation ? 'border-red-400' : 'border-transparent'
                  }`}
                />
              </div>
              {errors.dropoffLocation && (
                <p id={dropoffErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
                  {errors.dropoffLocation.message}
                </p>
              )}
            </>
          )}
        </div>

        {/* Date */}
        <div className="lg:col-span-2">
          <label
            htmlFor={dateId}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
          >
            Date
          </label>
          <BrandDatePicker
            id={dateId}
            {...register('pickupDate')}
            labelText="Pickup Date"
            min={today}
            aria-invalid={errors.pickupDate ? 'true' : undefined}
            aria-describedby={errors.pickupDate ? dateErrId : undefined}
            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${
              errors.pickupDate ? 'border-red-400' : 'border-transparent'
            }`}
          />
          {errors.pickupDate && (
            <p id={dateErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
              {errors.pickupDate.message}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="lg:col-span-2">
          <label
            htmlFor={timeId}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block pl-1"
          >
            Time
          </label>
          <BrandDatePicker
            id={timeId}
            {...register('pickupTime')}
            type="time"
            labelText="Pickup Time"
            aria-invalid={errors.pickupTime ? 'true' : undefined}
            aria-describedby={errors.pickupTime ? timeErrId : undefined}
            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${
              errors.pickupTime ? 'border-red-400' : 'border-transparent'
            }`}
          />
          {errors.pickupTime && (
            <p id={timeErrId} role="alert" className="text-red-500 text-[11px] font-medium mt-1 pl-1">
              {errors.pickupTime.message}
            </p>
          )}
        </div>

        {/* Inline Submit CTA */}
        <div className="sm:col-span-2 lg:col-span-2 lg:pt-[22px]">
          <button
            type="submit"
            className="w-full h-[52px] bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-95"
          >
            Get Quote
          </button>
        </div>
      </div>

      <VehicleSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCategory={selectedCategory}
        selectedModelName={selectedModelName}
        onSelectVehicle={handleModelSelectFromModal}
      />
    </form>
  );
};

export default CarBookingForm;
