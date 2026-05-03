const mongoose = require('mongoose');

const vetScheduleSchema = new mongoose.Schema(
  {
    vetId:       { type: String, required: true, unique: true },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun … 6=Sat
    workStart:   { type: String, default: '08:00' },
    workEnd:     { type: String, default: '18:00' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VetSchedule', vetScheduleSchema);
