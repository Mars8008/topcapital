// Loads .env (Node >= 20.12) and exposes validated configuration.
const path = require('path');

try {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
    // No .env file — rely on real environment variables.
}

const isProduction = process.env.NODE_ENV === 'production';

const config = {
    isProduction,
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/topcapital',
    jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    publicDir: path.join(__dirname, '..', 'public'),
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        user: (process.env.SMTP_USER || '').trim(),
        pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),   // Gmail shows app passwords with spaces
        notifyTo: (process.env.NOTIFY_EMAIL || '').trim(),
    },
};

if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) {
    throw new Error('MONGODB_URI буруу байна. .env файлд MongoDB Atlas-ын "mongodb+srv://..." хаягаа оруулна уу.');
}

if (isProduction && config.jwtSecret === 'dev-only-secret-change-me') {
    throw new Error('JWT_SECRET must be set in production.');
}

module.exports = config;
