const VetSchedule = require('../models/VetSchedule');

const DEFAULT_SCHEDULE = { workingDays: [1, 2, 3, 4, 5], workStart: '08:00', workEnd: '18:00' };

async function getMySchedule(req, res) {
  try {
    const schedule = await VetSchedule.findOne({ vetId: req.user.id });
    res.json(schedule ?? { ...DEFAULT_SCHEDULE, vetId: req.user.id });
  } catch (err) {
    console.error('[VetSchedule] getMySchedule error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function upsertMySchedule(req, res) {
  try {
    const { workingDays, workStart, workEnd } = req.body;
    const schedule = await VetSchedule.findOneAndUpdate(
      { vetId: req.user.id },
      { $set: { workingDays, workStart, workEnd } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log('[VetSchedule] upserted for vetId:', req.user.id);
    res.json(schedule);
  } catch (err) {
    console.error('[VetSchedule] upsertMySchedule error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getMySchedule, upsertMySchedule };
