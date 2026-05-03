const User = require('../models/User');

async function getVets(req, res) {
  try {
    const vets = await User.find({ role: 'vet' }).select('_id name email').lean();
    res.json(vets);
  } catch (err) {
    console.error('[User] getVets error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getVets };
