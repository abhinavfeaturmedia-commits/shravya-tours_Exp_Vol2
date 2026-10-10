import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StaffMember } from '../../../types';
import {
  SHRAWELLO_DEPARTMENTS,
  CanonicalDepartmentBlueprint,
  CanonicalRoleBlueprint,
  buildPopulatedOrgModel,
  validateManagerSelection,
  getUpwardChain,
  parseGradeLevel
} from './shrawelloOrgBlueprint';
import { RoleAssignmentModal } from './RoleAssignmentModal';
import {
  Users,
  Settings,
  Briefcase,
  PhoneCall,
  MapPin,
  Calendar,
  LifeBuoy,
  Globe,
  Network,
  Truck,
  Tag,
  Megaphone,
  Share2,
  Palette,
  Search,
  Coins,
  BookOpen,
  Receipt,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Building2,
  Server,
  Database,
  Laptop,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  CornerDownRight,
  Plane,
  Crown,
  HeartHandshake,
  User,
  Sparkles,
  Phone,
  Mail,
  Shield,
  Layers
} from 'lucide-react';

export interface ShrawelloOrgChartProps {
  staff: StaffMember[];
  editingMemberId?: number | null;
  currentEmployeeName?: string;
  selectionMode?: boolean;
  selectedManagerId?: number | null;
  onSelectManager?: (managerId: number | null) => void;
  onEditStaff?: (staff: StaffMember) => void;
  onUpdateStaff?: (staffId: number, updates: Partial<StaffMember>) => Promise<void> | void;
  onCloseSelectionModal?: () => void;
}

// Map iconType strings to Lucide components
const renderRoleIcon = (iconType: string, className: string = 'size-4') => {
  switch (iconType) {
    case 'user-check': return <UserCheck className={className} />;
    case 'briefcase': return <Briefcase className={className} />;
    case 'phone-call': return <PhoneCall className={className} />;
    case 'map': return <MapPin className={className} />;
    case 'calendar': return <Calendar className={className} />;
    case 'life-buoy': return <LifeBuoy className={className} />;
    case 'network': return <Network className={className} />;
    case 'truck': return <Truck className={className} />;
    case 'tag': return <Tag className={className} />;
    case 'share-2': return <Share2 className={className} />;
    case 'palette': return <Palette className={className} />;
    case 'search': return <Search className={className} />;
    case 'book-open': return <BookOpen className={className} />;
    case 'receipt': return <Receipt className={className} />;
    case 'shield-check': return <ShieldCheck className={className} />;
    case 'user-plus': return <UserPlus className={className} />;
    case 'building': return <Building2 className={className} />;
    case 'heart-handshake': return <HeartHandshake className={className} />;
    case 'database': return <Database className={className} />;
    case 'laptop': return <Laptop className={className} />;
    default: return <User className={className} />;
  }
};

const renderDeptIcon = (iconName: string, className: string = 'size-5') => {
  switch (iconName) {
    case 'handshake': return <Briefcase className={className} />;
    case 'settings': return <Settings className={className} />;
    case 'globe': return <Globe className={className} />;
    case 'megaphone': return <Megaphone className={className} />;
    case 'coins': return <Coins className={className} />;
    case 'users': return <Users className={className} />;
    case 'server': return <Server className={className} />;
    default: return <Building2 className={className} />;
  }
};

export const ShrawelloOrgChart: React.FC<ShrawelloOrgChartProps> = ({
  staff,
  editingMemberId,
  currentEmployeeName,
  selectionMode = false,
  selectedManagerId,
  onSelectManager,
  onEditStaff,
  onUpdateStaff,
  onCloseSelectionModal
}) => {
  const [activeStaffList, setActiveStaffList] = useState<StaffMember[]>(staff);

  // Synchronize whenever staff prop updates
  useEffect(() => {
    setActiveStaffList(staff);
  }, [staff]);

  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [inspectedStaff, setInspectedStaff] = useState<StaffMember | null>(null);
  const [compactLayout, setCompactLayout] = useState(false);
  const [expandedTeamMemberIds, setExpandedTeamMemberIds] = useState<Set<number>>(new Set());
  const [assignmentModalTarget, setAssignmentModalTarget] = useState<{
    role: CanonicalRoleBlueprint;
    dept: CanonicalDepartmentBlueprint;
  } | null>(null);

  // Helper to toggle team tree expansion
  const toggleTeamTree = (memberId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTeamMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // Helper to fetch direct reports for any member
  const getDirectReports = (managerId: number) => {
    return activeStaffList.filter(s => {
      const rep = s.reportingToId ?? (s as any).reporting_to_id;
      return rep !== null && rep !== undefined && Number(rep) === Number(managerId);
    });
  };

  // Smart recommended leader in selection mode
  const recommendedLeader = useMemo(() => {
    if (!selectionMode) return null;
    const editingStaff = activeStaffList.find(s => s.id === editingMemberId);
    const targetDept = editingStaff?.department || '';

    // 1. Try to find HOD / Manager in the same department
    if (targetDept) {
      const sameDeptManagers = activeStaffList.filter(s => {
        if (s.id === editingMemberId) return false;
        if (s.status !== 'Active') return false;
        const sDept = (s.department || '').toLowerCase();
        if (!sDept.includes(targetDept.toLowerCase())) return false;
        const grade = parseGradeLevel(s.gradeLevel || (s as any).grade_level);
        return grade <= 5; // L1 to L5
      }).sort((a, b) => parseGradeLevel(a.gradeLevel || (a as any).grade_level) - parseGradeLevel(b.gradeLevel || (b as any).grade_level));

      if (sameDeptManagers.length > 0) {
        const candidate = sameDeptManagers[0];
        const val = validateManagerSelection(activeStaffList, editingMemberId, candidate.id);
        if (val.allowed) return candidate;
      }
    }

    // 2. Fallback to MD (Manali)
    const md = activeStaffList.find(s => {
      const g = (s.gradeLevel || (s as any).grade_level || '').toUpperCase();
      const n = (s.name || '').toLowerCase();
      return (g === 'L2' || n.includes('manali')) && s.id !== editingMemberId;
    });
    return md || null;
  }, [selectionMode, activeStaffList, editingMemberId]);

  // Build the populated organizational model
  const populatedModel = useMemo(() => {
    return buildPopulatedOrgModel(activeStaffList);
  }, [activeStaffList]);

  // Handle member click (either inspect or select)
  const handleMemberClick = (member: StaffMember) => {
    if (selectionMode && onSelectManager) {
      const validation = validateManagerSelection(activeStaffList, editingMemberId, member.id);
      if (validation.allowed) {
        onSelectManager(member.id);
      } else {
        // Show inspector with error explanation
        setInspectedStaff(member);
      }
    } else {
      setInspectedStaff(member);
    }
  };

  // Inspect details computations
  const inspectorUpwardChain = useMemo(() => {
    if (!inspectedStaff) return [];
    return getUpwardChain(activeStaffList, inspectedStaff.id);
  }, [inspectedStaff, activeStaffList]);

  const inspectorDownlineReports = useMemo(() => {
    if (!inspectedStaff) return [];
    return activeStaffList.filter(s => {
      const rep = s.reportingToId ?? (s as any).reporting_to_id;
      return rep !== null && rep !== undefined && Number(rep) === Number(inspectedStaff.id);
    });
  }, [inspectedStaff, activeStaffList]);

  // Validation details if inspecting in selection mode
  const currentInspectValidation = useMemo(() => {
    if (!inspectedStaff || !selectionMode) return null;
    return validateManagerSelection(activeStaffList, editingMemberId, inspectedStaff.id);
  }, [inspectedStaff, selectionMode, activeStaffList, editingMemberId]);

  return (
    <div className="relative flex flex-col w-full bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden min-h-[750px]">
      
      {/* ─── Top Control & Filter Toolbar ─── */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-white/95 dark:bg-[#1A2633]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Brand / Mode Label */}
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Crown className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide uppercase text-slate-800 dark:text-white">
                SHRAWELLO Organization Tree
              </h2>
              {selectionMode && (
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                  Selection Mode
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {selectionMode
                ? `Click an active leader to set as manager for ${currentEmployeeName || 'staff member'}`
                : 'Top-down hierarchy & functional reporting matrix'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Department Filter */}
          <div className="relative">
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All 7 Departments</option>
              {SHRAWELLO_DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="size-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Box */}
          <div className="relative w-48 sm:w-60">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 size-4 flex items-center justify-center rounded-full"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
              title="Zoom Out"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="text-[10px] font-black px-1.5 text-slate-600 dark:text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
              title="Zoom In"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => (prev === 0.72 ? 0.85 : 0.72))}
              title="Fit to Screen Width (All 7 Departments)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                zoomLevel === 0.72
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600'
              }`}
            >
              <Maximize2 className="size-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom to 100%"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          {/* Direct MD/Apex shortcut when in selection mode */}
          {selectionMode && onSelectManager && (
            <button
              onClick={() => onSelectManager(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Crown className="size-3.5" />
              <span>Direct to Board / Founder</span>
            </button>
          )}

          {/* Close button if in modal */}
          {onCloseSelectionModal && (
            <button
              onClick={onCloseSelectionModal}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Smart Recommendation Banner (in Selection Mode) ─── */}
      {selectionMode && recommendedLeader && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-indigo-500/15 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-800 dark:text-slate-200">
              <strong>Smart Match:</strong> Recommended manager for {currentEmployeeName || 'this staff member'} is <strong>{recommendedLeader.name}</strong> ({recommendedLeader.role} • {recommendedLeader.department})
            </span>
          </div>
          <button
            onClick={() => handleMemberClick(recommendedLeader)}
            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-colors"
          >
            Select {recommendedLeader.name}
          </button>
        </div>
      )}

      {/* ─── Main Org Chart Scrollable Canvas ─── */}
      <div className="flex-1 overflow-auto p-6 sm:p-10 select-none bg-radial from-slate-100/50 via-slate-50 to-slate-100 dark:from-slate-900/60 dark:via-[#0B132B] dark:to-[#080E1E]">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="flex flex-col items-center min-w-[1300px] max-w-[1700px] mx-auto pb-12"
        >

          {/* ═══════════════════════════════════════════════════════
              TOP HEADER BANNER (Faithful to Reference Image)
             ═══════════════════════════════════════════════════════ */}
          <div className="w-full flex items-center justify-between pb-6 border-b-2 border-slate-200/80 dark:border-slate-800/80 mb-8 px-4">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3.5">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black tracking-tight text-[#0F2850] dark:text-white">
                    SHRAWELLO
                  </span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase">TM</span>
                </div>
                <div className="text-[11px] font-black tracking-widest uppercase text-sky-600 dark:text-sky-400">
                  Travel Hub
                </div>
                <p className="text-[10px] font-medium italic text-slate-400 dark:text-slate-500">
                  Explore • Experience • Create Memories
                </p>
              </div>
            </div>

            {/* Center: Title & Subtitle */}
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 mb-1">
                <Sparkles className="size-3 text-indigo-500" />
                <h1 className="text-lg font-black tracking-wider uppercase">
                  Our Team • Our Strength
                </h1>
                <Sparkles className="size-3 text-indigo-500" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wide">
                Organizational Structure & Hierarchy
              </p>
            </div>

            {/* Right: Slogan & Travel Motif */}
            <div className="flex items-center gap-2 text-right">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black italic text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  Travel Brings People Closer
                  <Plane className="size-3.5 text-sky-500" />
                </span>
                <span className="text-[10px] text-slate-400">Official Operational Blueprint</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              EXECUTIVE APEX TIER (Founder Director -> Managing Director)
             ═══════════════════════════════════════════════════════ */}
          <div className="flex flex-col items-center relative z-10 mb-2">
            
            {/* Card 1: Founder Director (Rohit Sankpal) */}
            {(() => {
              const founder = populatedModel.apexFounder;
              const founderName = founder?.name || 'Rohit Sankpal';
              const isSelected = selectedManagerId === (founder?.id ?? 1);
              const isMatch = searchQuery && founderName.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div
                  onClick={() => founder && handleMemberClick(founder)}
                  className={`group relative w-84 bg-[#0F2850] text-white rounded-2xl p-4 shadow-xl border-2 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-400 ring-4 ring-emerald-400/30 scale-105'
                      : isMatch
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : 'border-[#1E3A8A] hover:border-sky-400 hover:shadow-sky-500/20 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Executive Avatar */}
                    <div className="size-13 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md border-2 border-white/20 shrink-0">
                      <UserCheck className="size-7 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black tracking-wider uppercase text-sky-300">
                          Founder Director
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-400/30">
                          L1 Apex
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white truncate">
                        {founderName}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Supreme Authority & Strategic Vision
                      </p>
                    </div>
                  </div>

                  {selectionMode && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Eligible Senior Manager
                      </span>
                      <span className="font-extrabold text-white group-hover:underline">Click to Select</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Vertical Connector Line 1 */}
            <div className="w-0.5 h-7 bg-[#0F2850] dark:bg-sky-500" />

            {/* Card 2: Managing Director (Manali Sankpal) */}
            {(() => {
              const md = populatedModel.apexMd;
              const mdName = md?.name || 'Manali Sankpal';
              const isSelected = selectedManagerId === (md?.id ?? 2);
              const isMatch = searchQuery && mdName.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div
                  onClick={() => md && handleMemberClick(md)}
                  className={`group relative w-84 bg-[#0267C1] text-white rounded-2xl p-4 shadow-xl border-2 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-400 ring-4 ring-emerald-400/30 scale-105'
                      : isMatch
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : 'border-sky-400 hover:border-white hover:shadow-sky-400/30 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Executive Avatar */}
                    <div className="size-13 rounded-xl bg-gradient-to-tr from-purple-400 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md border-2 border-white/20 shrink-0">
                      <Crown className="size-7 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black tracking-wider uppercase text-sky-100">
                          Managing Director
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                          L2 Director
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white truncate">
                        {mdName}
                      </h3>
                      <p className="text-[11px] text-sky-100 font-medium">
                        (Operations & Growth)
                      </p>
                    </div>
                  </div>

                  {selectionMode && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-200 font-bold flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Eligible Senior Manager
                      </span>
                      <span className="font-extrabold text-white group-hover:underline">Click to Select</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Vertical Connector Line 2 down to Horizontal Spine */}
            <div className="w-0.5 h-8 bg-[#0267C1] dark:bg-sky-500" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              HORIZONTAL CONNECTING SPINE & 7 DEPARTMENT BRANCHES
             ═══════════════════════════════════════════════════════ */}
          <div className="w-full flex flex-col items-center">
            
            {/* The Horizontal Line across the width */}
            <div className="w-[94%] h-0.5 bg-slate-300 dark:bg-slate-700 relative">
              <div className="absolute left-1/2 -top-1 size-2 rounded-full bg-sky-500 -translate-x-1/2" />
            </div>

            {/* 7 Columns Container */}
            <div className="w-full grid grid-cols-7 gap-3.5 pt-0">
              {populatedModel.departments.map((dept, deptIdx) => {
                const isFiltered = selectedDeptFilter !== 'all' && selectedDeptFilter !== dept.blueprint.id;
                if (isFiltered) return null;

                return (
                  <div key={dept.blueprint.id} className="flex flex-col items-center">
                    
                    {/* Vertical Connector from Spine down to Department Header */}
                    <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />

                    {/* Department Header Card */}
                    <div className={`w-full ${dept.blueprint.theme.bannerBg} text-white rounded-2xl p-3 shadow-md flex flex-col items-center text-center border ${dept.blueprint.theme.border} min-h-[92px] justify-center transition-transform hover:scale-[1.02]`}>
                      <div className="size-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mb-1.5 shadow-xs">
                        {renderDeptIcon(dept.blueprint.iconName, 'size-4')}
                      </div>
                      <h4 className="text-xs font-black tracking-tight leading-tight line-clamp-2">
                        {dept.blueprint.name}
                      </h4>
                      <p className={`text-[10px] font-semibold ${dept.blueprint.theme.bannerSubtitle} mt-0.5`}>
                        {dept.blueprint.subtitle}
                      </p>
                    </div>

                    {/* Vertical Role Stack under Department */}
                    <div className="w-full flex flex-col items-center space-y-2.5 mt-3">
                      {dept.roles.map(role => {
                        const hasStaff = role.assignedStaff.length > 0;

                        return (
                          <div key={role.blueprint.id} className="w-full flex flex-col items-center">
                            
                            {/* Connector line between roles */}
                            <div className="w-0.5 h-2 bg-slate-200 dark:bg-slate-800" />

                            {/* Role Slot Box */}
                            <div className={`w-full rounded-2xl border transition-all duration-200 ${
                              hasStaff
                                ? `${dept.blueprint.theme.cardBg} ${dept.blueprint.theme.cardBorder} shadow-xs`
                                : 'border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}>
                              
                              {/* ─── Role Slot Header ─── */}
                              <div className="flex items-center justify-between gap-1 p-2 pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className={dept.blueprint.theme.iconColor}>
                                    {renderRoleIcon(role.blueprint.iconType, 'size-3.5')}
                                  </div>
                                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate">
                                    {role.blueprint.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {hasStaff ? (
                                    <>
                                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                        {role.assignedStaff.length}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssignmentModalTarget({
                                            role: role.blueprint,
                                            dept: dept.blueprint
                                          });
                                        }}
                                        title={`Add another employee to ${role.blueprint.title}`}
                                        className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all flex items-center gap-0.5 shadow-2xs cursor-pointer"
                                      >
                                        <UserPlus className="size-2.5" />
                                        <span>+ Add</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setAssignmentModalTarget({
                                        role: role.blueprint,
                                        dept: dept.blueprint
                                      })}
                                      className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-0.5 shadow-2xs cursor-pointer"
                                    >
                                      <UserPlus className="size-2.5" />
                                      <span>+ Assign</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* ─── Role Slot Body ─── */}
                              {hasStaff ? (
                                <div className="p-1.5 space-y-1.5">
                                  {role.assignedStaff.map(member => {
                                    const isSelected = selectedManagerId === member.id;
                                    const isMatch = searchQuery && (
                                      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      role.blueprint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      (member.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase())
                                    );

                                    const validation = selectionMode
                                      ? validateManagerSelection(activeStaffList, editingMemberId, member.id)
                                      : null;

                                    const isBlocked = selectionMode && validation && !validation.allowed;
                                    const directReports = getDirectReports(member.id);
                                    const isTeamExpanded = expandedTeamMemberIds.has(member.id);

                                    return (
                                      <div
                                        key={member.id}
                                        onClick={() => handleMemberClick(member)}
                                        className={`w-full rounded-xl p-2 border transition-all duration-200 cursor-pointer ${
                                          isSelected
                                            ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 shadow-md'
                                            : isMatch
                                            ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-md bg-amber-50/40 dark:bg-amber-950/20'
                                            : isBlocked
                                            ? 'opacity-40 border-slate-200 dark:border-slate-800 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40'
                                            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:shadow-xs'
                                        }`}
                                      >
                                        {/* Staff Member Pill */}
                                        <div className="flex items-center gap-2">
                                          <div className="size-7 rounded-lg bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                                            {member.name.slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {member.name}
                                              </span>
                                              {member.status === 'Active' ? (
                                                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Active" />
                                              ) : (
                                                <span className="size-1.5 rounded-full bg-rose-500 shrink-0" title="Inactive" />
                                              )}
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                                              <span>{member.employeeCode || `#${member.id}`}</span>
                                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                {member.gradeLevel || role.blueprint.grade}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Selection Mode status tag */}
                                        {selectionMode && (
                                          <div className="mt-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[9px]">
                                            {isBlocked ? (
                                              <span className="text-rose-500 font-bold flex items-center gap-1">
                                                <AlertTriangle className="size-2.5" /> {validation?.reason}
                                              </span>
                                            ) : (
                                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="size-2.5" /> Click to Select
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {/* ─── Downline Team Tree Toggle & Visualization ─── */}
                                        {directReports.length > 0 && (
                                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                                            <button
                                              type="button"
                                              onClick={(e) => toggleTeamTree(member.id, e)}
                                              className="w-full flex items-center justify-between text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                            >
                                              <span className="flex items-center gap-1">
                                                <Network className="size-3 text-indigo-500" />
                                                <span>Direct Team ({directReports.length})</span>
                                              </span>
                                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-slate-400">
                                                {isTeamExpanded ? 'Hide Tree' : 'View Tree'}
                                                {isTeamExpanded ? (
                                                  <ChevronUp className="size-3" />
                                                ) : (
                                                  <ChevronDown className="size-3" />
                                                )}
                                              </span>
                                            </button>

                                            {/* Subordinate Tree Branches */}
                                            {isTeamExpanded && (
                                              <div className="mt-2 pt-1.5 border-t border-dashed border-indigo-200 dark:border-indigo-800/70 space-y-1 pl-1 animate-in fade-in duration-150">
                                                <div className="text-[9px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1 mb-1">
                                                  <CornerDownRight className="size-2.5" />
                                                  <span>Reports Under {member.name.split(' ')[0]}</span>
                                                </div>
                                                <div className="relative pl-2.5 border-l-2 border-indigo-300 dark:border-indigo-700 space-y-1">
                                                  {directReports.map((sub) => {
                                                    const subTeam = getDirectReports(sub.id);
                                                    const isSubSelected = selectedManagerId === sub.id;

                                                    return (
                                                      <div
                                                        key={sub.id}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleMemberClick(sub);
                                                        }}
                                                        className={`relative p-1.5 rounded-lg border text-[10px] transition-all cursor-pointer ${
                                                          isSubSelected
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold shadow-xs'
                                                            : 'bg-white/90 dark:bg-slate-900/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-slate-200 dark:border-slate-800 shadow-2xs'
                                                        }`}
                                                      >
                                                        {/* Connector branch tick */}
                                                        <div className="absolute -left-2.5 top-3 w-2 h-0.5 bg-indigo-300 dark:bg-indigo-700" />
                                                        
                                                        <div className="flex items-center justify-between gap-1">
                                                          <div className="flex items-center gap-1 min-w-0">
                                                            <div className="size-4.5 rounded bg-slate-700 text-white text-[8px] font-black flex items-center justify-center shrink-0">
                                                              {sub.name.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                                              {sub.name}
                                                            </span>
                                                          </div>
                                                          <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                            {sub.gradeLevel || (sub as any).grade_level || 'L7'}
                                                          </span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5 pl-5.5">
                                                          <span className="truncate">{sub.role}</span>
                                                          {subTeam.length > 0 && (
                                                            <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-1 py-0.2 rounded">
                                                              +{subTeam.length} team
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                /* Vacant Role Slot */
                                <div
                                  onClick={() => setAssignmentModalTarget({
                                    role: role.blueprint,
                                    dept: dept.blueprint
                                  })}
                                  className="p-3 text-center cursor-pointer group hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                                >
                                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="italic text-slate-400">Open Slot</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                      + Assign Staff
                                    </span>
                                  </div>
                                </div>
                              )}

                            </div>

                          </div>
                        );
                      })}

                      {/* Any Extra unmapped staff in this department */}
                      {dept.unmappedStaff.length > 0 && (
                        <div className="w-full pt-2">
                          <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 text-center">
                            Additional Team ({dept.unmappedStaff.length})
                          </div>
                          <div className="space-y-1">
                            {dept.unmappedStaff.map(extra => (
                              <div
                                key={extra.id}
                                onClick={() => handleMemberClick(extra)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-[10px] flex items-center justify-between cursor-pointer"
                              >
                                <span className="font-bold truncate">{extra.name}</span>
                                <span className="text-[9px] text-slate-400">{extra.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════
              BOTTOM FOOTER BANNER (Faithful to Reference Image)
             ═══════════════════════════════════════════════════════ */}
          <div className="w-full mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <div className="inline-flex items-center gap-4 px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg">
              <Users className="size-5 text-sky-200" />
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase">
                Together We Plan &nbsp;|&nbsp; Together We Serve &nbsp;|&nbsp; Together We Grow
              </span>
              <Plane className="size-5 text-purple-200" />
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STAFF INSPECTOR & SELECTION SIDE DRAWER
         ═══════════════════════════════════════════════════════ */}
      {inspectedStaff && (
        <div className="absolute inset-y-0 right-0 z-40 w-96 bg-white dark:bg-[#1A2633] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-md">
                {inspectedStaff.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {inspectedStaff.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {inspectedStaff.role || 'Team Member'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setInspectedStaff(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            
            {/* Selection Mode Notice if validation fails */}
            {selectionMode && currentInspectValidation && !currentInspectValidation.allowed && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2 font-black mb-1">
                  <AlertTriangle className="size-4 text-rose-600" />
                  <span>Selection Blocked by Logic</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {currentInspectValidation.reason}
                </p>
              </div>
            )}

            {/* Seniority & DOA Badges */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                  Seniority Grade
                </span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {inspectedStaff.gradeLevel || 'L8'} Tier
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                  Employment Status
                </span>
                <span className={`text-xs font-black ${inspectedStaff.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {inspectedStaff.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Department & Employee Code */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Department:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{inspectedStaff.department || 'General'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Employee Code:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{inspectedStaff.employeeCode || `#${inspectedStaff.id}`}</span>
              </div>
              {inspectedStaff.email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Email:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]">{inspectedStaff.email}</span>
                </div>
              )}
            </div>

            {/* Upward Chain of Command */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="size-3.5 text-indigo-500" />
                Upward Reporting Ladder
              </h4>
              <div className="space-y-1.5">
                {inspectorUpwardChain.length > 0 ? (
                  inspectorUpwardChain.map((chainMember, idx) => (
                    <div
                      key={chainMember.id}
                      className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                        idx === 0
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400">
                          #{idx + 1}
                        </span>
                        <span>{chainMember.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {chainMember.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">No reporting manager assigned (Apex)</div>
                )}
              </div>
            </div>

            {/* Downline Subordinates */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="size-3.5 text-emerald-500" />
                Direct Subordinates ({inspectorDownlineReports.length})
              </h4>
              {inspectorDownlineReports.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {inspectorDownlineReports.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setInspectedStaff(sub)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 flex items-center justify-between text-[11px] cursor-pointer"
                    >
                      <span className="font-bold">{sub.name}</span>
                      <span className="text-[10px] text-slate-400">{sub.role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 italic">No direct subordinates assigned.</div>
              )}
            </div>

          </div>

          {/* Drawer Action Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2">
            {selectionMode && onSelectManager ? (
              <button
                disabled={currentInspectValidation ? !currentInspectValidation.allowed : false}
                onClick={() => {
                  if (currentInspectValidation?.allowed) {
                    onSelectManager(inspectedStaff.id);
                  }
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  currentInspectValidation?.allowed
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="size-4" />
                <span>Confirm as Reporting Manager</span>
              </button>
            ) : (
              onEditStaff && inspectedStaff.id !== 0 && (
                <button
                  onClick={() => onEditStaff(inspectedStaff)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UserCheck className="size-4" />
                  <span>Edit Profile & Permissions</span>
                </button>
              )
            )}
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SMART ROLE ASSIGNMENT MODAL (All Employees + Dept Relevant)
         ═══════════════════════════════════════════════════════ */}
      {assignmentModalTarget && (
        <RoleAssignmentModal
          isOpen={true}
          onClose={() => setAssignmentModalTarget(null)}
          roleBlueprint={assignmentModalTarget.role}
          deptBlueprint={assignmentModalTarget.dept}
          staff={activeStaffList}
          currentlyAssignedStaff={
            populatedModel.departments
              .find(d => d.blueprint.id === assignmentModalTarget.dept.id)
              ?.roles.find(r => r.blueprint.id === assignmentModalTarget.role.id)
              ?.assignedStaff || []
          }
          onAssignStaff={async (staffId, roleTitle, deptName, gradeLevel) => {
            // Optimistic instant state update
            setActiveStaffList(prev => prev.map(s => s.id === staffId ? {
              ...s,
              role: roleTitle,
              department: deptName,
              gradeLevel: gradeLevel
            } : s));

            if (onUpdateStaff) {
              await onUpdateStaff(staffId, {
                role: roleTitle,
                department: deptName,
                gradeLevel: gradeLevel
              });
            }
          }}
          onUnassignStaff={async (staffId) => {
            // Optimistic instant state update
            setActiveStaffList(prev => prev.map(s => s.id === staffId ? {
              ...s,
              role: 'General Staff',
              department: 'Unassigned'
            } : s));

            if (onUpdateStaff) {
              await onUpdateStaff(staffId, {
                role: 'General Staff',
                department: 'Unassigned'
              });
            }
          }}
        />
      )}

    </div>
  );
};
