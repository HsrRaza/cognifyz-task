const { GoogleGenerativeAI } = require('@google/generative-ai');

let aiModel = null;
let useFallback = true;

// Initialize Google Gemini if key is provided
if (process.env.GEMINI_API_KEY) {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-1.5-flash as a fast model
    aiModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    useFallback = false;
    console.log('[AI Service] Gemini API initialized successfully.');
  } catch (err) {
    console.error('[AI Service] Error initializing Gemini API:', err.message);
  }
} else {
  console.log('[AI Service] GEMINI_API_KEY is missing. Using local AI Simulation Fallback.');
}

const aiService = {
  /**
   * Automatically generate a task description based on its title
   * @param {string} title 
   * @returns {Promise<string>}
   */
  async generateDescription(title) {
    if (!title || title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters long to generate a description.');
    }

    if (!useFallback && aiModel) {
      try {
        const prompt = `Write a professional, concise task description for a team project with the title: "${title}". Limit it to 3-4 bullet points indicating Goals, Context, and Acceptance Criteria. Do not write introductory or concluding remarks.`;
        const result = await aiModel.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err) {
        console.error('[AI Service] Gemini description generation failed:', err.message);
      }
    }

    // Local Fallback Description Generator
    console.log('[AI Service] [Simulation] Generating description for:', title);
    const lowercaseTitle = title.toLowerCase();
    
    let description = `### Task Overview\nThis task is created to address: "${title}".\n\n### Goals\n`;
    if (lowercaseTitle.includes('bug') || lowercaseTitle.includes('fix') || lowercaseTitle.includes('error')) {
      description += `- Investigate and reproduce the reported issue in "${title}".\n- Identify root cause and draft a hotfix.\n- Write regression tests to verify the fix works.`;
    } else if (lowercaseTitle.includes('design') || lowercaseTitle.includes('css') || lowercaseTitle.includes('ui') || lowercaseTitle.includes('theme')) {
      description += `- Create modern layouts and mockups for the requested UI features.\n- Implement high-fidelity styles with fluid responsiveness.\n- Review animations and states across modern desktop and mobile browsers.`;
    } else if (lowercaseTitle.includes('auth') || lowercaseTitle.includes('login') || lowercaseTitle.includes('user')) {
      description += `- Secure input credentials and hash passwords using bcrypt.\n- Validate registration/login payloads on both client and server.\n- Issue secure JWT cookies and configure protected route middlewares.`;
    } else {
      description += `- Define scope and list key deliverables for "${title}".\n- Execute implementation aligning with clean code patterns.\n- Conduct peer review and merge updates to the main branch.`;
    }
    
    description += `\n\n### Acceptance Criteria\n- Functionality operates error-free.\n- Responsive design works across mobile and desktop.`;
    return description;
  },

  /**
   * Suggest task priority based on title and description
   * @param {string} title 
   * @param {string} description 
   * @returns {Promise<string>} Low, Medium, High
   */
  async suggestPriority(title, description) {
    const combinedText = `${title} ${description}`.toLowerCase();
    
    if (!useFallback && aiModel) {
      try {
        const prompt = `Analyze this task title and description. Output exactly ONE word representing the suggested priority level: "Low", "Medium", or "High".
        Task Title: "${title}"
        Task Description: "${description}"`;
        const result = await aiModel.generateContent(prompt);
        const priority = result.response.text().trim();
        if (['Low', 'Medium', 'High'].includes(priority)) {
          return priority;
        }
      } catch (err) {
        console.error('[AI Service] Gemini priority suggestion failed:', err.message);
      }
    }

    // Local Fallback Priority Suggestion
    const highKeywords = ['crash', 'urgent', 'critical', 'broken', 'fail', 'error', 'production', 'security', 'vulnerability', 'blocked', 'hotfix', 'down'];
    const lowKeywords = ['nice to have', 'suggestion', 'idea', 'cleanup', 'optional', 'documentation', 'doc', 'typo', 'refactor', 'future'];

    const hasHigh = highKeywords.some(keyword => combinedText.includes(keyword));
    const hasLow = lowKeywords.some(keyword => combinedText.includes(keyword));

    if (hasHigh) return 'High';
    if (hasLow) return 'Low';
    return 'Medium';
  },

  /**
   * Summarize a list of tasks
   * @param {Array} tasks 
   * @returns {Promise<string>}
   */
  async summarizeTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      return "You don't have any tasks in your list yet. Start by creating a task to boost your productivity!";
    }

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'High');

    const summaryData = {
      total: tasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
      highPriority: highPriorityTasks.length,
      tasksList: pendingTasks.slice(0, 5).map(t => `- ${t.title} (${t.priority} priority)`).join('\n')
    };

    if (!useFallback && aiModel) {
      try {
        const prompt = `Summarize the current task status for a user and suggest actionable steps to improve productivity. Here is the metadata:
        Total tasks: ${summaryData.total}
        Pending: ${summaryData.pending}
        Completed: ${summaryData.completed}
        High priority pending: ${summaryData.highPriority}
        Top pending tasks:
        ${summaryData.tasksList}
        Keep the summary to 3 sentences, professional, encouraging, and clear.`;
        const result = await aiModel.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err) {
        console.error('[AI Service] Gemini summary failed:', err.message);
      }
    }

    // Local Fallback Summary Generator
    let motivation = '';
    if (summaryData.highPriority > 0) {
      motivation = `Focus on resolving your ${summaryData.highPriority} high priority tasks first to clear core bottlenecks.`;
    } else if (summaryData.pending > 0) {
      motivation = `Try addressing one of your pending tasks like "${pendingTasks[0].title}" to build momentum.`;
    } else {
      motivation = `Great job! You have cleared all your tasks. Enjoy your productivity milestone!`;
    }

    return `Dashboard Summary: You have ${summaryData.total} total tasks (${summaryData.completed} completed, ${summaryData.pending} pending). ${motivation} Keep up the great work!`;
  }
};

module.exports = aiService;
