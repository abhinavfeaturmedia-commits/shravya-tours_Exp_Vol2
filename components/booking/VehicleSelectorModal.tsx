import React, { useEffect, useId, useRef, useState } from 'react';
import {
  VEHICLE_CATEGORIES,
  VEHICLE_MODELS,
  VehicleCategoryType,
} from '../../constants/vehicleCatalog';
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
  const titleId = useId();
  const searchId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);

  const [activeTab, setActiveTab] = useState<VehicleCategoryType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setActiveTab(selectedCategory || 'All');
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, selectedCategory]);

  // Light-dismiss fallback when <dialog closedby="any"> is not natively supported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const onPointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e)) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const filteredModels = VEHICLE_MODELS.filter((model) => {
    const matchesTab = activeTab === 'All' || model.category === activeTab;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      model.name.toLowerCase().includes(q) ||
      model.brand.toLowerCase().includes(q) ||
      model.category.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      {...({ closedby: 'any' } as any)}
      className="selector-dialog w-[calc(100%-1.5rem)] max-w-5xl max-h-[90vh] p-0 m-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950 text-white flex items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <h1 id={titleId} className="text-lg sm:text-xl font-black tracking-tight text-white">
              Browse Fleet &amp; Vehicle Specs
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Compare seating capacity, luggage space, and vehicle models.
            </p>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close vehicle fleet modal"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Filter & Search */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'All'
                  ? 'bg-slate-900 text-white dark:bg-primary'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({VEHICLE_MODELS.length})
            </button>

            {VEHICLE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeTab === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  {cat.icon}
                </span>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <label htmlFor={searchId} className="visually-hidden">
              Search vehicle models
            </label>
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              id={searchId}
              type="search"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Dzire, Innova, Creta..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/50 dark:bg-slate-950/40">
          {filteredModels.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2" aria-hidden="true">
                directions_car_off
              </span>
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                No vehicles match your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('All');
                }}
                className="mt-3 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((model) => {
                const isSelected = selectedModelName === model.name;

                return (
                  <div
                    key={model.id}
                    className={`bg-white dark:bg-slate-800/90 rounded-2xl border transition-all overflow-hidden flex flex-col ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-md'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-primary/50'
                    }`}
                  >
                    <div className="relative h-40 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                      <VehicleCardImage
                        src={model.image}
                        fallbackSrc={model.fallbackImage}
                        alt={model.name}
                        category={model.category}
                        modelName={model.name}
                        brand={model.brand}
                        badge={model.badge}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white">
                        {model.category}
                      </span>
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                          {model.brand}
                        </span>
                        <h2 className="text-sm font-black tracking-tight">{model.name}</h2>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {model.seating} · {model.luggage}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {model.features.slice(0, 3).map((feat, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectVehicle(model.category, model.name);
                          dialogRef.current?.close();
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary hover:bg-blue-600 text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : `Select ${model.name}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Clean AC vehicles with experienced chauffeurs.</span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};
