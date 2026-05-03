const express          = require('express');
const router           = express.Router();
const { requireRole }  = require('../middleware/auth');
const controller       = require('../controllers/petController');

router.get('/',       controller.getPets);           // Vet: search all; Owner: auto-scoped in controller
router.get('/:id',    controller.getPetById);         // Both; owner ownership enforced in controller
router.post('/',      controller.addPet);             // Both; ownerId forced for owners in controller
router.put('/:id',    requireRole('vet'), controller.updatePet);
router.delete('/:id', requireRole('vet'), controller.deletePet);

module.exports = router;
