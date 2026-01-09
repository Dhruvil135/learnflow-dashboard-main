const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { uploadCourseThumbnail, deleteFromCloudinary } = require('../config/cloudinary');
const { logActivity } = require('../utils/activityLogger');
const { authenticateToken } = require('../middleware/auth');

// ===========================
// GET ALL COURSES (Public + Filtered)
// ===========================
router.get('/', catchAsync(async (req, res) => {
  const { status, category, level, instructor, published } = req.query;
  
  // Build filter object
  const filter = {};
  
  // ✅ If published=true, only show published courses (for students)
  if (published === 'true') {
    filter.status = 'published';
  } else if (status) {
    filter.status = status;
  }
  
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (instructor) filter.instructor = instructor;

  const courses = await Course.find(filter)
    .populate('instructor', 'username email profile')
    .populate('lessons')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
}));

// ===========================
// ✅ GET MY COURSES (Instructor Only)
// ===========================
router.get('/my-courses', authenticateToken, catchAsync(async (req, res) => {
  const courses = await Course.find({ 
    instructor: req.user.id
  })
  .populate('instructor', 'username email profile')
  .populate('lessons')
  .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
}));

// ===========================
// ✅ GET ENROLLED COURSES (Student Only)
// ===========================
router.get('/enrolled', authenticateToken, catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  // Find courses where user is enrolled
  const courses = await Course.find({
    'enrolledStudents.studentId': userId, // ✅ UPDATED: Use new structure
    status: 'published'
  })
  .populate('instructor', 'username email profile')
  .populate('lessons')
  .sort({ createdAt: -1 });

  // ✅ Get user's progress for each course
  const user = await User.findById(userId);
  
  const coursesWithProgress = courses.map(course => {
    const courseObj = course.toObject();
    
    // Find progress for this course
    const progress = user?.progress?.find(
      p => p.course.toString() === course._id.toString()
    );
    
    // ✅ Find enrollment date
    const enrollment = course.enrolledStudents.find(
      e => e.studentId?.toString() === userId
    );
    
    if (progress) {
      courseObj.progress = {
        completedLessons: progress.completedLessons || [],
        progressPercentage: progress.progressPercentage || 0,
        lastAccessedAt: progress.lastAccessedAt,
        enrolledAt: enrollment?.enrolledAt || null // ✅ NEW
      };
    } else {
      courseObj.progress = {
        completedLessons: [],
        progressPercentage: 0,
        lastAccessedAt: null,
        enrolledAt: enrollment?.enrolledAt || null // ✅ NEW
      };
    }
    
    return courseObj;
  });

  res.status(200).json({
    status: 'success',
    results: coursesWithProgress.length,
    data: { courses: coursesWithProgress }
  });
}));

// ===========================
// GET SINGLE COURSE
// ===========================
router.get('/:id', catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate('instructor', 'username email profile')
    .populate({
      path: 'lessons',
      options: { sort: { order: 1 } }
    })
    .populate('enrolledStudents.studentId', 'username email profile'); // ✅ UPDATED

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { course }
  });
}));

// ===========================
// ✅ CREATE COURSE (Use logged-in user as instructor)
// ===========================
router.post('/', authenticateToken, uploadCourseThumbnail.single('thumbnail'), catchAsync(async (req, res) => {
  const courseData = {
    ...req.body,
    instructor: req.user.id
  };

  // If thumbnail uploaded, add to course data
  if (req.file) {
    courseData.thumbnail = {
      url: req.file.path,
      publicId: req.file.filename
    };
  }

  // Parse tags if sent as string
  if (typeof courseData.tags === 'string') {
    courseData.tags = courseData.tags.split(',').map(tag => tag.trim());
  }

  const course = await Course.create(courseData);

  // Log activity
  try {
    await logActivity(
      req.user.id,
      'course_created',
      'course',
      course._id,
      { courseTitle: course.title, category: course.category },
      req
    );
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  res.status(201).json({
    status: 'success',
    data: { course }
  });
}));

// ===========================
// ✅ UPDATE COURSE (Check ownership)
// ===========================
router.patch('/:id', authenticateToken, uploadCourseThumbnail.single('thumbnail'), catchAsync(async (req, res, next) => {
  let course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ Check if user owns this course
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this course', 403));
  }

  // If new thumbnail uploaded, delete old one and update
  if (req.file) {
    if (course.thumbnail?.publicId) {
      console.log('🗑️ Deleting old thumbnail:', course.thumbnail.publicId);
      await deleteFromCloudinary(course.thumbnail.publicId);
    }
    
    req.body.thumbnail = {
      url: req.file.path,
      publicId: req.file.filename
    };
    
    console.log('✅ New thumbnail uploaded:', req.file.filename);
  }

  // Parse tags if sent as string
  if (typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  // Update course
  course = await Course.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).populate('instructor', 'username email profile');

  res.status(200).json({
    status: 'success',
    message: 'Course updated successfully',
    data: { course }
  });
}));

// ===========================
// ✅ DELETE THUMBNAIL ONLY
// ===========================
router.delete('/:id/thumbnail', authenticateToken, catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ Check ownership
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  // Delete thumbnail from Cloudinary
  if (course.thumbnail?.publicId) {
    console.log('🗑️ Deleting thumbnail:', course.thumbnail.publicId);
    await deleteFromCloudinary(course.thumbnail.publicId);
    
    course.thumbnail = null;
    await course.save();
    
    console.log('✅ Thumbnail removed successfully');
  }

  res.status(200).json({
    status: 'success',
    message: 'Thumbnail removed successfully',
    data: { course }
  });
}));

// ===========================
// ✅ DELETE COURSE (Check ownership)
// ===========================
router.delete('/:id', authenticateToken, catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ Check if user owns this course
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this course', 403));
  }

  // Delete thumbnail from Cloudinary
  if (course.thumbnail?.publicId) {
    console.log('🗑️ Deleting course thumbnail:', course.thumbnail.publicId);
    await deleteFromCloudinary(course.thumbnail.publicId);
  }

  // Delete all lesson attachments
  const lessons = await Lesson.find({ course: course._id });
  console.log(`🗑️ Found ${lessons.length} lessons to delete`);
  
  for (const lesson of lessons) {
    if (lesson.attachments && lesson.attachments.length > 0) {
      console.log(`🗑️ Deleting ${lesson.attachments.length} attachments from lesson: ${lesson.title}`);
      for (const attachment of lesson.attachments) {
        try {
          await deleteFromCloudinary(attachment.publicId);
          console.log(`✅ Deleted: ${attachment.name}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${attachment.name}:`, error.message);
        }
      }
    }
  }

  // Delete all lessons
  await Lesson.deleteMany({ course: course._id });
  console.log(`✅ Deleted ${lessons.length} lessons`);

  // ✅ Remove course from all enrolled users
  await User.updateMany(
    { enrolledCourses: course._id },
    { 
      $pull: { 
        enrolledCourses: course._id,
        progress: { course: course._id }
      }
    }
  );
  console.log(`✅ Removed course from all enrolled users`);

  // Delete course
  await Course.findByIdAndDelete(req.params.id);
  console.log(`✅ Course deleted: ${course._id}`);

  res.status(200).json({
    status: 'success',
    message: 'Course and all associated content deleted successfully',
    data: null
  });
}));

// ===========================
// ✅ ENROLL STUDENT (Use logged-in user)
// ===========================
router.post('/:id/enroll', authenticateToken, catchAsync(async (req, res, next) => {
  const studentId = req.user.id;
  
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ UPDATED: Check if already enrolled (new structure)
  const alreadyEnrolled = course.enrolledStudents.some(
    e => e.studentId?.toString() === studentId
  );
  
  if (alreadyEnrolled) {
    return next(new AppError('Student already enrolled in this course', 400));
  }

  // Check max students limit
  if (course.maxStudents && course.enrolledStudents.length >= course.maxStudents) {
    return next(new AppError('Course is full', 400));
  }

  // ✅ Check if course is published
  if (course.status !== 'published') {
    return next(new AppError('Cannot enroll in unpublished course', 400));
  }

  // ✅ UPDATED: Add student with enrollment date
  course.enrolledStudents.push({
    studentId: studentId,
    enrolledAt: new Date()
  });
  course.analytics.totalEnrollments = course.enrolledStudents.length;
  await course.save();

  // ✅ Add course to user's enrolledCourses and initialize progress
  const user = await User.findById(studentId);
  if (user) {
    // Add to enrolledCourses
    if (!user.enrolledCourses.includes(course._id)) {
      user.enrolledCourses.push(course._id);
    }

    // Initialize progress
    const existingProgress = user.progress.find(
      p => p.course.toString() === course._id.toString()
    );

    if (!existingProgress) {
      user.progress.push({
        course: course._id,
        completedLessons: [],
        progressPercentage: 0,
        startedAt: new Date(),
        timeSpent: 0
      });
    }

    await user.save();
  }

  console.log(`✅ Student ${studentId} enrolled in course ${course._id}`);

  // Log activity
  try {
    await logActivity(
      studentId,
      'course_enrollment',
      'course',
      course._id,
      { courseTitle: course.title },
      req
    );
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully enrolled in course',
    data: { course }
  });
}));

// ===========================
// CHECK ENROLLMENT STATUS
// ===========================
router.get('/:id/enrollment-status', authenticateToken, catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ UPDATED: Check with new structure
  const isEnrolled = course.enrolledStudents.some(
    e => e.studentId?.toString() === req.user.id
  );

  res.status(200).json({
    status: 'success',
    data: { isEnrolled }
  });
}));

// ===========================
// ✅ UNENROLL STUDENT
// ===========================
router.delete('/:id/enroll', authenticateToken, catchAsync(async (req, res, next) => {
  const studentId = req.user.id;
  
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ UPDATED: Check if enrolled (new structure)
  const isEnrolled = course.enrolledStudents.some(
    e => e.studentId?.toString() === studentId
  );

  if (!isEnrolled) {
    return next(new AppError('You are not enrolled in this course', 400));
  }

  // ✅ UPDATED: Remove student from course (new structure)
  course.enrolledStudents = course.enrolledStudents.filter(
    e => e.studentId?.toString() !== studentId
  );
  course.analytics.totalEnrollments = course.enrolledStudents.length;
  await course.save();

  // ✅ Remove course from user's enrolledCourses (but keep progress)
  const user = await User.findById(studentId);
  if (user) {
    user.enrolledCourses = user.enrolledCourses.filter(
      courseId => courseId.toString() !== course._id.toString()
    );
    
    // ✅ Keep progress data for if they re-enroll later
    const progressIndex = user.progress.findIndex(
      p => p.course.toString() === course._id.toString()
    );
    
    if (progressIndex !== -1) {
      user.progress[progressIndex].lastAccessedAt = new Date();
    }

    await user.save();
  }

  console.log(`✅ Student ${studentId} unenrolled from course ${course._id}`);

  // Log activity
  try {
    await logActivity(
      studentId,
      'course_unenrollment',
      'course',
      course._id,
      { courseTitle: course.title },
      req
    );
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully unenrolled from course',
    data: null
  });
}));

// ===========================
// ✅ PUBLISH COURSE (Check ownership)
// ===========================
router.patch('/:id/publish', authenticateToken, catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ Check if user owns this course
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to publish this course', 403));
  }

  course.status = 'published';
  course.publishedAt = new Date();
  await course.save();

  console.log(`✅ Course published: ${course._id}`);

  res.status(200).json({
    status: 'success',
    message: 'Course published successfully',
    data: { course }
  });
}));

// ===========================
// ✅ UNPUBLISH COURSE (Archive)
// ===========================
router.patch('/:id/unpublish', authenticateToken, catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // ✅ Check ownership
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to unpublish this course', 403));
  }

  course.status = 'draft';
  await course.save();

  console.log(`✅ Course unpublished: ${course._id}`);

  res.status(200).json({
    status: 'success',
    message: 'Course unpublished successfully',
    data: { course }
  });
}));

// ===========================
// ✅ GET COURSE STATISTICS (Instructor only)
// ===========================
router.get('/:id/stats', authenticateToken, catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate('enrolledStudents.studentId', 'username email profile') // ✅ UPDATED
    .populate('lessons');

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view statistics', 403));
  }

  // Calculate statistics
  const stats = {
    totalStudents: course.enrolledStudents.length,
    totalLessons: course.lessons.length,
    averageProgress: 0,
    completionRate: course.analytics.completionRate || 0,
    recentEnrollments: course.enrolledStudents
      .slice(-5)
      .map(e => ({
        username: e.studentId?.username || 'Unknown',
        email: e.studentId?.email || 'Unknown',
        enrolledAt: e.enrolledAt
      }))
  };

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
}));

module.exports = router;
