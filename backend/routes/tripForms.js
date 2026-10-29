/**
 * Customer Self-Service Trip Details Form Routes
 * - Admin (auth):  /api/trip-forms (generate token, fetch form details)
 * - Public (token): /api/public/trip-details/:token (view form, submit form)
 */

import express from 'express';
import crypto from 'crypto';

const newId = () => `TF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const newToken = () => crypto.randomBytes(24).toString('hex');

// Format clean base URL
const cleanBase = (u) => String(u || '').replace(/\/+$/, '');

export function createTripFormRoutes(app, pool, authMiddleware) {
    const adminRouter = express.Router();
    adminRouter.use(authMiddleware);

    const publicRouter = express.Router();

    // ────────────────────────────────────────────────────────────
    // ADMIN ENDPOINT: Generate or retrieve shareable link
    // ────────────────────────────────────────────────────────────
    adminRouter.post('/generate', async (req, res) => {
        try {
            const { leadId, bookingId, customerId, baseUrl } = req.body || {};
            if (!leadId && !bookingId && !customerId) {
                return res.status(400).json({ error: 'Either leadId, bookingId, or customerId is required' });
            }

            // Determine base URL (front-end public URL)
            const base = cleanBase(process.env.PUBLIC_APP_URL || baseUrl || `${req.protocol}://${req.get('host')}`);

            // 1. Check if a form already exists for this entity
            let query = 'SELECT * FROM trip_detail_forms WHERE ';
            let params = [];
            if (leadId) {
                query += 'lead_id = ? LIMIT 1';
                params.push(leadId);
            } else if (bookingId) {
                query += 'booking_id = ? LIMIT 1';
                params.push(bookingId);
            } else {
                query += 'customer_id = ? LIMIT 1';
                params.push(customerId);
            }

            const [existing] = await pool.query(query, params);
            if (existing && existing.length > 0) {
                const form = existing[0];
                const shareableUrl = `${base}/trip-details/${form.token}`;
                const destName = form.destination || 'your upcoming trip';
                const clientName = form.customer_name || 'Valued Traveler';
                const whatsappShareText = `Hello ${clientName}! Greetings from Shrawello Travel Hub. To help us craft your perfect customized itinerary for ${destName}, please take 2 minutes to fill in your trip preferences and traveler details here: ${shareableUrl}\n\nWarm regards,\nShrawello Travel Hub`;

                return res.json({
                    success: true,
                    form,
                    shareableUrl,
                    whatsappShareText
                });
            }

            // 2. Not existing: fetch pre-fill information from Lead, Booking, or Customer
            let prefill = {
                customer_name: '',
                customer_phone: '',
                whatsapp_number: '',
                is_whatsapp_same: 1,
                customer_email: '',
                destination: '',
                start_date: null,
                end_date: null,
                pax_adult: 1,
                pax_child: 0,
                pax_infant: 0,
                residential_address: '',
                office_address: '',
                travel_budget: '',
                dob: ''
            };

            let resolvedCustomerId = customerId || null;

            if (leadId) {
                const [lRows] = await pool.query('SELECT * FROM leads WHERE id = ?', [leadId]);
                if (lRows.length > 0) {
                    const l = lRows[0];
                    prefill.customer_name = l.name || '';
                    prefill.customer_phone = l.phone || '';
                    prefill.whatsapp_number = l.whatsapp || l.phone || '';
                    prefill.is_whatsapp_same = l.is_whatsapp_same !== undefined ? l.is_whatsapp_same : 1;
                    prefill.customer_email = l.email || '';
                    prefill.destination = l.destination || '';
                    prefill.start_date = l.start_date || null;
                    prefill.end_date = l.end_date || null;
                    prefill.pax_adult = l.pax_adult || 1;
                    prefill.pax_child = l.pax_child || 0;
                    prefill.pax_infant = l.pax_infant || 0;
                    prefill.residential_address = l.residential_address || '';
                    prefill.office_address = l.office_address || '';
                    prefill.travel_budget = l.budget || '';
                    resolvedCustomerId = l.customer_id || resolvedCustomerId;
                }
            } else if (bookingId) {
                const [bRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
                if (bRows.length > 0) {
                    const b = bRows[0];
                    prefill.customer_name = b.customer_name || '';
                    prefill.customer_phone = b.customer_phone || '';
                    prefill.whatsapp_number = b.whatsapp || b.customer_phone || '';
                    prefill.is_whatsapp_same = b.is_whatsapp_same !== undefined ? b.is_whatsapp_same : 1;
                    prefill.customer_email = b.customer_email || '';
                    prefill.destination = b.title || '';
                    prefill.start_date = b.booking_date || null;
                    prefill.end_date = b.end_date || null;
                    prefill.pax_adult = b.pax_adult || 1;
                    prefill.pax_child = b.pax_child || 0;
                    prefill.pax_infant = b.pax_infant || 0;
                    prefill.residential_address = b.residential_address || '';
                    prefill.office_address = b.office_address || '';
                    resolvedCustomerId = b.customer_id || resolvedCustomerId;
                }
            } else if (customerId) {
                const [cRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
                if (cRows.length > 0) {
                    const c = cRows[0];
                    prefill.customer_name = c.name || '';
                    prefill.customer_phone = c.phone || '';
                    prefill.whatsapp_number = c.whatsapp || c.phone || '';
                    prefill.customer_email = c.email || '';
                    prefill.residential_address = c.address || '';
                    prefill.office_address = c.office_address || '';
                    prefill.dob = c.dob || '';
                }
            }

            // 3. Create new form token record
            const id = newId();
            const token = newToken();

            await pool.query(
                `INSERT INTO trip_detail_forms (
                    id, token, lead_id, booking_id, customer_id, customer_name,
                    customer_phone, whatsapp_number, is_whatsapp_same, customer_email,
                    dob, residential_address, office_address, destination,
                    start_date, end_date, pax_adult, pax_child, pax_infant,
                    travel_budget, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                [
                    id, token, leadId || null, bookingId || null, resolvedCustomerId || null,
                    prefill.customer_name, prefill.customer_phone, prefill.whatsapp_number,
                    prefill.is_whatsapp_same, prefill.customer_email, prefill.dob || null,
                    prefill.residential_address, prefill.office_address, prefill.destination,
                    prefill.start_date, prefill.end_date, prefill.pax_adult, prefill.pax_child,
                    prefill.pax_infant, prefill.travel_budget
                ]
            );

            // Update status on lead/booking
            if (leadId) {
                await pool.query('UPDATE leads SET trip_form_token = ?, trip_form_status = ? WHERE id = ?', [token, 'Sent', leadId]);
            }
            if (bookingId) {
                await pool.query('UPDATE bookings SET trip_form_token = ?, trip_form_status = ? WHERE id = ?', [token, 'Sent', bookingId]);
            }

            const [newRows] = await pool.query('SELECT * FROM trip_detail_forms WHERE id = ?', [id]);
            const form = newRows[0];
            const shareableUrl = `${base}/trip-details/${token}`;
            const destName = form.destination || 'your upcoming trip';
            const clientName = form.customer_name || 'Valued Traveler';
            const whatsappShareText = `Hello ${clientName}! Greetings from Shrawello Travel Hub. To help us craft your perfect customized itinerary for ${destName}, please take 2 minutes to fill in your trip preferences and traveler details here: ${shareableUrl}\n\nWarm regards,\nShrawello Travel Hub`;

            res.json({
                success: true,
                form,
                shareableUrl,
                whatsappShareText
            });
        } catch (error) {
            console.error('[TripForms] generate error:', error);
            res.status(500).json({ error: error.message || 'Failed to generate trip form link' });
        }
    });

    // ────────────────────────────────────────────────────────────
    // ADMIN ENDPOINT: Get form by entity (Lead / Booking / Customer)
    // ────────────────────────────────────────────────────────────
    adminRouter.get('/by-entity/:entityType/:entityId', async (req, res) => {
        try {
            const { entityType, entityId } = req.params;
            let col = 'lead_id';
            if (entityType === 'booking') col = 'booking_id';
            if (entityType === 'customer') col = 'customer_id';

            const [rows] = await pool.query(`SELECT * FROM trip_detail_forms WHERE ${col} = ? ORDER BY created_at DESC LIMIT 1`, [entityId]);
            if (!rows.length) {
                return res.status(404).json({ error: 'No trip form found for this entity' });
            }

            const form = rows[0];
            let passengers = [];
            if (form.passengers_data) {
                try { passengers = JSON.parse(form.passengers_data); } catch (_) {}
            }

            res.json({ success: true, form: { ...form, passengers } });
        } catch (error) {
            console.error('[TripForms] get by entity error:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch trip form' });
        }
    });

    // ────────────────────────────────────────────────────────────
    // PUBLIC ENDPOINT: Get Form Data for Customer by Token
    // ────────────────────────────────────────────────────────────
    publicRouter.get('/:token', async (req, res) => {
        try {
            const { token } = req.params;
            if (!token) return res.status(400).json({ error: 'Token is required' });

            const [rows] = await pool.query('SELECT * FROM trip_detail_forms WHERE token = ?', [token]);
            if (!rows.length) {
                return res.status(404).json({ error: 'Trip details link is invalid or has expired.' });
            }

            const form = rows[0];
            let passengers = [];
            if (form.passengers_data) {
                try { passengers = JSON.parse(form.passengers_data); } catch (_) {}
            }

            // Fetch active promotional coupons to showcase to customer
            let coupons = [];
            try {
                const [cRows] = await pool.query(
                    `SELECT code, type, discount_type, discount_value, min_booking_amount, valid_to 
                     FROM coupons 
                     WHERE (status = 'Active' OR status IS NULL) 
                       AND (valid_to IS NULL OR valid_to >= CURDATE())
                     ORDER BY discount_value DESC 
                     LIMIT 6`
                );
                coupons = cRows || [];
            } catch (err) {
                console.warn('[TripForms] coupons fetch notice:', err.message);
            }

            // Fallback coupons if DB has none
            if (!coupons || coupons.length === 0) {
                coupons = [
                    { code: 'SHRAWELLO1000', discount_type: 'Fixed', discount_value: 1000, min_booking_amount: 25000 },
                    { code: 'EARLYBIRD5', discount_type: 'Percentage', discount_value: 5, min_booking_amount: 15000 },
                    { code: 'FAMILYPERK', discount_type: 'Fixed', discount_value: 2000, min_booking_amount: 50000 }
                ];
            }

            res.json({
                success: true,
                form: { ...form, passengers },
                coupons,
                agency: {
                    name: 'Shrawello Travel Hub',
                    tagline: 'Your Trusted Travel Partner for Sacred & Leisure Journeys',
                    phone: '+91 98223 60000',
                    email: 'support@shrawello.com',
                    supportWhatsapp: '919822360000'
                }
            });
        } catch (error) {
            console.error('[TripForms Public] fetch error:', error);
            res.status(500).json({ error: error.message || 'Failed to load trip details form' });
        }
    });

    // ────────────────────────────────────────────────────────────
    // PUBLIC ENDPOINT: Submit Trip Details Form
    // ────────────────────────────────────────────────────────────
    publicRouter.post('/:token/submit', async (req, res) => {
        try {
            const { token } = req.params;
            if (!token) return res.status(400).json({ error: 'Token is required' });

            const [rows] = await pool.query('SELECT * FROM trip_detail_forms WHERE token = ?', [token]);
            if (!rows.length) {
                return res.status(404).json({ error: 'Trip details link is invalid or has expired.' });
            }

            const current = rows[0];
            const b = req.body || {};

            // Extract submitted fields
            const customer_name = (b.customer_name || current.customer_name || '').trim();
            const salutation = b.salutation || current.salutation || 'Mr.';
            const customer_phone = (b.customer_phone || current.customer_phone || '').trim();
            const whatsapp_number = (b.whatsapp_number || b.customer_phone || current.whatsapp_number || '').trim();
            const is_whatsapp_same = b.is_whatsapp_same !== undefined ? (b.is_whatsapp_same ? 1 : 0) : 1;
            const customer_email = (b.customer_email || current.customer_email || '').trim();
            const dob = b.dob || current.dob || null;
            const residential_address = (b.residential_address || '').trim();
            const office_address = (b.office_address || '').trim();

            const destination = (b.destination || current.destination || '').trim();
            const start_date = b.start_date || current.start_date || null;
            const end_date = b.end_date || current.end_date || null;
            const pax_adult = parseInt(b.pax_adult || current.pax_adult || 1, 10);
            const pax_child = parseInt(b.pax_child || 0, 10);
            const pax_infant = parseInt(b.pax_infant || 0, 10);
            const children_ages = (b.children_ages || '').trim();
            const rooms_count = parseInt(b.rooms_count || 1, 10);
            const room_type_preference = (b.room_type_preference || '').trim();

            const pickup_drop_location = (b.pickup_drop_location || '').trim();
            const travel_budget = (b.travel_budget || '').trim();
            const vehicle_preference = (b.vehicle_preference || '').trim();
            const hotel_preference = (b.hotel_preference || '').trim();
            const meal_plan_preference = (b.meal_plan_preference || '').trim();
            const food_preference = (b.food_preference || '').trim();
            const special_requirements = (b.special_requirements || '').trim();
            const sightseeing_pace = (b.sightseeing_pace || 'Moderate').trim();
            const transportation_mode = (b.transportation_mode || '').trim();
            const flight_train_details = (b.flight_train_details || '').trim();
            const additional_notes = (b.additional_notes || '').trim();

            const passengers = Array.isArray(b.passengers) ? b.passengers : [];
            const passengers_json = JSON.stringify(passengers);

            const applied_coupon_code = (b.applied_coupon_code || '').trim() || null;
            const coupon_discount_amount = parseFloat(b.coupon_discount_amount || 0);

            // 1. Update trip_detail_forms
            await pool.query(
                `UPDATE trip_detail_forms SET
                    customer_name = ?, salutation = ?, customer_phone = ?, whatsapp_number = ?,
                    is_whatsapp_same = ?, customer_email = ?, dob = ?, residential_address = ?,
                    office_address = ?, destination = ?, start_date = ?, end_date = ?,
                    pax_adult = ?, pax_child = ?, pax_infant = ?, children_ages = ?,
                    rooms_count = ?, room_type_preference = ?, pickup_drop_location = ?,
                    travel_budget = ?, vehicle_preference = ?, hotel_preference = ?,
                    meal_plan_preference = ?, food_preference = ?, special_requirements = ?,
                    sightseeing_pace = ?, transportation_mode = ?, flight_train_details = ?,
                    additional_notes = ?, passengers_data = ?, applied_coupon_code = ?,
                    coupon_discount_amount = ?, status = 'Submitted', submitted_at = NOW()
                WHERE token = ?`,
                [
                    customer_name, salutation, customer_phone, whatsapp_number,
                    is_whatsapp_same, customer_email, dob, residential_address,
                    office_address, destination, start_date, end_date,
                    pax_adult, pax_child, pax_infant, children_ages,
                    rooms_count, room_type_preference, pickup_drop_location,
                    travel_budget, vehicle_preference, hotel_preference,
                    meal_plan_preference, food_preference, special_requirements,
                    sightseeing_pace, transportation_mode, flight_train_details,
                    additional_notes, passengers_json, applied_coupon_code,
                    coupon_discount_amount, token
                ]
            );

            // Build structured preferences object for CRM
            const preferencesObj = {
                hotelPreference: hotel_preference,
                mealPlan: meal_plan_preference,
                foodPreference: food_preference,
                roomsCount: rooms_count,
                roomType: room_type_preference,
                vehicleType: vehicle_preference,
                sightseeingPace: sightseeing_pace,
                pickupDropLocation: pickup_drop_location,
                transportationMode: transportation_mode,
                flightTrainDetails: flight_train_details,
                specialRequirements: special_requirements,
                additionalNotes: additional_notes,
                childrenAges: children_ages,
                couponCode: applied_coupon_code,
                submittedVia: 'Customer Self-Service Trip Form',
                submittedAt: new Date().toISOString()
            };
            const preferencesJsonStr = JSON.stringify(preferencesObj);

            // Total passenger headcount
            const totalPax = pax_adult + pax_child + pax_infant;
            const travelersStr = `${totalPax} (${pax_adult} Adults${pax_child > 0 ? `, ${pax_child} Children` : ''}${pax_infant > 0 ? `, ${pax_infant} Infants` : ''})`;

            // 2. Synchronize to LEAD (if linked)
            if (current.lead_id) {
                try {
                    await pool.query(
                        `UPDATE leads SET
                            name = COALESCE(NULLIF(?, ''), name),
                            phone = COALESCE(NULLIF(?, ''), phone),
                            whatsapp = COALESCE(NULLIF(?, ''), whatsapp),
                            is_whatsapp_same = ?,
                            email = COALESCE(NULLIF(?, ''), email),
                            destination = COALESCE(NULLIF(?, ''), destination),
                            start_date = COALESCE(?, start_date),
                            end_date = COALESCE(?, end_date),
                            pax_adult = ?,
                            pax_child = ?,
                            pax_infant = ?,
                            travelers = ?,
                            residential_address = COALESCE(NULLIF(?, ''), residential_address),
                            office_address = COALESCE(NULLIF(?, ''), office_address),
                            budget = COALESCE(NULLIF(?, ''), budget),
                            preferences = ?,
                            trip_form_status = 'Submitted'
                        WHERE id = ?`,
                        [
                            customer_name, customer_phone, whatsapp_number, is_whatsapp_same,
                            customer_email, destination, start_date, end_date,
                            pax_adult, pax_child, pax_infant, travelersStr,
                            residential_address, office_address, travel_budget,
                            preferencesJsonStr, current.lead_id
                        ]
                    );

                    // Add Lead Log entry
                    const logId = `LL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
                    await pool.query(
                        `INSERT INTO lead_logs (id, lead_id, type, content, timestamp, sender)
                         VALUES (?, ?, 'System', ?, NOW(), 'Customer Portal')`,
                        [
                            logId,
                            current.lead_id,
                            `Customer completed Self-Service Trip Form. Total ${totalPax} traveler(s), ${rooms_count} room(s), Hotel: ${hotel_preference || 'Standard'}, Vehicle: ${vehicle_preference || 'Standard'}.`
                        ]
                    );
                } catch (leadSyncErr) {
                    console.error('[TripForms] lead sync error:', leadSyncErr);
                }
            }

            // 3. Synchronize to CUSTOMER profile & Co-Travelers
            let customerIdToUse = current.customer_id;
            try {
                // If not directly linked, search customer by phone
                if (!customerIdToUse && customer_phone) {
                    const cleanPhone = customer_phone.replace(/\D/g, '').slice(-10);
                    const [cMatches] = await pool.query(
                        `SELECT id FROM customers WHERE REPLACE(phone, ' ', '') LIKE ? LIMIT 1`,
                        [`%${cleanPhone}%`]
                    );
                    if (cMatches.length > 0) {
                        customerIdToUse = cMatches[0].id;
                    }
                }

                // If customer exists, update addresses, DOB, and preferences
                if (customerIdToUse) {
                    await pool.query(
                        `UPDATE customers SET
                            prefix = COALESCE(NULLIF(?, ''), prefix),
                            dob = COALESCE(NULLIF(?, ''), dob),
                            address = COALESCE(NULLIF(?, ''), address),
                            office_address = COALESCE(NULLIF(?, ''), office_address),
                            whatsapp = COALESCE(NULLIF(?, ''), whatsapp),
                            is_whatsapp_same = ?,
                            preferences = ?
                        WHERE id = ?`,
                        [salutation, dob, residential_address, office_address, whatsapp_number, is_whatsapp_same, preferencesJsonStr, customerIdToUse]
                    );
                }

                // Sync passenger roster into customer_co_travelers
                if (passengers.length > 0 && customerIdToUse) {
                    for (const pax of passengers) {
                        if (!pax.name || !pax.name.trim()) continue;
                        try {
                            await pool.query(
                                `INSERT INTO customer_co_travelers (
                                    customer_id, name, relation, phone, passport_no, dob, aadhar_no, gender, age
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE
                                    relation = VALUES(relation),
                                    phone = VALUES(phone),
                                    passport_no = VALUES(passport_no),
                                    aadhar_no = VALUES(aadhar_no),
                                    gender = VALUES(gender),
                                    age = VALUES(age)`,
                                [
                                    customerIdToUse,
                                    pax.name.trim(),
                                    pax.relation || 'Co-Traveler',
                                    pax.mobile || pax.phone || null,
                                    pax.passport_no || null,
                                    pax.dob || null,
                                    pax.aadhar_no || pax.aadharCardNo || null,
                                    pax.gender || null,
                                    pax.age ? parseInt(pax.age, 10) : null
                                ]
                            );
                        } catch (paxErr) {
                            console.warn('[TripForms] co-traveler sync error:', paxErr.message);
                        }
                    }
                }
            } catch (custSyncErr) {
                console.error('[TripForms] customer sync error:', custSyncErr);
            }

            // 4. Synchronize to BOOKING (if linked)
            if (current.booking_id) {
                try {
                    await pool.query(
                        `UPDATE bookings SET
                            customer_name = COALESCE(NULLIF(?, ''), customer_name),
                            customer_phone = COALESCE(NULLIF(?, ''), customer_phone),
                            customer_email = COALESCE(NULLIF(?, ''), customer_email),
                            whatsapp = COALESCE(NULLIF(?, ''), whatsapp),
                            is_whatsapp_same = ?,
                            residential_address = COALESCE(NULLIF(?, ''), residential_address),
                            office_address = COALESCE(NULLIF(?, ''), office_address),
                            pax_adult = ?,
                            pax_child = ?,
                            pax_infant = ?,
                            pax_count = ?,
                            booking_date = COALESCE(?, booking_date),
                            end_date = COALESCE(?, end_date),
                            applied_coupon_code = COALESCE(?, applied_coupon_code),
                            coupon_discount_amount = COALESCE(?, coupon_discount_amount),
                            trip_form_status = 'Submitted'
                        WHERE id = ?`,
                        [
                            customer_name, customer_phone, customer_email, whatsapp_number, is_whatsapp_same,
                            residential_address, office_address, pax_adult, pax_child, pax_infant, totalPax,
                            start_date, end_date, applied_coupon_code, coupon_discount_amount,
                            current.booking_id
                        ]
                    );
                } catch (bookingSyncErr) {
                    console.error('[TripForms] booking sync error:', bookingSyncErr);
                }
            }

            // 5. In-app notification for Staff
            try {
                const notifId = `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
                const destTitle = destination || 'their customized trip';
                await pool.query(
                    `INSERT INTO in_app_notifications (id, type, title, message, link, is_read)
                     VALUES (?, 'lead', ?, ?, ?, 0)`,
                    [
                        notifId,
                        `Trip Form Submitted: ${customer_name}`,
                        `Customer submitted trip specifications for ${destTitle} (${totalPax} passengers, ${rooms_count} rooms).`,
                        current.lead_id ? `/admin/leads?id=${current.lead_id}` : `/admin/bookings`
                    ]
                );
            } catch (_) {}

            res.json({
                success: true,
                message: 'Thank you! Your trip preferences and traveler details have been received successfully.',
                referenceToken: token,
                submittedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('[TripForms Submit] error:', error);
            res.status(500).json({ error: error.message || 'Failed to submit trip details' });
        }
    });

    // Mount routers on Express app
    app.use('/api/trip-forms', adminRouter);
    app.use('/api/public/trip-details', publicRouter);
    console.log('[TripForms] Registered /api/trip-forms and /api/public/trip-details routes');
}

