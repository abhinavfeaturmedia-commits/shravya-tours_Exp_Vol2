import imageCompression from 'browser-image-compression';
import { Package, Booking, Lead, BookingStatus, StaffMember, Customer, MasterRoomType, MasterMealPlan, MasterActivity, MasterTransport, MasterPlan, MasterLeadSource, MasterTermsTemplate, CMSBanner, CMSTestimonial, CMSGalleryImage, CMSPost, FollowUp, Proposal, DailyTarget, TimeSession, AssignmentRule, UserActivity, Campaign, MasterHotel, Task, AuditLog } from '../../types';

// ─── BASE API URL ───
const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

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
    getOne: (table: string, id: string | number) => fetchApi(`/api/crud/${table}/${id}`),
    create: (table: string, body: any) => fetchApi(`/api/crud/${table}`, { method: 'POST', body: JSON.stringify(body) }),
    update: (table: string, id: string | number, body: any) => fetchApi(`/api/crud/${table}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (table: string, id: string | number) => fetchApi(`/api/crud/${table}/${id}`, { method: 'DELETE' }),
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
    highlights: (row.features || []).map((f: string) => ({ icon: 'star', label: f })),
    itinerary: [],
    gallery: [],
    theme: row.theme || 'Tour',
    overview: row.overview || row.description || '',
    status: row.status as any || 'Active',
    offerEndTime: row.offer_end_time,
    included: row.included || [],
    notIncluded: row.not_included || [],
    builderData: row.builder_data
});

export const api = {
    // --- PACKAGES ---
    getPackages: async (): Promise<Package[]> => {
        const { data } = await crud.getAll('packages', { order: 'created_at', asc: false });
        return (data || []).map(mapPackage);
    },

    createPackage: async (pkg: Partial<Package>) => {
        const dbPkg = {
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            location: pkg.location,
            days: pkg.days,
            image: pkg.image,
            features: pkg.highlights?.map(h => h.label) || [],
            remaining_seats: pkg.remainingSeats ?? 10,
            group_size: pkg.groupSize || 'Family',
            theme: pkg.theme || 'Tour',
            overview: pkg.overview || pkg.description || '',
            status: pkg.status || 'Active',
            offer_end_time: pkg.offerEndTime,
            included: pkg.included || [],
            not_included: pkg.notIncluded || [],
            builder_data: pkg.builderData
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
        if (pkg.highlights !== undefined) dbPkg.features = pkg.highlights.map(h => h.label);
        if (pkg.remainingSeats !== undefined) dbPkg.remaining_seats = pkg.remainingSeats;
        if (pkg.groupSize !== undefined) dbPkg.group_size = pkg.groupSize;
        if (pkg.theme !== undefined) dbPkg.theme = pkg.theme;
        if (pkg.overview !== undefined) dbPkg.overview = pkg.overview;
        if (pkg.status !== undefined) dbPkg.status = pkg.status;
        if (pkg.offerEndTime !== undefined) dbPkg.offer_end_time = pkg.offerEndTime;
        if (pkg.included !== undefined) dbPkg.included = pkg.included;
        if (pkg.notIncluded !== undefined) dbPkg.not_included = pkg.notIncluded;
        if (pkg.builderData !== undefined) dbPkg.builder_data = pkg.builderData;
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
            notes: tx.notes
        });
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

    updateAccountTransactionStatus: async (txId: string, status: string) => {
        await crud.update('account_transactions', txId, { status });
    },

    // --- BOOKINGS ---
    getBookings: async (limit: number = 100): Promise<Booking[]> => {
        const { data } = await fetchApi(`/api/bookings-with-package`);
        return (data || []).map((row: any) => ({
            id: row.id,
            type: 'Tour',
            customer: row.customer_name,
            email: row.email,
            phone: row.phone,
            title: row.package_title || 'Unknown Package',
            date: row.date,
            amount: row.amount,
            status: row.status as BookingStatus,
            payment: row.payment_status === 'Paid' ? 'Paid' : 'Unpaid',
            packageId: row.package_id,
            invoiceNo: row.invoice_no
        }));
    },

    createBooking: async (booking: Partial<Booking>) => {
        const { data } = await crud.create('bookings', {
            customer_name: booking.customer,
            email: booking.email,
            phone: booking.phone,
            date: booking.date,
            amount: booking.amount,
            package_id: booking.packageId,
            status: 'Pending',
            payment_status: 'Unpaid',
            invoice_no: booking.invoiceNo
        });
        return data;
    },

    updateBookingStatus: async (id: string, status: string) => {
        await crud.update('bookings', id, { status });
    },

    updateBooking: async (id: string, updates: Partial<Booking>) => {
        await crud.update('bookings', id, {
            customer_name: updates.customer,
            email: updates.email,
            phone: updates.phone,
            date: updates.date,
            amount: updates.amount,
            package_id: updates.packageId
        });
    },

    deleteBooking: async (id: string) => {
        await crud.remove('bookings', id);
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
            assignedTo: row.assigned_to,
            whatsapp: row.whatsapp,
            isWhatsappSame: row.is_whatsapp_same,
            aiScore: row.ai_score,
            aiSummary: row.ai_summary,
            serviceType: row.service_type,
            paxAdult: row.pax_adult,
            paxChild: row.pax_child,
            paxInfant: row.pax_infant
        }));
    },

    createLead: async (lead: Partial<Lead>) => {
        await crud.create('leads', {
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
            pax_infant: lead.paxInfant
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
        const { data } = await crud.getAll('vendors', { order: 'created_at', asc: false });
        return (data || []).map((v: any) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            location: v.location,
            contactName: v.contact_name,
            contactPhone: v.contact_phone,
            rating: v.rating,
            balanceDue: v.balance_due,
            status: 'Active',
            services: [], documents: [], transactions: [], notes: []
        }));
    },

    createVendor: async (vendor: any) => {
        const { data } = await crud.create('vendors', {
            name: vendor.name,
            category: vendor.category,
            location: vendor.location,
            contact_name: vendor.contactName,
            contact_phone: vendor.contactPhone,
            rating: vendor.rating
        });
        return data;
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
            joinedDate: c.created_at
        }));
    },

    createCustomer: async (customer: Partial<Customer>) => {
        const { data } = await crud.create('customers', {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            location: customer.location,
            type: customer.type || 'New',
            status: customer.status || 'Active',
            total_spent: customer.totalSpent || 0,
            bookings_count: customer.bookingsCount || 0
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
        await crud.update('customers', id, dbUpdates);
    },

    deleteCustomer: async (id: string) => {
        await crud.remove('customers', id);
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
            status: h.status
        }));
    },
    createMasterHotel: async (hotel: Partial<MasterHotel>) => {
        await crud.create('master_hotels', {
            name: hotel.name, location_id: hotel.locationId, rating: hotel.rating,
            amenities: hotel.amenities, price_per_night: hotel.pricePerNight,
            image: hotel.image, status: hotel.status || 'Active'
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
        if (hotel.status !== undefined) dbHotel.status = hotel.status;
        await crud.update('master_hotels', id, dbHotel);
    },
    deleteMasterHotel: async (id: string) => { await crud.remove('master_hotels', id); },

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
    createMasterRoomType: async (item: Partial<MasterRoomType>) => { await crud.create('master_room_types', item); },
    updateMasterRoomType: async (id: string, updates: Partial<MasterRoomType>) => { await crud.update('master_room_types', id, updates); },
    deleteMasterRoomType: async (id: string) => { await crud.remove('master_room_types', id); },

    getMasterMealPlans: async (): Promise<MasterMealPlan[]> => {
        const { data } = await crud.getAll('master_meal_plans', { order: 'created_at', asc: false });
        return (data || []) as MasterMealPlan[];
    },
    createMasterMealPlan: async (item: Partial<MasterMealPlan>) => { await crud.create('master_meal_plans', item); },
    updateMasterMealPlan: async (id: string, updates: Partial<MasterMealPlan>) => { await crud.update('master_meal_plans', id, updates); },
    deleteMasterMealPlan: async (id: string) => { await crud.remove('master_meal_plans', id); },

    getMasterActivities: async (): Promise<MasterActivity[]> => {
        const { data } = await crud.getAll('master_activities', { order: 'created_at', asc: false });
        return (data || []) as MasterActivity[];
    },
    createMasterActivity: async (item: Partial<MasterActivity>) => { await crud.create('master_activities', item); },
    updateMasterActivity: async (id: string, updates: Partial<MasterActivity>) => { await crud.update('master_activities', id, updates); },
    deleteMasterActivity: async (id: string) => { await crud.remove('master_activities', id); },

    getMasterTransports: async (): Promise<MasterTransport[]> => {
        const { data } = await crud.getAll('master_transports', { order: 'created_at', asc: false });
        return (data || []) as MasterTransport[];
    },
    createMasterTransport: async (item: Partial<MasterTransport>) => { await crud.create('master_transports', item); },
    updateMasterTransport: async (id: string, updates: Partial<MasterTransport>) => { await crud.update('master_transports', id, updates); },
    deleteMasterTransport: async (id: string) => { await crud.remove('master_transports', id); },

    getMasterPlans: async (): Promise<MasterPlan[]> => {
        const { data } = await crud.getAll('master_plans', { order: 'created_at', asc: false });
        return (data || []) as MasterPlan[];
    },
    createMasterPlan: async (item: Partial<MasterPlan>) => { await crud.create('master_plans', item); },
    updateMasterPlan: async (id: string, updates: Partial<MasterPlan>) => { await crud.update('master_plans', id, updates); },
    deleteMasterPlan: async (id: string) => { await crud.remove('master_plans', id); },

    getMasterLeadSources: async (): Promise<MasterLeadSource[]> => {
        const { data } = await crud.getAll('master_lead_sources', { order: 'created_at', asc: false });
        return (data || []) as MasterLeadSource[];
    },
    createMasterLeadSource: async (item: Partial<MasterLeadSource>) => { await crud.create('master_lead_sources', item); },
    updateMasterLeadSource: async (id: string, updates: Partial<MasterLeadSource>) => { await crud.update('master_lead_sources', id, updates); },
    deleteMasterLeadSource: async (id: string) => { await crud.remove('master_lead_sources', id); },

    getMasterTermsTemplates: async (): Promise<MasterTermsTemplate[]> => {
        const { data } = await crud.getAll('master_terms_templates', { order: 'created_at', asc: false });
        return (data || []) as MasterTermsTemplate[];
    },
    createMasterTermsTemplate: async (item: Partial<MasterTermsTemplate>) => { await crud.create('master_terms_templates', item); },
    updateMasterTermsTemplate: async (id: string, updates: Partial<MasterTermsTemplate>) => { await crud.update('master_terms_templates', id, updates); },
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
        if (updates.notes !== undefined) dbItem.notes = updates.notes;
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
    uploadFile: async (file: File, bucketPath: string = 'documents'): Promise<string> => {
        // For now, we'll use a simple base64 approach or external image hosting
        // TODO: Implement file upload endpoint on the backend
        const processedFile = await compressImageFile(file);

        // Convert to base64 data URL as a temporary solution
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(processedFile);
        });
    }
};
