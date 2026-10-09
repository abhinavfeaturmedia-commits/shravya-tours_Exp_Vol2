import React, { useState, useMemo } from 'react';
import { StaffMember, Designation, Branch } from '../../../types';
import { Link } from 'react-router-dom';
import {
  Crown,
  GitFork,
  CheckCircle2,
  Search,
  ExternalLink,
  ArrowDown,
  MapPin,
  Briefcase,
  Users,
  ShieldCheck,
  Building2,
  ChevronDown,
  X
} from 'lucide-react';
import { HIERARCHY_TIERS } from './hierarchyConstants';

export interface FastHierarchySelectorProps {
  staff: StaffMember[];
  editingMemberId?: number | null;
  currentEmployeeName: string;
  designationsList: Designation[];
  branchesList: Branch[];
  formData: {
    designationId?: string;
    gradeLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';
    reportingToId?: number | null;
    branchId?: string;
    employeeCode?: string;
    employmentStatus: 'Active' | 'Notice Period' | 'Probation' | 'Suspended' | 'Resigned' | 'Terminated';
    department: string;
    role: string;
    name?: string;
  };
  onChange: (updates: Partial<{
    designationId?: string;
    gradeLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';
    reportingToId: number | null;
    branchId?: string;
    employeeCode?: string;
    employmentStatus: 'Active' | 'Notice Period' | 'Probation' | 'Suspended' | 'Resigned' | 'Terminated';
    department: string;
    role: string;
  }>) => void;
}

// Ultra-lightweight deterministic avatar initials with high-contrast gradient
// (Zero WebGL, zero canvas, zero requestAnimationFrame loops for 120 FPS performance)
const AVATAR_GRADIENTS = [
  'from-indigo-600 to-blue-500',
  'from-purple-600 to-pink-500',
  'from-emerald-600 to-teal-500',
  'from-amber-600 to-orange-500',
  'from-cyan-600 to-blue-600',
  'from-rose-600 to-red-500',
  'from-violet-600 to-purple-500'
];

function getInitials(name?: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getGradient(name?: string): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const FastInitialsAvatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'md' }) => {
  const initials = getInitials(name);
  const grad = getGradient(name);
  const sizeClasses = {
    sm: 'size-7 text-[10px]',
    md: 'size-9 text-xs',
    lg: 'size-11 text-sm'
  }[size];

  return (
    <div
      className={`${sizeClasses} ${grad} bg-gradient-to-tr text-white font-black rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-white/20 select-none`}
    >
      {initials}
    </div>
  );
};

export const FastHierarchySelector: React.FC<FastHierarchySelectorProps> = ({
  staff,
  editingMemberId,
  currentEmployeeName,
  designationsList,
  branchesList,
  formData,
  onChange
}) => {
  const [managerSearch, setManagerSearch] = useState('');
  const [isManagerPickerOpen, setIsManagerPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 2400);
  };

  // Selected Designation details
  const activeDesignation = useMemo(() => {
    if (!formData.designationId) return null;
    return designationsList.find(d => String(d.id) === String(formData.designationId)) || null;
  }, [formData.designationId, designationsList]);

  // Selected Manager details
  const activeManager = useMemo(() => {
    if (!formData.reportingToId) return null;
    return staff.find(s => s.id === formData.reportingToId) || null;
  }, [formData.reportingToId, staff]);

  // Current Seniority Tier config
  const currentTier = useMemo(() => {
    return HIERARCHY_TIERS.find(t => t.grade === formData.gradeLevel) || HIERARCHY_TIERS[7];
  }, [formData.gradeLevel]);

  // Count direct reports for each manager
  const directReportsCount = useMemo(() => {
    const counts: Record<number, number> = {};
    staff.forEach(s => {
      const rep = s.reportingToId ?? (s as any).reporting_to_id;
      if (rep) {
        counts[rep] = (counts[rep] || 0) + 1;
      }
    });
    return counts;
  }, [staff]);

  // Filter eligible managers (exclude self, active only, sorted by seniority)
  const eligibleManagers = useMemo(() => {
    return staff
      .filter(s => s.id !== editingMemberId && s.status === 'Active')
      .sort((a, b) => {
        const gradeA = (a.gradeLevel || (a as any).grade_level || 'L8').toUpperCase();
        const gradeB = (b.gradeLevel || (b as any).grade_level || 'L8').toUpperCase();
        if (gradeA !== gradeB) return gradeA.localeCompare(gradeB);
        return a.name.localeCompare(b.name);
      });
  }, [staff, editingMemberId]);

  // Filtered managers in picker
  const filteredManagers = useMemo(() => {
    if (!managerSearch.trim()) return eligibleManagers;
    const q = managerSearch.toLowerCase();
    return eligibleManagers.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        (m.employeeCode || '').toLowerCase().includes(q)
    );
  }, [eligibleManagers, managerSearch]);

  // Group filtered managers by department
  const managersByDept = useMemo(() => {
    const map = new Map<string, StaffMember[]>();
    filteredManagers.forEach(m => {
      const dept = m.department || 'General';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(m);
    });
    return map;
  }, [filteredManagers]);

  // Quick 1-Click Leader Shortcuts (Apex + top senior active leaders)
  const topLeaders = useMemo(() => {
    return eligibleManagers
      .filter(s => {
        const g = (s.gradeLevel || (s as any).grade_level || 'L8').toUpperCase();
        return g === 'L1' || g === 'L2' || g === 'L3';
      })
      .slice(0, 4);
  }, [eligibleManagers]);

  // ─── Live Chain of Command Lineage ───
  const chainOfCommand = useMemo(() => {
    const chain: { id?: number; name: string; role: string; gradeLevel: string; department: string; isApex?: boolean }[] = [];

    // Current employee at bottom
    chain.push({
      id: editingMemberId || undefined,
      name: currentEmployeeName || formData.name || 'Current Employee',
      role: formData.role || 'Role',
      gradeLevel: formData.gradeLevel || 'L8',
      department: formData.department || 'Operations'
    });

    if (formData.reportingToId === null || formData.reportingToId === undefined) {
      chain.push({
        name: 'MD / Founder (Board of Directors)',
        role: 'Apex Governance',
        gradeLevel: 'L1',
        department: 'Executive Board',
        isApex: true
      });
      return chain;
    }

    let currId: number | null | undefined = formData.reportingToId;
    const visited = new Set<number>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const m = staff.find(s => s.id === currId);
      if (!m) break;

      chain.push({
        id: m.id,
        name: m.name,
        role: m.role,
        gradeLevel: (m.gradeLevel || (m as any).grade_level || 'L8').toUpperCase(),
        department: m.department
      });

      currId = m.reportingToId ?? (m as any).reporting_to_id;
    }

    if (!chain.some(c => c.isApex || c.gradeLevel === 'L1')) {
      chain.push({
        name: 'MD / Founder (Apex Board)',
        role: 'Apex Governance',
        gradeLevel: 'L1',
        department: 'Executive Board',
        isApex: true
      });
    }

    return chain;
  }, [formData.reportingToId, formData.gradeLevel, formData.role, formData.department, formData.name, currentEmployeeName, editingMemberId, staff]);

  // ─── Actions ───
  const handleSelectManager = (managerId: number | null) => {
    onChange({ reportingToId: managerId });
    setIsManagerPickerOpen(false);
    setManagerSearch('');
    if (managerId === null) {
      showToast('Assigned direct reporting to MD / Founder (Apex)!');
    } else {
      const m = staff.find(s => s.id === managerId);
      showToast(`Assigned reporting to ${m ? m.name : 'Manager'}!`);
    }
  };

  const handleSelectTier = (grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8') => {
    onChange({ gradeLevel: grade });
    showToast(`Updated Seniority Tier to ${grade}!`);
  };

  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 p-4 sm:p-5 space-y-5 shadow-xs relative">
      
      {/* ─── Lightweight Feedback Toast ─── */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-40 bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-400">
          <CheckCircle2 size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── Header: Member Hierarchy Summary ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white p-3.5 rounded-xl shadow-xs border border-indigo-700/60">
        <div className="flex items-center gap-3">
          <FastInitialsAvatar name={currentEmployeeName || formData.name || 'Current Employee'} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">
                {currentEmployeeName || formData.name || 'Current Employee'}
              </span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${currentTier.theme.pill}`}>
                {formData.gradeLevel} Tier
              </span>
            </div>
            <p className="text-[11px] text-indigo-200">
              {formData.role || 'Designation'} • {formData.department || 'Operations'}
            </p>
          </div>
        </div>

        {/* Current Reporting Status */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-indigo-300">Reports to:</span>
            {activeManager ? (
              <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {activeManager.name} ({activeManager.gradeLevel || (activeManager as any).grade_level || 'L3'})
              </span>
            ) : (
              <span className="font-extrabold text-purple-300 flex items-center gap-1">
                <Crown size={13} className="text-amber-400" />
                MD / Founder (Apex)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── SECTION 1: OFFICIAL DESIGNATION & LOCATION (from Masters) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-indigo-500" />
              Official Designation (from Masters)
            </span>
            <Link
              to="/admin/masters"
              target="_blank"
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-bold"
            >
              <span>Manage Masters</span>
              <ExternalLink size={10} />
            </Link>
          </label>
          <select
            value={formData.designationId || ''}
            onChange={e => {
              const val = e.target.value.trim();
              if (val) {
                const found = designationsList.find(d => String(d.id) === val);
                if (found) {
                  onChange({
                    designationId: String(found.id),
                    role: found.name,
                    gradeLevel: (found.grade_level || 'L8') as any,
                    department: found.department_name ? found.department_name : formData.department
                  });
                  showToast(`Auto-synced Grade to [${found.grade_level || 'L8'}] & Role to "${found.name}"`);
                } else {
                  onChange({ designationId: val });
                }
              } else {
                onChange({ designationId: undefined });
              }
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="">-- Custom Designation (or pick from Masters) --</option>
            {designationsList.map(desig => (
              <option key={String(desig.id)} value={String(desig.id)}>
                [{desig.grade_level}] {desig.name} {desig.department_name ? `(${desig.department_name})` : ''}
              </option>
            ))}
          </select>
          {activeDesignation && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={11} /> Auto-synced Grade to [{activeDesignation.grade_level}] &amp; Role to &ldquo;{activeDesignation.name}&rdquo;
            </p>
          )}
        </div>

        {/* Office Branch */}
        <div>
          <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-indigo-500" />
            Office Branch / Base Location
          </label>
          <select
            value={formData.branchId || ''}
            onChange={e => {
              const val = e.target.value.trim();
              onChange({ branchId: val ? val : undefined });
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="">-- Select Office Branch --</option>
            {branchesList.map(b => (
              <option key={String(b.id)} value={String(b.id)}>
                {b.name} ({b.city}{b.state ? `, ${b.state}` : ''})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Assigns regional reporting and attendance perimeter.</p>
        </div>
      </div>

      {/* ─── SECTION 2: SENIORITY LADDER GRID (L1 to L8) ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-500" />
            Seniority Ladder (L1 to L8)
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            Click any level to set grade
          </span>
        </div>

        {/* 4-Column x 2-Row Grid: Clean, Spacious, Zero Overlap */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {HIERARCHY_TIERS.map(tier => {
            const isSelected = formData.gradeLevel === tier.grade;

            return (
              <button
                key={tier.grade}
                type="button"
                onClick={() => handleSelectTier(tier.grade)}
                className={`p-2.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? `${tier.theme.bg} ${tier.theme.border} ring-2 ${tier.theme.activeRing} shadow-xs`
                    : 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${tier.theme.pill}`}>
                    {tier.grade === 'L1' ? <Crown size={11} className="text-purple-600 dark:text-purple-400" /> : null}
                    <span>{tier.grade}</span>
                  </span>

                  {isSelected && (
                    <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>

                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {tier.title}
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {tier.shortLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 3: DIRECT REPORTING MANAGER SPOTLIGHT & PICKER ─── */}
      <div className="space-y-3 bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users size={14} className="text-indigo-500" />
            Primary Reporting Manager
          </span>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Quick:</span>
            
            {/* Direct Apex Shortcut */}
            <button
              type="button"
              onClick={() => handleSelectManager(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                formData.reportingToId === null || formData.reportingToId === undefined
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
              }`}
            >
              <Crown size={11} />
              <span>MD / Apex</span>
            </button>

            {/* Top 3-4 Leaders */}
            {topLeaders.map(leader => {
              const isSelected = formData.reportingToId === leader.id;
              return (
                <button
                  key={leader.id}
                  type="button"
                  onClick={() => handleSelectManager(leader.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-indigo-600'
                  }`}
                >
                  {leader.name.split(' ')[0]} ({leader.gradeLevel || (leader as any).grade_level || 'L3'})
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Manager Card & Change Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {activeManager ? (
              <>
                <FastInitialsAvatar name={activeManager.name} size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      {activeManager.name}
                    </h5>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {activeManager.gradeLevel || (activeManager as any).grade_level || 'L3'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {activeManager.role} • {activeManager.department}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supervises {directReportsCount[activeManager.id] || 0} direct team members
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="size-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Crown size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      Direct Apex Reporting (Founder &amp; MD)
                    </h5>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200">
                      L1 Apex
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Reports directly to Managing Director &amp; Board of Directors
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsManagerPickerOpen(!isManagerPickerOpen)}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-2xs"
          >
            <span>{isManagerPickerOpen ? 'Close Menu' : 'Choose Different Manager'}</span>
            <ChevronDown size={13} className={isManagerPickerOpen ? 'rotate-180 transition-transform' : ''} />
          </button>
        </div>

        {/* ─── Searchable Manager Popover Menu ─── */}
        {isManagerPickerOpen && (
          <div className="p-3 bg-slate-50/90 dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={managerSearch}
                  onChange={e => setManagerSearch(e.target.value)}
                  placeholder="Search active managers by name, role, department..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={() => setIsManagerPickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            {/* List of Managers grouped by department */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {/* Option: Direct Apex */}
              <div
                onClick={() => handleSelectManager(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  formData.reportingToId === null || formData.reportingToId === undefined
                    ? 'bg-purple-100 dark:bg-purple-950/70 border-purple-400 text-purple-950 dark:text-purple-200 font-bold'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Crown size={13} />
                  </div>
                  <div>
                    <span className="text-xs font-bold">Direct to Founder &amp; MD (Apex Authority)</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Executive board oversight</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Select</span>
              </div>

              {/* Department Groups */}
              {Array.from(managersByDept.entries()).map(([dept, mgrs]) => (
                <div key={dept} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block">
                    {dept} ({mgrs.length})
                  </span>

                  {mgrs.map(m => {
                    const isSelected = formData.reportingToId === m.id;
                    const grade = (m.gradeLevel || (m as any).grade_level || 'L8').toUpperCase();

                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectManager(m.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FastInitialsAvatar name={m.name} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {m.name}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {grade}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {m.role} • {m.department}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold shrink-0 ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {isSelected ? '✓ Active' : 'Select'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}

              {filteredManagers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  No active managers match &ldquo;{managerSearch}&rdquo;.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── SECTION 4: LIVE CONNECTED VERTICAL LINEAGE TREE ─── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <GitFork size={14} className="text-indigo-500" />
            Live Reporting Lineage (Escalation Path to Apex)
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {chainOfCommand.length - 1} step{chainOfCommand.length - 1 === 1 ? '' : 's'} to Apex
          </span>
        </div>

        {/* Connected Lineage Wire */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {chainOfCommand.map((node, idx) => (
            <React.Fragment key={node.id || node.name + idx}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                idx === 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : node.isApex
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}>
                {node.isApex ? (
                  <Crown size={14} className="text-purple-600 dark:text-purple-400" />
                ) : (
                  <FastInitialsAvatar name={node.name} size="sm" />
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black truncate max-w-[140px]">{node.name}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded">
                        Self
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {node.role} • [{node.gradeLevel}]
                  </p>
                </div>
              </div>

              {idx < chainOfCommand.length - 1 && (
                <div className="flex items-center text-indigo-400 dark:text-indigo-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider mr-1 text-slate-400 hidden sm:inline">reports to</span>
                  <ArrowDown size={14} className="rotate-[-90deg]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 pt-1">
          <span>ℹ️</span>
          Self-healing escalation: If your direct supervisor is absent, approval requests climb automatically to the next active senior.
        </p>
      </div>
    </div>
  );
};
