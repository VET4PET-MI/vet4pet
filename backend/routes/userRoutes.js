const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/userController');

// GET /api/users/vets — list all vets (used by owners to start a conversation)
router.get('/vets', controller.getVets);

module.exports = router;
