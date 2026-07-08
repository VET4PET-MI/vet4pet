const jwt = require('jsonwebtoken');

// 8x8 JaaS (Jitsi as a Service) token-based joining.
//
// The public meet.jit.si now requires the first participant (the moderator) to sign in
// with Google/GitHub/Facebook, and Google blocks that OAuth flow inside an Android WebView
// (disallowed_useragent). JaaS replaces the interactive login with a signed JWT: the vet
// gets a moderator token, the owner a guest token, and the call joins directly — in a
// browser tab or an in-app WebView — with no Google sign-in.
//
// When the JaaS env vars are absent the app falls back to the legacy meet.jit.si URL, so
// nothing breaks before credentials are configured.

const JAAS_BASE = 'https://8x8.vc';
const TOKEN_TTL_SECONDS = 3 * 60 * 60; // 3 hours

function config() {
  const { JAAS_APP_ID, JAAS_KID, JAAS_PRIVATE_KEY } = process.env;
  if (!JAAS_APP_ID || !JAAS_KID || !JAAS_PRIVATE_KEY) return null;
  // JaaS expects the JWT header `kid` as "<AppID>/<KeyID>". Accept either the full value or
  // just the KeyID (prefix the AppID ourselves) so it's hard to misconfigure.
  const kid = JAAS_KID.includes('/') ? JAAS_KID : `${JAAS_APP_ID}/${JAAS_KID}`;
  return {
    appId: JAAS_APP_ID,
    kid,
    // Private keys are stored in env with literal "\n"; restore real newlines (as in fcm.js).
    privateKey: JAAS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn('[JaaS] JAAS_APP_ID / JAAS_KID / JAAS_PRIVATE_KEY missing — falling back to meet.jit.si (moderator must sign in with Google, which fails in the app WebView).');
}

// The room name is the last path segment of the stored meet.jit.si joinUrl (e.g.
// "Vet4Pet-<uuid>"), so the vet and owner always land in the same room. Falls back to the
// consultation id if no joinUrl was stored.
function roomName(consultation) {
  const stored = consultation.joinUrl;
  if (stored) {
    const segment = stored.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    if (segment) return segment;
  }
  return `Vet4Pet-${consultation._id}`;
}

function signToken(cfg, room, user, isModerator) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: cfg.appId,
    room,
    iat: now,
    nbf: now - 10,
    exp: now + TOKEN_TTL_SECONDS,
    context: {
      user: {
        id: String(user.id),
        name: user.name || 'User',
        email: user.email || '',
        avatar: '',
        moderator: isModerator ? 'true' : 'false',
      },
      features: {
        livestreaming: 'false',
        recording: 'false',
        transcription: 'false',
        'outbound-call': 'false',
      },
    },
  };
  return jwt.sign(payload, cfg.privateKey, {
    algorithm: 'RS256',
    header: { kid: cfg.kid, typ: 'JWT' },
  });
}

/**
 * Returns the join URL for a consultation tailored to the requesting user. Vets join as
 * moderator, owners as guests. Falls back to the stored meet.jit.si URL when JaaS is not
 * configured. `user` is the decoded app JWT ({ id, name, email, role }).
 */
function joinUrlFor(consultation, user) {
  const cfg = config();
  if (!cfg) {
    warnOnce();
    return consultation.joinUrl || null;
  }
  const room = roomName(consultation);
  const isModerator = user?.role === 'vet';
  const token = signToken(cfg, room, user || {}, isModerator);
  return `${JAAS_BASE}/${cfg.appId}/${encodeURIComponent(room)}?jwt=${token}`;
}

module.exports = { joinUrlFor };
