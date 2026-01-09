const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Certificate = require('../models/Certificate');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// ===========================
// GET ALL EXAMS (Public - for students browsing)
// ===========================
router.get('/', catchAsync(async (req, res) => {
  const { status, instructor } = req.query;

  const filter = {};
  // Default to published for public access (students should only see published exams)
  filter.status = status || 'published';
  if (instructor) filter.instructor = instructor;

  const exams = await Exam.find(filter)
    .populate('instructor', 'username email profile')
    .populate('createdBy', 'username email profile')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: exams.length,
    data: { exams }
  });
}));

// ===========================
// ✅ GET MY EXAMS (Instructor Only)
// ===========================
router.get('/my-exams', authenticate, catchAsync(async (req, res) => {
  const exams = await Exam.find({ 
    instructor: req.user.id
  })
  .populate('instructor', 'username email profile')
  .populate('createdBy', 'username email profile')
  .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: exams.length,
    data: { exams }
  });
}));

// ===========================
// ✅ NEW: GET MY CREATED QUIZZES (Student's AI quizzes)
// ===========================
router.get('/my-quizzes', authenticate, catchAsync(async (req, res) => {
  const quizzes = await Exam.find({ 
    createdBy: req.user.id,
    quizType: 'ai-generated'
  })
  .populate('createdBy', 'username email profile')
  .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: quizzes.length,
    data: { quizzes }
  });
}));

// ===========================
// GET SINGLE EXAM BY ID
// ===========================
router.get('/:id', catchAsync(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id)
    .populate('instructor', 'username email profile')
    .populate('createdBy', 'username email profile')
    .populate('participants', 'username email');

  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { exam }
  });
}));

// ===========================
// ✅ CREATE NEW EXAM (UPDATED - supports AI and manual + WebSocket)
// ===========================
router.post('/', authenticate, validate('createExam'), catchAsync(async (req, res) => {
  console.log('📥 Received request body:', req.body);

  const { 
    title, 
    description, 
    course,
    duration, 
    questions, 
    settings, 
    status,
    quizType
  } = req.body;

  if (!title) {
    return res.status(400).json({
      status: 'error',
      message: 'Title is required'
    });
  }

  if (!questions || questions.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'At least one question is required'
    });
  }

  const examData = {
    title,
    description,
    ...(course && { course }),
    duration: duration || 30,
    questions,
    instructor: req.user.id,
    createdBy: req.user.id,
    quizType: quizType || 'manual',
    status: status || 'draft',
    settings: {
      passingScore: settings?.passingScore || 60,
      shuffleQuestions: settings?.shuffleQuestions || false,
      showResults: settings?.showResults !== false
    }
  };

  console.log('📝 Creating exam:', examData);

  const exam = await Exam.create(examData);

  // ✅ BROADCAST: New exam created
  const io = req.app.get('io');
  if (io) {
    io.to('admins').emit('examCreated', {
      examId: exam._id,
      examTitle: exam.title,
      instructorId: req.user.id,
      quizType: exam.quizType,
      timestamp: new Date()
    });
  }

  res.status(201).json({
    status: 'success',
    data: { exam },
    message: 'Exam created successfully'
  });
}));

// ===========================
// ✅ UPDATE EXAM (Check ownership)
// ===========================
router.patch('/:id', authenticate, catchAsync(async (req, res, next) => {
  let exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  if (exam.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this exam', 403));
  }

  exam = await Exam.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: { exam }
  });
}));

// ===========================
// ✅ PUBLISH/UNPUBLISH EXAM (With WebSocket)
// ===========================
router.patch('/:id/publish', authenticate, catchAsync(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  if (exam.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to publish this exam', 403));
  }

  const newStatus = exam.status === 'published' ? 'draft' : 'published';
  exam.status = newStatus;
  
  if (newStatus === 'published') {
    exam.publishedAt = new Date();
  }
  
  await exam.save();

  // ✅ BROADCAST: Exam published/unpublished
  const io = req.app.get('io');
  if (io) {
    io.to('admins').emit('examStatusChanged', {
      examId: exam._id,
      examTitle: exam.title,
      newStatus,
      timestamp: new Date()
    });
  }

  res.status(200).json({
    status: 'success',
    data: { exam },
    message: `Exam ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`
  });
}));

// ===========================
// ✅ DELETE EXAM (UPDATED - Allow creator to delete)
// ===========================
router.delete('/:id', authenticate, catchAsync(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  const canDelete = exam.instructor.toString() === req.user.id || 
                    exam.createdBy.toString() === req.user.id ||
                    req.user.role === 'admin';

  if (!canDelete) {
    return next(new AppError('You do not have permission to delete this exam', 403));
  }

  await Exam.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Exam deleted successfully',
    data: null
  });
}));

// ===========================
// ✅ SUBMIT EXAM (With Real-Time WebSocket Broadcasting)
// ===========================
router.post('/:id/submit', authenticate, catchAsync(async (req, res, next) => {
  const { answers, timeSpent } = req.body;
  const studentId = req.user.id;
  
  const exam = await Exam.findById(req.params.id);
  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  // Calculate score
  let correctAnswers = 0;
  exam.questions.forEach((question, index) => {
    if (question.correctAnswer === answers[index]) {
      correctAnswers++;
    }
  });

  const score = (correctAnswers / exam.questions.length) * 100;
  const isPassed = score >= (exam.settings?.passingScore || 60);

  // Add result to exam
  exam.results.push({
    student: studentId,
    score: score,
    answers: answers,
    isPassed: isPassed,
    timeSpent: timeSpent,
    completedAt: new Date()
  });

  // Update analytics
  exam.analytics.totalAttempts = exam.results.length;
  exam.analytics.averageScore = exam.results.reduce((sum, r) => sum + r.score, 0) / exam.results.length;
  exam.analytics.passRate = (exam.results.filter(r => r.isPassed).length / exam.results.length) * 100;

  await exam.save();

  // ✅ BROADCAST REAL-TIME UPDATE TO ADMINS & INSTRUCTOR
  const io = req.app.get('io');
  if (io) {
    const submissionData = {
      examId: exam._id,
      examTitle: exam.title,
      studentId,
      studentName: req.user.username,
      score: score.toFixed(2),
      isPassed,
      timestamp: new Date()
    };

    // Notify all admins
    io.to('admins').emit('newSubmission', submissionData);

    // ✅ UPDATED: Notify the specific instructor with detailed logging
    const instructorRoomName = `instructor-${exam.instructor.toString()}`;
    io.to(instructorRoomName).emit('newSubmission', submissionData);

    console.log('📡 Broadcasted submission to:');
    console.log('   • admins room');
    console.log(`   • ${instructorRoomName}`);
    console.log('   Submission data:', {
      exam: exam.title,
      student: req.user.username,
      score: score.toFixed(2)
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      score,
      isPassed,
      correctAnswers,
      totalQuestions: exam.questions.length
    }
  });
}));

// ===========================
// ✅ GET EXAM SUBMISSIONS (Instructor only)
// ===========================
router.get('/:id/submissions', authenticate, catchAsync(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id)
    .populate('results.student', 'username email profile');
  
  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  if (exam.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view submissions', 403));
  }

  res.status(200).json({
    status: 'success',
    results: exam.results.length,
    data: { 
      submissions: exam.results,
      analytics: exam.analytics
    }
  });
}));

// ===========================
// TEST ROUTE: CREATE CERTIFICATE
// ===========================
router.post('/test-certificate', catchAsync(async (req, res) => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  const certificateId = `CERT-${year}-${random}`;

  const cert = await Certificate.create({
    student: '507f1f77bcf86cd799439011',
    course: '507f1f77bcf86cd799439012',
    certificateId: certificateId,
    score: 85,
    metadata: {
      grade: 'A',
      completionDate: new Date()
    }
  });

  res.status(201).json({
    status: 'success',
    data: { certificate: cert }
  });
}));

// ===========================
// TEST ROUTE: GET ALL CERTIFICATES
// ===========================
router.get('/test-certificate/all', catchAsync(async (req, res) => {
  const certificates = await Certificate.find()
    .populate('student', 'username email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: certificates.length,
    data: { certificates }
  });
}));

// ===========================
// GET EXAMS FOR A SPECIFIC COURSE
// ===========================
router.get('/course/:courseId', catchAsync(async (req, res) => {
  const exams = await Exam.find({ 
    course: req.params.courseId,
    status: 'published'
  })
  .populate('instructor', 'username email profile')
  .populate('createdBy', 'username email profile')
  .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: exams.length,
    data: { exams }
  });
}));

// ===========================
// GET EXAM RESULTS FOR STUDENT
// ===========================
router.get('/:id/my-result', authenticate, catchAsync(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  const result = exam.results.find(r => r.student.toString() === req.user.id);

  if (!result) {
    return res.status(200).json({
      status: 'success',
      data: { result: null }
    });
  }

  res.status(200).json({
    status: 'success',
    data: { result }
  });
}));

module.exports = router;
