// Vercel serverless entry point. vercel.json rewrites /api/* and /media/* here;
// all other files are served statically from public/.
const { app, ready } = require('../server/index');

module.exports = async (req, res) => {
    try {
        await ready();
    } catch (err) {
        console.error('Startup failed:', err.message);
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Өгөгдлийн сантай холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.' }));
        return;
    }
    return app(req, res);
};
