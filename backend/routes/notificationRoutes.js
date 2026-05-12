const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/notificationController');

router.get('/',              controller.list);
router.get('/unread-count',  controller.unreadCount);
router.patch('/read-all',    controller.markAllRead);
router.patch('/:id/read',    controller.markRead);
router.delete('/:id',        controller.remove);

module.exports = router;
