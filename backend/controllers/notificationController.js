const Notification = require('../models/Notification');
const User         = require('../models/User');
const { sendPush } = require('../utils/fcm');

async function list(req, res) {
  try {
    const items = await Notification.find({ recipientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function unreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({ recipientId: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function markRead(req, res) {
  try {
    const doc = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Notification not found.' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ recipientId: req.user.id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const doc = await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Helper used by other controllers — fire-and-forget so business flow doesn't fail
// if notification creation fails.
async function create({ recipientId, type, params = {}, link = null }) {
  if (!recipientId) return null;
  try {
    const notification = await Notification.create({ recipientId, type, params, link });
    // Fire-and-forget push notification
    User.findById(recipientId).select('fcmToken').then(user => {
      if (user?.fcmToken) sendPush(user.fcmToken, type, params, link);
    }).catch(() => {});
    return notification;
  } catch (err) {
    console.error('[Notification] create failed:', err.message);
    return null;
  }
}

module.exports = { list, unreadCount, markRead, markAllRead, remove, create };
