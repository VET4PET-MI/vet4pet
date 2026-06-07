const express         = require('express');
const router          = express.Router();
const { requireRole } = require('../middleware/auth');
const controller      = require('../controllers/appointmentController');

// Special routes BEFORE /:id to avoid param collision
router.get('/available-slots', controller.getAvailableSlots);  // both roles

router.get('/',             controller.getAppointments);        // both; owner-scoped in controller
router.get('/:id',          controller.getAppointmentById);     // both
router.post('/',            controller.createAppointment);      // both; role-aware in controller
router.put('/:id',          requireRole('vet'), controller.updateAppointment);
router.patch('/:id/cancel',     controller.cancelAppointment);      // both; ownership check in controller
router.patch('/:id/reschedule', controller.rescheduleAppointment);  // both; ownership check in controller

module.exports = router;
