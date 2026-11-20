// Authenticated management API used by /admin.
const router = require('express').Router();
const multer = require('multer');
const Service = require('../models/Service');
const Project = require('../models/Project');
const Settings = require('../models/Settings');
const Message = require('../models/Message');
const Media = require('../models/Media');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, pick } = require('../util');

router.use(requireAuth);

// ---------- dashboard ----------
router.get('/stats', asyncHandler(async (req, res) => {
    const [services, projects, messages, unread] = await Promise.all([
        Service.countDocuments(),
        Project.countDocuments(),
        Message.countDocuments(),
        Message.countDocuments({ read: false }),
    ]);
    res.json({ services, projects, messages, unread });
}));

// ---------- generic CRUD for services and projects ----------
function crud(path, Model, fields, sort) {
    router.get(`/${path}`, asyncHandler(async (req, res) => {
        res.json(await Model.find().sort(sort).lean());
    }));

    router.get(`/${path}/:id`, asyncHandler(async (req, res) => {
        const doc = await Model.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ error: 'Олдсонгүй.' });
        res.json(doc);
    }));

    router.post(`/${path}`, asyncHandler(async (req, res) => {
        const data = pick(req.body, fields);
        if (data.order === undefined) {
            const last = await Model.findOne().sort({ order: -1 }).select('order').lean();
            data.order = last ? last.order + 1 : 0;
        }
        res.status(201).json(await Model.create(data));
    }));

    router.put(`/${path}/:id`, asyncHandler(async (req, res) => {
        const doc = await Model.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Олдсонгүй.' });
        doc.set(pick(req.body, fields));
        await doc.save();
        res.json(doc);
    }));

    router.delete(`/${path}/:id`, asyncHandler(async (req, res) => {
        const doc = await Model.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Олдсонгүй.' });
        res.json({ ok: true });
    }));

    // Body: { ids: [id1, id2, ...] } in the new display order.
    router.post(`/${path}-order`, asyncHandler(async (req, res) => {
        const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
        await Model.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { order } } })));
        res.json({ ok: true });
    }));
}

crud('services', Service, ['title', 'summary', 'image', 'icon', 'heading', 'content', 'highlightValue',
    'highlightLabel', 'highlightTitle', 'highlightText', 'features', 'beforeImage', 'afterImage',
    'ctaTitle', 'ctaText', 'order', 'published'], { order: 1, createdAt: 1 });

crud('projects', Project, ['title', 'category', 'year', 'location', 'duration', 'summary', 'coverImage',
    'heroImage', 'description', 'brief', 'solution', 'gallery', 'order', 'published'], { order: 1, createdAt: -1 });

// ---------- site settings (about / contact / testimonials / team / faq) ----------
const SECTIONS = ['contact', 'about', 'testimonials', 'team', 'faq'];

router.get('/settings', asyncHandler(async (req, res) => {
    res.json(await Settings.get());
}));

router.put('/settings/:section', asyncHandler(async (req, res) => {
    const { section } = req.params;
    if (!SECTIONS.includes(section)) return res.status(400).json({ error: 'Буруу хэсэг.' });
    const settings = await Settings.get();
    settings.set(section, req.body);
    await settings.save();
    res.json(settings[section]);
}));

// ---------- messages ----------
router.get('/messages', asyncHandler(async (req, res) => {
    res.json(await Message.find().sort({ createdAt: -1 }).limit(500).lean());
}));

router.patch('/messages/:id', asyncHandler(async (req, res) => {
    const msg = await Message.findByIdAndUpdate(req.params.id, { read: Boolean(req.body.read) }, { new: true });
    if (!msg) return res.status(404).json({ error: 'Олдсонгүй.' });
    res.json(msg);
}));

router.delete('/messages/:id', asyncHandler(async (req, res) => {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
}));

// ---------- image upload ----------
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, ALLOWED_TYPES.includes(file.mimetype)),
});

router.post('/media', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Зөвхөн JPG, PNG, WEBP, GIF, SVG зураг (8MB хүртэл).' });
    const media = await Media.create({
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer,
    });
    res.status(201).json({ url: `/media/${media._id}` });
}));

module.exports = router;
