// Local demo without a real database: starts the site with a temporary in-memory
// MongoDB filled with the original content. Everything is lost when it stops.
//   npm run demo   →  http://localhost:3000/admin   (admin / admin12345)
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
    const mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('topcapital');
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'admin12345';
    process.env.NODE_ENV = 'development';

    await require('./index').start();
    console.log('DEMO mode: temporary database, changes are lost on stop. Login: admin / admin12345');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
