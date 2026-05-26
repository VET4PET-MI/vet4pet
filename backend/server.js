const express         = require('express');
const cors            = require('cors');
const dotenv          = require('dotenv');
const path            = require('path');
const fs              = require('fs');
const connectDB       = require('./config/db');
const { requireAuth } = require('./middleware/auth');

dotenv.config();

// Ensure uploads directory exists on startup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────
// In production set CLIENT_ORIGIN to lock CORS to the deployed frontend.
// In dev (no env var) we allow any origin.
app.use(cors(process.env.CLIENT_ORIGIN
  ? { origin: process.env.CLIENT_ORIGIN, credentials: true }
  : {}));
app.use(express.json());

// ── Static file serving for uploads ───────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Routes ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         requireAuth, require('./routes/userRoutes'));
app.use('/api/pets',          requireAuth, require('./routes/petRoutes'));
app.use('/api/records',       requireAuth, require('./routes/medicalRecordRoutes'));
app.use('/api/upload',        requireAuth, require('./routes/uploadRoutes'));
app.use('/api/appointments',  requireAuth, require('./routes/appointmentRoutes'));
app.use('/api/messages',      requireAuth, require('./routes/messageRoutes'));
app.use('/api/consultations', requireAuth, require('./routes/consultationRoutes'));
app.use('/api/vet-schedule',  requireAuth, require('./routes/vetScheduleRoutes'));
app.use('/api/time-blocks',   requireAuth, require('./routes/timeBlockRoutes'));
app.use('/api/notifications', requireAuth, require('./routes/notificationRoutes'));

// ── Global error handler ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

// ── Start ──────────────────────────────────────────────────────────────
const { startReminderJobs, runAll: runRemindersNow } = require('./jobs/reminders');

// Dev-only: allow a manually-authenticated call to trigger reminders now.
app.post('/api/admin/run-reminders', requireAuth, async (req, res) => {
  if (req.user.role !== 'vet') return res.status(403).json({ message: 'Forbidden.' });
  await runRemindersNow();
  res.json({ ok: true });
});

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
    startReminderJobs();
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[ERROR] Port ${PORT} is already in use.\nKill the old process first:\n  Windows: taskkill /F /IM node.exe\n  Mac/Linux: pkill -f "node server"\nThen restart: npm start\n`);
      } else {
        console.error('[ERROR] Server failed to start:', err.message);
      }
      process.exit(1);
    });
  })
  .catch(err => { console.error('DB connection failed:', err.message); process.exit(1); });
