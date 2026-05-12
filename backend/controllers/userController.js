const User = require('../models/User');

async function getVets(req, res) {
  try {
    const vets = await User.find({ role: 'vet' })
      .select('_id name email clinicName address phone isOnCall')
      .lean();
    res.json(vets);
  } catch (err) {
    console.error('[User] getVets error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

// Haversine distance in kilometers
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function getNearbyVets(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const onCallOnly = req.query.onCall === 'true';

    const filter = {
      role: 'vet',
      lat: { $ne: null },
      lng: { $ne: null },
    };
    if (onCallOnly) filter.isOnCall = true;

    let vets = await User.find(filter)
      .select('_id name clinicName address phone lat lng isOnCall')
      .lean();

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      vets = vets
        .map(v => ({ ...v, distanceKm: haversineKm(lat, lng, v.lat, v.lng) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.json(vets);
  } catch (err) {
    console.error('[User] getNearbyVets error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function updateMe(req, res) {
  try {
    const allowed = ['name', 'clinicName', 'address', 'phone', 'lat', 'lng', 'isOnCall'];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];

    const updated = await User.findByIdAndUpdate(req.user.id, update, {
      new: true, runValidators: true,
    }).select('-password');

    if (!updated) return res.status(404).json({ message: 'User not found.' });
    res.json(updated);
  } catch (err) {
    console.error('[User] updateMe error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getMe(req, res) {
  try {
    const me = await User.findById(req.user.id).select('-password');
    if (!me) return res.status(404).json({ message: 'User not found.' });
    res.json(me);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getVets, getNearbyVets, updateMe, getMe };
