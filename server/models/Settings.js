// Single document (key: "site") holding the editable About / Contact content.
const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    key: { type: String, default: 'site', unique: true },

    contact: {
        address: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        hours: { type: String, trim: true, default: '' },
        facebook: { type: String, trim: true, default: '' },
        instagram: { type: String, trim: true, default: '' },
        whatsapp: { type: String, trim: true, default: '' },
        mapEmbedUrl: { type: String, trim: true, default: '' },
    },

    // Home page hero + before/after. Defaults are the site's original content, so an
    // existing database shows the same page until the admin edits it.
    home: {
        heroTitle1: { type: String, trim: true, default: 'Creating Modern Spaces' },
        heroTitle2: { type: String, trim: true, default: 'For Better Living' },
        heroText: {
            type: String, trim: true,
            default: 'Complete home renovations, custom remodeling, and premium craftsmanship—designed to create beautiful, functional spaces you\'ll enjoy for years to come.',
        },
        heroButtonText: { type: String, trim: true, default: 'Start Your Project' },
        heroButtonLink: { type: String, trim: true, default: 'get-a-quote.html' },
        slides: { type: [String], default: () => ['images/slider/1.webp', 'images/slider/2.webp'] },
        stats: {
            type: [{
                _id: false,
                icon: { type: String, trim: true, default: 'fa-solid fa-house' },
                value: { type: String, trim: true, default: '' },
                label: { type: String, trim: true, default: '' },
            }],
            default: () => [
                { icon: 'fa-solid fa-house', value: '10+', label: 'Years Experience' },
                { icon: 'fa-solid fa-hammer', value: '850+', label: 'Homes Renovated' },
                { icon: 'fa-solid fa-face-smile', value: '98%', label: 'Customer Satisfaction' },
                { icon: 'fa-solid fa-user-check', value: '24/7', label: 'Support & Consultation' },
            ],
        },
        beforeAfterSubtitle: { type: String, trim: true, default: 'Before & After' },
        beforeAfterTitle: { type: String, trim: true, default: 'From Outdated to Outstanding' },
        beforeImage: { type: String, trim: true, default: 'images/before-after/1b.webp' },
        afterImage: { type: String, trim: true, default: 'images/before-after/1a.webp' },
    },

    about: {
        subtitle: { type: String, trim: true, default: '' },
        heading: { type: String, trim: true, default: '' },
        text: { type: String, trim: true, default: '' },
        image1: { type: String, trim: true, default: '' },
        image2: { type: String, trim: true, default: '' },
        highlights: { type: [String], default: [] },
    },

    testimonials: [{
        _id: false,
        title: { type: String, trim: true, default: '' },
        text: { type: String, trim: true, default: '' },
        name: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
        photo: { type: String, trim: true, default: '' },
        rating: { type: Number, min: 1, max: 5, default: 5 },
    }],

    team: [{
        _id: false,
        name: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
        photo: { type: String, trim: true, default: '' },
        facebook: { type: String, trim: true, default: '' },
        instagram: { type: String, trim: true, default: '' },
        linkedin: { type: String, trim: true, default: '' },
    }],

    faq: [{
        _id: false,
        category: { type: String, trim: true, default: 'General' },
        question: { type: String, trim: true, default: '' },
        answer: { type: String, trim: true, default: '' },
    }],
}, { timestamps: true });

settingsSchema.statics.get = async function () {
    return (await this.findOne({ key: 'site' })) || this.create({ key: 'site' });
};

module.exports = model('Settings', settingsSchema);
