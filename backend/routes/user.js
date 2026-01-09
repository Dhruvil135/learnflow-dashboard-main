const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadProfile, deleteFromCloudinary } = require('../config/cloudinary');

// ===========================
// GET CURRENT USER PROFILE
// ===========================
router.get('/profile', authenticate, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select('-password')
    .populate('enrolledCourses')
    .populate('certificates');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        enrolledCourses: user.enrolledCourses,
        certificates: user.certificates,
        progress: user.progress,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    }
  });
}));

// ===========================
// UPDATE CURRENT USER PROFILE
// ===========================
router.put('/profile', authenticate, catchAsync(async (req, res, next) => {
  const { profile } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Update profile fields
  if (profile) {
    if (profile.firstName !== undefined) {
      user.profile.firstName = profile.firstName;
    }
    if (profile.lastName !== undefined) {
      user.profile.lastName = profile.lastName;
    }
    if (profile.avatar !== undefined) {
      user.profile.avatar = profile.avatar;
    }
  }

  user.updatedAt = Date.now();
  
  await user.save();

  // Log activity
  try {
    await logActivity(user._id, 'profile_update', 'user', user._id, { profile }, req);
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  res.json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt
      }
    }
  });
}));

// ===========================
// UPLOAD PROFILE PHOTO
// ===========================
router.post('/profile/avatar', authenticate, uploadProfile.single('avatar'), catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Delete old avatar if exists
  if (user.profile?.avatarPublicId) {
    try {
      await deleteFromCloudinary(user.profile.avatarPublicId);
    } catch (error) {
      console.error('Failed to delete old avatar:', error);
    }
  }

  // Update user with new avatar
  user.profile.avatar = req.file.path;
  user.profile.avatarPublicId = req.file.filename;
  user.updatedAt = Date.now();

  await user.save();

  res.json({
    status: 'success',
    message: 'Profile photo uploaded successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt
      }
    }
  });
}));

// ===========================
// DELETE PROFILE PHOTO
// ===========================
router.delete('/profile/avatar', authenticate, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (!user.profile?.avatar) {
    return next(new AppError('No profile photo to remove', 400));
  }

  // Delete from Cloudinary
  if (user.profile.avatarPublicId) {
    try {
      await deleteFromCloudinary(user.profile.avatarPublicId);
    } catch (error) {
      console.error('Failed to delete avatar from Cloudinary:', error);
    }
  }

  // Remove from user profile
  user.profile.avatar = undefined;
  user.profile.avatarPublicId = undefined;
  user.updatedAt = Date.now();

  await user.save();

  res.json({
    status: 'success',
    message: 'Profile photo removed successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt
      }
    }
  });
}));

// ===========================
// GET ENROLLED COURSES
// ===========================
router.get('/me/enrollments', authenticate, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'enrolledCourses',
      populate: {
        path: 'instructor',
        select: 'username email profile'
      }
    });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    status: 'success',
    results: user.enrolledCourses.length,
    data: {
      courses: user.enrolledCourses
    }
  });
}));

// ===========================
// GET COURSE PROGRESS
// ===========================
router.get('/me/progress/:courseId', authenticate, catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if enrolled
  if (!user.enrolledCourses.includes(courseId)) {
    return next(new AppError('You are not enrolled in this course', 403));
  }

  // Get course progress
  const progress = user.progress.find(
    p => p.course.toString() === courseId
  );

  // Get total lessons in course
  const Lesson = require('../models/Lesson');
  const totalLessons = await Lesson.countDocuments({ course: courseId });

  const completedCount = progress?.completedLessons?.length || 0;
  const progressPercentage = totalLessons > 0 
    ? Math.round((completedCount / totalLessons) * 100) 
    : 0;

  res.json({
    status: 'success',
    data: {
      courseId,
      totalLessons,
      completedCount,
      progressPercentage,
      completedLessons: progress?.completedLessons || [],
      lastAccessedAt: progress?.lastAccessedAt,
      isCompleted: progressPercentage === 100
    }
  });
}));

// ===========================
// GET USER ACTIVITY LOGS
// ===========================
router.get('/activity', authenticate, catchAsync(async (req, res) => {
  const activities = await ActivityLog.find({ user: req.user.id })
    .sort({ timestamp: -1 })
    .limit(20);

  res.json({
    status: 'success',
    results: activities.length,
    data: { activities }
  });
}));

// ===========================
// TEST ROUTES
// ===========================
router.post('/test-activity', catchAsync(async (req, res) => {
  console.log('🔍 Testing activity logging with helper function...');
  
  try {
    const log = await logActivity(
      '507f1f77bcf86cd799439011',
      'login',
      'user',
      '507f1f77bcf86cd799439011',
      { message: 'Test login from Postman', testNumber: Math.random() },
      req
    );
    
    console.log('✅ Activity logged successfully:', log._id);
    
    res.json({ 
      status: 'success',
      message: 'Activity logged successfully',
      data: { 
        logId: log._id,
        action: log.action,
        timestamp: log.timestamp
      }
    });
  } catch (error) {
    console.error('❌ Activity logging error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.toString()
    });
  }
}));

router.post('/test-activity-direct', catchAsync(async (req, res) => {
  console.log('🔍 Testing direct ActivityLog creation...');
  
  try {
    const log = await ActivityLog.create({
      user: '507f1f77bcf86cd799439011',
      action: 'login',
      entityType: 'user',
      entityId: '507f1f77bcf86cd799439011',
      details: { 
        test: 'Direct creation',
        timestamp: new Date().toISOString(),
        requestTime: Date.now()
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      timestamp: new Date()
    });
    
    console.log('✅ Direct creation successful:', log._id);
    
    res.json({ 
      status: 'success',
      message: 'Activity logged directly',
      data: { log }
    });
  } catch (error) {
    console.error('❌ Direct creation error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}));

router.get('/test-activity-logs', catchAsync(async (req, res) => {
  console.log('🔍 Fetching all activity logs...');
  
  const logs = await ActivityLog.find()
    .sort({ timestamp: -1 })
    .limit(20);
  
  console.log(`✅ Found ${logs.length} activity logs`);
  
  res.json({
    status: 'success',
    results: logs.length,
    data: { logs }
  });
}));

// ===========================
// GET ALL USERS
// ===========================
router.get('/', catchAsync(async (req, res) => {
  const users = await User.find().select('-password');
  
  res.json({
    status: 'success',
    results: users.length,
    data: { users }
  });
}));

// ===========================
// GET SINGLE USER BY ID
// ===========================
router.get('/:id', catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('enrolledCourses')
    .populate('certificates');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.json({
    status: 'success',
    data: { user }
  });
}));

// ===========================
// UPDATE USER BY ID
// ===========================
router.patch('/:id', catchAsync(async (req, res, next) => {
  const { password, role, ...updateData } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.json({
    status: 'success',
    data: { user }
  });
}));

// ===========================
// DELETE USER
// ===========================
router.delete('/:id', catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
}));

module.exports = router;
