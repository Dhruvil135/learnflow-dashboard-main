const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    enum: [
      // Authentication actions
      'login', 
      'logout', 
      'register',
      
      // Course actions
      'view_course',
      'course_created',      // ✅ Added
      'course_updated',      // ✅ Added
      'course_deleted',      // ✅ Added
      'course_enrollment',   // ✅ Added
      
      // Exam actions
      'start_exam', 
      'submit_exam',
      'exam_created',        // ✅ Added
      'exam_submitted',      // ✅ Added
      
      // Lesson actions
      'lesson_completed',    // ✅ Added
      'lesson_created',      // ✅ Added
      
      // User actions
      'update_profile',
      'profile_updated',     // ✅ Added (alias)
      
      // Other actions
      'download_certificate',
      'upload_file',
      'other'
    ]
  },
  entityType: { 
    type: String, // What was acted upon? 'exam', 'course', 'user', etc.
    enum: ['exam', 'course', 'user', 'certificate', 'lesson', 'other']
  },
  entityId: { 
    type: mongoose.Schema.Types.ObjectId // ID of the specific entity
  },
  details: { 
    type: mongoose.Schema.Types.Mixed // Flexible field for extra info
  },
  ipAddress: String,
  userAgent: String, // Browser/device info
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: false // We're using custom timestamp field
});

// Index for fast queries - "Show me all exams taken by user X"
activityLogSchema.index({ user: 1, action: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
