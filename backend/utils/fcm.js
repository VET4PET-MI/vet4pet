const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[FCM] Firebase env vars missing — push notifications disabled.');
    console.warn('[FCM] Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to .env');
    return;
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
    console.log('[FCM] Firebase initialized ✓');
  } catch (err) {
    console.error('[FCM] Firebase init failed:', err.message);
  }
}

// Hebrew push notification content per notification type
const PUSH_CONTENT = {
  appointment_booked_by_owner:    { title: 'תור חדש 📅',           body: p => `${p.ownerName} קבע תור ל-${p.petName}` },
  appointment_booked_by_vet:      { title: 'תור נקבע 📅',           body: p => `תור ל-${p.petName} ב-${p.date} שעה ${p.time}` },
  appointment_cancelled_by_vet:   { title: 'תור בוטל ❌',           body: p => `התור ל-${p.petName} בוטל` },
  appointment_cancelled_by_owner: { title: 'תור בוטל ❌',           body: p => `${p.ownerName} ביטל את התור של ${p.petName}` },
  appointment_reminder:           { title: 'תזכורת תור מחר 🐾',    body: p => `תור ל-${p.petName} מחר ב-${p.time}` },
  appointment_reminder_vet:       { title: 'תזכורת תור מחר 📋',    body: p => `תור של ${p.ownerName} ל-${p.petName} מחר ב-${p.time}` },
  consultation_requested:         { title: 'בקשת ייעוץ חדשה 💬',  body: p => `${p.ownerName} מבקש ייעוץ` },
  consultation_active:            { title: 'ייעוץ אושר ✅',         body: _p => 'בקשת הייעוץ שלך אושרה — אפשר להתחיל לשוחח' },
  vaccination_reminder:           { title: 'תזכורת חיסון 💉',      body: p => `הגיע הזמן לחסן את ${p.petName}` },
  message_received:               { title: 'הודעה חדשה 💬',        body: p => `${p.senderName} שלח לך הודעה` },
};

async function sendPush(fcmToken, type, params = {}, link = null) {
  if (!initialized || !fcmToken) return;
  const content = PUSH_CONTENT[type];
  if (!content) return;

  let body;
  try { body = content.body(params); } catch { body = content.title; }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title: content.title, body },
      data: { type, link: link || '' },
      android: {
        priority: 'high',
        notification: { channelId: 'vet4pet_main', sound: 'default' },
      },
    });
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      // Token expired — harmless, user will refresh on next login
      console.warn('[FCM] Stale token for type:', type);
    } else {
      console.error('[FCM] sendPush failed:', err.message);
    }
  }
}

module.exports = { initFirebase, sendPush };
