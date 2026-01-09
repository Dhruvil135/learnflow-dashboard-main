const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// ===========================
// YOUR EXISTING ROUTES (KEPT AS-IS)
// ===========================
// Route: GET /api/analytics/exams
router.get('/exams', authenticate, analyticsController.getExamAnalytics);

// Route: GET /api/analytics/user
router.get('/user', authenticate, analyticsController.getUserAnalytics);

// ===========================
// ✅ NEW ADVANCED ANALYTICS ROUTES
// ===========================

// Admin platform overview (Admin only)
router.get('/platform', authenticate, analyticsController.getPlatformOverview);

// Instructor personal stats (Instructor only)
router.get('/my-stats', authenticate, analyticsController.getInstructorStats);

// Question-level analysis for specific exam (Instructor/Admin)
router.get('/exam/:id/questions', authenticate, analyticsController.getQuestionAnalytics);

// ✅ NEW: Student leaderboard (Instructor only)
router.get('/leaderboard', authenticate, analyticsController.getStudentLeaderboard);

module.exports = router;
