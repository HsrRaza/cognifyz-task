const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Route root page
router.get('/', (req, res) => {
  // If user has a token, let authMiddleware redirect or let's redirect to dashboard
  const token = req.cookies ? req.cookies.token : null;
  if (token) {
    return res.redirect('/tasks');
  }
  res.redirect('/auth/login');
});

// Workspace Dashboard EJS View
router.get('/tasks', authMiddleware, taskController.renderDashboard);

// Legacy Task 1 & 2 POST flow (Direct EJS POST)
// Let's implement server-side validation inline here so it shows errors on direct form submits too!
const { body, validationResult } = require('express-validator');
router.post('/task', [
  body('title').trim().isLength({ min: 3 }).withMessage('Task Name/Title must be at least 3 characters long'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If validation fails, render a beautiful showTask page with the validation errors
    return res.render('showTask', {
      title: 'Validation Error - Smart Task Manager',
      task: {
        title: req.body.title || '',
        description: req.body.description || '',
        priority: req.body.priority || 'Medium',
        error: errors.array().map(e => e.msg).join(', ')
      },
      user: req.user || null
    });
  }
  next();
}, taskController.handleTaskDirectPost);

module.exports = router;
