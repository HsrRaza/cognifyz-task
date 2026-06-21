const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { taskValidationRules, validate } = require('../middleware/validator');

// Apply general API rate limiting and check authentication for all task endpoints
router.use(apiRateLimiter);
router.use(authMiddleware);

// Routes mapping
router.get('/', apiController.getTasks);
router.get('/:id', apiController.getTaskById);
router.post('/', taskValidationRules, validate, apiController.createTask);
router.put('/:id', taskValidationRules, validate, apiController.updateTask);
router.delete('/:id', apiController.deleteTask);

module.exports = router;
