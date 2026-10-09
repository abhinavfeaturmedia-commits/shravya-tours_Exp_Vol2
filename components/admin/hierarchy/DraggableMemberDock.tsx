import React, { useState } from 'react';
import { StaffBotAvatar } from '../../../src/components/ui/StaffBotAvatar';
import {
  GripVertical,
  Crown,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { HIERARCHY_TIERS } from './hierarchyConstants';

interface DraggableMemberDockProps {
  memberId?: number | null;
  name: string;
  role: string;
  department: string;
  gradeLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';
  reportingManagerName?: string | null;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onAssignToApex: () => void;
}

export const DraggableMemberDock: React.FC<DraggableMemberDockProps> = ({
  memberId,
  name,
  role,
  department,
  gradeLevel,
  reportingManagerName,
  isDragging,
  onDragStart,
  onDragEnd,
  onAssignToApex
}) => {
  const [showTip, setShowTip] = useState(false);
  const tierInfo = HIERARCHY_TIERS.find(t => t.grade === gradeLevel) || HIERARCHY_TIERS[7];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-4 shadow-md border border-indigo-700/60 transition-all">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Draggable Token */}
        <div className="flex items-center gap-3">
          {/* Draggable Card */}
          <div
            draggable={true}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
              isDragging
                ? 'opacity-60 scale-95 border-amber-400 bg-amber-500/20 ring-2 ring-amber-400'
                : 'bg-white/10 hover:bg-white/15 border-white/20 hover:border-amber-400/80 hover:shadow-lg hover:shadow-amber-500/10'
            }`}
            title="Click and drag this card onto any manager in the tree below to assign reporting!"
          >
            {/* Drag Grip Handle */}
            <div className="text-white/60 group-hover:text-amber-300 transition-colors flex items-center">
              <GripVertical size={18} />
            </div>

            {/* Avatar */}
            <div className="relative">
              <StaffBotAvatar
                name={name || 'New Member'}
                size="md"
                role={role || 'Staff'}
                department={department || 'Operations'}
                className="ring-2 ring-white/30"
              />
              <span className={`absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full border shadow-xs ${tierInfo.theme.pill}`}>
                {gradeLevel}
              </span>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wide text-white group-hover:text-amber-200 transition-colors">
                  {name || 'New Staff Member'}
                </span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 flex items-center gap-0.5 animate-pulse">
                  <Sparkles size={9} />
                  Drag Me
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/90 font-medium">
                {role || 'Select Role'} • {department || 'Department'}
              </p>
            </div>
          </div>

          {/* Quick Help / Instructions */}
          <div className="hidden sm:block">
            <div className="flex items-center gap-1 text-[11px] text-indigo-200 font-semibold">
              <ArrowRight size={13} className="text-amber-300 animate-pulse" />
              <span>Drag &amp; drop onto any card or tier below</span>
            </div>
            <p className="text-[10px] text-indigo-300/70">
              Or simply click any card in the tree to assign instantly
            </p>
          </div>
        </div>

        {/* Right: Current Reporting Status & Direct Apex Shortcut */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Current Manager Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Reports to:
            </span>
            {reportingManagerName ? (
              <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {reportingManagerName}
              </span>
            ) : (
              <span className="font-extrabold text-purple-300 flex items-center gap-1">
                <Crown size={13} className="text-amber-400" />
                Direct Apex (MD / Founder)
              </span>
            )}
          </div>

          {/* Direct Apex Button */}
          <button
            type="button"
            onClick={onAssignToApex}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              !reportingManagerName
                ? 'bg-purple-600/90 hover:bg-purple-600 text-white border-purple-400/80 shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-white/90 border-white/20'
            }`}
            title="Set this member to report directly to the Founder / Managing Director (no intermediary manager)"
          >
            <Crown size={13} className="text-amber-300" />
            <span>{!reportingManagerName ? '✓ At Apex' : 'Make Apex Direct'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTip(!showTip)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 transition-colors"
            title="How Drag & Drop works"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* Expandable Tip */}
      {showTip && (
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-indigo-100 flex items-start gap-2 bg-black/20 p-2.5 rounded-xl">
          <Info size={14} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p>
              <strong>How Drag &amp; Drop works:</strong> Grab the <span className="text-amber-300 font-bold">&ldquo;Drag Me&rdquo;</span> badge above with your mouse. As you move over the tree, valid manager cards turn green. Drop on any manager to set them as reporting supervisor, or drop into any Tier slot (L1–L8) to update their grade level.
            </p>
            <p className="text-indigo-300">
              You can also click any card directly if you are on a touchscreen or trackpad.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
