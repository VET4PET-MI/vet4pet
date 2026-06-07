const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['vet', 'owner'], default: 'owner' },

    // Owner identity — used by vets to look up a client's pets.
    // sparse+unique: existing/owner-less users without a value are unaffected.
    nationalId: { type: String, trim: true, default: undefined },

    // Vet-only fields for emergency search
    clinicName: { type: String, default: '' },
    address:    { type: String, default: '' },
    phone:      { type: String, default: '' },
    lat:        { type: Number, default: null },
    lng:        { type: Number, default: null },
    isOnCall:   { type: Boolean, default: false },
    fcmToken:   { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.index({ lat: 1, lng: 1 });
userSchema.index({ nationalId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
