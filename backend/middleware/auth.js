const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');

/**
 * Authenticate user from JWT token
 * Extracts token from Authorization header and verifies it
 * Adds user info to req.user
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided. Please login.', 401));
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return next(new AppError('No token provided. Please login.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Load user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return next(new AppError('Password recently changed. Please login again', 401));
    }

    // Add full user object to request
    req.user = user;

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please login again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again.', 401));
    }
    
    // Handle other errors
    return next(new AppError('Authentication failed', 401));
  }
};

/**
 * Authorize user based on role
 * Use after authenticate middleware
 * Example: router.get('/admin', authenticate, authorize('admin'), ...)
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if req.user exists (should be set by authenticate middleware)
    if (!req.user) {
      return next(new AppError('Please login to access this resource', 401));
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

/**
 * Optional: Check if user owns the resource
 * Useful for ensuring users can only edit their own data
 */
exports.checkOwnership = (req, res, next) => {
  // Check if user is trying to access their own resource
  if (req.params.id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only access your own resources', 403));
  }
  next();
};

// Aliases for backward compatibility
exports.authenticateToken = exports.authenticate;
exports.protect = exports.authenticate;
exports.roleCheck = exports.authorize;
