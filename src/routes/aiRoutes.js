const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { apiRateLimiter } = require('../middleware/rateLimiter');

// Rate limiter & Auth guard
router.use(apiRateLimiter);
router.use(authMiddleware);

// Endpoints
router.post('/description', aiController.generateDescription);
router.post('/priority', aiController.suggestPriority);
router.get('/summary', aiController.getTasksSummary);

module.exports = router;
