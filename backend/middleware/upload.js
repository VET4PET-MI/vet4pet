const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');

const ALLOWED_EXT  = /\.(pdf|jpg|jpeg|png|gif|webp)$/i;
const ALLOWED_MIME = /^(application\/pdf|image\/(jpeg|png|gif|webp))$/;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, unique + ext);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_EXT.test(file.originalname) && ALLOWED_MIME.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, PNG, GIF, or WEBP files are allowed.'));
  }
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
