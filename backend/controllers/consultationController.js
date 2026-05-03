const Consultation = require('../models/Consultation');

async function getConsultations(req, res) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    // Owners only see their own consultations
    if (req.user.role === 'owner') filter.ownerId = req.user.id;
    const list = await Consultation.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('[Consultation] getConsultations error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getPending(req, res) {
  try {
    const list = await Consultation.find({ status: 'pending' }).sort({ createdAt: 1 });
    res.json(list);
  } catch (err) {
    console.error('[Consultation] getPending error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function createConsultation(req, res) {
  try {
    const payload = { ...req.body };
    // Enforce owner identity from token
    if (req.user.role === 'owner') {
      payload.ownerId   = req.user.id;
      payload.ownerName = payload.ownerName || req.user.name;
    }
    const consultation = await Consultation.create(payload);
    // Auto-generate Jitsi Meet URL using the MongoDB _id
    consultation.joinUrl = `https://meet.jit.si/Vet4Pet-${consultation._id}`;
    await consultation.save();
    console.log('[Consultation] created:', consultation._id, 'owner:', consultation.ownerId);
    res.status(201).json(consultation);
  } catch (err) {
    console.error('[Consultation] createConsultation error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'active') update.startedAt = new Date();
    if (status === 'ended')  update.endedAt   = new Date();

    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!consultation) return res.status(404).json({ message: 'Consultation not found.' });
    console.log('[Consultation] status updated:', consultation._id, '->', status);
    res.json(consultation);
  } catch (err) {
    console.error('[Consultation] updateStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getConsultations, getPending, createConsultation, updateStatus };
