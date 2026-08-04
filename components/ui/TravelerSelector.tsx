import React, { useEffect, useState } from 'react';
import { formatPaxString, parsePaxString, PaxCounts } from '../../utils/paxUtils';

interface TravelerSelectorProps {
    value: string;
    onChange: (value: string) => void;
    onCountsChange?: (counts: PaxCounts) => void;
    className?: string;
}

export const TravelerSelector: React.FC<TravelerSelectorProps> = ({ value, onChange, onCountsChange, className = '' }) => {
    const [counts, setCounts] = useState<PaxCounts>(parsePaxString(value));

    // Update internal state if external value changes significantly
    useEffect(() => {
        const currentString = formatPaxString(counts.adults, counts.children, counts.infants);
        if (value !== currentString && value) {
            const parsed = parsePaxString(value);
            setCounts(parsed);
            onCountsChange?.(parsed);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const updateCounts = (type: keyof PaxCounts, delta: number) => {
        setCounts(prev => {
            const newVal = Math.max(0, Math.min(500, prev[type] + delta));
            // Ensure at least 1 adult
            if (type === 'adults' && newVal < 1) return prev;

            const newCounts = { ...prev, [type]: newVal };
            const newString = formatPaxString(newCounts.adults, newCounts.children, newCounts.infants);
            onChange(newString);
            onCountsChange?.(newCounts);
            return newCounts;
        });
    };

    const handleInputChange = (type: keyof PaxCounts, value: number) => {
        const minVal = type === 'adults' ? 1 : 0;
        const clampedVal = Math.max(minVal, Math.min(500, value));
        setCounts(prev => {
            const newCounts = { ...prev, [type]: clampedVal };
            const newString = formatPaxString(newCounts.adults, newCounts.children, newCounts.infants);
            onChange(newString);
            onCountsChange?.(newCounts);
            return newCounts;
        });
    };

    const categories = [
        { key: 'adults' as const, label: 'Adults', subtitle: 'Age 12+', min: 1 },
        { key: 'children' as const, label: 'Children', subtitle: 'Age 2–12', min: 0 },
        { key: 'infants' as const, label: 'Infants', subtitle: 'Under 2', min: 0 },
    ];

    return (
        <div className={`space-y-3 ${className}`}>
            {categories.map(cat => (
                <div key={cat.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{cat.label}</span>
                        <span className="text-xs text-slate-500">{cat.subtitle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => updateCounts(cat.key, -1)}
                            className="size-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            disabled={counts[cat.key] <= cat.min}
                        >
                            <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input
                            type="number"
                            value={counts[cat.key]}
                            onChange={(e) => handleInputChange(cat.key, parseInt(e.target.value) || 0)}
                            min={cat.min}
                            max={500}
                            className="w-16 text-center font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => updateCounts(cat.key, 1)}
                            className="size-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            disabled={counts[cat.key] >= 500}
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
