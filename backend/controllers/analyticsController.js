const Exam = require('../models/Exam');
const User = require('../models/User');
const Course = require('../models/Course');
const { catchAsync, AppError } = require('../middleware/errorHandler');

// ===========================
// YOUR EXISTING CODE (KEPT AS-IS)
// ===========================
exports.getExamAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const exams = await Exam.find({
      "results.student": userId
    });

    let totalExamsTaken = 0;
    let totalScorePercentage = 0;

    exams.forEach(exam => {
      const result = exam.results.find(r => r.student.toString() === userId);
      
      if (result) {
        totalExamsTaken++;
        const examPercentage = (result.score / exam.questions.length) * 100;
        totalScorePercentage += examPercentage;
      }
    });

    const avgScore = totalExamsTaken === 0 ? 0 : Math.round(totalScorePercentage / totalExamsTaken);

    res.json([
      { title: "Completed", value: totalExamsTaken.toString(), icon: "BookOpen" },
      { title: "Avg Score", value: `${avgScore}%`, icon: "Trophy" },
      { title: "Hours Spent", value: (totalExamsTaken * 0.5).toFixed(1), icon: "Clock" },
      { title: "Streak", value: "3 Days", icon: "Flame" }
    ]);

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const exams = await Exam.find({});

    let totalStudents = 0;
    let totalScoreSum = 0;
    let totalResultsCount = 0;

    exams.forEach(exam => {
      if (exam.results && exam.results.length > 0) {
        totalStudents += exam.results.length; 
        
        exam.results.forEach(result => {
           const percentage = (result.score / exam.questions.length) * 100;
           totalScoreSum += percentage;
           totalResultsCount++;
        });
      }
    });

    const globalAvg = totalResultsCount === 0 ? 0 : Math.round(totalScoreSum / totalResultsCount);

    res.json([
      { title: "Total Students", value: totalStudents.toString(), icon: "Users" },
      { title: "Active Exams", value: exams.length.toString(), icon: "BookOpen" },
      { title: "Average Score", value: `${globalAvg}%`, icon: "Star" },
      { title: "Total Revenue", value: "$0", icon: "DollarSign" }
    ]);

  } catch (error) {
    console.error("Instructor Analytics Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ===========================
// ✅ NEW: ADVANCED ANALYTICS FUNCTIONS (FIXED)
// ===========================

// 1️⃣ PLATFORM OVERVIEW (Admin Only)
exports.getPlatformOverview = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  // Count users by role
  const userStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  // Count total exams
  const totalExams = await Exam.countDocuments();
  
  // Count exams by status
  const examsByStatus = await Exam.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // ✅ FIXED: Calculate total submissions (handles missing results)
  const submissionStats = await Exam.aggregate([
    {
      $project: {
        submissionCount: {
          $cond: {
            if: { $isArray: '$results' },
            then: { $size: '$results' },
            else: 0
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: '$submissionCount' }
      }
    }
  ]);

  // Calculate platform-wide average pass rate
  const passRateData = await Exam.aggregate([
    { $unwind: { path: '$results', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        passedAttempts: {
          $sum: { $cond: ['$results.isPassed', 1, 0] }
        },
        averageScore: { $avg: '$results.score' }
      }
    }
  ]);

  // ✅ FIXED: Top 5 most popular exams (handles missing results)
  const popularExams = await Exam.aggregate([
    {
      $project: {
        title: 1,
        instructor: 1,
        submissionCount: {
          $cond: {
            if: { $isArray: '$results' },
            then: { $size: '$results' },
            else: 0
          }
        }
      }
    },
    { $sort: { submissionCount: -1 } },
    { $limit: 5 }
  ]).then(exams => 
    Exam.populate(exams, { path: 'instructor', select: 'username email' })
  );

  const overview = {
    users: {
      total: userStats.reduce((sum, stat) => sum + stat.count, 0),
      byRole: userStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    },
    exams: {
      total: totalExams,
      byStatus: examsByStatus.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    },
    submissions: {
      total: submissionStats[0]?.totalSubmissions || 0
    },
    performance: {
      averageScore: passRateData[0]?.averageScore?.toFixed(2) || 0,
      passRate: passRateData[0]
        ? ((passRateData[0].passedAttempts / passRateData[0].totalAttempts) * 100).toFixed(2)
        : 0
    },
    popularExams
  };

  res.status(200).json({
    status: 'success',
    data: { overview }
  });
});

// 2️⃣ INSTRUCTOR STATS (Instructor Only)
exports.getInstructorStats = catchAsync(async (req, res, next) => {
  const instructorId = req.user.id;

  // Count my exams
  const totalExams = await Exam.countDocuments({ instructor: instructorId });

  // Count my exams by status (handle missing status field)
  const examsByStatus = await Exam.aggregate([
    { $match: { instructor: instructorId } },
    {
      $group: {
        _id: { $ifNull: ['$status', 'draft'] }, // Default to 'draft' if status is missing
        count: { $sum: 1 }
      }
    }
  ]);

  // ✅ FIXED: Calculate my total submissions (handles missing results)
  const mySubmissions = await Exam.aggregate([
    { $match: { instructor: instructorId } },
    {
      $project: {
        submissionCount: {
          $cond: {
            if: { $isArray: '$results' },
            then: { $size: '$results' },
            else: 0
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: '$submissionCount' }
      }
    }
  ]);

  // Calculate my pass rate
  const myPassRate = await Exam.aggregate([
    { $match: { instructor: instructorId } },
    { $unwind: { path: '$results', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        passedAttempts: {
          $sum: { $cond: ['$results.isPassed', 1, 0] }
        },
        averageScore: { $avg: '$results.score' }
      }
    }
  ]);

  // ✅ FIXED: My top 5 exams (handles missing results)
  const myTopExams = await Exam.aggregate([
    { $match: { instructor: instructorId } },
    {
      $project: {
        title: 1,
        status: 1,
        submissionCount: {
          $cond: {
            if: { $isArray: '$results' },
            then: { $size: '$results' },
            else: 0
          }
        },
        averageScore: '$analytics.averageScore'
      }
    },
    { $sort: { submissionCount: -1 } },
    { $limit: 5 }
  ]);

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentActivity = await Exam.aggregate([
    { $match: { instructor: instructorId } },
    { $unwind: { path: '$results', preserveNullAndEmptyArrays: false } },
    {
      $match: {
        'results.completedAt': { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$results.completedAt' }
        },
        submissions: { $sum: 1 },
        averageScore: { $avg: '$results.score' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const stats = {
    exams: {
      total: totalExams,
      byStatus: examsByStatus.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    },
    submissions: {
      total: mySubmissions[0]?.totalSubmissions || 0
    },
    performance: {
      averageScore: myPassRate[0]?.averageScore?.toFixed(2) || 0,
      passRate: myPassRate[0]
        ? ((myPassRate[0].passedAttempts / myPassRate[0].totalAttempts) * 100).toFixed(2)
        : 0
    },
    topExams: myTopExams,
    recentActivity
  };

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// 3️⃣ QUESTION-LEVEL ANALYSIS
exports.getQuestionAnalytics = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const exam = await Exam.findById(id).populate('instructor', 'username');

  if (!exam) {
    return next(new AppError('Exam not found', 404));
  }

  // Check permission
  if (exam.instructor._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Access denied', 403));
  }

  // ✅ Handle case when no results exist
  if (!exam.results || exam.results.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        examTitle: exam.title,
        totalSubmissions: 0,
        questionAnalytics: exam.questions.map((question, index) => ({
          questionNumber: index + 1,
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          successRate: 0,
          correctCount: 0,
          totalAttempts: 0,
          answerDistribution: {},
          difficulty: 'N/A'
        }))
      }
    });
  }

  // Analyze each question
  const questionAnalytics = exam.questions.map((question, index) => {
    const correctCount = exam.results.filter(
      result => result.answers[index] === question.correctAnswer
    ).length;

    const totalAttempts = exam.results.length;
    const successRate = totalAttempts > 0 
      ? ((correctCount / totalAttempts) * 100).toFixed(2) 
      : 0;

    // Answer distribution
    const answerDistribution = {};
    exam.results.forEach(result => {
      const studentAnswer = result.answers[index];
      answerDistribution[studentAnswer] = (answerDistribution[studentAnswer] || 0) + 1;
    });

    return {
      questionNumber: index + 1,
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      successRate: parseFloat(successRate),
      correctCount,
      totalAttempts,
      answerDistribution,
      difficulty: successRate >= 70 ? 'Easy' : successRate >= 40 ? 'Medium' : 'Hard'
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      examTitle: exam.title,
      totalSubmissions: exam.results.length,
      questionAnalytics
    }
  });
});

// ✅ NEW: 4️⃣ STUDENT LEADERBOARD (Instructor Only)
exports.getStudentLeaderboard = catchAsync(async (req, res, next) => {
  const instructorId = req.user.id;
  const { examId, limit = 10 } = req.query;

  // Build match filter
  const matchFilter = { instructor: instructorId };
  if (examId) {
    matchFilter._id = examId;
  }

  // Get leaderboard data
  const leaderboard = await Exam.aggregate([
    { $match: matchFilter },
    { $unwind: '$results' },
    {
      $group: {
        _id: '$results.student',
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: '$results.score' },
        highestScore: { $max: '$results.score' },
        totalPassed: {
          $sum: { $cond: ['$results.isPassed', 1, 0] }
        }
      }
    },
    { $sort: { averageScore: -1 } },
    { $limit: parseInt(limit) }
  ]);

  // Populate student details
  const populatedLeaderboard = await User.populate(leaderboard, {
    path: '_id',
    select: 'username email profile'
  });

  res.status(200).json({
    status: 'success',
    results: populatedLeaderboard.length,
    data: {
      leaderboard: populatedLeaderboard.map((item, index) => ({
        rank: index + 1,
        student: item._id,
        totalAttempts: item.totalAttempts,
        averageScore: parseFloat(item.averageScore.toFixed(2)),
        highestScore: parseFloat(item.highestScore.toFixed(2)),
        totalPassed: item.totalPassed
      }))
    }
  });
});
