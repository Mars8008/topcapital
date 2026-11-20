const { Schema, model } = require('mongoose');
const { slugify } = require('../util');

const projectSchema = new Schema({
    title: { type: String, trim: true, required: true, maxlength: 120 },
    slug: { type: String, trim: true, unique: true, index: true },
    category: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    summary: { type: String, trim: true, default: '' },          // card text on lists
    coverImage: { type: String, trim: true, default: '' },       // card image
    heroImage: { type: String, trim: true, default: '' },        // wide image on detail page
    description: { type: String, trim: true, default: '' },      // lead paragraph
    brief: { type: String, trim: true, default: '' },
    solution: { type: String, trim: true, default: '' },
    gallery: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
}, { timestamps: true });

projectSchema.pre('validate', function () {
    if (!this.slug || this.isModified('title')) this.slug = slugify(this.title);
});

module.exports = model('Project', projectSchema);
