const MedicalRecord = require('../models/MedicalRecord');

async function getRecordsByPet(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip  = Math.max(parseInt(req.query.skip,  10) || 0, 0);
    const filter = { petId: req.params.petId };

    // Optional comma-separated type filter (used by the profile tabs).
    if (req.query.types) {
      const types = req.query.types.split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.type = { $in: types };
    }

    const [items, total] = await Promise.all([
      MedicalRecord.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      MedicalRecord.countDocuments(filter),
    ]);

    res.json({ items, total, hasMore: skip + items.length < total });
  } catch (err) {
    console.error('[MedicalRecord] getRecordsByPet error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getRecordById(req, res) {
  try {
    const record = await MedicalRecord.findById(req.params.id).populate('petId', 'name species');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    console.error('[MedicalRecord] getRecordById error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function addRecord(req, res) {
  try {
    const record = await MedicalRecord.create(req.body);
    console.log('[MedicalRecord] created:', record._id, 'pet:', record.petId);
    res.status(201).json(record);
  } catch (err) {
    console.error('[MedicalRecord] addRecord error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function updateRecord(req, res) {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    console.error('[MedicalRecord] updateRecord error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function deleteRecord(req, res) {
  try {
    const record = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    console.log('[MedicalRecord] deleted:', req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('[MedicalRecord] deleteRecord error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getRecordsByPet, getRecordById, addRecord, updateRecord, deleteRecord };
