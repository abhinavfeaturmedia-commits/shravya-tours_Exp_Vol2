import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StaffMember } from '../../types';
import { UserCheck, Users, X, Search, ChevronDown, Check, Star, ShieldAlert } from 'lucide-react';

interface StaffMultiSelectProps {
  staffMembers?: StaffMember[];
  staff?: StaffMember[];
  selectedStaffIds?: number[];
  onChange: (ids: number[]) => void;
  primaryStaffId?: number;
  onPrimaryChange?: (primaryId: number) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  helperText?: string;
  className?: string;
}

export const StaffMultiSelect: React.FC<StaffMultiSelectProps> = ({
  staffMembers,
  staff,
  selectedStaffIds = [],
  onChange,
  primaryStaffId,
  onPrimaryChange,
  disabled = false,
  placeholder = 'Select staff members...',
  label,
  helperText,
  className = '',
}) => {
  const staffList = staffMembers || staff || [];
  const safeSelectedStaffIds = Array.isArray(selectedStaffIds) ? selectedStaffIds : [];

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Selected staff objects
  const selectedStaffList = useMemo(() => {
    if (!Array.isArray(staffList)) return [];
    return safeSelectedStaffIds
      .map(id => staffList.find(s => s && Number(s.id) === Number(id)))
      .filter((s): s is StaffMember => !!s);
  }, [safeSelectedStaffIds, staffList]);

  // Active / Filtered staff members
  const filteredStaff = useMemo(() => {
    if (!Array.isArray(staffList)) return [];
    const query = searchQuery.trim().toLowerCase();
    return staffList.filter(staffMember => {
      if (!staffMember) return false;
      if (staffMember.status === 'Inactive') return false;
      if (!query) return true;
      const idMatch = String(staffMember.id).includes(query);
      const nameMatch = staffMember.name?.toLowerCase().includes(query);
      const roleMatch = staffMember.role?.toLowerCase().includes(query);
      const deptMatch = staffMember.department?.toLowerCase().includes(query);
      const emailMatch = staffMember.email?.toLowerCase().includes(query);
      return idMatch || nameMatch || roleMatch || deptMatch || emailMatch;
    });
  }, [staffList, searchQuery]);

  const effectivePrimaryId = primaryStaffId || (safeSelectedStaffIds.length > 0 ? safeSelectedStaffIds[0] : undefined);

  const toggleStaff = (id: number) => {
    if (disabled) return;
    const numId = Number(id);
    if (safeSelectedStaffIds.includes(numId)) {
      const next = safeSelectedStaffIds.filter(x => x !== numId);
      onChange(next);
      if (effectivePrimaryId === numId && next.length > 0 && onPrimaryChange) {
        onPrimaryChange(next[0]);
      }
    } else {
      const next = [...safeSelectedStaffIds, numId];
      onChange(next);
      if (next.length === 1 && onPrimaryChange) {
        onPrimaryChange(numId);
      }
    }
  };

  const removeStaff = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (disabled) return;
    const numId = Number(id);
    const next = safeSelectedStaffIds.filter(x => x !== numId);
    onChange(next);
    if (effectivePrimaryId === numId && next.length > 0 && onPrimaryChange) {
      onPrimaryChange(next[0]);
    }
  };

  const setPrimary = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (disabled) return;
    const numId = Number(id);
    // Put primary at front of array
    const without = safeSelectedStaffIds.filter(x => x !== numId);
    const reordered = [numId, ...without];
    onChange(reordered);
    if (onPrimaryChange) {
      onPrimaryChange(numId);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            {label}
          </label>
          {safeSelectedStaffIds.length > 0 && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {safeSelectedStaffIds.length} {safeSelectedStaffIds.length === 1 ? 'person assigned' : 'people assigned'}
            </span>
          )}
        </div>
      )}

      {/* Trigger & Selected Chips Box */}
      <div
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`min-h-[42px] px-2.5 py-1.5 border rounded-xl flex flex-wrap items-center gap-1.5 transition-all cursor-pointer select-none ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 bg-white dark:bg-slate-900 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        {selectedStaffList.length === 0 ? (
          <span className="text-sm text-slate-400 dark:text-slate-500 px-1 py-0.5">
            {placeholder}
          </span>
        ) : (
          selectedStaffList.map(staff => {
            const isPrimary = Number(staff.id) === Number(effectivePrimaryId);
            return (
              <span
                key={staff.id}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isPrimary
                    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {/* Staff Avatar / Initials */}
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: staff.color || '#3b82f6' }}
                >
                  {staff.initials || staff.name.charAt(0)}
                </span>

                {/* Name & ID badge */}
                <span className="truncate max-w-[120px] font-semibold">{staff.name}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  #{staff.id}
                </span>

                {/* Primary indicator / toggle */}
                {isPrimary ? (
                  <span
                    title="Primary Owner"
                    className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500 text-white px-1 py-0.2 rounded"
                  >
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Lead
                  </span>
                ) : (
                  <button
                    type="button"
                    title="Make primary assignee"
                    onClick={e => setPrimary(e, staff.id)}
                    className="text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-0.5"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                )}

                {/* Remove button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={e => removeStaff(e, staff.id)}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })
        )}

        {/* Dropdown Chevron */}
        <div className="ml-auto pl-1 text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </div>
      </div>

      {helperText && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30">
            <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, #id, role..."
              className="w-full text-xs bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Staff List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/40">
            {filteredStaff.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching staff members found
              </div>
            ) : (
              filteredStaff.map(staff => {
                const isSelected = safeSelectedStaffIds.includes(Number(staff.id));
                const isPrimary = Number(staff.id) === Number(effectivePrimaryId);

                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox badge */}
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      {/* Avatar */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: staff.color || '#3b82f6' }}
                      >
                        {staff.initials || staff.name.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate">{staff.name}</span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            #{staff.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{staff.role}</span>
                          {staff.department && (
                            <>
                              <span>•</span>
                              <span>{staff.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Primary toggle if selected */}
                    {isSelected && (
                      <div className="flex items-center gap-1.5 pl-2 shrink-0">
                        {isPrimary ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={e => setPrimary(e, staff.id)}
                            className="text-[10px] font-medium text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 px-1.5 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-1"
                          >
                            <Star className="w-2.5 h-2.5" />
                            Make Primary
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[11px]">
              {safeSelectedStaffIds.length > 0 ? (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {safeSelectedStaffIds.length} selected
                </span>
              ) : (
                'None selected'
              )}
            </span>
            {safeSelectedStaffIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-red-500 hover:underline font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
