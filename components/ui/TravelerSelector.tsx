import React, { useEffect, useState } from 'react';

interface TravelerSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export const TravelerSelector: React.FC<TravelerSelectorProps> = ({ value, onChange, className = '' }) => {
    // Parse initial value "X Adults, Y Children, Z Infants"
    const parseValue = (val: string) => {
        const adultsMatch = val.match(/(\d+)\s*Adults?/i);
        const childrenMatch = val.match(/(\d+)\s*Child(ren)?/i);
        const infantsMatch = val.match(/(\d+)\s*Infants?/i);

        return {
            adults: adultsMatch ? parseInt(adultsMatch[1]) : 2,
            children: childrenMatch ? parseInt(childrenMatch[1]) : 0,
            infants: infantsMatch ? parseInt(infantsMatch[1]) : 0
        };
    };

    const [counts, setCounts] = useState(parseValue(value));

    // Update internal state if external value changes significantly
    useEffect(() => {
        const currentString = formatString(counts.adults, counts.children, counts.infants);
        if (value !== currentString && value) {
            setCounts(parseValue(value));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const formatString = (a: number, c: number, i: number) => {
        const parts = [];
        parts.push(`${a} Adult${a !== 1 ? 's' : ''}`);
        if (c > 0) {
            parts.push(`${c} Child${c !== 1 ? 'ren' : ''}`);
        }
        if (i > 0) {
            parts.push(`${i} Infant${i !== 1 ? 's' : ''}`);
        }
        return parts.join(', ');
    };

    const updateCounts = (type: 'adults' | 'children' | 'infants', delta: number) => {
        setCounts(prev => {
            const newVal = Math.max(0, prev[type] + delta);
            // Ensure at least 1 adult
            if (type === 'adults' && newVal < 1) return prev;

            const newCounts = { ...prev, [type]: newVal };
            const newString = formatString(newCounts.adults, newCounts.children, newCounts.infants);
            onChange(newString);
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
                        <span className="w-4 text-center font-bold text-slate-900 dark:text-white">{counts[cat.key]}</span>
                        <button
                            type="button"
                            onClick={() => updateCounts(cat.key, 1)}
                            className="size-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
