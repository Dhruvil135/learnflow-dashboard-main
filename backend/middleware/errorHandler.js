// Custom Error Class - extends built-in Error
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call parent Error constructor
    this.statusCode = statusCode; // HTTP status code (400, 404, 500, etc.)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // 4xx = fail, 5xx = error
    this.isOperational = true; // Flag to identify our custom errors

    Error.captureStackTrace(this, this.constructor); // Capture where error happened
  }
}

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // Default to 500 if not set
  err.status = err.status || 'error';

  // Development mode - show full error details
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack // Show code trace for debugging
    });
  } 
  // Production mode - hide sensitive error details
  else {
    // Only send operational errors to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } 
    // Programming errors - don't leak details
    else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong on the server'
      });
    }
  }
};

// Async error wrapper - eliminates try-catch repetition
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // Automatically passes errors to errorHandler
  };
};

module.exports = { AppError, errorHandler, catchAsync };