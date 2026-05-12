const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/userController');

router.get('/vets',         controller.getVets);
router.get('/vets/nearby',  controller.getNearbyVets);
router.get('/me',           controller.getMe);
router.patch('/me',         controller.updateMe);

module.exports = router;
