import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
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
  const { bookings, staff } = useData();

  // State
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

  // Active Ref for Chat Auto-Scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  // Load conversations on mount & poll every 8 seconds
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages whenever selected customer changes
  useEffect(() => {
    if (selectedCustomerId !== null) {
      fetchMessages(selectedCustomerId);
    } else {
      setMessages([]);
    }
  }, [selectedCustomerId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !chatInput.trim() || sending) return;

    setSending(true);
    const msgToSend = chatInput.trim();
    try {
      const res = await fetch(`${API_BASE}/api/admin/chat/conversations/${selectedCustomerId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: msgToSend })
      });
      if (!res.ok) throw new Error('Failed to send message.');
      
      setChatInput('');
      
      // Optimistic update local messages
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          customer_id: selectedCustomerId,
          booking_id: null,
          sender_type: 'admin',
          message: msgToSend,
          created_at: new Date().toISOString()
        }
      ]);

      // Update conversation list item
      setConversations(prev => 
        prev.map(c => c.customer_id === selectedCustomerId 
          ? { ...c, last_message: msgToSend, last_message_at: new Date().toISOString() } 
          : c
        )
      );

    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // 4. Update Ticket Status / Priority / Assignment
  const handleUpdateTicket = async (updates: { status?: string; priority?: string; assignedStaffId?: string | null }) => {
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
    } catch (err: any) {
      toast.error(err.message || 'Error updating ticket');
    }
  };

  // Selected customer details helper
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.customer_id === selectedCustomerId) || null;
  }, [conversations, selectedCustomerId]);

  // Selected customer bookings list helper
  const customerBookings = useMemo(() => {
    if (!activeConversation) return [];
    return bookings.filter(b => 
      b.customerId === String(selectedCustomerId) || 
      b.customerEmail?.toLowerCase() === activeConversation.customer_email.toLowerCase()
    );
  }, [bookings, activeConversation, selectedCustomerId]);

  // Filtered Conversations List
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchesSearch = c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [conversations, searchQuery, statusFilter, priorityFilter]);

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
          {/* Quick Filters */}
          <div className="flex gap-1.5 overflow-x-auto select-none no-scrollbar pt-1">
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
                    <p className="text-[11px] text-slate-400 dark:text-slate-550 truncate mt-1 leading-snug">
                      {conv.last_message || 'No messages yet.'}
                    </p>
                    <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
                      <div className="flex gap-1 items-center">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          conv.priority === 'High' ? 'bg-rose-100 border-rose-200 text-rose-600' :
                          conv.priority === 'Medium' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                          'bg-slate-105 border-slate-200 text-slate-500'
                        }`}>
                          {conv.priority}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          conv.status === 'Open' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' :
                          conv.status === 'Snoozed' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                          'bg-slate-105 border-slate-200 text-slate-600'
                        }`}>
                          {conv.status}
                        </span>
                      </div>
                      {unread && (
                        <span className="size-5 bg-orange-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm shrink-0">
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
              <div className="min-w-0">
                <h3 className="font-display font-black text-slate-800 dark:text-white text-sm truncate">
                  {activeConversation?.customer_name}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate leading-tight mt-0.5">
                  {activeConversation?.customer_email}
                </p>
              </div>

              {/* Status and Priority Controls */}
              <div className="flex gap-2.5 items-center">
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
                <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
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
                  return (
                    <div key={msg.id || i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                        isAdmin 
                          ? 'bg-slate-950 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-850 rounded-tl-none'
                      }`}>
                        <p>{msg.message}</p>
                        <span className={`block text-[8px] font-bold mt-1 text-right ${isAdmin ? 'text-slate-400' : 'text-slate-400'}`}>
                          {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Canned Responses bar in Chat Area */}
            <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-850 flex gap-2 overflow-x-auto select-none no-scrollbar">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center shrink-0">Quick Reply:</span>
              {CANNED_RESPONSES[0].items.concat(CANNED_RESPONSES[2].items).slice(0, 4).map((resp, i) => (
                <button
                  key={i}
                  onClick={() => setChatInput(resp.text)}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-350 hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
                  title={resp.text}
                >
                  {resp.title}
                </button>
              ))}
            </div>

            {/* Chat Send Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 flex gap-3">
              <input
                type="text"
                placeholder="Type response to customer..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-grow h-11 px-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={sending || !chatInput.trim()}
                className="h-11 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Send
              </button>
            </form>
          </>
        )}
      </section>

      {/* ─── RIGHT COLUMN: CUSTOMER DETAIL PANEL & CANNED RESPONSES ─── */}
      {selectedCustomerId !== null && activeConversation && (
        <aside className="w-80 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 h-full overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
          
          {/* Customer Profile Card */}
          <div className="p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Customer Profile</h4>
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
                  <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                    {activeConversation.travel_preferences}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Recent Bookings */}
          <div className="p-5 space-y-3.5">
            <h4 className="text-[10px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest">Linked Bookings</h4>
            {customerBookings.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold italic py-2">No bookings linked to this email.</p>
            ) : (
              <div className="space-y-2.5">
                {customerBookings.slice(0, 3).map(b => (
                  <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-[11px] truncate shrink-0 max-w-[130px]">
                        {b.package_name || b.destination || 'Custom Trip'}
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
                      <span>Travel Date: {b.travel_date ? format(new Date(b.travel_date), 'MMM dd, yyyy') : 'Pending'}</span>
                      <span className="text-slate-700 dark:text-slate-350">₹{b.total_price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canned Library Panel */}
          <div className="p-5 space-y-4 flex-1 flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Canned Replies Library</h4>
            <div className="space-y-4 overflow-y-auto max-h-64 pr-1">
              {CANNED_RESPONSES.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[9px] text-[#C9732A] font-black uppercase tracking-wider block">{cat.category}</span>
                  <div className="space-y-1.5">
                    {cat.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => setChatInput(item.text)}
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
    </div>
  );
};
