const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },

  profile: {
    firstName: String,
    lastName: String,
    avatar: String, // Cloudinary URL for profile picture
    avatarPublicId: String,
    bio: { type: String, maxlength: 500 },
    phone: String,
    dateOfBirth: Date,
    location: {
      country: String,
      city: String
    }
  },

  // Track user activity
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  // Root-level completed lessons (for quick access)
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],

  // Progress tracking
  progress: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    completedLessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt: Date
  }],

  // Achievements
  certificates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  }],

  // Authentication tracking
  passwordChangedAt: Date,

  // Account status
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,

  // Password reset tokens
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) {
    this.updatedAt = Date.now();
    return next();
  }

  // Hash password
  this.password = await bcrypt.hash(this.password, 12);

  // Set passwordChangedAt (but not for new users)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  this.updatedAt = Date.now();
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
