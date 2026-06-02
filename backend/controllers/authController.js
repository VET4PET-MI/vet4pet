const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { isValidIsraeliId } = require('../utils/israeliId');

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sanitize(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

async function register(req, res) {
  try {
    const { name, email, password, role, nationalId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const userRole = role || 'owner';

    // Owners must supply a valid national ID; vets ignore it.
    let normalizedId;
    if (userRole === 'owner') {
      normalizedId = isValidIsraeliId(nationalId);
      if (!normalizedId) {
        return res.status(400).json({ message: 'A valid national ID is required.' });
      }
      if (await User.findOne({ nationalId: normalizedId })) {
        return res.status(409).json({ message: 'National ID already registered.' });
      }
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({
      name,
      email,
      password: hashed,
      role: userRole,
      ...(normalizedId && { nationalId: normalizedId }),
    });
    console.log('[Auth] registered:', user.email, 'role:', user.role);
    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    console.log('[Auth] login:', user.email, 'role:', user.role);
    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    console.error('[Auth] login error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { register, login };
