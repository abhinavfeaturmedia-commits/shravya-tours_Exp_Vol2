import React, { useState, useEffect, useMemo } from 'react';
import { Department, Designation, Branch } from '../../../types';
import { api } from '../../../src/lib/api';
import { toast } from 'sonner';
import { 
  Building2, Users, MapPin, Search, Plus, Trash2, Edit2, 
  Check, X, ShieldCheck, Layers, DollarSign, Percent, ArrowUpDown,
  Briefcase, CheckCircle2, ChevronDown, Sparkles
} from 'lucide-react';

const GRADE_LEVEL_CONFIG: Record<string, { label: string; title: string; color: string; bg: string }> = {
  L1: { label: 'L1', title: 'Founder Director (Ownership)', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  L2: { label: 'L2', title: 'Managing Director / CEO (Executive)', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  L3: { label: 'L3', title: 'Head of Department (Leadership)', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
  L4: { label: 'L4', title: 'Zonal / Regional Manager (Senior)', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800' },
  L5: { label: 'L5', title: 'Area / Branch Manager (Middle)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  L6: { label: 'L6', title: 'Supervisor / Asst Manager (First-Line)', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  L7: { label: 'L7', title: 'Senior Executive (Experienced)', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
  L8: { label: 'L8', title: 'Executive / Coordinator (Execution)', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700' },
};

export const OrganizationMastersTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'departments' | 'designations' | 'branches'>('designations');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', status: 'Active' as const });
  const [desigForm, setDesigForm] = useState({
    name: '',
    department_id: '',
    grade_level: 'L8' as const,
    default_discount_limit: 0,
    default_expense_limit: 0,
    status: 'Active' as const
  });
  const [branchForm, setBranchForm] = useState({ name: '', code: '', city: '', state: '', address: '', status: 'Active' as const });

  // Fetch all org data
  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, desigRes, branchRes] = await Promise.all([
        api.getDepartments(),
        api.getDesignations(),
        api.getBranches(),
      ]);
      setDepartments(deptRes);
      setDesignations(desigRes);
      setBranches(branchRes);
    } catch (e: any) {
      console.error('Failed to load org masters:', e);
      toast.error('Failed to load organization masters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered views
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [departments, search]);

  const filteredDesignations = useMemo(() => {
    return designations.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.grade_level.toLowerCase().includes(search.toLowerCase())
    );
  }, [designations, search]);

  const filteredBranches = useMemo(() => {
    return branches.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      (b.city && b.city.toLowerCase().includes(search.toLowerCase()))
    );
  }, [branches, search]);

  // Open modal handlers
  const handleOpenAdd = () => {
    setEditingId(null);
    if (subTab === 'departments') {
      setDeptForm({ name: '', code: '', description: '', status: 'Active' });
    } else if (subTab === 'designations') {
      setDesigForm({
        name: '',
        department_id: departments[0]?.id || '',
        grade_level: 'L8',
        default_discount_limit: 0,
        default_expense_limit: 0,
        status: 'Active'
      });
    } else {
      setBranchForm({ name: '', code: '', city: '', state: '', address: '', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    if (subTab === 'departments') {
      setDeptForm({ name: item.name, code: item.code, description: item.description || '', status: item.status || 'Active' });
    } else if (subTab === 'designations') {
      setDesigForm({
        name: item.name,
        department_id: item.department_id || '',
        grade_level: item.grade_level || 'L8',
        default_discount_limit: Number(item.default_discount_limit || 0),
        default_expense_limit: Number(item.default_expense_limit || 0),
        status: item.status || 'Active'
      });
    } else {
      setBranchForm({
        name: item.name,
        code: item.code,
        city: item.city || '',
        state: item.state || '',
        address: item.address || '',
        status: item.status || 'Active'
      });
    }
    setIsModalOpen(true);
  };

  // Submit handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (subTab === 'departments') {
        if (!deptForm.name || !deptForm.code) {
          toast.error('Please enter department name and code');
          return;
        }
        if (editingId) {
          await api.updateDepartment(editingId, deptForm);
          toast.success('Department updated successfully');
        } else {
          const newId = `dept_${deptForm.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          await api.createDepartment({ id: newId, ...deptForm });
          toast.success('Department created successfully');
        }
      } else if (subTab === 'designations') {
        if (!desigForm.name) {
          toast.error('Please enter designation title');
          return;
        }
        if (editingId) {
          await api.updateDesignation(editingId, desigForm);
          toast.success('Designation updated successfully');
        } else {
          const newId = `desig_${Date.now()}`;
          await api.createDesignation({ id: newId, ...desigForm });
          toast.success('Designation created successfully');
        }
      } else {
        if (!branchForm.name || !branchForm.code) {
          toast.error('Please enter branch name and code');
          return;
        }
        if (editingId) {
          await api.updateBranch(editingId, branchForm);
          toast.success('Branch updated successfully');
        } else {
          const newId = `br_${branchForm.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          await api.createBranch({ id: newId, ...branchForm });
          toast.success('Branch created successfully');
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  // Delete handler
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      if (subTab === 'departments') await api.deleteDepartment(id);
      else if (subTab === 'designations') await api.deleteDesignation(id);
      else await api.deleteBranch(id);
      toast.success(`${name} deleted`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete item: ' + err.message);
    }
  };

  const getDeptName = (deptId?: string) => {
    if (!deptId) return 'All Departments (Executive)';
    const found = departments.find(d => d.id === deptId || d.code === deptId);
    return found ? found.name : deptId;
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('designations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              subTab === 'designations'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Designations & Levels (L1–L8)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">{designations.length}</span>
          </button>

          <button
            onClick={() => setSubTab('departments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              subTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase size={16} />
            <span>Departments</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">{departments.length}</span>
          </button>

          <button
            onClick={() => setSubTab('branches')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              subTab === 'branches'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin size={16} />
            <span>Branches / Locations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">{branches.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${subTab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add {subTab === 'designations' ? 'Designation' : subTab === 'departments' ? 'Department' : 'Branch'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Tables */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading organization masters...</div>
      ) : subTab === 'designations' ? (
        /* ─── DESIGNATIONS TAB ─── */
        <div className="bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                SHRAWELLO Corporate Hierarchy & Delegation of Authority
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every designation maps directly to an L1–L8 level and controls package discount and operational expense limits.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">{filteredDesignations.length} Designations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Grade Level</th>
                  <th className="px-5 py-3">Designation Title</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3 text-right">Max Discount Limit</th>
                  <th className="px-5 py-3 text-right">Max Expense Authority</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredDesignations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">No designations found.</td>
                  </tr>
                ) : (
                  filteredDesignations.map(des => {
                    const gradeConf = GRADE_LEVEL_CONFIG[des.grade_level] || GRADE_LEVEL_CONFIG.L8;
                    return (
                      <tr key={des.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-black text-xs ${gradeConf.color} ${gradeConf.bg}`}>
                            {des.grade_level}
                            <span className="text-[10px] font-medium opacity-80">({gradeConf.title.split(' ')[0]})</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {des.name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                          {getDeptName(des.department_id)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{Number(des.default_discount_limit || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{Number(des.default_expense_limit || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            des.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {des.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(des)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                              title="Edit Designation"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(des.id, des.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Delete Designation"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'departments' ? (
        /* ─── DEPARTMENTS TAB ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map(dept => {
            const desigCount = designations.filter(d => d.department_id === dept.id).length;
            return (
              <div key={dept.id} className="p-5 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 uppercase">
                        {dept.code}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{dept.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dept.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {dept.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{dept.description || 'No description provided.'}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium">{desigCount} Designations Linked</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── BRANCHES TAB ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map(br => (
            <div key={br.id} className="p-5 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 uppercase">
                      {br.code}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{br.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    br.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {br.status || 'Active'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span>{br.city ? `${br.city}, ${br.state || ''}` : 'Location unassigned'}</span>
                  </p>
                  {br.address && <p className="text-[11px] text-slate-400 pl-4">{br.address}</p>}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1 text-xs text-slate-400">
                <button
                  onClick={() => handleOpenEdit(br)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(br.id, br.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a2332] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingId ? 'Edit' : 'Add New'} {subTab === 'designations' ? 'Designation' : subTab === 'departments' ? 'Department' : 'Branch'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {subTab === 'departments' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department Name *</label>
                    <input
                      type="text"
                      required
                      value={deptForm.name}
                      onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                      placeholder="e.g. Sales & Business Development"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department Code (Short) *</label>
                    <input
                      type="text"
                      required
                      value={deptForm.code}
                      onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SALES"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={deptForm.description}
                      onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                      placeholder="Core responsibilities and functions"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {subTab === 'designations' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Designation Title *</label>
                    <input
                      type="text"
                      required
                      value={desigForm.name}
                      onChange={e => setDesigForm({ ...desigForm, name: e.target.value })}
                      placeholder="e.g. Senior Tour Consultant"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grade Level (Hierarchy) *</label>
                      <select
                        value={desigForm.grade_level}
                        onChange={e => setDesigForm({ ...desigForm, grade_level: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="L1">L1 - Founder Director (Ownership)</option>
                        <option value="L2">L2 - Managing Director / CEO (Executive)</option>
                        <option value="L3">L3 - Head of Department (Leadership)</option>
                        <option value="L4">L4 - Zonal / Regional Manager</option>
                        <option value="L5">L5 - Area Manager / Branch Manager</option>
                        <option value="L6">L6 - Supervisor / Asst Manager</option>
                        <option value="L7">L7 - Senior Executive</option>
                        <option value="L8">L8 - Executive / Coordinator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                      <select
                        value={desigForm.department_id}
                        onChange={e => setDesigForm({ ...desigForm, department_id: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Departments (Executive)</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Discount Limit (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={desigForm.default_discount_limit}
                        onChange={e => setDesigForm({ ...desigForm, default_discount_limit: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Expense Authority (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={desigForm.default_expense_limit}
                        onChange={e => setDesigForm({ ...desigForm, default_expense_limit: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {subTab === 'branches' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Name *</label>
                    <input
                      type="text"
                      required
                      value={branchForm.name}
                      onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="e.g. Pune Regional Office"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Code *</label>
                    <input
                      type="text"
                      required
                      value={branchForm.code}
                      onChange={e => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. BR-PUN"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
                      <input
                        type="text"
                        value={branchForm.city}
                        onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                        placeholder="Pune"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                      <input
                        type="text"
                        value={branchForm.state}
                        onChange={e => setBranchForm({ ...branchForm, state: e.target.value })}
                        placeholder="Maharashtra"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                    <textarea
                      rows={2}
                      value={branchForm.address}
                      onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                      placeholder="Office address"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  {editingId ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
