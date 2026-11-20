function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'item';
}

// Wrap async route handlers so rejected promises reach the error handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Copy only allowed keys from a request body.
function pick(source, keys) {
    const out = {};
    for (const key of keys) {
        if (source && source[key] !== undefined) out[key] = source[key];
    }
    return out;
}

// Simple in-memory fixed-window rate limiter.
// limiter.reset(req) clears the counter (e.g. after a successful login).
function rateLimit({ windowMs, max, message }) {
    const hits = new Map();
    const limiter = (req, res, next) => {
        const now = Date.now();
        const key = req.ip;
        const entry = hits.get(key);
        if (!entry || now > entry.reset) {
            hits.set(key, { count: 1, reset: now + windowMs });
            return next();
        }
        if (++entry.count > max) {
            return res.status(429).json({ error: message || 'Too many requests, try again later.' });
        }
        next();
    };
    limiter.reset = (req) => hits.delete(req.ip);
    return limiter;
}

module.exports = { slugify, asyncHandler, pick, rateLimit };
