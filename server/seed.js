// Fills an empty database with the website's original content.
// Usage: npm run seed          (skips collections that already have data)
//        npm run seed -- --force   (replaces services, projects and settings)
const mongoose = require('mongoose');
const config = require('./config');
const Service = require('./models/Service');
const Project = require('./models/Project');
const Settings = require('./models/Settings');
const { ensureAdmin } = require('./bootstrap');
const data = require('./seed-data.json');

async function seed({ force = false } = {}) {
    if (force) {
        await Promise.all([Service.deleteMany({}), Project.deleteMany({}), Settings.deleteMany({})]);
    }

    if (!(await Service.exists({}))) {
        await Service.insertMany(data.services.map((s, order) => ({
            ...s,
            order,
            heading: order === 0 ? data.serviceDetail.heading : s.title,
            content: s.summary,
            highlightValue: '10+',
            highlightLabel: 'Years Experience',
            ctaTitle: data.serviceDetail.ctaTitle,
            ctaText: data.serviceDetail.ctaText,
            ...(order === 0 ? data.serviceDetail : {}),
        })).map((s) => new Service(s)));
        console.log(`Seeded ${data.services.length} services`);
    }

    if (!(await Project.exists({}))) {
        await Project.insertMany(data.projects.map((p, order) => new Project({
            ...p,
            order,
            heroImage: data.projectDetail.heroImage,
            description: p.summary,
            ...(order === 0 ? data.projectDetail : {}),
        })));
        console.log(`Seeded ${data.projects.length} projects`);
    }

    const settings = await Settings.get();
    if (!settings.about.heading) {
        settings.set({
            contact: {
                address: '41751 Cynthia ter, Aldie Virginia, United States',
                email: 'topcapitalllc74@gmail.com',
                phone: '+1 (510) 590-0089',
                hours: 'Monday - Sat: 8:30 AM - 4:00 PM',
                facebook: 'https://www.facebook.com/people/Top-Capital-LLC/100092351732962/',
            },
            about: data.about,
            testimonials: data.testimonials,
            team: [],
            faq: data.faq,
        });
        await settings.save();
        console.log('Seeded about / contact / testimonials / FAQ');
    }
}

if (require.main === module) {
    mongoose.connect(config.mongoUri)
        .then(() => seed({ force: process.argv.includes('--force') }))
        .then(ensureAdmin)
        .then(() => mongoose.disconnect())
        .catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { seed };
