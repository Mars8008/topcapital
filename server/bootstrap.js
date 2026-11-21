const User = require('./models/User');
const config = require('./config');

// Creates the first admin account from ADMIN_USERNAME / ADMIN_PASSWORD
// when the database has no users yet.
async function ensureAdmin() {
    if (await User.exists({})) return;
    if (!config.adminPassword || config.adminPassword.length < 8 || config.adminPassword.startsWith('CHANGE_ME')) {
        console.warn('⚠  Админ хэрэглэгч алга. .env файлд ADMIN_PASSWORD-д 8+ тэмдэгттэй нууц үг бичээд серверээ дахин асаана уу.');
        return;
    }
    const user = new User({ username: config.adminUsername });
    await user.setPassword(config.adminPassword);
    await user.save();
    console.log(`Admin user "${user.username}" created.`);
}

module.exports = { ensureAdmin };
