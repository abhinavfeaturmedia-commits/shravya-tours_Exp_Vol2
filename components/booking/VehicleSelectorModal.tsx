import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VEHICLE_CATEGORIES, VEHICLE_MODELS, VehicleCategoryType, VehicleModel } from '../../constants/vehicleCatalog';
import { VehicleCardImage } from '../ui/VehicleCardImage';

interface VehicleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: VehicleCategoryType;
  selectedModelName?: string;
  onSelectVehicle: (category: VehicleCategoryType, modelName: string) => void;
}

export const VehicleSelectorModal: React.FC<VehicleSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  selectedModelName,
  onSelectVehicle,
}) => {
  const [activeTab, setActiveTab] = useState<VehicleCategoryType | 'All'>(selectedCategory || 'All');
  const [searchTerm, setSearchTerm] = useState('');

  // Lock body scroll when modal is open to prevent background scrolling & overlapping elements
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredModels = VEHICLE_MODELS.filter((model) => {
    const matchesTab = activeTab === 'All' || model.category === activeTab;
    const matchesSearch =
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-700/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-primary/30 text-amber-300 border border-amber-400/30">
                Vehicle Showcase & Fleet Catalog
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Select Your Preferred Ride
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Explore categories, seating capacities, and top 3 models tailored for your comfort.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            aria-label="Close vehicle modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'All'
                  ? 'bg-slate-900 text-white dark:bg-primary dark:text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Vehicles ({VEHICLE_MODELS.length})
            </button>

            {VEHICLE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === cat.id
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Swift, Innova, Creta..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Vehicle Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin">
          
          {/* Category Summary Banner when filtering */}
          {activeTab !== 'All' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              {(() => {
                const catInfo = VEHICLE_CATEGORIES.find((c) => c.id === activeTab);
                if (!catInfo) return null;
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catInfo.color} text-white flex items-center justify-center shadow-md`}>
                        <span className="material-symbols-outlined text-2xl">{catInfo.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {catInfo.displayName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {catInfo.tagline}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectVehicle(activeTab, `Any ${catInfo.name}`);
                        onClose();
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Select Any {catInfo.name}
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredModels.map((model) => {
              const isSelected = selectedModelName === model.name;

              return (
                <div
                  key={model.id}
                  className={`group relative bg-white dark:bg-slate-800/90 rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl ${
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-primary/50'
                  }`}
                >
                  {/* Model Image with Badge */}
                  <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    <VehicleCardImage
                      src={model.image}
                      fallbackSrc={model.fallbackImage}
                      alt={model.name}
                      category={model.category}
                      modelName={model.name}
                      brand={model.brand}
                      badge={model.badge}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                    {model.badge && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md">
                        {model.badge}
                      </span>
                    )}

                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-md">
                      {model.category}
                    </span>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <div>
                        <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
                          {model.brand}
                        </span>
                        <h4 className="text-base font-black tracking-tight">{model.name}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Model Specifications & Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* Specs Pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">group</span>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Seating</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{model.seating}</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-base">luggage</span>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Luggage</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{model.luggage}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Key Features
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {model.features.slice(0, 3).map((feat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            ✓ {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                      💡 {model.idealFor}
                    </p>

                    {/* Select Button */}
                    <button
                      onClick={() => {
                        onSelectVehicle(model.category, model.name);
                        onClose();
                      }}
                      className={`w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-primary hover:bg-blue-600 text-white hover:shadow-lg hover:shadow-primary/30 active:scale-95'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {isSelected ? 'check_circle' : 'directions_car'}
                      </span>
                      {isSelected ? 'Selected Model' : `Select ${model.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredModels.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-2">directions_car_off</span>
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                No vehicles matched your search query.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('All');
                }}
                className="mt-3 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>All vehicles come with verified clean interiors & professional drivers.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
