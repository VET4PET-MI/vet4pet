const Appointment = require('../models/Appointment');
const VetSchedule = require('../models/VetSchedule');
const TimeBlock   = require('../models/TimeBlock');
const Message     = require('../models/Message');
const User        = require('../models/User');
const notifications = require('./notificationController');

async function notifyVets(appt, ownerName) {
  if (appt.vetId) {
    await notifications.create({
      recipientId: appt.vetId,
      type:        'appointment_booked_by_owner',
      params: {
        petName: appt.petName || '',
        date:    new Date(appt.date).toISOString().slice(0, 10),
        time:    appt.time || '',
        ownerName,
      },
      link: '/schedule',
    });
    return;
  }
  // No vet assigned — broadcast to all vets so whoever is on duty sees it
  const vets = await User.find({ role: 'vet' }).select('_id');
  await Promise.all(vets.map(v => notifications.create({
    recipientId: v._id,
    type:        'appointment_booked_by_owner',
    params: {
      petName: appt.petName || '',
      date:    new Date(appt.date).toISOString().slice(0, 10),
      time:    appt.time || '',
      ownerName,
    },
    link: '/schedule',
  })));
}

function makeConvId(a, b) { return [a, b].sort().join('::'); }

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeToMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function dayBounds(dateStr) {
  return {
    start: new Date(`${dateStr}T00:00:00.000Z`),
    end:   new Date(`${dateStr}T23:59:59.999Z`),
  };
}

// Wall-clock "now" in Israel — regardless of where the server runs.
// Render runs in UTC, so using getHours() directly skews 2–3 hours.
function nowInIsrael() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return {
    date:    `${parts.year}-${parts.month}-${parts.day}`,
    minutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
  };
}

// ── Controllers ────────────────────────────────────────────────────────────────

async function getAppointments(req, res) {
  try {
    const { date, status } = req.query;
    const filter = {};
    if (date) {
      const { start, end } = dayBounds(date);
      filter.date = { $gte: start, $lte: end };
    }
    if (status) filter.status = status;
    if (req.user.role === 'owner') filter.ownerId = req.user.id;
    const appointments = await Appointment.find(filter).sort({ time: 1 });
    res.json(appointments);
  } catch (err) {
    console.error('[Appointment] getAppointments error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getAppointmentById(req, res) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    res.json(appt);
  } catch (err) {
    console.error('[Appointment] getAppointmentById error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function createAppointment(req, res) {
  try {
    const payload = { ...req.body };
    if (req.user.role === 'vet') {
      payload.vetId   = req.user.id;
      payload.vetName = payload.vetName || req.user.name;
    } else {
      payload.ownerId   = req.user.id;
      payload.ownerName = payload.ownerName || req.user.name;
    }

    // Reject appointments scheduled in the past (interpreting date+time as Israel wall-clock)
    if (payload.date && payload.time) {
      const { date: todayIL, minutes: nowMins } = nowInIsrael();
      const apptDate = String(payload.date).slice(0, 10);
      const apptMins = timeToMins(payload.time);
      const isPast = apptDate < todayIL || (apptDate === todayIL && apptMins <= nowMins);
      if (isPast) {
        return res.status(400).json({ message: 'Cannot book an appointment in the past.' });
      }
    }

    const appt = await Appointment.create(payload);
    console.log('[Appointment] created:', appt._id);

    // Notify the other party
    if (req.user.role === 'vet' && appt.ownerId) {
      await notifications.create({
        recipientId: appt.ownerId,
        type:        'appointment_booked_by_vet',
        params: {
          petName: appt.petName || '',
          date:    new Date(appt.date).toISOString().slice(0, 10),
          time:    appt.time || '',
        },
        link: '/my-appointments',
      });
    } else if (req.user.role === 'owner') {
      await notifyVets(appt, appt.ownerName || req.user.name || '');
    }

    res.status(201).json(appt);
  } catch (err) {
    console.error('[Appointment] createAppointment error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function updateAppointment(req, res) {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    res.json(appt);
  } catch (err) {
    console.error('[Appointment] updateAppointment error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function cancelAppointment(req, res) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    if (req.user.role === 'owner' && appt.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    appt.status = 'cancelled';
    await appt.save();

    // Notify the other party (in-app notification)
    const cancelParams = {
      petName: appt.petName || '',
      date:    new Date(appt.date).toISOString().slice(0, 10),
      time:    appt.time || '',
    };
    if (req.user.role === 'vet' && appt.ownerId) {
      await notifications.create({
        recipientId: appt.ownerId,
        type:        'appointment_cancelled_by_vet',
        params:      cancelParams,
        link:        '/my-appointments',
      });
    } else if (req.user.role === 'owner') {
      const targets = appt.vetId
        ? [{ _id: appt.vetId }]
        : await User.find({ role: 'vet' }).select('_id');
      await Promise.all(targets.map(v => notifications.create({
        recipientId: v._id,
        type:        'appointment_cancelled_by_owner',
        params:      { ...cancelParams, ownerName: appt.ownerName || req.user.name || '' },
        link:        '/schedule',
      })));
    }

    // Auto-notify the owner when a vet cancels
    if (req.user.role === 'vet' && appt.ownerId) {
      try {
        const dateStr = new Date(appt.date).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        });
        await Message.create({
          conversationId: makeConvId(req.user.id, appt.ownerId),
          senderId:       req.user.id,
          senderName:     req.user.name || 'Your Vet',
          receiverId:     appt.ownerId,
          receiverName:   appt.ownerName || 'Pet Owner',
          content: `Your appointment on ${dateStr} at ${appt.time} has been cancelled by the clinic. Please contact us to reschedule.`,
        });
      } catch (msgErr) {
        console.error('[Appointment] Failed to send cancellation notification:', msgErr.message);
      }
    }

    res.json(appt);
  } catch (err) {
    console.error('[Appointment] cancelAppointment error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

// ── getAvailableSlots ──────────────────────────────────────────────────────────
//
// Respects VetSchedule if vetId is supplied. Falls back to 08:00-18:00 Mon-Fri.
// Overlap condition: cur < apptEnd AND slotEnd > apptStart
//
async function getAvailableSlots(req, res) {
  try {
    const { date, duration = '30', vetId } = req.query;
    if (!date) return res.status(400).json({ message: 'date query param is required (YYYY-MM-DD).' });

    const slotDuration = Math.max(15, parseInt(duration, 10));

    const schedule    = vetId ? await VetSchedule.findOne({ vetId }) : null;
    const WORK_START  = timeToMins(schedule?.workStart ?? '08:00');
    const WORK_END    = timeToMins(schedule?.workEnd   ?? '18:00');
    const workingDays = schedule?.workingDays ?? [1, 2, 3, 4, 5];

    const requestedDay = new Date(date + 'T12:00:00Z').getDay();
    if (!workingDays.includes(requestedDay)) {
      return res.json({ date, duration: slotDuration, slots: [] });
    }

    // If the date is today (Israel), skip slots that have already started
    const { date: todayIL, minutes: currentMins } = nowInIsrael();
    const isToday = date === todayIL;

    const { start, end } = dayBounds(date);
    const bookedFilter = {
      date:   { $gte: start, $lte: end },
      status: { $nin: ['cancelled'] },
    };
    if (vetId) bookedFilter.vetId = vetId;
    const booked     = await Appointment.find(bookedFilter).select('time duration');
    const timeBlocks = vetId ? await TimeBlock.find({ vetId, date }).select('startTime endTime') : [];

    const STEP = 30;
    const slots = [];
    let cur = WORK_START;

    while (cur + slotDuration <= WORK_END) {
      const slotEnd = cur + slotDuration;
      const isPast = isToday && cur <= currentMins;
      const overlapsAppt = booked.some(appt => {
        const aStart = timeToMins(appt.time);
        const aEnd   = aStart + appt.duration;
        return cur < aEnd && slotEnd > aStart;
      });
      const overlapsBlock = timeBlocks.some(b => {
        const bStart = timeToMins(b.startTime);
        const bEnd   = timeToMins(b.endTime);
        return cur < bEnd && slotEnd > bStart;
      });
      if (!isPast && !overlapsAppt && !overlapsBlock) slots.push(minsToTime(cur));
      cur += STEP;
    }

    res.json({ date, duration: slotDuration, slots });
  } catch (err) {
    console.error('[Appointment] getAvailableSlots error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
};
