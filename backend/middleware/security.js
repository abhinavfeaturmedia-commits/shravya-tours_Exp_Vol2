import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// ═══════════════════════════════════════════
// UNIFIED JWT SECRET
// ═══════════════════════════════════════════
export const getJwtSecret = () => process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
export const JWT_SECRET = getJwtSecret();

// ═══════════════════════════════════════════
// CORS CONFIGURATION
// ═══════════════════════════════════════════
const DEFAULT_ALLOWED_ORIGINS = [
    'https://shravyatours.com',
    'https://www.shravyatours.com',
    'https://shrawello.com',
    'https://www.shrawello.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://127.0.0.1:5173'
];

export function configureCors() {
    const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS];
    if (process.env.FRONTEND_URL) {
        process.env.FRONTEND_URL.split(',').forEach(url => {
            const trimmed = url.trim();
            if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
        });
    }

    return cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);

            // Match allowed list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // In development, allow any local port
            if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
    });
}

// ═══════════════════════════════════════════
// HELMET SECURITY HEADERS
// ═══════════════════════════════════════════
export function configureHelmet() {
    return helmet({
        contentSecurityPolicy: false, // Allows inline scripts & dynamic styles used by Vite & React SPA
        crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploads/static assets to be served cross-origin
        crossOriginEmbedderPolicy: false
    });
}

// ═══════════════════════════════════════════
// RATE LIMITERS
// ═══════════════════════════════════════════

// Strict limiter for authentication (Login) - 20 attempts per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.' }
});

// Sensitive OTP request limiter - 5 requests per 15 minutes
export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OTP requests. Please wait a few minutes before requesting another code.' }
});

// Public AI Chatbot limiter - 15 messages per minute to prevent OpenRouter wallet drain
export const chatbotLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'You are sending messages too quickly. Please pause for a moment.' }
});

// Public Lead form limiter - 10 submissions per hour per IP to block spam bots
export const publicLeadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Inquiry limit reached from this network. Please contact us directly via phone or WhatsApp.' }
});

// General API request limiter - 600 requests per 5 minutes per IP
export const generalApiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' }
});
