const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Exam', // Reusing Exam model for now, will add Course model in Phase 2
    required: true 
  },
  certificateId: { 
    type: String, 
    unique: true, // Each certificate has unique ID like "CERT-2026-001234"
    required: true,
    index: true // Add index for fast lookups
  },
  issueDate: { 
    type: Date, 
    default: Date.now 
  },
  score: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  pdfUrl: { 
    type: String // Cloudinary URL (will add in Phase 2)
  },
  verificationUrl: { 
    type: String // Public link to verify certificate authenticity
  },
  metadata: {
    completionDate: Date,
    courseDuration: Number, // Total hours spent
    grade: { type: String, enum: ['A', 'B', 'C', 'Pass', 'Fail'] }
  }
}, {
  timestamps: true // Auto-creates createdAt and updatedAt
});

// REMOVED the pre-save hook - we'll generate IDs manually in routes
// This prevents the duplicate key error

module.exports = mongoose.model('Certificate', certificateSchema);
