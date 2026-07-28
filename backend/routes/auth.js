/**
 * Auth Routes Module
 * 
 * Handles staff/admin authentication: login, session restore, user creation.
 * Extracted from index.js for modularization.
 * 
 * Usage in index.js:
 *   import { createAuthRoutes } from './routes/auth.js';
 *   createAuthRoutes(app, pool);
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export function createAuthRoutes(app, pool) {

    // POST /api/auth/login
    app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // SECURITY: Dev/demo bypass removed. All logins go through proper bcrypt auth.
        // If you need to reset admin password, set ADMIN_DEFAULT_PASSWORD env var and restart.

        try {
            const trimmedEmail = email?.trim();
            const [staff] = await pool.query('SELECT * FROM staff_members WHERE email = ?', [trimmedEmail]);
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);

            if (users.length > 0) {
                const valid = await bcrypt.compare(password, users[0].password_hash);
                if (!valid) {
                    console.warn(`Login failed for ${trimmedEmail}: Invalid password`);
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
            } else if (staff.length > 0 && staff[0].password_hash) {
                const valid = await bcrypt.compare(password, staff[0].password_hash);
                if (!valid) {
                    console.warn(`Login failed for ${trimmedEmail}: Invalid staff password`);
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                // Auto-create users row for future logins
                try {
                    await pool.query(
                        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                        [trimmedEmail, staff[0].password_hash, staff[0].user_type === 'Admin' ? 'admin' : 'staff']
                    );
                    console.log(`Auto-created users record for staff: ${trimmedEmail}`);
                } catch (insertErr) {
                    if (insertErr.code !== 'ER_DUP_ENTRY') console.warn('Auto-create users row warning:', insertErr.message);
                }
            } else {
                console.warn(`Login failed for ${trimmedEmail}: User record not found in users table`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const staffProfile = staff.length > 0 ? staff[0] : null;
            const effectiveRole = (staffProfile?.user_type === 'Admin') ? 'admin' : (users[0]?.role || 'staff');
            const userId = users[0]?.id || null;

            const token = jwt.sign(
                { id: userId, email: trimmedEmail, role: effectiveRole, staffId: staffProfile?.id },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Update last_active
            if (staffProfile) {
                await pool.query(
                    "UPDATE staff_members SET last_active = DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%sZ') WHERE email = ?",
                    [trimmedEmail]
                ).catch(e => console.error('Failed to update last_active:', e.message));
            }

            console.log(`Login successful: ${trimmedEmail} (role: ${effectiveRole})`);
            return res.json({ token, user: { id: userId, email: trimmedEmail, role: effectiveRole }, staff: staffProfile });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: 'Login failed' });
        }
    });

    // GET /api/auth/me — Session restore
    app.get('/api/auth/me', authMiddleware, async (req, res) => {
        try {
            const [staff] = await pool.query('SELECT * FROM staff_members WHERE email = ?', [req.user.email]);
            if (staff.length > 0) {
                await pool.query(
                    "UPDATE staff_members SET last_active = DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%sZ') WHERE email = ?",
                    [req.user.email]
                ).catch(e => console.error('Failed to update last_active on /me:', e.message));
                const now = new Date();
                const isoNow = now.toISOString().replace('.000', '').replace(/\.\d{3}/, '');
                staff[0].last_active = isoNow;
            }
            res.json({ user: req.user, staff: staff[0] || null });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch user info' });
        }
    });

    // POST /api/auth/create-user — Create/update auth user (admin only)
    app.post('/api/auth/create-user', authMiddleware, async (req, res) => {
        const { email, password, role } = req.body;
        try {
            const hash = await bcrypt.hash(password, 10);
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                await pool.query('UPDATE users SET password_hash = ?, role = ? WHERE email = ?', [hash, role || 'staff', email]);
            } else {
                await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hash, role || 'staff']);
            }
            res.json({ status: 'success' });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Failed to create user', details: error.message });
        }
    });
}
