const express         = require('express');
const router          = express.Router();
const { requireRole } = require('../middleware/auth');
const controller      = require('../controllers/timeBlockController');

// All time-block routes are vet-only
router.get('/',      requireRole('vet'), controller.getBlocks);
router.post('/',     requireRole('vet'), controller.createBlock);
router.delete('/:id',requireRole('vet'), controller.deleteBlock);

module.exports = router;
