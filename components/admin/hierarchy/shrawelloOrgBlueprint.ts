import { StaffMember } from '../../../types';

export interface CanonicalRoleBlueprint {
  id: string;
  title: string;
  subtitle?: string;
  grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';
  iconType: string;
  keywords: string[];
}

export interface CanonicalDepartmentBlueprint {
  id: string;
  name: string;
  subtitle: string;
  colorKey: 'orange' | 'green' | 'purple' | 'cyan' | 'gold' | 'coral' | 'slate';
  theme: {
    bannerBg: string;
    bannerText: string;
    bannerSubtitle: string;
    border: string;
    cardBorder: string;
    cardBg: string;
    accentPill: string;
    iconColor: string;
    headerBg: string;
  };
  iconName: string;
  matchDepartmentKeywords: string[];
  roles: CanonicalRoleBlueprint[];
}

// 7 Departmental Pillars from the Reference Diagram
export const SHRAWELLO_DEPARTMENTS: CanonicalDepartmentBlueprint[] = [
  {
    id: 'sales',
    name: 'Sales & Business Development',
    subtitle: '(New Clients & Revenue)',
    colorKey: 'orange',
    theme: {
      bannerBg: 'bg-[#EA580C] dark:bg-[#C2410C]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-orange-100',
      border: 'border-orange-300 dark:border-orange-800',
      cardBorder: 'border-orange-200 hover:border-orange-400 dark:border-orange-900/80',
      cardBg: 'bg-orange-50/70 hover:bg-orange-50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30',
      accentPill: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/60 dark:text-orange-200 dark:border-orange-700',
      iconColor: 'text-[#EA580C] dark:text-orange-400',
      headerBg: 'bg-gradient-to-r from-orange-500 to-amber-600'
    },
    iconName: 'handshake',
    matchDepartmentKeywords: ['sales', 'business development', 'b2b', 'corporate'],
    roles: [
      {
        id: 'sales_mgr',
        title: 'Sales Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['sales manager', 'sales head', 'head of sales', 'zonal']
      },
      {
        id: 'sales_exec',
        title: 'Sales Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'user',
        keywords: ['sales executive', 'tour consultant', 'travel consultant']
      },
      {
        id: 'bde_exec',
        title: 'Business Development Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'briefcase',
        keywords: ['business development', 'bde', 'b2b executive']
      },
      {
        id: 'tele_sales',
        title: 'Tele Sales Executive',
        subtitle: '(Leads & Follow-ups)',
        grade: 'L8',
        iconType: 'phone-call',
        keywords: ['tele sales', 'telesales', 'leads', 'call center', 'inbound']
      }
    ]
  },
  {
    id: 'operations',
    name: 'Operations',
    subtitle: '(Tour Planning & Execution)',
    colorKey: 'green',
    theme: {
      bannerBg: 'bg-[#15803D] dark:bg-[#166534]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-emerald-100',
      border: 'border-emerald-300 dark:border-emerald-800',
      cardBorder: 'border-emerald-200 hover:border-emerald-400 dark:border-emerald-900/80',
      cardBg: 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
      accentPill: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700',
      iconColor: 'text-[#15803D] dark:text-emerald-400',
      headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-600'
    },
    iconName: 'settings',
    matchDepartmentKeywords: ['operation', 'ops', 'fleet', 'tour planning'],
    roles: [
      {
        id: 'ops_mgr',
        title: 'Operations Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['operations manager', 'operations head', 'head of operations', 'fleet lead']
      },
      {
        id: 'tour_planner',
        title: 'Tour Planner',
        subtitle: '(International / Domestic)',
        grade: 'L6',
        iconType: 'map',
        keywords: ['tour planner', 'planner', 'domestic', 'international']
      },
      {
        id: 'tour_coord',
        title: 'Tour Coordinator',
        subtitle: '(Reservations & Itinerary)',
        grade: 'L7',
        iconType: 'calendar',
        keywords: ['coordinator', 'reservations', 'itinerary', 'ticketing', 'booking']
      },
      {
        id: 'tour_exec',
        title: 'Tour Executive',
        subtitle: '(Client Support)',
        grade: 'L8',
        iconType: 'life-buoy',
        keywords: ['tour executive', 'field exec', 'client support', 'ops coordinator']
      }
    ]
  },
  {
    id: 'partnerships',
    name: 'Travel Partnerships & DMC',
    subtitle: '(Supplier & Partner Management)',
    colorKey: 'purple',
    theme: {
      bannerBg: 'bg-[#7E22CE] dark:bg-[#6B21A8]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-purple-100',
      border: 'border-purple-300 dark:border-purple-800',
      cardBorder: 'border-purple-200 hover:border-purple-400 dark:border-purple-900/80',
      cardBg: 'bg-purple-50/70 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
      accentPill: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/60 dark:text-purple-200 dark:border-purple-700',
      iconColor: 'text-[#7E22CE] dark:text-purple-400',
      headerBg: 'bg-gradient-to-r from-purple-600 to-indigo-600'
    },
    iconName: 'globe',
    matchDepartmentKeywords: ['partner', 'dmc', 'supplier', 'vendor', 'contract'],
    roles: [
      {
        id: 'dmc_mgr',
        title: 'Partnership Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['partnership manager', 'dmc manager', 'partner head', 'procurement head']
      },
      {
        id: 'dmc_rel',
        title: 'DMC Relations Executive',
        subtitle: '',
        grade: 'L6',
        iconType: 'network',
        keywords: ['dmc relations', 'dmc executive', 'partner executive']
      },
      {
        id: 'supp_coord',
        title: 'Supplier Coordination Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'truck',
        keywords: ['supplier coordination', 'vendor coordination', 'hotel coordinator']
      },
      {
        id: 'pricing_exec',
        title: 'Contract & Pricing Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'tag',
        keywords: ['contract', 'pricing', 'negotiation', 'rates']
      }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing & Digital',
    subtitle: '(Branding & Promotion)',
    colorKey: 'cyan',
    theme: {
      bannerBg: 'bg-[#0284C7] dark:bg-[#0369A1]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-sky-100',
      border: 'border-sky-300 dark:border-sky-800',
      cardBorder: 'border-sky-200 hover:border-sky-400 dark:border-sky-900/80',
      cardBg: 'bg-sky-50/70 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/30',
      accentPill: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-200 dark:border-sky-700',
      iconColor: 'text-[#0284C7] dark:text-sky-400',
      headerBg: 'bg-gradient-to-r from-sky-600 to-cyan-600'
    },
    iconName: 'megaphone',
    matchDepartmentKeywords: ['marketing', 'digital', 'brand', 'social', 'seo'],
    roles: [
      {
        id: 'mkt_mgr',
        title: 'Marketing Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['marketing manager', 'head of marketing', 'digital lead']
      },
      {
        id: 'social_exec',
        title: 'Social Media Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'share-2',
        keywords: ['social media', 'instagram', 'community manager']
      },
      {
        id: 'content_exec',
        title: 'Content & Design Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'palette',
        keywords: ['content', 'design', 'graphic designer', 'copywriter']
      },
      {
        id: 'seo_exec',
        title: 'Website & SEO Executive',
        subtitle: '',
        grade: 'L8',
        iconType: 'search',
        keywords: ['seo', 'website', 'webmaster', 'search marketing']
      }
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Accounts',
    subtitle: '(Billing & Compliance)',
    colorKey: 'gold',
    theme: {
      bannerBg: 'bg-[#D97706] dark:bg-[#B45309]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-amber-100',
      border: 'border-amber-300 dark:border-amber-800',
      cardBorder: 'border-amber-200 hover:border-amber-400 dark:border-amber-900/80',
      cardBg: 'bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
      accentPill: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700',
      iconColor: 'text-[#D97706] dark:text-amber-400',
      headerBg: 'bg-gradient-to-r from-amber-500 to-yellow-600'
    },
    iconName: 'coins',
    matchDepartmentKeywords: ['finance', 'account', 'billing', 'tax', 'gst'],
    roles: [
      {
        id: 'fin_mgr',
        title: 'Finance Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['finance manager', 'head of finance', 'accounts head', 'ca']
      },
      {
        id: 'accountant',
        title: 'Accountant',
        subtitle: '',
        grade: 'L6',
        iconType: 'book-open',
        keywords: ['accountant', 'senior accountant', 'tally']
      },
      {
        id: 'billing_exec',
        title: 'Billing Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'receipt',
        keywords: ['billing', 'invoice', 'clerk', 'accounts executive']
      },
      {
        id: 'compliance_exec',
        title: 'GST & TCS Compliance Executive',
        subtitle: '',
        grade: 'L7',
        iconType: 'shield-check',
        keywords: ['gst', 'tcs', 'compliance', 'tax executive', 'audit']
      }
    ]
  },
  {
    id: 'hr',
    name: 'HR & Admin',
    subtitle: '(People & Processes)',
    colorKey: 'coral',
    theme: {
      bannerBg: 'bg-[#DC2626] dark:bg-[#B91C1C]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-rose-100',
      border: 'border-rose-300 dark:border-rose-800',
      cardBorder: 'border-rose-200 hover:border-rose-400 dark:border-rose-900/80',
      cardBg: 'bg-rose-50/70 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30',
      accentPill: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-700',
      iconColor: 'text-[#DC2626] dark:text-rose-400',
      headerBg: 'bg-gradient-to-r from-rose-600 to-red-600'
    },
    iconName: 'users',
    matchDepartmentKeywords: ['hr', 'human resources', 'admin', 'administration', 'people'],
    roles: [
      {
        id: 'hr_mgr',
        title: 'HR Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['hr manager', 'head of hr', 'hr head', 'people lead']
      },
      {
        id: 'hr_exec',
        title: 'HR Executive',
        subtitle: '(Recruitment & Training)',
        grade: 'L7',
        iconType: 'user-plus',
        keywords: ['hr executive', 'recruiter', 'training', 'talent acquisition']
      },
      {
        id: 'admin_exec',
        title: 'Admin Executive',
        subtitle: '(Office Management)',
        grade: 'L7',
        iconType: 'building',
        keywords: ['admin executive', 'office management', 'facility', 'logistics']
      },
      {
        id: 'support_staff',
        title: 'Support Staff',
        subtitle: '(Helpdesk / Logistics)',
        grade: 'L8',
        iconType: 'heart-handshake',
        keywords: ['support staff', 'helpdesk', 'peon', 'office boy', 'courier']
      }
    ]
  },
  {
    id: 'support',
    name: 'Support Functions',
    subtitle: '(Technology & Systems)',
    colorKey: 'slate',
    theme: {
      bannerBg: 'bg-[#334155] dark:bg-[#1E293B]',
      bannerText: 'text-white',
      bannerSubtitle: 'text-slate-200',
      border: 'border-slate-300 dark:border-slate-700',
      cardBorder: 'border-slate-200 hover:border-slate-400 dark:border-slate-800',
      cardBg: 'bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/60',
      accentPill: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      iconColor: 'text-[#334155] dark:text-slate-400',
      headerBg: 'bg-gradient-to-r from-slate-700 to-zinc-800'
    },
    iconName: 'server',
    matchDepartmentKeywords: ['support', 'tech', 'technology', 'it', 'crm', 'automation', 'cx'],
    roles: [
      {
        id: 'it_mgr',
        title: 'IT / CRM Manager',
        subtitle: '(Head)',
        grade: 'L3',
        iconType: 'user-check',
        keywords: ['it manager', 'crm manager', 'head of tech', 'tech lead', 'cx head']
      },
      {
        id: 'crm_exec',
        title: 'CRM Executive',
        subtitle: '(Operations Support)',
        grade: 'L7',
        iconType: 'database',
        keywords: ['crm executive', 'database', 'operations support', 'customer support']
      },
      {
        id: 'it_exec',
        title: 'IT Support Executive',
        subtitle: '(Systems & Tools)',
        grade: 'L8',
        iconType: 'laptop',
        keywords: ['it support', 'network', 'system admin', 'tools', 'helpdesk it']
      }
    ]
  }
];

// Clean numeric grade value: L1 = 1, L2 = 2, ..., L8 = 8
export function parseGradeLevel(grade?: string): number {
  if (!grade) return 8;
  const match = String(grade).match(/L([1-8])/i);
  return match ? parseInt(match[1], 10) : 8;
}

/**
 * Validates whether `targetManagerId` can legally be selected as the reporting manager
 * for `editingMemberId`. Enforces:
 * 1. Self-Selection Rule (cannot report to self)
 * 2. Downline Cycle Rule (cannot report to anyone in own downline tree)
 * 3. Inactive/Vacant Rule (warns if target is Resigned/Terminated/Suspended)
 * 4. Seniority Guidance (flags junior managers)
 */
export interface HierarchyValidationResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
  isSelf: boolean;
  isSubordinate: boolean;
  isInactive: boolean;
  targetManager?: StaffMember;
  downlineIds: number[];
}

export function validateManagerSelection(
  staffList: StaffMember[],
  editingMemberId: number | null | undefined,
  targetManagerId: number | null | undefined
): HierarchyValidationResult {
  // If assigning to Apex (null = direct to Board / Founder)
  if (targetManagerId === null || targetManagerId === undefined) {
    return {
      allowed: true,
      isSelf: false,
      isSubordinate: false,
      isInactive: false,
      downlineIds: []
    };
  }

  const target = staffList.find(s => s.id === targetManagerId);

  // If no editing member specified (e.g. creating a new staff member), only check target validity
  if (!editingMemberId) {
    if (!target) {
      return {
        allowed: false,
        reason: 'Selected manager not found in records.',
        isSelf: false,
        isSubordinate: false,
        isInactive: false,
        downlineIds: []
      };
    }
    const isInactive = target.status !== 'Active' || ['Resigned', 'Terminated', 'Suspended'].includes((target as any).employmentStatus || (target as any).employment_status);
    return {
      allowed: !isInactive,
      reason: isInactive ? `${target.name} is marked ${target.status || 'Inactive'} and cannot be assigned as an active manager.` : undefined,
      isSelf: false,
      isSubordinate: false,
      isInactive,
      targetManager: target,
      downlineIds: []
    };
  }

  // 1. Self Check
  if (Number(editingMemberId) === Number(targetManagerId)) {
    return {
      allowed: false,
      reason: 'An employee cannot report to themselves.',
      isSelf: true,
      isSubordinate: false,
      isInactive: false,
      targetManager: target,
      downlineIds: []
    };
  }

  // 2. Downline Cycle Check (BFS to collect all subordinates of editingMemberId)
  const downlineIds: number[] = [];
  const queue: number[] = [Number(editingMemberId)];
  const visited = new Set<number>([Number(editingMemberId)]);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const member of staffList) {
      const repId = member.reportingToId ?? (member as any).reporting_to_id;
      if (repId !== null && repId !== undefined && Number(repId) === parentId) {
        const memId = Number(member.id);
        if (!visited.has(memId)) {
          visited.add(memId);
          downlineIds.push(memId);
          queue.push(memId);
        }
      }
    }
  }

  if (downlineIds.includes(Number(targetManagerId))) {
    return {
      allowed: false,
      reason: `Circular Reporting Loop! ${target?.name || 'Selected person'} already reports to this employee (downline subordinate).`,
      isSelf: false,
      isSubordinate: true,
      isInactive: false,
      targetManager: target,
      downlineIds
    };
  }

  // 3. Inactive Check
  const isInactive = target ? (target.status !== 'Active' || ['Resigned', 'Terminated', 'Suspended'].includes((target as any).employmentStatus || (target as any).employment_status)) : false;
  if (isInactive && target) {
    return {
      allowed: false,
      reason: `${target.name} is marked as ${target.status || 'Inactive/Vacant'}. Requests would auto-escalate upward.`,
      isSelf: false,
      isSubordinate: false,
      isInactive: true,
      targetManager: target,
      downlineIds
    };
  }

  // 4. Seniority Check warning
  const currentMember = staffList.find(s => s.id === editingMemberId);
  let warning: string | undefined;
  if (currentMember && target) {
    const memberGrade = parseGradeLevel(currentMember.gradeLevel || (currentMember as any).grade_level);
    const targetGrade = parseGradeLevel(target.gradeLevel || (target as any).grade_level);
    if (memberGrade < targetGrade) {
      warning = `Seniority Alert: This employee has a higher grade (${currentMember.gradeLevel || 'L' + memberGrade}) than the chosen manager (${target.gradeLevel || 'L' + targetGrade}).`;
    }
  }

  return {
    allowed: true,
    warning,
    isSelf: false,
    isSubordinate: false,
    isInactive: false,
    targetManager: target,
    downlineIds
  };
}

/**
 * Builds the upward chain of command for an employee
 */
export function getUpwardChain(staffList: StaffMember[], startStaffId: number): StaffMember[] {
  const chain: StaffMember[] = [];
  const visited = new Set<number>();
  let currentId: number | null | undefined = startStaffId;

  while (currentId !== null && currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const member = staffList.find(s => s.id === currentId);
    if (!member) break;
    chain.push(member);
    currentId = member.reportingToId ?? (member as any).reporting_to_id;
  }

  return chain;
}

/**
 * Maps live staff members to Shrawello Org chart roles
 */
export interface PopulatedOrgModel {
  apexFounder: StaffMember | null;
  apexMd: StaffMember | null;
  departments: {
    blueprint: CanonicalDepartmentBlueprint;
    roles: {
      blueprint: CanonicalRoleBlueprint;
      assignedStaff: StaffMember[];
    }[];
    unmappedStaff: StaffMember[];
  }[];
  unassignedStaff: StaffMember[];
}

export function buildPopulatedOrgModel(staffList: StaffMember[]): PopulatedOrgModel {
  const assignedIds = new Set<number>();

  // 1. Identify Founder (Rohit Sankpal or L1)
  let founder = staffList.find(s => {
    const grade = (s.gradeLevel || (s as any).grade_level || '').toUpperCase();
    const name = (s.name || '').toLowerCase();
    const role = (s.role || '').toLowerCase();
    return grade === 'L1' || name.includes('rohit') || role.includes('founder');
  }) || null;

  if (founder) assignedIds.add(founder.id);

  // 2. Identify Managing Director (Manali Sankpal or L2)
  let md = staffList.find(s => {
    if (founder && s.id === founder.id) return false;
    const grade = (s.gradeLevel || (s as any).grade_level || '').toUpperCase();
    const name = (s.name || '').toLowerCase();
    const role = (s.role || '').toLowerCase();
    return grade === 'L2' || name.includes('manali') || role.includes('managing director');
  }) || null;

  if (md) assignedIds.add(md.id);

  // 3. Map to 7 Departments
  const departments = SHRAWELLO_DEPARTMENTS.map(deptBlueprint => {
    // Find staff belonging to this department
    const deptStaff = staffList.filter(s => {
      if (assignedIds.has(s.id)) return false;
      const dept = (s.department || '').toLowerCase().trim();
      const isDeptMatch = deptBlueprint.matchDepartmentKeywords.some(kw => dept.includes(kw));
      if (isDeptMatch) return true;

      // Also include if department is unset or general/unassigned, but employee role/designation directly belongs to this dept
      if (!dept || dept === 'general' || dept === 'unassigned') {
        const rTitle = (s.role || '').toLowerCase().trim();
        const dTitle = (s.designationName || (s as any).designation_name || (s as any).designation || '').toLowerCase().trim();
        return deptBlueprint.roles.some(r =>
          r.title.toLowerCase().trim() === rTitle ||
          r.keywords.some(kw => rTitle.includes(kw) || dTitle.includes(kw))
        );
      }

      return false;
    });

    const mappedRoles = deptBlueprint.roles.map(roleBlueprint => {
      const assigned: StaffMember[] = [];

      deptStaff.forEach(s => {
        if (assignedIds.has(s.id)) return;
        const roleTitle = (s.role || '').toLowerCase().trim();
        const desig = (s.designationName || (s as any).designation_name || (s as any).designation || '').toLowerCase().trim();
        const desigId = (s.designationId || (s as any).designation_id || '').toLowerCase().trim();
        const targetTitle = roleBlueprint.title.toLowerCase().trim();

        // 1. Exact match on title (e.g. "Sales Executive" === "Sales Executive")
        const isExact = roleTitle === targetTitle || desig === targetTitle;
        // 2. Blueprint ID match (e.g. "desig_sales_exec" or "sales_exec")
        const isIdMatch = desigId === roleBlueprint.id.toLowerCase() || desigId === `desig_${roleBlueprint.id.toLowerCase()}`;
        // 3. Keyword match (e.g. keywords: ['sales executive', 'tour consultant', 'travel consultant'])
        const matchesKw = roleBlueprint.keywords.some(kw => {
          const cleanKw = kw.toLowerCase().trim();
          return roleTitle.includes(cleanKw) || desig.includes(cleanKw);
        });

        if (isExact || isIdMatch || matchesKw) {
          assigned.push(s);
          assignedIds.add(s.id);
        }
      });

      return {
        blueprint: roleBlueprint,
        assignedStaff: assigned
      };
    });

    // Any remaining dept staff not matched to a specific role keyword
    const unmappedInDept = deptStaff.filter(s => !assignedIds.has(s.id));
    unmappedInDept.forEach(s => assignedIds.add(s.id));

    return {
      blueprint: deptBlueprint,
      roles: mappedRoles,
      unmappedStaff: unmappedInDept
    };
  });

  // 4. Any staff remaining in entire company
  const unassignedStaff = staffList.filter(s => !assignedIds.has(s.id));

  return {
    apexFounder: founder,
    apexMd: md,
    departments,
    unassignedStaff
  };
}
