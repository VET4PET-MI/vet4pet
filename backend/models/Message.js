const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId:       { type: String, required: true },
    senderName:     { type: String },
    receiverId:     { type: String, required: true },
    receiverName:   { type: String },
    content:        { type: String, required: true, trim: true },
    read:           { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
