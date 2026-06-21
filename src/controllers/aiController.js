const aiService = require('../services/aiService');
const Task = require('../models/Task');

const aiController = {
  // POST /api/ai/description - Generate detailed description outline from a title
  async generateDescription(req, res) {
    try {
      const { title } = req.body;
      if (!title || title.trim().length < 3) {
        return res.status(400).json({ error: 'Task Title must be at least 3 characters long to generate a description.' });
      }

      const description = await aiService.generateDescription(title);
      return res.json({ description });
    } catch (err) {
      console.error('[AI Controller] generateDescription Error:', err.message);
      return res.status(500).json({ error: err.message || 'Server error generating AI description.' });
    }
  },

  // POST /api/ai/priority - Suggest low/medium/high priority based on details
  async suggestPriority(req, res) {
    try {
      const { title, description } = req.body;
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and Description are required to suggest priority.' });
      }

      const priority = await aiService.suggestPriority(title, description);
      return res.json({ priority });
    } catch (err) {
      console.error('[AI Controller] suggestPriority Error:', err.message);
      return res.status(500).json({ error: 'Server error suggesting AI priority.' });
    }
  },

  // GET /api/ai/summary - Summarize all active tasks for the authenticated user
  async getTasksSummary(req, res) {
    try {
      const userId = req.user.id;
      // Get all tasks for the user
      const tasks = await Task.find({ user: userId });
      const summary = await aiService.summarizeTasks(tasks);
      return res.json({ summary });
    } catch (err) {
      console.error('[AI Controller] getTasksSummary Error:', err.message);
      return res.status(500).json({ error: 'Server error generating AI task summary.' });
    }
  }
};

module.exports = aiController;
