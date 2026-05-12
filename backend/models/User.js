const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['vet', 'owner'], default: 'owner' },

    // Vet-only fields for emergency search
    clinicName: { type: String, default: '' },
    address:    { type: String, default: '' },
    phone:      { type: String, default: '' },
    lat:        { type: Number, default: null },
    lng:        { type: Number, default: null },
    isOnCall:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('User', userSchema);
