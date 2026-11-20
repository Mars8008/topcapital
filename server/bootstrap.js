const User = require('./models/User');
const config = require('./config');

// Creates the first admin account from ADMIN_USERNAME / ADMIN_PASSWORD
// when the database has no users yet.
async function ensureAdmin() {
    if (await User.exists({})) return;
    if (!config.adminPassword || config.adminPassword.length < 8) {
        console.warn('⚠  No admin user exists. Set ADMIN_PASSWORD (8+ chars) in .env and restart to create one.');
        return;
    }
    const user = new User({ username: config.adminUsername });
    await user.setPassword(config.adminPassword);
    await user.save();
    console.log(`Admin user "${user.username}" created.`);
}

module.exports = { ensureAdmin };
