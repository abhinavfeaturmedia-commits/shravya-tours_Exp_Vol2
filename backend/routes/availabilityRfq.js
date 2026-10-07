/**
 * Multi-vendor Availability & Quote Request (RFQ) routes.
 *  - Admin (auth):  /api/admin/availability-rfqs
 *  - Public (token): /api/public/availability-rfq/:token
 */
import express from 'express';
import crypto from 'crypto';
import { sendAvailabilityRequestEmail } from '../emailService.js';

const SERVICE_TYPES = ['Hotel', 'Transport', 'DMC', 'Activity'];
const PRICE_BASES = ['Total', 'Per Night', 'Per Day', 'Per Person'];
const EXPIRY_DAYS = 7;

const newId = () => crypto.randomBytes(16).toString('hex');
const bookingRef = (n) => `BK-${String(n || 0).padStart(4, '0')}`;
const cleanBase = (u) => String(u || '').replace(/\/+$/, '');

function parseLines(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch { return []; }
}

async function notifyStaff(pool, title, message, link) {
    try {
        await pool.query(
            'INSERT INTO in_app_notifications (id, type, title, message, link, is_read) VALUES (?, ?, ?, ?, ?, 0)',
            [newId(), 'availability', title, message, link || null]
        );
    } catch (e) {
        console.warn('[AvailabilityRFQ] notify failed:', e.message);
    }
}

export function createAvailabilityRfqRoutes(app, pool, authMiddleware) {
    const router = express.Router();
    router.use(authMiddleware);

    // ---------- Admin: create RFQ + send emails ----------
    router.post('/', async (req, res) => {
        try {
            const { bookingId, serviceType, summaryLines, notes, vendors, baseUrl, destination, startDate, endDate } = req.body || {};
            if (!bookingId || !SERVICE_TYPES.includes(serviceType)) {
                return res.status(400).json({ error: 'Valid bookingId and serviceType are required' });
            }
            if (!Array.isArray(vendors) || vendors.length === 0) {
                return res.status(400).json({ error: 'Select at least one vendor' });
            }
            const base = cleanBase(process.env.PUBLIC_APP_URL || baseUrl);
            if (!base) return res.status(400).json({ error: 'Base URL missing' });

            const [bRows] = await pool.query('SELECT id, booking_number, title FROM bookings WHERE id = ?', [bookingId]);
            if (!bRows.length) return res.status(404).json({ error: 'Booking not found' });
            const ref = bookingRef(bRows[0].booking_number);

            const lines = (Array.isArray(summaryLines) ? summaryLines : [])
                .filter(l => l && l.label && l.value)
                .map(l => ({ label: String(l.label).slice(0, 80), value: String(l.value).slice(0, 300) }));
            const createdBy = req.user?.email || req.user?.staffId || null;
            const rfqId = newId();

            await pool.query(
                `INSERT INTO availability_rfqs (id, booking_id, service_type, title, destination, start_date, end_date, summary_lines, notes, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)`,
                [rfqId, bookingId, serviceType, bRows[0].title || null, destination || null,
                 startDate || null, endDate || null, JSON.stringify(lines), notes ? String(notes).slice(0, 2000) : null, createdBy]
            );

            const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86400000);
            const results = await Promise.all(vendors.map(async (v) => {
                const inviteId = newId();
                const token = crypto.randomBytes(16).toString('hex');
                const email = (v.email || '').trim() || null;
                const link = `${base}/availability/${token}`;
                await pool.query(
                    `INSERT INTO availability_rfq_invites (id, rfq_id, vendor_id, vendor_name, vendor_email, vendor_phone, token, status, sent_at, expires_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Sent', NOW(), ?)`,
                    [inviteId, rfqId, v.vendorId || null, String(v.name || 'Vendor').slice(0, 255), email, v.phone || null, token, expiresAt]
                );
                let emailStatus = 'Failed';
                let emailError = email ? null : 'No email address';
                if (email) {
                    const r = await sendAvailabilityRequestEmail({
                        to: email, vendorName: v.name, serviceType, bookingRef: ref,
                        summaryLines: lines, notes, link, expiresAt
                    });
                    emailStatus = r.success ? 'Sent' : 'Failed';
                    emailError = r.success ? null : String(r.error || 'Send failed').slice(0, 480);
                }
                await pool.query('UPDATE availability_rfq_invites SET email_status = ?, email_error = ? WHERE id = ?', [emailStatus, emailError, inviteId]);
                return { inviteId, vendorName: v.name, emailStatus, emailError, link };
            }));

            res.json({ rfqId, results });
        } catch (e) {
            console.error('[AvailabilityRFQ] create error:', e);
            res.status(500).json({ error: 'Failed to create request' });
        }
    });

    // ---------- Admin: list for a booking ----------
    router.get('/', async (req, res) => {
        try {
            const { bookingId } = req.query;
            if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
            const [rfqs] = await pool.query('SELECT * FROM availability_rfqs WHERE booking_id = ? ORDER BY created_at DESC', [bookingId]);
            if (!rfqs.length) return res.json([]);
            const [invites] = await pool.query(
                `SELECT * FROM availability_rfq_invites WHERE rfq_id IN (${rfqs.map(() => '?').join(',')}) ORDER BY vendor_name`,
                rfqs.map(r => r.id)
            );
            const base = cleanBase(process.env.PUBLIC_APP_URL || req.query.baseUrl);
            res.json(rfqs.map(r => ({
                id: r.id, bookingId: r.booking_id, serviceType: r.service_type, title: r.title,
                destination: r.destination, startDate: r.start_date, endDate: r.end_date,
                summaryLines: parseLines(r.summary_lines), notes: r.notes, status: r.status,
                awardedInviteId: r.awarded_invite_id, createdBy: r.created_by, createdAt: r.created_at,
                invites: invites.filter(i => i.rfq_id === r.id).map(i => ({
                    id: i.id, rfqId: i.rfq_id, vendorId: i.vendor_id, vendorName: i.vendor_name,
                    vendorEmail: i.vendor_email, vendorPhone: i.vendor_phone, status: i.status,
                    quotedPrice: i.quoted_price != null ? Number(i.quoted_price) : null,
                    priceBasis: i.price_basis, vendorRemark: i.vendor_remark, respondedBy: i.responded_by,
                    emailStatus: i.email_status, emailError: i.email_error, sentAt: i.sent_at,
                    viewedAt: i.viewed_at, respondedAt: i.responded_at, expiresAt: i.expires_at,
                    reminderCount: i.reminder_count || 0,
                    link: base ? `${base}/availability/${i.token}` : null
                }))
            })));
        } catch (e) {
            console.error('[AvailabilityRFQ] list error:', e);
            res.status(500).json({ error: 'Failed to load requests' });
        }
    });

    // ---------- Admin: resend / remind ----------
    router.post('/:rfqId/invites/:inviteId/resend', async (req, res) => {
        try {
            const { rfqId, inviteId } = req.params;
            const { baseUrl, email: override } = req.body || {};
            const base = cleanBase(process.env.PUBLIC_APP_URL || baseUrl);
            if (!base) return res.status(400).json({ error: 'Base URL missing' });
            const [rows] = await pool.query(
                `SELECT i.*, r.service_type, r.summary_lines, r.notes, r.status AS rfq_status, b.booking_number
                 FROM availability_rfq_invites i
                 JOIN availability_rfqs r ON r.id = i.rfq_id
                 LEFT JOIN bookings b ON b.id = r.booking_id
                 WHERE i.id = ? AND i.rfq_id = ?`, [inviteId, rfqId]);
            if (!rows.length) return res.status(404).json({ error: 'Invite not found' });
            const i = rows[0];
            if (i.rfq_status !== 'Open') return res.status(400).json({ error: 'Request is closed' });
            const to = (override || i.vendor_email || '').trim();
            if (!to) return res.status(400).json({ error: 'No email address for this vendor' });

            const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86400000);
            const r = await sendAvailabilityRequestEmail({
                to, vendorName: i.vendor_name, serviceType: i.service_type, bookingRef: bookingRef(i.booking_number),
                summaryLines: parseLines(i.summary_lines), notes: i.notes,
                link: `${base}/availability/${i.token}`, expiresAt, isReminder: true
            });
            await pool.query(
                `UPDATE availability_rfq_invites SET vendor_email = ?, email_status = ?, email_error = ?, expires_at = ?, reminder_count = reminder_count + 1 WHERE id = ?`,
                [to, r.success ? 'Sent' : 'Failed', r.success ? null : String(r.error || '').slice(0, 480), expiresAt, inviteId]
            );
            if (!r.success) return res.status(502).json({ error: r.error || 'Email failed' });
            res.json({ success: true });
        } catch (e) {
            console.error('[AvailabilityRFQ] resend error:', e);
            res.status(500).json({ error: 'Failed to resend' });
        }
    });

    // ---------- Admin: award ----------
    router.post('/:rfqId/award', async (req, res) => {
        const conn = await pool.getConnection();
        try {
            const { inviteId } = req.body || {};
            await conn.beginTransaction();
            const [rfqRows] = await conn.query('SELECT * FROM availability_rfqs WHERE id = ? FOR UPDATE', [req.params.rfqId]);
            if (!rfqRows.length) { await conn.rollback(); return res.status(404).json({ error: 'Request not found' }); }
            const rfq = rfqRows[0];
            if (rfq.status === 'Awarded') { await conn.rollback(); return res.status(400).json({ error: 'Already awarded' }); }
            const [invRows] = await conn.query('SELECT * FROM availability_rfq_invites WHERE id = ? AND rfq_id = ?', [inviteId, rfq.id]);
            const inv = invRows[0];
            if (!inv || inv.status !== 'Available') { await conn.rollback(); return res.status(400).json({ error: 'Only an Available vendor can be awarded' }); }

            const sbId = newId();
            await conn.query(
                `INSERT INTO supplier_bookings (id, booking_id, vendor_id, service_type, cost, paid_amount, payment_status, booking_status, notes)
                 VALUES (?, ?, ?, ?, ?, 0, 'Unpaid', 'Pending', ?)`,
                [sbId, rfq.booking_id, inv.vendor_id, rfq.service_type, inv.quoted_price || 0,
                 `Awarded via availability request (${inv.price_basis || 'Total'} quote).${inv.vendor_remark ? ' Vendor note: ' + inv.vendor_remark : ''}`.slice(0, 1000)]
            );
            await conn.query("UPDATE availability_rfqs SET status = 'Awarded', awarded_invite_id = ? WHERE id = ?", [inv.id, rfq.id]);
            await conn.commit();
            res.json({ success: true, supplierBookingId: sbId });
        } catch (e) {
            await conn.rollback().catch(() => {});
            console.error('[AvailabilityRFQ] award error:', e);
            res.status(500).json({ error: 'Failed to award' });
        } finally {
            conn.release();
        }
    });

    // ---------- Admin: close ----------
    router.post('/:rfqId/close', async (req, res) => {
        try {
            await pool.query("UPDATE availability_rfqs SET status = 'Closed' WHERE id = ? AND status = 'Open'", [req.params.rfqId]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Failed to close' });
        }
    });

    app.use('/api/admin/availability-rfqs', router);

    // ---------- Public: vendor view ----------
    const loadPublic = async (token) => {
        if (!/^[a-f0-9]{32}$/.test(String(token))) return null;
        const [rows] = await pool.query(
            `SELECT i.*, r.service_type, r.summary_lines, r.notes, r.status AS rfq_status, b.booking_number
             FROM availability_rfq_invites i
             JOIN availability_rfqs r ON r.id = i.rfq_id
             LEFT JOIN bookings b ON b.id = r.booking_id
             WHERE i.token = ?`, [token]);
        return rows[0] || null;
    };

    app.get('/api/public/availability-rfq/:token', async (req, res) => {
        try {
            const i = await loadPublic(req.params.token);
            if (!i) return res.status(404).json({ error: 'Invalid or expired link' });
            if (i.status === 'Sent') {
                await pool.query("UPDATE availability_rfq_invites SET status = 'Viewed', viewed_at = NOW() WHERE id = ?", [i.id]);
                i.status = 'Viewed';
            }
            const expired = i.expires_at && new Date(i.expires_at) < new Date();
            res.json({
                vendorName: i.vendor_name, serviceType: i.service_type, bookingRef: bookingRef(i.booking_number),
                summaryLines: parseLines(i.summary_lines), notes: i.notes, status: i.status,
                quotedPrice: i.quoted_price != null ? Number(i.quoted_price) : null,
                priceBasis: i.price_basis, vendorRemark: i.vendor_remark,
                expiresAt: i.expires_at, closed: i.rfq_status !== 'Open', expired: !!expired
            });
        } catch (e) {
            console.error('[AvailabilityRFQ] public get error:', e);
            res.status(500).json({ error: 'Something went wrong' });
        }
    });

    app.post('/api/public/availability-rfq/:token/respond', async (req, res) => {
        try {
            const i = await loadPublic(req.params.token);
            if (!i) return res.status(404).json({ error: 'Invalid or expired link' });
            if (i.rfq_status !== 'Open') return res.status(410).json({ error: 'This request is closed' });
            if (i.expires_at && new Date(i.expires_at) < new Date()) return res.status(410).json({ error: 'This link has expired' });

            const { status, quotedPrice, priceBasis, remark, respondedBy } = req.body || {};
            if (!['Available', 'Not Available'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
            let price = null;
            let basis = 'Total';
            if (status === 'Available') {
                price = Number(quotedPrice);
                if (!isFinite(price) || price <= 0 || price > 1e9) return res.status(400).json({ error: 'Enter a valid price' });
                basis = PRICE_BASES.includes(priceBasis) ? priceBasis : 'Total';
            }
            await pool.query(
                `UPDATE availability_rfq_invites SET status = ?, quoted_price = ?, price_basis = ?, vendor_remark = ?, responded_by = ?, responded_at = NOW() WHERE id = ?`,
                [status, price, basis, remark ? String(remark).slice(0, 1000) : null, respondedBy ? String(respondedBy).slice(0, 255) : null, i.id]
            );
            await notifyStaff(
                pool,
                `${i.vendor_name}: ${status}`,
                `${i.service_type} request for ${bookingRef(i.booking_number)}${price ? ` quoted ${price}` : ''}`,
                `/admin/bookings`
            );
            res.json({ success: true });
        } catch (e) {
            console.error('[AvailabilityRFQ] respond error:', e);
            res.status(500).json({ error: 'Something went wrong' });
        }
    });
}
