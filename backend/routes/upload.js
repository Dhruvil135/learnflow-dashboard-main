const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth'); // ✅ FIXED: Use authenticate
const { uploadProfile, deleteFromCloudinary } = require('../config/cloudinary');

// ===========================
// MULTER CONFIG FOR FILES
// ===========================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// ===========================
// UPLOAD MULTIPLE FILES (Lessons)
// ===========================
router.post('/files', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // ✅ Determine resource type
      let resourceType = 'raw'; // Default for documents
      if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      } else if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      }

      // ✅ Upload to Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: 'lesson-attachments',
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                originalName: file.originalname,
                name: file.originalname,
                fileType: file.mimetype,
                type: file.mimetype,
                size: file.size,
                resourceType: result.resource_type,
              });
            }
          }
        );

        uploadStream.end(file.buffer);
      });

      const uploadedFile = await uploadPromise;
      uploadedFiles.push(uploadedFile);
    }

    console.log('✅ Files uploaded:', uploadedFiles.length);

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload files', 
      error: error.message 
    });
  }
});

// ===========================
// UPLOAD SINGLE FILE (Backward compatibility)
// ===========================
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    let resourceType = 'raw';
    
    if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    }

    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'lesson-attachments',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    const result = await uploadPromise;

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      originalName: file.originalname,
      name: file.originalname,
      fileType: file.mimetype,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload file', 
      error: error.message 
    });
  }
});

// ===========================
// UPLOAD PROFILE PICTURE
// ===========================
router.post('/profile/:userId', uploadProfile.single('avatar'), catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  const user = await User.findById(req.params.userId);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Delete old avatar if exists
  if (user.profile?.avatarPublicId) {
    await deleteFromCloudinary(user.profile.avatarPublicId);
  }

  // Update user with new avatar
  user.profile.avatar = req.file.path; // Cloudinary URL
  user.profile.avatarPublicId = req.file.filename; // For deletion
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Profile picture uploaded successfully',
    data: {
      avatar: req.file.path,
      user: {
        id: user._id,
        username: user.username,
        profile: user.profile
      }
    }
  });
}));

// ===========================
// DELETE PROFILE PICTURE
// ===========================
router.delete('/profile/:userId', catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (!user.profile?.avatarPublicId) {
    return next(new AppError('No profile picture to delete', 400));
  }

  // Delete from Cloudinary
  await deleteFromCloudinary(user.profile.avatarPublicId);

  // Remove from user
  user.profile.avatar = null;
  user.profile.avatarPublicId = null;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Profile picture deleted successfully'
  });
}));

module.exports = router;
