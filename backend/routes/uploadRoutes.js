const express         = require('express');
const router          = express.Router();
const { requireRole } = require('../middleware/auth');
const upload          = require('../middleware/upload');

router.post('/', requireRole('vet'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file received.' });
  res.json({
    url:          req.file.path,
    originalName: req.file.originalname,
    mimetype:     req.file.mimetype,
    size:         req.file.size,
  });
});

module.exports = router;
