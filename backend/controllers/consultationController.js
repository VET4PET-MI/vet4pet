const Consultation   = require('../models/Consultation');
const User           = require('../models/User');
const MedicalRecord  = require('../models/MedicalRecord');
const notifications  = require('./notificationController');
const jaas           = require('../utils/jaas');

// Serialize a consultation with a join URL tailored to the requesting user: vets join the
// JaaS room as moderator, owners as guests. Falls back to the stored meet.jit.si URL when
// JaaS is not configured.
function serialize(consultation, user) {
  const obj = consultation.toObject ? consultation.toObject() : consultation;
  return { ...obj, joinUrl: jaas.joinUrlFor(consultation, user) };
}

async function getConsultations(req, res) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    // Owners only see their own consultations
    if (req.user.role === 'owner') filter.ownerId = req.user.id;
    const list = await Consultation.find(filter).sort({ createdAt: -1 });
    res.json(list.map(c => serialize(c, req.user)));
  } catch (err) {
    console.error('[Consultation] getConsultations error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getPending(req, res) {
  try {
    const list = await Consultation.find({ status: 'pending' }).sort({ createdAt: 1 });
    res.json(list.map(c => serialize(c, req.user)));
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
    // Auto-generate Jitsi Meet URL using a random token (avoids exposing MongoDB _id)
    const { randomUUID } = require('crypto');
    consultation.joinUrl = `https://meet.jit.si/Vet4Pet-${randomUUID()}`;
    await consultation.save();
    console.log('[Consultation] created:', consultation._id, 'owner:', consultation.ownerId);

    // Notify all vets that a consultation has been requested
    try {
      const vets = await User.find({ role: 'vet' }).select('_id');
      const notifyParams = {
        ownerName: consultation.ownerName || '',
        petName:   consultation.petName || '',
      };
      await Promise.all(vets.map(v =>
        notifications.create({
          recipientId: v._id,
          type:        'consultation_requested',
          params:      notifyParams,
          link:        '/consultations',
        })
      ));
    } catch (notifyErr) {
      console.error('[Consultation] notify vets failed:', notifyErr.message);
    }

    res.status(201).json(serialize(consultation, req.user));
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

    // When a vet activates a consultation, notify the owner so they can join
    if (status === 'active' && consultation.ownerId) {
      await notifications.create({
        recipientId: consultation.ownerId,
        type:        'consultation_active',
        params:      { petName: consultation.petName || '' },
        link:        '/consultations',
      });
    }

    // Auto-document the consultation in the pet's medical record when it ends
    if (status === 'ended' && consultation.petId && consultation.startedAt) {
      try {
        const vetName = req.user?.role === 'vet' ? req.user.name : '';
        const durationMs = (consultation.endedAt || new Date()) - new Date(consultation.startedAt);
        const minutes = Math.max(1, Math.round(durationMs / 60000));
        const parts = [
          `Online video consultation via Jitsi Meet.`,
          `Duration: ~${minutes} minutes.`,
        ];
        if (consultation.notes?.trim()) parts.push(`Owner's note: ${consultation.notes.trim()}`);

        await MedicalRecord.create({
          petId:    consultation.petId,
          date:     consultation.endedAt || new Date(),
          vetName,
          type:     'CONSULTATION',
          findings: parts.join('\n'),
        });
        console.log('[Consultation] medical record auto-created for pet', consultation.petId);
      } catch (recErr) {
        console.error('[Consultation] failed to create medical record:', recErr.message);
      }
    }

    res.json(serialize(consultation, req.user));
  } catch (err) {
    console.error('[Consultation] updateStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getConsultations, getPending, createConsultation, updateStatus };
