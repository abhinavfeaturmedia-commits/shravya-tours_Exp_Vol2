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
            if (isConfigValid(general)) {
                console.log('[EmailService] Billing SMTP not enabled or incomplete, falling back to General SMTP.');
                return { ...general, type: 'general' };
            }
        } else {
            if (isConfigValid(general)) {
                return { ...general, type: 'general' };
            }
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
                rejectUnauthorized: false
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

// ─── EMAIL TEMPLATE THEME ENGINE ───

/**
 * Fetch the active email template theme configured in DB Settings
 */
export async function getActiveTheme(overrideTheme = null) {
    if (overrideTheme && ['luxury_indigo', 'royal_emerald', 'sunset_coral', 'minimal_clean'].includes(overrideTheme)) {
        return overrideTheme;
    }
    if (dbPool) {
        try {
            const [rows] = await dbPool.query(
                "SELECT setting_value FROM settings WHERE setting_key = 'company.emailTemplateTheme' OR setting_key = 'integrations.emailTemplateTheme' LIMIT 1"
            );
            if (rows.length > 0 && rows[0].setting_value) {
                let val = rows[0].setting_value;
                try { val = JSON.parse(val); } catch(e) {}
                if (val && typeof val === 'string' && ['luxury_indigo', 'royal_emerald', 'sunset_coral', 'minimal_clean'].includes(val)) {
                    return val;
                }
            }
        } catch(e) {}
    }
    return 'luxury_indigo';
}

/**
 * Returns color palette & visual styling attributes for each template theme
 */
export function getThemeStyles(theme = 'luxury_indigo') {
    switch (theme) {
        case 'royal_emerald':
            return {
                id: 'royal_emerald',
                name: 'Royal Emerald & Gold',
                headerGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
                subHeaderColor: '#a7f3d0',
                accentColor: '#059669',
                buttonGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                buttonShadow: '0 4px 14px 0 rgba(5, 150, 105, 0.35)',
                cardBorder: '#d1fae5',
                highlightBg: '#ecfdf5',
                tagBorder: '#f59e0b',
                tagText: '#d97706'
            };
        case 'sunset_coral':
            return {
                id: 'sunset_coral',
                name: 'Sunset Coral & Violet',
                headerGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #8b5cf6 100%)',
                subHeaderColor: '#fecdd3',
                accentColor: '#e11d48',
                buttonGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                buttonShadow: '0 4px 14px 0 rgba(244, 63, 94, 0.35)',
                cardBorder: '#ffe4e6',
                highlightBg: '#fff1f2',
                tagBorder: '#f43f5e',
                tagText: '#e11d48'
            };
        case 'minimal_clean':
            return {
                id: 'minimal_clean',
                name: 'Minimalist Executive Blue',
                headerGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                subHeaderColor: '#94a3b8',
                accentColor: '#2563eb',
                buttonGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                buttonShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)',
                cardBorder: '#e2e8f0',
                highlightBg: '#f8fafc',
                tagBorder: '#2563eb',
                tagText: '#2563eb'
            };
        case 'luxury_indigo':
        default:
            return {
                id: 'luxury_indigo',
                name: 'Modern Luxury Indigo',
                headerGradient: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #6366f1 100%)',
                subHeaderColor: '#c7d2fe',
                accentColor: '#4f46e5',
                buttonGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                buttonShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.35)',
                cardBorder: '#e0e7ff',
                highlightBg: '#f8fafc',
                tagBorder: '#4f46e5',
                tagText: '#4f46e5'
            };
    }
}

/**
 * Universal Modern Responsive Email Shell Generator
 */
export function wrapTemplate(title, bodyContent, options = {}) {
    const theme = options.theme || 'luxury_indigo';
    const st = getThemeStyles(theme);
    const badgeLabel = options.badgeLabel || 'Official Notice';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            @media only screen and (max-width: 620px) {
                .email-container { width: 100% !important; border-radius: 0 !important; }
                .content-padding { padding: 24px 16px !important; }
                .header-padding { padding: 28px 20px !important; }
                .mobile-stack { display: block !important; width: 100% !important; }
                .mobile-text-left { text-align: left !important; }
                .mobile-pt { padding-top: 8px !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
            <tr>
                <td align="center">
                    <!-- Main Card -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                        
                        <!-- Header Banner -->
                        <tr>
                            <td class="header-padding" style="background: ${st.headerGradient}; padding: 36px 32px; text-align: center; color: #ffffff;">
                                <div style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); border-radius: 30px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
                                    ${badgeLabel}
                                </div>
                                <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">SHRAWELLO</h1>
                                <p style="margin: 6px 0 0 0; font-size: 13px; color: ${st.subHeaderColor}; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Travel Hub &amp; Events</p>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td class="content-padding" style="padding: 36px 32px; background-color: #ffffff;">
                                ${bodyContent}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 30px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 6px 0; font-weight: 800; color: #1e293b; font-size: 13px; letter-spacing: 0.2px;">SHRAWELLO Travel Hub and Events LLP</p>
                                <p style="margin: 0 0 16px 0; color: #64748b; line-height: 1.5;">Pimpri Chinchwad, Pune, Maharashtra, India - 411062<br>Email: <a href="mailto:hello@shrawello.com" style="color: ${st.accentColor}; text-decoration: none; font-weight: 600;">hello@shrawello.com</a> | Phone: <a href="tel:+918010955675" style="color: ${st.accentColor}; text-decoration: none; font-weight: 600;">+91 80109 55675</a></p>
                                <div style="margin-bottom: 20px;">
                                    <a href="https://instagram.com/shrawellotravelhub" style="display: inline-block; padding: 6px 14px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; text-decoration: none; margin: 0 4px; font-weight: 700; font-size: 11px;">Instagram</a>
                                    <a href="https://shrawello.com" style="display: inline-block; padding: 6px 14px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; text-decoration: none; margin: 0 4px; font-weight: 700; font-size: 11px;">Official Website</a>
                                </div>
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">This is an automated transactional confirmation from SHRAWELLO.<br>Please retain this email for your travel and tax records.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

/**
 * Resolves a human-friendly, clean reference identifier (avoids raw UUIDs)
 */
export function resolveCleanReference(invoice, booking, fallbackId) {
    if (invoice && invoice.invoice_no && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoice.invoice_no)) {
        return invoice.invoice_no;
    }
    if (booking && booking.booking_number) {
        return `BK-${String(booking.booking_number).padStart(4, '0')}`;
    }
    if (booking && booking.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id)) {
        return String(booking.id).startsWith('BK-') ? booking.id : `BK-${booking.id}`;
    }
    const raw = String(fallbackId || booking?.id || invoice?.id || '');
    if (raw) {
        const clean = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
        return `BK-${clean || '0001'}`;
    }
    return 'BK-0001';
}

/**
 * Send a test email using transient settings passed from the frontend UI
 */
export async function sendTestEmail(smtpSettings, targetEmail, themeOverride = null) {
    if (!targetEmail || !String(targetEmail).trim()) {
        return { success: false, error: 'Recipient target email is required.' };
    }
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const subject = `SMTP Connection Test Successful — SHRAWELLO`;
    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 32px; width: 64px; height: 64px; line-height: 64px; border-radius: 50%;">
                ✓
            </div>
        </div>
        <h2 style="color: #0f172a; margin-top: 0; text-align: center; font-size: 20px; font-weight: 800;">SMTP Connection Verified!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; text-align: center; margin-bottom: 24px;">
            This test email confirms that your outgoing mail server is active, authenticated, and ready to dispatch notifications.
        </p>

        <div style="background-color: ${st.highlightBg}; border: 1px solid ${st.cardBorder}; border-radius: 12px; padding: 20px; font-size: 13px; margin: 24px 0; line-height: 1.8;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="color: #64748b; font-weight: 600; width: 140px;">Active Theme:</td><td style="color: #0f172a; font-weight: 700;">${st.name}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">Sender Username:</td><td style="color: #0f172a; font-weight: 700;">${smtpSettings.username}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">Host &amp; Port:</td><td style="color: #0f172a; font-weight: 700;">${smtpSettings.host}:${smtpSettings.port || 465}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">From Name:</td><td style="color: #0f172a; font-weight: 700;">${smtpSettings.fromName || 'SHRAWELLO'}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">From Address:</td><td style="color: #0f172a; font-weight: 700;">${smtpSettings.fromEmail || smtpSettings.username}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">TLS / SSL:</td><td style="color: #0f172a; font-weight: 700;">${isTruthy(smtpSettings.useTls) ? 'Enabled' : 'Disabled'}</td></tr>
            </table>
        </div>

        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0; text-align: center;">
            Dispatched on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST
        </p>
    `, { theme, badgeLabel: 'SMTP Health Check' });

    return await sendWithTransporter(
        smtpSettings,
        String(targetEmail).trim(),
        subject,
        html,
        'SMTP connection test was successful!'
    );
}

// ─── CUSTOM MANUAL EMAIL ───
export async function sendCustomEmail({ type = 'general', to, subject, message, themeOverride = null }) {
    const theme = await getActiveTheme(themeOverride);
    const formattedMessage = (message || '').replace(/\n/g, '<br>');
    const html = wrapTemplate(subject, `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 800;">${subject}</h2>
        <div style="font-size: 15px; line-height: 1.7; color: #334155; margin: 20px 0;">
            ${formattedMessage}
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Shrawello Travel Hub Team</strong>
        </p>
    `, { theme, badgeLabel: 'Message from Shrawello' });
    return await sendEmail({ type, to, subject, html });
}

// ─── WORKFLOW EMAILS ───

/**
 * 1. Send Agent Introduction Email (hello@shrawello.com)
 * @param {string} leadId - Lead ID
 * @param {string} [customTo] - Optional recipient email override
 */
export async function sendAgentIntroductionEmail(leadId, customTo = null, themeOverride = null) {
    if (!dbPool) return { success: false, error: 'Database pool not initialized.' };
    try {
        const leadIdStr = String(leadId || '').trim();
        const isLeadNum = /^\d+$/.test(leadIdStr);

        let querySql = `
            SELECT l.id AS lead_id, l.name AS lead_name, l.email AS lead_email, l.destination, l.lead_number, l.customer_id,
                   c.email AS customer_email,
                   sm.name AS staff_name, sm.email AS staff_email, sm.phone AS staff_phone 
            FROM leads l 
            LEFT JOIN customers c ON l.customer_id = c.id
            LEFT JOIN staff_members sm ON (l.assigned_to = sm.id OR l.assigned_to = sm.name OR l.assigned_to = sm.email) 
        `;

        let queryParams = [];
        if (isLeadNum) {
            querySql += " WHERE l.lead_number = ? OR l.id = ? LIMIT 1";
            queryParams = [Number(leadIdStr), leadIdStr];
        } else {
            querySql += " WHERE l.id = ? LIMIT 1";
            queryParams = [leadIdStr];
        }

        const [rows] = await dbPool.query(querySql, queryParams);

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
        const destinationText = lead.destination ? ` for ${lead.destination}` : '';

        const cleanLeadNo = lead.lead_number ? `LD-${String(lead.lead_number).padStart(4, '0')}` : `#${String(lead.lead_id).slice(0, 6).toUpperCase()}`;
        const subject = `Your dedicated travel planner has been assigned! (${cleanLeadNo}) — Shrawello`;
        
        const theme = await getActiveTheme(themeOverride);
        const st = getThemeStyles(theme);

        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800;">Hi ${lead.lead_name || 'Traveler'},</h2>
            <p style="font-size: 15px; line-height: 1.65; color: #334155;">
                Thank you for reaching out to <strong>Shrawello Travel Hub &amp; Events</strong>! We are delighted to assist you in planning your holiday${destinationText}.
            </p>
            <p style="font-size: 15px; line-height: 1.65; color: #334155;">
                A dedicated travel specialist has been assigned to personally design your customized itinerary:
            </p>
            
            <div style="background-color: ${st.highlightBg}; border-left: 4px solid ${st.accentColor}; padding: 22px; border-radius: 12px; margin: 25px 0; border: 1px solid ${st.cardBorder}; border-left: 4px solid ${st.accentColor};">
                <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 13px; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Your Assigned Specialist</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 2;">
                    <tr>
                        <td style="color: #64748b; width: 100px;"><strong>Planner:</strong></td>
                        <td style="color: #0f172a; font-weight: 800;">${agentName}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Email:</strong></td>
                        <td style="color: ${st.accentColor}; font-weight: 600;"><a href="mailto:${agentEmail}" style="color: ${st.accentColor}; text-decoration: none;">${agentEmail}</a></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Phone:</strong></td>
                        <td style="color: #0f172a; font-weight: 600;">${agentPhone}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 15px; line-height: 1.65; color: #334155;">
                They are already curating tailored options according to your preferences and will get in touch with you shortly. If you'd like to share extra details, simply reply directly to this email!
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 25px 0 0 0;">
                Warm regards,<br>
                <strong>Shrawello Travel Hub Team</strong>
            </p>
        `, { theme, badgeLabel: 'Dedicated Planner Assigned' });

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
export async function sendProposalEmail(proposalId, customTo = null, themeOverride = null) {
    if (!dbPool) return { success: false, error: 'Database pool not initialized.' };
    try {
        const [rows] = await dbPool.query(`
            SELECT p.id AS proposal_id, p.title AS proposal_title, p.amount AS proposal_amount,
                   l.name AS lead_name, l.email AS lead_email, l.lead_number,
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
        const proposalTitle = prop.proposal_title || 'Custom Travel Itinerary';
        const cleanRef = prop.lead_number ? `#LD-${String(prop.lead_number).padStart(4, '0')}` : `#${String(proposalId).slice(0, 6).toUpperCase()}`;
        const subject = `Your Holiday Proposal: "${proposalTitle}" (${cleanRef}) — Shrawello`;
        const proposalLink = `https://shrawello.com/#/customer/proposals/${prop.proposal_id}`;

        const theme = await getActiveTheme(themeOverride);
        const st = getThemeStyles(theme);

        const html = wrapTemplate(subject, `
            <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800;">Dear ${clientName},</h2>
            <p style="font-size: 15px; line-height: 1.65; color: #334155;">
                Exciting news! We have finished crafting your personalized holiday itinerary proposal:
            </p>

            <div style="background-color: ${st.highlightBg}; border: 1px solid ${st.cardBorder}; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Proposed Trip</p>
                <h3 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 800; color: ${st.accentColor};">
                    "${proposalTitle}"
                </h3>
            </div>

            <p style="font-size: 15px; line-height: 1.65; color: #334155;">
                Click below to review the comprehensive day-wise breakdown, accommodation options, transfers, and pricing in your secure traveler portal:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="${proposalLink}" style="background: ${st.buttonGradient}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: ${st.buttonShadow};">
                    View Custom Proposal ↗
                </a>
            </div>

            <p style="font-size: 14px; line-height: 1.65; color: #334155; margin-top: 25px;">
                Please review the package inclusions and let your planner, <strong>${prop.staff_name || 'your Shrawello specialist'}</strong>, know if you'd like any custom tweaks!
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 25px 0 0 0;">
                Best regards,<br>
                <strong>Shrawello Travel Hub &amp; Events</strong>
            </p>
        `, { theme, badgeLabel: 'Custom Proposal Ready' });

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
 * Safe query helper to find booking by ID or numeric booking_number
 * Prevents MySQL implicit type coercion of UUID strings to integer booking_number
 */
async function findBookingSafely(identifier) {
    if (!identifier || !dbPool) return null;
    const str = String(identifier).trim();
    if (/^\d+$/.test(str)) {
        const [rows] = await dbPool.query(
            "SELECT * FROM bookings WHERE booking_number = ? OR id = ? LIMIT 1",
            [Number(str), str]
        );
        return rows[0] || null;
    } else {
        const [rows] = await dbPool.query(
            "SELECT * FROM bookings WHERE id = ? LIMIT 1",
            [str]
        );
        return rows[0] || null;
    }
}

/**
 * Safe query helper to find invoice by ID, invoice_no, or booking_id
 */
async function findInvoiceSafely(identifier) {
    if (!identifier || !dbPool) return null;
    const str = String(identifier).trim();
    const [rows] = await dbPool.query(
        "SELECT * FROM invoices WHERE id = ? OR invoice_no = ? OR booking_id = ? LIMIT 1",
        [str, str, str]
    );
    return rows[0] || null;
}

/**
 * 3. Send Booking Invoice Email (billing@shrawello.com)
 * Gracefully resolves whether the passed identifier is a Booking ID, an Invoice ID, or an Invoice Number.
 * Queries booking_transactions and computes accurate Amount Paid, Balance Due, and status badges.
 * @param {string} bookingOrInvoiceId - Booking ID, Invoice ID, or Invoice Number
 * @param {string} [customTo] - Optional recipient email override
 * @param {string} [themeOverride] - Optional theme override
 */
export async function sendInvoiceEmail(bookingOrInvoiceId, customTo = null, themeOverride = null) {
    if (!dbPool) return { success: false, error: 'Database pool not initialized.' };
    try {
        let booking = null;
        let invoice = null;
        let customer = null;
        let transactions = [];
        let items = [];

        // 1. Try to find matching invoice first
        invoice = await findInvoiceSafely(bookingOrInvoiceId);

        // 2. Try to find matching booking
        const targetBookingId = invoice?.booking_id || bookingOrInvoiceId;
        booking = await findBookingSafely(targetBookingId);

        // If invoice wasn't found initially by ID, look up by the booking ID
        if (!invoice && booking?.id) {
            invoice = await findInvoiceSafely(booking.id);
        }

        // 3. Try to find customer profile for fallback details
        const targetCustomerId = invoice?.customer_id || booking?.customer_id;
        if (targetCustomerId) {
            const [custRows] = await dbPool.query(
                "SELECT * FROM customers WHERE id = ? LIMIT 1",
                [String(targetCustomerId)]
            );
            if (custRows.length > 0) customer = custRows[0];
        }

        // 4. Fetch booking transactions (payments / refunds)
        const effectiveBookingId = booking?.id || invoice?.booking_id || null;
        if (effectiveBookingId) {
            try {
                const [txRows] = await dbPool.query(
                    "SELECT amount, type, method, reference, notes, status, date FROM booking_transactions WHERE booking_id = ? AND (status != 'Rejected' OR status IS NULL) ORDER BY date DESC, created_at DESC",
                    [String(effectiveBookingId)]
                );
                transactions = txRows || [];
            } catch(e) {
                console.warn('[EmailService] Failed to load booking transactions:', e.message);
            }
        }

        // 5. Fetch invoice line items if invoice exists
        if (invoice?.id) {
            try {
                const [itemRows] = await dbPool.query(
                    "SELECT description, quantity, total_days_km, unit_price, tax_rate, total FROM invoice_items WHERE invoice_id = ?",
                    [String(invoice.id)]
                );
                items = itemRows || [];
            } catch(e) {}
        }

        if (!booking && !invoice) {
            return { success: false, error: `No invoice or booking record found matching ID "${bookingOrInvoiceId}".` };
        }

        // Resolve recipient
        const recipient = customTo || invoice?.email || booking?.customer_email || booking?.email || customer?.email;
        if (!recipient) {
            console.log(`[EmailService] Skip invoice email: Record ${bookingOrInvoiceId} has no recipient email address.`);
            return { success: false, error: `No recipient email found for invoice/booking "${bookingOrInvoiceId}".` };
        }

        // Resolve clean reference code (e.g. BK-0105 or ST-2026-0001)
        const cleanRefNo = resolveCleanReference(invoice, booking, bookingOrInvoiceId);
        const customerName = invoice?.client_name || booking?.customer_name || booking?.customer || customer?.name || 'Valued Traveler';
        const travelTitle = booking?.title || booking?.package_name || (items.length > 0 ? items[0].description : '') || invoice?.document_type || 'Tour & Travel Booking';

        // Financial Calculations
        const totalAmount = Number(invoice?.total_amount !== undefined && invoice?.total_amount !== null ? invoice.total_amount : (booking?.total_price || booking?.amount || 0));
        
        const invoiceAmountPaid = Number(invoice?.amount_paid || 0);
        const advanceReceived = Number(invoice?.advance_received || 0);
        const txAmountPaid = transactions.reduce((sum, t) => sum + (t.type === 'Payment' ? Number(t.amount || 0) : t.type === 'Refund' ? -Number(t.amount || 0) : 0), 0);
        
        const amountPaid = Math.max(invoiceAmountPaid + advanceReceived, txAmountPaid);
        const balanceDue = Math.max(0, totalAmount - amountPaid);
        const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((amountPaid / totalAmount) * 100)) : 0;

        // Resolve Payment Status
        let paymentStatus = 'UNPAID';
        let statusBadgeColor = '#ef4444';
        let statusBadgeBg = '#fef2f2';
        let statusBadgeBorder = '#fecaca';
        let statusIcon = '⏳';

        if (totalAmount > 0 && amountPaid >= (totalAmount - 0.5)) {
            paymentStatus = 'PAID IN FULL';
            statusBadgeColor = '#065f46';
            statusBadgeBg = '#d1fae5';
            statusBadgeBorder = '#a7f3d0';
            statusIcon = '✅';
        } else if (amountPaid > 0) {
            paymentStatus = `PARTIALLY PAID (${percentPaid}%)`;
            statusBadgeColor = '#92400e';
            statusBadgeBg = '#fef3c7';
            statusBadgeBorder = '#fde68a';
            statusIcon = '💳';
        } else if (invoice?.payment_status && !/unpaid/i.test(invoice.payment_status)) {
            paymentStatus = String(invoice.payment_status).toUpperCase();
            if (/paid/i.test(paymentStatus)) {
                statusBadgeColor = '#065f46';
                statusBadgeBg = '#d1fae5';
                statusBadgeBorder = '#a7f3d0';
                statusIcon = '✅';
            }
        } else if (booking?.payment_status && !/unpaid|pending/i.test(booking.payment_status)) {
            paymentStatus = booking.payment_status === 'deposit' ? 'DEPOSIT PAID' : String(booking.payment_status).toUpperCase();
            if (/paid|deposit/i.test(paymentStatus)) {
                statusBadgeColor = '#065f46';
                statusBadgeBg = '#d1fae5';
                statusBadgeBorder = '#a7f3d0';
                statusIcon = '✅';
            }
        }

        // Format dates
        let dateStr = 'Upcoming';
        const rawDate = invoice?.travel_dates || invoice?.travel_date_from || booking?.booking_date || booking?.date;
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

        const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

        const formattedTotal = formatINR(totalAmount);
        const formattedPaid = formatINR(amountPaid);
        const formattedBalance = formatINR(balanceDue);

        // Meaningful subject line with clean reference
        const subject = `Booking Confirmed & Tax Invoice: ${travelTitle} (#${cleanRefNo}) — Shrawello`;
        const bookingLink = booking?.id ? `https://shrawello.com/#/customer/bookings/${booking.id}` : `https://shrawello.com/#/customer/dashboard`;

        const theme = await getActiveTheme(themeOverride);
        const st = getThemeStyles(theme);

        const html = wrapTemplate(subject, `
            <div style="margin-bottom: 24px;">
                <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">Dear ${customerName},</h2>
                <p style="font-size: 15px; line-height: 1.65; color: #334155; margin: 0 0 12px 0;">
                    Thank you for choosing <strong>Shrawello Travel Hub &amp; Events</strong>! Your booking and official invoice summary have been generated successfully.
                </p>
                <p style="font-size: 15px; line-height: 1.65; color: #334155; margin: 0;">
                    Here is your verified booking overview and tax invoice receipt:
                </p>
            </div>

            <!-- Booking Summary Card -->
            <div style="background-color: ${st.highlightBg}; border: 1px solid ${st.cardBorder}; border-radius: 16px; padding: 24px; margin: 28px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);">
                
                <!-- Card Top Header -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
                    <tr>
                        <td align="left" style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                            Invoice &amp; Booking Details
                        </td>
                        <td align="right">
                            <span style="background-color: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeBorder}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                                ${statusIcon} ${paymentStatus}
                            </span>
                        </td>
                    </tr>
                </table>

                <!-- Info Table -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 2;">
                    <tr>
                        <td style="color: #64748b; width: 45%;"><strong>Booking / Ref No:</strong></td>
                        <td style="color: #0f172a; text-align: right; font-weight: 800; font-family: monospace; font-size: 14px;">#${cleanRefNo}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Package / Service:</strong></td>
                        <td style="color: #0f172a; text-align: right; font-weight: 600;">${travelTitle}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;"><strong>Travel / Service Date:</strong></td>
                        <td style="color: #0f172a; text-align: right; font-weight: 600;">${dateStr}</td>
                    </tr>
                    ${booking?.guests ? `
                    <tr>
                        <td style="color: #64748b;"><strong>Travelers / Pax:</strong></td>
                        <td style="color: #0f172a; text-align: right; font-weight: 600;">${booking.guests}</td>
                    </tr>
                    ` : ''}
                </table>

                <!-- Financial Breakdown Section -->
                <div style="margin-top: 20px; padding-top: 16px; border-top: 2px dashed #cbd5e1;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.9;">
                        <tr>
                            <td style="color: #475569;">Total Package Price:</td>
                            <td style="color: #0f172a; text-align: right; font-weight: 700;">${formattedTotal}</td>
                        </tr>
                        <tr>
                            <td style="color: #059669; font-weight: 600;">Total Amount Paid:</td>
                            <td style="color: #059669; text-align: right; font-weight: 800; font-size: 15px;">${formattedPaid}</td>
                        </tr>
                        <tr style="border-top: 1px solid #e2e8f0; font-size: 15px;">
                            <td style="color: #0f172a; padding-top: 10px; font-weight: 800;">Outstanding Balance Due:</td>
                            <td style="color: ${balanceDue === 0 ? '#059669' : '#d97706'}; text-align: right; padding-top: 10px; font-weight: 900; font-size: 17px;">${formattedBalance}</td>
                        </tr>
                    </table>
                </div>

                ${amountPaid > 0 && balanceDue > 0 ? `
                <!-- Progress Bar -->
                <div style="margin-top: 16px; background-color: #e2e8f0; border-radius: 10px; height: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${percentPaid}%; border-radius: 10px;"></div>
                </div>
                <div style="margin-top: 6px; text-align: right; font-size: 11px; color: #64748b; font-weight: 700;">
                    ${percentPaid}% Paid (${formattedPaid} of ${formattedTotal})
                </div>
                ` : ''}
            </div>

            <!-- Dashboard Button CTA -->
            <div style="text-align: center; margin: 34px 0 28px 0;">
                <a href="${bookingLink}" style="background: ${st.buttonGradient}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: ${st.buttonShadow}; letter-spacing: 0.3px;">
                    View Itinerary &amp; Download PDF Invoice ↗
                </a>
            </div>

            <!-- Support Box -->
            <div style="background-color: #f8fafc; border-left: 4px solid ${st.accentColor}; padding: 16px 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.6;">
                    <strong>Need help or itinerary adjustments?</strong> Reply directly to this email or reach our dedicated helpdesk on WhatsApp/Call at <strong>+91 80109 55675</strong>.
                </p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 25px 0 0 0;">
                Warm regards,<br>
                <strong style="color: #0f172a;">Billing &amp; Customer Success Team<br>Shrawello Travel Hub &amp; Events</strong>
            </p>
        `, { theme, badgeLabel: 'Tax Invoice & Booking Confirmation' });

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
 * @param {object} params - { to, name, otp, portal, expiresInMinutes, themeOverride }
 */
export async function sendOTPEmail({ to, name, otp, portal, expiresInMinutes = 10, themeOverride = null }) {
    const subject = `Your Password Reset OTP: ${otp} — Shrawello ${portal} Portal`;
    const greetingName = (name && !name.includes('@')) ? name : 'User';
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800;">Hi ${greetingName},</h2>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            We received a request to securely reset the password for your Shrawello <strong>${portal} Portal</strong> account.
        </p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            Use the verification code below to confirm your identity and set a new password:
        </p>

        <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: ${st.buttonGradient}; border-radius: 16px; padding: 24px 44px; box-shadow: ${st.buttonShadow};">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">One-Time Password</p>
                <p style="margin: 0; font-size: 40px; font-weight: 900; color: #ffffff; letter-spacing: 10px; font-family: 'Courier New', monospace;">${otp}</p>
            </div>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 700;">⏱ This OTP will expire in ${expiresInMinutes} minutes</p>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
            If you did not request this password reset, please disregard this message. Your credentials remain safe and secure.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Best regards,<br>
            <strong>Shrawello Security Team</strong>
        </p>
    `, { theme, badgeLabel: 'Security Verification' });

    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 5. Send Partner KYC Verified Email
 * @param {object} params - { to, name, themeOverride }
 */
export async function sendPartnerKYCVerifiedEmail({ to, name, themeOverride = null }) {
    const subject = `KYC Verified ✅ — Your Partner Account is Now Active! - Shrawello`;
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">✅</div>
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center;">KYC Verification Successful!</h2>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            Congratulations! Your KYC documents have been reviewed and <strong style="color: #059669;">successfully verified</strong> by our compliance team.
        </p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            Your Shrawello Partner account is now fully active. You have full access to:
        </p>
        <ul style="font-size: 14px; color: #334155; line-height: 1.9; padding-left: 20px;">
            <li>Submit and track customer leads in real time</li>
            <li>Monitor converted bookings and commission earnings</li>
            <li>Access complete partner training and promotional collateral</li>
            <li>Receive automatic commission payouts straight to your bank account</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://shrawello.com/#/partner/dashboard" style="background: ${st.buttonGradient}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: ${st.buttonShadow};">
                Access Partner Dashboard →
            </a>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Welcome to the Shrawello Partner Network!<br>
            <strong>Shrawello Partner Relations Team</strong>
        </p>
    `, { theme, badgeLabel: 'Partner KYC Approved' });

    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 6. Send Partner KYC Rejected Email
 * @param {object} params - { to, name, reason, themeOverride }
 */
export async function sendPartnerKYCRejectedEmail({ to, name, reason, themeOverride = null }) {
    const subject = `Action Required: KYC Verification Needs Attention — Shrawello`;
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #fee2e2; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">⚠️</div>
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center;">KYC Document Resubmission Required</h2>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            We reviewed your submitted KYC documents, but could not complete verification due to the following reason:
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 18px 22px; border-radius: 10px; margin: 22px 0;">
            <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 700;">${reason || 'Documents were unclear, blurry, or did not match registered bank/identity details.'}</p>
        </div>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            To activate your partner account and enable commission payouts, please log into your Partner Portal and upload fresh, clear copies of your documents.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://shrawello.com/#/partner/dashboard" style="background: ${st.buttonGradient}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: ${st.buttonShadow};">
                Resubmit KYC Documents →
            </a>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            If you have questions or need assistance, reply directly to this email or reach us at <a href="mailto:hello@shrawello.com" style="color: ${st.accentColor}; font-weight: 600;">hello@shrawello.com</a>.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Best regards,<br>
            <strong>Shrawello Partner Verification Team</strong>
        </p>
    `, { theme, badgeLabel: 'KYC Resubmission Needed' });

    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 7. Send Partner Approved Email (when admin approves registration)
 * @param {object} params - { to, name, themeOverride }
 */
export async function sendPartnerApprovedEmail({ to, name, themeOverride = null }) {
    const subject = `Welcome to Shrawello Partner Network! Your Account is Approved 🎉`;
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: ${st.buttonGradient}; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px; box-shadow: ${st.buttonShadow};">🎉</div>
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center;">Your Partner Account is Approved!</h2>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            Great news! Your Shrawello Partner account registration has been <strong style="color: ${st.accentColor};">approved</strong> by our team.
        </p>
        <div style="background-color: ${st.highlightBg}; border: 1px solid ${st.cardBorder}; border-radius: 14px; padding: 22px; margin: 25px 0;">
            <h3 style="margin-top: 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800;">Next Steps to Start Earning</h3>
            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 2;">
                <li>Log in to your Partner Portal</li>
                <li>Complete your KYC document verification</li>
                <li>Add your bank details for direct commission deposits</li>
                <li>Submit your client leads and begin earning top-tier commissions!</li>
            </ol>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://shrawello.com/#/partner/login" style="background: ${st.buttonGradient}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: ${st.buttonShadow};">
                Login to Partner Portal →
            </a>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Welcome aboard!<br>
            <strong>Shrawello Partner Relations Team</strong>
        </p>
    `, { theme, badgeLabel: 'Account Registration Approved' });

    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 8. Send Commission Paid Email
 * @param {object} params - { to, name, amount, bookingAmount, bankDetails, themeOverride }
 */
export async function sendPartnerCommissionPaidEmail({ to, name, amount, bookingAmount, bankDetails = {}, themeOverride = null }) {
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
    const formattedBooking = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(bookingAmount || 0);
    const subject = `Commission Payout Processed: ${formatted} — Shrawello`;
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; width: 72px; height: 72px; line-height: 72px; font-size: 36px;">💰</div>
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center;">Commission Payout Processed!</h2>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            Your commission payout has been processed and is on its way to your registered bank account:
        </p>
        <div style="background-color: ${st.highlightBg}; border: 1px solid ${st.cardBorder}; border-radius: 16px; padding: 24px; margin: 25px 0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 2;">
                <tr>
                    <td style="color: #64748b;"><strong>Booking Value:</strong></td>
                    <td style="color: #0f172a; text-align: right; font-weight: 700;">${formattedBooking}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="color: #0f172a; padding-top: 12px; font-weight: 800;"><strong>Commission Payout:</strong></td>
                    <td style="color: #059669; text-align: right; padding-top: 12px; font-size: 18px; font-weight: 900;">${formatted}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding-top: 8px;"><strong>Bank Beneficiary:</strong></td>
                    <td style="color: #0f172a; text-align: right; padding-top: 8px; font-weight: 600;">${bankDetails.accountName || 'Your registered account'}</td>
                </tr>
                ${bankDetails.accountNumber ? `
                <tr>
                    <td style="color: #64748b;"><strong>Account Number:</strong></td>
                    <td style="color: #0f172a; text-align: right; font-weight: 600; font-family: monospace;">XXXX${String(bankDetails.accountNumber).slice(-4)}</td>
                </tr>
                ` : ''}
            </table>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            Please allow 1–2 business days for the credit to reflect depending on inter-bank clearing.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Thank you for your valuable partnership!<br>
            <strong>Shrawello Finance &amp; Accounts Team</strong>
        </p>
    `, { theme, badgeLabel: 'Commission Payout Confirmation' });

    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 9. Send Loyalty Tier Upgrade Email
 * @param {object} params - { to, name, newTier, converted, themeOverride }
 */
export async function sendLoyaltyTierUpgradeEmail({ to, name, newTier, converted, themeOverride = null }) {
    const TIER_ICONS = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' };
    const TIER_BONUSES = { Bronze: '0%', Silver: '+0.5%', Gold: '+1%', Platinum: '+2%' };
    const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#9ca3af', Gold: '#f59e0b', Platinum: '#8b5cf6' };
    const icon = TIER_ICONS[newTier] || '🏆';
    const bonus = TIER_BONUSES[newTier] || '';
    const color = TIER_COLORS[newTier] || '#4f46e5';
    const subject = `Milestone Reached! You've upgraded to ${newTier} tier ${icon} — Shrawello Partner`;
    
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, ${color}33, ${color}22); border: 3px solid ${color}; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 42px;">${icon}</div>
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 900; text-align: center;">🎊 Partner Tier Upgraded!</h2>
        <p style="font-size: 20px; font-weight: 800; color: ${color}; text-align: center; margin: 0 0 20px 0;">${newTier} Partner ${icon}</p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">Dear <strong>${name || 'Partner'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.65; color: #334155;">
            Congratulations on achieving <strong>${converted} converted bookings</strong>! You've earned an upgrade to the prestigious <strong style="color: ${color};">${newTier} tier</strong>.
        </p>
        <div style="background: linear-gradient(135deg, ${color}11, ${color}08); border: 1px solid ${color}44; border-radius: 16px; padding: 22px; margin: 25px 0; text-align: center;">
            <h3 style="margin-top: 0; color: ${color}; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">${newTier} Tier Benefit</h3>
            <p style="font-size: 26px; font-weight: 900; color: ${color}; margin: 8px 0;">${bonus} Bonus Commission</p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">applied on all your future bookings</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://shrawello.com/#/partner/dashboard" style="background-color: ${color}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block;">
                View My Partner Dashboard →
            </a>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 0;">
            Congratulations once again!<br>
            <strong>Shrawello Travel Hub Team</strong>
        </p>
    `, { theme, badgeLabel: 'Loyalty Milestone' });

    return await sendEmail({ type: 'general', to, subject, html });
}

/**
 * 10. Notify Admin team when a partner submits KYC documents
 * @param {object} params - { partnerName, partnerEmail, isResubmission, themeOverride }
 */
export async function sendPartnerKYCSubmittedAdminEmail({ partnerName, partnerEmail, isResubmission = false, themeOverride = null }) {
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
    const theme = await getActiveTheme(themeOverride);
    const st = getThemeStyles(theme);

    const html = wrapTemplate(subject, `
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.8px;">🔔 Compliance Review Alert</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #78350f; font-weight: 600;">A registered partner has ${isResubmission ? 're-submitted' : 'submitted'} their KYC verification documents.</p>
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 800;">KYC Document Submission Details</h2>
        <div style="background-color: ${st.highlightBg}; border: 1px solid ${st.cardBorder}; border-radius: 14px; padding: 20px; margin: 20px 0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 2;">
                <tr><td style="color: #64748b; font-weight: 600; width: 140px;">Partner Name:</td><td style="color: #0f172a; font-weight: 800;">${partnerName}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">Partner Email:</td><td style="color: #0f172a; font-weight: 600;"><a href="mailto:${partnerEmail}" style="color: ${st.accentColor}; text-decoration: none;">${partnerEmail}</a></td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">Submission Type:</td><td style="padding: 4px 0;"><span style="background: ${isResubmission ? '#fef3c7' : '#ecfdf5'}; color: ${isResubmission ? '#92400e' : '#065f46'}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${isResubmission ? '🔄 Re-submission' : '✨ New Submission'}</span></td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">Dispatched:</td><td style="color: #0f172a;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST</td></tr>
            </table>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://shrawello.com/#/admin/kyc" style="background: ${st.buttonGradient}; color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 800; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: ${st.buttonShadow};">
                Review Verification Documents →
            </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an automated system dispatch from Shrawello Admin Core.</p>
    `, { theme, badgeLabel: 'Admin Compliance Alert' });

    return await sendEmail({ type: 'general', to: adminEmail, subject, html });
}
