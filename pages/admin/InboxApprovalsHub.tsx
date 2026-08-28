import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInboxHub, UnifiedInboxItem, InboxItemCategory, InboxFolder } from '../../src/hooks/useInboxHub';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatPrice } from '../../utils/packageUtils';
import { toast } from 'sonner';

export const InboxApprovalsHub: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, hasPermission } = useAuth();
  const { allItems, counts, toggleStar, handleApprove, handleReject, handleSendBack, refetchAll } = useInboxHub();
  const { updateBooking, addTask } = useData();

  // Navigation State
  const [currentFolder, setCurrentFolder] = useState<InboxFolder>('inbox');
  const [selectedCategory, setSelectedCategory] = useState<InboxItemCategory | 'all'>('all');
  const [filterPill, setFilterPill] = useState<'ALL' | 'PAYMENT' | 'LEAVE' | 'CAB' | 'FOLLOWUP' | 'KYC' | 'TRANSFER' | 'TASK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Decision Note & Action State
  const [decisionNote, setDecisionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Quick Driver Assignment state for Operations items
  const [driverNameInput, setDriverNameInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // New Request Modal State
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [newRequestType, setNewRequestType] = useState<'Task' | 'Leave' | 'Transfer'>('Task');
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '' });

  // Filter Items based on Folder, Category, FilterPills, Search
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // 1. Folder filtering
      if (currentFolder === 'inbox' && item.status !== 'Pending') return false;
      if (currentFolder === 'starred' && !item.starred) return false;
      if (currentFolder === 'authorized' && item.status !== 'Approved' && item.status !== 'Completed') return false;
      if (currentFolder === 'trash' && item.status !== 'Rejected') return false;
      if (currentFolder === 'exceptions' && item.priority !== 'Urgent') return false;

      // 2. Category label filtering
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // 3. Filter Pills
      if (filterPill === 'PAYMENT' && item.category !== 'finance') return false;
      if (filterPill === 'LEAVE' && item.category !== 'hr') return false;
      if (filterPill === 'CAB' && item.category !== 'operations') return false;
      if (filterPill === 'FOLLOWUP' && item.category !== 'crm') return false;
      if (filterPill === 'KYC' && item.category !== 'partner_kyc') return false;
      if (filterPill === 'TRANSFER' && item.category !== 'transfer') return false;
      if (filterPill === 'TASK' && !item.type.includes('Task')) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSub = item.subtitle.toLowerCase().includes(q);
        const matchName = item.requesterName.toLowerCase().includes(q);
        const matchRef = item.referenceCode?.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchName && !matchRef) return false;
      }

      return true;
    });
  }, [allItems, currentFolder, selectedCategory, filterPill, searchQuery]);

  // Selected item reference
  const activeItem = useMemo(() => {
    if (selectedItemId) {
      const found = allItems.find(i => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredItems[0] || null;
  }, [allItems, selectedItemId, filteredItems]);

  // Pre-fill quick templates in decision note
  const applyQuickTemplate = (template: string) => {
    setDecisionNote(prev => prev ? `${prev} - ${template}` : template);
  };

  // Execution Handlers
  const onApprove = async () => {
    if (!activeItem) return;
    setIsProcessing(true);
    try {
      // If operations driver assignment item
      if (activeItem.category === 'operations' && activeItem.type.includes('Driver Allocation')) {
        if (driverNameInput || driverPhoneInput || vehicleNumberInput) {
          updateBooking(activeItem.originalId, {
            supplierBookings: [
              ...(activeItem.metadata.supplierBookings || []),
              {
                id: `SB-${Date.now()}`,
                bookingId: activeItem.originalId,
                vendorId: 'DIRECT-CAB',
                serviceType: 'Transport',
                driverName: driverNameInput,
                driverPhone: driverPhoneInput,
                vehicleNumber: vehicleNumberInput,
                cost: 0,
                paidAmount: 0,
                paymentStatus: 'Paid',
                bookingStatus: 'Confirmed'
              }
            ]
          });
          toast.success(`Driver ${driverNameInput || 'allocated'} assigned to booking!`);
        }
      }

      await handleApprove(activeItem, decisionNote);
      setDecisionNote('');
      setDriverNameInput('');
      setDriverPhoneInput('');
      setVehicleNumberInput('');
    } finally {
      setIsProcessing(false);
    }
  };

  const onReject = async () => {
    if (!activeItem) return;
    if (!decisionNote.trim()) {
      toast.error('Please enter a justification or reason for rejection.');
      return;
    }
    setIsProcessing(true);
    try {
      await handleReject(activeItem, decisionNote);
      setDecisionNote('');
    } finally {
      setIsProcessing(false);
    }
  };

  const onSendBack = async () => {
    if (!activeItem) return;
    if (!decisionNote.trim()) {
      toast.error('Please enter instructions or clarifications needed.');
      return;
    }
    setIsProcessing(true);
    try {
      await handleSendBack(activeItem, decisionNote);
      setDecisionNote('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch Actions
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to approve ${selectedIds.length} selected request(s)?`)) return;

    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        const item = allItems.find(x => x.id === id);
        if (item) {
          await handleApprove(item, 'Batch approved via Inbox Hub');
        }
      }
      setSelectedIds([]);
      toast.success(`${selectedIds.length} requests approved successfully!`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Create New Task / Request
  const handleCreateTask = () => {
    if (!newTaskForm.title.trim()) {
      toast.error('Please enter task title');
      return;
    }
    addTask({
      id: `TSK-${Date.now()}`,
      title: newTaskForm.title,
      description: newTaskForm.description,
      priority: newTaskForm.priority as any,
      dueDate: newTaskForm.dueDate || new Date().toISOString().split('T')[0],
      assignedTo: currentUser?.name || 'Admin',
      assignedBy: currentUser?.name || 'Admin',
      status: 'Pending',
      createdAt: new Date().toISOString()
    });
    toast.success('Task created and added to Inbox Hub!');
    setShowNewRequestModal(false);
    setNewTaskForm({ title: '', description: '', priority: 'Medium', dueDate: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans -m-6 p-6">
      
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inbox & Approvals Hub
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {counts.inbox} Pending
            </span>
            {counts.urgent > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                ⚡ {counts.urgent} Urgent SLA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central governance queue across Payments, Leaves, Operations, Follow-ups, KYC, and Transfers.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
            title="Refresh feed"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">refresh</span>
            <span>Sync</span>
          </button>

          <button
            onClick={() => navigate('/admin/finance-verification')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Finance Audit Table</span>
          </button>
        </div>
      </div>

      {/* ─── 3-Column Split View Layout ─── */}
      <div className="grid grid-cols-12 gap-5 mt-5 flex-1 min-h-[750px]">
        
        {/* ════════════════════════════════════════════════════════════════════
            COLUMN 1: Folder Navigation & Domain Labels (Col Span 3)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2.5 flex flex-col gap-4">
          
          {/* New Request Button */}
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Request</span>
          </button>

          {/* Main Queues / Folders */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <button
              onClick={() => { setCurrentFolder('inbox'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'inbox' && selectedCategory === 'all'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">inbox</span>
                <span>Inbox</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                {counts.inbox}
              </span>
            </button>

            <button
              onClick={() => { setCurrentFolder('starred'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'starred'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-amber-500">star</span>
                <span>Starred / High Priority</span>
              </div>
              {counts.starred > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {counts.starred}
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentFolder('authorized'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'authorized'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-blue-500">send</span>
                <span>Authorized / Sent</span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">{counts.authorized}</span>
            </button>

            <button
              onClick={() => { setCurrentFolder('exceptions'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'exceptions'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-rose-500">warning</span>
                <span>Exceptions & Urgent</span>
              </div>
              {counts.urgent > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                  {counts.urgent}
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentFolder('trash'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'trash'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-slate-400">delete</span>
                <span>Rejected / Trash</span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">{counts.rejected}</span>
            </button>
          </div>

          {/* Domain Channels / Labels */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1">
              Domain Channels
            </span>

            <button
              onClick={() => { setSelectedCategory('finance'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'finance'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-500"></span>
                <span>Finance & Payments</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{counts.byCategory.finance}</span>
            </button>

            <button
              onClick={() => { setSelectedCategory('operations'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'operations'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-blue-500"></span>
                <span>Operations & Cabs</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{counts.byCategory.operations}</span>
            </button>

            <button
              onClick={() => { setSelectedCategory('crm'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'crm'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-purple-500"></span>
                <span>CRM & Follow-ups</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{counts.byCategory.crm}</span>
            </button>

            <button
              onClick={() => { setSelectedCategory('hr'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'hr'
                  ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-pink-500"></span>
                <span>HR & Staff Leaves</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{counts.byCategory.hr}</span>
            </button>

            <button
              onClick={() => { setSelectedCategory('partner_kyc'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'partner_kyc'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-teal-500"></span>
                <span>B2B Partners & KYC</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{counts.byCategory.partner_kyc}</span>
            </button>

            <button
              onClick={() => { setSelectedCategory('transfer'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'transfer'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-amber-500"></span>
                <span>Ownership Transfers</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{counts.byCategory.transfer}</span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            COLUMN 2: Middle Stream (List Feed & Filtering) (Col Span 4)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-4.5 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Stream Header & Search Box */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search email / request / reference..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['ALL', 'PAYMENT', 'LEAVE', 'CAB', 'FOLLOWUP', 'KYC', 'TRANSFER'] as const).map(pill => (
                <button
                  key={pill}
                  onClick={() => setFilterPill(pill)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    filterPill === pill
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Batch Select Toolbar (Visible when items selected) */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {selectedIds.length} item(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleBatchApprove}
                    disabled={isProcessing}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    Batch Authorize
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cards Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[700px]">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="size-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-3 text-emerald-600">
                  <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">All caught up!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  No pending requests or tasks matching your current filters.
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = (activeItem?.id === item.id);
                const isChecked = selectedIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-4 transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Checkbox for batch selection */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggleSelect(item.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />

                    {/* Avatar Initials Circle */}
                    <div className={`size-10 rounded-2xl ${item.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0`}>
                      {item.requesterInitials}
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {item.requesterName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {item.timeAgo}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                        {item.title}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </p>

                      {/* Card Bottom Meta Bar */}
                      <div className="flex items-center justify-between gap-2 mt-2.5">
                        <div className="flex items-center gap-1.5">
                          {item.amount !== undefined && item.amount > 0 ? (
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {formatPrice(item.amount)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              {item.type}
                            </span>
                          )}

                          {item.priority === 'Urgent' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                              Urgent
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Star Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(item.id); }}
                            className="text-slate-400 hover:text-amber-500 cursor-pointer p-0.5"
                          >
                            <span className={`material-symbols-outlined text-[16px] ${item.starred ? 'text-amber-500 fill-amber-500' : ''}`}>
                              star
                            </span>
                          </button>

                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : item.status === 'Approved' || item.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}>
                            ● {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            COLUMN 3: Right Contextual Action Dock & Detail Pane (Col Span 5)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {activeItem ? (
            <div className="flex flex-col h-full">
              
              {/* Detail Pane Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`size-12 rounded-2xl ${activeItem.avatarColor} text-white font-black flex items-center justify-center text-sm shadow-md`}>
                    {activeItem.requesterInitials}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {activeItem.requesterName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeItem.metadata?.department ? `${activeItem.metadata.department} · ` : ''}
                      {activeItem.requesterEmail || activeItem.requesterPhone || (activeItem.category === 'hr' ? 'Staff Member' : 'Requester')}
                    </p>
                  </div>
                </div>

                {/* Quick Contact & Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {activeItem.requesterPhone && (
                    <a
                      href={`https://wa.me/${activeItem.requesterPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Open WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </a>
                  )}
                  {activeItem.requesterPhone && (
                    <a
                      href={`tel:${activeItem.requesterPhone}`}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Call Requester"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </a>
                  )}
                  <button
                    onClick={() => toggleStar(activeItem.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors"
                    title="Star item"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${activeItem.starred ? 'text-amber-500' : ''}`}>
                      star
                    </span>
                  </button>
                </div>
              </div>

              {/* Detail Content Body (Scrollable) */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 max-h-[580px]">
                
                {/* Title & Submission Time */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      {activeItem.title}
                    </h2>
                    <span className="text-xs text-slate-400 font-medium shrink-0">
                      {activeItem.timeAgo}
                    </span>
                  </div>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {activeItem.categoryLabel} · {activeItem.type}
                  </span>
                </div>

                {/* Subtitle / Reason Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {activeItem.subtitle}
                </div>

                {/* Meta Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Reference Code
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                      {activeItem.referenceCode || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {activeItem.amount !== undefined ? 'Gross Total / Value' : 'Priority Level'}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {activeItem.amount !== undefined ? formatPrice(activeItem.amount) : activeItem.priority}
                    </span>
                  </div>
                </div>

                {/* Domain Specific Previews */}
                {/* 1. Payment Receipt Preview */}
                {activeItem.category === 'finance' && activeItem.metadata.receiptUrl && (
                  <div className="mt-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Attached Payment Proof / Bank Screenshot:
                    </span>
                    <div
                      onClick={() => setLightboxImage(activeItem.metadata.receiptUrl)}
                      className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <img
                        src={activeItem.metadata.receiptUrl}
                        alt="Payment Receipt"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                        <span>Click to Enlarge</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Operations Driver Allocation Box */}
                {activeItem.category === 'operations' && activeItem.type.includes('Driver Allocation') && (
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-col gap-3">
                    <span className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">directions_car</span>
                      <span>Assign Driver & Vehicle for this Tour:</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Driver Name (e.g. Ramesh)"
                        value={driverNameInput}
                        onChange={e => setDriverNameInput(e.target.value)}
                        className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Driver Phone"
                        value={driverPhoneInput}
                        onChange={e => setDriverPhoneInput(e.target.value)}
                        className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Vehicle No (e.g. MH 12 AB 1234)"
                        value={vehicleNumberInput}
                        onChange={e => setVehicleNumberInput(e.target.value)}
                        className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* 3. HR Staff Leave Card */}
                {activeItem.category === 'hr' && activeItem.type.includes('Leave') && (
                  <div className="p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/60 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                        <span>Staff Leave Application Summary</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300">
                        {activeItem.metadata.leaveType || 'Casual'} · {activeItem.metadata.daysCount || 1} Day(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-pink-100 dark:border-pink-900/40">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Employee</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {activeItem.requesterName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {activeItem.metadata.department || 'Operations'} · {activeItem.metadata.role || 'Staff'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Leave Dates</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {activeItem.metadata.startDate} to {activeItem.metadata.endDate}
                        </span>
                      </div>
                    </div>

                    {activeItem.metadata.reason && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-pink-100 dark:border-pink-900/40">
                        <span className="font-bold text-slate-500 block text-[10px] uppercase">Reason for Leave:</span>
                        <p className="mt-0.5 font-medium">{activeItem.metadata.reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Decision Note Rich Input */}
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">edit_note</span>
                      <span>Decision Justification Note:</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Optional for approval, required for reject</span>
                  </div>

                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('Verified against bank statement')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      + Bank Verified
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('Approved as per leave policy')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      + Leave Approved
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('Assigned driver verified')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      + Driver Assigned
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={decisionNote}
                    onChange={e => setDecisionNote(e.target.value)}
                    placeholder="Type your justification, approval note, or reason for rejection..."
                    className="w-full p-3 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSendBack}
                    disabled={isProcessing}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
                  >
                    Send Back
                  </button>

                  <button
                    onClick={onReject}
                    disabled={isProcessing}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                </div>

                <button
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{isProcessing ? 'Processing...' : 'Authorize & Approve'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-700">touch_app</span>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No Request Selected</p>
              <p className="text-xs mt-1">Select an item from the stream to view full context and approve.</p>
            </div>
          )}
        </div>

      </div>

      {/* ─── Lightbox Modal for Receipt Images ─── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <img src={lightboxImage} alt="Enlarged Receipt" className="w-full h-full object-contain max-h-[80vh] rounded-2xl" />
          </div>
        </div>
      )}

      {/* ─── Modal for New Request / Task ─── */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Create New Request / Task
              </h3>
              <button onClick={() => setShowNewRequestModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Verify payment proof with Axis bank"
                  value={newTaskForm.title}
                  onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Details for this governance task..."
                  value={newTaskForm.description}
                  onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={e => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.dueDate}
                    onChange={e => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                  </input>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
