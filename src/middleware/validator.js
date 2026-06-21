const { body, validationResult } = require('express-validator');

// Task Validation Schema
const taskValidationRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task Name/Title is required')
    .isLength({ min: 3 }).withMessage('Task Name/Title must be at least 3 characters long'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High']).withMessage('Priority must be either Low, Medium, or High'),
  body('dueDate')
    .optional()
    .custom((value) => {
      if (value && isNaN(Date.parse(value))) {
        throw new Error('Due Date must be a valid date');
      }
      return true;
    })
];

// Register Validation Schema
const registerValidationRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Login Validation Schema
const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Interceptor middleware for validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  // Format validation errors to a simple map: { field: message }
  const formattedErrors = {};
  errors.array().forEach(err => {
    formattedErrors[err.path] = err.msg;
  });

  return res.status(400).json({ errors: formattedErrors });
};

module.exports = {
  taskValidationRules,
  registerValidationRules,
  loginValidationRules,
  validate
};
