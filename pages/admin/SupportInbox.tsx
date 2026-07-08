import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Conversation {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  loyalty_points: number;
  referral_code: string | null;
  travel_preferences: string | null;
  status: 'Open' | 'Snoozed' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  assigned_staff_id: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  customer_id: number;
  booking_id: string | null;
  sender_type: 'customer' | 'admin' | 'staff';
  message: string;
  created_at: string;
}

const CANNED_RESPONSES = [
  {
    category: 'Greetings',
    items: [
      { title: 'Welcome Greeting', text: 'Hello! Welcome to Shrawello Travel Hub Support. How can I assist you with your travel plans today?' },
      { title: 'Response Acknowledgment', text: 'Thank you for reaching out to us. I am looking into your request right now and will get back to you shortly.' }
    ]
  },
  {
    category: 'Bookings & Packages',
    items: [
      { title: 'Share Package Details', text: 'I would be happy to share our premium itineraries for that destination! You can also view all available packages in the Holidays section.' },
      { title: 'Confirm Customization', text: 'We can absolutely customize this itinerary for you. Could you please share your preferred travel dates and budget?' }
    ]
  },
  {
    category: 'Payments & Refunds',
    items: [
      { title: 'Payment Reminder', text: 'This is a friendly reminder that the balance payment for your upcoming trip is due. You can upload the payment receipt directly in your portal under My Bookings.' },
      { title: 'Refund Policy', text: 'As per our policy, cancellations made 15 days before departure are eligible for a 50% refund. Please submit a cancellation request in your dashboard to initiate the process.' }
    ]
  },
  {
    category: 'Closing',
    items: [
      { title: 'Query Resolved', text: 'I am glad I could assist you! I am marking this query as resolved. Feel free to reach out if you need anything else. Have a wonderful day!' }
    ]
  }
];

export const SupportInbox: React.FC = () => {
  const { bookings } = useData();
  const { staff, currentUser } = useAuth();

  // Core Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Snoozed' | 'Resolved'>('Open');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<'All' | 'My' | 'Unassigned'>('All');

  // Advanced Features State
  const [isInternal, setIsInternal] = useState(false); // Internal notes toggle
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<any | null>(null); // Clicked booking details
  const [cannedReplies, setCannedReplies] = useState<any[]>([]); // Dynamic canned replies from DB
  const [cannedSearch, setCannedSearch] = useState(''); // Canned replies filter
  const [timeline, setTimeline] = useState<any[]>([]); // Customer journey timeline
  const [auditLogs, setAuditLogs] = useState<any[]>([]); // Ticket audit logs
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false); // Audit logs visibility
  const [newTagInput, setNewTagInput] = useState(''); // Tag input field
  const [translatedMsgIds, setTranslatedMsgIds] = useState<Record<number, string>>({}); // Mock translations store
  const [showSlashMenu, setShowSlashMenu] = useState(false); // Canned reply `/` overlay
  const [slashSearch, setSlashSearch] = useState(''); // Text typed after `/` for filtering

  // Active Ref for Chat Auto-Scroll and Typing Debounce
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Get Admin JWT Auth Token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('shravya_jwt');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch support conversations.');
      const data = await res.json();
      setConversations(data);
    } catch (err: any) {
      toast.error(err.message || 'Error loading support conversations');
    } finally {
      setLoadingConv(false);
    }
  };

  // 2. Fetch Chat Messages for selected customer
  const fetchMessages = async (customerId: number) => {
    setLoadingMsg(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${customerId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load message history.');
      const data = await res.json();
      setMessages(data);

      // Reset local unread count for this customer
      setConversations(prev => 
        prev.map(c => c.customer_id === customerId ? { ...c, unread_count: 0 } : c)
      );
    } catch (err: any) {
      toast.error(err.message || 'Error loading chat messages');
    } finally {
      setLoadingMsg(false);
    }
  };

  // 3. Fetch Journey Timeline
  const fetchTimeline = async (customerId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${customerId}/timeline`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTimeline(data);
      }
    } catch (err) {
      console.error('Error loading timeline', err);
    }
  };

  // 4. Fetch Audit Logs
  const fetchAuditLogs = async (customerId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${customerId}/audit-logs`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error loading audit logs', err);
    }
  };

  // 5. Fetch Canned Replies from Database
  const fetchCannedReplies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/canned-replies`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCannedReplies(data);
      }
    } catch (err) {
      console.error('Error loading canned replies', err);
    }
  };

  // Load conversations and canned replies on mount & poll conversations
  useEffect(() => {
    fetchConversations();
    fetchCannedReplies();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch details whenever selected customer changes
  useEffect(() => {
    if (selectedCustomerId !== null) {
      fetchMessages(selectedCustomerId);
      fetchTimeline(selectedCustomerId);
      fetchAuditLogs(selectedCustomerId);
      setTranslatedMsgIds({});
    } else {
      setMessages([]);
      setTimeline([]);
      setAuditLogs([]);
    }
  }, [selectedCustomerId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. Send Message / Internal Note
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !chatInput.trim() || sending) return;

    setSending(true);
    const msgToSend = chatInput.trim();
    const noteMode = isInternal;

    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedCustomerId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          message: msgToSend, 
          isInternal: noteMode,
          bookingId: activeConversation?.booking_id 
        })
      });
      if (!res.ok) throw new Error('Failed to send message.');
      
      setChatInput('');
      setIsInternal(false);
      setShowSlashMenu(false);
      
      // Optimistic update local messages
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          customer_id: selectedCustomerId,
          booking_id: activeConversation?.booking_id || null,
          sender_type: 'admin',
          message: msgToSend,
          is_internal: noteMode,
          created_at: new Date().toISOString()
        } as any
      ]);

      // Update conversation list item
      setConversations(prev => 
        prev.map(c => c.customer_id === selectedCustomerId 
          ? { 
              ...c, 
              last_message: noteMode ? `[Note] ${msgToSend}` : msgToSend, 
              last_message_at: new Date().toISOString() 
            } 
          : c
        )
      );

      // Refresh Audit Logs
      fetchAuditLogs(selectedCustomerId);

    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // 7. Update Ticket Settings (Status, Priority, Assigned Staff, Linked Booking, Tags, Sentiment)
  const handleUpdateTicket = async (updates: { 
    status?: string; 
    priority?: string; 
    assignedStaffId?: string | null;
    bookingId?: string | null;
    tags?: string | null;
    sentiment?: string;
  }) => {
    if (!selectedCustomerId) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedCustomerId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update ticket settings.');

      // Update local conversation state
      setConversations(prev => 
        prev.map(c => c.customer_id === selectedCustomerId ? { ...c, ...updates } : c)
      );
      toast.success('Ticket updated successfully');
      fetchAuditLogs(selectedCustomerId);
    } catch (err: any) {
      toast.error(err.message || 'Error updating ticket');
    }
  };

  // 8. Handle Typing Indicators
  const sendTypingStatus = async (isTyping: boolean) => {
    if (!selectedCustomerId) return;
    try {
      await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedCustomerId}/typing`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isTyping })
      });
    } catch (err) {
      console.warn('Failed to send typing status', err);
    }
  };

  const handleInputChange = (val: string) => {
    setChatInput(val);

    // Typing indicator trigger
    sendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 3000);

    // Keyboard `/` shortcut for canned responses
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashSearch(lastWord.substring(1).toLowerCase());
    } else {
      setShowSlashMenu(false);
    }
  };

  const selectCannedResponse = (text: string) => {
    // Replace the slash shortcut word with the full text
    const words = chatInput.split(' ');
    words.pop(); // Remove the `/` word
    const baseText = words.join(' ');
    setChatInput(baseText ? `${baseText} ${text}` : text);
    setShowSlashMenu(false);
  };

  // 9. Mock Translation Utility
  const translateMessage = (msgId: number, originalText: string) => {
    if (translatedMsgIds[msgId]) {
      // Toggle off
      setTranslatedMsgIds(prev => {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      });
      return;
    }

    // Basic mock dictionary for demonstrating translations
    let translation = "Google Cloud Translation (Simulated): ";
    const textLower = originalText.toLowerCase();
    if (textLower.includes('hello') || textLower.includes('hi')) {
      translation += "नमस्ते! कैसे हो आप?";
    } else if (textLower.includes('booking') || textLower.includes('trip')) {
      translation += "क्या मैं आपकी बुकिंग या आगामी यात्रा में सहायता कर सकता हूँ?";
    } else if (textLower.includes('payment') || textLower.includes('money')) {
      translation += "कृपया ध्यान दें कि आपका भुगतान अभी लंबित है।";
    } else {
      // General translation mock (reversing or placeholder)
      translation += `[Translated to Hindi] ${originalText.split(' ').reverse().join(' ')}`;
    }

    setTranslatedMsgIds(prev => ({ ...prev, [msgId]: translation }));
  };

  // Helper Memoizations
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.customer_id === selectedCustomerId) || null;
  }, [conversations, selectedCustomerId]);

  const customerBookings = useMemo(() => {
    if (!activeConversation) return [];
    return bookings.filter(b => 
      b.customerId === String(selectedCustomerId) || 
      b.customerEmail?.toLowerCase() === activeConversation.customer_email.toLowerCase()
    );
  }, [bookings, activeConversation, selectedCustomerId]);

  // Sidebar List Filter
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchesSearch = c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      
      // Assignee Filter
      const matchesAssignee = 
        assigneeFilter === 'All' ? true :
        assigneeFilter === 'My' ? String(c.assigned_staff_id) === String(currentUser?.id) :
        !c.assigned_staff_id; // Unassigned

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [conversations, searchQuery, statusFilter, priorityFilter, assigneeFilter, currentUser]);

  // Dynamic Queue Position Calculation
  const getQueuePosition = (conv: Conversation) => {
    if (conv.status !== 'Open' || conv.assigned_staff_id) return null;
    
    // Sort all open unassigned tickets by last_message_at
    const openUnassigned = conversations
      .filter(c => c.status === 'Open' && !c.assigned_staff_id)
      .sort((a, b) => new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime());

    const idx = openUnassigned.findIndex(c => c.customer_id === conv.customer_id);
    return idx !== -1 ? idx + 1 : null;
  };

  // Filter Canned Replies Library
  const filteredCannedReplies = useMemo(() => {
    const list = cannedReplies.length > 0 ? cannedReplies : [
      { id: 1, title: 'Welcome Greeting', category: 'Greetings', text: 'Hello! Welcome to Shrawello Travel Hub Support. How can I assist you with your travel plans today?' },
      { id: 2, title: 'Response Acknowledgment', category: 'Greetings', text: 'Thank you for reaching out to us. I am looking into your request right now and will get back to you shortly.' },
      { id: 3, title: 'Share Package Details', category: 'Bookings & Packages', text: 'I would be share our premium itineraries for that destination! You can also view all available packages in the Holidays section.' },
      { id: 4, title: 'Confirm Customization', category: 'Bookings & Packages', text: 'We can absolutely customize this itinerary for you. Could you please share your preferred travel dates and budget?' },
      { id: 5, title: 'Payment Reminder', category: 'Payments & Refunds', text: 'This is a friendly reminder that the balance payment for your upcoming trip is due. You can upload the payment receipt directly in your portal under My Bookings.' },
      { id: 6, title: 'Refund Policy', category: 'Payments & Refunds', text: 'As per our policy, cancellations made 15 days before departure are eligible for a 50% refund. Please submit a cancellation request in your dashboard to initiate the process.' }
    ];

    return list.filter(item => 
      item.title.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      item.text.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(cannedSearch.toLowerCase())
    );
  }, [cannedReplies, cannedSearch]);

  // Filter Slash Overlay canned replies
  const filteredSlashReplies = useMemo(() => {
    const list = cannedReplies.length > 0 ? cannedReplies : [
      { id: 1, title: 'Welcome Greeting', text: 'Hello! Welcome to Shrawello Travel Hub Support. How can I assist you today?' },
      { id: 2, title: 'Response Acknowledgment', text: 'Thank you for reaching out to us. I am looking into your request right now.' },
      { id: 5, title: 'Payment Reminder', text: 'This is a friendly reminder that the balance payment for your upcoming trip is due.' }
    ];
    return list.filter(item => 
      item.title.toLowerCase().includes(slashSearch) ||
      item.text.toLowerCase().includes(slashSearch)
    );
  }, [cannedReplies, slashSearch]);

  // Handle Tag Addition
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim().replace('#', '');
    const currentTags = activeConversation?.tags ? activeConversation.tags.split(',') : [];
    if (!currentTags.includes(tag)) {
      const updatedTags = [...currentTags, tag].join(',');
      handleUpdateTicket({ tags: updatedTags });
    }
    setNewTagInput('');
  };

  // Handle Tag Deletion
  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = activeConversation?.tags ? activeConversation.tags.split(',') : [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove).join(',');
    handleUpdateTicket({ tags: updatedTags || null });
  };

  // Parse sentiment emoji and styles
  const getSentimentStyles = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return { emoji: '😊', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700' };
      case 'Frustrated': return { emoji: '😠', bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-700 animate-pulse' };
      default: return { emoji: '😐', bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-500' };
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      
      {/* ─── LEFT COLUMN: CONVERSATION LIST ─── */}
      <aside className="w-80 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 h-full">
        {/* Header and Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-850 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-slate-800 dark:text-white text-base">Support Inbox</h3>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
              {conversations.filter(c => c.status === 'Open').length} Open
            </span>
          </div>
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

          {/* Quick Routing & Workload filters */}
          <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 pb-1.5 pt-0.5">
            {(['All', 'My', 'Unassigned'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAssigneeFilter(tab)}
                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                  assigneeFilter === tab
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab === 'My' ? 'Assigned to Me' : tab}
              </button>
            ))}
          </div>

          {/* Quick Ticket Status Filters */}
          <div className="flex gap-1.5 overflow-x-auto select-none no-scrollbar pt-0.5">
            {(['Open', 'Snoozed', 'Resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(statusFilter === tab ? 'All' : tab)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all whitespace-nowrap border ${
                  statusFilter === tab
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-900">
          {loadingConv && conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              <div className="animate-spin size-5 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-xs font-semibold">No queries found matching filters.</p>
          ) : (
            filteredConversations.map(conv => {
              const active = selectedCustomerId === conv.customer_id;
              const unread = conv.unread_count > 0;
              const queuePos = getQueuePosition(conv);
              return (
                <div
                  key={conv.customer_id}
                  onClick={() => setSelectedCustomerId(conv.customer_id)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 flex gap-3 ${
                    active ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  } ${unread ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                    {conv.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate leading-tight">
                        {conv.customer_name}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap pl-2">
                        {format(new Date(conv.last_message_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-555 truncate mt-1 leading-snug">
                      {conv.last_message || 'No messages yet.'}
                    </p>

                    <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
                      <div className="flex gap-1 items-center flex-wrap">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          conv.priority === 'High' ? 'bg-rose-100 border-rose-200 text-rose-600' :
                          conv.priority === 'Medium' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                          'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {conv.priority}
                        </span>
                        {queuePos !== null && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 animate-pulse">
                            Queue #{queuePos}
                          </span>
                        )}
                      </div>
                      
                      {unread && (
                        <span className="size-5 bg-orange-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm shrink-0 animate-bounce">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ─── MIDDLE COLUMN: ACTIVE CHAT SCREEN ─── */}
      <section className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 min-w-0 h-full">
        {selectedCustomerId === null ? (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-slate-800 mb-3">forum</span>
            <h3 className="font-display font-black text-slate-800 dark:text-white text-base">No Customer Selected</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
              Select a conversation from the sidebar to view history, edit query status, or send a direct reply.
            </p>
          </div>
        ) : (
          <>
            {/* Active Chat Header */}
            <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-2">
                <div>
                  <h3 className="font-display font-black text-slate-800 dark:text-white text-sm truncate">
                    {activeConversation?.customer_name}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate leading-tight mt-0.5">
                    {activeConversation?.customer_email}
                  </p>
                </div>
                {/* Audit log button */}
                <button 
                  onClick={() => setShowAuditLogsModal(true)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors ml-2"
                  title="View Query Audit Log"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </button>
              </div>

              {/* Status, Priority, Assignment Controls */}
              <div className="flex gap-2 items-center flex-wrap">
                {/* Link Booking dropdown */}
                <select
                  value={activeConversation?.booking_id || ''}
                  onChange={e => handleUpdateTicket({ bookingId: e.target.value || null })}
                  className="h-8 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-350 cursor-pointer focus:ring-1 focus:ring-primary/20 max-w-[120px]"
                >
                  <option value="">No Booking Linked</option>
                  {customerBookings.map(b => (
                    <option key={b.id} value={b.id}>
                      Link: {b.package_name || b.title || b.id.substring(0, 8)}
                    </option>
                  ))}
                </select>

                {/* Team Assignee dropdown */}
                <select
                  value={activeConversation?.assigned_staff_id || ''}
                  onChange={e => handleUpdateTicket({ assignedStaffId: e.target.value || null })}
                  className="h-8 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-350 cursor-pointer focus:ring-1 focus:ring-primary/20"
                >
                  <option value="">Unassigned</option>
                  {staff.map(member => (
                    <option key={member.id} value={String(member.id)}>{member.name}</option>
                  ))}
                </select>

                {/* Priority switcher */}
                <select
                  value={activeConversation?.priority || 'Medium'}
                  onChange={e => handleUpdateTicket({ priority: e.target.value as any })}
                  className="h-8 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-350 cursor-pointer focus:ring-1 focus:ring-primary/20"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                {/* Status Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 shrink-0">
                  {([
                    { id: 'Open', icon: 'mark_as_unread' },
                    { id: 'Snoozed', icon: 'snooze' },
                    { id: 'Resolved', icon: 'check_circle' }
                  ] as const).map(item => {
                    const active = activeConversation?.status === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleUpdateTicket({ status: item.id })}
                        className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={`Mark as ${item.id}`}
                      >
                        <span className="material-symbols-outlined text-[12px]">{item.icon}</span>
                        {item.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Messages Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMsg && messages.length === 0 ? (
                <p className="text-center text-slate-450 text-xs">Loading message logs...</p>
              ) : (
                messages.map((msg, i) => {
                  const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'staff';
                  const isMsgInternal = (msg as any).is_internal || (msg as any).is_internal === 1;
                  const translationText = translatedMsgIds[msg.id];

                  return (
                    <div key={msg.id || i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed relative group ${
                        isMsgInternal 
                          ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 border-l-4 border-l-amber-500 rounded-tr-none' 
                          : isAdmin
                            ? 'bg-slate-950 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-850 rounded-tl-none'
                      }`}>
                        {isMsgInternal && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1 select-none">
                            <span className="material-symbols-outlined text-[10px]">lock</span>
                            Internal Note
                          </div>
                        )}
                        
                        <p>{msg.message}</p>
                        
                        {/* Translation Block */}
                        {translationText && (
                          <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-primary dark:text-indigo-400 font-semibold leading-relaxed">
                            {translationText}
                          </div>
                        )}

                        <div className="flex justify-between items-center gap-4 mt-2">
                          {/* Translation trigger (for client messages) */}
                          {!isAdmin && (
                            <button 
                              onClick={() => translateMessage(msg.id, msg.message)}
                              className="text-[9px] text-primary hover:underline font-bold"
                            >
                              {translationText ? 'Show Original' : 'Translate to Hindi'}
                            </button>
                          )}
                          <span className={`block text-[8px] font-bold text-right ml-auto text-slate-400`}>
                            {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Client Typing status indicator */}
              {activeConversation?.is_customer_typing && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="font-semibold">{activeConversation.customer_name} is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Canned Responses bar in Chat Area */}
            <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-855 flex gap-2 overflow-x-auto select-none no-scrollbar">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center shrink-0">Quick Reply:</span>
              {filteredCannedReplies.slice(0, 5).map((resp, i) => (
                <button
                  key={i}
                  onClick={() => selectCannedResponse(resp.text)}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-350 hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
                  title={resp.text}
                >
                  {resp.title}
                </button>
              ))}
            </div>

            {/* Chat Send Input Box with Keyboard shortcut dropdown */}
            <div className="relative">
              {showSlashMenu && filteredSlashReplies.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-72 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 divide-y divide-slate-100 dark:divide-slate-900">
                  <div className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900">Canned replies matching: "{slashSearch}"</div>
                  {filteredSlashReplies.map(reply => (
                    <button
                      key={reply.id}
                      onClick={() => selectCannedResponse(reply.text)}
                      className="w-full text-left p-3 hover:bg-primary/5 text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate transition-colors"
                      title={reply.text}
                    >
                      <span className="text-primary font-bold text-[10px] block mb-0.5">{reply.title}</span>
                      {reply.text}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className={`p-4 border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 flex flex-col gap-3 transition-colors ${
                isInternal ? 'bg-amber-500/5 border-t-amber-300' : ''
              }`}>
                {/* Toggle Reply vs Internal Note */}
                <div className="flex gap-2 select-none">
                  <button
                    type="button"
                    onClick={() => setIsInternal(false)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      !isInternal
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">chat</span>
                    Reply to Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternal(true)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isInternal
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Internal Note
                  </button>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={isInternal ? "Type private staff note... (customer won't see)" : "Type response to customer... (use / for shortcuts)"}
                    value={chatInput}
                    onChange={e => handleInputChange(e.target.value)}
                    className={`flex-grow h-11 px-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-semibold focus:ring-2 ${
                      isInternal ? 'focus:ring-amber-500/30 bg-amber-500/5' : 'focus:ring-primary/20'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={sending || !chatInput.trim()}
                    className={`h-11 px-5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      isInternal 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{isInternal ? 'bookmark' : 'send'}</span>
                    {isInternal ? 'Save Note' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </section>

      {/* ─── RIGHT COLUMN: CUSTOMER DETAIL PANEL & CANNED RESPONSES ─── */}
      {selectedCustomerId !== null && activeConversation && (
        <aside className="w-80 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 h-full overflow-y-auto divide-y divide-slate-105 dark:divide-slate-850">
          
          {/* Customer Profile Card */}
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Customer Profile</h4>
              {/* Sentiment Indicator and corrector */}
              <div className="flex items-center gap-1">
                <select
                  value={activeConversation.sentiment || 'Neutral'}
                  onChange={e => handleUpdateTicket({ sentiment: e.target.value })}
                  className={`text-[9px] font-black uppercase pl-2 pr-6 py-0.5 rounded-full border cursor-pointer ${
                    getSentimentStyles(activeConversation.sentiment || 'Neutral').bg
                  }`}
                >
                  <option value="Neutral">😐 Neutral</option>
                  <option value="Positive">😊 Positive</option>
                  <option value="Frustrated">😠 Frustrated</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                {activeConversation.customer_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h5 className="font-bold text-slate-850 dark:text-white text-xs truncate leading-tight">
                  {activeConversation.customer_name}
                </h5>
                <p className="text-[9px] text-slate-450 dark:text-slate-550 font-bold truncate mt-0.5">
                  Ref Code: {activeConversation.referral_code || 'None'}
                </p>
              </div>
            </div>

            {/* Tags Manager */}
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider block">Query Tags:</span>
              <div className="flex flex-wrap gap-1">
                {activeConversation.tags ? activeConversation.tags.split(',').map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 border border-primary/10 text-primary text-[9px] font-bold rounded-full select-none"
                  >
                    #{tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 font-extrabold text-[8px] pl-0.5"
                    >
                      ×
                    </button>
                  </span>
                )) : (
                  <span className="text-[10px] text-slate-400 italic">No tags added yet.</span>
                )}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <input
                  type="text"
                  placeholder="Add tag (e.g. Refund)..."
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  className="w-full text-[10px] font-semibold px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-1 focus:ring-primary/25"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-[9px] text-slate-400 block font-bold">Loyalty Points</span>
                <span className="font-extrabold text-slate-850 dark:text-white">{activeConversation.loyalty_points} Pts</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-[9px] text-slate-400 block font-bold">Active Bookings</span>
                <span className="font-extrabold text-slate-850 dark:text-white">
                  {customerBookings.filter(b => b.status === 'Confirmed' || b.status === 'Active').length} Trip(s)
                </span>
              </div>
            </div>

            {/* Additional info lists */}
            <div className="space-y-2.5 text-xs font-semibold">
              {activeConversation.customer_phone && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-450 text-[10px] font-bold">Phone:</span>
                  <span className="text-slate-700 dark:text-slate-300">{activeConversation.customer_phone}</span>
                </div>
              )}
              {activeConversation.travel_preferences && (
                <div className="pt-2 border-t border-slate-50 dark:border-slate-905">
                  <span className="text-slate-450 text-[10px] font-bold block mb-1">Travel preferences:</span>
                  <p className="text-[11px] text-slate-655 dark:text-slate-350 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                    {activeConversation.travel_preferences}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Linked Bookings Cards (Click to view details) */}
          <div className="p-5 space-y-3.5">
            <h4 className="text-[10px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest">Linked Bookings</h4>
            {customerBookings.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold italic py-2">No bookings linked to this email.</p>
            ) : (
              <div className="space-y-2.5">
                {customerBookings.slice(0, 3).map(b => (
                  <div 
                    key={b.id} 
                    onClick={() => setSelectedDetailBooking(b)}
                    className="p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-primary/5 cursor-pointer rounded-xl border border-slate-100 dark:border-white/5 flex flex-col gap-1.5 transition-colors group"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-[11px] truncate shrink-0 max-w-[130px] group-hover:text-primary transition-colors">
                        {b.package_name || b.title || b.destination || 'Custom Trip'}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        b.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-650'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                      <span>Travel Date: {b.travel_date || b.booking_date ? format(new Date(b.travel_date || b.booking_date), 'MMM dd, yyyy') : 'Pending'}</span>
                      <span className="text-slate-700 dark:text-slate-355">₹{b.total_price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Journey Timeline */}
          <div className="p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Journey Timeline</h4>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1 no-scrollbar text-xs">
              {timeline.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No timeline data available.</p>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-4 space-y-4">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-primary border-2 border-white dark:border-slate-950" />
                      <div className="text-[9px] font-black text-slate-400">{format(new Date(item.date), 'MMM dd, yyyy')}</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-[11px]">{item.title}</div>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Canned Library Panel */}
          <div className="p-5 space-y-4 flex-1 flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Canned Replies Library</h4>
            
            {/* Search Library */}
            <input
              type="text"
              placeholder="Search canned replies..."
              value={cannedSearch}
              onChange={e => setCannedSearch(e.target.value)}
              className="w-full text-[10px] font-semibold px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-1 focus:ring-primary/25"
            />

            <div className="space-y-4 overflow-y-auto max-h-64 pr-1 no-scrollbar">
              {/* Grouping by category */}
              {Array.from(new Set(filteredCannedReplies.map(r => r.category))).map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[9px] text-[#C9732A] font-black uppercase tracking-wider block">{cat}</span>
                  <div className="space-y-1.5">
                    {filteredCannedReplies.filter(r => r.category === cat).map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => selectCannedResponse(item.text)}
                        className="w-full text-left p-2 bg-slate-50 hover:bg-primary/5 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/20 transition-all font-semibold text-[10px] text-slate-700 dark:text-slate-300 line-clamp-1 block"
                        title={item.text}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ─── MODAL: LINKED BOOKING DETAILS drawer ─── */}
      {selectedDetailBooking && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex justify-end z-[200]">
          <div className="w-[450px] h-full bg-white dark:bg-slate-950 shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-black text-slate-800 dark:text-white text-base">Booking Details</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">ID: {selectedDetailBooking.id}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailBooking(null)}
                className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-650"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Package Name</span>
                <p className="text-slate-900 dark:text-white font-extrabold text-sm">{selectedDetailBooking.package_name || selectedDetailBooking.title || 'Custom Travel Trip'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Travel Date</span>
                  <p className="text-slate-800 dark:text-slate-200">
                    {selectedDetailBooking.travel_date ? format(new Date(selectedDetailBooking.travel_date), 'MMM dd, yyyy') : 'Pending'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Return Date</span>
                  <p className="text-slate-800 dark:text-slate-200">
                    {selectedDetailBooking.end_date ? format(new Date(selectedDetailBooking.end_date), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">Adults</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{selectedDetailBooking.pax_adult || 1}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">Children</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{selectedDetailBooking.pax_child || 0}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">Infants</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{selectedDetailBooking.pax_infant || 0}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Booking Status</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedDetailBooking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    selectedDetailBooking.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                    'bg-slate-100 text-slate-650'
                  }`}>
                    {selectedDetailBooking.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Payment Status</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedDetailBooking.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    selectedDetailBooking.payment_status === 'failed' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-105 text-amber-700'
                  }`}>
                    {selectedDetailBooking.payment_status || 'Pending'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Total Price</span>
                <p className="text-primary font-black text-lg">₹{selectedDetailBooking.total_price?.toLocaleString()}</p>
              </div>

              {selectedDetailBooking.booking_notes && (
                <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Internal Notes</span>
                  <p className="text-slate-650 dark:text-slate-350 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl font-normal leading-relaxed">
                    {selectedDetailBooking.booking_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONVERSATION AUDIT LOGS ─── */}
      {showAuditLogsModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[200]">
          <div className="w-[500px] max-h-[80vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="font-display font-black text-slate-850 dark:text-white text-base flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                Query History Audit Log
              </h3>
              <button 
                onClick={() => setShowAuditLogsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-650"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 italic">No audit trail recorded for this query.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-black">
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-black uppercase">{log.action}</span>
                      <span>{format(new Date(log.performed_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{log.details}</p>
                    <div className="text-[10px] text-slate-450 font-bold">Performed By: {log.performed_by}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
