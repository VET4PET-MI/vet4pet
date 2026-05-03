const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/messageController');

// Special routes BEFORE /:id
router.get('/conversations',             controller.getConversations);
router.get('/unread-count',              controller.getUnreadCount);
router.put('/conversation/:otherId/read', controller.markConversationRead);

router.get('/',      controller.getMessages);
router.post('/',     controller.sendMessage);
router.put('/:id',   controller.markRead);

module.exports = router;
