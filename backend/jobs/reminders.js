const cron        = require('node-cron');
const Appointment = require('../models/Appointment');
const Pet         = require('../models/Pet');
const User        = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const notifications = require('../controllers/notificationController');

// Build [start, end] ISO bounds for a single calendar day in local time.
function dayBounds(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ── Appointment reminders ─────────────────────────────────────────────────────
//
// Runs daily and notifies the owner about every appointment scheduled for
// tomorrow (and still active). Idempotent on retries — duplicate notifications
// are tolerated since users can mark all as read.
async function sendAppointmentReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start, end } = dayBounds(tomorrow);

    const appts = await Appointment.find({
      date:   { $gte: start, $lte: end },
      status: { $nin: ['cancelled', 'completed'] },
    });

    let sent = 0;
    for (const appt of appts) {
      const params = {
        petName: appt.petName || '',
        date:    new Date(appt.date).toISOString().slice(0, 10),
        time:    appt.time || '',
      };
      if (appt.ownerId) {
        await notifications.create({
          recipientId: appt.ownerId,
          type:        'appointment_reminder',
          params,
          link:        '/my-appointments',
        });
        sent++;
      }
      if (appt.vetId) {
        await notifications.create({
          recipientId: appt.vetId,
          type:        'appointment_reminder_vet',
          params: { ...params, ownerName: appt.ownerName || '' },
          link:        '/schedule',
        });
        sent++;
      }
    }
    console.log(`[Reminders] appointment reminders sent: ${sent} (for ${appts.length} appointments tomorrow)`);
  } catch (err) {
    console.error('[Reminders] appointment reminders failed:', err.message);
  }
}

// ── Vaccination reminders ─────────────────────────────────────────────────────
//
// A pet is "due" for a vaccination booster if its most recent VACCINATION
// record is older than 11 months. Notifies the owner once a month per pet.
const VACCINATION_INTERVAL_MS = 11 * 30 * 24 * 60 * 60 * 1000;

async function sendVaccinationReminders() {
  try {
    const pets = await Pet.find({});
    let sent = 0;

    for (const pet of pets) {
      const lastVax = await MedicalRecord.findOne({
        petId: pet._id,
        type:  'VACCINATION',
      }).sort({ date: -1 });

      // No vaccination record at all — skip (might be a new pet)
      if (!lastVax) continue;
      const age = Date.now() - new Date(lastVax.date).getTime();
      if (age < VACCINATION_INTERVAL_MS) continue;

      if (pet.ownerId) {
        await notifications.create({
          recipientId: pet.ownerId,
          type:        'vaccination_reminder',
          params: {
            petName: pet.name || '',
            months:  Math.floor(age / (30 * 24 * 60 * 60 * 1000)),
          },
          link: `/pet/${pet._id}`,
        });
        sent++;
      }
    }
    console.log(`[Reminders] vaccination reminders sent: ${sent}`);
  } catch (err) {
    console.error('[Reminders] vaccination reminders failed:', err.message);
  }
}

// Combined daily job, exposed for manual triggering during testing.
async function runAll() {
  console.log('[Reminders] daily job started at', new Date().toISOString());
  await sendAppointmentReminders();
  await sendVaccinationReminders();
  console.log('[Reminders] daily job finished');
}

// Schedule: every day at 09:00 server-local time.
function startReminderJobs() {
  cron.schedule('0 9 * * *', runAll, { timezone: 'Asia/Jerusalem' });
  console.log('[Reminders] cron registered — daily at 09:00 Asia/Jerusalem');
}

module.exports = { startReminderJobs, runAll };
