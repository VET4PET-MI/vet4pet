const TimeBlock = require('../models/TimeBlock');

async function getBlocks(req, res) {
  try {
    const { date } = req.query;
    const filter = { vetId: req.user.id };
    if (date) filter.date = date;
    const blocks = await TimeBlock.find(filter).sort({ startTime: 1 });
    res.json(blocks);
  } catch (err) {
    console.error('[TimeBlock] getBlocks error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function createBlock(req, res) {
  try {
    const { date, startTime, endTime, reason } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'date, startTime and endTime are required.' });
    }
    const existing = await TimeBlock.findOne({ vetId: req.user.id, date, startTime });
    if (existing) return res.status(409).json({ message: 'Slot already blocked.' });

    const block = await TimeBlock.create({
      vetId: req.user.id,
      date,
      startTime,
      endTime,
      reason: reason?.trim() || '',
    });
    console.log('[TimeBlock] created:', block._id, 'vetId:', req.user.id, date, startTime);
    res.status(201).json(block);
  } catch (err) {
    console.error('[TimeBlock] createBlock error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function deleteBlock(req, res) {
  try {
    const block = await TimeBlock.findOneAndDelete({ _id: req.params.id, vetId: req.user.id });
    if (!block) return res.status(404).json({ message: 'Block not found.' });
    console.log('[TimeBlock] deleted:', req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('[TimeBlock] deleteBlock error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getBlocks, createBlock, deleteBlock };
