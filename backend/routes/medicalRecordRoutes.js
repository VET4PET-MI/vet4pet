const express         = require('express');
const router          = express.Router();
const { requireRole } = require('../middleware/auth');
const controller      = require('../controllers/medicalRecordController');

// GET routes: accessible to both roles
router.get('/pet/:petId', controller.getRecordsByPet);
router.get('/:id',        controller.getRecordById);

// Write routes: vets only
router.post('/',      requireRole('vet'), controller.addRecord);
router.put('/:id',    requireRole('vet'), controller.updateRecord);
router.delete('/:id', requireRole('vet'), controller.deleteRecord);

module.exports = router;
