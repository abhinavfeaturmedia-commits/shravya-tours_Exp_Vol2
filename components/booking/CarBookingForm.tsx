import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { VEHICLE_CATEGORIES, VEHICLE_MODELS, VehicleCategoryType, VehicleModel } from '../../constants/vehicleCatalog';
import { VehicleSelectorModal } from './VehicleSelectorModal';
import { VehicleCardImage } from '../ui/VehicleCardImage';

// Validation schema
const carBookingSchema = z.object({
    pickupLocation: z.string().min(2, 'Pickup location is required'),
    dropoffLocation: z.string().optional(),
    pickupDate: z.string().min(1, 'Pickup date is required'),
    pickupTime: z.string().min(1, 'Pickup time is required'),
    vehicleCategory: z.string().min(1, 'Please select a vehicle category'),
    vehicleType: z.string().min(1, 'Please select a vehicle model'),
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
    vehicleType: string; // Chosen model (e.g., "Maruti Dzire", "Toyota Innova Crysta", "Force Urbania", etc.)
    sameDropOff: boolean;
    tripType: 'Round Trip' | 'One Way' | 'Local Hourly';
    seating?: string;
    luggage?: string;
}

export const CarBookingForm: React.FC<CarBookingFormProps> = ({ onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];
    const [tripType, setTripType] = useState<'Round Trip' | 'One Way' | 'Local Hourly'>('Round Trip');
    const [selectedCategory, setSelectedCategory] = useState<VehicleCategoryType>('Sedan');
    const [selectedModelName, setSelectedModelName] = useState<string>('Maruti Dzire');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue } = useForm<CarFormData>({
        resolver: zodResolver(carBookingSchema),
        defaultValues: {
            pickupLocation: '',
            dropoffLocation: '',
            pickupDate: '',
            pickupTime: '',
            vehicleCategory: 'Sedan',
            vehicleType: 'Maruti Dzire'
        }
    });

    // Available sub-category models for selected category
    const availableModels = useMemo(() => {
        return VEHICLE_MODELS.filter(m => m.category === selectedCategory);
    }, [selectedCategory]);

    // Active Model object
    const activeModelObj = useMemo(() => {
        return VEHICLE_MODELS.find(m => m.name === selectedModelName) || availableModels[0] || VEHICLE_MODELS[0];
    }, [selectedModelName, availableModels]);

    // Category object
    const activeCatObj = useMemo(() => {
        return VEHICLE_CATEGORIES.find(c => c.id === selectedCategory) || VEHICLE_CATEGORIES[1];
    }, [selectedCategory]);

    const handleCategoryChange = (category: VehicleCategoryType) => {
        setSelectedCategory(category);
        setValue('vehicleCategory', category);

        // Find top model in new category or fallback
        const defaultModel = VEHICLE_MODELS.find(m => m.category === category);
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
        const finalDropOff = data.dropoffLocation
            ? data.dropoffLocation
            : (tripType === 'Round Trip' ? data.pickupLocation : '');

        onSubmit({
            pickupLocation: data.pickupLocation,
            dropoffLocation: finalDropOff,
            pickupDate: data.pickupDate,
            pickupTime: data.pickupTime,
            vehicleCategory: selectedCategory,
            vehicleType: selectedModelName,
            sameDropOff: tripType === 'Round Trip',
            tripType,
            seating: activeModelObj ? activeModelObj.seating : activeCatObj.defaultSeating,
            luggage: activeModelObj ? activeModelObj.luggage : activeCatObj.defaultLuggage
        });
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Trip Type Selector & Modal Showcase Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
                    {(['Round Trip', 'One Way', 'Local Hourly'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setTripType(type)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                                tripType === type
                                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-base">garage</span>
                    Explore All Vehicles & Top Models
                </button>
            </div>

            {/* Category Selector Pills Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">minor_crash</span>
                        1. Select Vehicle Category
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {VEHICLE_CATEGORIES.length} Categories Available
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {VEHICLE_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleCategoryChange(cat.id)}
                                className={`p-2.5 rounded-xl border-2 transition-all duration-300 text-left flex flex-col justify-between relative overflow-hidden group ${
                                    isSelected
                                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/20'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${
                                        isSelected ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {cat.icon}
                                    </span>
                                    {isSelected && (
                                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                    )}
                                </div>

                                <div>
                                    <span className={`text-xs font-black block truncate ${
                                        isSelected ? 'text-primary dark:text-white' : 'text-slate-800 dark:text-slate-200'
                                    }`}>
                                        {cat.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block truncate">
                                        {cat.defaultSeating}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Vehicle Showcase & Sub-category Model Picker */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Visual Vehicle Card Thumbnail */}
                <div className="md:col-span-5 flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="w-24 h-16 rounded-lg overflow-hidden relative shrink-0 bg-slate-200 dark:bg-slate-800">
                        <VehicleCardImage
                            src={activeModelObj?.image || activeCatObj.image}
                            fallbackSrc={activeModelObj?.fallbackImage}
                            alt={selectedModelName}
                            category={selectedCategory}
                            modelName={selectedModelName}
                            brand={activeModelObj?.brand}
                            badge={activeModelObj?.badge}
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-900/90 text-amber-300">
                            {selectedCategory}
                        </span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                            Selected Vehicle
                        </span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                            {selectedModelName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-0.5 text-primary">
                                <span className="material-symbols-outlined text-xs">group</span>
                                {activeModelObj?.seating || activeCatObj.defaultSeating}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 truncate">
                                <span className="material-symbols-outlined text-xs">luggage</span>
                                {activeModelObj?.luggage || activeCatObj.defaultLuggage}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-Category Model Select Dropdown */}
                <div className="md:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block pl-1">
                            2. Choose Specific Model (Top 3 in {selectedCategory})
                        </label>
                        <div className="relative">
                            <select
                                value={selectedModelName}
                                onChange={(e) => {
                                    setSelectedModelName(e.target.value);
                                    setValue('vehicleType', e.target.value);
                                }}
                                className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                            >
                                <option value={`Any ${selectedCategory}`}>Any {selectedCategory} Model (Best Rate)</option>
                                {availableModels.map((model) => (
                                    <option key={model.id} value={model.name}>
                                        ⭐ {model.name} ({model.seating})
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">
                                expand_more
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all whitespace-nowrap self-end sm:self-auto flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-base">visibility</span>
                        View Specs & Photos
                    </button>
                </div>
            </div>

            {/* Location, Date & Time Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-end">
                
                {/* Pickup Location */}
                <div className="sm:col-span-1 lg:col-span-3 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">
                        Pickup Location
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">
                            my_location
                        </span>
                        <input
                            {...register('pickupLocation')}
                            className={`w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${
                                errors.pickupLocation ? 'border-red-400' : 'border-transparent'
                            }`}
                            placeholder="City or Airport"
                            type="text"
                        />
                    </div>
                    {errors.pickupLocation && (
                        <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.pickupLocation.message}</p>
                    )}
                </div>

                {/* Drop-off Location */}
                <div className="sm:col-span-1 lg:col-span-3 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">
                        Drop-off Location
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">
                            location_on
                        </span>
                        <input
                            {...register('dropoffLocation')}
                            className="w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all"
                            placeholder={tripType === 'Round Trip' ? 'Same as Pickup (Optional)' : 'Destination City / Hotel'}
                            type="text"
                        />
                    </div>
                </div>

                {/* Pickup Date */}
                <div className="sm:col-span-1 lg:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">
                        Date
                    </label>
                    <input
                        {...register('pickupDate')}
                        className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${
                            errors.pickupDate ? 'border-red-400' : 'border-transparent'
                        }`}
                        type="date"
                        min={today}
                    />
                    {errors.pickupDate && (
                        <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.pickupDate.message}</p>
                    )}
                </div>

                {/* Pickup Time */}
                <div className="sm:col-span-1 lg:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">
                        Time
                    </label>
                    <input
                        {...register('pickupTime')}
                        className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${
                            errors.pickupTime ? 'border-red-400' : 'border-transparent'
                        }`}
                        type="time"
                    />
                    {errors.pickupTime && (
                        <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.pickupTime.message}</p>
                    )}
                </div>

                {/* Submit Button */}
                <div className="sm:col-span-1 lg:col-span-12 mt-2">
                    <button
                        type="submit"
                        className="w-full md:w-auto md:min-w-[240px] h-[52px] bg-primary hover:bg-blue-600 text-white rounded-xl font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-95 ml-auto"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                        Get Quote For {selectedModelName}
                    </button>
                </div>
            </div>

            {/* Vehicle Selector Showcase Modal */}
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
