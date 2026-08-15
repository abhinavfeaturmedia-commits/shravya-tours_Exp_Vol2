import nodemailer from 'nodemailer';

let dbPool = null;

/**
 * Initialize the email service with the database pool to avoid circular dependencies.
 * @param {object} pool - MySQL connection pool
 */
export function initEmailService(pool) {
    dbPool = pool;
    console.log('[EmailService] Initialized with DB pool.');
}

/**
 * Helper to check if a setting value represents a boolean true
 */
function isTruthy(val) {
    return val === true || val === 'true' || val === 1 || val === '1';
}

/**
 * Helper to fetch SMTP settings from settings table
 * @param {string} type - 'general' or 'billing'
 * @returns {Promise<object|null>}
 */
async function loadSmtpSettings(type) {
    if (!dbPool) {
        console.warn('[EmailService] DB pool not initialized.');
        return null;
    }

    try {
        const [rows] = await dbPool.query(
            "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'integrations.smtp%'"
        );

        const general = {};
        const billing = {};

        rows.forEach(row => {
            const parts = row.setting_key.split('.');
            const group = parts[1]; // smtpGeneral, smtpBilling, or smtp
            const key = parts[2]; // enabled, host, username, password, etc.
            let val = row.setting_value;
            try { val = JSON.parse(val); } catch(e) {}
            
            if (group === 'smtpGeneral' || group === 'smtp') general[key] = val;
            if (group === 'smtpBilling') billing[key] = val;
        });

        const isConfigValid = (c) => {
            if (!c) return false;
            const enabled = isTruthy(c.enabled);
            const host = c.host ? String(c.host).trim() : '';
            const user = c.username ? String(c.username).trim() : '';
            const pass = c.password ? String(c.password).trim() : '';
            return enabled && host.length > 0 && user.length > 0 && pass.length > 0;
        };

        // Determine which config to return, with fallback
        if (type === 'billing') {
            if (isConfigValid(billing)) {
                return { ...billing, type: 'billing' };
            }
            // Fall back to general if billing is not configured/enabled
            if (isConfigValid(general)) {
                console.log('[EmailService] Billing SMTP not enabled or incomplete, falling back to General SMTP.');
                return { ...general, type: 'general' };
            }
        } else {
            // Default to general
            if (isConfigValid(general)) {
                return { ...general, type: 'general' };
            }
            // Fall back to billing
            if (isConfigValid(billing)) {
                console.log('[EmailService] General SMTP not enabled or incomplete, falling back to Billing SMTP.');
                return { ...billing, type: 'billing' };
            }
        }

        return null;
    } catch (err) {
        console.error('[EmailService] Failed to load SMTP settings from DB:', err.message);
        return null;
    }
}

/**
 * Send an email using specified type SMTP
 * @param {object} params
 * @param {string} [params.type='general'] - 'general' or 'billing'
 * @param {string|Array} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Plain text fallback
 * @param {Array} [params.attachments] - Nodemailer attachments
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail({ type = 'general', to, subject, html, text = '', attachments = [] }) {
    if (!to) {
        console.warn('[EmailService] SMTP email skipped: No recipient ("to") provided.');
        return { success: false, error: 'Recipient email address is required.' };
    }

    const config = await loadSmtpSettings(type);
    if (!config) {
        const errorMsg = `No active SMTP configuration found for type "${type}". Please check Admin Settings > Integrations.`;
        console.warn(`[EmailService] SMTP email skipped: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }

    return await sendWithTransporter(config, to, subject, html, text, attachments);
}

/**
 * Lower-level helper to trigger nodemailer sending
 */
async function sendWithTransporter(config, to, subject, html, text, attachments = []) {
    if (!config || !config.host || !config.username || !config.password) {
        const errorMsg = 'Incomplete SMTP credentials. Host, Username, and Password are required.';
        console.error('[EmailService]', errorMsg);
        return { success: false, error: errorMsg };
    }

    try {
        const port = Number(config.port) || 587;
        const isSecure = port === 465;
        const useTls = isTruthy(config.useTls);

        const host = String(config.host).trim();
        const username = String(config.username).trim();
        const password = String(config.password).trim();
        const fromEmail = String(config.fromEmail || username).trim();
        const defaultFromName = (config.type === 'billing') ? 'SHRAWELLO Billing' : 'SHRAWELLO Travel Hub';
        const fromName = String(config.fromName || defaultFromName).trim().replace(/["\r\n]/g, '');

        const transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: isSecure,
            auth: {
                user: username,
                pass: password
            },
            tls: {
                rejectUnauthorized: false // bypass self-signed SSL verification issues for Hostinger / custom domains
            },
            requireTLS: !isSecure && useTls,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000
        });

        const recipientStr = Array.isArray(to) ? to.join(', ') : String(to).trim();
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: recipientStr,
            subject: String(subject || 'Notification from SHRAWELLO').trim(),
            text: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
            html,
            attachments: attachments || []
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Email sent successfully! MessageId: ${info.messageId} | Recipient: ${recipientStr} | SMTP: ${username}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[EmailService] Failed to send email via ${config?.username || 'unknown'}:`, err.message);
        return { success: false, error: err.message || 'SMTP transmission failed.' };
    }
}

/**
 * Send a test email using transient settings passed from the frontend UI
 */
export async function sendTestEmail(smtpSettings, targetEmail) {
    if (!targetEmail || !String(targetEmail).trim()) {
        return { success: false, error: 'Recipient target email is required.' };
    }
    return await sendWithTransporter(
        smtpSettings,
        String(targetEmail).trim(),
        'SMTP Connection Test - SHRAWELLO Travel Hub',
        `
        <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 28px; width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">✅</span>
                </div>
                <h2 style="color: #4f46e5; margin-top: 0; text-align: center;">Connection Test Successful!</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">This is a test email confirming that your SMTP configuration is active, authenticated, and functioning properly.</p>
                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px; margin: 20px 0; line-height: 1.8;">
                    <strong>Sender Username:</strong> ${smtpSettings.username}<br>
                    <strong>Host:</strong> ${smtpSettings.host}:${smtpSettings.port || 465}<br>
                    <strong>Sender Name:</strong> ${smtpSettings.fromName || 'SHRAWELLO'}<br>
                    <strong>From Address:</strong> ${smtpSettings.fromEmail || smtpSettings.username}<br>
                    <strong>TLS:</strong> ${isTruthy(smtpSettings.useTls) ? 'Enabled' : 'Disabled'}
                </div>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 0; text-align: center;">Sent on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </div>
        </div>
        `,
        'SMTP connection test was successful!'
    );
}

// ─── EMAIL TEMPLATE GENERATOR ───
function wrapTemplate(title, bodyContent) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <div style="background-color: #f8fafc; padding: 40px 10px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <!-- Brand Header -->
                <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 32px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">SHRAWELLO</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #c7d2fe; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Travel Hub & Events</p>
                </div>
                <!-- Content -->
                <div style="padding: 40px 32px;">
                    ${bodyContent}
                </div>
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 32px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">SHRAWELLO Travel Hub and Events LLP</p>
                    <p style="margin: 0 0 16px 0; color: #64748b;">Pimpri Chinchwad, Pune, Maharashtra, India - 411062</p>
                    <div style="margin-bottom: 20px;">
                        <a href="https://instagram.com/shrawellotravelhub" style="color: #4f46e5; text-decoration: none; margin: 0 10px; font-weight: 600;">Instagram</a> • 
                        <a href="https://shrawello.com" style="color: #4f46e5; text-decoration: none; margin: 0 10px; font-weight: 600;">Website</a>
                    </div>
                    <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.5;">This is an automated transactional email.<br>If you have any questions, please reply directly to this email or contact support.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// ─── CUSTOM MANUAL EMAIL ───
export async function sendCustomEmail({ type = 'general', to, subject, message }) {
    const formattedMessage = (message || '').replace(/\n/g, '<br>');
    const html = wrapTemplate(subject, `
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">${subject}</h2>
        <div style="font-size: 15px; line-height: 1.6; color: #334155; margin: 20px 0;">
            ${formattedMessage}
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Warm regards,<br><strong>Shrawello Travel Hub Team</strong></p>
    `);
    return await sendEmail({ type, to, subject, html });
}

// ─── WORKFLOW EMAILS ───

/**
 * 1. Send Agent Introduction Email (hello@shrawello.com)
 * @param {string} leadId - Lead ID
 * @param {string} [customTo] - Optional recipient email override
 */
export async function sendAgentIntroductionEmail(leadId, customTo = null) {
    if (!dbPool) return { success: false, error: 'Database pool not initialized.' };
    try {
        const [rows] = await dbPool.query(`
            SELECT l.id AS lead_id, l.name AS lead_name, l.email AS lead_email, l.customer_id,
                   c.email AS customer_email,
                   sm.name AS staff_name, sm.email AS staff_email, sm.phone AS staff_phone 
            FROM leads l 
            LEFT JOIN customers c ON l.customer_id = c.id
            LEFT JOIN staff_members sm ON (l.assigned_to = sm.id OR l.assigned_to = sm.name OR l.assigned_to = sm.email) 
            WHERE l.id = ? OR l.lead_number = ?
            LIMIT 1
        `, [leadId, leadId]);

        if (rows.length === 0) {
            return { success: false, error: `Lead record "${leadId}" not found.` };
        }
        const lead = rows[0];
        const recipient = customTo || lead.lead_email || lead.customer_email;

        if (!recipient) {
            console.log(`[EmailService] Skip agent intro: Lead ${leadId} has no email address.`);
            return { success: false, error: `Lead ${leadId} has no registered email address.` };
        }

        const agentName = lead.staff_name || 'One of our expert planners';
        const agentEmail = lead.staff_email || 'hello@shrawello.com';
        const agentPhone = lead.staff_phone || '+91 80109 55675';

        const subject = `Your dedicated travel planner has been assigned! - Shrawello`;
        
        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Hi ${lead.lead_name || 'Traveler'},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Thank you for reaching out to Shrawello Travel Hub! We are thrilled to assist you in planning your upcoming vacation.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">A dedicated travel specialist has been assigned to construct and customize your holiday itinerary:</p>
            
            <div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Travel Planner</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 80px;"><strong>Name:</strong></td>
                        <td style="padding: 4px 0; color: #1e293b;"><strong>${agentName}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Email:</strong></td>
                        <td style="padding: 4px 0; color: #4f46e5;"><a href="mailto:${agentEmail}" style="color: #4f46e5; text-decoration: none;">${agentEmail}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Phone:</strong></td>
                        <td style="padding: 4px 0; color: #1e293b;">${agentPhone}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 15px; line-height: 1.6; color: #334155;">They are already reviewing your travel preferences and will get in touch with you shortly with your custom quote. If you'd like to share any additional details, feel free to reply directly to this email.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Warm regards,<br><strong>Shrawello Travel Hub Team</strong></p>
        `);

        return await sendEmail({
            type: 'general',
            to: recipient,
            subject,
            html
        });
    } catch (err) {
        console.error('[EmailService] Agent intro email trigger failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 2. Send Proposal Ready Email (hello@shrawello.com)
 * @param {string} proposalId - Proposal ID
 * @param {string} [customTo] - Optional recipient email override
 */
export async function sendProposalEmail(proposalId, customTo = null) {
    if (!dbPool) return { success: false, error: 'Database pool not initialized.' };
    try {
        const [rows] = await dbPool.query(`
            SELECT p.id AS proposal_id, p.title AS proposal_title, p.amount AS proposal_amount,
                   l.name AS lead_name, l.email AS lead_email,
                   c.name AS customer_name, c.email AS customer_email,
                   sm.name AS staff_name 
            FROM proposals p 
            LEFT JOIN leads l ON p.lead_id = l.id 
            LEFT JOIN customers c ON (l.customer_id = c.id OR p.lead_id = c.id)
            LEFT JOIN staff_members sm ON (l.assigned_to = sm.id OR l.assigned_to = sm.name) 
            WHERE p.id = ?
            LIMIT 1
        `, [proposalId]);

        if (rows.length === 0) {
            return { success: false, error: `Proposal record "${proposalId}" not found.` };
        }
        const prop = rows[0];
        const recipient = customTo || prop.lead_email || prop.customer_email;

        if (!recipient) {
            console.log(`[EmailService] Skip proposal email: Proposal ${proposalId} has no recipient email address.`);
            return { success: false, error: `Proposal ${proposalId} has no recipient email address.` };
        }

        const clientName = prop.lead_name || prop.customer_name || 'Traveler';
        const subject = `Your Custom Holiday Proposal: "${prop.proposal_title || 'Custom Itinerary'}" - Shrawello`;
        const proposalLink = `https://shrawello.com/#/customer/proposals/${prop.proposal_id}`;

        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Dear ${clientName},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Exciting updates! We have finished crafting a custom holiday proposal tailored specifically to your preferences:</p>
            <p style="font-size: 16px; font-weight: 700; color: #4f46e5; text-align: center; margin: 20px 0; background-color: #e0e7ff; padding: 12px; border-radius: 8px;">
                "${prop.proposal_title || 'Custom Travel Itinerary'}"
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Click the button below to view the detailed day-wise itinerary, accommodation details, transport inclusions, and pricing options in your portal:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${proposalLink}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79,70,229,0.2);">
                    View Travel Proposal ↗
                </a>
            </div>

            <p style="font-size: 14px; color: #64748b; text-align: center;">Or copy and paste this link into your browser:<br><a href="${proposalLink}" style="color: #4f46e5; word-break: break-all;">${proposalLink}</a></p>

            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 25px;">Please review the details and let your assigned planner, <strong>${prop.staff_name || 'your Shrawello planner'}</strong>, know if you'd like to make any adjustments or confirm the booking!</p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Best regards,<br><strong>Shrawello Travel Hub</strong></p>
        `);

        return await sendEmail({
            type: 'general',
            to: recipient,
            subject,
            html
        });
    } catch (err) {
        console.error('[EmailService] Proposal email trigger failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 3. Send Booking Invoice Email (billing@shrawello.com)
 * Gracefully resolves whether the passed identifier is a Booking ID, an Invoice ID, or an Invoice Number.
 * @param {string} bookingOrInvoiceId - Booking ID, Invoice ID, or Invoice Number
 * @param {string} [customTo] - Optional recipient email override
 */
export async function sendInvoiceEmail(bookingOrInvoiceId, customTo = null) {
    if (!dbPool) return { success: false, error: 'Database pool not initialized.' };
    try {
        let booking = null;
        let invoice = null;
        let customer = null;

        // 1. Try to find matching invoice first
        const [invRows] = await dbPool.query(
            "SELECT * FROM invoices WHERE id = ? OR booking_id = ? OR invoice_no = ? LIMIT 1",
            [bookingOrInvoiceId, bookingOrInvoiceId, bookingOrInvoiceId]
        );
        if (invRows.length > 0) {
            invoice = invRows[0];
        }

        // 2. Try to find matching booking
        const targetBookingId = invoice?.booking_id || bookingOrInvoiceId;
        const [bkRows] = await dbPool.query(
            "SELECT * FROM bookings WHERE id = ? OR booking_number = ? LIMIT 1",
            [targetBookingId, targetBookingId]
        );
        if (bkRows.length > 0) {
            booking = bkRows[0];
        }

        // 3. Try to find customer profile for fallback details
        const targetCustomerId = invoice?.customer_id || booking?.customer_id;
        if (targetCustomerId) {
            const [custRows] = await dbPool.query(
                "SELECT * FROM customers WHERE id = ? LIMIT 1",
                [targetCustomerId]
            );
            if (custRows.length > 0) customer = custRows[0];
        }

        if (!booking && !invoice) {
            return { success: false, error: `No invoice or booking record found matching ID "${bookingOrInvoiceId}".` };
        }

        // Resolve recipient
        const recipient = customTo || invoice?.email || booking?.customer_email || customer?.email;
        if (!recipient) {
            console.log(`[EmailService] Skip invoice email: Record ${bookingOrInvoiceId} has no recipient email address.`);
            return { success: false, error: `No recipient email found for invoice/booking "${bookingOrInvoiceId}".` };
        }

        // Resolve invoice / reference display number
        const invoiceNo = invoice?.invoice_no || invoice?.id || (booking ? `INV-BK-${booking.booking_number || booking.id}` : `INV-${bookingOrInvoiceId}`);
        const customerName = invoice?.client_name || booking?.customer_name || customer?.name || 'Valued Traveler';
        const travelTitle = booking?.title || invoice?.document_type || 'Tour & Travel Booking';
        
        const rawAmount = invoice?.total_amount !== undefined ? invoice.total_amount : (booking?.total_price || 0);
        const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rawAmount);

        let dateStr = 'Upcoming';
        const rawDate = invoice?.travel_dates || invoice?.travel_date_from || booking?.booking_date;
        if (rawDate) {
            try {
                const parsed = new Date(rawDate);
                if (!isNaN(parsed.getTime())) {
                    dateStr = parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                } else {
                    dateStr = String(rawDate);
                }
            } catch (e) {
                dateStr = String(rawDate);
            }
        }

        const paymentStatus = invoice?.payment_status || booking?.payment_status || 'Pending';
        const isPaid = /paid/i.test(paymentStatus);

        const subject = `Booking Confirmed & Invoice Issued - #${invoiceNo} - Shrawello`;
        const bookingLink = booking?.id ? `https://shrawello.com/#/customer/bookings/${booking.id}` : `https://shrawello.com/#/customer/dashboard`;

        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Dear ${customerName},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Thank you for choosing Shrawello Travel Hub! Your booking and official invoice have been processed successfully.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Here is your booking summary and tax invoice overview:</p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 25px 0;">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Invoice Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
                    <tr>
                        <td style="color: #64748b;"><strong>Invoice / Reference:</strong></td>
                        <td style="color: #1e293b; text-align: right;"><strong>${invoiceNo}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Travel Package / Item:</strong></td>
                        <td style="color: #1e293b; text-align: right;">${travelTitle}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Travel Date:</strong></td>
                        <td style="color: #1e293b; text-align: right;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Payment Status:</strong></td>
                        <td style="color: #1e293b; text-align: right;"><span style="background-color: ${isPaid ? '#d1fae5' : '#fef3c7'}; color: ${isPaid ? '#065f46' : '#92400e'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${paymentStatus}</span></td>
                    </tr>
                    <tr style="border-top: 1px solid #e2e8f0; font-size: 16px;">
                        <td style="color: #1e293b; padding-top: 12px;"><strong>Total Amount:</strong></td>
                        <td style="color: #10b981; text-align: right; padding-top: 12px; font-size: 18px;"><strong>${formattedPrice}</strong></td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 15px; line-height: 1.6; color: #334155;">You can view detailed vouchers, daily itineraries, and download your printable PDF invoice at any time by logging into your Customer Dashboard:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${bookingLink}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16,185,129,0.2);">
                    Access Customer Portal ↗
                </a>
            </div>

            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">If you have any questions regarding your billing or booking details, feel free to reply directly to this email to contact our accounts department.<br><br>Best regards,<br><strong>Billing & Accounts Dept.<br>Shrawello Travel Hub</strong></p>
        `);

        return await sendEmail({
            type: 'billing',
            to: recipient,
            subject,
            html
        });
    } catch (err) {
        console.error('[EmailService] Invoice email trigger failed:', err.message);
        return { success: false, error: err.message };
    }
}

// ─── PARTNER & OTP EMAILS ───

/**
 * 4. Send OTP Email for Password Reset (hello@shrawello.com)
 * @param {object} params - { to, name, otp, portal, expiresInMinutes }
 */
export async function sendOTPEmail({ to, name, otp, portal, expiresInMinutes = 10 }) {
    const subject = `Your Password Reset OTP - Shrawello ${portal} Portal`;
    const greetingName = (name && !name.includes('@')) ? name : 'User';
    const html = wrapTemplate(subject, `
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Hi ${greetingName},</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">We received a request to reset the password for your Shrawello <strong>${portal} Portal</strong> account.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Use the OTP below to verify your identity and set a new password:</p>

        <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #3730a3); border-radius: 16px; padding: 28px 48px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #c7d2fe; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">One-Time Password</p>
                <p style="margin: 0; font-size: 42px; font-weight: 900; color: #ffffff; letter-spacing: 10px; font-family: 'Courier New', monospace;">${otp}</p>
            </div>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 700;">⏱ This OTP expires in ${expiresInMinutes} minutes</p>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #64748b;">If you did not request this password reset, you can safely ignore this email. Your account remains secure.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Best regards,<br><strong>Shrawello Travel Hub Team</strong></p>
    `);
    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 5. Send Partner KYC Verified Email
 * @param {object} params - { to, name }
 */
export async function sendPartnerKYCVerifiedEmail({ to, name }) {
    const subject = `KYC Verified ✅ — Your Partner Account is Now Active! - Shrawello`;
    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">✅</div>
        </div>
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700; text-align: center;">KYC Verification Successful!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Congratulations! Your KYC documents have been reviewed and <strong style="color: #10b981;">successfully verified</strong> by our team.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your Shrawello Partner account is now fully active. You can now:</p>
        <ul style="font-size: 14px; color: #334155; line-height: 1.8; padding-left: 20px;">
            <li>Submit and track customer leads</li>
            <li>View your commission earnings and payouts</li>
            <li>Access your full partner dashboard and training modules</li>
            <li>Receive commission payouts to your verified bank account</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://shrawello.com/#/partner/dashboard" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block;">
                Go to Partner Dashboard →
            </a>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Welcome to the Shrawello Partner Network!<br><strong>Shrawello Travel Hub Team</strong></p>
    `);
    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 6. Send Partner KYC Rejected Email
 * @param {object} params - { to, name, reason }
 */
export async function sendPartnerKYCRejectedEmail({ to, name, reason }) {
    const subject = `Action Required: KYC Verification Needs Attention - Shrawello`;
    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background-color: #fee2e2; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">⚠️</div>
        </div>
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700; text-align: center;">KYC Verification Needs Resubmission</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">We were unable to verify your submitted KYC documents. Here is the reason provided by our verification team:</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #7f1d1d; font-weight: 600;">${reason || 'Documents were unclear or did not match our requirements.'}</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">To resolve this, please log in to your Partner Portal and resubmit your KYC documents with clear, high-resolution photos.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://shrawello.com/#/partner/dashboard" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block;">
                Resubmit KYC Documents →
            </a>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">If you have any questions, reply to this email or contact us at <a href="mailto:hello@shrawello.com" style="color: #4f46e5;">hello@shrawello.com</a></p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Best regards,<br><strong>Shrawello Partner Verification Team</strong></p>
    `);
    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 7. Send Partner Approved Email (when admin approves registration)
 * @param {object} params - { to, name }
 */
export async function sendPartnerApprovedEmail({ to, name }) {
    const subject = `Welcome to Shrawello Partner Network! Your Account is Approved 🎉`;
    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #3730a3); border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">🎉</div>
        </div>
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700; text-align: center;">Your Partner Account is Approved!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Great news! Your Shrawello Partner account registration has been <strong style="color: #4f46e5;">approved</strong> by our team. You can now log in to your Partner Portal and start earning commissions.</p>
        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 2;">
                <li>Log in to your Partner Portal</li>
                <li>Complete your KYC verification (mandatory)</li>
                <li>Add your bank details for commission payouts</li>
                <li>Start submitting leads and earning commissions!</li>
            </ol>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://shrawello.com/#/partner/login" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block;">
                Login to Partner Portal →
            </a>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Welcome aboard!<br><strong>Shrawello Travel Hub Team</strong></p>
    `);
    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 8. Send Commission Paid Email
 * @param {object} params - { to, name, amount, bookingAmount, bankDetails }
 */
export async function sendPartnerCommissionPaidEmail({ to, name, amount, bookingAmount, bankDetails = {} }) {
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
    const formattedBooking = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(bookingAmount || 0);
    const subject = `Commission Payout Processed — ${formatted} - Shrawello`;
    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">💰</div>
        </div>
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700; text-align: center;">Commission Payout Processed!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your commission payout has been processed and is on its way to your registered bank account.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
                <tr>
                    <td style="color: #64748b;"><strong>Booking Value:</strong></td>
                    <td style="color: #1e293b; text-align: right;">${formattedBooking}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="color: #1e293b; padding-top: 12px;"><strong>Commission Payout:</strong></td>
                    <td style="color: #10b981; text-align: right; padding-top: 12px; font-size: 18px;"><strong>${formatted}</strong></td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding-top: 8px;"><strong>Bank Account:</strong></td>
                    <td style="color: #1e293b; text-align: right; padding-top: 8px;">${bankDetails.accountName || 'Your registered account'}</td>
                </tr>
                ${bankDetails.accountNumber ? `<tr><td style="color: #64748b;"><strong>Account No:</strong></td><td style="color: #1e293b; text-align: right;">XXXX${String(bankDetails.accountNumber).slice(-4)}</td></tr>` : ''}
            </table>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">Please allow 2–3 business days for the amount to reflect in your account depending on your bank.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Thank you for your continued partnership!<br><strong>Shrawello Travel Hub Team</strong></p>
    `);
    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 9. Send Loyalty Tier Upgrade Email
 * @param {object} params - { to, name, newTier, converted }
 */
export async function sendLoyaltyTierUpgradeEmail({ to, name, newTier, converted }) {
    const TIER_ICONS = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' };
    const TIER_BONUSES = { Bronze: '0%', Silver: '+0.5%', Gold: '+1%', Platinum: '+2%' };
    const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#9ca3af', Gold: '#f59e0b', Platinum: '#8b5cf6' };
    const icon = TIER_ICONS[newTier] || '🏆';
    const bonus = TIER_BONUSES[newTier] || '';
    const color = TIER_COLORS[newTier] || '#4f46e5';
    const subject = `Congratulations! You've reached ${newTier} tier! ${icon} - Shrawello Partner`;
    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: linear-gradient(135deg, ${color}33, ${color}22); border: 3px solid ${color}; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 42px;">${icon}</div>
        </div>
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 22px; font-weight: 800; text-align: center;">🎊 Milestone Achieved!</h2>
        <p style="font-size: 22px; font-weight: 800; color: ${color}; text-align: center; margin: 0 0 20px 0;">${newTier} Partner ${icon}</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Congratulations! You've achieved an incredible milestone — <strong>${converted} bookings converted</strong>. You've been upgraded to <strong style="color: ${color};">${newTier} tier</strong>!</p>
        <div style="background: linear-gradient(135deg, ${color}11, ${color}08); border: 1px solid ${color}44; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <h3 style="margin-top: 0; color: ${color}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${newTier} Tier Benefits</h3>
            <p style="font-size: 24px; font-weight: 800; color: ${color}; margin: 8px 0;">${bonus} Commission Bonus</p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">on top of your base commission rate</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Keep up the great work! Log in to your dashboard to see your updated tier status.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://shrawello.com/#/partner/dashboard" style="background-color: ${color}; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block;">
                View My Dashboard →
            </a>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">Congratulations again!<br><strong>Shrawello Travel Hub Team</strong></p>
    `);
    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 10. Notify Admin team when a partner submits KYC documents (S5)
 * @param {object} params - { partnerName, partnerEmail, isResubmission }
 */
export async function sendPartnerKYCSubmittedAdminEmail({ partnerName, partnerEmail, isResubmission = false }) {
    let adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_FROM;
    if (!adminEmail && dbPool) {
        try {
            const [rows] = await dbPool.query(
                "SELECT setting_value FROM settings WHERE setting_key = 'company.email' OR setting_key = 'integrations.smtpGeneral.fromEmail' LIMIT 1"
            );
            if (rows.length > 0 && rows[0].setting_value) {
                try { adminEmail = JSON.parse(rows[0].setting_value); } catch(e) { adminEmail = rows[0].setting_value; }
            }
        } catch(e) {}
    }
    adminEmail = adminEmail || 'hello@shrawello.com';

    const actionLabel = isResubmission ? 'Resubmitted' : 'Submitted';
    const subject = `[Action Required] Partner KYC ${actionLabel} — ${partnerName}`;
    const html = wrapTemplate(subject, `
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">🔔 Action Required</p>
            <p style="margin: 8px 0 0 0; font-size: 15px; color: #78350f; font-weight: 600;">A partner has ${isResubmission ? 're-submitted' : 'submitted'} their KYC documents and is awaiting review.</p>
        </div>
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 800;">KYC ${actionLabel} — Review Required</h2>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 140px;">Partner Name</td><td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${partnerName}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Partner Email</td><td style="padding: 8px 0; color: #1e293b;">${partnerEmail}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Submission Type</td><td style="padding: 8px 0;"><span style="background: ${isResubmission ? '#fef3c7' : '#ecfdf5'}; color: ${isResubmission ? '#92400e' : '#065f46'}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${isResubmission ? '🔄 Re-submission' : '✨ First Submission'}</span></td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Submitted At</td><td style="padding: 8px 0; color: #1e293b;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST</td></tr>
            </table>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://shrawello.com/#/admin/kyc" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block;">
                Review KYC Documents →
            </a>
        </div>
        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an automated notification from Shrawello Admin System.</p>
    `);
    return await sendEmail({ type: 'general', to: adminEmail, subject, html });
}
