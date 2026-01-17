/**
 * Multer configuration for handling file uploads
 * (product images, avatars, etc.)
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../utils/errors');

// Define upload directory
const uploadDir = process.env.UPLOAD_PATH || './uploads';

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine subdirectory based on file type
    let subDir = 'misc';
    
    if (file.fieldname === 'avatar') {
      subDir = 'avatars';
    } else if (file.fieldname === 'images' || file.fieldname === 'image') {
      subDir = 'products';
    } else if (file.fieldname === 'categoryImage') {
      subDir = 'categories';
    }
    
    cb(null, path.join(uploadDir, subDir));
  },
  
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
        400
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10 // Max 10 files per request
  }
});

// Export configured upload middlewares

// Single avatar upload
const uploadAvatar = upload.single('avatar');

// Single product image
const uploadProductImage = upload.single('image');

// Multiple product images (up to 5)
const uploadProductImages = upload.array('images', 5);

// Single category image
const uploadCategoryImage = upload.single('categoryImage');

// Handle multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 5MB.', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 10 files.', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field.', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
};

module.exports = {
  upload,
  uploadAvatar,
  uploadProductImage,
  uploadProductImages,
  uploadCategoryImage,
  handleUploadError
};
