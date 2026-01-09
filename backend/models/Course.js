const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  instructor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Media
  thumbnail: {
    url: String, // Cloudinary URL
    publicId: String // For deletion
  },
  
  // Course content
  lessons: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson' 
  }],
  
  // ✅ ADDED: Exams for this course
  exams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  }],
  
  // Course metadata
  category: {
    type: String,
    enum: ['programming', 'design', 'business', 'marketing', 'other'],
    default: 'other'
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  tags: [String], // For AI recommendations in Phase 4
  
  // Pricing (for future premium features)
  price: {
    type: Number,
    default: 0, // Free courses
    min: 0
  },
  
  // ✅ NEW: Enrollment with timestamps (for tracking when student enrolled)
  enrolledStudents: [{ 
    studentId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxStudents: {
    type: Number,
    default: null // null = unlimited
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  
  // Analytics
  analytics: {
    totalEnrollments: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 } // Percentage
  },
  
  // Duration
  estimatedDuration: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
courseSchema.index({ instructor: 1, status: 1 });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ 'enrolledStudents.studentId': 1 }); // ✅ NEW: For enrollment queries

// Virtual for total duration in minutes
courseSchema.virtual('totalMinutes').get(function() {
  return (this.estimatedDuration.hours * 60) + this.estimatedDuration.minutes;
});

module.exports = mongoose.model('Course', courseSchema);
