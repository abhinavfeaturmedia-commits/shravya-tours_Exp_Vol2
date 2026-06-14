import imageCompression from 'browser-image-compression';
import { Package, Booking, Lead, LeadLog, BookingStatus, StaffMember, Customer, MasterRoomType, MasterMealPlan, MasterActivity, MasterTransport, MasterPlan, MasterLeadSource, MasterTermsTemplate, CMSBanner, CMSTestimonial, CMSGalleryImage, CMSPost, FollowUp, Proposal, DailyTarget, TimeSession, AssignmentRule, UserActivity, Campaign, MasterHotel, Task, AuditLog, Expense, AttendanceLog, Coupon, DailyMarketingLog, MarketingTarget, LogComment, LogReaction, InAppNotification } from '../../types';

// ─── BASE API URL ───
// In dev mode, use Vite proxy (empty string) so request goes to the same origin.
// Only override if VITE_API_URL is explicitly set (e.g. for production, use '').
const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Fetch Helper ───
async function fetchApi(path: string, options: RequestInit = {}): Promise<any> {
    const isPartnerPath = path.startsWith('/api/partner');
    const token = isPartnerPath
        ? (localStorage.getItem('shrawello_partner_jwt') || localStorage.getItem('shravya_jwt'))
        : (localStorage.getItem('shravya_jwt') || localStorage.getItem('shrawello_partner_jwt'));
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
    getAll: (table: string, opts?: { order?: string; asc?: boolean; limit?: number; select?: string; filters?: Record<string, string> }) => {
        const params = new URLSearchParams();
        if (opts?.order) params.set('order', opts.order);
        if (opts?.asc !== undefined) params.set('asc', String(opts.asc));
        if (opts?.limit) params.set('limit', String(opts.limit));
        if (opts?.select) params.set('select', opts.select);
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

const mapPackage = (row: any): Package => {
    // Extract itinerary: prefer dedicated itinerary JSON column, then extract from builder_data.days
    let itinerary: { day: number; title: string; desc: string }[] = [];
    const rawItinerary = parseJsonFieldSafe(row.itinerary, null);
    if (rawItinerary && Array.isArray(rawItinerary) && rawItinerary.length > 0) {
        itinerary = rawItinerary;
    } else {
        // Fall back: extract from builder_data.days (each day has title + activities)
        const builderData = parseJsonFieldSafe(row.builder_data, null);
        if (builderData?.days && Array.isArray(builderData.days)) {
            itinerary = builderData.days.map((d: any, i: number) => ({
                day: d.day ?? (i + 1),
                title: d.title || `Day ${d.day ?? (i + 1)}`,
                desc: [
                    d.description || '',
                    ...(Array.isArray(d.activities) ? d.activities.map((a: any) =>
                        typeof a === 'string' ? a : (a.name || a.title || '')
                    ) : [])
                ].filter(Boolean).join('\n') || 'Day details not specified.'
            }));
        } else if (builderData?.items && Array.isArray(builderData.items)) {
            // Reconstruct itinerary from new V2 builderData items array
            const daysCount = builderData.tripDetails?.days || row.days || 4;
            const days = Array.from({ length: daysCount }, (_, i) => i + 1);
            itinerary = days.map(day => {
                const dayItems = builderData.items.filter((i: any) => i.day === day);
                const desc = dayItems.length === 0
                    ? 'Leisure day for personal exploration.'
                    : dayItems
                        .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))
                        .map((item: any) => `• ${item.time ? item.time + ': ' : ''}${item.title}${item.description ? ' - ' + item.description : ''}`)
                        .join('\n');
                
                const dayTheme = (builderData.dayMeta?.[day] as any)?.theme
                    || dayItems.find((i: any) => i.type === 'activity')?.title
                    || (day === 1 ? 'Arrival & Welcome' : `Day ${day} Itinerary`);
                
                return { day, title: dayTheme, desc, items: dayItems };
            });
        }
    }

    // Extract highlights: prefer stored highlights JSON (with icons), fall back to features string[]
    let highlights: { icon: string; label: string }[] = [];
    const rawHighlights = parseJsonFieldSafe(row.highlights, null);
    if (rawHighlights && Array.isArray(rawHighlights) && rawHighlights.length > 0) {
        // Stored as {icon, label} objects
        highlights = rawHighlights.map((h: any) => ({
            icon: h.icon || 'star',
            label: h.label || String(h)
        }));
    } else {
        // Legacy: features stored as plain string[]
        highlights = parseJsonFieldSafe(row.features, []).map((f: any) => ({
            icon: typeof f === 'object' ? (f.icon || 'star') : 'star',
            label: typeof f === 'object' ? (f.label || String(f)) : String(f)
        }));
    }

    return {
        id: row.id,
        title: row.title,
        days: row.days,
        groupSize: row.group_size || 'Family',
        location: row.location || '',
        description: row.description || '',
        price: row.price,
        originalPrice: row.original_price ? Number(row.original_price) : undefined,
        pricingMode: (row.pricing_mode as any) || 'group',
        image: row.image || '',
        tag: row.tag || undefined,
        tagColor: row.tag_color || undefined,
        remainingSeats: row.remaining_seats,
        highlights,
        itinerary,
        theme: row.theme || 'Tour',
        overview: row.overview || row.description || '',
        status: row.status as any || 'Active',
        offerEndTime: row.offer_end_time,
        included: parseJsonFieldSafe(row.included, []),
        notIncluded: parseJsonFieldSafe(row.not_included, []),
        gallery: parseJsonFieldSafe(row.gallery, []),
        addons: parseJsonFieldSafe(row.addons, undefined),
        builderData: parseJsonFieldSafe(row.builder_data, null),
        itinerary_status: row.itinerary_status,
        client_name: row.client_name,
        client_id: row.client_id,
        validity_date: row.validity_date,
        terms_and_conditions: row.terms_and_conditions,
        partnerCommissionType: row.partner_commission_type || undefined,
        partnerCommissionValue: row.partner_commission_value !== null && row.partner_commission_value !== undefined ? Number(row.partner_commission_value) : undefined
    };
};

export const api = {
    // --- PACKAGES ---
    // List call: excludes the heavy builder_data blob (~90% smaller payload, fixes ECONNRESET on large responses)
    getPackages: async (): Promise<Package[]> => {
        const SELECT_COLS = [
            'id','title','days','group_size','location','description','price','original_price',
            'pricing_mode','image','tag','tag_color','remaining_seats','highlights','features',
            'theme','overview','status','offer_end_time','included','not_included','gallery',
            'addons','itinerary','itinerary_status','client_name','client_id',
            'validity_date','terms_and_conditions','created_at'
        ].join(',');
        const { data } = await crud.getAll('packages', { order: 'created_at', asc: false, select: SELECT_COLS });
        return (data || []).map(mapPackage);
    },

    // Full fetch for a single package – includes builder_data needed by detail/editing pages
    getPackageById: async (id: string): Promise<Package | null> => {
        try {
            const { data } = await crud.getOne('packages', id);
            return data ? mapPackage(data) : null;
        } catch {
            return null;
        }
    },

    createPackage: async (pkg: Partial<Package>) => {
        const dbPkg = {
            id: pkg.id,
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            original_price: pkg.originalPrice ?? null,
            pricing_mode: pkg.pricingMode || 'group',
            location: pkg.location,
            days: pkg.days,
            image: pkg.image,
            tag: pkg.tag || null,
            tag_color: pkg.tagColor || null,
            // Highlights: store full {icon, label}[] so icons are preserved
            features: JSON.stringify(pkg.highlights?.map(h => h.label) || []),
            highlights: pkg.highlights ? JSON.stringify(pkg.highlights) : null,
            // Itinerary: store as dedicated JSON column
            itinerary: pkg.itinerary && pkg.itinerary.length > 0 ? JSON.stringify(pkg.itinerary) : null,
            remaining_seats: pkg.remainingSeats ?? 10,
            group_size: pkg.groupSize || 'Family',
            theme: pkg.theme || 'Tour',
            overview: pkg.overview || pkg.description || '',
            status: pkg.status || 'Active',
            offer_end_time: pkg.offerEndTime,
            included: JSON.stringify(pkg.included || []),
            not_included: JSON.stringify(pkg.notIncluded || []),
            gallery: pkg.gallery ? JSON.stringify(pkg.gallery) : '[]',
            addons: pkg.addons ? JSON.stringify(pkg.addons) : null,
            builder_data: pkg.builderData ? JSON.stringify(pkg.builderData) : null,
            itinerary_status: (pkg as any).itinerary_status || (pkg as any).itineraryStatus || 'Draft',
            client_name: (pkg as any).client_name || (pkg as any).clientName || null,
            client_id: (pkg as any).client_id || (pkg as any).clientId || null,
            validity_date: (pkg as any).validity_date || (pkg as any).validityDate || null,
            terms_and_conditions: (pkg as any).terms_and_conditions || (pkg as any).termsAndConditions || null,
            partner_commission_type: pkg.partnerCommissionType || null,
            partner_commission_value: pkg.partnerCommissionValue ?? null
        };
        const { data } = await crud.create('packages', dbPkg);
        return mapPackage(data);
    },

    updatePackage: async (id: string, pkg: Partial<Package>) => {
        const dbPkg: any = {};
        if (pkg.title !== undefined) dbPkg.title = pkg.title;
        if (pkg.description !== undefined) dbPkg.description = pkg.description;
        if (pkg.price !== undefined) dbPkg.price = pkg.price;
        if (pkg.originalPrice !== undefined) dbPkg.original_price = pkg.originalPrice;
        if (pkg.pricingMode !== undefined) dbPkg.pricing_mode = pkg.pricingMode;
        if (pkg.location !== undefined) dbPkg.location = pkg.location;
        if (pkg.days !== undefined) dbPkg.days = pkg.days;
        if (pkg.image !== undefined) dbPkg.image = pkg.image;
        if (pkg.tag !== undefined) dbPkg.tag = pkg.tag;
        if (pkg.tagColor !== undefined) dbPkg.tag_color = pkg.tagColor;
        if (pkg.highlights !== undefined) {
            // Store full {icon, label}[] for icons AND legacy label-only array
            dbPkg.features = JSON.stringify(pkg.highlights.map(h => h.label));
            dbPkg.highlights = JSON.stringify(pkg.highlights);
        }
        if (pkg.itinerary !== undefined) dbPkg.itinerary = JSON.stringify(pkg.itinerary);
        if (pkg.remainingSeats !== undefined) dbPkg.remaining_seats = pkg.remainingSeats;
        if (pkg.groupSize !== undefined) dbPkg.group_size = pkg.groupSize;
        if (pkg.theme !== undefined) dbPkg.theme = pkg.theme;
        if (pkg.overview !== undefined) dbPkg.overview = pkg.overview;
        if (pkg.status !== undefined) dbPkg.status = pkg.status;
        if (pkg.offerEndTime !== undefined) dbPkg.offer_end_time = pkg.offerEndTime;
        if (pkg.included !== undefined) dbPkg.included = JSON.stringify(pkg.included);
        if (pkg.notIncluded !== undefined) dbPkg.not_included = JSON.stringify(pkg.notIncluded);
        if (pkg.gallery !== undefined) dbPkg.gallery = JSON.stringify(pkg.gallery);
        if (pkg.addons !== undefined) dbPkg.addons = JSON.stringify(pkg.addons);
        if (pkg.builderData !== undefined) dbPkg.builder_data = JSON.stringify(pkg.builderData);
        if ((pkg as any).itinerary_status !== undefined) dbPkg.itinerary_status = (pkg as any).itinerary_status;
        if ((pkg as any).itineraryStatus !== undefined) dbPkg.itinerary_status = (pkg as any).itineraryStatus;
        if ((pkg as any).client_name !== undefined) dbPkg.client_name = (pkg as any).client_name;
        if ((pkg as any).clientName !== undefined) dbPkg.client_name = (pkg as any).clientName;
        if ((pkg as any).client_id !== undefined) dbPkg.client_id = (pkg as any).client_id;
        if ((pkg as any).clientId !== undefined) dbPkg.client_id = (pkg as any).clientId;
        if ((pkg as any).validity_date !== undefined) dbPkg.validity_date = (pkg as any).validity_date;
        if ((pkg as any).validityDate !== undefined) dbPkg.validity_date = (pkg as any).validityDate;
        if ((pkg as any).terms_and_conditions !== undefined) dbPkg.terms_and_conditions = (pkg as any).terms_and_conditions;
        if ((pkg as any).termsAndConditions !== undefined) dbPkg.terms_and_conditions = (pkg as any).termsAndConditions;
        if (pkg.partnerCommissionType !== undefined) dbPkg.partner_commission_type = pkg.partnerCommissionType;
        if (pkg.partnerCommissionValue !== undefined) dbPkg.partner_commission_value = pkg.partnerCommissionValue;
        await crud.update('packages', id, dbPkg);
    },

    // Atomically decrement remaining_seats by 1 (race-condition safe)
    decrementSeats: async (id: string): Promise<number | undefined> => {
        const res = await fetchApi(`/api/packages/${encodeURIComponent(id)}/decrement-seats`, { method: 'PATCH' });
        return res.remainingSeats;
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

    bookInventorySlot: async (dateStr: string, assetId: string, paxCount: number): Promise<void> => {
        // Fetch current inventory, update booked count
        try {
            const { data } = await crud.getAll('daily_inventory', { filters: { date: dateStr, asset_id: assetId } });
            if (data && data.length > 0) {
                const slot = data[0];
                if (slot.capacity > 0 && slot.booked + paxCount > slot.capacity) throw new Error('Not enough capacity');
                await crud.update('daily_inventory', slot.id, { booked: slot.booked + paxCount });
            }
        } catch (err: any) {
            throw new Error(err.message || 'Failed to lock inventory');
        }
    },

    unlockInventorySlot: async (dateStr: string, assetId: string, paxCount: number): Promise<void> => {
        try {
            const { data } = await crud.getAll('daily_inventory', { filters: { date: dateStr, asset_id: assetId } });
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
            // New payments start as 'Pending' — must be approved on Payment Approvals page
            // to count toward the booking's verified balance.
            status: tx.status || 'Pending',
            receipt_url: tx.receiptUrl,
            recorded_by: tx.recordedBy || 'System'
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
            // Joined fields from the backend join
            customer: t.customer,
            email: t.email,
            phone: t.phone,
            packageId: t.packageId,
            bookingName: t.bookingName,
            recordedBy: t.recordedByName || t.recorded_by || 'System',
            source: t.source // 'booking_payment' | 'expense'
        }));
    },

    // After verifying a finance transaction, also re-sync the booking's payment_status in DB
    updateFinanceTransactionStatus: async (id: string, status: 'Pending' | 'Verified' | 'Rejected') => {
        // Expense IDs start with 'EXP-', otherwise it's a booking_transaction
        if (String(id).startsWith('EXP-')) {
            await crud.update('expenses', id, { status });
        } else {
            await crud.update('booking_transactions', id, { status });
            // After a booking transaction is verified/rejected, re-sync the booking payment_status
            // by fetching all verified txs for this booking and updating the bookings table.
            // We do this via the backend endpoint so it stays server-authoritative.
            try {
                await fetchApi('/api/finance/sync-booking-payment', {
                    method: 'POST',
                    body: JSON.stringify({ transactionId: id }),
                });
            } catch (_e) {
                // Non-critical: the getBookings API already recomputes dynamicPayment from txs
                console.warn('[Payment Sync] Could not sync booking payment_status after approval:', _e);
            }
            // Notify the useBookings React Query cache to refetch live booking data
            window.dispatchEvent(new CustomEvent('booking-transactions-changed', { detail: { transactionId: id } }));
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
                status: t.status || 'Pending',
                receiptUrl: t.receipt_url,
                recordedBy: t.recorded_by || 'System'
            }));

            const totalAmount = Number(row.total_price) || Number(row.amount) || 0;
            // netPaid = sum of Verified payments minus Verified refunds (Pending & Rejected excluded)
            const netPaid = txs.reduce((sum: number, t: any) => {
                if (t.status === 'Verified') {
                   return sum + (t.type === 'Payment' ? t.amount : t.type === 'Refund' ? -t.amount : 0);
                }
                return sum;
            }, 0);

            // Also compute including-pending so we know if ANY payment exists
            const grossPaid = txs.reduce((sum: number, t: any) => {
                if (t.status !== 'Rejected') {
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
            // If no verified txs but pending ones exist, show Deposit so user knows payment is in-progress
            else if (grossPaid > 0) dynamicPayment = 'Deposit';

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
                notes: sb.notes,
                // Live Operations transport fields
                driverName: sb.driver_name || null,
                driverPhone: sb.driver_phone || null,
                vehicleNumber: sb.vehicle_number || null
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
                bookingNumber: row.booking_number || undefined,
                type: row.type || 'Tour',
                customer: row.customer_name,
                email: row.customer_email || row.email,
                phone: row.customer_phone || row.phone,
                assignedTo: row.assigned_to ? Number(row.assigned_to) : undefined,
                title: row.title || row.package_title || 'Unknown Package',
                date: formattedDate,
                endDate: formattedEndDate || formattedDate,
                guests: row.number_of_people ? `${row.number_of_people} Adults, ${row.pax_child || 0} Children` : undefined,
                amount: totalAmount,
                status: (row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending') as BookingStatus,
                payment: dynamicPayment as any,
                packageId: row.tour_id || row.package_id,
                invoiceNo: row.invoice_no || `INV-${row.id}`,
                transactions: txs,
                supplierBookings: sbs,
                notes: parseJsonFieldSafe(row.booking_notes, []),
                // Live Operations fields from MySQL
                durationDays: row.duration_days ? Number(row.duration_days) : undefined,
                paxCount: row.pax_count ? Number(row.pax_count) : undefined,
                whatsappGroupUrl: row.whatsapp_group_url || undefined,
                liveStatus: row.live_status as any || 'Live',
                partnerId: row.partner_id || undefined,
                partnerName: row.partner_name || undefined,
                partnerCompanyName: row.partner_company_name || undefined,
                
                // Mapped Carry-Forward Fields
                whatsapp: row.whatsapp || undefined,
                isWhatsappSame: row.is_whatsapp_same !== null ? !!row.is_whatsapp_same : undefined,
                altPhone: row.alt_phone || undefined,
                paxAdult: row.pax_adult !== null ? Number(row.pax_adult) : undefined,
                paxChild: row.pax_child !== null ? Number(row.pax_child) : undefined,
                paxInfant: row.pax_infant !== null ? Number(row.pax_infant) : undefined,
                serviceType: row.service_type || undefined,
                residentialAddress: row.residential_address || undefined,
                officeAddress: row.office_address || undefined,
                appliedCouponCode: row.applied_coupon_code || undefined,
                couponDiscountAmount: row.coupon_discount_amount !== null ? Number(row.coupon_discount_amount) : undefined,
                originalPrice: row.original_price !== null ? Number(row.original_price) : undefined
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
            notes: sb.notes || null,
            // Transport-specific fields for Live Operations
            driver_name: sb.driverName || null,
            driver_phone: sb.driverPhone || null,
            vehicle_number: sb.vehicleNumber || null
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
        let adultsCount = 1;
        let childCount = 0;
        if (booking.guests) {
            const parts = booking.guests.split(',');
            parts.forEach(p => {
                if (p.toLowerCase().includes('adult')) adultsCount = parseInt(p) || 1;
                if (p.toLowerCase().includes('child')) childCount = parseInt(p) || 0;
            });
        }

        const finalAdults = booking.paxAdult !== undefined ? booking.paxAdult : adultsCount;
        const finalChildren = booking.paxChild !== undefined ? booking.paxChild : childCount;
        const finalInfants = booking.paxInfant !== undefined ? booking.paxInfant : 0;

        const dbBooking: any = {
            customer_name: booking.customer,
            customer_email: booking.email || '',
            customer_phone: booking.phone || '',
            booking_date: booking.date || new Date().toISOString().split('T')[0],
            end_date: booking.endDate || null,
            type: booking.type || 'Tour',
            title: booking.title || 'Unknown',
            total_price: booking.amount || 0,
            number_of_people: finalAdults,
            pax_child: finalChildren,
            pax_count: finalAdults + finalChildren,
            status: booking.status === 'Confirmed' ? 'confirmed' : 'pending',
            payment_status: booking.payment === 'Paid' ? 'paid' : 'pending', // Enums: pending, paid, failed, refunded
            notes: booking.details || '',
            assigned_to: booking.assignedTo || null,
            partner_id: booking.partnerId || null,
            
            // New Carry-Forward Fields
            whatsapp: booking.whatsapp || null,
            is_whatsapp_same: booking.isWhatsappSame !== undefined ? (booking.isWhatsappSame ? 1 : 0) : 1,
            alt_phone: booking.altPhone || null,
            pax_adult: finalAdults,
            pax_infant: finalInfants,
            service_type: booking.serviceType || null,
            residential_address: booking.residentialAddress || null,
            office_address: booking.officeAddress || null,
            applied_coupon_code: booking.appliedCouponCode || null,
            coupon_discount_amount: booking.couponDiscountAmount || 0.00,
            original_price: booking.originalPrice || null
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
        if (updates.partnerId !== undefined) {
            dbUpdates.partner_id = updates.partnerId || null;
        }
        if (updates.guests !== undefined) {
            let adultsCount = 1;
            let childCount = 0;
            if (updates.guests) {
                const parts = updates.guests.split(',');
                parts.forEach(p => {
                    if (p.toLowerCase().includes('adult')) adultsCount = parseInt(p) || 1;
                    if (p.toLowerCase().includes('child')) childCount = parseInt(p) || 0;
                });
            }
            dbUpdates.number_of_people = adultsCount;
            dbUpdates.pax_child = childCount;
            dbUpdates.pax_count = adultsCount + childCount;
        }
        if (updates.payment !== undefined) {
            const tempMap: any = { 'Paid': 'paid', 'Unpaid': 'pending', 'Deposit': 'deposit', 'Refunded': 'refunded' };
            dbUpdates.payment_status = tempMap[updates.payment] || 'pending';
        }
        if (updates.notes !== undefined) {
            dbUpdates.booking_notes = JSON.stringify(updates.notes);
        }
        if ((updates as any).liveStatus !== undefined) {
            dbUpdates.live_status = (updates as any).liveStatus;
        }
        if ((updates as any).whatsappGroupUrl !== undefined) {
            dbUpdates.whatsapp_group_url = (updates as any).whatsappGroupUrl || null;
        }
        
        // Serialize new carry-forward fields if present in updates
        if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp || null;
        if (updates.isWhatsappSame !== undefined) dbUpdates.is_whatsapp_same = updates.isWhatsappSame ? 1 : 0;
        if (updates.altPhone !== undefined) dbUpdates.alt_phone = updates.altPhone || null;
        if (updates.paxAdult !== undefined) dbUpdates.pax_adult = updates.paxAdult;
        if (updates.paxChild !== undefined) dbUpdates.pax_child = updates.paxChild;
        if (updates.paxInfant !== undefined) dbUpdates.pax_infant = updates.paxInfant;
        if (updates.serviceType !== undefined) dbUpdates.service_type = updates.serviceType || null;
        if (updates.residentialAddress !== undefined) dbUpdates.residential_address = updates.residentialAddress || null;
        if (updates.officeAddress !== undefined) dbUpdates.office_address = updates.officeAddress || null;
        if (updates.appliedCouponCode !== undefined) dbUpdates.applied_coupon_code = updates.appliedCouponCode || null;
        if (updates.couponDiscountAmount !== undefined) dbUpdates.coupon_discount_amount = updates.couponDiscountAmount || 0.00;
        if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice || null;
        
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
            leadNumber: row.lead_number || undefined,
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
                timestamp: l.timestamp,
                sender: l.sender
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
            officeAddress: row.office_address,
            packageId: row.package_id || undefined,        // Source package that generated this lead
            partnerId: row.partner_id || undefined,
            partnerName: row.partner_name || undefined,
            partnerCompanyName: row.partner_company_name || undefined,
            
            // New Carry-Forward Field
            altPhone: row.alt_phone || undefined
        }));
    },

    createLead: async (lead: Partial<Lead>) => {
        // Note: Do NOT pass `id` — backend auto-generates UUID + lead_number
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
            pax_infant: lead.paxInfant,
            residential_address: lead.residentialAddress,
            office_address: lead.officeAddress,
            package_id: lead.packageId || null,          // Link back to source package
            alt_phone: lead.altPhone || null
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
        if (updates.paxAdult !== undefined) dbUpdates.pax_adult = updates.paxAdult;
        if (updates.paxChild !== undefined) dbUpdates.pax_child = updates.paxChild;
        if (updates.paxInfant !== undefined) dbUpdates.pax_infant = updates.paxInfant;
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
        if (updates.residentialAddress !== undefined) dbUpdates.residential_address = updates.residentialAddress;
        if (updates.officeAddress !== undefined) dbUpdates.office_address = updates.officeAddress;
        if (updates.altPhone !== undefined) dbUpdates.alt_phone = updates.altPhone || null;
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
            timestamp: row.timestamp,
            sender: row.sender
        }));
    },

    createLeadLog: async (leadId: string, log: any) => {
        await crud.create('lead_logs', {
            lead_id: leadId,
            type: log.type,
            content: log.content,
            sender: log.sender || 'System',
            timestamp: log.timestamp || new Date().toISOString()
        });
    },

    sendStaffLeadMessage: async (leadId: string, content: string, type: string = 'Chat') => {
        return fetchApi(`/api/leads/${encodeURIComponent(leadId)}/logs`, {
            method: 'POST',
            body: JSON.stringify({ content, type })
        });
    },

    updateLeadLog: async (logId: string, content: string) => {
        await crud.update('lead_logs', logId, { content });
    },

    deleteLeadLog: async (logId: string) => {
        await crud.remove('lead_logs', logId);
    },

    // --- INVENTORY ---
    getInventory: async (): Promise<Record<string, any>> => {
        const { data } = await crud.getAll('daily_inventory');
        const inventoryMap: Record<string, any> = {};
        (data || []).forEach((slot: any) => {
            const key = `${slot.date}_${slot.asset_id}`;
            inventoryMap[key] = {
                id: slot.id,
                date: slot.date,
                assetId: slot.asset_id,
                assetType: slot.asset_type,
                capacity: slot.capacity,
                booked: slot.booked,
                price: slot.price,
                isBlocked: slot.is_blocked
            };
        });
        return inventoryMap;
    },

    updateInventory: async (dateStr: string, assetId: string, assetType: string, updates: any) => {
        // Build a clean snake_case payload — only include columns that exist in the DB schema.
        // Do NOT spread the full DailySlot object (it contains camelCase keys that break MySQL INSERT).
        // Do NOT include `booked` — that is a derived/live count from actual bookings, not a stored value.
        const payload: Record<string, any> = {
            date: dateStr,
            asset_id: assetId,
            asset_type: assetType,
            capacity: updates.capacity ?? 0,
            price: updates.price ?? 0,
            is_blocked: updates.isBlocked ?? updates.is_blocked ?? false,
        };
        await crud.upsert('daily_inventory', payload);
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
            services: parseJsonField(v.services, []),
            documents: parseJsonField(v.documents, [])
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
            transactions: vendor.transactions ? JSON.stringify(vendor.transactions) : '[]',
            services: vendor.services ? JSON.stringify(vendor.services) : '[]',
            documents: vendor.documents ? JSON.stringify(vendor.documents) : '[]'
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
        if (updates.services !== undefined) dbUpdates.services = Array.isArray(updates.services) ? JSON.stringify(updates.services) : updates.services;
        if (updates.documents !== undefined) dbUpdates.documents = Array.isArray(updates.documents) ? JSON.stringify(updates.documents) : updates.documents;
        
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
            // Fix: use null/undefined check only — don't coerce 'Inactive' to 'Active'
            status: s.status != null ? s.status : 'Active',
            initials: s.initials || (s.name ? s.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'XX'),
            color: s.color || 'slate',
            permissions: typeof s.permissions === 'string' ? JSON.parse(s.permissions) : (s.permissions || {}),
            queryScope: s.query_scope || 'Show Assigned Query Only',
            whatsappScope: s.whatsapp_scope || 'Assigned Queries Messages',
            lastActive: s.last_active || 'Never',
            phone: s.phone || '',
            attendanceStatus: s.attendance_status || 'Absent',
            checkInTime: s.check_in_time && !isNaN(Date.parse(s.check_in_time))
                ? new Date(s.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '-',
            currentLocation: s.current_location || ''
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
            // Fix: same safe null check for status
            status: s.status != null ? s.status : 'Active',
            initials: s.initials,
            color: s.color,
            permissions: typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions,
            queryScope: s.query_scope,
            whatsappScope: s.whatsapp_scope,
            lastActive: s.last_active,
            phone: s.phone,
            attendanceStatus: s.attendance_status || 'Absent',
            checkInTime: s.check_in_time && !isNaN(Date.parse(s.check_in_time))
                ? new Date(s.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '-',
            currentLocation: s.current_location || ''
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
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;
        if (updates.department !== undefined) dbUpdates.department = updates.department;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.initials !== undefined) dbUpdates.initials = updates.initials;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.queryScope !== undefined) dbUpdates.query_scope = updates.queryScope;
        if (updates.whatsappScope !== undefined) dbUpdates.whatsapp_scope = updates.whatsappScope;
        if ((updates as any).phone !== undefined) dbUpdates.phone = (updates as any).phone;
        if (updates.permissions !== undefined) dbUpdates.permissions = JSON.stringify(updates.permissions);
        await crud.update('staff_members', id, dbUpdates);
    },

    deleteStaff: async (id: number) => {
        // Fix #3: Uses dedicated endpoint that also removes the auth user from `users` table
        await fetchApi(`/api/staff/${id}`, { method: 'DELETE' });
    },

    resetStaffPassword: async (id: number, newPassword: string) => {
        // Fix #1: Resets password in the `users` auth table
        return fetchApi(`/api/staff/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ newPassword })
        });
    },

    // Heartbeat: updates last_active for the current user on app startup
    heartbeat: async (): Promise<{ staff: any } | null> => {
        try {
            const result = await fetchApi('/api/auth/me');
            return result || null;
        } catch {
            return null;
        }
    },

    // --- ATTENDANCE LOGS (Live Operations) ---
    // Fetches all attendance logs for a given date (YYYY-MM-DD)
    getAttendanceLogs: async (date: string): Promise<AttendanceLog[]> => {
        const { data } = await crud.getAll('attendance_logs', { filters: { date } });
        return (data || []).map((row: any) => ({
            id: row.id,
            staffId: Number(row.staff_id),
            date: row.date,
            status: row.status as any,
            checkInTime: row.check_in_time || undefined,
            checkOutTime: row.check_out_time || undefined,
            location: row.location || undefined,
            notes: row.notes || undefined
        }));
    },

    // Creates a new attendance log entry for a staff member for today
    createAttendanceLog: async (log: Omit<AttendanceLog, 'id'>): Promise<AttendanceLog> => {
        const crypto = { randomUUID: () => `ATL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
        const id = crypto.randomUUID();
        const { data } = await crud.create('attendance_logs', {
            id,
            staff_id: log.staffId,
            date: log.date,
            status: log.status,
            check_in_time: log.checkInTime || null,
            check_out_time: log.checkOutTime || null,
            location: log.location || null,
            notes: log.notes || null
        });
        return { ...log, id: data?.id || id };
    },

    // Updates an existing attendance log (e.g. to set check_out_time or change status)
    updateAttendanceLog: async (id: string, updates: Partial<AttendanceLog>): Promise<void> => {
        const dbUpdates: any = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.checkInTime !== undefined) dbUpdates.check_in_time = updates.checkInTime || null;
        if (updates.checkOutTime !== undefined) dbUpdates.check_out_time = updates.checkOutTime || null;
        if (updates.location !== undefined) dbUpdates.location = updates.location || null;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
        await crud.update('attendance_logs', id, dbUpdates);
    },

    // Upserts today's attendance log for a staff member using MySQL's ON DUPLICATE KEY UPDATE
    upsertAttendanceLog: async (log: AttendanceLog): Promise<void> => {
        await crud.upsert('attendance_logs', {
            id: log.id,
            staff_id: log.staffId,
            date: log.date,
            status: log.status,
            check_in_time: log.checkInTime || null,
            check_out_time: log.checkOutTime || null,
            location: log.location || null,
            notes: log.notes || null
        });
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
            preferences: typeof c.preferences === 'string' ? JSON.parse(c.preferences) : (c.preferences || {}),
            prefix: c.prefix || '',
            dob: c.dob || '',
            altPhone: c.alt_phone || '',
            whatsapp: c.whatsapp || '',
            isWhatsappSame: c.is_whatsapp_same === 1 || c.is_whatsapp_same === true,
            address: c.address || '',
            officeAddress: c.office_address || ''
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
            preferences: typeof c.preferences === 'string' ? JSON.parse(c.preferences) : (c.preferences || {}),
            prefix: c.prefix || '',
            dob: c.dob || '',
            altPhone: c.alt_phone || '',
            whatsapp: c.whatsapp || '',
            isWhatsappSame: c.is_whatsapp_same === 1 || c.is_whatsapp_same === true,
            address: c.address || '',
            officeAddress: c.office_address || ''
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
            preferences: customer.preferences ? JSON.stringify(customer.preferences) : '{}',
            prefix: customer.prefix || null,
            dob: customer.dob || null,
            alt_phone: customer.altPhone || null,
            whatsapp: customer.whatsapp || null,
            is_whatsapp_same: customer.isWhatsappSame ? 1 : 0,
            address: customer.address || null,
            office_address: customer.officeAddress || null
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
        if (updates.prefix !== undefined) dbUpdates.prefix = updates.prefix || null;
        if (updates.dob !== undefined) dbUpdates.dob = updates.dob || null;
        if (updates.altPhone !== undefined) dbUpdates.alt_phone = updates.altPhone || null;
        if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp || null;
        if (updates.isWhatsappSame !== undefined) dbUpdates.is_whatsapp_same = updates.isWhatsappSame ? 1 : 0;
        if (updates.address !== undefined) dbUpdates.address = updates.address || null;
        if (updates.officeAddress !== undefined) dbUpdates.office_address = updates.officeAddress || null;
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
            relatedLeadId: t.related_lead_id, relatedBookingId: t.related_booking_id,
            category: t.category
        }));
    },
    createTask: async (task: Partial<Task>) => {
        await crud.create('tasks', {
            title: task.title, description: task.description,
            assigned_to: task.assignedTo, assigned_by: task.assignedBy,
            status: task.status || 'Pending', priority: task.priority || 'Medium',
            due_date: task.dueDate, completed_at: task.completedAt,
            related_lead_id: task.relatedLeadId, related_booking_id: task.relatedBookingId,
            category: task.category
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
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        await crud.update('tasks', id, dbUpdates);
    },
    deleteTask: async (id: string) => { await crud.remove('tasks', id); },
    generateLeadPlaybook: async (id: string, status?: string): Promise<void> => {
        await fetchApi(`/api/leads/${encodeURIComponent(id)}/generate-playbook`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    },
    generateBookingPlaybook: async (id: string, type?: string): Promise<void> => {
        await fetchApi(`/api/bookings/${encodeURIComponent(id)}/generate-playbook`, {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    },

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
        return (data || []).map((r: any) => ({
            id: r.id,
            customerName: r.customer_name || '',
            location: r.location || '',
            rating: Number(r.rating) || 5,
            text: r.content || '',
            avatarUrl: r.avatar_url || '',
            isActive: r.is_active === undefined ? true : Boolean(r.is_active)
        }));
    },
    createCMSTestimonial: async (item: Partial<CMSTestimonial>) => {
        await crud.create('cms_testimonials', {
            id: item.id,
            customer_name: item.customerName,
            content: item.text,
            rating: item.rating,
            avatar_url: item.avatarUrl,
            location: item.location,
            is_active: item.isActive
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
        const { data } = await crud.getAll('cms_gallery_images', { order: 'sort_order', asc: true });
        return (data || []).map((r: any) => ({
            id: r.id,
            title: r.title || r.caption || '',
            imageUrl: r.image_url || r.url || '',
            category: r.category || 'Other',
            tag: r.tag || undefined,
            linkUrl: r.link_url || undefined,
            featured: Boolean(r.featured),
            sortOrder: r.sort_order || 0,
            isActive: r.is_active !== false,
        }));
    },
    createCMSGalleryImage: async (item: Partial<CMSGalleryImage>) => {
        await crud.create('cms_gallery_images', {
            title: item.title,
            caption: item.title,
            image_url: item.imageUrl,
            url: item.imageUrl,
            category: item.category,
            tag: item.tag || null,
            link_url: item.linkUrl || null,
            featured: item.featured ? 1 : 0,
            sort_order: item.sortOrder || 0,
            is_active: item.isActive !== false ? 1 : 0,
        });
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
    },

    // ─── SETTINGS ───
    getSettings: async () => {
        return crud.getAll('settings', { order: 'updated_at', asc: false });
    },
    upsertSetting: async (key: string, value: string) => {
        return crud.upsert('settings', { id: key, key, value, updated_at: new Date().toISOString() });
    },

    // ─── MEMBERSHIP PLANS ───
    getMembershipPlans: () =>
        crud.getAll('membership_plans', { order: 'created_at', asc: true }).then((rows: any[]) =>
            rows.map((r: any) => ({
                id: r.id,
                name: r.name,
                tier: r.tier,
                pricePerMonth: Number(r.price_per_month || 0),
                pricePerQuarter: Number(r.price_per_quarter || 0),
                pricePerHalfYear: Number(r.price_per_half_year || 0),
                pricePerYear: Number(r.price_per_year || 0),
                discountType: r.discount_type || 'Percentage',
                discountPercent: Number(r.discount_percent || 0),
                discountFlat: Number(r.discount_flat || 0),
                hotelDiscount: Number(r.hotel_discount || 0),
                tourDiscount: Number(r.tour_discount || 0),
                flightDiscount: Number(r.flight_discount || 0),
                cabDiscount: Number(r.cab_discount || 0),
                perks: parseJsonFieldSafe(r.perks, []),
                color: r.color || '#CD7F32',
                isActive: Boolean(r.is_active),
            }))
        ),

    createMembershipPlan: (plan: any) =>
        crud.create('membership_plans', {
            id: plan.id,
            name: plan.name,
            tier: plan.tier,
            price_per_month: plan.pricePerMonth,
            price_per_quarter: plan.pricePerQuarter,
            price_per_half_year: plan.pricePerHalfYear,
            price_per_year: plan.pricePerYear,
            discount_type: plan.discountType || 'Percentage',
            discount_percent: plan.discountPercent || 0,
            discount_flat: plan.discountFlat || 0,
            hotel_discount: plan.hotelDiscount || 0,
            tour_discount: plan.tourDiscount || 0,
            flight_discount: plan.flightDiscount || 0,
            cab_discount: plan.cabDiscount || 0,
            perks: JSON.stringify(plan.perks || []),
            color: plan.color,
            is_active: plan.isActive,
        }),

    updateMembershipPlan: (id: string, plan: any) =>
        crud.update('membership_plans', id, {
            ...(plan.name !== undefined && { name: plan.name }),
            ...(plan.pricePerMonth !== undefined && { price_per_month: plan.pricePerMonth }),
            ...(plan.pricePerQuarter !== undefined && { price_per_quarter: plan.pricePerQuarter }),
            ...(plan.pricePerHalfYear !== undefined && { price_per_half_year: plan.pricePerHalfYear }),
            ...(plan.pricePerYear !== undefined && { price_per_year: plan.pricePerYear }),
            ...(plan.discountType !== undefined && { discount_type: plan.discountType }),
            ...(plan.discountPercent !== undefined && { discount_percent: plan.discountPercent }),
            ...(plan.discountFlat !== undefined && { discount_flat: plan.discountFlat }),
            ...(plan.hotelDiscount !== undefined && { hotel_discount: plan.hotelDiscount }),
            ...(plan.tourDiscount !== undefined && { tour_discount: plan.tourDiscount }),
            ...(plan.flightDiscount !== undefined && { flight_discount: plan.flightDiscount }),
            ...(plan.cabDiscount !== undefined && { cab_discount: plan.cabDiscount }),
            ...(plan.perks !== undefined && { perks: JSON.stringify(plan.perks) }),
            ...(plan.color !== undefined && { color: plan.color }),
            ...(plan.isActive !== undefined && { is_active: plan.isActive }),
        }),

    deleteMembershipPlan: (id: string) => crud.remove('membership_plans', id),

    // ─── CUSTOMER MEMBERSHIPS ───
    getCustomerMemberships: () =>
        crud.getAll('customer_memberships', { order: 'created_at', asc: false }).then((rows: any[]) =>
            rows.map((r: any) => ({
                id: r.id,
                customerId: r.customer_id,
                customerName: r.customer_name,
                customerEmail: r.customer_email,
                planId: r.plan_id,
                planName: r.plan_name,
                tier: r.tier,
                status: r.status,
                billingCycle: r.billing_cycle || 'Yearly',
                pricePaid: Number(r.price_paid || 0),
                enrolledOn: r.enrolled_on,
                expiresOn: r.expires_on,
                discountType: r.discount_type || 'Percentage',
                discountPercent: Number(r.discount_percent || 0),
                discountFlat: Number(r.discount_flat || 0),
                hotelDiscount: Number(r.hotel_discount || 0),
                tourDiscount: Number(r.tour_discount || 0),
                flightDiscount: Number(r.flight_discount || 0),
                cabDiscount: Number(r.cab_discount || 0),
                notes: r.notes,
                enrolledBy: r.enrolled_by,
            }))
        ),

    enrollCustomer: (m: any) =>
        crud.create('customer_memberships', {
            id: m.id,
            customer_id: m.customerId,
            customer_name: m.customerName,
            customer_email: m.customerEmail,
            plan_id: m.planId,
            plan_name: m.planName,
            tier: m.tier,
            status: m.status,
            billing_cycle: m.billingCycle || 'Yearly',
            price_paid: m.pricePaid || 0,
            enrolled_on: m.enrolledOn,
            expires_on: m.expiresOn,
            discount_type: m.discountType || 'Percentage',
            discount_percent: m.discountPercent || 0,
            discount_flat: m.discountFlat || 0,
            hotel_discount: m.hotelDiscount || 0,
            tour_discount: m.tourDiscount || 0,
            flight_discount: m.flightDiscount || 0,
            cab_discount: m.cabDiscount || 0,
            notes: m.notes || null,
            enrolled_by: m.enrolledBy || null,
        }),

    updateMembership: (id: string, updates: any) =>
        crud.update('customer_memberships', id, {
            ...(updates.status !== undefined && { status: updates.status }),
            ...(updates.planId !== undefined && { plan_id: updates.planId }),
            ...(updates.planName !== undefined && { plan_name: updates.planName }),
            ...(updates.tier !== undefined && { tier: updates.tier }),
            ...(updates.expiresOn !== undefined && { expires_on: updates.expiresOn }),
            ...(updates.billingCycle !== undefined && { billing_cycle: updates.billingCycle }),
            ...(updates.pricePaid !== undefined && { price_paid: updates.pricePaid }),
            ...(updates.discountType !== undefined && { discount_type: updates.discountType }),
            ...(updates.discountPercent !== undefined && { discount_percent: updates.discountPercent }),
            ...(updates.discountFlat !== undefined && { discount_flat: updates.discountFlat }),
            ...(updates.hotelDiscount !== undefined && { hotel_discount: updates.hotelDiscount }),
            ...(updates.tourDiscount !== undefined && { tour_discount: updates.tourDiscount }),
            ...(updates.flightDiscount !== undefined && { flight_discount: updates.flightDiscount }),
            ...(updates.cabDiscount !== undefined && { cab_discount: updates.cabDiscount }),
            ...(updates.notes !== undefined && { notes: updates.notes }),
        }),

    deleteMembership: (id: string) => crud.remove('customer_memberships', id),

    fetchPartnerAnalytics: async (): Promise<{ earnings: any[]; funnel: any[]; destinations: any[] }> => {
        return fetchApi('/api/partner/analytics');
    },
    fetchPartnerLeadLogs: async (leadId: string): Promise<LeadLog[]> => {
        const { data } = await fetchApi(`/api/partner/leads/${encodeURIComponent(leadId)}/logs`);
        return (data || []).map((l: any) => ({
            id: String(l.id),
            type: l.type,
            content: l.content,
            timestamp: l.timestamp,
            sender: l.sender
        }));
    },
    sendPartnerLeadMessage: async (leadId: string, content: string): Promise<any> => {
        return fetchApi(`/api/partner/leads/${encodeURIComponent(leadId)}/logs`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    },

    // --- COUPONS ---
    getCoupons: async (): Promise<Coupon[]> => {
        const { data } = await crud.getAll('coupons', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            id: r.id,
            code: r.code,
            type: r.type,
            discountType: r.discount_type,
            discountValue: Number(r.discount_value) || 0,
            minBookingAmount: r.min_booking_amount !== null && r.min_booking_amount !== undefined ? Number(r.min_booking_amount) : undefined,
            validFrom: r.valid_from ? r.valid_from.split('T')[0] : undefined,
            validTo: r.valid_to ? r.valid_to.split('T')[0] : undefined,
            status: r.status || 'Active',
            isUsed: Boolean(r.is_used),
            useCount: Number(r.use_count) || 0,
            downloadCount: Number(r.download_count) || 0,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    },

    createCoupon: async (c: any) => {
        const { data } = await crud.create('coupons', {
            id: c.id,
            code: c.code,
            type: c.type,
            discount_type: c.discountType,
            discount_value: c.discountValue,
            min_booking_amount: c.minBookingAmount || 0,
            valid_from: c.validFrom || null,
            valid_to: c.validTo || null,
            status: c.status || 'Active',
            is_used: c.isUsed ? 1 : 0,
            use_count: c.useCount || 0,
            download_count: 0
        });
        return data;
    },

    updateCoupon: async (id: string, updates: any) => {
        const dbUpdates: any = {};
        if (updates.code !== undefined) dbUpdates.code = updates.code;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.discountType !== undefined) dbUpdates.discount_type = updates.discountType;
        if (updates.discountValue !== undefined) dbUpdates.discount_value = updates.discountValue;
        if (updates.minBookingAmount !== undefined) dbUpdates.min_booking_amount = updates.minBookingAmount;
        if (updates.validFrom !== undefined) dbUpdates.valid_from = updates.validFrom || null;
        if (updates.validTo !== undefined) dbUpdates.valid_to = updates.validTo || null;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.isUsed !== undefined) dbUpdates.is_used = updates.isUsed ? 1 : 0;
        if (updates.useCount !== undefined) dbUpdates.use_count = updates.useCount;
        if (updates.downloadCount !== undefined) dbUpdates.download_count = updates.downloadCount;
        await crud.update('coupons', id, dbUpdates);
    },

    deleteCoupon: async (id: string) => {
        await crud.remove('coupons', id);
    },

    applyCoupon: async (couponCode: string, bookingId: string): Promise<any> => {
        return fetchApi('/api/coupons/apply', {
            method: 'POST',
            body: JSON.stringify({ couponCode, bookingId })
        });
    },

    detachCoupon: async (bookingId: string): Promise<any> => {
        return fetchApi('/api/coupons/detach', {
            method: 'POST',
            body: JSON.stringify({ bookingId })
        });
    },

    // --- MARKETING LOGS ---
    getMarketingLogs: async (): Promise<DailyMarketingLog[]> => {
        const [logsRes, leadsRes, bookingsRes, commentsRes, reactionsRes] = await Promise.all([
            crud.getAll('marketing_logs', { order: 'date', asc: false }),
            crud.getAll('marketing_log_leads'),
            crud.getAll('marketing_log_bookings'),
            crud.getAll('marketing_log_comments', { order: 'created_at', asc: true }),
            crud.getAll('marketing_log_reactions')
        ]);

        const leadsMap: Record<string, string[]> = {};
        (leadsRes.data || []).forEach((r: any) => {
            if (!leadsMap[r.log_id]) leadsMap[r.log_id] = [];
            leadsMap[r.log_id].push(r.lead_id);
        });

        const bookingsMap: Record<string, string[]> = {};
        (bookingsRes.data || []).forEach((r: any) => {
            if (!bookingsMap[r.log_id]) bookingsMap[r.log_id] = [];
            bookingsMap[r.log_id].push(r.booking_id);
        });

        const commentsMap: Record<string, LogComment[]> = {};
        (commentsRes.data || []).forEach((r: any) => {
            if (!commentsMap[r.log_id]) commentsMap[r.log_id] = [];
            commentsMap[r.log_id].push({
                id: r.id,
                logId: r.log_id,
                staffId: Number(r.staff_id),
                commentText: r.comment_text,
                createdAt: r.created_at
            });
        });

        const reactionsMap: Record<string, LogReaction[]> = {};
        (reactionsRes.data || []).forEach((r: any) => {
            if (!reactionsMap[r.log_id]) reactionsMap[r.log_id] = [];
            reactionsMap[r.log_id].push({
                id: r.id,
                logId: r.log_id,
                staffId: Number(r.staff_id),
                reactionType: r.reaction_type,
                createdAt: r.created_at
            });
        });

        return (logsRes.data || []).map((r: any) => ({
            id: r.id,
            date: r.date ? r.date.split('T')[0] : '',
            staffId: Number(r.staff_id),
            momentumScore: Number(r.momentum_score) || 0,
            rating: r.rating || 'steady',
            emailsSent: Number(r.emails_sent) || 0,
            socialDms: Number(r.social_dms) || 0,
            callsMade: Number(r.calls_made) || 0,
            followUps: Number(r.follow_ups) || 0,
            proposalsSent: Number(r.proposals_sent) || 0,
            dealsClosed: Number(r.deals_closed) || 0,
            revenueGenerated: Number(r.revenue_generated) || 0,
            metaSpend: Number(r.meta_spend) || 0,
            metaLeads: Number(r.meta_leads) || 0,
            adCreativeNotes: r.ad_creative_notes || undefined,
            dailySummary: r.daily_summary || undefined,
            keyLearnings: r.key_learnings || undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            taggedLeads: leadsMap[r.id] || [],
            taggedBookings: bookingsMap[r.id] || [],
            comments: commentsMap[r.id] || [],
            reactions: reactionsMap[r.id] || []
        }));
    },

    createMarketingLog: async (log: Partial<DailyMarketingLog>) => {
        const logId = log.id || (typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
        const payload = {
            id: logId,
            date: log.date,
            staff_id: log.staffId,
            momentum_score: log.momentumScore || 0,
            rating: log.rating || 'steady',
            emails_sent: log.emailsSent || 0,
            social_dms: log.socialDms || 0,
            calls_made: log.callsMade || 0,
            follow_ups: log.followUps || 0,
            proposals_sent: log.proposalsSent || 0,
            deals_closed: log.dealsClosed || 0,
            revenue_generated: log.revenueGenerated || 0.00,
            meta_spend: log.metaSpend || 0.00,
            meta_leads: log.metaLeads || 0,
            ad_creative_notes: log.adCreativeNotes || null,
            daily_summary: log.dailySummary || null,
            key_learnings: log.keyLearnings || null
        };
        const { data } = await crud.create('marketing_logs', payload);
        
        // Handle lead tagging
        if (log.taggedLeads && log.taggedLeads.length > 0) {
            await Promise.all(log.taggedLeads.map(leadId => {
                const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                return crud.create('marketing_log_leads', { id: uuid, log_id: logId, lead_id: leadId });
            }));
        }

        // Handle booking tagging
        if (log.taggedBookings && log.taggedBookings.length > 0) {
            await Promise.all(log.taggedBookings.map(bookingId => {
                const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                return crud.create('marketing_log_bookings', { id: uuid, log_id: logId, booking_id: bookingId });
            }));
        }

        return data;
    },

    updateMarketingLog: async (id: string, log: Partial<DailyMarketingLog>) => {
        const dbUpdates: any = {};
        if (log.date !== undefined) dbUpdates.date = log.date;
        if (log.staffId !== undefined) dbUpdates.staff_id = log.staffId;
        if (log.momentumScore !== undefined) dbUpdates.momentum_score = log.momentumScore;
        if (log.rating !== undefined) dbUpdates.rating = log.rating;
        if (log.emailsSent !== undefined) dbUpdates.emails_sent = log.emailsSent;
        if (log.socialDms !== undefined) dbUpdates.social_dms = log.socialDms;
        if (log.callsMade !== undefined) dbUpdates.calls_made = log.callsMade;
        if (log.followUps !== undefined) dbUpdates.follow_ups = log.followUps;
        if (log.proposalsSent !== undefined) dbUpdates.proposals_sent = log.proposalsSent;
        if (log.dealsClosed !== undefined) dbUpdates.deals_closed = log.dealsClosed;
        if (log.revenueGenerated !== undefined) dbUpdates.revenue_generated = log.revenueGenerated;
        if (log.metaSpend !== undefined) dbUpdates.meta_spend = log.metaSpend;
        if (log.metaLeads !== undefined) dbUpdates.meta_leads = log.metaLeads;
        if (log.adCreativeNotes !== undefined) dbUpdates.ad_creative_notes = log.adCreativeNotes || null;
        if (log.dailySummary !== undefined) dbUpdates.daily_summary = log.dailySummary || null;
        if (log.keyLearnings !== undefined) dbUpdates.key_learnings = log.keyLearnings || null;
        
        await crud.update('marketing_logs', id, dbUpdates);

        // Update lead tags if provided
        if (log.taggedLeads !== undefined) {
            try {
                const existingLeads = await crud.getAll('marketing_log_leads', { filters: { log_id: id } });
                await Promise.all((existingLeads.data || []).map((r: any) =>
                    crud.remove('marketing_log_leads', r.id)
                ));
            } catch {}
            await Promise.all((log.taggedLeads || []).map(leadId => {
                const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                return crud.create('marketing_log_leads', { id: uuid, log_id: id, lead_id: leadId });
            }));
        }

        // Update booking tags if provided
        if (log.taggedBookings !== undefined) {
            try {
                const existingBookings = await crud.getAll('marketing_log_bookings', { filters: { log_id: id } });
                await Promise.all((existingBookings.data || []).map((r: any) =>
                    crud.remove('marketing_log_bookings', r.id)
                ));
            } catch {}
            await Promise.all((log.taggedBookings || []).map(bookingId => {
                const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                return crud.create('marketing_log_bookings', { id: uuid, log_id: id, booking_id: bookingId });
            }));
        }
    },

    deleteMarketingLog: async (id: string) => {
        try {
            const [leads, bookings, comments, reactions] = await Promise.all([
                crud.getAll('marketing_log_leads', { filters: { log_id: id } }),
                crud.getAll('marketing_log_bookings', { filters: { log_id: id } }),
                crud.getAll('marketing_log_comments', { filters: { log_id: id } }),
                crud.getAll('marketing_log_reactions', { filters: { log_id: id } })
            ]);
            await Promise.all([
                ...(leads.data || []).map((r: any) => crud.remove('marketing_log_leads', r.id)),
                ...(bookings.data || []).map((r: any) => crud.remove('marketing_log_bookings', r.id)),
                ...(comments.data || []).map((r: any) => crud.remove('marketing_log_comments', r.id)),
                ...(reactions.data || []).map((r: any) => crud.remove('marketing_log_reactions', r.id))
            ]);
        } catch {}
        await crud.remove('marketing_logs', id);
    },

    // --- MARKETING TARGETS ---
    getMarketingTargets: async (): Promise<MarketingTarget[]> => {
        const { data } = await crud.getAll('marketing_targets');
        return (data || []).map((r: any) => ({
            id: r.id,
            staffId: Number(r.staff_id),
            date: r.date ? r.date.split('T')[0] : '',
            targetEmails: Number(r.target_emails) || 0,
            targetDms: Number(r.target_dms) || 0,
            targetCalls: Number(r.target_calls) || 0,
            targetSpend: Number(r.target_spend) || 0
        }));
    },

    upsertMarketingTarget: async (target: Partial<MarketingTarget>) => {
        const filters = { staff_id: String(target.staffId), date: target.date! };
        const { data } = await crud.getAll('marketing_targets', { filters });
        const payload = {
            staff_id: target.staffId,
            date: target.date,
            target_emails: target.targetEmails || 0,
            target_dms: target.targetDms || 0,
            target_calls: target.targetCalls || 0,
            target_spend: target.targetSpend || 0.00
        };
        if (data && data.length > 0) {
            await crud.update('marketing_targets', data[0].id, payload);
            return data[0];
        } else {
            const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            const { data: newTarget } = await crud.create('marketing_targets', { id: uuid, ...payload });
            return newTarget;
        }
    },

    // --- COMMENTS ---
    addLogComment: async (comment: Partial<LogComment>) => {
        const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        const payload = {
            id: uuid,
            log_id: comment.logId,
            staff_id: comment.staffId,
            comment_text: comment.commentText
        };
        const { data } = await crud.create('marketing_log_comments', payload);
        return data;
    },

    deleteLogComment: async (id: string) => {
        await crud.remove('marketing_log_comments', id);
    },

    // --- REACTIONS ---
    toggleReaction: async (logId: string, staffId: number, reactionType: string) => {
        const filters = { log_id: logId, staff_id: String(staffId), reaction_type: reactionType };
        const { data } = await crud.getAll('marketing_log_reactions', { filters });
        if (data && data.length > 0) {
            await crud.remove('marketing_log_reactions', data[0].id);
            return { action: 'removed', id: data[0].id };
        } else {
            const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            const payload = {
                id: uuid,
                log_id: logId,
                staff_id: staffId,
                reaction_type: reactionType
            };
            const { data: newReaction } = await crud.create('marketing_log_reactions', payload);
            return { action: 'added', data: newReaction };
        }
    },

    // --- IN-APP NOTIFICATIONS ---
    getInAppNotifications: async (): Promise<InAppNotification[]> => {
        const { data } = await crud.getAll('in_app_notifications', { order: 'created_at', asc: false });
        return (data || []).map((r: any) => ({
            id: r.id,
            staffId: Number(r.staff_id),
            senderId: Number(r.sender_id),
            title: r.title,
            message: r.message,
            type: r.type || 'info',
            isRead: Boolean(r.is_read),
            createdAt: r.created_at
        }));
    },

    createInAppNotification: async (notif: Partial<InAppNotification>) => {
        const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        const payload = {
            id: uuid,
            staff_id: notif.staffId,
            sender_id: notif.senderId,
            title: notif.title,
            message: notif.message,
            type: notif.type || 'info',
            is_read: 0
        };
        const { data } = await crud.create('in_app_notifications', payload);
        return data;
    },

    markNotificationRead: async (id: string) => {
        await crud.update('in_app_notifications', id, { is_read: 1 });
    },

    // --- TRENDING DESTINATIONS ---
    getTrendingDestinations: async (): Promise<any[]> => {
        try {
            const { data } = await fetchApi('/api/trending-destinations');
            return (data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                country: r.country || undefined,
                region: r.region || undefined,
                imageUrl: r.image_url,
                badge: r.badge || undefined,
                badgeColor: r.badge_color || '#ef4444',
                statLabel: r.stat_label || undefined,
                packageCount: r.package_count || 0,
                sortOrder: r.sort_order || 0,
                isActive: Boolean(r.is_active),
                packageIds: r.package_ids || [],
            }));
        } catch {
            return [];
        }
    },

    getTrendingDestinationsAdmin: async (): Promise<any[]> => {
        try {
            const { data } = await fetchApi('/api/trending-destinations/all');
            return (data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                country: r.country || undefined,
                region: r.region || undefined,
                imageUrl: r.image_url,
                badge: r.badge || undefined,
                badgeColor: r.badge_color || '#ef4444',
                statLabel: r.stat_label || undefined,
                packageCount: r.package_count || 0,
                sortOrder: r.sort_order || 0,
                isActive: Boolean(r.is_active),
                packageIds: r.package_ids || [],
            }));
        } catch {
            return [];
        }
    },

    createTrendingDestination: async (dest: any): Promise<any> => {
        const { data } = await fetchApi('/api/trending-destinations', {
            method: 'POST',
            body: JSON.stringify({
                id: dest.id,
                name: dest.name,
                country: dest.country || null,
                region: dest.region || null,
                image_url: dest.imageUrl,
                badge: dest.badge || null,
                badge_color: dest.badgeColor || '#ef4444',
                stat_label: dest.statLabel || null,
                package_count: dest.packageCount || 0,
                sort_order: dest.sortOrder || 0,
                is_active: dest.isActive !== false,
                package_ids: dest.packageIds || [],
            })
        });
        if (!data) return null;
        return {
            id: data.id,
            name: data.name,
            country: data.country || undefined,
            region: data.region || undefined,
            imageUrl: data.image_url,
            badge: data.badge || undefined,
            badgeColor: data.badge_color || '#ef4444',
            statLabel: data.stat_label || undefined,
            packageCount: data.package_count || 0,
            sortOrder: data.sort_order || 0,
            isActive: Boolean(data.is_active),
            packageIds: data.package_ids || [],
        };
    },

    updateTrendingDestination: async (id: string, dest: Partial<any>): Promise<any> => {
        const payload: any = {};
        if (dest.name !== undefined) payload.name = dest.name;
        if (dest.country !== undefined) payload.country = dest.country;
        if (dest.region !== undefined) payload.region = dest.region;
        if (dest.imageUrl !== undefined) payload.image_url = dest.imageUrl;
        if (dest.badge !== undefined) payload.badge = dest.badge;
        if (dest.badgeColor !== undefined) payload.badge_color = dest.badgeColor;
        if (dest.statLabel !== undefined) payload.stat_label = dest.statLabel;
        if (dest.packageCount !== undefined) payload.package_count = dest.packageCount;
        if (dest.sortOrder !== undefined) payload.sort_order = dest.sortOrder;
        if (dest.isActive !== undefined) payload.is_active = dest.isActive;
        if (dest.packageIds !== undefined) payload.package_ids = dest.packageIds;
        const { data } = await fetchApi(`/api/trending-destinations/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (!data) return null;
        return {
            id: data.id,
            name: data.name,
            country: data.country || undefined,
            region: data.region || undefined,
            imageUrl: data.image_url,
            badge: data.badge || undefined,
            badgeColor: data.badge_color || '#ef4444',
            statLabel: data.stat_label || undefined,
            packageCount: data.package_count || 0,
            sortOrder: data.sort_order || 0,
            isActive: Boolean(data.is_active),
            packageIds: data.package_ids || [],
        };
    },
    deleteTrendingDestination: async (id: string): Promise<void> => {
        await fetchApi(`/api/trending-destinations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
};
