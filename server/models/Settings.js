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
