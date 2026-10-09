import React from 'react';
import { StaffMember } from '../../../types';
import { StaffBotAvatar } from '../../../src/components/ui/StaffBotAvatar';
import {
  Crown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  Users,
  CornerDownRight,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { HIERARCHY_TIERS } from './hierarchyConstants';

export interface OrgTreeNode {
  member: StaffMember;
  children: OrgTreeNode[];
  depth: number;
  totalSubordinates: number;
}

interface OrgChartTreeNodeProps {
  node: OrgTreeNode;
  isRoot?: boolean;
  isFirstSibling?: boolean;
  isLastSibling?: boolean;
  hasSiblings?: boolean;
  editingMemberId?: number | null;
  selectedManagerId?: number | null;
  isDragging: boolean;
  activeDropTargetId?: number | null;
  collapsedNodeIds: Set<number>;
  searchQuery: string;
  onToggleCollapse: (id: number) => void;
  onSelectManager: (id: number) => void;
  onDropOnManager: (id: number) => void;
  onDragOverNode: (e: React.DragEvent, id: number) => void;
  onDragLeaveNode: (e: React.DragEvent, id: number) => void;
}

export const OrgChartTreeNode: React.FC<OrgChartTreeNodeProps> = ({
  node,
  isRoot = false,
  isFirstSibling = false,
  isLastSibling = false,
  hasSiblings = false,
  editingMemberId,
  selectedManagerId,
  isDragging,
  activeDropTargetId,
  collapsedNodeIds,
  searchQuery,
  onToggleCollapse,
  onSelectManager,
  onDropOnManager,
  onDragOverNode,
  onDragLeaveNode
}) => {
  const member = node.member;
  const isSelf = member.id === editingMemberId;
  const isSelectedManager = member.id === selectedManagerId;
  const isDropTargetActive = activeDropTargetId === member.id;
  const isCollapsed = collapsedNodeIds.has(member.id);
  const hasChildren = node.children.length > 0;

  const gradeLevel = (member.gradeLevel || (member as any).grade_level || 'L8').toUpperCase() as any;
  const tierInfo = HIERARCHY_TIERS.find(t => t.grade === gradeLevel) || HIERARCHY_TIERS[7];

  // Search match highlight
  const isSearchMatch = searchQuery.trim() !== '' && (
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    if (isSelf) return; // Cannot report to self
    e.preventDefault();
    e.stopPropagation();
    onDragOverNode(e, member.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeaveNode(e, member.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isSelf) return;
    e.preventDefault();
    e.stopPropagation();
    onDropOnManager(member.id);
  };

  return (
    <div className="flex flex-col items-center relative select-none">
      
      {/* ─── Top Connector Line (Connecting from parent crossbar down into this card) ─── */}
      {!isRoot && (
        <div className="relative flex flex-col items-center w-full">
          {/* Sibling crossbar elbow connections */}
          {hasSiblings && (
            <div className="absolute top-0 w-full h-4">
              {/* Left half bar */}
              <div className={`absolute top-0 left-0 w-1/2 h-full border-t-2 border-slate-300 dark:border-slate-700 ${
                isFirstSibling ? 'hidden' : 'block'
              }`} />
              {/* Right half bar */}
              <div className={`absolute top-0 right-0 w-1/2 h-full border-t-2 border-slate-300 dark:border-slate-700 ${
                isLastSibling ? 'hidden' : 'block'
              }`} />
            </div>
          )}
          {/* Vertical stem down to node */}
          <div className="w-0.5 h-6 bg-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-300 to-indigo-300 dark:from-slate-700 dark:to-indigo-700/80 mb-0" />
        </div>
      )}

      {/* ─── The Member Card (Interactive Node) ─── */}
      <div
        onClick={() => {
          if (!isSelf) {
            onSelectManager(member.id);
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative w-64 rounded-2xl p-3 transition-all duration-200 text-left border ${
          isDropTargetActive
            ? 'ring-4 ring-emerald-500 scale-[1.04] bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-xl shadow-emerald-500/25 z-30'
            : isSelectedManager
            ? 'ring-2 ring-emerald-500 bg-white dark:bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/15 z-20'
            : isSelf
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/50 shadow-sm cursor-not-allowed opacity-90'
            : isSearchMatch
            ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-400/50 shadow-sm cursor-pointer'
            : isDragging
            ? 'bg-white dark:bg-slate-900 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer shadow-xs'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md cursor-pointer'
        }`}
      >
        {/* Active Drop Prompt Overlay */}
        {isDropTargetActive && (
          <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none z-30 p-2">
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-md animate-bounce flex items-center gap-1.5">
              <Sparkles size={13} />
              Drop to set as Manager!
            </span>
          </div>
        )}

        {/* Status Badges */}
        <div className="flex items-center justify-between gap-1 mb-2">
          {/* Seniority Grade Pill */}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase flex items-center gap-1 ${tierInfo.theme.pill}`}>
            {gradeLevel === 'L1' ? <Crown size={11} className="text-purple-600 dark:text-purple-400" /> : null}
            <span>{gradeLevel}</span>
            <span className="text-[9px] opacity-80 font-semibold">• {tierInfo.shortLabel}</span>
          </span>

          {/* Self / Manager / Reports Indicator */}
          {isSelf ? (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-400 text-amber-950 rounded-full flex items-center gap-1 shadow-xs">
              <span>📍 You (Self)</span>
            </span>
          ) : isSelectedManager ? (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-600 text-white rounded-full flex items-center gap-1 shadow-xs animate-pulse">
              <CheckCircle2 size={10} />
              <span>Manager</span>
            </span>
          ) : null}
        </div>

        {/* Member Profile Row */}
        <div className="flex items-start gap-2.5">
          <StaffBotAvatar
            name={member.name}
            size="md"
            role={member.role}
            department={member.department}
            className="ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                {member.name}
              </h4>
            </div>

            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
              {member.role}
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
              <span className="truncate">{member.department}</span>
              {member.employeeCode && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[9px]">{member.employeeCode}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Metadata & Action */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Users size={12} className="text-indigo-500" />
            <strong>{node.totalSubordinates}</strong> report{node.totalSubordinates === 1 ? '' : 's'}
          </span>

          {!isSelf && (
            <span className={`text-[10px] font-bold transition-colors ${
              isSelectedManager
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-indigo-600 dark:text-indigo-400 group-hover:underline'
            }`}>
              {isSelectedManager ? '✓ Active Manager' : 'Assign ➔'}
            </span>
          )}
        </div>
      </div>

      {/* ─── Children Connector & Sub-Branches ─── */}
      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical stem dropping from bottom of card */}
          <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-700" />

          {/* Expand/Collapse Toggle Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(member.id);
            }}
            className="z-10 -my-2 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/60 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 transition-all shadow-xs flex items-center gap-1"
            title={isCollapsed ? 'Expand subordinate branch' : 'Collapse subordinate branch'}
          >
            <span>{node.children.length} {node.children.length === 1 ? 'branch' : 'branches'}</span>
            {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>

          {/* Children row */}
          {!isCollapsed && (
            <>
              {/* Extra vertical spacing below the expand pill */}
              <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-700" />

              {/* Horizontal layout of child trees */}
              <div className="flex items-start justify-center gap-6 pt-0">
                {node.children.map((childNode, index) => (
                  <OrgChartTreeNode
                    key={childNode.member.id}
                    node={childNode}
                    isRoot={false}
                    isFirstSibling={index === 0}
                    isLastSibling={index === node.children.length - 1}
                    hasSiblings={node.children.length > 1}
                    editingMemberId={editingMemberId}
                    selectedManagerId={selectedManagerId}
                    isDragging={isDragging}
                    activeDropTargetId={activeDropTargetId}
                    collapsedNodeIds={collapsedNodeIds}
                    searchQuery={searchQuery}
                    onToggleCollapse={onToggleCollapse}
                    onSelectManager={onSelectManager}
                    onDropOnManager={onDropOnManager}
                    onDragOverNode={onDragOverNode}
                    onDragLeaveNode={onDragLeaveNode}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
