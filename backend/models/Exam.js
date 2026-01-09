const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false  // ✅ Optional (for standalone AI quizzes)
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  
  // ✅ NEW: Quiz type (AI-generated or manual)
  quizType: {
    type: String,
    enum: ['ai-generated', 'manual'],
    default: 'manual'
  },
  
  // ✅ NEW: Creator info (student can create AI quizzes for themselves)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number, // Index of correct option (0, 1, 2, 3)
      required: true
    }
  }],
  duration: {
    type: Number, // in minutes
    default: 30
  },
  
  // ✅ UPDATED: Status with better control
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date, // ✅ NEW: Track when published
  
  scheduledAt: Date,
  settings: {
    passingScore: {
      type: Number,
      default: 60
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    showResults: {
      type: Boolean,
      default: true
    }
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  results: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    answers: [Number], // Array of selected option indexes
    isPassed: Boolean,
    timeSpent: Number,
    completedAt: Date
  }],
  analytics: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
examSchema.index({ instructor: 1, status: 1 });
examSchema.index({ course: 1 });
examSchema.index({ createdBy: 1 }); // ✅ NEW: For user's own quizzes
examSchema.index({ quizType: 1 }); // ✅ NEW: Filter by quiz type
examSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Exam', examSchema);
