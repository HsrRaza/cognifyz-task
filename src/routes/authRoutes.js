const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfLoggedIn } = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { registerValidationRules, loginValidationRules, validate } = require('../middleware/validator');

// View Routes
router.get('/login', redirectIfLoggedIn, authController.renderLogin);
router.get('/register', redirectIfLoggedIn, authController.renderRegister);

// Actions (REST APIs)
router.post('/register', authRateLimiter, registerValidationRules, validate, authController.register);
router.post('/login', authRateLimiter, loginValidationRules, validate, authController.login);
router.get('/logout', authController.logout);

module.exports = router;
