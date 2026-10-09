import React, { useState } from 'react';
import { StaffMember } from '../../../types';
import { StaffBotAvatar } from '../../../src/components/ui/StaffBotAvatar';
import {
  Crown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  ShieldCheck,
  ArrowDown
} from 'lucide-react';
import { HIERARCHY_TIERS, HierarchyTier } from './hierarchyConstants';

interface TierDropLadderProps {
  staff: StaffMember[];
  editingMemberId?: number | null;
  selectedManagerId?: number | null;
  activeGradeLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';
  isDragging: boolean;
  activeDropTier?: string | null;
  activeDropTargetId?: number | null;
  searchQuery: string;
  onSelectManager: (id: number) => void;
  onDropOnManager: (id: number) => void;
  onDropOnTier: (grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8') => void;
  onSelectTier: (grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8') => void;
  onDragOverTier: (e: React.DragEvent, grade: string) => void;
  onDragLeaveTier: (e: React.DragEvent) => void;
}

export const TierDropLadder: React.FC<TierDropLadderProps> = ({
  staff,
  editingMemberId,
  selectedManagerId,
  activeGradeLevel,
  isDragging,
  activeDropTier,
  activeDropTargetId,
  searchQuery,
  onSelectManager,
  onDropOnManager,
  onDropOnTier,
  onSelectTier,
  onDragOverTier,
  onDragLeaveTier
}) => {
  const [collapsedTiers, setCollapsedTiers] = useState<Record<string, boolean>>({});

  // Group staff members by tier
  const staffByTier = React.useMemo(() => {
    const map: Record<string, StaffMember[]> = {
      L1: [], L2: [], L3: [], L4: [], L5: [], L6: [], L7: [], L8: []
    };
    staff.forEach(s => {
      const g = (s.gradeLevel || (s as any).grade_level || 'L8').toUpperCase();
      const validGrade = map[g] ? g : 'L8';
      map[validGrade].push(s);
    });
    return map;
  }, [staff]);

  const toggleCollapse = (grade: string) => {
    setCollapsedTiers(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  return (
    <div className="space-y-4">
      {HIERARCHY_TIERS.map((tier, idx) => {
        const membersInTier = staffByTier[tier.grade] || [];
        const isTierActive = activeGradeLevel === tier.grade;
        const isDropOverTier = activeDropTier === tier.grade;
        const isCollapsed = collapsedTiers[tier.grade];

        const filteredMembers = membersInTier.filter(m => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q) ||
            m.department.toLowerCase().includes(q)
          );
        });

        return (
          <div
            key={tier.grade}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverTier(e, tier.grade);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              onDragLeaveTier(e);
            }}
            onDrop={(e) => {
              e.preventDefault();
              onDropOnTier(tier.grade);
            }}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isDropOverTier
                ? 'ring-4 ring-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-500 scale-[1.01] shadow-xl'
                : isTierActive
                ? `${tier.theme.bg} ${tier.theme.border} ring-2 ${tier.theme.activeRing} shadow-sm`
                : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* ─── Tier Header Bar (Click to set Tier / Drop Zone) ─── */}
            <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-inherit">
              <div className="flex items-center gap-3">
                {/* Grade Badge */}
                <span className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-xs ${tier.theme.pill}`}>
                  {tier.grade === 'L1' ? <Crown size={14} className="text-purple-600" /> : null}
                  <span>{tier.grade}</span>
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {tier.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      ({tier.shortLabel})
                    </span>
                    {isTierActive && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                        Current Member Tier
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tier.authority}
                  </p>
                </div>
              </div>

              {/* Actions & Drop Prompt */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {isDropOverTier && (
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-xl animate-pulse flex items-center gap-1">
                    <Sparkles size={12} />
                    Release to set Grade to {tier.grade}!
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onSelectTier(tier.grade)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    isTierActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                  title={`Place this employee on ${tier.grade} tier`}
                >
                  {isTierActive ? '✓ Assigned Tier' : `Set Tier ${tier.grade}`}
                </button>

                <button
                  type="button"
                  onClick={() => toggleCollapse(tier.grade)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>

            {/* ─── Members Grid Inside This Tier ─── */}
            {!isCollapsed && (
              <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20">
                {filteredMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    {searchQuery ? 'No matching members in this tier' : 'No staff currently assigned to this tier'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredMembers.map(m => {
                      const isSelf = m.id === editingMemberId;
                      const isSelectedManager = m.id === selectedManagerId;
                      const isTargetActive = activeDropTargetId === m.id;

                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (!isSelf) {
                              onSelectManager(m.id);
                            }
                          }}
                          onDragOver={(e) => {
                            if (isSelf) return;
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            if (isSelf) return;
                            e.preventDefault();
                            e.stopPropagation();
                            onDropOnManager(m.id);
                          }}
                          className={`p-2.5 rounded-xl border transition-all text-left relative flex items-center justify-between gap-2.5 ${
                            isTargetActive
                              ? 'ring-4 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-md'
                              : isSelectedManager
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                              : isSelf
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 opacity-90 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StaffBotAvatar
                              name={m.name}
                              size="sm"
                              role={m.role}
                              department={m.department}
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {m.name}
                                </h5>
                                {isSelf && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded">
                                    Self
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {m.role} • {m.department}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {isSelectedManager ? (
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 size={11} /> Manager
                              </span>
                            ) : !isSelf ? (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                Assign
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
