const multer              = require('multer');
const path                = require('path');
const { v2: cloudinary }  = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_EXT  = /\.(pdf|jpg|jpeg|png|gif|webp|heic|heif)$/i;
const ALLOWED_MIME = /^(application\/pdf|image\/(jpeg|jpg|png|gif|webp|heic|heif))$/;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext     = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isPdf   = file.mimetype === 'application/pdf';
    return {
      folder:        'vet4pet',
      resource_type: isPdf ? 'raw' : 'image',
      format:        ext,
      public_id:     `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
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
