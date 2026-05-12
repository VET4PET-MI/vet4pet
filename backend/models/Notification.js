const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Stable type key — frontend uses this to look up the translated string.
    type:        { type: String, required: true },
    // Free-form params interpolated into the translation (e.g. { petName, date, time }).
    params:      { type: Object, default: {} },
    // Where to navigate when the user clicks the notification.
    link:        { type: String, default: null },
    read:        { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
