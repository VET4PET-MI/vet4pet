const mongoose = require('mongoose');

const RECORD_TYPES = ['VISIT_SUMMARY', 'VACCINATION', 'LAB_RESULT', 'XRAY', 'BLOOD_TEST', 'CONSULTATION', 'OTHER'];

const medicalRecordSchema = new mongoose.Schema(
  {
    petId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    date:     { type: Date, default: Date.now },
    vetName:  { type: String },
    type:     { type: String, enum: RECORD_TYPES },
    findings: { type: String },
    fileUrl:          { type: String },
    originalFileName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
