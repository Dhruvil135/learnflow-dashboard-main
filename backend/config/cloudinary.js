const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ===========================
// PROFILE PICTURE UPLOAD (Images Only)
// ===========================
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'skillforge/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'fill' }]
  }
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for profile pictures
  }
});

// ===========================
// LESSON MATERIALS UPLOAD (All File Types)
// ===========================
const lessonStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine resource type based on mimetype
    let resourceType = 'auto'; // Cloudinary auto-detects
    let folder = 'skillforge/lessons';

    if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
      folder = 'skillforge/lessons/videos';
    } else if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
      folder = 'skillforge/lessons/images';
    } else {
      resourceType = 'raw'; // For PDFs, documents, etc.
      folder = 'skillforge/lessons/documents';
    }

    return {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: [
        // Videos
        'mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv',
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        // Documents
        'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt',
        // Archives
        'zip', 'rar'
      ]
    };
  }
});

const uploadLessonMaterial = multer({
  storage: lessonStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for lesson materials
  },
  fileFilter: (req, file, cb) => {
    // Accept all common file types
    const allowedMimes = [
      // Videos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      'video/x-matroska',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Archives
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported. Please upload videos, images, PDFs, or documents.`));
    }
  }
});

// ===========================
// COURSE THUMBNAIL UPLOAD (Images Only)
// ===========================
const courseThumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'skillforge/courses/thumbnails',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'fill' }]
  }
});

const uploadCourseThumbnail = multer({
  storage: courseThumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// ===========================
// DELETE FROM CLOUDINARY
// ===========================
const deleteFromCloudinary = async (publicId) => {
  try {
    // Try to delete as image first
    let result = await cloudinary.uploader.destroy(publicId);
    
    // If not found as image, try as video
    if (result.result === 'not found') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }
    
    // If still not found, try as raw (documents)
    if (result.result === 'not found') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadProfile,
  uploadLessonMaterial,
  uploadCourseThumbnail,
  deleteFromCloudinary
};
