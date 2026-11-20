// Contact-form and quote-request submissions shown in the admin inbox.
const { Schema, model } = require('mongoose');

const messageSchema = new Schema({
    type: { type: String, enum: ['contact', 'quote'], required: true },
    name: { type: String, trim: true, required: true, maxlength: 200 },
    email: { type: String, trim: true, required: true, maxlength: 200 },
    phone: { type: String, trim: true, default: '', maxlength: 60 },
    message: { type: String, trim: true, default: '', maxlength: 5000 },
    details: { type: Map, of: String, default: {} },   // extra quote fields
    read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Message', messageSchema);
