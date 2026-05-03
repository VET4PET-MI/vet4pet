const mongoose = require('mongoose');

const timeBlockSchema = new mongoose.Schema(
  {
    vetId:     { type: String, required: true },
    date:      { type: String, required: true },  // YYYY-MM-DD
    startTime: { type: String, required: true },  // HH:MM
    endTime:   { type: String, required: true },  // HH:MM  (startTime + 30 min for quick blocks)
    reason:    { type: String, default: '' },
  },
  { timestamps: true }
);

timeBlockSchema.index({ vetId: 1, date: 1 });

module.exports = mongoose.model('TimeBlock', timeBlockSchema);
