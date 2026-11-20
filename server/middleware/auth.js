const jwt = require('jsonwebtoken');
const config = require('../config');

const COOKIE = 'tc_admin';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function issueSession(res, user) {
    const token = jwt.sign({ sub: String(user._id), username: user.username }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: config.isProduction,
        maxAge: MAX_AGE_MS,
        path: '/',
    });
}

function clearSession(res) {
    res.clearCookie(COOKIE, { path: '/' });
}

function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies[COOKIE];
    if (!token) return res.status(401).json({ error: 'Нэвтрэх шаардлагатай.' });
    try {
        req.user = jwt.verify(token, config.jwtSecret);
        next();
    } catch {
        clearSession(res);
        res.status(401).json({ error: 'Сешн дууссан. Дахин нэвтэрнэ үү.' });
    }
}

module.exports = { issueSession, clearSession, requireAuth };
