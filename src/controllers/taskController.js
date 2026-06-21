const Task = require('../models/Task');

// In-memory array to fulfill the Task 2 requirement "let tasks = []"
let tempTasks = [];

const taskController = {
  // Render Main Dashboard
  renderDashboard(req, res) {
    res.render('dashboard', {
      title: 'Dashboard - Smart Task Manager',
      user: req.user
    });
  },

  // Legacy Task 1 & 2 flow: Form -> POST /task -> Server -> EJS -> Show Task
  async handleTaskDirectPost(req, res) {
    const { title, description, priority } = req.body;
    
    // Add to in-memory array (Task 2 Requirement)
    const newTask = {
      id: Date.now().toString(),
      title,
      description,
      priority: priority || 'Medium',
      completed: false,
      createdAt: new Date()
    };
    tempTasks.push(newTask);

    // If user is logged in, let's also save to DB for their convenience, but EJS renders this task
    if (req.user) {
      try {
        const dbTask = new Task({
          title,
          description,
          priority: priority || 'Medium',
          user: req.user.id
        });
        await dbTask.save();
      } catch (err) {
        console.error('[Task Controller] Direct post DB backup failed:', err.message);
      }
    }

    // Render EJS view showing the single created task details (Task 1 Flow)
    res.render('showTask', {
      title: 'Task Created - Smart Task Manager',
      task: newTask,
      user: req.user || null
    });
  }
};

module.exports = taskController;
