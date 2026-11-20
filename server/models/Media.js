// Uploaded images stored inside MongoDB so the site works on any host
// (no dependency on a persistent local disk). Served at /media/:id.
const { Schema, model } = require('mongoose');

const mediaSchema = new Schema({
    filename: { type: String, trim: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
}, { timestamps: true });

module.exports = model('Media', mediaSchema);
