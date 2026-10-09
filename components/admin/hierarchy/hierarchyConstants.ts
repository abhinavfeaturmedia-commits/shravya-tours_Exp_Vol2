export interface HierarchyTier {
  grade: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';
  title: string;
  shortLabel: string;
  authority: string;
  theme: {
    border: string;
    bg: string;
    pill: string;
    text: string;
    activeRing: string;
    dropGlow: string;
    accentBg: string;
  };
}

export const HIERARCHY_TIERS: HierarchyTier[] = [
  {
    grade: 'L1',
    title: 'Founder & Managing Director',
    shortLabel: 'Apex Authority',
    authority: 'Highest Executive & Unlimited DOA',
    theme: {
      border: 'border-purple-300 dark:border-purple-800',
      bg: 'bg-purple-50/70 dark:bg-purple-950/20',
      pill: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-300',
      activeRing: 'ring-purple-500 shadow-purple-500/20',
      dropGlow: 'ring-4 ring-purple-400 bg-purple-100/90 dark:bg-purple-900/60 shadow-lg shadow-purple-500/30 scale-[1.02]',
      accentBg: 'bg-purple-600'
    }
  },
  {
    grade: 'L2',
    title: 'Director / C-Level Executive',
    shortLabel: 'Strategic Leadership',
    authority: 'Cross-Department Executive Oversight',
    theme: {
      border: 'border-indigo-300 dark:border-indigo-800',
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
      pill: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
      text: 'text-indigo-700 dark:text-indigo-300',
      activeRing: 'ring-indigo-500 shadow-indigo-500/20',
      dropGlow: 'ring-4 ring-indigo-400 bg-indigo-100/90 dark:bg-indigo-900/60 shadow-lg shadow-indigo-500/30 scale-[1.02]',
      accentBg: 'bg-indigo-600'
    }
  },
  {
    grade: 'L3',
    title: 'Head of Department (HOD)',
    shortLabel: 'Department Leadership',
    authority: 'Full Department Approvals & Operations',
    theme: {
      border: 'border-blue-300 dark:border-blue-800',
      bg: 'bg-blue-50/70 dark:bg-blue-950/20',
      pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      activeRing: 'ring-blue-500 shadow-blue-500/20',
      dropGlow: 'ring-4 ring-blue-400 bg-blue-100/90 dark:bg-blue-900/60 shadow-lg shadow-blue-500/30 scale-[1.02]',
      accentBg: 'bg-blue-600'
    }
  },
  {
    grade: 'L4',
    title: 'Branch Head / Senior Manager',
    shortLabel: 'Regional Operations',
    authority: 'Branch Level Oversight & Delegation',
    theme: {
      border: 'border-cyan-300 dark:border-cyan-800',
      bg: 'bg-cyan-50/70 dark:bg-cyan-950/20',
      pill: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
      text: 'text-cyan-700 dark:text-cyan-300',
      activeRing: 'ring-cyan-500 shadow-cyan-500/20',
      dropGlow: 'ring-4 ring-cyan-400 bg-cyan-100/90 dark:bg-cyan-900/60 shadow-lg shadow-cyan-500/30 scale-[1.02]',
      accentBg: 'bg-cyan-600'
    }
  },
  {
    grade: 'L5',
    title: 'Team Lead / Operations Manager',
    shortLabel: 'Mid-Management',
    authority: 'Team & Shift Execution',
    theme: {
      border: 'border-teal-300 dark:border-teal-800',
      bg: 'bg-teal-50/70 dark:bg-teal-950/20',
      pill: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border-teal-300 dark:border-teal-700',
      text: 'text-teal-700 dark:text-teal-300',
      activeRing: 'ring-teal-500 shadow-teal-500/20',
      dropGlow: 'ring-4 ring-teal-400 bg-teal-100/90 dark:bg-teal-900/60 shadow-lg shadow-teal-500/30 scale-[1.02]',
      accentBg: 'bg-teal-600'
    }
  },
  {
    grade: 'L6',
    title: 'Senior Executive / Specialist',
    shortLabel: 'Experienced Execution',
    authority: 'Escalated Bookings & Supplier Lead',
    theme: {
      border: 'border-emerald-300 dark:border-emerald-800',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
      pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-300',
      activeRing: 'ring-emerald-500 shadow-emerald-500/20',
      dropGlow: 'ring-4 ring-emerald-400 bg-emerald-100/90 dark:bg-emerald-900/60 shadow-lg shadow-emerald-500/30 scale-[1.02]',
      accentBg: 'bg-emerald-600'
    }
  },
  {
    grade: 'L7',
    title: 'Executive / Field Supervisor',
    shortLabel: 'First-Line Operations',
    authority: 'Daily Execution & Field Coordination',
    theme: {
      border: 'border-amber-300 dark:border-amber-800',
      bg: 'bg-amber-50/70 dark:bg-amber-950/20',
      pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      activeRing: 'ring-amber-500 shadow-amber-500/20',
      dropGlow: 'ring-4 ring-amber-400 bg-amber-100/90 dark:bg-amber-900/60 shadow-lg shadow-amber-500/30 scale-[1.02]',
      accentBg: 'bg-amber-600'
    }
  },
  {
    grade: 'L8',
    title: 'Junior Executive / Trainee',
    shortLabel: 'Frontline Support',
    authority: 'Baseline Operations & Training',
    theme: {
      border: 'border-slate-300 dark:border-slate-700',
      bg: 'bg-slate-50/70 dark:bg-slate-900/40',
      pill: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      activeRing: 'ring-slate-500 shadow-slate-500/20',
      dropGlow: 'ring-4 ring-slate-400 bg-slate-100/90 dark:bg-slate-800/90 shadow-lg shadow-slate-500/30 scale-[1.02]',
      accentBg: 'bg-slate-600'
    }
  }
];
