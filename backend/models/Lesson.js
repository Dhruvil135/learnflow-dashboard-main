const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String,
    maxlength: 1000
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  
  // Lesson content
  contentType: {
    type: String,
    enum: ['video', 'text', 'pdf', 'quiz', 'assignment'],
    required: true
  },
  
  // Video lesson
  videoUrl: String, // YouTube, Vimeo, or Cloudinary
  videoDuration: Number, // seconds
  
  // Text lesson
  textContent: String, // Rich text/markdown
  
  // File attachments
  attachments: [{
    name: String,
    url: String, // Cloudinary URL
    publicId: String,
    fileType: String, // 'pdf', 'doc', etc.
    size: Number // bytes
  }],
  
  // Lesson order
  order: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Duration
  estimatedDuration: {
    type: Number, // minutes
    default: 10
  },
  
  // Access control
  isFree: {
    type: Boolean,
    default: false // Preview lesson
  },
  
  // Status
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
lessonSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
