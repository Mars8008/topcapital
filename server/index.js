const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const config = require('./config');
const Media = require('./models/Media');
const Settings = require('./models/Settings');
const { ensureAdmin } = require('./bootstrap');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ---------- API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/public'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- uploaded images ----------
app.get('/media/:id', async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
        const media = await Media.findById(req.params.id).lean();
        if (!media) return res.sendStatus(404);
        res.set('Content-Type', media.contentType);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        if (media.contentType === 'image/svg+xml') res.set('Content-Security-Policy', "script-src 'none'");
        res.send(media.data.buffer ? Buffer.from(media.data.buffer) : media.data);
    } catch (err) {
        next(err);
    }
});

// ---------- website + admin UI ----------
app.use('/admin', (req, res, next) => {
    res.set('X-Frame-Options', 'DENY');
    res.set('Cache-Control', 'no-store');
    next();
});
app.use(express.static(config.publicDir, { extensions: ['html'] }));
app.use((req, res) => res.status(404).sendFile(path.join(config.publicDir, 'index.html')));

// ---------- errors ----------
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ error: err.message });
    }
    if (err.code === 11000) {
        return res.status(409).json({ error: 'Ийм нэртэй зүйл аль хэдийн байна.' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Зураг 4MB-аас хэтэрсэн байна. Зургаа жижигрүүлээд дахин оролдоно уу.' });
    }
    if (err.status && err.status < 500) {   // e.g. malformed JSON body
        return res.status(err.status).json({ error: 'Буруу хүсэлт.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Серверийн алдаа гарлаа.' });
});

// Connects to MongoDB once per process and prepares the database.
// Serverless platforms (Vercel) reuse warm instances, so the promise is cached.
let readyPromise = null;
function ready() {
    if (!readyPromise) {
        readyPromise = (async () => {
            await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
            console.log('MongoDB connected');
            // First run on an empty database: load the original site content.
            // (Only when no settings document exists, so content deleted later is never re-added.)
            if (!(await Settings.exists({}))) {
                await require('./seed').seed();
            }
            await ensureAdmin();
        })().catch((err) => {
            readyPromise = null;   // allow a retry on the next request
            throw err;
        });
    }
    return readyPromise;
}

async function start() {
    await ready();
    app.listen(config.port, () => console.log(`TOP CAPITAL running at http://localhost:${config.port}  (admin: /admin)`));
}

if (require.main === module) {
    start().catch((err) => {
        console.error('Failed to start:', err.message);
        process.exit(1);
    });
}

module.exports = { app, start, ready };
