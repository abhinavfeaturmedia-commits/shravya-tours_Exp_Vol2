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
            "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'integrations.smtpGeneral.%' OR setting_key LIKE 'integrations.smtpBilling.%'"
        );

        const general = {};
        const billing = {};

        rows.forEach(row => {
            const parts = row.setting_key.split('.');
            const group = parts[1]; // smtpGeneral or smtpBilling
            const key = parts[2]; // enabled, host, username, password, etc.
            let val = row.setting_value;
            try { val = JSON.parse(val); } catch(e) {}
            
            if (group === 'smtpGeneral') general[key] = val;
            if (group === 'smtpBilling') billing[key] = val;
        });

        // Determine which config to return, with fallback
        if (type === 'billing') {
            if (billing.enabled && billing.host && billing.username && billing.password) {
                return { ...billing, type: 'billing' };
            }
            // Fall back to general if billing is not configured/enabled
            if (general.enabled && general.host && general.username && general.password) {
                console.log('[EmailService] Billing SMTP not enabled, falling back to General SMTP.');
                return { ...general, type: 'general' };
            }
        } else {
            // Default to general
            if (general.enabled && general.host && general.username && general.password) {
                return { ...general, type: 'general' };
            }
            // Fall back to billing
            if (billing.enabled && billing.host && billing.username && billing.password) {
                console.log('[EmailService] General SMTP not enabled, falling back to Billing SMTP.');
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
 * @param {string} params.type - 'general' or 'billing'
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Plain text fallback
 * @param {Array} [params.attachments] - Nodemailer attachments
 * @returns {Promise<boolean>}
 */
export async function sendEmail({ type, to, subject, html, text = '', attachments = [] }) {
    const config = await loadSmtpSettings(type);
    if (!config) {
        console.warn(`[EmailService] SMTP email skipped: no active SMTP configurations found for type "${type}".`);
        return false;
    }

    return await sendWithTransporter(config, to, subject, html, text, attachments);
}

/**
 * Lower-level helper to trigger nodemailer sending
 */
async function sendWithTransporter(config, to, subject, html, text, attachments) {
    try {
        const port = Number(config.port) || 587;
        const isSecure = port === 465;

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: port,
            secure: isSecure,
            auth: {
                user: config.username,
                pass: config.password
            },
            tls: {
                rejectUnauthorized: false // bypass SSL verification issues for Hostinger / custom domains
            }
        });

        const mailOptions = {
            from: `"${config.fromName}" <${config.fromEmail || config.username}>`,
            to,
            subject,
            text: text || html.replace(/<[^>]*>/g, ''), // basic HTML stripping fallback
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Email sent successfully! MessageId: ${info.messageId} | Recipient: ${to} | SMTP: ${config.username}`);
        return true;
    } catch (err) {
        console.error(`[EmailService] Failed to send email via ${config.username}:`, err.message);
        return false;
    }
}

/**
 * Send a test email using transient settings passed from the frontend UI
 */
export async function sendTestEmail(smtpSettings, targetEmail) {
    return await sendWithTransporter(
        smtpSettings,
        targetEmail,
        'SMTP Connection Test - Shrawello Travel Hub',
        `
        <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: #4f46e5; margin-top: 0;">Connection Test Successful!</h2>
                <p>This is a test email confirming that your SMTP configuration is correct and active.</p>
                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px; margin: 20px 0;">
                    <strong>Sender username:</strong> ${smtpSettings.username}<br>
                    <strong>Host:</strong> ${smtpSettings.host}:${smtpSettings.port}<br>
                    <strong>TLS:</strong> ${smtpSettings.useTls ? 'Enabled' : 'Disabled'}
                </div>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Sent on: ${new Date().toLocaleString()}</p>
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
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b;-webkit-font-smoothing: antialiased;">
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
                    <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.5;">This is an automated transactional email.<br>If you did not make this request, please ignore this email or contact support.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// ─── WORKFLOW EMAILS ───

/**
 * 1. Send Agent Introduction Email (hello@shrawello.com)
 */
export async function sendAgentIntroductionEmail(leadId) {
    if (!dbPool) return;
    try {
        const [rows] = await dbPool.query(`
            SELECT l.name AS lead_name, l.email AS lead_email, sm.name AS staff_name, sm.email AS staff_email, sm.phone AS staff_phone 
            FROM leads l 
            LEFT JOIN staff_members sm ON l.assigned_to = sm.id 
            WHERE l.id = ?
        `, [leadId]);

        if (rows.length === 0) return;
        const lead = rows[0];

        if (!lead.lead_email) {
            console.log(`[EmailService] Skip agent intro: Lead ${leadId} has no email address.`);
            return;
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

        await sendEmail({
            type: 'general',
            to: lead.lead_email,
            subject,
            html
        });
    } catch (err) {
        console.error('[EmailService] Agent intro email trigger failed:', err.message);
    }
}

/**
 * 2. Send Proposal Ready Email (hello@shrawello.com)
 */
export async function sendProposalEmail(proposalId) {
    if (!dbPool) return;
    try {
        const [rows] = await dbPool.query(`
            SELECT p.id AS proposal_id, p.title AS proposal_title, l.name AS lead_name, l.email AS lead_email, sm.name AS staff_name 
            FROM proposals p 
            JOIN leads l ON p.lead_id = l.id 
            LEFT JOIN staff_members sm ON l.assigned_to = sm.id 
            WHERE p.id = ?
        `, [proposalId]);

        if (rows.length === 0) return;
        const prop = rows[0];

        if (!prop.lead_email) {
            console.log(`[EmailService] Skip proposal email: Lead associated with proposal ${proposalId} has no email address.`);
            return;
        }

        const subject = `Your Custom Holiday Proposal: "${prop.proposal_title}" - Shrawello`;
        const proposalLink = `https://shrawello.com/customer/proposals/${prop.proposal_id}`; // Replace with actual domain / route when ready

        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Dear ${prop.lead_name || 'Traveler'},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Exciting updates! We have finished crafting a custom holiday proposal tailored specifically to your preferences:</p>
            <p style="font-size: 16px; font-weight: 700; color: #4f46e5; text-align: center; margin: 20px 0; background-color: #e0e7ff; padding: 12px; border-radius: 8px;">
                "${prop.proposal_title}"
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

        await sendEmail({
            type: 'general',
            to: prop.lead_email,
            subject,
            html
        });
    } catch (err) {
        console.error('[EmailService] Proposal email trigger failed:', err.message);
    }
}

/**
 * 3. Send Booking Invoice Email (billing@shrawello.com)
 */
export async function sendInvoiceEmail(bookingId) {
    if (!dbPool) return;
    try {
        const [rows] = await dbPool.query(`
            SELECT b.id, b.customer_name, b.customer_email, b.customer_phone, b.booking_date, b.total_price, b.status, b.payment_status, b.booking_number, b.title 
            FROM bookings b 
            WHERE b.id = ?
        `, [bookingId]);

        if (rows.length === 0) return;
        const booking = rows[0];

        if (!booking.customer_email) {
            console.log(`[EmailService] Skip invoice email: Booking ${bookingId} has no email address.`);
            return;
        }

        // Try to fetch generated invoice number if exists
        const [invRows] = await dbPool.query("SELECT id FROM invoices WHERE booking_id = ?", [bookingId]);
        const invoiceNo = invRows.length > 0 ? invRows[0].id : `INV-BK-${booking.booking_number}`;

        const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(booking.total_price);
        const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

        const subject = `Booking Confirmed & Invoice Issued - #${booking.booking_number} - Shrawello`;
        const bookingLink = `https://shrawello.com/customer/bookings/${booking.id}`; // Replace with actual domain / route when ready

        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Dear ${booking.customer_name},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Thank you for booking with Shrawello Travel Hub! Your booking has been processed and is officially <strong>confirmed</strong>.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">We have generated your booking summary and official tax invoice below:</p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 25px 0;">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Invoice Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
                    <tr>
                        <td style="color: #64748b;"><strong>Invoice / Reference:</strong></td>
                        <td style="color: #1e293b; text-align: right;"><strong>${invoiceNo}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Travel Package:</strong></td>
                        <td style="color: #1e293b; text-align: right;">${booking.title || 'Tour Package'}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Departure Date:</strong></td>
                        <td style="color: #1e293b; text-align: right;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Payment Status:</strong></td>
                        <td style="color: #1e293b; text-align: right;"><span style="background-color: ${booking.payment_status === 'paid' ? '#d1fae5' : '#fef3c7'}; color: ${booking.payment_status === 'paid' ? '#065f46' : '#92400e'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${booking.payment_status}</span></td>
                    </tr>
                    <tr style="border-top: 1px solid #e2e8f0; font-size: 16px;">
                        <td style="color: #1e293b; padding-top: 12px;"><strong>Total Amount:</strong></td>
                        <td style="color: #10b981; text-align: right; padding-top: 12px;"><strong>${formattedPrice}</strong></td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 15px; line-height: 1.6; color: #334155;">You can view detailed vouchers, daily itineraries, and download your printable PDF invoice at any time by logging into your Customer Dashboard:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${bookingLink}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16,185,129,0.2);">
                    Access Customer Portal ↗
                </a>
            </div>

            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">If you have any questions regarding your billing or booking details, feel free to reply to this email to contact our accounts department.<br><br>Best regards,<br><strong>Billing Dept.<br>Shrawello Travel Hub</strong></p>
        `);

        await sendEmail({
            type: 'billing',
            to: booking.customer_email,
            subject,
            html
        });
    } catch (err) {
        console.error('[EmailService] Invoice email trigger failed:', err.message);
    }
}

// ─── PARTNER & OTP EMAILS ───

/**
 * 4. Send OTP Email for Password Reset (hello@shrawello.com)
 * @param {object} params - { to, name, otp, portal, expiresInMinutes }
 */
export async function sendOTPEmail({ to, name, otp, portal, expiresInMinutes = 10 }) {
    const subject = `Your Password Reset OTP - Shrawello ${portal} Portal`;
    const html = wrapTemplate(subject, `
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">Hi ${name || 'User'},</h2>
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
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Congratulations! Your KYC documents have been reviewed and <strong style="color: #10b981;">successfully verified</strong> by our team.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your Shrawello Partner account is now fully active. You can now:</p>
        <ul style="font-size: 14px; color: #334155; line-height: 1.8; padding-left: 20px;">
            <li>Submit and track leads</li>
            <li>View your commission earnings</li>
            <li>Access your full partner dashboard</li>
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
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name}</strong>,</p>
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
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name}</strong>,</p>
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
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name}</strong>,</p>
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
                ${bankDetails.accountNumber ? `<tr><td style="color: #64748b;"><strong>Account No:</strong></td><td style="color: #1e293b; text-align: right;">XXXX${bankDetails.accountNumber.slice(-4)}</td></tr>` : ''}
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
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${name}</strong>,</p>
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
    const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_FROM || 'hello@shrawello.com';
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
            <a href="https://shravyatours.com/#/admin/kyc" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 10px; display: inline-block;">
                Review KYC Documents →
            </a>
        </div>
        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an automated notification from Shrawello Admin System.</p>
    `);
    return await sendEmail({ type: 'general', to: ADMIN_EMAIL, subject, html });
}
