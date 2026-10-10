import React, { useState, useMemo } from 'react';
import { StaffMember } from '../../../types';
import { CanonicalRoleBlueprint, CanonicalDepartmentBlueprint } from './shrawelloOrgBlueprint';
import {
  X,
  Search,
  CheckCircle2,
  Users,
  Briefcase,
  Building2,
  Sparkles,
  UserCheck,
  UserPlus,
  Trash2,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleBlueprint: CanonicalRoleBlueprint | null;
  deptBlueprint: CanonicalDepartmentBlueprint | null;
  staff: StaffMember[];
  currentlyAssignedStaff: StaffMember[];
  onAssignStaff: (staffId: number, roleTitle: string, deptName: string, gradeLevel: string) => Promise<void> | void;
  onUnassignStaff: (staffId: number) => Promise<void> | void;
}

export const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  roleBlueprint,
  deptBlueprint,
  staff,
  currentlyAssignedStaff,
  onAssignStaff,
  onUnassignStaff
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'relevant' | 'all' | 'unassigned'>('relevant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(prev => (prev === msg ? null : prev)), 2400);
  };

  const assignedIds = useMemo(() => {
    return new Set((currentlyAssignedStaff || []).map(s => s.id));
  }, [currentlyAssignedStaff]);

  // Split and rank staff members by relevance
  const { relevantStaff, otherStaff, unassignedStaff } = useMemo(() => {
    if (!deptBlueprint || !roleBlueprint) {
      return { relevantStaff: [], otherStaff: [], unassignedStaff: [] };
    }

    const relevant: StaffMember[] = [];
    const other: StaffMember[] = [];
    const unassigned: StaffMember[] = [];

    const targetDeptKeywords = deptBlueprint.matchDepartmentKeywords || [];
    const roleKeywords = roleBlueprint.keywords || [];

    (staff || []).forEach(s => {
      const sDept = (s.department || '').toLowerCase();
      const sRole = (s.role || '').toLowerCase();
      const sDesig = (s.designationName || (s as any).designation_name || (s as any).designation || '').toLowerCase();

      const isDeptMatch = targetDeptKeywords.some(kw => sDept.includes(kw));
      const isRoleMatch = roleKeywords.some(kw => sRole.includes(kw) || sDesig.includes(kw));
      const isUnassigned = !s.department || s.department === 'General' || s.department === 'Unassigned';

      if (isUnassigned) {
        unassigned.push(s);
      }

      if (isDeptMatch || isRoleMatch) {
        relevant.push(s);
      } else {
        other.push(s);
      }
    });

    return { relevantStaff: relevant, otherStaff: other, unassignedStaff: unassigned };
  }, [staff, deptBlueprint, roleBlueprint]);

  // Filtered pool based on active tab and search query
  const displayedPool = useMemo(() => {
    let pool: { staff: StaffMember; isRelevant: boolean }[] = [];

    if (filterTab === 'relevant') {
      pool = relevantStaff.map(s => ({ staff: s, isRelevant: true }));
      // If relevant is empty, fall back to all
      if (pool.length === 0) {
        pool = (staff || []).map(s => ({ staff: s, isRelevant: false }));
      }
    } else if (filterTab === 'unassigned') {
      pool = unassignedStaff.map(s => ({ staff: s, isRelevant: false }));
    } else {
      // All staff: relevant first, then others
      pool = [
        ...relevantStaff.map(s => ({ staff: s, isRelevant: true })),
        ...otherStaff.map(s => ({ staff: s, isRelevant: false }))
      ];
    }

    if (!search.trim()) return pool;
    const q = search.toLowerCase();

    return pool.filter(({ staff: s }) =>
      s.name.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.employeeCode || '').toLowerCase().includes(q)
    );
  }, [filterTab, relevantStaff, otherStaff, unassignedStaff, staff, search]);

  const handleAssign = async (staffMember: StaffMember) => {
    if (!roleBlueprint || !deptBlueprint) return;
    try {
      setIsSubmitting(true);
      await onAssignStaff(
        staffMember.id,
        roleBlueprint.title,
        deptBlueprint.name,
        roleBlueprint.grade
      );
      showFeedback(`Assigned ${staffMember.name} to ${roleBlueprint.title}!`);
    } catch (err: any) {
      console.error('Assignment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (staffId: number, memberName: string) => {
    try {
      setIsSubmitting(true);
      await onUnassignStaff(staffId);
      showFeedback(`Removed ${memberName} from this position.`);
    } catch (err: any) {
      console.error('Unassign error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe early exit AFTER all hooks have executed unconditionally
  if (!isOpen || !roleBlueprint || !deptBlueprint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A2633] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Feedback Banner */}
        {actionFeedback && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-400 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={14} />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className={`p-5 ${deptBlueprint.theme.headerBg} text-white flex items-center justify-between shadow-md`}>
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Briefcase className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {deptBlueprint.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-200 font-bold">
                  {roleBlueprint.grade} Tier
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                {roleBlueprint.title} {roleBlueprint.subtitle && <span className="text-xs font-normal opacity-90">{roleBlueprint.subtitle}</span>}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Section: Currently Assigned Members in this Slot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="size-3.5 text-indigo-500" />
                Currently Assigned to this Position ({currentlyAssignedStaff.length})
              </span>
              {currentlyAssignedStaff.length > 1 && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Multi-Staff Active
                </span>
              )}
            </div>

            {currentlyAssignedStaff.length > 0 ? (
              <div className="space-y-1.5">
                {currentlyAssignedStaff.map(member => (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 dark:text-white truncate">
                            {member.name}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {member.employeeCode || `#${member.id}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {member.email || 'No email recorded'} • Status: {member.status || 'Active'}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isSubmitting}
                      onClick={() => handleUnassign(member.id, member.name)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold flex items-center gap-1 transition-all cursor-pointer text-[10px] shrink-0 border border-rose-200 dark:border-rose-900"
                      title="Unassign from this position"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-amber-500" />
                <span>This position is currently vacant. Select an employee below to assign them.</span>
              </div>
            )}
          </div>

          <hr className="border-slate-200/80 dark:border-slate-800" />

          {/* Section: Select Employee to Assign */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserPlus className="size-3.5 text-indigo-500" />
                Select Employee to Add to this Position
              </span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setFilterTab('relevant')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    filterTab === 'relevant'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dept Relevant ({relevantStaff.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Staff ({staff.length})
                </button>
                {unassignedStaff.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab('unassigned')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      filterTab === 'unassigned'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Unassigned ({unassignedStaff.length})
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search staff by name, current role, or employee code..."
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 size-4 flex items-center justify-center rounded-full"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* List of Available Employees */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {displayedPool.map(({ staff: s, isRelevant }) => {
                const isAlreadyAssigned = assignedIds.has(s.id);

                return (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isAlreadyAssigned
                        ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 opacity-60'
                        : isRelevant
                        ? 'bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white truncate">
                            {s.name}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {s.employeeCode || `#${s.id}`}
                          </span>
                          {isRelevant && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Dept Match
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Currently: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.role || 'Unassigned'}</span> ({s.department || 'General'})
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAlreadyAssigned ? (
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1 rounded bg-slate-200 dark:bg-slate-800">
                          Assigned
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAssign(s)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <UserPlus className="size-3" />
                          <span>Assign</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {displayedPool.length === 0 && (
                <div className="p-4 text-center text-slate-400 italic">
                  No staff members match &ldquo;{search}&rdquo;.
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Assigning updates employee department, designation, and tier automatically.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
