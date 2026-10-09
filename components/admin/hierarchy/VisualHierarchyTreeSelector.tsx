import React, { useState, useMemo, useRef } from 'react';
import { StaffMember, Designation, Branch } from '../../../types';
import { StaffBotAvatar } from '../../../src/components/ui/StaffBotAvatar';
import { Link } from 'react-router-dom';
import {
  Crown,
  GitFork,
  CheckCircle2,
  Building2,
  Search,
  ExternalLink,
  Info,
  Layers,
  ArrowDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { HIERARCHY_TIERS, HierarchyTier } from './hierarchyConstants';
import { DraggableMemberDock } from './DraggableMemberDock';
import { OrgChartTreeNode, OrgTreeNode } from './OrgChartTreeNode';
import { TierDropLadder } from './TierDropLadder';

export interface VisualHierarchyTreeSelectorProps {
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

export const VisualHierarchyTreeSelector: React.FC<VisualHierarchyTreeSelectorProps> = ({
  staff,
  editingMemberId,
  currentEmployeeName,
  designationsList,
  branchesList,
  formData,
  onChange
}) => {
  const [viewMode, setViewMode] = useState<'org-tree' | 'tier-ladder' | 'compact-form'>('org-tree');
  const [treeSearch, setTreeSearch] = useState('');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<number>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropTargetId, setActiveDropTargetId] = useState<number | null>(null);
  const [activeDropTier, setActiveDropTier] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; timestamp: number } | null>(null);

  const treeCanvasRef = useRef<HTMLDivElement>(null);

  // Trigger feedback toast banner
  const triggerFeedback = (message: string) => {
    setFeedbackToast({ message, timestamp: Date.now() });
    setTimeout(() => {
      setFeedbackToast(prev => (prev && Date.now() - prev.timestamp >= 2800 ? null : prev));
    }, 3000);
  };

  // ─── 1. Build Recursive Org Chart Tree Graph ───
  const { rootNodes, unlinkedNodes } = useMemo(() => {
    const nodeMap = new Map<number, OrgTreeNode>();

    // Step A: Create node objects
    staff.forEach(s => {
      nodeMap.set(s.id, {
        member: s,
        children: [],
        depth: 0,
        totalSubordinates: 0
      });
    });

    const roots: OrgTreeNode[] = [];
    const unlinked: OrgTreeNode[] = [];

    // Step B: Link children to parents
    staff.forEach(s => {
      const node = nodeMap.get(s.id)!;
      const parentId = s.reportingToId ?? (s as any).reporting_to_id;

      if (parentId === null || parentId === undefined || parentId === 0) {
        roots.push(node);
      } else if (nodeMap.has(parentId) && parentId !== s.id) {
        const parentNode = nodeMap.get(parentId)!;
        parentNode.children.push(node);
      } else {
        // Parent not in active staff list
        unlinked.push(node);
      }
    });

    // Step C: Recursive function to calculate depth & subordinates
    const processDepthAndCounts = (curr: OrgTreeNode, currentDepth: number): number => {
      curr.depth = currentDepth;
      let count = curr.children.length;

      // Sort children by grade level (senior first)
      curr.children.sort((a, b) => {
        const gradeA = (a.member.gradeLevel || (a.member as any).grade_level || 'L8').toUpperCase();
        const gradeB = (b.member.gradeLevel || (b.member as any).grade_level || 'L8').toUpperCase();
        return gradeA.localeCompare(gradeB);
      });

      curr.children.forEach(c => {
        count += processDepthAndCounts(c, currentDepth + 1);
      });

      curr.totalSubordinates = count;
      return count;
    };

    // Sort root nodes so L1 Apex comes first
    roots.sort((a, b) => {
      const gradeA = (a.member.gradeLevel || (a.member as any).grade_level || 'L8').toUpperCase();
      const gradeB = (b.member.gradeLevel || (b.member as any).grade_level || 'L8').toUpperCase();
      if (gradeA === 'L1') return -1;
      if (gradeB === 'L1') return 1;
      return gradeA.localeCompare(gradeB);
    });

    roots.forEach(r => processDepthAndCounts(r, 0));
    unlinked.forEach(u => processDepthAndCounts(u, 0));

    return { rootNodes: roots, unlinkedNodes: unlinked };
  }, [staff]);

  // Selected manager details
  const activeManager = useMemo(() => {
    if (!formData.reportingToId) return null;
    return staff.find(s => s.id === formData.reportingToId) || null;
  }, [formData.reportingToId, staff]);

  // Selected designation details
  const activeDesignation = useMemo(() => {
    if (!formData.designationId) return null;
    return designationsList.find(d => String(d.id) === String(formData.designationId)) || null;
  }, [formData.designationId, designationsList]);

  // ─── 2. Calculate Upward Chain of Command ───
  const chainOfCommand = useMemo(() => {
    const chain: { id?: number; name: string; role: string; gradeLevel: string; department: string; isApex?: boolean }[] = [];

    // Current employee at bottom
    chain.push({
      id: editingMemberId || undefined,
      name: currentEmployeeName || formData.name || 'Current Employee',
      role: formData.role || 'Role',
      gradeLevel: formData.gradeLevel || 'L8',
      department: formData.department || 'General'
    });

    if (formData.reportingToId === null || formData.reportingToId === undefined) {
      chain.push({
        name: 'MD / Founder / Board of Directors',
        role: 'Apex Governance',
        gradeLevel: 'L1',
        department: 'Executive Board',
        isApex: true
      });
      return chain;
    }

    let currentManagerId: number | null | undefined = formData.reportingToId;
    const visited = new Set<number>();

    while (currentManagerId && !visited.has(currentManagerId)) {
      visited.add(currentManagerId);
      const manager = staff.find(s => s.id === currentManagerId);
      if (!manager) break;

      chain.push({
        id: manager.id,
        name: manager.name,
        role: manager.role,
        gradeLevel: manager.gradeLevel || (manager as any).grade_level || 'L8',
        department: manager.department
      });

      currentManagerId = manager.reportingToId ?? (manager as any).reporting_to_id;
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

  // ─── 3. Drag and Drop Actions ───
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', String(editingMemberId || 'new'));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setActiveDropTargetId(null);
    setActiveDropTier(null);
  };

  const handleDropOnManager = (managerId: number) => {
    const manager = staff.find(s => s.id === managerId);
    if (!manager) return;

    onChange({ reportingToId: managerId });
    setIsDragging(false);
    setActiveDropTargetId(null);
    triggerFeedback(`Assigned ${currentEmployeeName || 'Employee'} to report to ${manager.name}!`);
  };

  const handleAssignToApex = () => {
    onChange({ reportingToId: null });
    setIsDragging(false);
    setActiveDropTargetId(null);
    triggerFeedback(`Assigned ${currentEmployeeName || 'Employee'} to report directly to Apex (MD / Founder)!`);
  };

  const handleDropOnTier = (grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8') => {
    onChange({ gradeLevel: grade });
    setIsDragging(false);
    setActiveDropTier(null);
    triggerFeedback(`Updated Grade Level to ${grade}!`);
  };

  const handleSelectManager = (managerId: number) => {
    const manager = staff.find(s => s.id === managerId);
    if (!manager) return;
    onChange({ reportingToId: managerId });
    triggerFeedback(`Assigned ${currentEmployeeName || 'Employee'} to report to ${manager.name}!`);
  };

  const handleSelectTier = (grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8') => {
    onChange({ gradeLevel: grade });
    triggerFeedback(`Updated Grade Level to ${grade}!`);
  };

  // Node expand / collapse toggles
  const handleToggleCollapse = (nodeId: number) => {
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedNodeIds(new Set());
  };

  const handleCollapseAll = () => {
    const allParentIds = new Set<number>();
    staff.forEach(s => {
      const reports = staff.filter(sub => (sub.reportingToId ?? (sub as any).reporting_to_id) === s.id);
      if (reports.length > 0) {
        allParentIds.add(s.id);
      }
    });
    setCollapsedNodeIds(allParentIds);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-purple-950/20 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 p-4 sm:p-5 space-y-5 shadow-xs relative">
      
      {/* ─── Floating Success / Action Feedback Banner ─── */}
      {feedbackToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce bg-emerald-600 text-white font-black text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 size={16} className="text-emerald-200" />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* ─── Header & View Switcher ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <GitFork size={16} />
            </span>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Corporate Hierarchy Tree &amp; Chain of Command
            </h3>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
              HIERARCHY_TIERS.find(t => t.grade === formData.gradeLevel)?.theme.pill || 'bg-slate-100 text-slate-700'
            }`}>
              {formData.gradeLevel} Tier
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Drag and drop to place staff into the company tree, or click any manager to assign reporting lines.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('org-tree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'org-tree'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <GitFork size={13} />
            <span>🌳 Org Chart Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('tier-ladder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'tier-ladder'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers size={13} />
            <span>🪜 Corporate Ladder</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('compact-form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'compact-form'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>📋 Quick Form</span>
          </button>
        </div>
      </div>

      {/* ─── DOCK: Tactile Draggable Member Token ─── */}
      <DraggableMemberDock
        memberId={editingMemberId}
        name={currentEmployeeName || formData.name || 'Current Employee'}
        role={formData.role || 'Role'}
        department={formData.department || 'Operations'}
        gradeLevel={formData.gradeLevel}
        reportingManagerName={activeManager ? activeManager.name : null}
        isDragging={isDragging}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onAssignToApex={handleAssignToApex}
      />

      {/* ─── Fast Designation & Branch Selectors (with Masters Sync) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
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
                  triggerFeedback(`Synced role to "${found.name}" & grade to [${found.grade_level || 'L8'}]`);
                } else {
                  onChange({ designationId: val });
                }
              } else {
                onChange({ designationId: undefined });
              }
            }}
            className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
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
            className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
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

      {/* ─── LIVE CHAIN OF COMMAND ESCALATION PATH (Breadcrumbs) ─── */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Crown size={14} className="text-amber-500" />
            Active Chain of Command (Upward Escalation Line)
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {chainOfCommand.length - 1} Level{chainOfCommand.length - 1 === 1 ? '' : 's'} to Apex
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {chainOfCommand.map((node, idx) => (
            <React.Fragment key={node.id || node.name + idx}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                idx === 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs'
                  : node.isApex
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}>
                {node.isApex ? (
                  <Crown size={14} className="text-purple-500" />
                ) : (
                  <div className="size-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] flex items-center justify-center">
                    {node.gradeLevel}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold leading-tight truncate max-w-[150px]">{node.name}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 rounded">
                        Self
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {node.role} • {node.department}
                  </p>
                </div>
              </div>

              {idx < chainOfCommand.length - 1 && (
                <div className="flex items-center text-indigo-400 dark:text-indigo-600">
                  <span className="text-[10px] font-bold uppercase tracking-wider mr-1 text-slate-400 hidden sm:inline">reports to</span>
                  <ArrowDown size={14} className="rotate-[-90deg]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 pt-1">
          <Info size={12} />
          Self-healing escalation: If direct manager is on leave, leaves and approvals automatically escalate to the next active senior.
        </p>
      </div>

      {/* ─── VIEW 1: CONNECTED ORG CHART TREE ─── */}
      {viewMode === 'org-tree' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Zoom, Expand/Collapse */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {/* Search Filter */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={treeSearch}
                onChange={e => setTreeSearch(e.target.value)}
                placeholder="Search staff, roles, or departments..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Tree Action Buttons & Zoom */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Expand all branches"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Collapse to top leaders"
              >
                Collapse All
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Zoom Buttons */}
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))}
                className="p-1.5 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-400 w-9 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(1.4, z + 0.1))}
                className="p-1.5 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Reset Zoom to 100%"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* ─── APEX DROP DOCK (Founder / MD Crown Anchor) ─── */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setActiveDropTargetId(-1); // -1 represents Apex
            }}
            onDragLeave={() => {
              if (activeDropTargetId === -1) setActiveDropTargetId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleAssignToApex();
            }}
            onClick={handleAssignToApex}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              activeDropTargetId === -1
                ? 'ring-4 ring-purple-500 scale-[1.01] bg-purple-100/90 dark:bg-purple-950/80 border-purple-500 shadow-xl'
                : formData.reportingToId === null || formData.reportingToId === undefined
                ? 'bg-purple-100/70 border-purple-400 dark:bg-purple-950/60 dark:border-purple-600 ring-2 ring-purple-500/50 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <Crown size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Direct Apex Reporting (Founder &amp; MD / Board of Directors)
                  </h4>
                  {(formData.reportingToId === null || formData.reportingToId === undefined) && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-purple-600 text-white rounded-full">
                      ✓ Active Manager
                    </span>
                  )}
                  {activeDropTargetId === -1 && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-purple-600 text-white rounded-full animate-bounce">
                      📥 Drop to Report to Apex
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Drag employee here (or click) to report directly to the Founder / MD without intermediary supervisors.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                formData.reportingToId === null || formData.reportingToId === undefined
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
              }`}>
                {formData.reportingToId === null || formData.reportingToId === undefined ? '✓ Selected' : 'Assign to Apex'}
              </span>
            </div>
          </div>

          {/* ─── TREE CANVAS WITH DOT GRID PATTERN & ZOOM ─── */}
          <div
            ref={treeCanvasRef}
            className="overflow-x-auto overflow-y-visible py-8 px-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-slate-50/70 dark:bg-slate-950/60 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] min-h-[420px] transition-all"
          >
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className="flex flex-col items-center min-w-max space-y-8"
            >
              {/* Stem down from Apex Dock */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-indigo-500" />
                <div className="size-2 rounded-full bg-indigo-500 -mt-1 shadow-xs" />
              </div>

              {/* Root Nodes Row */}
              <div className="flex items-start justify-center gap-12">
                {rootNodes.map((rootNode, idx) => (
                  <OrgChartTreeNode
                    key={rootNode.member.id}
                    node={rootNode}
                    isRoot={true}
                    isFirstSibling={idx === 0}
                    isLastSibling={idx === rootNodes.length - 1}
                    hasSiblings={rootNodes.length > 1}
                    editingMemberId={editingMemberId}
                    selectedManagerId={formData.reportingToId}
                    isDragging={isDragging}
                    activeDropTargetId={activeDropTargetId}
                    collapsedNodeIds={collapsedNodeIds}
                    searchQuery={treeSearch}
                    onToggleCollapse={handleToggleCollapse}
                    onSelectManager={handleSelectManager}
                    onDropOnManager={handleDropOnManager}
                    onDragOverNode={(_, id) => setActiveDropTargetId(id)}
                    onDragLeaveNode={() => {
                      if (activeDropTargetId) setActiveDropTargetId(null);
                    }}
                  />
                ))}
              </div>

              {/* Unlinked or Lateral Nodes (if any exist) */}
              {unlinkedNodes.length > 0 && (
                <div className="mt-8 pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 w-full flex flex-col items-center">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 mb-4">
                    Other / Unassigned Staff ({unlinkedNodes.length})
                  </span>
                  <div className="flex items-start justify-center gap-6 flex-wrap">
                    {unlinkedNodes.map(unNode => (
                      <OrgChartTreeNode
                        key={unNode.member.id}
                        node={unNode}
                        isRoot={true}
                        editingMemberId={editingMemberId}
                        selectedManagerId={formData.reportingToId}
                        isDragging={isDragging}
                        activeDropTargetId={activeDropTargetId}
                        collapsedNodeIds={collapsedNodeIds}
                        searchQuery={treeSearch}
                        onToggleCollapse={handleToggleCollapse}
                        onSelectManager={handleSelectManager}
                        onDropOnManager={handleDropOnManager}
                        onDragOverNode={(_, id) => setActiveDropTargetId(id)}
                        onDragLeaveNode={() => {
                          if (activeDropTargetId) setActiveDropTargetId(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: CORPORATE LADDER (L1 to L8 with Drag Drop Slots) ─── */}
      {viewMode === 'tier-ladder' && (
        <TierDropLadder
          staff={staff}
          editingMemberId={editingMemberId}
          selectedManagerId={formData.reportingToId}
          activeGradeLevel={formData.gradeLevel}
          isDragging={isDragging}
          activeDropTier={activeDropTier}
          activeDropTargetId={activeDropTargetId}
          searchQuery={treeSearch}
          onSelectManager={handleSelectManager}
          onDropOnManager={handleDropOnManager}
          onDropOnTier={handleDropOnTier}
          onSelectTier={handleSelectTier}
          onDragOverTier={(_, grade) => setActiveDropTier(grade)}
          onDragLeaveTier={() => setActiveDropTier(null)}
        />
      )}

      {/* ─── VIEW 3: COMPACT FIELDS ─── */}
      {viewMode === 'compact-form' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5 block">
                Primary Reporting Manager
              </label>
              <select
                value={formData.reportingToId ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  onChange({ reportingToId: val ? Number(val) : null });
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="">-- Reports Directly to MD / Apex --</option>
                {staff
                  .filter(s => s.id !== editingMemberId && s.status === 'Active')
                  .sort((a, b) => {
                    const gradeA = a.gradeLevel || (a as any).grade_level || 'L8';
                    const gradeB = b.gradeLevel || (b as any).grade_level || 'L8';
                    return gradeA.localeCompare(gradeB);
                  })
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.gradeLevel || (m as any).grade_level || 'L8'}] {m.name} ({m.role} - {m.department})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5 block">
                Grade / Seniority Level
              </label>
              <select
                value={formData.gradeLevel}
                onChange={e => onChange({ gradeLevel: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {HIERARCHY_TIERS.map(t => (
                  <option key={t.grade} value={t.grade}>
                    {t.grade} - {t.title} ({t.shortLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
