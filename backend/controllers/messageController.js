const Message       = require('../models/Message');
const notifications = require('./notificationController');

function makeConvId(a, b) {
  return [a, b].sort().join('::');
}

async function getConversations(req, res) {
  try {
    const userId = req.user.id;
    const convos = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort:  { createdAt: -1 } },
      {
        $group: {
          _id:         '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$read', false] }] },
                1, 0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);
    res.json(convos);
  } catch (err) {
    console.error('[Message] getConversations error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getMessages(req, res) {
  try {
    const userId  = req.user.id;
    const otherId = req.query.withUser;
    if (!otherId) return res.status(400).json({ message: 'withUser query param is required.' });
    const convId   = makeConvId(userId, otherId);
    const messages = await Message.find({ conversationId: convId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('[Message] getMessages error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function sendMessage(req, res) {
  try {
    const { receiverId, receiverName, content } = req.body;
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required.' });
    }
    const msg = await Message.create({
      conversationId: makeConvId(req.user.id, receiverId),
      senderId:       req.user.id,
      senderName:     req.user.name,
      receiverId,
      receiverName:   receiverName || receiverId,
      content:        content.trim(),
    });

    await notifications.create({
      recipientId: receiverId,
      type:        'message_received',
      params:      { senderName: req.user.name || '' },
      link:        '/messages',
    });

    res.status(201).json(msg);
  } catch (err) {
    console.error('[Message] sendMessage error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function markRead(req, res) {
  try {
    const userId = req.user.id;
    await Message.updateMany(
      { _id: req.params.id, receiverId: userId },
      { read: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Message] markRead error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const count  = await Message.countDocuments({ receiverId: userId, read: false });
    res.json({ count });
  } catch (err) {
    console.error('[Message] getUnreadCount error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function markConversationRead(req, res) {
  try {
    const userId  = req.user.id;
    const otherId = req.params.otherId;
    await Message.updateMany(
      { conversationId: makeConvId(userId, otherId), receiverId: userId, read: false },
      { read: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Message] markConversationRead error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markRead,
  getUnreadCount,
  markConversationRead,
};
