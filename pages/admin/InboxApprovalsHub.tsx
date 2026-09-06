import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInboxHub, UnifiedInboxItem, InboxItemCategory, InboxFolder, formatCleanDate } from '../../src/hooks/useInboxHub';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatPrice } from '../../utils/packageUtils';
import { toast } from 'sonner';

export const InboxApprovalsHub: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { allItems, counts, toggleStar, handleApprove, handleReject, handleSendBack, refetchAll } = useInboxHub();
  const { updateBooking, addTask, masterTransports, vendors, addSupplierBooking } = useData();

  // Navigation State
  const [currentFolder, setCurrentFolder] = useState<InboxFolder>('inbox');
  const [selectedCategory, setSelectedCategory] = useState<InboxItemCategory | 'all'>('all');
  const [filterPill, setFilterPill] = useState<'ALL' | 'PAYMENT' | 'CAB/OPS' | 'TASKS' | 'LEAVES' | 'FOLLOWUP' | 'KYC' | 'TRANSFER'>('ALL');
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
  const [vendorCostInput, setVendorCostInput] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('DIRECT-CAB');

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // New Request Modal State
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '' });

  // Transport vendors for quick selection
  const transportVendors = useMemo(() => {
    return (vendors || []).filter(v => v.category === 'Transport' || v.subCategory === 'Taxi/Cab');
  }, [vendors]);

  // Filter Items based on Folder, Category, FilterPills, Search
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // 1. Folder filtering
      if (currentFolder === 'inbox' && item.status !== 'Pending') return false;
      if (currentFolder === 'starred' && !item.starred) return false;
      if (currentFolder === 'authorized' && item.status !== 'Approved' && item.status !== 'Completed') return false;
      if (currentFolder === 'trash' && item.status !== 'Rejected') return false;
      if (currentFolder === 'exceptions' && item.priority !== 'Urgent') return false;

      // 2. Category channel filtering
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // 3. Filter Pills
      if (filterPill === 'PAYMENT' && item.category !== 'finance') return false;
      if (filterPill === 'CAB/OPS' && item.category !== 'operations') return false;
      if (filterPill === 'TASKS' && item.category !== 'tasks') return false;
      if (filterPill === 'LEAVES' && item.category !== 'hr') return false;
      if (filterPill === 'FOLLOWUP' && item.category !== 'crm') return false;
      if (filterPill === 'KYC' && item.category !== 'partner_kyc') return false;
      if (filterPill === 'TRANSFER' && item.category !== 'transfer') return false;

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

  // Dynamic quick template options based on active item category
  const activeTemplates = useMemo(() => {
    if (!activeItem) return [];
    switch (activeItem.category) {
      case 'finance':
        return ['Verified in Bank', 'UTR Matched', 'Advance Approved', 'Payment Mismatch'];
      case 'operations':
        return ['Driver & Cab Assigned', 'Vendor Confirmed', 'Customer Informed', 'Driver Pending'];
      case 'hr':
        return ['Approved per Policy', 'Backup Assigned', 'Low Leave Balance', 'Please Reschedule'];
      case 'tasks':
        return ['Completed & Output Verified', 'Work Approved', 'Revision Required', 'Forwarded to Manager'];
      case 'partner_kyc':
        return ['Documents & GST Verified', 'PAN Verified', 'Agreement Signed', 'Incomplete KYC Docs'];
      case 'transfer':
        return ['Ownership Approved', 'Client Reassigned', 'Rejected - Active Lead'];
      case 'crm':
        return ['Follow-up Done', 'Customer Interested', 'Rescheduled Next Week', 'Lead Unresponsive'];
      default:
        return ['Approved', 'Verified', 'Requires Clarification'];
    }
  }, [activeItem]);

  // Pre-fill quick templates in decision note
  const applyQuickTemplate = (template: string) => {
    setDecisionNote(prev => prev ? `${prev} • ${template}` : template);
  };

  // Priority color styling helper
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return {
          text: 'text-rose-600 dark:text-rose-400',
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80',
          badge: 'bg-rose-500 text-white',
          borderLeft: 'border-l-rose-500'
        };
      case 'High':
        return {
          text: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80',
          badge: 'bg-amber-500 text-white',
          borderLeft: 'border-l-amber-500'
        };
      case 'Medium':
        return {
          text: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80',
          badge: 'bg-blue-500 text-white',
          borderLeft: 'border-l-blue-400'
        };
      default:
        return {
          text: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
          badge: 'bg-slate-500 text-white',
          borderLeft: 'border-l-slate-300 dark:border-l-slate-700'
        };
    }
  };

  // Select driver/vendor quick helper
  const handleQuickSelectTransport = (val: string) => {
    if (!val) return;
    const vendor = transportVendors.find(v => v.id === val);
    if (vendor) {
      setSelectedVendorId(vendor.id);
      setDriverNameInput(vendor.contactName || vendor.name);
      setDriverPhoneInput(vendor.contactPhone || '');
      return;
    }

    const transport = (masterTransports || []).find(t => t.id === val);
    if (transport) {
      setVehicleNumberInput(`${transport.name} (${transport.type})`);
      if (transport.baseRate) setVendorCostInput(String(transport.baseRate));
    }
  };

  // Select all matching items
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredItems.map(i => i.id);
    if (selectedIds.length === allFilteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  // Execution Handlers
  const onApprove = async () => {
    if (!activeItem) return;
    setIsProcessing(true);
    try {
      // If operations driver assignment item
      if (activeItem.category === 'operations' && activeItem.type.includes('Driver Allocation')) {
        if (driverNameInput || driverPhoneInput || vehicleNumberInput) {
          const cost = Number(vendorCostInput) || 0;
          await addSupplierBooking(activeItem.originalId, {
            id: `SB-${Date.now()}`,
            bookingId: activeItem.originalId,
            vendorId: selectedVendorId || 'DIRECT-CAB',
            serviceType: 'Transport',
            driverName: driverNameInput,
            driverPhone: driverPhoneInput,
            vehicleNumber: vehicleNumberInput,
            cost: cost,
            paidAmount: 0,
            paymentStatus: 'Pending',
            bookingStatus: 'Confirmed',
            notes: decisionNote || 'Driver assigned via Inbox & Approvals Hub'
          } as any);
        }
      }

      const noteToPass = decisionNote || (driverNameInput ? `Driver ${driverNameInput}${vehicleNumberInput ? ` (${vehicleNumberInput})` : ''} assigned` : undefined);
      await handleApprove(activeItem, noteToPass);
      setDecisionNote('');
      setDriverNameInput('');
      setDriverPhoneInput('');
      setVehicleNumberInput('');
      setVendorCostInput('');
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
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      for (const id of selectedIds) {
        const item = allItems.find(x => x.id === id);
        if (item) {
          try {
            await handleApprove(item, 'Batch approved via Inbox Hub');
            successCount++;
          } catch (err: any) {
            failCount++;
            errors.push(err.message || `Item ${id}`);
          }
        }
      }
      setSelectedIds([]);
      if (failCount === 0) {
        toast.success(`All ${successCount} requests authorized successfully!`);
      } else {
        toast.warning(`${successCount} requests authorized, ${failCount} failed.`);
      }
      refetchAll();
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
    <div className="flex flex-col font-sans h-[calc(100vh-135px)] overflow-hidden">
      
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inbox & Approvals Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {counts.inbox} Pending
            </span>
            {counts.urgent > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                ⚡ {counts.urgent} Urgent SLA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Central governance queue across Payments, Leaves, Operations, Tasks, Follow-ups, KYC, and Transfers.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetchAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Refresh feed"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">refresh</span>
            <span>Sync</span>
          </button>

          <button
            onClick={() => navigate('/admin/finance-verification')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Finance Audit Table</span>
          </button>
        </div>
      </div>

      {/* ─── 3-Column Split View Layout (Viewport Bound & Non-Scrolling Window) ─── */}
      <div className="grid grid-cols-12 gap-4 mt-3 flex-1 overflow-hidden min-h-0">
        
        {/* ════════════════════════════════════════════════════════════════════
            COLUMN 1: Folder Navigation & Domain Labels (Col Span 3)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2.5 flex flex-col gap-3 overflow-y-auto pr-1">
          
          {/* Elevated New Request Button with Tactile Press Feedback */}
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>New Request / Task</span>
          </button>

          {/* Main Queues / Folders */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1 shrink-0">
            <button
              onClick={() => { setCurrentFolder('inbox'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'inbox' && selectedCategory === 'all'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-emerald-600">inbox</span>
                <span>Inbox</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                {counts.inbox}
              </span>
            </button>

            <button
              onClick={() => { setCurrentFolder('starred'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'starred'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-amber-500">star</span>
                <span>Starred / Priority</span>
              </div>
              {counts.starred > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {counts.starred}
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentFolder('authorized'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'authorized'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-blue-500">check_circle</span>
                <span>Authorized / Sent</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{counts.authorized}</span>
            </button>

            <button
              onClick={() => { setCurrentFolder('exceptions'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'exceptions'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-rose-500">bolt</span>
                <span>Exceptions & Urgent</span>
              </div>
              {counts.urgent > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                  {counts.urgent}
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentFolder('trash'); setSelectedCategory('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentFolder === 'trash'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-slate-400">delete</span>
                <span>Rejected / Trash</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{counts.rejected}</span>
            </button>
          </div>

          {/* Domain Channels / Labels with Distinct Glyphs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1">
              Domain Channels
            </span>

            {/* Finance */}
            <button
              onClick={() => { setSelectedCategory('finance'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'finance'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">payments</span>
                </span>
                <span>Finance & Payments</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.finance}</span>
            </button>

            {/* Operations */}
            <button
              onClick={() => { setSelectedCategory('operations'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'operations'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">directions_car</span>
                </span>
                <span>Operations & Cabs</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.operations}</span>
            </button>

            {/* CRM */}
            <button
              onClick={() => { setSelectedCategory('crm'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'crm'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">support_agent</span>
                </span>
                <span>CRM & Follow-ups</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.crm}</span>
            </button>

            {/* Tasks & Playbooks */}
            <button
              onClick={() => { setSelectedCategory('tasks'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'tasks'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">checklist</span>
                </span>
                <span>Tasks & Playbooks</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.tasks}</span>
            </button>

            {/* HR & Leaves */}
            <button
              onClick={() => { setSelectedCategory('hr'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'hr'
                  ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-pink-100 dark:bg-pink-950/80 text-pink-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">beach_access</span>
                </span>
                <span>HR & Staff Leaves</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.hr}</span>
            </button>

            {/* Partners & KYC */}
            <button
              onClick={() => { setSelectedCategory('partner_kyc'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'partner_kyc'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">handshake</span>
                </span>
                <span>B2B Partners & KYC</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.partner_kyc}</span>
            </button>

            {/* Transfers */}
            <button
              onClick={() => { setSelectedCategory('transfer'); setCurrentFolder('inbox'); }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'transfer'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center text-xs">
                  <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                </span>
                <span>Ownership Transfers</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{counts.byCategory.transfer}</span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            COLUMN 2: Middle Stream (List Feed & Filtering) (Col Span 4)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-4.5 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden h-full">
          
          {/* Stream Header & Search Box */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[17px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search email / request / reference..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Pills (Clean No-Scrollbar Track) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(['ALL', 'PAYMENT', 'CAB/OPS', 'TASKS', 'LEAVES', 'FOLLOWUP', 'KYC', 'TRANSFER'] as const).map(pill => (
                <button
                  key={pill}
                  onClick={() => setFilterPill(pill)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    filterPill === pill
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Floating Batch Command Bar for Fast Operations */}
            {filteredItems.length > 0 && (filterPill === 'TASKS' || selectedCategory === 'tasks' || selectedIds.length > 0) && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 animate-in fade-in text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleSelectAllFiltered}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-[11px]">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} of ${filteredItems.length} selected`
                      : `Select all ${filteredItems.length} items`}
                  </span>
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer px-1.5 py-0.5"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBatchApprove}
                      disabled={isProcessing}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      Batch Authorize ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cards Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredItems.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-2 text-emerald-600 shadow-xs">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-200 text-xs">All Caught Up!</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs font-medium">
                  {filterPill === 'PAYMENT' ? 'All payment receipts have been reconciled.' :
                   filterPill === 'CAB/OPS' ? 'All imminent departures have drivers allocated.' :
                   filterPill === 'LEAVES' ? 'All staff leaves are up to date.' :
                   filterPill === 'TASKS' ? 'No pending playbook tasks in queue.' :
                   'No pending governance requests matching your filters.'}
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = (activeItem?.id === item.id);
                const isChecked = selectedIds.includes(item.id);
                const pStyle = getPriorityStyle(item.priority);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-3 transition-all cursor-pointer flex items-start gap-2.5 relative border-l-4 ${
                      isSelected
                        ? `bg-emerald-50/70 dark:bg-emerald-950/30 ${pStyle.borderLeft}`
                        : `hover:bg-slate-50 dark:hover:bg-slate-800/50 ${pStyle.borderLeft}`
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

                    {/* Contextual Activity Icon Badge */}
                    <div className={`size-8 rounded-xl ${item.iconBgColor} flex items-center justify-center text-xs shadow-xs shrink-0 mt-0.5`}>
                      <span className="material-symbols-outlined text-[16px]">{item.activityIcon}</span>
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 dark:text-white text-xs truncate">
                          {item.requesterName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {item.timeAgo}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                        {item.title}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </p>

                      {/* Card Bottom Meta Bar */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5">
                          {item.amount !== undefined && item.amount > 0 ? (
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {formatPrice(item.amount)}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 tracking-wider truncate max-w-[130px]">
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
                            className="text-slate-400 hover:text-amber-500 cursor-pointer p-0.5 transition-colors"
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
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden h-full">
          {activeItem ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* ─── Detail Pane Header with Streamlined Top Actions ─── */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-50/80 dark:bg-slate-900/90">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`size-9 rounded-xl ${activeItem.iconBgColor} font-black flex items-center justify-center shadow-xs shrink-0`}>
                    <span className="material-symbols-outlined text-[18px]">{activeItem.activityIcon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 dark:text-white text-xs truncate">
                      {activeItem.requesterName}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate font-medium">
                      {activeItem.metadata?.department ? `${activeItem.metadata.department} · ` : ''}
                      {activeItem.requesterEmail || activeItem.requesterPhone || (activeItem.category === 'hr' ? 'Staff Member' : activeItem.category === 'tasks' ? 'Playbook Directive' : 'Requester')}
                    </p>
                  </div>
                </div>

                {/* Header Action Shortcuts */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Deep Link to Full Record */}
                  {activeItem.deepLinkUrl && (
                    <button
                      onClick={() => navigate(activeItem.deepLinkUrl!)}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Open full record"
                    >
                      <span className="hidden sm:inline text-[11px]">Open Record</span>
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    </button>
                  )}

                  {activeItem.requesterPhone && (
                    <a
                      href={`https://wa.me/${activeItem.requesterPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Open WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                    </a>
                  )}

                  <button
                    onClick={() => toggleStar(activeItem.id)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors"
                    title="Star item"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${activeItem.starred ? 'text-amber-500 fill-amber-500' : ''}`}>
                      star
                    </span>
                  </button>

                  {/* Immediate 1-Click Quick Approve in Header */}
                  {activeItem.status === 'Pending' && (
                    <button
                      onClick={onApprove}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Authorize & Approve now"
                    >
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>{isProcessing ? 'Processing...' : 'Quick Approve'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detail Content Body: Executive Command Dossier (Independent Scroll) */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5">
                
                {/* Dossier Header: Action Title & Meta */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm lg:text-base font-black text-slate-900 dark:text-white leading-snug">
                      {activeItem.title}
                    </h2>
                    <span className="text-[11px] text-slate-400 font-semibold shrink-0">
                      {activeItem.timeAgo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {activeItem.categoryLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      · {activeItem.type}
                    </span>
                  </div>
                </div>

                {/* ─── 4-Quadrant Executive Metric Grid ─── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Reference
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5 block truncate">
                      {activeItem.referenceCode || 'N/A'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${getPriorityStyle(activeItem.priority).bg}`}>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Priority
                    </span>
                    <span className={`text-xs font-black mt-0.5 block ${getPriorityStyle(activeItem.priority).text}`}>
                      {activeItem.priority}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      {activeItem.amount !== undefined ? 'Amount' : 'Due Date'}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5 block truncate">
                      {activeItem.amount !== undefined 
                        ? formatPrice(activeItem.amount) 
                        : (activeItem.dueAt ? formatCleanDate(activeItem.dueAt) : 'Pending')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Target Entity
                    </span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
                      {activeItem.metadata?.assignedToName || activeItem.metadata?.customer || activeItem.requesterName}
                    </span>
                  </div>
                </div>

                {/* ─── Domain Specific Context & Actions ─── */}

                {/* 1. Playbook Task Context */}
                {activeItem.category === 'tasks' && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex flex-col gap-2">
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">notes</span>
                      <span>Action Directives & Scope:</span>
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      {activeItem.metadata.description || activeItem.subtitle}
                    </p>
                  </div>
                )}

                {/* 2. Payment Receipt Preview */}
                {activeItem.category === 'finance' && activeItem.metadata.receiptUrl && (
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Attached Payment Proof / Bank Screenshot:
                    </span>
                    <div
                      onClick={() => setLightboxImage(activeItem.metadata.receiptUrl)}
                      className="relative h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs"
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

                {/* 3. Operations Driver Allocation Box */}
                {activeItem.category === 'operations' && activeItem.type.includes('Driver Allocation') && (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-col gap-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[17px]">directions_car</span>
                        <span>Assign Driver & Vehicle for Tour:</span>
                      </span>

                      {/* Quick picker from Master Transports / Vendors */}
                      {(transportVendors.length > 0 || (masterTransports && masterTransports.length > 0)) && (
                        <select
                          onChange={e => handleQuickSelectTransport(e.target.value)}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="">⚡ Pick Saved Vendor/Cab</option>
                          {transportVendors.map(v => (
                            <option key={v.id} value={v.id}>Vendor: {v.name}</option>
                          ))}
                          {(masterTransports || []).map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Driver Name (e.g. Ramesh)"
                        value={driverNameInput}
                        onChange={e => setDriverNameInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Driver Phone"
                        value={driverPhoneInput}
                        onChange={e => setDriverPhoneInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Vehicle No (e.g. MH 12 AB 1234)"
                        value={vehicleNumberInput}
                        onChange={e => setVehicleNumberInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Vendor Cab Cost (₹)"
                        value={vendorCostInput}
                        onChange={e => setVendorCostInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white w-44 font-medium"
                      />
                      <span className="text-[10px] text-slate-500 font-medium">Auto-creates Supplier Booking voucher</span>
                    </div>
                  </div>
                )}

                {/* 4. HR Staff Leave Card */}
                {activeItem.category === 'hr' && activeItem.type.includes('Leave') && (
                  <div className="p-3.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/60 flex flex-col gap-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[17px]">beach_access</span>
                        <span>Leave Application Summary</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300">
                        {activeItem.metadata.leaveType || 'Casual'} · {activeItem.metadata.daysCount || 1} Day(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-pink-100 dark:border-pink-900/40">
                      <div>
                        <span className="text-[9px] text-slate-400 font-black uppercase block">Employee</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {activeItem.requesterName}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {activeItem.metadata.department || 'Operations'} · {activeItem.metadata.role || 'Staff'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-black uppercase block">Leave Window</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {formatCleanDate(activeItem.metadata.startDate)} to {formatCleanDate(activeItem.metadata.endDate)}
                        </span>
                      </div>
                    </div>

                    {activeItem.metadata.reason && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-pink-100 dark:border-pink-900/40 font-medium">
                        <span className="font-black text-slate-500 block text-[9px] uppercase">Reason for Leave:</span>
                        <p className="mt-0.5">{activeItem.metadata.reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Decision Note Rich Input with Interactive Token Chips ─── */}
                {activeItem.status === 'Pending' ? (
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-slate-500">edit_note</span>
                        <span>Decision Justification Note:</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Optional for approval, required for reject</span>
                    </div>

                    {/* Interactive Template Token Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {activeTemplates.map(tpl => (
                        <button
                          key={tpl}
                          type="button"
                          onClick={() => applyQuickTemplate(tpl)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer active:scale-95"
                        >
                          + {tpl}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={decisionNote}
                      onChange={e => setDecisionNote(e.target.value)}
                      placeholder="Type your justification, approval note, or reason for rejection..."
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                ) : (
                  /* Read-only status block for Authorized or Rejected items */
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`size-3 rounded-full ${
                        activeItem.status === 'Approved' || activeItem.status === 'Completed'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`} />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          This request has already been {activeItem.status.toLowerCase()}.
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {activeItem.timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Sticky Bottom Action Suite (with Right Buffer for FAB!) ─── */}
              {activeItem.status === 'Pending' && (
                <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-2 shrink-0 sticky bottom-0 z-20 pr-16 shadow-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onSendBack}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[15px]">undo</span>
                      <span>Send Back</span>
                    </button>

                    <button
                      onClick={onReject}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                      <span>Reject</span>
                    </button>
                  </div>

                  <button
                    onClick={onApprove}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>{isProcessing ? 'Processing...' : 'Authorize & Approve'}</span>
                  </button>
                </div>
              )}

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
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Details for this governance task..."
                  value={newTaskForm.description}
                  onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={e => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium cursor-pointer"
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
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95"
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
