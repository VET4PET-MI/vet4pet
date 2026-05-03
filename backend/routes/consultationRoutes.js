const express         = require('express');
const router          = express.Router();
const { requireRole } = require('../middleware/auth');
const controller      = require('../controllers/consultationController');

// Special routes BEFORE /:id
router.get('/pending', controller.getPending);                          // both roles

router.get('/',             controller.getConsultations);               // both
router.post('/',            controller.createConsultation);             // both (owners request calls)
router.patch('/:id/status', requireRole('vet'), controller.updateStatus); // vet only: accept / end

module.exports = router;
