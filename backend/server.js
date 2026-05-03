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
app.use(cors());
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

// ── Global error handler ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

// ── Start ──────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    const server = app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
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
