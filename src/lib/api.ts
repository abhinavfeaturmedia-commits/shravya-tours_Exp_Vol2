import imageCompression from 'browser-image-compression';
import { Package, Booking, Lead, BookingStatus, StaffMember, Customer, MasterRoomType, MasterMealPlan, MasterActivity, MasterTransport, MasterPlan, MasterLeadSource, MasterTermsTemplate, CMSBanner, CMSTestimonial, CMSGalleryImage, CMSPost, FollowUp, Proposal, DailyTarget, TimeSession, AssignmentRule, UserActivity, Campaign, MasterHotel, Task, AuditLog, Expense } from '../../types';

// ─── BASE API URL ───
// In dev mode, use Vite proxy (empty string) so request goes to the same origin.
// Only override if VITE_API_URL is explicitly set (e.g. for production, use '').
const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Fetch Helper ───
async function fetchApi(path: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('shravya_jwt');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `API Error: ${res.status}`);
    }
    return res.json();
}

// CRUD helpers
const crud = {
    getAll: (table: string, opts?: { order?: string; asc?: boolean; limit?: number; filters?: Record<string, string> }) => {
        const params = new URLSearchParams();
        if (opts?.order) params.set('order', opts.order);
        if (opts?.asc !== undefined) params.set('asc', String(opts.asc));
        if (opts?.limit) params.set('limit', String(opts.limit));
        if (opts?.filters) {
            Object.entries(opts.filters).forEach(([k, v]) => params.set(`eq_${k}`, v));
        }
        const qs = params.toString();
        return fetchApi(`/api/crud/${table}${qs ? `?${qs}` : ''}`);
    },
    getOne: (table: string, id: string | number) => fetchApi(`/api/crud/${table}/${encodeURIComponent(String(id))}`),
    create: (table: string, body: any) => fetchApi(`/api/crud/${table}`, { method: 'POST', body: JSON.stringify(body) }),
    update: (table: string, id: string | number, body: any) => fetchApi(`/api/crud/${table}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (table: string, id: string | number) => fetchApi(`/api/crud/${table}/${encodeURIComponent(String(id))}`, { method: 'DELETE' }),
    upsert: (table: string, body: any) => fetchApi(`/api/crud/${table}/upsert`, { method: 'POST', body: JSON.stringify(body) }),
};

// --- IMAGE COMPRESSION UTILITY ---
const MAX_FILE_SIZE_KB = 800;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_KB * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function compressImageFile(file: File): Promise<File> {
    if (!IMAGE_TYPES.includes(file.type)) return file;
    if (file.size <= MAX_FILE_SIZE_BYTES) {
        console.log(`[Compress] Skipped: ${file.name} is already ${(file.size / 1024).toFixed(0)}KB`);
        return file;
    }
    console.log(`[Compress] Compressing ${file.name}: ${(file.size / 1024).toFixed(0)}KB → target <${MAX_FILE_SIZE_KB}KB`);
    const options = {
        maxSizeMB: MAX_FILE_SIZE_KB / 1024,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type === 'image/png' ? 'image/webp' as const : undefined,
    };
    try {
        const compressed = await imageCompression(file, options);
        console.log(`[Compress] Done: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${((1 - compressed.size / file.size) * 100).toFixed(0)}% smaller)`);
        return compressed;
    } catch (err) {
        console.warn('[Compress] Compression failed, uploading original:', err);
        return file;
    }
}

const parseJsonFieldSafe = (field: any, defaultValue: any) => {
    if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return defaultValue; }
    }
    return field || defaultValue;
};

const mapPackage = (row: any): Package => ({
    id: row.id,
    title: row.title,
    days: row.days,
    groupSize: row.group_size || 'Family',
    location: row.location || '',
    description: row.description || '',
    price: row.price,
    image: row.image || '',
    remainingSeats: row.remaining_seats,
    highlights: parseJsonFieldSafe(row.features, []).map((f: string) => ({ icon: 'star', label: f })),
    itinerary: [],
    theme: row.theme || 'Tour',
    overview: row.overview || row.description || '',
    status: row.status as any || 'Active',
    offerEndTime: row.offer_end_time,
    included: parseJsonFieldSafe(row.included, []),
    notIncluded: parseJsonFieldSafe(row.not_included, []),
    gallery: parseJsonFieldSafe(row.gallery, []),
    builderData: parseJsonFieldSafe(row.builder_data, null)
});

export const api = {
    // --- PACKAGES ---
    getPackages: async (): Promise<Package[]> => {
        const { data } = await crud.getAll('packages', { order: 'created_at', asc: false });
        return (data || []).map(mapPackage);
    },

    createPackage: async (pkg: Partial<Package>) => {
        const dbPkg = {
            id: pkg.id,
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            location: pkg.location,
            days: pkg.days,
            image: pkg.image,
            features: JSON.stringify(pkg.highlights?.map(h => h.label) || []),
            remaining_seats: pkg.remainingSeats ?? 10,
            group_size: pkg.groupSize || 'Family',
            theme: pkg.theme || 'Tour',
            overview: pkg.overview || pkg.description || '',
            status: pkg.status || 'Active',
            offer_end_time: pkg.offerEndTime,
            included: JSON.stringify(pkg.included || []),
            not_included: JSON.stringify(pkg.notIncluded || []),
            gallery: pkg.gallery ? JSON.stringify(pkg.gallery) : '[]',
            builder_data: pkg.builderData ? JSON.stringify(pkg.builderData) : null
        };
        const { data } = await crud.create('packages', dbPkg);
        return mapPackage(data);
    },

    updatePackage: async (id: string, pkg: Partial<Package>) => {
        const dbPkg: any = {};
        if (pkg.title !== undefined) dbPkg.title = pkg.title;
        if (pkg.description !== undefined) dbPkg.description = pkg.description;
        if (pkg.price !== undefined) dbPkg.price = pkg.price;
        if (pkg.location !== undefined) dbPkg.location = pkg.location;
        if (pkg.days !== undefined) dbPkg.days = pkg.days;
        if (pkg.image !== undefined) dbPkg.image = pkg.image;
        if (pkg.highlights !== undefined) dbPkg.features = JSON.stringify(pkg.highlights.map(h => h.label));
        if (pkg.remainingSeats !== undefined) dbPkg.remaining_seats = pkg.remainingSeats;
        if (pkg.groupSize !== undefined) dbPkg.group_size = pkg.groupSize;
        if (pkg.theme !== undefined) dbPkg.theme = pkg.theme;
        if (pkg.overview !== undefined) dbPkg.overview = pkg.overview;
        if (pkg.status !== undefined) dbPkg.status = pkg.status;
        if (pkg.offerEndTime !== undefined) dbPkg.offer_end_time = pkg.offerEndTime;
        if (pkg.included !== undefined) dbPkg.included = JSON.stringify(pkg.included);
        if (pkg.notIncluded !== undefined) dbPkg.not_included = JSON.stringify(pkg.notIncluded);
        if (pkg.gallery !== undefined) dbPkg.gallery = JSON.stringify(pkg.gallery);
        if (pkg.builderData !== undefined) dbPkg.builder_data = JSON.stringify(pkg.builderData);
        await crud.update('packages', id, dbPkg);
    },

    deletePackage: async (id: string) => {
        await crud.remove('packages', id);
    },

    // --- TRANSACTIONS & SYSTEM ---
    generateInvoiceNumber: async (type: string): Promise<string> => {
        // Simple client-side implementation since we don't have Supabase RPC
        const prefix = type === 'booking' ? 'INV' : 'TXN';
        const timestamp = Date.now().toString(36).toUpperCase();
        return `${prefix}-${timestamp}`;
    },

    bookInventorySlot: async (dateStr: string, paxCount: number): Promise<void> => {
        // Fetch current inventory, update booked count
        try {
            const { data } = await crud.getAll('daily_inventory', { filters: { date: dateStr } });
            if (data && data.length > 0) {
                const slot = data[0];
                if (slot.booked + paxCount > slot.capacity) throw new Error('Not enough capacity');
                await crud.update('daily_inventory', slot.id, { booked: slot.booked + paxCount });
            }
        } catch (err: any) {
            throw new Error(err.message || 'Failed to lock inventory');
        }
    },

    unlockInventorySlot: async (dateStr: string, paxCount: number): Promise<void> => {
        try {
            const { data } = await crud.getAll('daily_inventory', { filters: { date: dateStr } });
            if (data && data.length > 0) {
                const slot = data[0];
                await crud.update('daily_inventory', slot.id, { booked: Math.max(0, slot.booked - paxCount) });
            }
        } catch (err: any) {
            throw new Error(err.message || 'Failed to unlock inventory');
        }
    },

    createBookingTransaction: async (bookingId: string, tx: any) => {
        await crud.create('booking_transactions', {
            booking_id: bookingId,
            date: tx.date,
            amount: tx.amount,
            type: tx.type,
            method: tx.method,
            reference: tx.reference,
            notes: tx.notes,
            status: tx.status || 'Pending',
            receipt_url: tx.receiptUrl,
            recorded_by: tx.recordedBy || 'System'  // Persist the staff name who recorded this
        });
    },

    getFinanceTransactions: async () => {
        const { data } = await fetchApi('/api/finance/booking-transactions');
        return (data || []).map((t: any) => ({
            id: String(t.id),
            bookingId: t.bookingId,
            date: t.date,
            amount: Number(t.amount),
            type: t.type,
            method: t.method,
            reference: t.reference,
            notes: t.notes,
            status: t.status || 'Pending',
            receiptUrl: t.receipt_url,
            // Joined fields
            customer: t.customer,
            email: t.email,
            phone: t.phone,
            packageId: t.packageId,
            source: t.source // 'booking_payment' | 'expense'
        }));
    },

    updateFinanceTransactionStatus: async (id: string, status: 'Pending' | 'Verified' | 'Rejected') => {
        // Expense IDs start with 'EXP-', otherwise it's a booking_transaction
        if (String(id).startsWith('EXP-')) {
            await crud.update('expenses', id, { status });
        } else {
            await crud.update('booking_transactions', id, { status });
        }
    },

    createAccountTransaction: async (accountId: string, tx: any) => {
        await crud.create('account_transactions', {
            account_id: accountId,
            date: tx.date,
            amount: tx.amount,
            type: tx.type,
            status: tx.status || 'Pending',
            description: tx.description,
            reference: tx.reference
        });
    },

    deleteBookingTransaction: async (id: string) => {
        await crud.remove('booking_transactions', id);
    },

    updateAccountTransactionStatus: async (txId: string, status: string) => {
        await crud.update('account_transactions', txId, { status });
    },

    // --- BOOKINGS ---
    getBookings: async (limit: number = 100): Promise<Booking[]> => {
        const { data } = await fetchApi(`/api/bookings-with-package`);
        return (data || []).map((row: any) => {
            const txs = (row.booking_transactions || []).map((t: any) => ({
                id: t.id,
                date: t.date,
                amount: Number(t.amount),
                type: t.type,
                method: t.method,
                reference: t.reference,
                notes: t.notes,
                status: t.status || 'Verified',
                receiptUrl: t.receipt_url,
                recordedBy: t.recorded_by || 'System'  // Map back from DB so it survives refresh
            }));

            const totalAmount = Number(row.total_price) || Number(row.amount) || 0;
            // Only consider 'Verified' transactions towards the netPaid amount
            const netPaid = txs.reduce((sum: number, t: any) => {
                if (t.status !== 'Rejected' && t.status !== 'Pending') {
                   return sum + (t.type === 'Payment' ? t.amount : t.type === 'Refund' ? -t.amount : 0);
                }
                return sum;
            }, 0);

            let dynamicPayment: BookingStatus | 'Paid' | 'Unpaid' | 'Deposit' | 'Refunded' = 'Unpaid';
            if (row.payment_status === 'paid') dynamicPayment = 'Paid';
            else if (row.payment_status === 'deposit') dynamicPayment = 'Deposit';
            else if (row.payment_status === 'refunded') dynamicPayment = 'Refunded';
            else if (netPaid >= totalAmount && totalAmount > 0) dynamicPayment = 'Paid';
            else if (netPaid > 0) dynamicPayment = 'Deposit';
            else if (netPaid < 0) dynamicPayment = 'Refunded';

            const sbs = (row.supplier_bookings || []).map((sb: any) => ({
                id: sb.id,
                bookingId: sb.booking_id,
                vendorId: sb.vendor_id,
                serviceType: sb.service_type,
                confirmationNumber: sb.confirmation_number,
                cost: Number(sb.cost) || 0,
                paidAmount: Number(sb.paid_amount) || 0,
                paymentStatus: sb.payment_status,
                bookingStatus: sb.booking_status,
                paymentDueDate: sb.payment_due_date,
                notes: sb.notes
            }));

            // Format dates strictly to YYYY-MM-DD using local time parts for <input type="date">
            const toLocalISO = (d: any) => {
                if (!d) return '';
                const dateObj = new Date(d);
                return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            };
            
            const rawDate = row.booking_date || row.date;
            const rawEndDate = row.end_date;
            const formattedDate = toLocalISO(rawDate);
            const formattedEndDate = toLocalISO(rawEndDate);

            return {
                id: row.id,
                type: row.type || 'Tour',
                customer: row.customer_name,
                email: row.customer_email || row.email,
                phone: row.customer_phone || row.phone,
                assignedTo: row.assigned_to ? Number(row.assigned_to) : undefined,
                title: row.title || row.package_title || 'Unknown Package',
                date: formattedDate,
                endDate: formattedEndDate || formattedDate,
                guests: row.number_of_people ? `${row.number_of_people} Adults, 0 Children` : undefined,
                amount: totalAmount,
                status: (row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending') as BookingStatus,
                payment: dynamicPayment as any,
                packageId: row.tour_id || row.package_id,
                invoiceNo: row.invoice_no || `INV-${row.id}`,
                transactions: txs,
                supplierBookings: sbs,
                notes: parseJsonFieldSafe(row.booking_notes, [])
            };
        });
    },

    createSupplierBooking: async (sb: any) => {
        await crud.create('supplier_bookings', {
            id: sb.id,
            booking_id: sb.bookingId,
            vendor_id: sb.vendorId,
            service_type: sb.serviceType,
            confirmation_number: sb.confirmationNumber || null,
            cost: sb.cost,
            paid_amount: sb.paidAmount,
            payment_status: sb.paymentStatus,
            booking_status: sb.bookingStatus,
            payment_due_date: sb.paymentDueDate ? sb.paymentDueDate : null,
            notes: sb.notes || null
        });
    },

    updateSupplierBooking: async (id: string, sb: any) => {
        const dbSb: any = {};
        if (sb.vendorId !== undefined) dbSb.vendor_id = sb.vendorId;
        if (sb.serviceType !== undefined) dbSb.service_type = sb.serviceType;
        if (sb.confirmationNumber !== undefined) dbSb.confirmation_number = sb.confirmationNumber || null;
        if (sb.cost !== undefined) dbSb.cost = sb.cost;
        if (sb.paidAmount !== undefined) dbSb.paid_amount = sb.paidAmount;
        if (sb.paymentStatus !== undefined) dbSb.payment_status = sb.paymentStatus;
        if (sb.bookingStatus !== undefined) dbSb.booking_status = sb.bookingStatus;
        if (sb.paymentDueDate !== undefined) dbSb.payment_due_date = sb.paymentDueDate ? sb.paymentDueDate : null;
        if (sb.notes !== undefined) dbSb.notes = sb.notes || null;
        await crud.update('supplier_bookings', id, dbSb);
    },

    deleteSupplierBooking: async (id: string) => {
        await crud.remove('supplier_bookings', id);
    },

    createBooking: async (booking: Partial<Booking>) => {
        // Map to Hostinger DB schema
        const dbBooking: any = {
            customer_name: booking.customer,
            customer_email: booking.email || '',
            customer_phone: booking.phone || '',
            booking_date: booking.date || new Date().toISOString().split('T')[0],
            end_date: booking.endDate || null,
            type: booking.type || 'Tour',
            title: booking.title || 'Unknown',
            total_price: booking.amount || 0,
            number_of_people: booking.guests ? parseInt(booking.guests.split(' ')[0]) || 1 : 1, // Extract count from "2 Adults" etc.
            status: booking.status === 'Confirmed' ? 'confirmed' : 'pending',
            payment_status: booking.payment === 'Paid' ? 'paid' : 'pending', // Enums: pending, paid, failed, refunded
            notes: booking.details || '',
            assigned_to: booking.assignedTo || null
        };

        if (booking.packageId) dbBooking.package_id = booking.packageId;

        const { data } = await crud.create('bookings', dbBooking);
        return data;
    },

    updateBookingStatus: async (id: string, status: string) => {
        await crud.update('bookings', id, { status: status.toLowerCase() });
    },

    updateBooking: async (id: string, updates: Partial<Booking>) => {
        const dbUpdates: any = {};
        if (updates.customer !== undefined) dbUpdates.customer_name = updates.customer;
        if (updates.email !== undefined) dbUpdates.customer_email = updates.email;
        if (updates.phone !== undefined) dbUpdates.customer_phone = updates.phone;
        if (updates.date !== undefined) dbUpdates.booking_date = updates.date;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.total_price = updates.amount;
        if (updates.packageId !== undefined) {
            dbUpdates.package_id = updates.packageId || null;
        }
        if (updates.status !== undefined) {
            dbUpdates.status = updates.status.toLowerCase();
        }
        if (updates.details !== undefined) {
            dbUpdates.notes = updates.details;
        }
        if (updates.assignedTo !== undefined) {
            dbUpdates.assigned_to = updates.assignedTo || null;
        }
        if (updates.guests !== undefined) {
            dbUpdates.number_of_people = updates.guests ? parseInt(updates.guests.split(' ')[0]) || 1 : 1;
        }
        if (updates.payment !== undefined) {
            const tempMap: any = { 'Paid': 'paid', 'Unpaid': 'pending', 'Deposit': 'deposit', 'Refunded': 'refunded' };
            dbUpdates.payment_status = tempMap[updates.payment] || 'pending';
        }
        if (updates.notes !== undefined) {
            dbUpdates.booking_notes = JSON.stringify(updates.notes);
        }
        
        await crud.update('bookings', id, dbUpdates);
    },

    deleteBooking: async (id: string) => {
        console.log('[API] deleteBooking called for id:', id);
        const token = localStorage.getItem('shravya_jwt');
        const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const msg = errBody.error || errBody.message || `Delete failed: ${res.status}`;
            console.error('[API] deleteBooking FAILED:', msg, errBody);
            throw new Error(msg);
        }
        const data = await res.json();
        console.log('[API] deleteBooking success:', data);
        return data;
    },

    // --- LEADS ---
    getLeads: async (limit: number = 100): Promise<Lead[]> => {
        const { data } = await fetchApi('/api/leads-with-logs');
        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            location: row.location || '',
            destination: row.destination,
            startDate: row.start_date,
            endDate: row.end_date,
            travelers: row.travelers || 'Unknown',
            budget: row.budget || 'Unknown',
            type: row.type || 'Tour',
            status: row.status as any,
            priority: row.priority || 'Medium',
            potentialValue: Number(row.potential_value) || 0,
            addedOn: row.created_at,
            source: row.source || 'Website',
            preferences: row.preferences,
            logs: (row.lead_logs || []).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((l: any) => ({
                id: l.id,
                type: l.type,
                content: l.content,
                timestamp: l.timestamp
            })),
            avatarColor: row.avatar_color,
            assignedTo: row.assigned_to ? Number(row.assigned_to) : undefined,
            whatsapp: row.whatsapp,
            isWhatsappSame: row.is_whatsapp_same,
            aiScore: row.ai_score,
            aiSummary: row.ai_summary,
            serviceType: row.service_type,
            paxAdult: row.pax_adult,
            paxChild: row.pax_child,
            paxInfant: row.pax_infant,
            residentialAddress: row.residential_address,
            officeAddress: row.office_address
        }));
    },

    createLead: async (lead: Partial<Lead>) => {
        await crud.create('leads', {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            location: lead.location,
            destination: lead.destination,
            start_date: lead.startDate,
            end_date: lead.endDate,
            travelers: lead.travelers,
            budget: lead.budget,
            type: lead.type || 'Tour',
            status: lead.status || 'New',
            priority: lead.priority || 'Medium',
            potential_value: lead.potentialValue || 0,
            source: lead.source || 'Website',
            preferences: lead.preferences,
            avatar_color: lead.avatarColor,
            assigned_to: lead.assignedTo,
            whatsapp: lead.whatsapp,
            is_whatsapp_same: lead.isWhatsappSame,
            service_type: lead.serviceType,
            pax_adult: lead.paxAdult,
            pax_child: lead.paxChild,
            pax_infant: lead.paxInfant,
            residential_address: lead.residentialAddress,
            office_address: lead.officeAddress
        });
    },

    updateLead: async (id: string, updates: Partial<Lead>) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.destination !== undefined) dbUpdates.destination = updates.destination;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
        if (updates.travelers !== undefined) dbUpdates.travelers = updates.travelers;
        if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.potentialValue !== undefined) dbUpdates.potential_value = updates.potentialValue;
        if (updates.source !== undefined) dbUpdates.source = updates.source;
        if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
        if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
        if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
        if (updates.isWhatsappSame !== undefined) dbUpdates.is_whatsapp_same = updates.isWhatsappSame;
        if (updates.serviceType !== undefined) dbUpdates.service_type = updates.serviceType;
        if (updates.paxAdult !== undefined) dbUpdates.pax_adult = updates.paxAdult;
        if (updates.paxChild !== undefined) dbUpdates.pax_child = updates.paxChild;
        if (updates.paxInfant !== undefined) dbUpdates.pax_infant = updates.paxInfant;
        if (updates.residentialAddress !== undefined) dbUpdates.residential_address = updates.residentialAddress;
        if (updates.officeAddress !== undefined) dbUpdates.office_address = updates.officeAddress;
        await crud.update('leads', id, dbUpdates);
    },

    deleteLead: async (id: string) => {
        await crud.remove('leads', id);
    },

    getLeadLogs: async (leadId: string) => {
        const { data } = await crud.getAll('lead_logs', { order: 'timestamp', asc: false, filters: { lead_id: leadId } });
        return (data || []).map((row: any) => ({
            id: row.id,
            type: row.type,
            content: row.content,
            timestamp: row.timestamp
        }));
    },

    createLeadLog: async (leadId: string, log: any) => {
        await crud.create('lead_logs', {
            lead_id: leadId,
            type: log.type,
            content: log.content,
            timestamp: log.timestamp || new Date().toISOString()
        });
    },

    updateLeadLog: async (logId: string, content: string) => {
        await crud.update('lead_logs', logId, { content });
    },

    deleteLeadLog: async (logId: string) => {
        await crud.remove('lead_logs', logId);
    },

    // --- INVENTORY ---
    getInventory: async (): Promise<Record<number, any>> => {
        const { data } = await crud.getAll('daily_inventory');
        const inventoryMap: Record<number, any> = {};
        (data || []).forEach((slot: any) => {
            const day = new Date(slot.date).getDate();
            inventoryMap[day] = {
                date: day,
                capacity: slot.capacity,
                booked: slot.booked,
                price: slot.price,
                isBlocked: slot.is_blocked
            };
        });
        return inventoryMap;
    },

    updateInventory: async (dateStr: string, updates: any) => {
        await crud.upsert('daily_inventory', { date: dateStr, ...updates });
    },

    // --- VENDORS ---
    getVendors: async () => {
        const { data } = await fetchApi('/api/vendors-with-stats');
        // Add robust fallback for JSON parsing
        const parseJsonField = (field: any, defaultValue: any) => {
            if (typeof field === 'string') {
                try { return JSON.parse(field); } catch { return defaultValue; }
            }
            return field || defaultValue;
        };

        return (data || []).map((v: any) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            subCategory: v.sub_category,
            location: v.location,
            contactName: v.contact_name,
            contactPhone: v.contact_phone,
            contactEmail: v.contact_email,
            rating: v.rating,
            balanceDue: Number(v.balance_due) || 0,
            status: 'Active',
            contractStatus: v.contract_status || 'Active',
            logo: v.logo,
            totalSales: v.total_sales ? Number(v.total_sales) : 0,
            totalCommission: v.total_commission ? Number(v.total_commission) : 0,
            bankDetails: parseJsonField(v.bank_details, {}),
            notes: parseJsonField(v.notes, []),
            // Use ledger_entries built from real supplier_bookings data (backend join)
            // Fall back to the stale JSON blob only if no supplier bookings exist
            transactions: Array.isArray(v.ledger_entries) && v.ledger_entries.length > 0
                ? v.ledger_entries.map((le: any) => ({
                    id: le.id,
                    date: le.date ? new Date(le.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    description: le.description,
                    amount: Number(le.amount) || 0,
                    type: le.type,
                    reference: le.reference
                }))
                : parseJsonField(v.transactions, []),
            services: [], documents: []
        }));
    },

    createVendor: async (vendor: any) => {
        const payload = {
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            sub_category: vendor.subCategory,
            location: vendor.location,
            contact_name: vendor.contactName,
            contact_phone: vendor.contactPhone,
            contact_email: vendor.contactEmail,
            rating: vendor.rating,
            contract_status: vendor.contractStatus,
            logo: vendor.logo,
            total_sales: vendor.totalSales,
            total_commission: vendor.totalCommission,
            bank_details: vendor.bankDetails ? JSON.stringify(vendor.bankDetails) : null,
            notes: vendor.notes ? JSON.stringify(vendor.notes) : '[]',
            transactions: vendor.transactions ? JSON.stringify(vendor.transactions) : '[]'
        };
        const { data } = await crud.create('vendors', payload);
        return data;
    },

    updateVendor: async (id: string, updates: any) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.subCategory !== undefined) dbUpdates.sub_category = updates.subCategory;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
        if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
        if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
        if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
        if (updates.balanceDue !== undefined) dbUpdates.balance_due = updates.balanceDue;
        if (updates.contractStatus !== undefined) dbUpdates.contract_status = updates.contractStatus;
        if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
        if (updates.totalSales !== undefined) dbUpdates.total_sales = updates.totalSales;
        if (updates.totalCommission !== undefined) dbUpdates.total_commission = updates.totalCommission;
        if (updates.bankDetails !== undefined) dbUpdates.bank_details = JSON.stringify(updates.bankDetails);
        if (updates.notes !== undefined) dbUpdates.notes = JSON.stringify(updates.notes);
        if (updates.transactions !== undefined) dbUpdates.transactions = JSON.stringify(updates.transactions);
        
        await crud.update('vendors', id, dbUpdates);
    },

    deleteVendor: async (id: string) => {
        await crud.remove('vendors', id);
    },

    // --- ACCOUNTS ---
    getAccounts: async () => {
        const { data } = await fetchApi('/api/accounts-with-transactions');
        return (data || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            companyName: a.company_name,
            type: a.type,
            email: a.email,
            phone: a.phone,
            currentBalance: a.current_balance,
            status: a.status,
            transactions: (a.account_transactions || [])
                .sort((x: any, y: any) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
                .map((t: any) => ({
                    id: t.id,
                    date: t.date,
                    amount: Number(t.amount),
                    type: t.type,
                    status: t.status || 'Pending',
                    description: t.description,
                    reference: t.reference
                }))
        }));
    },

    updateAccount: async (id: string, updates: any) => {
        const dbUpdates: any = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.currentBalance !== undefined) dbUpdates.current_balance = updates.currentBalance;
        await crud.update('accounts', id, dbUpdates);
    },

    createAccount: async (acc: any) => {
        const { data } = await crud.create('accounts', {
            id: acc.id,
            name: acc.name,
            company_name: acc.companyName,
            type: acc.type,
            email: acc.email,
            phone: acc.phone
        });
        return data;
    },

    // --- STAFF ---
    getStaff: async (): Promise<StaffMember[]> => {
        const { data } = await crud.getAll('staff_members', { order: 'created_at', asc: false });
        return (data || []).map((s: any) => ({
            id: s.id,
            name: s.name || 'Unknown',
            email: s.email || '',
            role: s.role || 'Agent',
            userType: s.user_type || 'Staff',
            department: s.department || 'General',
            status: s.status || 'Active',
            initials: s.initials || (s.name ? s.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'XX'),
            color: s.color || 'slate',
            permissions: typeof s.permissions === 'string' ? JSON.parse(s.permissions) : (s.permissions || {}),
            queryScope: s.query_scope || 'Show Assigned Query Only',
            whatsappScope: s.whatsapp_scope || 'Assigned Queries Messages',
            lastActive: s.last_active || 'Never',
            phone: s.phone || ''
        }));
    },

    getStaffByEmail: async (email: string): Promise<StaffMember | null> => {
        const { data } = await crud.getAll('staff_members', { filters: { email } });
        if (!data || data.length === 0) return null;
        const s = data[0];
        return {
            id: s.id,
            name: s.name,
            email: s.email,
            role: s.role,
            userType: s.user_type,
            department: s.department,
            status: s.status,
            initials: s.initials,
            color: s.color,
            permissions: typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions,
            queryScope: s.query_scope,
            whatsappScope: s.whatsapp_scope,
            lastActive: s.last_active,
            phone: s.phone
        };
    },

    createStaff: async (staff: Partial<StaffMember>, password?: string) => {
        const trimmedEmail = staff.email?.trim();

        // Use atomic endpoint when password is provided (new staff creation with login)
        if (password) {
            const payload = {
                email: trimmedEmail,
                password,
                name: staff.name,
                role: staff.role,
                user_type: staff.userType,
                department: staff.department,
                status: staff.status,
                initials: staff.initials,
                color: staff.color,
                permissions: staff.permissions,
                query_scope: staff.queryScope,
                whatsapp_scope: staff.whatsappScope,
                phone: (staff as any).phone
            };
            const { data } = await fetchApi('/api/staff/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            return {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                userType: data.user_type,
                department: data.department,
                status: data.status,
                initials: data.initials,
                color: data.color,
                permissions: typeof data.permissions === 'string' ? JSON.parse(data.permissions) : data.permissions,
                queryScope: data.query_scope,
                whatsappScope: data.whatsapp_scope,
                lastActive: data.last_active
            };
        }

        // No password: just create staff record (auto-create scenario)
        const staffPayload = {
            name: staff.name,
            email: trimmedEmail,
            role: staff.role,
            user_type: staff.userType,
            department: staff.department,
            status: staff.status,
            initials: staff.initials,
            color: staff.color,
            permissions: staff.permissions,
            query_scope: staff.queryScope,
            whatsapp_scope: staff.whatsappScope
        };

        const { data } = await crud.create('staff_members', staffPayload);

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            userType: data.user_type,
            department: data.department,
            status: data.status,
            initials: data.initials,
            color: data.color,
            permissions: typeof data.permissions === 'string' ? JSON.parse(data.permissions) : data.permissions,
            queryScope: data.query_scope,
            whatsappScope: data.whatsapp_scope,
            lastActive: data.last_active
        };
    },


    syncStaffAuth: async () => {
        return fetchApi('/api/admin/sync-staff-auth', { method: 'POST' });
    },

    updateStaff: async (id: number, updates: Partial<StaffMember>) => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.permissions) dbUpdates.permissions = updates.permissions;
        await crud.update('staff_members', id, dbUpdates);
    },

    deleteStaff: async (id: number) => {
        await crud.remove('staff_members', id);
    },

    // --- CUSTOMERS ---
    getCustomers: async (): Promise<Customer[]> => {
        const { data } = await crud.getAll('customers', { order: 'created_at', asc: false });
        return (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            location: c.location,
            type: c.type,
            status: c.status,
            totalSpent: c.total_spent,
            bookingsCount: c.bookings_count,
            joinedDate: c.created_at,
            notes: typeof c.notes === 'string' ? JSON.parse(c.notes) : (c.notes || []),
            tags: typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || []),
            preferences: typeof c.preferences === 'string' ? JSON.parse(c.preferences) : (c.preferences || {})
        }));
    },

    // Look up a single customer by email (primary) or phone (fallback) — used for booking auto-sync
    findCustomerByContact: async (email?: string, phone?: string): Promise<Customer | null> => {
        const mapRow = (c: any): Customer => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            location: c.location,
            type: c.type,
            status: c.status,
            totalSpent: c.total_spent,
            bookingsCount: c.bookings_count,
            joinedDate: c.created_at,
            notes: typeof c.notes === 'string' ? JSON.parse(c.notes) : (c.notes || []),
            tags: typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || []),
            preferences: typeof c.preferences === 'string' ? JSON.parse(c.preferences) : (c.preferences || {})
        });
        if (email) {
            const { data } = await crud.getAll('customers', { filters: { email } });
            if (data && data.length > 0) return mapRow(data[0]);
        }
        if (phone) {
            const { data } = await crud.getAll('customers', { filters: { phone } });
            if (data && data.length > 0) return mapRow(data[0]);
        }
        return null;
    },

    createCustomer: async (customer: Partial<Customer>) => {
        const { data } = await crud.create('customers', {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            location: customer.location,
            type: customer.type || 'New',
            status: customer.status || 'Active',
            total_spent: customer.totalSpent || 0,
            bookings_count: customer.bookingsCount || 0,
            notes: customer.notes ? JSON.stringify(customer.notes) : '[]',
            tags: customer.tags ? JSON.stringify(customer.tags) : '[]',
            preferences: customer.preferences ? JSON.stringify(customer.preferences) : '{}'
        });
        return data;
    },

    updateCustomer: async (id: string, updates: Partial<Customer>) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;
        if (updates.bookingsCount !== undefined) dbUpdates.bookings_count = updates.bookingsCount;
        if (updates.notes !== undefined) dbUpdates.notes = JSON.stringify(updates.notes);
        if (updates.tags !== undefined) dbUpdates.tags = JSON.stringify(updates.tags);
        if (updates.preferences !== undefined) dbUpdates.preferences = JSON.stringify(updates.preferences);
        await crud.update('customers', id, dbUpdates);
    },

    deleteCustomer: async (id: string) => {
        console.log('[API] deleteCustomer called for id:', id);
        const token = localStorage.getItem('shravya_jwt');
        const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const msg = errBody.error || errBody.message || `Delete failed: ${res.status}`;
            console.error('[API] deleteCustomer FAILED:', msg);
            throw new Error(msg);
        }
        const data = await res.json();
        console.log('[API] deleteCustomer success:', data);
        return data;
    },

    // Sync / backfill customers from all bookings in the database.
    // Safe to call multiple times (deduplicates by email/phone server-side).
    syncCustomersFromBookings: async (): Promise<{ created: number; updated: number; skipped: number }> => {
        const result = await fetchApi('/api/sync-customers-from-bookings', { method: 'POST' });
        return result;
    },

    // --- CAMPAIGNS ---
    getCampaigns: async (): Promise<Campaign[]> => {
        const { data } = await crud.getAll('campaigns', { order: 'created_at', asc: false });
        return (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            audience: c.audience,
            status: c.status,
            metrics: typeof c.metrics === 'string' ? JSON.parse(c.metrics) : (c.metrics || { sent: 0, opened: 0, clicked: 0 })
        }));
    },
    createCampaign: async (campaign: Partial<Campaign>) => {
        await crud.create('campaigns', {
            name: campaign.name,
            type: campaign.type,
            audience: campaign.audience,
            status: campaign.status || 'Draft',
            metrics: campaign.metrics || { sent: 0, opened: 0, clicked: 0 }
        });
    },

    // --- MASTERS ---
    getLocations: async () => {
        const { data } = await crud.getAll('master_locations', { order: 'name', asc: true });
        return data || [];
    },
    createMasterLocation: async (location: any) => { await crud.create('master_locations', location); },
    updateMasterLocation: async (id: string, updates: any) => { await crud.update('master_locations', id, updates); },
    deleteMasterLocation: async (id: string) => { await crud.remove('master_locations', id); },

    // Hotels
    getMasterHotels: async (): Promise<MasterHotel[]> => {
        const { data } = await crud.getAll('master_hotels', { order: 'created_at', asc: false });
        return (data || []).map((h: any) => ({
            id: h.id,
            name: h.name,
            locationId: h.location_id,
            rating: h.rating,
            amenities: typeof h.amenities === 'string' ? JSON.parse(h.amenities) : (h.amenities || []),
            pricePerNight: h.price_per_night,
            image: h.image,
            address: h.address,
            status: h.status
        }));
    },
    createMasterHotel: async (hotel: Partial<MasterHotel>) => {
        await crud.create('master_hotels', {
            name: hotel.name, location_id: hotel.locationId, rating: hotel.rating,
            amenities: hotel.amenities, price_per_night: hotel.pricePerNight,
            image: hotel.image, address: hotel.address, status: hotel.status || 'Active'
        });
    },
    updateMasterHotel: async (id: string, hotel: Partial<MasterHotel>) => {
        const dbHotel: any = {};
        if (hotel.name !== undefined) dbHotel.name = hotel.name;
        if (hotel.locationId !== undefined) dbHotel.location_id = hotel.locationId;
        if (hotel.rating !== undefined) dbHotel.rating = hotel.rating;
        if (hotel.amenities !== undefined) dbHotel.amenities = hotel.amenities;
        if (hotel.pricePerNight !== undefined) dbHotel.price_per_night = hotel.pricePerNight;
        if (hotel.image !== undefined) dbHotel.image = hotel.image;
        if (hotel.address !== undefined) dbHotel.address = hotel.address;
        if (hotel.status !== undefined) dbHotel.status = hotel.status;
        await crud.update('master_hotels', id, dbHotel);
    },
    deleteMasterHotel: async (id: string) => { await crud.remove('master_hotels', id); },

    // --- Finance / Expenses ---
    getExpenses: async (): Promise<Expense[]> => {
        const { data } = await crud.getAll('expenses', { order: 'date', asc: false });
        return (data || []).map((e: any) => ({
            id: e.id,
            title: e.title,
            amount: e.amount,
            category: e.category,
            date: e.date,
            paymentMethod: e.paymentMethod || e.payment_method, // Fallback for either naming covention in DB if changed
            status: e.status,
            notes: e.notes,
            receiptUrl: e.receiptUrl || e.receipt_url
        }));
    },
    createExpense: async (expense: Partial<Expense>) => {
        await crud.create('expenses', {
            id: expense.id,
            title: expense.title,
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            paymentMethod: expense.paymentMethod,
            status: expense.status,
            notes: expense.notes,
            receiptUrl: expense.receiptUrl
        });
    },
    updateExpense: async (id: string, updates: Partial<Expense>) => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.paymentMethod !== undefined) dbUpdates.paymentMethod = updates.paymentMethod;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.receiptUrl !== undefined) dbUpdates.receiptUrl = updates.receiptUrl;
        await crud.update('expenses', id, dbUpdates);
    },
    deleteExpense: async (id: string) => { await crud.remove('expenses', id); },

    // --- TASKS ---
    getTasks: async (): Promise<Task[]> => {
        const { data } = await crud.getAll('tasks', { order: 'due_date', asc: true });
        return (data || []).map((t: any) => ({
            id: t.id, title: t.title, description: t.description,
            assignedTo: t.assigned_to, assignedBy: t.assigned_by,
            status: t.status, priority: t.priority, dueDate: t.due_date,
            createdAt: t.created_at, completedAt: t.completed_at,
            relatedLeadId: t.related_lead_id, relatedBookingId: t.related_booking_id
        }));
    },
    createTask: async (task: Partial<Task>) => {
        await crud.create('tasks', {
            title: task.title, description: task.description,
            assigned_to: task.assignedTo, assigned_by: task.assignedBy,
            status: task.status || 'Pending', priority: task.priority || 'Medium',
            due_date: task.dueDate, completed_at: task.completedAt,
            related_lead_id: task.relatedLeadId, related_booking_id: task.relatedBookingId
        });
    },
    updateTask: async (id: string, updates: Partial<Task>) => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
        if (updates.assignedBy !== undefined) dbUpdates.assigned_by = updates.assignedBy;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
        if (updates.relatedLeadId !== undefined) dbUpdates.related_lead_id = updates.relatedLeadId;
        if (updates.relatedBookingId !== undefined) dbUpdates.related_booking_id = updates.relatedBookingId;
        await crud.update('tasks', id, dbUpdates);
    },
    deleteTask: async (id: string) => { await crud.remove('tasks', id); },

    // --- PHASE 3: MASTER DATA (generic pattern) ---
    getMasterRoomTypes: async (): Promise<MasterRoomType[]> => {
        const { data } = await crud.getAll('master_room_types', { order: 'created_at', asc: false });
        return (data || []) as MasterRoomType[];
    },
    createMasterRoomType: async (item: Partial<MasterRoomType>) => { 
        await crud.create('master_room_types', {
            id: item.id,
            name: item.name, description: item.description, 
            image: item.image, status: item.status || 'Active'
        }); 
    },
    updateMasterRoomType: async (id: string, updates: Partial<MasterRoomType>) => { 
        const dbItem: any = {};
        if (updates.name !== undefined) dbItem.name = updates.name;
        if (updates.description !== undefined) dbItem.description = updates.description;
        if (updates.image !== undefined) dbItem.image = updates.image;
        if (updates.status !== undefined) dbItem.status = updates.status;
        await crud.update('master_room_types', id, dbItem); 
    },
    deleteMasterRoomType: async (id: string) => { await crud.remove('master_room_types', id); },

    getMasterMealPlans: async (): Promise<MasterMealPlan[]> => {
        const { data } = await crud.getAll('master_meal_plans', { order: 'created_at', asc: false });
        return (data || []) as MasterMealPlan[];
    },
    createMasterMealPlan: async (item: Partial<MasterMealPlan>) => { 
        await crud.create('master_meal_plans', {
            id: item.id,
            code: item.code, name: item.name, description: item.description,
            image: item.image, status: item.status || 'Active'
        }); 
    },
    updateMasterMealPlan: async (id: string, updates: Partial<MasterMealPlan>) => { 
        const dbItem: any = {};
        if (updates.code !== undefined) dbItem.code = updates.code;
        if (updates.name !== undefined) dbItem.name = updates.name;
        if (updates.description !== undefined) dbItem.description = updates.description;
        if (updates.image !== undefined) dbItem.image = updates.image;
        if (updates.status !== undefined) dbItem.status = updates.status;
        await crud.update('master_meal_plans', id, dbItem); 
    },
    deleteMasterMealPlan: async (id: string) => { await crud.remove('master_meal_plans', id); },

    getMasterActivities: async (): Promise<MasterActivity[]> => {
        const { data } = await crud.getAll('master_activities', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            ...r, locationId: r.location_id, cost: Number(r.cost) || 0
        })) as MasterActivity[];
    },
    createMasterActivity: async (item: Partial<MasterActivity>) => { 
        await crud.create('master_activities', {
            id: item.id,
            name: item.name, location_id: item.locationId, duration: item.duration,
            cost: item.cost, category: item.category, image: item.image,
            status: item.status || 'Active'
        }); 
    },
    updateMasterActivity: async (id: string, updates: Partial<MasterActivity>) => { 
        const dbItem: any = {};
        if (updates.name !== undefined) dbItem.name = updates.name;
        if (updates.locationId !== undefined) dbItem.location_id = updates.locationId;
        if (updates.duration !== undefined) dbItem.duration = updates.duration;
        if (updates.cost !== undefined) dbItem.cost = updates.cost;
        if (updates.category !== undefined) dbItem.category = updates.category;
        if (updates.image !== undefined) dbItem.image = updates.image;
        if (updates.status !== undefined) dbItem.status = updates.status;
        await crud.update('master_activities', id, dbItem); 
    },
    deleteMasterActivity: async (id: string) => { await crud.remove('master_activities', id); },

    getMasterTransports: async (): Promise<MasterTransport[]> => {
        const { data } = await crud.getAll('master_transports', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            ...r, baseRate: Number(r.base_rate) || 0
        })) as MasterTransport[];
    },
    createMasterTransport: async (item: Partial<MasterTransport>) => { 
        await crud.create('master_transports', {
            id: item.id,
            name: item.name, type: item.type, capacity: item.capacity,
            base_rate: item.baseRate, image: item.image, status: item.status || 'Active'
        }); 
    },
    updateMasterTransport: async (id: string, updates: Partial<MasterTransport>) => { 
        const dbItem: any = {};
        if (updates.name !== undefined) dbItem.name = updates.name;
        if (updates.type !== undefined) dbItem.type = updates.type;
        if (updates.capacity !== undefined) dbItem.capacity = updates.capacity;
        if (updates.baseRate !== undefined) dbItem.base_rate = updates.baseRate;
        if (updates.image !== undefined) dbItem.image = updates.image;
        if (updates.status !== undefined) dbItem.status = updates.status;
        await crud.update('master_transports', id, dbItem); 
    },
    deleteMasterTransport: async (id: string) => { await crud.remove('master_transports', id); },

    getMasterPlans: async (): Promise<MasterPlan[]> => {
        const { data } = await crud.getAll('master_plans', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            id: r.id, title: r.title, duration: r.duration, 
            locationId: r.location_id, estimatedCost: Number(r.estimated_cost) || 0,
            status: r.status, days: typeof r.plan_days === 'string' ? JSON.parse(r.plan_days) : (r.plan_days || [])
        })) as MasterPlan[];
    },
    createMasterPlan: async (item: Partial<MasterPlan>) => { 
        await crud.create('master_plans', {
            id: item.id,
            title: item.title, duration: item.duration, location_id: item.locationId,
            estimated_cost: item.estimatedCost, status: item.status || 'Active',
            plan_days: item.days
        }); 
    },
    updateMasterPlan: async (id: string, updates: Partial<MasterPlan>) => { 
        const dbItem: any = {};
        if (updates.title !== undefined) dbItem.title = updates.title;
        if (updates.duration !== undefined) dbItem.duration = updates.duration;
        if (updates.locationId !== undefined) dbItem.location_id = updates.locationId;
        if (updates.estimatedCost !== undefined) dbItem.estimated_cost = updates.estimatedCost;
        if (updates.status !== undefined) dbItem.status = updates.status;
        if (updates.days !== undefined) dbItem.plan_days = updates.days;
        await crud.update('master_plans', id, dbItem); 
    },
    deleteMasterPlan: async (id: string) => { await crud.remove('master_plans', id); },

    getMasterLeadSources: async (): Promise<MasterLeadSource[]> => {
        const { data } = await crud.getAll('master_lead_sources', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            ...r, category: r.category
        })) as MasterLeadSource[];
    },
    createMasterLeadSource: async (item: Partial<MasterLeadSource>) => { 
        await crud.create('master_lead_sources', {
            id: item.id,
            name: item.name, category: item.category, image: item.image,
            status: item.status || 'Active'
        }); 
    },
    updateMasterLeadSource: async (id: string, updates: Partial<MasterLeadSource>) => { 
        const dbItem: any = {};
        if (updates.name !== undefined) dbItem.name = updates.name;
        if (updates.category !== undefined) dbItem.category = updates.category;
        if (updates.image !== undefined) dbItem.image = updates.image;
        if (updates.status !== undefined) dbItem.status = updates.status;
        await crud.update('master_lead_sources', id, dbItem); 
    },
    deleteMasterLeadSource: async (id: string) => { await crud.remove('master_lead_sources', id); },

    getMasterTermsTemplates: async (): Promise<MasterTermsTemplate[]> => {
        const { data } = await crud.getAll('master_terms_templates', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            ...r, isDefault: Boolean(r.is_default)
        })) as MasterTermsTemplate[];
    },
    createMasterTermsTemplate: async (item: Partial<MasterTermsTemplate>) => { 
        await crud.create('master_terms_templates', {
            id: item.id,
            title: item.title, category: item.category, content: item.content,
            is_default: item.isDefault, status: item.status || 'Active',
            image: item.image
        }); 
    },
    updateMasterTermsTemplate: async (id: string, updates: Partial<MasterTermsTemplate>) => { 
        const dbItem: any = {};
        if (updates.title !== undefined) dbItem.title = updates.title;
        if (updates.category !== undefined) dbItem.category = updates.category;
        if (updates.content !== undefined) dbItem.content = updates.content;
        if (updates.isDefault !== undefined) dbItem.is_default = updates.isDefault;
        if (updates.status !== undefined) dbItem.status = updates.status;
        if (updates.image !== undefined) dbItem.image = updates.image;
        await crud.update('master_terms_templates', id, dbItem); 
    },
    deleteMasterTermsTemplate: async (id: string) => { await crud.remove('master_terms_templates', id); },

    // --- PHASE 3: CMS ---
    getCMSBanners: async (): Promise<CMSBanner[]> => {
        const { data } = await crud.getAll('cms_banners', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({ ...r, imageUrl: r.image_url, ctaText: r.cta_text, ctaLink: r.cta_link, isActive: r.is_active }));
    },
    createCMSBanner: async (item: Partial<CMSBanner>) => {
        await crud.create('cms_banners', {
            title: item.title, subtitle: item.subtitle, image_url: item.imageUrl,
            cta_text: item.ctaText, cta_link: item.ctaLink, is_active: item.isActive
        });
    },
    updateCMSBanner: async (id: string, updates: Partial<CMSBanner>) => {
        const dbItem: any = {};
        if (updates.title !== undefined) dbItem.title = updates.title;
        if (updates.subtitle !== undefined) dbItem.subtitle = updates.subtitle;
        if (updates.imageUrl !== undefined) dbItem.image_url = updates.imageUrl;
        if (updates.ctaText !== undefined) dbItem.cta_text = updates.ctaText;
        if (updates.ctaLink !== undefined) dbItem.cta_link = updates.ctaLink;
        if (updates.isActive !== undefined) dbItem.is_active = updates.isActive;
        await crud.update('cms_banners', id, dbItem);
    },
    deleteCMSBanner: async (id: string) => { await crud.remove('cms_banners', id); },

    getCMSTestimonials: async (): Promise<CMSTestimonial[]> => {
        const { data } = await crud.getAll('cms_testimonials', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({ ...r, customerName: r.customer_name, avatarUrl: r.avatar_url, isActive: r.is_active }));
    },
    createCMSTestimonial: async (item: Partial<CMSTestimonial>) => {
        await crud.create('cms_testimonials', {
            customer_name: item.customerName, content: item.text, rating: item.rating,
            avatar_url: item.avatarUrl, location: item.location, is_active: item.isActive
        });
    },
    updateCMSTestimonial: async (id: string, updates: Partial<CMSTestimonial>) => {
        const dbItem: any = {};
        if (updates.customerName !== undefined) dbItem.customer_name = updates.customerName;
        if (updates.text !== undefined) dbItem.content = updates.text;
        if (updates.rating !== undefined) dbItem.rating = updates.rating;
        if (updates.avatarUrl !== undefined) dbItem.avatar_url = updates.avatarUrl;
        if (updates.location !== undefined) dbItem.location = updates.location;
        if (updates.isActive !== undefined) dbItem.is_active = updates.isActive;
        await crud.update('cms_testimonials', id, dbItem);
    },
    deleteCMSTestimonial: async (id: string) => { await crud.remove('cms_testimonials', id); },

    getCMSGalleryImages: async (): Promise<CMSGalleryImage[]> => {
        const { data } = await crud.getAll('cms_gallery_images', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({ ...r, imageUrl: r.image_url }));
    },
    createCMSGalleryImage: async (item: Partial<CMSGalleryImage>) => {
        await crud.create('cms_gallery_images', { title: item.title, image_url: item.imageUrl, category: item.category });
    },
    deleteCMSGalleryImage: async (id: string) => { await crud.remove('cms_gallery_images', id); },

    getCMSPosts: async (): Promise<CMSPost[]> => {
        const { data } = await crud.getAll('cms_posts', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({ ...r, coverImage: r.cover_image, publishedDate: r.published_date }));
    },
    createCMSPost: async (item: Partial<CMSPost>) => {
        await crud.create('cms_posts', {
            title: item.title, content: item.content, excerpt: item.excerpt,
            cover_image: item.coverImage, author: item.author, status: item.status,
            tags: item.tags, published_date: item.publishedDate
        });
    },
    updateCMSPost: async (id: string, updates: Partial<CMSPost>) => {
        const dbItem: any = {};
        if (updates.title !== undefined) dbItem.title = updates.title;
        if (updates.content !== undefined) dbItem.content = updates.content;
        if (updates.excerpt !== undefined) dbItem.excerpt = updates.excerpt;
        if (updates.coverImage !== undefined) dbItem.cover_image = updates.coverImage;
        if (updates.author !== undefined) dbItem.author = updates.author;
        if (updates.status !== undefined) dbItem.status = updates.status;
        if (updates.tags !== undefined) dbItem.tags = updates.tags;
        if (updates.publishedDate !== undefined) dbItem.published_date = updates.publishedDate;
        await crud.update('cms_posts', id, dbItem);
    },
    deleteCMSPost: async (id: string) => { await crud.remove('cms_posts', id); },

    // --- PHASE 3: PRODUCTIVITY & EXTRAS ---
    getFollowUps: async (): Promise<FollowUp[]> => {
        const { data } = await fetchApi('/api/follow-ups-with-lead');
        return (data || []).map((r: any) => ({
            ...r,
            leadId: r.lead_id,
            leadName: r.lead_name || 'Unknown',
            description: r.notes,
            notes: r.notes,
            scheduledAt: r.scheduled_at,
            reminderEnabled: r.reminder_enabled,
            assignedTo: r.assigned_to,
            completedAt: r.completed_at,
            createdAt: r.created_at
        }));
    },
    createFollowUp: async (item: Partial<FollowUp>) => {
        await crud.create('follow_ups', {
            lead_id: item.leadId, type: item.type, notes: item.notes, status: item.status,
            scheduled_at: item.scheduledAt, reminder_enabled: item.reminderEnabled,
            assigned_to: item.assignedTo, completed_at: item.completedAt
        });
    },
    updateFollowUp: async (id: string, updates: Partial<FollowUp>) => {
        const dbItem: any = {};
        if (updates.leadId !== undefined) dbItem.lead_id = updates.leadId;
        if (updates.type !== undefined) dbItem.type = updates.type;
        // Map description (frontend) to notes (database)
        if (updates.description !== undefined) dbItem.notes = updates.description;
        else if (updates.notes !== undefined) dbItem.notes = updates.notes;
        
        if (updates.status !== undefined) dbItem.status = updates.status;
        if (updates.scheduledAt !== undefined) dbItem.scheduled_at = updates.scheduledAt;
        if (updates.reminderEnabled !== undefined) dbItem.reminder_enabled = updates.reminderEnabled;
        if (updates.assignedTo !== undefined) dbItem.assigned_to = updates.assignedTo;
        if (updates.completedAt !== undefined) dbItem.completed_at = updates.completedAt;
        await crud.update('follow_ups', id, dbItem);
    },
    deleteFollowUp: async (id: string) => { await crud.remove('follow_ups', id); },

    getProposals: async (): Promise<Proposal[]> => {
        const { data } = await crud.getAll('proposals', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({ ...r, leadId: r.lead_id, validUntil: r.valid_until, createdAt: r.created_at }));
    },
    createProposal: async (item: Partial<Proposal>) => {
        await crud.create('proposals', {
            lead_id: item.leadId, title: item.title,
            status: item.status, valid_until: item.validUntil
        });
    },
    updateProposal: async (id: string, updates: Partial<Proposal>) => {
        const dbItem: any = {};
        if (updates.leadId !== undefined) dbItem.lead_id = updates.leadId;
        if (updates.title !== undefined) dbItem.title = updates.title;
        if (updates.status !== undefined) dbItem.status = updates.status;
        if (updates.validUntil !== undefined) dbItem.valid_until = updates.validUntil;
        await crud.update('proposals', id, dbItem);
    },
    deleteProposal: async (id: string) => { await crud.remove('proposals', id); },

    getDailyTargets: async (): Promise<DailyTarget[]> => {
        const { data } = await crud.getAll('daily_targets', { order: 'date', asc: false });
        return (data || []).map((r: any) => ({ ...r, staffId: r.staff_id, targetLeads: r.target_leads, targetCalls: r.target_calls, targetConversions: r.target_conversions, targetBookings: r.target_bookings, actualLeads: r.actual_leads, actualCalls: r.actual_calls, actualConversions: r.actual_conversions, actualBookings: r.actual_bookings }));
    },
    createDailyTarget: async (item: Partial<DailyTarget>) => {
        await crud.create('daily_targets', {
            staff_id: item.staffId, date: item.date,
            target_leads: item.targetLeads, target_calls: item.targetCalls,
            target_conversions: item.targetConversions, target_bookings: item.targetBookings,
            actual_leads: item.actualLeads, actual_calls: item.actualCalls,
            actual_conversions: item.actualConversions, actual_bookings: item.actualBookings
        });
    },
    updateDailyTarget: async (id: string, updates: Partial<DailyTarget>) => {
        const dbItem: any = {};
        if (updates.staffId !== undefined) dbItem.staff_id = updates.staffId;
        if (updates.date !== undefined) dbItem.date = updates.date;
        if (updates.targetLeads !== undefined) dbItem.target_leads = updates.targetLeads;
        if (updates.targetCalls !== undefined) dbItem.target_calls = updates.targetCalls;
        if (updates.targetConversions !== undefined) dbItem.target_conversions = updates.targetConversions;
        if (updates.targetBookings !== undefined) dbItem.target_bookings = updates.targetBookings;
        if (updates.actualLeads !== undefined) dbItem.actual_leads = updates.actualLeads;
        if (updates.actualCalls !== undefined) dbItem.actual_calls = updates.actualCalls;
        if (updates.actualConversions !== undefined) dbItem.actual_conversions = updates.actualConversions;
        if (updates.actualBookings !== undefined) dbItem.actual_bookings = updates.actualBookings;
        await crud.update('daily_targets', id, dbItem);
    },

    getTimeSessions: async (): Promise<TimeSession[]> => {
        const { data } = await crud.getAll('time_sessions', { order: 'start_time', asc: false });
        return (data || []).map((r: any) => ({ ...r, staffId: r.staff_id, taskId: r.task_id, startTime: r.start_time, endTime: r.end_time, idleTime: r.idle_time }));
    },
    createTimeSession: async (item: Partial<TimeSession>) => {
        await crud.create('time_sessions', {
            staff_id: item.staffId, task_id: item.taskId,
            start_time: item.startTime, end_time: item.endTime, idle_time: item.idleTime, notes: item.notes
        });
    },
    updateTimeSession: async (id: string, updates: Partial<TimeSession>) => {
        const dbItem: any = {};
        if (updates.staffId !== undefined) dbItem.staff_id = updates.staffId;
        if (updates.taskId !== undefined) dbItem.task_id = updates.taskId;
        if (updates.startTime !== undefined) dbItem.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbItem.end_time = updates.endTime;
        if (updates.idleTime !== undefined) dbItem.idle_time = updates.idleTime;
        if (updates.notes !== undefined) dbItem.notes = updates.notes;
        await crud.update('time_sessions', id, dbItem);
    },

    getAssignmentRules: async (): Promise<AssignmentRule[]> => {
        const { data } = await crud.getAll('assignment_rules', { order: 'priority', asc: true });
        return (data || []).map((r: any) => ({ ...r, isActive: r.is_active, triggerOn: r.trigger_on, eligibleStaffIds: typeof r.eligible_staff_ids === 'string' ? JSON.parse(r.eligible_staff_ids) : r.eligible_staff_ids, updatedAt: r.updated_at, createdAt: r.created_at }));
    },
    createAssignmentRule: async (item: Partial<AssignmentRule>) => {
        await crud.create('assignment_rules', {
            name: item.name, is_active: item.isActive,
            trigger_on: item.triggerOn, conditions: item.conditions, strategy: item.strategy,
            priority: item.priority, eligible_staff_ids: item.eligibleStaffIds
        });
    },
    updateAssignmentRule: async (id: string, updates: Partial<AssignmentRule>) => {
        const dbItem: any = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) dbItem.name = updates.name;
        if (updates.isActive !== undefined) dbItem.is_active = updates.isActive;
        if (updates.triggerOn !== undefined) dbItem.trigger_on = updates.triggerOn;
        if (updates.conditions !== undefined) dbItem.conditions = updates.conditions;
        if (updates.strategy !== undefined) dbItem.strategy = updates.strategy;
        if (updates.priority !== undefined) dbItem.priority = updates.priority;
        if (updates.eligibleStaffIds !== undefined) dbItem.eligible_staff_ids = updates.eligibleStaffIds;
        await crud.update('assignment_rules', id, dbItem);
    },
    deleteAssignmentRule: async (id: string) => { await crud.remove('assignment_rules', id); },

    getUserActivities: async (): Promise<UserActivity[]> => {
        const { data } = await crud.getAll('user_activities', { order: 'timestamp', asc: false, limit: 500 });
        return (data || []).map((r: any) => ({ ...r, staffId: r.staff_id, staffName: r.staff_name }));
    },
    createUserActivity: async (item: Partial<UserActivity>) => {
        await crud.create('user_activities', {
            staff_id: item.staffId, staff_name: item.staffName,
            action: item.action, module: item.module, details: item.details
        });
    },

    // --- AUDIT LOGS ---
    getAuditLogs: async (): Promise<AuditLog[]> => {
        const { data } = await crud.getAll('audit_logs', { order: 'timestamp', asc: false, limit: 500 });
        return (data || []).map((r: any) => ({ ...r, performedBy: r.performed_by }));
    },
    createAuditLog: async (log: Omit<AuditLog, 'id'>) => {
        await crud.create('audit_logs', {
            action: log.action, module: log.module, details: log.details,
            severity: log.severity, performed_by: log.performedBy, timestamp: log.timestamp
        });
    },

    // --- STORAGE (File Upload) ---
    uploadFile: async (file: File, _bucketPath: string = 'documents'): Promise<string> => {
        // Compress the image first
        const processedFile = await compressImageFile(file);

        // Upload to the backend /api/upload endpoint (multer saves to disk)
        const token = localStorage.getItem('shravya_jwt');
        const formData = new FormData();
        formData.append('file', processedFile);

        const res = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Upload failed: ${res.status}`);
        }

        const { url } = await res.json();
        // Always return relative URL - works in dev (Vite proxy) and production (Express static)
        return url.startsWith('/') ? url : `/${url}`;
    },

    // ─── DELETION REQUESTS ───
    requestDeletion: async (tableName: string, recordId: string, recordName: string, reason: string) => {
        return fetchApi('/api/deletion-requests', {
            method: 'POST',
            body: JSON.stringify({ table_name: tableName, record_id: recordId, record_name: recordName, reason })
        });
    },
    getDeletionRequests: async () => {
        const { data } = await fetchApi('/api/deletion-requests');
        return data;
    },
    approveDeletionRequest: async (id: string) => {
        return fetchApi(`/api/deletion-requests/${id}/approve`, { method: 'POST' });
    },
    rejectDeletionRequest: async (id: string) => {
        return fetchApi(`/api/deletion-requests/${id}/reject`, { method: 'POST' });
    }
};
