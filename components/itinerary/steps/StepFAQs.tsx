import React from 'react';
import { useItinerary, FAQItem } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { HelpCircle, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    onBack?: () => void;
    onDone?: () => void;
}

const LADAKH_DEFAULTS: FAQItem[] = [
    { q: 'What is the best time to visit Leh Ladakh?', a: 'The best time to visit Leh Ladakh is from mid-May to September when the roads are open and weather is pleasant.' },
    { q: 'Which is the best tourist vehicle for Ladakh?', a: 'For Ladakh\'s terrain, 4x4 SUVs like Scorpio, Innova, or Tempo Travellers for larger groups are best suited.' },
    { q: 'How to prevent altitude sickness (AMS)?', a: 'Acclimatize in Leh for the first 24-48 hours. Hydrate well, avoid strenuous physical activity, and carry Diamox if prescribed.' },
    { q: 'Is oxygen cylinder required for Ladakh?', a: 'While it is not mandatory to carry one at all times, hotels in Leh have oxygen cylinders available. We also carry basic oxygen support in our private vehicles for high-altitude passes.' }
];

const GENERAL_DEFAULTS: FAQItem[] = [
    { q: 'What is the best time to visit this destination?', a: 'The best time depends on the local season. Generally, summer or winter are popular depending on the region.' },
    { q: 'What kind of transport is provided?', a: 'We provide private comfortable tourist vehicles (SUV or Sedan depending on headcount) with experienced local drivers.' },
    { q: 'Are meals included in the package?', a: 'Yes, daily breakfast and dinner at the hotels are included in this package unless specified otherwise.' },
    { q: 'What is the cancellation policy for this tour?', a: 'Free cancellation is available up to 30 days before travel. Please refer to the cancellation terms tab for full details.' }
];

export const StepFAQs: React.FC<Props> = ({ onBack, onDone }) => {
    const { faqs, setFaqs, tripDetails } = useItinerary();
    const { masterLocations } = useData();

    const destinationName = masterLocations?.find(
        (l: any) => String(l.id) === String(tripDetails.destination)
    )?.name || tripDetails.destination || '';

    const isLadakh = 
        destinationName.toLowerCase().includes('ladakh') || 
        destinationName.toLowerCase().includes('leh') ||
        tripDetails.title.toLowerCase().includes('ladakh') ||
        tripDetails.title.toLowerCase().includes('leh');

    const handleAdd = () => {
        setFaqs(prev => [...prev, { q: '', a: '' }]);
    };

    const handleUpdate = (index: number, key: 'q' | 'a', value: string) => {
        setFaqs(prev => prev.map((item, idx) => idx === index ? { ...item, [key]: value } : item));
    };

    const handleDelete = (index: number) => {
        setFaqs(prev => prev.filter((_, idx) => idx !== index));
        toast.success('FAQ removed');
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        setFaqs(prev => {
            const list = [...prev];
            const targetIdx = direction === 'up' ? index - 1 : index + 1;
            if (targetIdx < 0 || targetIdx >= list.length) return prev;
            
            // Swap items
            const temp = list[index];
            list[index] = list[targetIdx];
            list[targetIdx] = temp;
            return list;
        });
    };

    const handleResetToDefaults = () => {
        const defaults = isLadakh ? LADAKH_DEFAULTS : GENERAL_DEFAULTS;
        setFaqs(defaults);
        toast.success(`Populated ${isLadakh ? 'Leh/Ladakh' : 'general'} default FAQs!`);
    };

    const handleNext = () => {
        // Validation: Warn but don't strictly block if some FAQs are empty
        const hasEmpty = faqs.some(f => !f.q.trim() || !f.a.trim());
        if (hasEmpty) {
            toast.warning('Some FAQs have empty questions or answers. Please fill or delete them.');
        }
        onDone?.();
    };

    return (
        <div className="min-h-full p-6 md:p-10 flex flex-col max-w-4xl mx-auto">
            {/* Title Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Itinerary Builder</p>
                    <h2 className="text-2xl font-black text-stone-900 leading-tight">Package FAQs</h2>
                    <p className="text-sm text-stone-500 mt-1">Configure questions and answers specifically for this package.</p>
                </div>
                
                <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 hover:border-amber-400 bg-white dark:bg-slate-800 text-stone-650 hover:text-amber-600 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                    <RotateCcw size={13} />
                    Reset to {isLadakh ? 'Ladakh' : 'General'} Defaults
                </button>
            </div>

            {/* FAQs List Area */}
            <div className="flex-1 space-y-4 mb-8">
                {faqs.length > 0 ? (
                    faqs.map((faq, idx) => (
                        <div 
                            key={idx} 
                            className="bg-white dark:bg-[#1A2633] rounded-2xl border border-stone-200 dark:border-slate-800 p-5 shadow-sm space-y-3 relative group hover:border-amber-400/40 hover:shadow-md transition-all"
                        >
                            {/* Reordering/Action Bar - Floating Right */}
                            <div className="absolute right-4 top-4 flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleMove(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 hover:bg-stone-50 dark:hover:bg-slate-750 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                                    title="Move Up"
                                >
                                    <ArrowUp size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMove(idx, 'down')}
                                    disabled={idx === faqs.length - 1}
                                    className="p-1 hover:bg-stone-50 dark:hover:bg-slate-750 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                                    title="Move Down"
                                >
                                    <ArrowDown size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(idx)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-400 hover:text-red-650 rounded-lg transition-colors"
                                    title="Remove FAQ"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            {/* FAQ Question Field */}
                            <div className="space-y-1.5 pr-20">
                                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400">
                                    <HelpCircle size={12} className="text-amber-500" /> FAQ Question #{idx + 1}
                                </label>
                                <input
                                    type="text"
                                    value={faq.q}
                                    onChange={e => handleUpdate(idx, 'q', e.target.value)}
                                    placeholder="e.g. What is the cancellation policy?"
                                    className="w-full bg-stone-50/50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all placeholder:font-normal placeholder:text-stone-400"
                                />
                            </div>

                            {/* FAQ Answer Field */}
                            <div className="space-y-1.5 pr-1">
                                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400">
                                    Answer Details
                                </label>
                                <textarea
                                    value={faq.a}
                                    onChange={e => handleUpdate(idx, 'a', e.target.value)}
                                    placeholder="Provide a clear, detailed answer here..."
                                    rows={3}
                                    className="w-full bg-stone-50/50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-medium text-sm text-stone-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all placeholder:font-normal placeholder:text-stone-400 resize-none leading-relaxed"
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white dark:bg-[#1A2633] border border-dashed border-stone-300 dark:border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-slate-700">help_center</span>
                        <div>
                            <p className="font-bold text-stone-650 dark:text-white">No FAQs added yet</p>
                            <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1">Add custom FAQs or click "Reset to Defaults" above to populate typical questions.</p>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-2xl text-stone-500 hover:text-amber-600 transition-all text-xs font-bold group"
                >
                    <Plus size={15} />
                    Add Custom FAQ Question
                </button>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center gap-4 pt-6 border-t border-stone-200 dark:border-slate-850">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-650 dark:text-slate-350 font-bold rounded-xl text-sm transition-all"
                >
                    <ArrowLeft size={16} />
                    Back to Board
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-700 text-white font-black rounded-xl shadow transition-all active:scale-95 text-sm"
                >
                    Continue to Pricing
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
