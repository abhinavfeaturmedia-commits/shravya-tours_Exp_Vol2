import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  referral_code?: string;
  loyalty_points?: number;
  travel_preferences?: string;
  last_message?: string;
  last_message_at: string;
  status: 'Open' | 'Snoozed' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  assigned_staff_id?: string | null;
  booking_id?: string | null;
  unread_count: number;
  tags?: string | null;
  sentiment?: 'Neutral' | 'Positive' | 'Frustrated';
  is_customer_typing?: boolean;
}

interface Message {
  id: number;
  customer_id: number;
  booking_id?: string | null;
  sender_type: 'admin' | 'staff' | 'customer';
  message: string;
  is_internal: boolean | number;
  created_at: string;
}

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
}

interface AuditLog {
  id: number;
  action: string;
  details: string;
  performed_by: string;
  performed_at: string;
}

interface CannedReply {
  id: number;
  title: string;
  category: string;
  text: string;
}

const DEFAULT_CANNED_REPLIES: CannedReply[] = [
  { id: 1, title: 'Welcome Greeting', category: 'Greetings', text: 'Hello! Welcome to Shrawello Travel Hub Support. How can I assist you with your travel plans today?' },
  { id: 2, title: 'Response Acknowledgment', category: 'Greetings', text: 'Thank you for reaching out to us. I am looking into your request right now and will get back to you shortly.' },
  { id: 3, title: 'Share Package Details', category: 'Bookings & Packages', text: 'I would be happy to share our premium itineraries for that destination! You can also view all available packages in the Holidays section.' },
  { id: 4, title: 'Confirm Customization', category: 'Bookings & Packages', text: 'We can absolutely customize this itinerary for you. Could you please share your preferred travel dates and budget?' },
  { id: 5, title: 'Payment Reminder', category: 'Payments & Refunds', text: 'This is a friendly reminder that the balance payment for your upcoming trip is due. You can upload the payment receipt directly in your portal under My Bookings.' },
  { id: 6, title: 'Refund Policy', category: 'Payments & Refunds', text: 'As per our policy, cancellations made 15 days before departure are eligible for a 50% refund. Please submit a cancellation request in your dashboard to initiate the process.' },
];

const API_BASE = '';

// ─── Component ────────────────────────────────────────────────────────────────

export const SupportInbox: React.FC = () => {
  const { bookings } = useData();
  const { staff, currentUser } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Snoozed' | 'Resolved'>('Open');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'All' | 'My' | 'Unassigned'>('All');
  const [cannedReplies, setCannedReplies] = useState<CannedReply[]>([]);
  const [cannedSearch, setCannedSearch] = useState('');
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [showCannedPopup, setShowCannedPopup] = useState(false);
  const [bookingDetailModal, setBookingDetailModal] = useState<any | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth Header ───────────────────────────────────────────────────────────
  const authHeader = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('shravya_jwt')}`,
    'Content-Type': 'application/json',
  }), []);

  // ─── Fetch Conversations ───────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to fetch conversations.');
      const data = await res.json();
      setConversations(data);
    } catch (err: any) {
      toast.error(err.message || 'Error loading support conversations');
    } finally {
      setIsLoading(false);
    }
  }, [authHeader]);

  // ─── Fetch Messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (customerId: number) => {
    setIsMessagesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${customerId}`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load message history.');
      const data = await res.json();
      setMessages(data);
      setConversations(prev => prev.map(c => c.customer_id === customerId ? { ...c, unread_count: 0 } : c));
    } catch (err: any) {
      toast.error(err.message || 'Error loading chat messages');
    } finally {
      setIsMessagesLoading(false);
    }
  }, [authHeader]);

  // ─── Fetch Timeline ────────────────────────────────────────────────────────
  const fetchTimeline = useCallback(async (customerId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${customerId}/timeline`, { headers: authHeader() });
      if (res.ok) setTimeline(await res.json());
    } catch (err) { console.error('Error loading timeline', err); }
  }, [authHeader]);

  // ─── Fetch Audit Logs ──────────────────────────────────────────────────────
  const fetchAuditLogs = useCallback(async (customerId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${customerId}/audit-logs`, { headers: authHeader() });
      if (res.ok) setAuditLogs(await res.json());
    } catch (err) { console.error('Error loading audit logs', err); }
  }, [authHeader]);

  // ─── Fetch Canned Replies ──────────────────────────────────────────────────
  const fetchCannedReplies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/canned-replies`, { headers: authHeader() });
      if (res.ok) setCannedReplies(await res.json());
    } catch { console.error('Error loading canned replies'); }
  }, [authHeader]);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
    fetchCannedReplies();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchCannedReplies]);

  useEffect(() => {
    if (selectedId !== null) {
      fetchMessages(selectedId);
      fetchTimeline(selectedId);
      fetchAuditLogs(selectedId);
      setTranslatedMessages({});
    } else {
      setMessages([]);
      setTimeline([]);
      setAuditLogs([]);
    }
  }, [selectedId, fetchMessages, fetchTimeline, fetchAuditLogs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const selectedConversation = useMemo(
    () => conversations.find(c => c.customer_id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const customerBookings = useMemo(() => {
    if (!selectedConversation) return [];
    return bookings.filter(b =>
      b.customerId === String(selectedId) ||
      b.customerEmail?.toLowerCase() === selectedConversation.customer_email.toLowerCase(),
    );
  }, [bookings, selectedConversation, selectedId]);

  const filteredConversations = useMemo(() => conversations.filter(c => {
    const matchSearch = c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || c.priority === priorityFilter;
    const matchAssignment = assignmentFilter === 'All'
      ? true
      : assignmentFilter === 'My'
        ? String(c.assigned_staff_id) === String(currentUser?.id)
        : !c.assigned_staff_id;
    return matchSearch && matchStatus && matchPriority && matchAssignment;
  }), [conversations, searchQuery, statusFilter, priorityFilter, assignmentFilter, currentUser]);

  const activeCannedReplies = useMemo(() => {
    const base = cannedReplies.length > 0 ? cannedReplies : DEFAULT_CANNED_REPLIES;
    return base.filter(r =>
      r.title.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      r.text.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      r.category.toLowerCase().includes(cannedSearch.toLowerCase()),
    );
  }, [cannedReplies, cannedSearch]);

  const quickReplies = useMemo(() => {
    const base = cannedReplies.length > 0 ? cannedReplies : DEFAULT_CANNED_REPLIES;
    return base.filter(r =>
      r.title.toLowerCase().includes(quickReplySearch) ||
      r.text.toLowerCase().includes(quickReplySearch),
    );
  }, [cannedReplies, quickReplySearch]);

  const getQueuePosition = (conv: Conversation): number | null => {
    if (conv.status !== 'Open' || conv.assigned_staff_id) return null;
    const sorted = conversations
      .filter(c => c.status === 'Open' && !c.assigned_staff_id)
      .sort((a, b) => new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime());
    const idx = sorted.findIndex(c => c.customer_id === conv.customer_id);
    return idx !== -1 ? idx + 1 : null;
  };

  // ─── Update Ticket ─────────────────────────────────────────────────────────
  const updateTicket = async (updates: Partial<Conversation>) => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedId}/status`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update ticket settings.');
      setConversations(prev => prev.map(c => c.customer_id === selectedId ? { ...c, ...updates } : c));
      toast.success('Ticket updated successfully');
      fetchAuditLogs(selectedId);
    } catch (err: any) {
      toast.error(err.message || 'Error updating ticket');
    }
  };

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !messageInput.trim() || isSending) return;
    setIsSending(true);
    const text = messageInput.trim();
    const internal = isInternalNote;
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedId}`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          message: text,
          isInternal: internal,
          bookingId: selectedConversation?.booking_id,
        }),
      });
      if (!res.ok) throw new Error('Failed to send message.');
      setMessageInput('');
      setIsInternalNote(false);
      setShowCannedPopup(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        customer_id: selectedId,
        booking_id: selectedConversation?.booking_id ?? null,
        sender_type: 'admin',
        message: text,
        is_internal: internal,
        created_at: new Date().toISOString(),
      }]);
      setConversations(prev => prev.map(c => c.customer_id === selectedId
        ? { ...c, last_message: internal ? `[Note] ${text}` : text, last_message_at: new Date().toISOString() }
        : c,
      ));
      fetchAuditLogs(selectedId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Typing Indicator ──────────────────────────────────────────────────────
  const sendTypingStatus = async (isTyping: boolean) => {
    if (!selectedId) return;
    try {
      await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedId}/typing`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ isTyping }),
      });
    } catch { /* silent fail */ }
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    sendTypingStatus(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTypingStatus(false), 3000);

    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('/')) {
      setShowCannedPopup(true);
      setQuickReplySearch(lastWord.substring(1).toLowerCase());
    } else {
      setShowCannedPopup(false);
    }
  };

  const insertCannedReply = (text: string) => {
    const parts = messageInput.split(' ');
    parts.pop();
    const prefix = parts.join(' ');
    setMessageInput(prefix ? `${prefix} ${text}` : text);
    setShowCannedPopup(false);
  };

  // ─── Tag Management ────────────────────────────────────────────────────────
  const addTag = () => {
    if (!tagInput.trim() || !selectedConversation) return;
    const tag = tagInput.trim().replace('#', '');
    const existing = selectedConversation.tags?.split(',') ?? [];
    if (!existing.includes(tag)) {
      updateTicket({ tags: [...existing, tag].join(',') } as any);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    const remaining = (selectedConversation?.tags?.split(',') ?? []).filter(t => t !== tag).join(',');
    updateTicket({ tags: remaining || null } as any);
  };

  // ─── Translate ─────────────────────────────────────────────────────────────
  const toggleTranslate = (msgId: number, text: string) => {
    if (translatedMessages[msgId]) {
      setTranslatedMessages(prev => { const n = { ...prev }; delete n[msgId]; return n; });
      return;
    }
    // Simulated translation (same as original build)
    let translated = 'Google Cloud Translation (Simulated): ';
    const lower = text.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi')) translated += 'नमस्ते! कैसे हो आप?';
    else if (lower.includes('booking') || lower.includes('trip')) translated += 'क्या मैं आपकी बुकिंग या आगामी यात्रा में सहायता कर सकता हूँ?';
    else if (lower.includes('payment') || lower.includes('money')) translated += 'कृपया ध्यान दें कि आपका भुगतान अभी लंबित है।';
    else translated += `[Translated to Hindi] ${text.split(' ').reverse().join(' ')}`;
    setTranslatedMessages(prev => ({ ...prev, [msgId]: translated }));
  };

  // ─── Sentiment UI ──────────────────────────────────────────────────────────
  const getSentimentStyle = (sentiment?: string) => {
    switch (sentiment) {
      case 'Positive': return { emoji: '😊', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700' };
      case 'Frustrated': return { emoji: '😠', bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-700 animate-pulse' };
      default: return { emoji: '😐', bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-500' };
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-120px)] flex bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">

      {/* ── LEFT: Conversation List ─────────────────────────────────────────── */}
      <aside className="w-80 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-slate-800 dark:text-white text-base">Support Inbox</h3>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
              {conversations.filter(c => c.status === 'Open').length} Open
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 text-xs font-semibold rounded-xl border-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Assignment filter */}
          <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 pb-1.5 pt-0.5">
            {(['All', 'My', 'Unassigned'] as const).map(f => (
              <button
                key={f}
                onClick={() => setAssignmentFilter(f)}
                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${assignmentFilter === f ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-700'}`}
              >
                {f === 'My' ? 'Assigned to Me' : f}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 overflow-x-auto select-none no-scrollbar pt-0.5">
            {(['Open', 'Snoozed', 'Resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all whitespace-nowrap border ${statusFilter === s ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:text-slate-800'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-900">
          {isLoading && conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              <div className="animate-spin size-5 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-xs font-semibold">No queries found matching filters.</p>
          ) : filteredConversations.map(conv => {
            const isSelected = selectedId === conv.customer_id;
            const hasUnread = conv.unread_count > 0;
            const queuePos = getQueuePosition(conv);
            return (
              <div
                key={conv.customer_id}
                onClick={() => setSelectedId(conv.customer_id)}
                className={`p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 flex gap-3 ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''} ${hasUnread ? 'bg-amber-500/5' : ''}`}
              >
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                  {conv.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate leading-tight">{conv.customer_name}</h4>
                    <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap pl-2">
                      {format(new Date(conv.last_message_at), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1 leading-snug">{conv.last_message || 'No messages yet.'}</p>
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
                    <div className="flex gap-1 items-center flex-wrap">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${conv.priority === 'High' ? 'bg-rose-100 border-rose-200 text-rose-600' : conv.priority === 'Medium' ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                        {conv.priority}
                      </span>
                      {queuePos !== null && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 animate-pulse">
                          Queue #{queuePos}
                        </span>
                      )}
                    </div>
                    {hasUnread && (
                      <span className="size-5 bg-orange-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm shrink-0 animate-bounce">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── CENTER: Chat Area ───────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 min-w-0 h-full">
        {selectedId === null ? (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-slate-800 mb-3">forum</span>
            <h3 className="font-display font-black text-slate-800 dark:text-white text-base">No Customer Selected</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
              Select a conversation from the sidebar to view history, edit query status, or send a direct reply.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4 shrink-0">
              <div className="min-w-0 flex items-center gap-2">
                <div>
                  <h3 className="font-display font-black text-slate-800 dark:text-white text-sm truncate">{selectedConversation?.customer_name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold truncate leading-tight mt-0.5">{selectedConversation?.customer_email}</p>
                </div>
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors ml-2"
                  title="View Query Audit Log"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </button>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {/* Booking link */}
                <select
                  value={selectedConversation?.booking_id ?? ''}
                  onChange={e => updateTicket({ booking_id: e.target.value || null } as any)}
                  className="h-8 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer focus:ring-1 focus:ring-primary/20 max-w-[120px]"
                >
                  <option value="">No Booking Linked</option>
                  {customerBookings.map(b => (
                    <option key={b.id} value={b.id}>Link: {(b as any).package_name || (b as any).title || b.id.substring(0, 8)}</option>
                  ))}
                </select>

                {/* Assign staff */}
                <select
                  value={selectedConversation?.assigned_staff_id ?? ''}
                  onChange={e => updateTicket({ assigned_staff_id: e.target.value || null } as any)}
                  className="h-8 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer focus:ring-1 focus:ring-primary/20"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>

                {/* Priority */}
                <select
                  value={selectedConversation?.priority ?? 'Medium'}
                  onChange={e => updateTicket({ priority: e.target.value as any })}
                  className="h-8 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer focus:ring-1 focus:ring-primary/20"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                {/* Status toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 shrink-0">
                  {([{ id: 'Open', icon: 'mark_as_unread' }, { id: 'Snoozed', icon: 'snooze' }, { id: 'Resolved', icon: 'check_circle' }] as const).map(item => {
                    const active = selectedConversation?.status === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => updateTicket({ status: item.id } as any)}
                        title={`Mark as ${item.id}`}
                        className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${active ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        <span className="material-symbols-outlined text-[12px]">{item.icon}</span>
                        {item.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isMessagesLoading && messages.length === 0 ? (
                <p className="text-center text-slate-400 text-xs">Loading message logs...</p>
              ) : messages.map((msg, idx) => {
                const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'staff';
                const isInternal = !!msg.is_internal;
                const translated = translatedMessages[msg.id];
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed relative group ${isInternal ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 border-l-4 border-l-amber-500 text-amber-900 dark:text-amber-200 rounded-tr-none' : isAdmin ? 'bg-slate-950 text-white rounded-tr-none' : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none'}`}>
                      {isInternal && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1 select-none">
                          <span className="material-symbols-outlined text-[10px]">lock</span>
                          Internal Note
                        </div>
                      )}
                      <p>{msg.message}</p>
                      {translated && (
                        <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-primary font-semibold leading-relaxed">
                          {translated}
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-4 mt-2">
                        {!isAdmin && (
                          <button onClick={() => toggleTranslate(msg.id, msg.message)} className="text-[9px] text-primary hover:underline font-bold">
                            {translated ? 'Show Original' : 'Translate to Hindi'}
                          </button>
                        )}
                        <span className="block text-[8px] font-bold text-right ml-auto text-slate-400">
                          {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {selectedConversation?.is_customer_typing && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="font-semibold">{selectedConversation.customer_name} is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick reply bar */}
            <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto select-none no-scrollbar shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center shrink-0">Quick Reply:</span>
              {activeCannedReplies.slice(0, 5).map((r, i) => (
                <button
                  key={i}
                  onClick={() => insertCannedReply(r.text)}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold text-slate-600 hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
                  title={r.text}
                >
                  {r.title}
                </button>
              ))}
            </div>

            {/* Message composer */}
            <div className="relative shrink-0">
              {/* Canned reply popup */}
              {showCannedPopup && quickReplies.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-72 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 divide-y divide-slate-100 dark:divide-slate-900">
                  <div className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
                    Canned replies matching: "{quickReplySearch}"
                  </div>
                  {quickReplies.map(r => (
                    <button key={r.id} onClick={() => insertCannedReply(r.text)} className="w-full text-left p-3 hover:bg-primary/5 text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate transition-colors" title={r.text}>
                      <span className="text-primary font-bold text-[10px] block mb-0.5">{r.title}</span>
                      {r.text}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleSend}
                className={`p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-3 transition-colors ${isInternalNote ? 'bg-amber-500/5 border-t-amber-300' : ''}`}
              >
                {/* Mode toggle */}
                <div className="flex gap-2 select-none">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${!isInternalNote ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">chat</span>
                    Reply to Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${isInternalNote ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Internal Note
                  </button>
                </div>

                {/* Input row */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={isInternalNote ? 'Type private staff note... (customer won\'t see)' : 'Type response to customer... (use / for shortcuts)'}
                    value={messageInput}
                    onChange={e => handleInputChange(e.target.value)}
                    className={`flex-grow h-11 px-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-semibold focus:ring-2 ${isInternalNote ? 'focus:ring-amber-500/30 bg-amber-500/5' : 'focus:ring-primary/20'}`}
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageInput.trim()}
                    className={`h-11 px-5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 ${isInternalNote ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{isInternalNote ? 'bookmark' : 'send'}</span>
                    {isInternalNote ? 'Save Note' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </section>

      {/* ── RIGHT: Customer Details Panel ───────────────────────────────────── */}
      {selectedId !== null && selectedConversation && (
        <aside className="w-80 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 h-full overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">

          {/* Customer Profile */}
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Profile</h4>
              <select
                value={selectedConversation.sentiment ?? 'Neutral'}
                onChange={e => updateTicket({ sentiment: e.target.value as any })}
                className={`text-[9px] font-black uppercase pl-2 pr-6 py-0.5 rounded-full border cursor-pointer ${getSentimentStyle(selectedConversation.sentiment).bg}`}
              >
                <option value="Neutral">😐 Neutral</option>
                <option value="Positive">😊 Positive</option>
                <option value="Frustrated">😠 Frustrated</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                {selectedConversation.customer_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h5 className="font-bold text-slate-800 dark:text-white text-xs truncate leading-tight">{selectedConversation.customer_name}</h5>
                <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">Ref Code: {selectedConversation.referral_code ?? 'None'}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider block">Query Tags:</span>
              <div className="flex flex-wrap gap-1">
                {selectedConversation.tags
                  ? selectedConversation.tags.split(',').map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 border border-primary/10 text-primary text-[9px] font-bold rounded-full select-none">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500 font-extrabold text-[8px] pl-0.5">×</button>
                    </span>
                  ))
                  : <span className="text-[10px] text-slate-400 italic">No tags added yet.</span>
                }
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <input
                  type="text"
                  placeholder="Add tag (e.g. Refund)..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  className="w-full text-[10px] font-semibold px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-1 focus:ring-primary/25"
                />
                <button type="button" onClick={addTag} className="px-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold">Add</button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-[9px] text-slate-400 block font-bold">Loyalty Points</span>
                <span className="font-extrabold text-slate-800 dark:text-white">{selectedConversation.loyalty_points ?? 0} Pts</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-[9px] text-slate-400 block font-bold">Active Bookings</span>
                <span className="font-extrabold text-slate-800 dark:text-white">
                  {customerBookings.filter(b => b.status === 'Confirmed' || b.status === 'Active').length} Trip(s)
                </span>
              </div>
            </div>

            {/* Extra info */}
            <div className="space-y-2.5 text-xs font-semibold">
              {selectedConversation.customer_phone && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 text-[10px] font-bold">Phone:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedConversation.customer_phone}</span>
                </div>
              )}
              {selectedConversation.travel_preferences && (
                <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] font-bold block mb-1">Travel preferences:</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                    {selectedConversation.travel_preferences}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Linked Bookings */}
          <div className="p-5 space-y-3.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Bookings</h4>
            {customerBookings.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold italic py-2">No bookings linked to this email.</p>
            ) : (
              <div className="space-y-2.5">
                {customerBookings.slice(0, 3).map(b => (
                  <div
                    key={b.id}
                    onClick={() => setBookingDetailModal(b)}
                    className="p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-primary/5 cursor-pointer rounded-xl border border-slate-100 dark:border-white/5 flex flex-col gap-1.5 transition-colors group"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-[11px] truncate shrink-0 max-w-[130px] group-hover:text-primary transition-colors">
                        {(b as any).package_name || (b as any).title || (b as any).destination || 'Custom Trip'}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                      <span>Travel Date: {(b as any).travel_date ? format(new Date((b as any).travel_date), 'MMM dd, yyyy') : 'Pending'}</span>
                      <span className="text-slate-700 dark:text-slate-300">₹{(b as any).total_price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Journey Timeline</h4>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1 no-scrollbar text-xs">
              {timeline.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No timeline data available.</p>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-4 space-y-4">
                  {timeline.map((t, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-primary border-2 border-white dark:border-slate-950" />
                      <div className="text-[9px] font-black text-slate-400">{format(new Date(t.date), 'MMM dd, yyyy')}</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-[11px]">{t.title}</div>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{t.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Canned Replies Library */}
          <div className="p-5 space-y-4 flex-1 flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canned Replies Library</h4>
            <input
              type="text"
              placeholder="Search canned replies..."
              value={cannedSearch}
              onChange={e => setCannedSearch(e.target.value)}
              className="w-full text-[10px] font-semibold px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-1 focus:ring-primary/25"
            />
            <div className="space-y-4 overflow-y-auto max-h-64 pr-1 no-scrollbar">
              {Array.from(new Set(activeCannedReplies.map(r => r.category))).map((cat, i) => (
                <div key={i} className="space-y-2">
                  <span className="text-[9px] text-[#C9732A] font-black uppercase tracking-wider block">{cat}</span>
                  <div className="space-y-1.5">
                    {activeCannedReplies.filter(r => r.category === cat).map((r, j) => (
                      <button
                        key={j}
                        onClick={() => insertCannedReply(r.text)}
                        className="w-full text-left p-2 bg-slate-50 hover:bg-primary/5 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/20 transition-all font-semibold text-[10px] text-slate-700 dark:text-slate-300 line-clamp-1 block"
                        title={r.text}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ── Booking Detail Modal ─────────────────────────────────────────────── */}
      {bookingDetailModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex justify-end z-[200]">
          <div className="w-[450px] h-full bg-white dark:bg-slate-950 shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-black text-slate-800 dark:text-white text-base">Booking Details</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">ID: {bookingDetailModal.id}</p>
              </div>
              <button onClick={() => setBookingDetailModal(null)} className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 text-xs font-semibold">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Package Name</span>
                <p className="text-slate-900 dark:text-white font-extrabold text-sm">{bookingDetailModal.package_name || bookingDetailModal.title || 'Custom Travel Trip'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Travel Date</span>
                  <p className="text-slate-800 dark:text-slate-200">{bookingDetailModal.travel_date ? format(new Date(bookingDetailModal.travel_date), 'MMM dd, yyyy') : 'Pending'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Return Date</span>
                  <p className="text-slate-800 dark:text-slate-200">{bookingDetailModal.end_date ? format(new Date(bookingDetailModal.end_date), 'MMM dd, yyyy') : 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['Adults', bookingDetailModal.pax_adult || 1], ['Children', bookingDetailModal.pax_child || 0], ['Infants', bookingDetailModal.pax_infant || 0]].map(([label, val]) => (
                  <div key={label as string} className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 block font-bold">{label}</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">{val}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Booking Status</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${bookingDetailModal.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : bookingDetailModal.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{bookingDetailModal.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Payment Status</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${bookingDetailModal.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : bookingDetailModal.payment_status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{bookingDetailModal.payment_status || 'Pending'}</span>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Total Price</span>
                <p className="text-primary font-black text-lg">₹{bookingDetailModal.total_price?.toLocaleString()}</p>
              </div>
              {bookingDetailModal.booking_notes && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Internal Notes</span>
                  <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl font-normal leading-relaxed">{bookingDetailModal.booking_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Log Modal ───────────────────────────────────────────────────── */}
      {showAuditLog && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[200]">
          <div className="w-[500px] max-h-[80vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="font-display font-black text-slate-800 dark:text-white text-base flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                Query History Audit Log
              </h3>
              <button onClick={() => setShowAuditLog(false)} className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 italic">No audit trail recorded for this query.</p>
              ) : auditLogs.map(log => (
                <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-black">
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-black uppercase">{log.action}</span>
                    <span>{format(new Date(log.performed_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{log.details}</p>
                  <div className="text-[10px] text-slate-400 font-bold">Performed By: {log.performed_by}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};