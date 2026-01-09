const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

// ===========================
// REGISTER
// ===========================
router.post('/register', validate('register'), catchAsync(async (req, res) => {
  const { username, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new AppError('User with this email or username already exists', 400);
  }

  // Create user (password will be hashed by pre-save hook)
  const user = new User({
    username,
    email,
    password,
    role: role || 'student'
  });
  await user.save();

  // Log activity
  try {
    await logActivity(user._id, 'register', 'user', user._id, { username, email }, req);
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  // Generate token
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '7d' }
  );

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }
  });
}));

// ===========================
// LOGIN
// ===========================
router.post('/login', validate('login'), catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');

  // Use comparePassword method from model
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Log activity
  try {
    await logActivity(user._id, 'login', 'user', user._id, { email }, req);
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  // Generate token
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '7d' }
  );

  res.json({
    status: 'success',
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }
  });
}));

// ===========================
// GET CURRENT USER
// ===========================
router.get('/me', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: { user }
  });
}));

// ===========================
// CHANGE PASSWORD
// ===========================
router.post('/change-password', authenticate, catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('All fields are required', 400));
  }

  // CHECK: New password same as current
  if (currentPassword === newPassword) {
    return next(new AppError('New password must be different from current password', 400));
  }

  // CHECK: Passwords match
  if (newPassword !== confirmPassword) {
    return next(new AppError('New password and confirm password do not match', 400));
  }

  // CHECK: Password length
  if (newPassword.length < 6) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify current password using model method
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Set new password (will be hashed by pre-save hook)
  user.password = newPassword;
  await user.save();

  // Log activity
  try {
    await logActivity(user._id, 'password_change', 'user', user._id, {}, req);
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  res.json({
    status: 'success',
    message: 'Password changed successfully! Please login again.'
  });
}));

// ===========================
// LOGOUT
// ===========================
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  // Log activity
  try {
    await logActivity(req.user.id, 'logout', 'user', req.user.id, {}, req);
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
}));

// ===========================
// FORGOT PASSWORD (Request Reset Link)
// ===========================
const crypto = require('crypto');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/emailService');

router.post('/forgot-password', catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) {
    console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
    return res.json({
      status: 'success',
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token before storing (security best practice)
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token and expiry (1 hour)
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  // Build reset URL
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  // Get user's display name
  const userName = user.profile?.firstName || user.username || 'User';

  // ✅ DEV MODE: If no email configured, show link in console
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 PASSWORD RESET LINK (DEV MODE - No email configured)');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`👤 User: ${userName}`);
    console.log(`🔗 Reset URL: ${resetUrl}`);
    console.log('='.repeat(60) + '\n');

    return res.json({
      status: 'success',
      message: 'If an account exists with this email, a password reset link has been sent.',
      // ✅ DEV ONLY: Include reset URL in response for testing
      devMode: true,
      resetUrl: resetUrl
    });
  }

  // ✅ PRODUCTION: Send real email
  try {
    await sendPasswordResetEmail(user.email, resetToken, userName);
    console.log(`✅ Password reset email sent to: ${email}`);

    res.json({
      status: 'success',
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (emailError) {
    // Email failed - fallback to console
    console.log('\n' + '='.repeat(60));
    console.log('🔐 PASSWORD RESET LINK (Email failed - showing in console)');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Reset URL: ${resetUrl}`);
    console.log(`❌ Error: ${emailError.message}`);
    console.log('='.repeat(60) + '\n');

    res.json({
      status: 'success',
      message: 'If an account exists with this email, a password reset link has been sent.',
      devMode: true,
      resetUrl: resetUrl
    });
  }
}));

// ===========================
// RESET PASSWORD (Using Token)
// ===========================
router.post('/reset-password', catchAsync(async (req, res, next) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password) {
    return next(new AppError('Token and password are required', 400));
  }

  if (password !== confirmPassword) {
    return next(new AppError('Passwords do not match', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  // Hash the token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Invalid or expired reset token. Please request a new one.', 400));
  }

  // Update password (will be hashed by pre-save hook)
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // Get user's display name
  const userName = user.profile?.firstName || user.username || 'User';

  // Send confirmation email (non-blocking)
  sendPasswordChangedEmail(user.email, userName).catch(err => {
    console.error('Confirmation email failed:', err.message);
  });

  // Log activity
  try {
    await logActivity(user._id, 'password_reset', 'user', user._id, {}, req);
  } catch (logError) {
    console.error('Activity logging failed:', logError.message);
  }

  console.log(`✅ Password reset successful for: ${user.email}`);

  res.json({
    status: 'success',
    message: 'Password reset successful! You can now login with your new password.'
  });
}));

module.exports = router;

