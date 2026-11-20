const router = require('express').Router();
const User = require('../models/User');
const { issueSession, clearSession, requireAuth } = require('../middleware/auth');
const { asyncHandler, rateLimit } = require('../util');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу.' });

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = username && await User.findOne({ username });
    if (!user || !(await user.checkPassword(password))) {
        return res.status(401).json({ error: 'Нэвтрэх нэр эсвэл нууц үг буруу байна.' });
    }
    loginLimiter.reset(req);   // only failed attempts count towards the limit
    issueSession(res, user);
    res.json({ username: user.username });
}));

router.post('/logout', (req, res) => {
    clearSession(res);
    res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ username: req.user.username }));

router.post('/password', requireAuth, asyncHandler(async (req, res) => {
    const { currentPassword = '', newPassword = '' } = req.body;
    if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.' });
    }
    const user = await User.findById(req.user.sub);
    if (!user || !(await user.checkPassword(String(currentPassword)))) {
        return res.status(400).json({ error: 'Одоогийн нууц үг буруу байна.' });
    }
    await user.setPassword(String(newPassword));
    await user.save();
    res.json({ ok: true });
}));

module.exports = router;
