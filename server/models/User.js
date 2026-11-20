const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    username: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: true },
}, { timestamps: true });

userSchema.methods.setPassword = async function (password) {
    this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.checkPassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

module.exports = model('User', userSchema);
