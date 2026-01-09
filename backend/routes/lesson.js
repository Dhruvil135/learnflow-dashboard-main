const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const User = require('../models/User');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { uploadLessonMaterial, deleteFromCloudinary } = require('../config/cloudinary');
const { logActivity } = require('../utils/activityLogger');
const { authenticateToken } = require('../middleware/auth');


// Helper function to check role
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};


// ===========================
// GET ALL LESSONS (for a course)
// ===========================
router.get('/', catchAsync(async (req, res) => {
  const { courseId } = req.query;
  
  const filter = {};
  if (courseId) filter.course = courseId;


  const lessons = await Lesson.find(filter)
    .populate('course', 'title instructor')
    .sort({ order: 1 });


  res.status(200).json({
    status: 'success',
    results: lessons.length,
    data: { lessons }
  });
}));


// ===========================
// GET SINGLE LESSON
// ===========================
router.get('/:id', catchAsync(async (req, res, next) => {
  const lesson = await Lesson.findById(req.params.id)
    .populate('course', 'title instructor');


  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }


  res.status(200).json({
    status: 'success',
    data: { lesson }
  });
}));


// ===========================
// CREATE LESSON (with file attachments)
// ===========================
router.post(
  '/',
  authenticateToken,
  roleCheck('instructor', 'admin'),
  uploadLessonMaterial.array('attachments', 5), 
  catchAsync(async (req, res, next) => {
    console.log('📥 Received lesson create request');
    console.log('📦 Body:', req.body);
    console.log('📎 Files:', req.files?.length || 0);


    const { title, description, content, estimatedDuration, order, course } = req.body;


    // Validation
    if (!title || !description || !course) {
      return next(new AppError('Title, description, and course ID are required', 400));
    }


    // Check if course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return next(new AppError('Course not found', 404));
    }


    // Check if user owns the course (or is admin)
    if (courseDoc.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to add lessons to this course', 403));
    }


    // Determine contentType based on attachments
    let contentType = 'text'; // Default if no attachments
    
    if (req.files && req.files.length > 0) {
      const hasVideo = req.files.some(file => file.mimetype.startsWith('video/'));
      const hasDocument = req.files.some(file => 
        file.mimetype.includes('pdf') || 
        file.mimetype.includes('document') || 
        file.mimetype.includes('presentation')
      );
      
      if (hasVideo && hasDocument) {
        contentType = 'mixed';
      } else if (hasVideo) {
        contentType = 'video';
      } else {
        contentType = 'text';
      }
    }


    console.log('🎯 Content type determined:', contentType);


    // Prepare lesson data
    const lessonData = {
      title,
      description,
      content: content || '',
      estimatedDuration: parseInt(estimatedDuration) || 15,
      order: parseInt(order) || 1,
      course: course,
      contentType: contentType
    };


    // Add file attachments if uploaded
    if (req.files && req.files.length > 0) {
      lessonData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: file.path,
        publicId: file.filename,
        fileType: file.mimetype,
        size: file.size
      }));


      console.log('✅ Attachments processed:', lessonData.attachments.length);
    }


    // Create lesson
    const lesson = await Lesson.create(lessonData);


    // Add lesson to course
    courseDoc.lessons.push(lesson._id);
    await courseDoc.save();


    console.log('✅ Lesson created successfully:', lesson._id);


    // Log activity
    try {
      await logActivity(
        req.user.id,
        'lesson_created',
        'lesson',
        lesson._id,
        { lessonTitle: lesson.title, courseId: courseDoc._id },
        req
      );
    } catch (logError) {
      console.error('⚠️ Activity logging failed:', logError.message);
    }


    res.status(201).json({
      status: 'success',
      message: 'Lesson created successfully',
      data: { lesson }
    });
  })
);


// ===========================
// UPDATE LESSON
// ===========================
router.patch(
  '/:id',
  authenticateToken,
  roleCheck('instructor', 'admin'),
  uploadLessonMaterial.array('attachments', 5),
  catchAsync(async (req, res, next) => {
    let lesson = await Lesson.findById(req.params.id).populate('course');
    
    if (!lesson) {
      return next(new AppError('Lesson not found', 404));
    }


    // Check ownership
    if (lesson.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to update this lesson', 403));
    }


    // If new files uploaded, add to existing attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: file.path,
        publicId: file.filename,
        fileType: file.mimetype,
        size: file.size
      }));


      req.body.attachments = [...(lesson.attachments || []), ...newAttachments];
      
      // Update contentType if adding new files
      const allFiles = [...(lesson.attachments || []), ...req.files];
      const hasVideo = allFiles.some(file => 
        (file.fileType || file.mimetype)?.startsWith('video/')
      );
      const hasDocument = allFiles.some(file => {
        const type = file.fileType || file.mimetype;
        return type?.includes('pdf') || type?.includes('document') || type?.includes('presentation');
      });
      
      if (hasVideo && hasDocument) {
        req.body.contentType = 'mixed';
      } else if (hasVideo) {
        req.body.contentType = 'video';
      }
    }


    lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('course', 'title');


    res.status(200).json({
      status: 'success',
      data: { lesson }
    });
  })
);


// ===========================
// DELETE SPECIFIC ATTACHMENT
// ===========================
router.delete(
  '/:id/attachments/:attachmentId',
  authenticateToken,
  roleCheck('instructor', 'admin'),
  catchAsync(async (req, res, next) => {
    const lesson = await Lesson.findById(req.params.id).populate('course');
    
    if (!lesson) {
      return next(new AppError('Lesson not found', 404));
    }


    // Check ownership
    if (lesson.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to modify this lesson', 403));
    }


    const attachment = lesson.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      return next(new AppError('Attachment not found', 404));
    }


    // Delete from Cloudinary
    await deleteFromCloudinary(attachment.publicId);


    // Remove from lesson
    attachment.remove();
    await lesson.save();


    res.status(200).json({
      status: 'success',
      message: 'Attachment deleted successfully',
      data: { lesson }
    });
  })
);


// ===========================
// DELETE LESSON
// ===========================
router.delete(
  '/:id',
  authenticateToken,
  roleCheck('instructor', 'admin'),
  catchAsync(async (req, res, next) => {
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
      return next(new AppError('Lesson not found', 404));
    }


    // Get the course to check ownership
    const course = await Course.findById(lesson.course);
    
    if (!course) {
      return next(new AppError('Course not found', 404));
    }


    // Check if user owns the course
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to delete this lesson', 403));
    }


    // Delete all attachments from Cloudinary
    if (lesson.attachments && lesson.attachments.length > 0) {
      console.log(`🗑️ Deleting ${lesson.attachments.length} attachments from Cloudinary`);
      for (const attachment of lesson.attachments) {
        try {
          await deleteFromCloudinary(attachment.publicId);
          console.log(`✅ Deleted attachment: ${attachment.name}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${attachment.name}:`, error.message);
        }
      }
    }


    // Remove lesson from course's lessons array
    await Course.findByIdAndUpdate(lesson.course, {
      $pull: { lessons: lesson._id }
    });


    console.log(`✅ Removed lesson from course: ${lesson.course}`);


    // Delete the lesson document
    await Lesson.findByIdAndDelete(req.params.id);


    console.log(`✅ Lesson deleted successfully: ${lesson._id}`);


    res.status(200).json({
      status: 'success',
      message: 'Lesson deleted successfully',
      data: null
    });
  })
);


// ===========================
// MARK LESSON AS COMPLETED
// ===========================
router.post('/:id/complete', authenticateToken, catchAsync(async (req, res, next) => {
  const lessonId = req.params.id;
  const studentId = req.user.id;
  
  const lesson = await Lesson.findById(lessonId);
  
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }


  // Get the course
  const course = await Course.findById(lesson.course);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }


  // ✅ FIXED: Check if student is enrolled (new structure)
  const isEnrolled = course.enrolledStudents.some(
    e => e.studentId?.toString() === studentId
  );
  
  if (!isEnrolled) {
    return next(new AppError('You are not enrolled in this course', 403));
  }


  // Update user progress
  const user = await User.findById(studentId);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }


  // Find course progress
  let progressIndex = user.progress.findIndex(
    p => p.course.toString() === lesson.course.toString()
  );


  if (progressIndex === -1) {
    // Initialize progress if not exists
    user.progress.push({
      course: lesson.course,
      completedLessons: [lessonId],
      progressPercentage: 0
    });
    progressIndex = user.progress.length - 1;
  } else {
    // Add lesson if not already completed
    if (!user.progress[progressIndex].completedLessons.includes(lessonId)) {
      user.progress[progressIndex].completedLessons.push(lessonId);
    }
  }


  // Calculate progress percentage
  const totalLessons = await Lesson.countDocuments({ course: lesson.course });
  const completedCount = user.progress[progressIndex].completedLessons.length;
  user.progress[progressIndex].progressPercentage = Math.round((completedCount / totalLessons) * 100);
  user.progress[progressIndex].lastAccessedAt = new Date();


  await user.save();


  console.log(`✅ Lesson ${lessonId} marked as completed by student ${studentId}`);


  res.status(200).json({
    status: 'success',
    message: 'Lesson marked as completed',
    data: {
      lessonId,
      completedLessons: completedCount,
      totalLessons,
      progressPercentage: user.progress[progressIndex].progressPercentage
    }
  });
}));


module.exports = router;
