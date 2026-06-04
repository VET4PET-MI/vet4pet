const mongoose = require('mongoose');

const APPT_TYPES    = ['CHECKUP', 'VACCINATION', 'FOLLOW_UP', 'EMERGENCY', 'CONSULTATION', 'OTHER'];
const APPT_STATUSES = ['booked', 'confirmed', 'cancelled', 'completed'];

const appointmentSchema = new mongoose.Schema(
  {
    petId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
    petName:   { type: String },
    ownerId:   { type: String },
    ownerName: { type: String },
    vetId:     { type: String },
    vetName:   { type: String },
    date:      { type: Date, required: true },
    time:      { type: String, required: true }, // 'HH:MM'
    duration:  { type: Number, default: 30 },    // minutes
    type:      { type: String, enum: APPT_TYPES,    default: 'CHECKUP' },
    status:    { type: String, enum: APPT_STATUSES, default: 'booked' },
    notes:         { type: String },
    ownerIdNumber: { type: String, default: '' },  // Israeli national ID saved for vet records
  },
  { timestamps: true }
);

appointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
