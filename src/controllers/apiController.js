const Task = require('../models/Task');
const cacheService = require('../services/cacheService');

const apiController = {
  // GET /api/tasks - Retrieve all tasks for the authenticated user (with cache)
  async getTasks(req, res) {
    try {
      const userId = req.user.id;
      const cacheKey = `user:${userId}:tasks`;

      // Try fetching from cache
      const cachedTasks = await cacheService.get(cacheKey);
      if (cachedTasks) {
        console.log(`[Cache] Serving tasks from cache for user: ${userId}`);
        return res.json(cachedTasks);
      }

      // Query database
      console.log(`[Database] Querying tasks from DB for user: ${userId}`);
      const tasks = await Task.find({ user: userId }).sort({ createdAt: -1 });

      // Save to cache (TTL = 60s)
      await cacheService.set(cacheKey, tasks, 60);

      return res.json(tasks);
    } catch (err) {
      console.error('[API Controller] getTasks Error:', err.message);
      return res.status(500).json({ error: 'Server error retrieving tasks' });
    }
  },

  // GET /api/tasks/:id - Retrieve a single task by ID
  async getTaskById(req, res) {
    try {
      const taskId = req.params.id;
      const userId = req.user.id;

      const task = await Task.findOne({ _id: taskId, user: userId });
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.json(task);
    } catch (err) {
      console.error('[API Controller] getTaskById Error:', err.message);
      return res.status(500).json({ error: 'Server error retrieving task' });
    }
  },

  // POST /api/tasks - Create a new task (invalidates cache)
  async createTask(req, res) {
    try {
      const { title, description, priority, dueDate } = req.body;
      const userId = req.user.id;

      const newTask = new Task({
        title,
        description,
        priority: priority || 'Medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        user: userId
      });

      await newTask.save();

      // Invalidate user's tasks cache
      await cacheService.del(`user:${userId}:tasks`);
      console.log(`[Cache] Invalidated tasks cache for user: ${userId}`);

      return res.status(201).json(newTask);
    } catch (err) {
      console.error('[API Controller] createTask Error:', err.message);
      return res.status(500).json({ error: 'Server error creating task' });
    }
  },

  // PUT /api/tasks/:id - Update an existing task (invalidates cache)
  async updateTask(req, res) {
    try {
      const taskId = req.params.id;
      const userId = req.user.id;
      const { title, description, priority, completed, dueDate } = req.body;

      // Find task and verify ownership
      const task = await Task.findOne({ _id: taskId, user: userId });
      if (!task) {
        return res.status(404).json({ error: 'Task not found or unauthorized' });
      }

      // Update fields
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority;
      if (completed !== undefined) task.completed = completed;
      if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

      await task.save();

      // Invalidate user's tasks cache
      await cacheService.del(`user:${userId}:tasks`);
      console.log(`[Cache] Invalidated tasks cache for user: ${userId}`);

      return res.json(task);
    } catch (err) {
      console.error('[API Controller] updateTask Error:', err.message);
      return res.status(500).json({ error: 'Server error updating task' });
    }
  },

  // DELETE /api/tasks/:id - Delete a task (invalidates cache)
  async deleteTask(req, res) {
    try {
      const taskId = req.params.id;
      const userId = req.user.id;

      const result = await Task.deleteOne({ _id: taskId, user: userId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Task not found or unauthorized' });
      }

      // Invalidate user's tasks cache
      await cacheService.del(`user:${userId}:tasks`);
      console.log(`[Cache] Invalidated tasks cache for user: ${userId}`);

      return res.json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
      console.error('[API Controller] deleteTask Error:', err.message);
      return res.status(500).json({ error: 'Server error deleting task' });
    }
  }
};

module.exports = apiController;
