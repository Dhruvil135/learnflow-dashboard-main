const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Validation schemas for different routes
const schemas = {
  // User registration validation
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required()
      .messages({
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      }),
    role: Joi.string().valid('student', 'instructor', 'admin').default('student')
  }),

  // User login validation
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // ✅ UPDATED: Exam creation validation (course is OPTIONAL, added quizType and createdBy)
  createExam: Joi.object({
    title: Joi.string().min(5).max(200).required()
      .messages({
        'string.min': 'Title must be at least 5 characters',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
      }),
    course: Joi.string().optional().allow(null, '')  // ✅ Optional for AI quizzes
      .messages({
        'any.required': 'Course is required'
      }),
    description: Joi.string().max(1000).allow(''),
    duration: Joi.number().min(1).max(600).default(30),
    status: Joi.string().valid('draft', 'published').default('draft'),
    
    // ✅ NEW: Quiz type field
    quizType: Joi.string().valid('ai-generated', 'manual').default('manual'),
    
    // ✅ NEW: Creator field (will be set by backend, but allow it in validation)
    createdBy: Joi.string().optional().allow(null, ''),
    
    settings: Joi.object({
      passingScore: Joi.number().min(0).max(100).default(60),
      shuffleQuestions: Joi.boolean().default(false),
      showResults: Joi.boolean().default(true)
    }).default(),
    questions: Joi.array().items(
      Joi.object({
        question: Joi.string().required()
          .messages({
            'any.required': 'Question text is required'
          }),
        options: Joi.array().items(Joi.string()).min(2).max(10).required()
          .messages({
            'array.min': 'Each question must have at least 2 options',
            'array.max': 'Each question cannot have more than 10 options',
            'any.required': 'Question options are required'
          }),
        correctAnswer: Joi.number().min(0).required()
          .messages({
            'any.required': 'Correct answer is required'
          })
      })
    ).min(1).required()
      .messages({
        'array.min': 'At least one question is required',
        'any.required': 'Questions are required'
      }),
    scheduledAt: Joi.date().min('now')
  }),

  // Certificate generation validation
  generateCertificate: Joi.object({
    courseId: Joi.string().required(),
    studentId: Joi.string().required()
  })
};

// Middleware factory - creates validation middleware for any schema
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return next(new AppError(`Validation schema '${schemaName}' not found`, 500));
    }

    console.log(`📋 Validating ${schemaName}:`, req.body); // ✅ Debug log

    // Validate request body against schema
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Show all errors, not just first one
      stripUnknown: false // ✅ Don't remove unknown fields (keep all data)
    });

    if (error) {
      // Format validation errors for frontend
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      console.log('❌ Validation error:', errorMessage); // ✅ Debug log
      return next(new AppError(errorMessage, 400));
    }

    console.log('✅ Validation passed:', value); // ✅ Debug log
    req.body = value; // Replace body with validated/sanitized data
    next();
  };
};

module.exports = { validate, schemas };
