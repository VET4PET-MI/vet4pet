const express    = require('express');
const router     = express.Router();
const { requireRole } = require('../middleware/auth');
const controller = require('../controllers/vetScheduleController');

router.get('/', requireRole('vet'), controller.getMySchedule);
router.put('/', requireRole('vet'), controller.upsertMySchedule);

module.exports = router;
