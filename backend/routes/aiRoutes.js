const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth'); // ✅ Changed from 'auth' to 'authenticate'

/**
 * AI ROUTES FOR SKILLFORGE
 * 
 * Routes:
 * 1. Generate AI quiz (protected - students only)
 * 2. Get personalized recommendations (protected)
 * 3. Get trending courses (public)
 * 4. Get similar courses (public)
 */

// ===== QUIZ GENERATION =====

// Generate AI-powered quiz questions
// POST /api/ai/generate-quiz
// Body: { topic, difficulty, questionCount }
// Protected: Requires authentication
router.post('/generate-quiz', authenticate, aiController.generateQuiz);

// Alternative route (if your frontend uses /generate instead)
// POST /api/ai/generate
router.post('/generate', authenticate, aiController.generateQuiz);

// ===== COURSE RECOMMENDATIONS (Phase 4) =====

// Get personalized course recommendations based on enrolled courses
// GET /api/ai/recommendations
// Protected: Requires authentication
router.get('/recommendations', authenticate, aiController.getRecommendations);

// Get trending/popular courses
// GET /api/ai/trending
// Public: No authentication required
router.get('/trending', aiController.getTrendingCourses);

// Get courses similar to a specific course
// GET /api/ai/similar/:courseId
// Public: No authentication required
router.get('/similar/:courseId', aiController.getSimilarCourses);

// ===== AI CHATBOT (NEW) =====

// Chat with AI Assistant
// POST /api/ai/chat
// Body: { message, conversationHistory }
// Protected: Requires authentication
router.post('/chat', authenticate, aiController.chatWithAI);

module.exports = router;
