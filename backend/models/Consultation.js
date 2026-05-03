const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    ownerId:   { type: String, required: true },
    ownerName: { type: String },
    petId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
    petName:   { type: String },
    status:    { type: String, enum: ['pending', 'active', 'ended'], default: 'pending' },
    joinUrl:   { type: String },
    notes:     { type: String },
    startedAt: { type: Date },
    endedAt:   { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultation', consultationSchema);
