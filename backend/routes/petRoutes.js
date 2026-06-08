const express          = require('express');
const router           = express.Router();
const { requireRole }  = require('../middleware/auth');
const controller       = require('../controllers/petController');
const upload           = require('../middleware/upload');

router.get('/',              controller.getPets);           // Vet: search all; Owner: auto-scoped in controller
router.get('/:id',           controller.getPetById);        // Both; owner ownership enforced in controller
router.post('/',             controller.addPet);            // Both; ownerId forced for owners in controller
router.put('/:id',           controller.updatePet);         // Both; ownership enforced in controller
router.patch('/:id/image',   controller.updatePetImage);    // Both; ownership enforced in controller
router.post('/:id/photo', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Pet] Photo upload middleware error:', err.message);
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, controller.uploadPetPhoto);
router.delete('/:id',        requireRole('owner'), controller.deletePet);

module.exports = router;
