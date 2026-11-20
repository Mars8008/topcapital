const { Schema, model } = require('mongoose');
const { slugify } = require('../util');

const featureSchema = new Schema({
    icon: { type: String, trim: true, default: 'fa-solid fa-check' },
    title: { type: String, trim: true, required: true },
    text: { type: String, trim: true, default: '' },
}, { _id: false });

const serviceSchema = new Schema({
    title: { type: String, trim: true, required: true, maxlength: 120 },
    slug: { type: String, trim: true, unique: true, index: true },
    summary: { type: String, trim: true, default: '' },          // card text on lists
    image: { type: String, trim: true, default: '' },            // card / detail image
    icon: { type: String, trim: true, default: '' },             // white icon shown on the card
    heading: { type: String, trim: true, default: '' },          // detail page H2
    content: { type: String, trim: true, default: '' },          // paragraphs, blank line between
    highlightValue: { type: String, trim: true, default: '' },
    highlightLabel: { type: String, trim: true, default: '' },
    highlightTitle: { type: String, trim: true, default: '' },
    highlightText: { type: String, trim: true, default: '' },
    features: { type: [featureSchema], default: [] },
    beforeImage: { type: String, trim: true, default: '' },
    afterImage: { type: String, trim: true, default: '' },
    ctaTitle: { type: String, trim: true, default: '' },
    ctaText: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
}, { timestamps: true });

serviceSchema.pre('validate', function () {
    if (!this.slug || this.isModified('title')) this.slug = slugify(this.title);
});

module.exports = model('Service', serviceSchema);
