// Read-only API used by the public website, plus the contact/quote form endpoint.
const router = require('express').Router();
const Service = require('../models/Service');
const Project = require('../models/Project');
const Settings = require('../models/Settings');
const Message = require('../models/Message');
const { asyncHandler, rateLimit } = require('../util');

const CARD_FIELDS = 'title slug summary image icon';
const PROJECT_CARD_FIELDS = 'title slug category location duration summary coverImage';

router.get('/site', asyncHandler(async (req, res) => {
    const [settings, services, projects] = await Promise.all([
        Settings.get(),
        Service.find({ published: true }).sort({ order: 1, createdAt: 1 }).select(CARD_FIELDS).lean(),
        Project.find({ published: true }).sort({ order: 1, createdAt: -1 }).select(PROJECT_CARD_FIELDS).lean(),
    ]);
    const { contact, about, testimonials, team, faq } = settings.toObject();
    res.set('Cache-Control', 'no-cache');
    res.json({ contact, about, testimonials, team, faq, services, projects });
}));

router.get('/services/:slug', asyncHandler(async (req, res) => {
    const service = await Service.findOne({ slug: req.params.slug, published: true }).lean();
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
}));

router.get('/projects/:slug', asyncHandler(async (req, res) => {
    const project = await Project.findOne({ slug: req.params.slug, published: true }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
}));

const QUOTE_FIELDS = ['company', 'project_description', 'project_type', 'property_size', 'budget',
    'timeline', 'style', 'start_date', 'address', 'requirements'];

const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: 'Too many messages. Please try again later.' });

router.post('/messages', formLimiter, asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (body.website) return res.json({ ok: true });   // honeypot field filled → bot, silently ignore

    const type = body.type === 'quote' ? 'quote' : 'contact';
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide your name and a valid email.' });
    }

    const details = {};
    if (type === 'quote') {
        for (const key of QUOTE_FIELDS) {
            const value = String(body[key] || '').trim().slice(0, 2000);
            if (value) details[key] = value;
        }
    }

    await Message.create({
        type,
        name,
        email,
        phone: String(body.phone || '').trim(),
        message: String(body.message || body.project_description || '').trim(),
        details,
    });
    res.json({ ok: true });
}));

module.exports = router;
