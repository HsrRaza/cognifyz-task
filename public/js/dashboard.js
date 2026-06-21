/**
 * Client-Side Dashboard Controller - CogniTask SaaS
 */

// Cache of tasks locally to avoid redundant fetches and enable instant filters
let localTasks = [];
let todayWeather = null;

// Initial Load on page mount
document.addEventListener('DOMContentLoaded', async () => {
  await fetchWeatherForecast();
  await loadTasks();
});

// Fetch Weather for New York (default) as an external API demo (Task 7)
async function fetchWeatherForecast() {
  try {
    // Open-Meteo is free and requires NO api key!
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true');
    const data = await res.json();
    if (data && data.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      const emoji = getWeatherEmoji(code);
      todayWeather = `${emoji} ${temp}°C`;
      console.log('[Weather API] Forecast loaded:', todayWeather);
    }
  } catch (err) {
    console.warn('[Weather API] Fetch failed, using fallback:', err.message);
    todayWeather = '☀️ 21°C'; // Dev fallback
  }
}

// Convert Open-Meteo weather code to emoji
function getWeatherEmoji(code) {
  if (code === 0) return '☀️'; // Sunny
  if (code <= 3) return '⛅';  // Partly cloudy
  if (code <= 48) return '🌫️'; // Foggy
  if (code <= 67) return '🌧️'; // Rain
  if (code <= 77) return '❄️'; // Snow
  if (code <= 82) return '🌦️'; // Showers
  return '⛈️';                  // Thunderstorm
}

// Load and render tasks from backend REST API
async function loadTasks() {
  const loadingSkeleton = document.getElementById('tasks-loading-skeleton');
  const tasksContainer = document.getElementById('tasks-container');
  const noTasksPlaceholder = document.getElementById('no-tasks-placeholder');

  try {
    const response = await fetch('/api/tasks');
    if (!response.ok) {
      throw new Error('Failed to retrieve workspace tasks.');
    }
    localTasks = await response.json();

    // Hide loader
    loadingSkeleton.classList.add('hidden');
    
    renderTasksList();
    updateWorkspaceStats();
  } catch (err) {
    console.error('[Dashboard] error loading tasks:', err.message);
    loadingSkeleton.innerHTML = `
      <div class="col-span-full text-center py-10 text-red-400">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
        <p>Error retrieving tasks. Please reload page.</p>
      </div>
    `;
  }
}

// Render local tasks list to DOM
function renderTasksList() {
  const tasksContainer = document.getElementById('tasks-container');
  const noTasksPlaceholder = document.getElementById('no-tasks-placeholder');
  
  tasksContainer.innerHTML = '';
  
  if (localTasks.length === 0) {
    tasksContainer.classList.add('hidden');
    noTasksPlaceholder.classList.remove('hidden');
    return;
  }

  noTasksPlaceholder.classList.add('hidden');
  tasksContainer.classList.remove('hidden');

  localTasks.forEach(task => {
    const card = createTaskCardDOM(task);
    tasksContainer.appendChild(card);
  });
}

// Create Task card element
function createTaskCardDOM(task) {
  const isDueToday = checkIsDueToday(task.dueDate);
  
  const card = document.createElement('div');
  card.id = `task-card-${task._id}`;
  card.className = `glass-card p-5 rounded-2xl relative flex flex-col justify-between h-52 animate-fade-in ${task.completed ? 'opacity-60 border-slate-900' : ''}`;
  
  // Priority badge styling
  let priorityBadgeClass = '';
  if (task.priority === 'High') priorityBadgeClass = 'bg-red-500/10 text-red-400 ring-red-500/20';
  else if (task.priority === 'Medium') priorityBadgeClass = 'bg-amber-500/10 text-amber-400 ring-amber-500/20';
  else priorityBadgeClass = 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20';

  const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  card.innerHTML = `
    <!-- Top Row -->
    <div class="flex items-start justify-between gap-x-2">
      <div class="flex items-center gap-x-2">
        <!-- Complete/Check Toggle Button (Task 4 DOM update) -->
        <button onclick="toggleTaskCompletion('${task._id}', ${task.completed})" 
                class="h-5 w-5 rounded-full border flex items-center justify-center transition ${task.completed ? 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600' : 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 text-transparent hover:text-indigo-400'}">
          <i class="fa-solid fa-check text-xxs"></i>
        </button>
        <h4 class="text-base font-bold text-white tracking-tight ${task.completed ? 'line-through text-slate-500' : ''}">${escapeHTML(task.title)}</h4>
      </div>
      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xxs font-medium ring-1 ring-inset ${priorityBadgeClass}">
        ${task.priority}
      </span>
    </div>

    <!-- Description -->
    <p class="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed ${task.completed ? 'text-slate-600' : ''}">
      ${escapeHTML(task.description)}
    </p>

    <!-- Bottom Actions Row -->
    <div class="flex items-center justify-between border-t border-slate-800/60 pt-3.5 mt-auto">
      <div class="flex items-center gap-x-2 text-xxs text-slate-500 font-medium">
        <% if (task.dueDate) { %>
          <i class="fa-regular fa-calendar-check text-indigo-400/80"></i>
          <span class="${isDueToday ? 'text-amber-400 font-bold' : ''}">${formattedDate}</span>
          ${isDueToday && todayWeather ? `<span class="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded ring-1 ring-indigo-500/20 text-[10px] ml-1 flex items-center gap-0.5" title="Weather for task due today"><i class="fa-solid fa-cloud-sun"></i> ${todayWeather}</span>` : ''}
        <% } else { %>
          <i class="fa-regular fa-calendar text-slate-700"></i>
          <span>No deadline</span>
        <% } %>
      </div>

      <div class="flex items-center gap-x-2">
        <button onclick="editTask('${task._id}')" class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Edit Task">
          <i class="fa-solid fa-pen-to-square text-xs"></i>
        </button>
        <button onclick="deleteTask('${task._id}')" class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition" title="Delete Task">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    </div>
  `;
  return card;
}

// Check if a date string is today
function checkIsDueToday(dateStr) {
  if (!dateStr) return false;
  const taskDate = new Date(dateStr);
  const today = new Date();
  return taskDate.getDate() === today.getDate() &&
         taskDate.getMonth() === today.getMonth() &&
         taskDate.getFullYear() === today.getFullYear();
}

// Update stats panels in sidebar (Task 3 & 4)
function updateWorkspaceStats() {
  const total = localTasks.length;
  const completed = localTasks.filter(t => t.completed).length;
  const pending = total - completed;
  const high = localTasks.filter(t => !t.completed && t.priority === 'High').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Animate counters
  animateCount('stat-total', total);
  animateCount('stat-completed', completed);
  animateCount('stat-pending', pending);
  animateCount('stat-high', high);
  
  document.getElementById('stat-completion-pct').textContent = `${pct}%`;
  document.getElementById('stat-progress-bar').style.width = `${pct}%`;
}

function animateCount(elemId, finalVal) {
  const el = document.getElementById(elemId);
  if (!el) return;
  const startVal = parseInt(el.textContent) || 0;
  if (startVal === finalVal) {
    el.textContent = finalVal;
    return;
  }
  
  let currentVal = startVal;
  const duration = 400; // ms
  const stepTime = Math.abs(Math.floor(duration / (finalVal - startVal || 1)));
  const timer = setInterval(() => {
    if (startVal < finalVal) {
      currentVal++;
    } else {
      currentVal--;
    }
    el.textContent = currentVal;
    if (currentVal === finalVal) {
      clearInterval(timer);
    }
  }, Math.max(stepTime, 20));
}

// Toggle Task Creation modal
function toggleTaskModal(show, isEdit = false) {
  const modal = document.getElementById('task-modal');
  const modalTitle = document.getElementById('modal-title');
  const errorBanner = document.getElementById('modal-error-banner');
  const form = document.getElementById('task-form');

  errorBanner.classList.add('hidden');
  
  if (show) {
    if (!isEdit) {
      // Clear form for new task
      form.reset();
      document.getElementById('task-id').value = '';
      modalTitle.innerHTML = '<i class="fa-solid fa-circle-plus text-indigo-500"></i> Create Workspace Task';
      updateCharCounter('task-title', 'title-char-counter', 80);
      updateCharCounter('task-desc', 'desc-char-counter', 500);
    }
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

// Save Task (Create or Update AJAX fetch - Task 4 DOM update without refresh)
async function saveTask(event) {
  event.preventDefault();

  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-duedate').value;
  const errorBanner = document.getElementById('modal-error-banner');
  const saveBtn = document.getElementById('modal-submit-btn');

  // Reset error styles
  hideInputErrors();
  errorBanner.classList.add('hidden');

  let hasErrors = false;
  if (title.length < 3) {
    showInputError('task-title', 'Task title must be at least 3 characters.');
    hasErrors = true;
  }
  if (description.length < 10) {
    showInputError('task-desc', 'Description must be at least 10 characters.');
    hasErrors = true;
  }

  if (hasErrors) return;

  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-1.5"></i> Saving...';

    const url = id ? `/api/tasks/${id}` : '/api/tasks';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description, priority, dueDate })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.errors) {
        Object.keys(data.errors).forEach(key => {
          showInputError(`task-${key}`, data.errors[key]);
        });
        throw new Error('Validation failed. Please verify input fields.');
      }
      throw new Error(data.error || 'Failed to save task.');
    }

    // Success: Update local tasks list
    if (id) {
      // Edit replacement
      localTasks = localTasks.map(t => t._id === id ? data : t);
    } else {
      // Append new task at front
      localTasks.unshift(data);
    }

    renderTasksList();
    updateWorkspaceStats();
    toggleTaskModal(false);
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Task';
  }
}

// Edit task action (fetch data and populate modal)
async function editTask(id) {
  try {
    const response = await fetch(`/api/tasks/${id}`);
    if (!response.ok) throw new Error('Task retrieval failed');
    const task = await response.json();

    document.getElementById('task-id').value = task._id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description;
    document.getElementById('task-priority').value = task.priority;
    
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      document.getElementById('task-duedate').value = `${year}-${month}-${day}`;
    } else {
      document.getElementById('task-duedate').value = '';
    }

    // Trigger counters
    updateCharCounter('task-title', 'title-char-counter', 80);
    updateCharCounter('task-desc', 'desc-char-counter', 500);

    // Toggle Modal
    toggleTaskModal(true, true);
    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-500"></i> Edit Workspace Task';
  } catch (err) {
    alert('Error fetching task: ' + err.message);
  }
}

// Delete Task AJAX (Task 4 & 5 instant DOM removal with fade-out animation)
async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  const card = document.getElementById(`task-card-${id}`);
  
  try {
    // Add fade-out classes first (instant UI update)
    if (card) {
      card.classList.add('scale-95', 'opacity-0', 'transition-all', 'duration-300');
    }

    const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Delete request failed.');
    }

    // Remove from local cache and complete removal from DOM
    localTasks = localTasks.filter(t => t._id !== id);
    
    setTimeout(() => {
      renderTasksList();
      updateWorkspaceStats();
    }, 250); // wait for CSS transition

  } catch (err) {
    // Rollback styling if error
    if (card) {
      card.classList.remove('scale-95', 'opacity-0');
    }
    alert('Error deleting task: ' + err.message);
  }
}

// Toggle completion status (AJAX fetch - instant UI change)
async function toggleTaskCompletion(id, currentStatus) {
  const card = document.getElementById(`task-card-${id}`);
  
  try {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: !currentStatus })
    });
    const updatedTask = await response.json();

    if (!response.ok) throw new Error('Toggle request failed');

    // Update local cache
    localTasks = localTasks.map(t => t._id === id ? updatedTask : t);
    
    renderTasksList();
    updateWorkspaceStats();
  } catch (err) {
    alert('Error toggling task completion: ' + err.message);
  }
}

// Instant local filtering by search query & filter states (no server hit)
function filterTasks() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const priority = document.getElementById('filter-priority').value;
  const status = document.getElementById('filter-status').value;
  
  const cards = document.getElementById('tasks-container').children;

  localTasks.forEach((task, idx) => {
    const card = document.getElementById(`task-card-${task._id}`);
    if (!card) return;

    let matchesSearch = task.title.toLowerCase().includes(query) || 
                        task.description.toLowerCase().includes(query);
    let matchesPriority = (priority === 'ALL') || (task.priority === priority);
    let matchesStatus = (status === 'ALL') || 
                        (status === 'COMPLETED' && task.completed) || 
                        (status === 'PENDING' && !task.completed);

    if (matchesSearch && matchesPriority && matchesStatus) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-priority').value = 'ALL';
  document.getElementById('filter-status').value = 'ALL';
  filterTasks();
}

// Live Input character counter utility (Task 4)
function updateCharCounter(inputId, counterId, maxLen) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (input && counter) {
    const currentLen = input.value.length;
    counter.textContent = `${currentLen} / ${maxLen} chars`;
    if (currentLen >= maxLen) {
      counter.className = 'text-xxs text-red-500 font-mono font-bold';
    } else if (currentLen >= maxLen * 0.8) {
      counter.className = 'text-xxs text-amber-500 font-mono';
    } else {
      counter.className = 'text-xxs text-slate-500 font-mono';
    }
  }
}

// AI Service Invokers (Task 7)

// Trigger AI description generation based on title
async function triggerAIDescription() {
  const title = document.getElementById('task-title').value.trim();
  const descBtn = document.getElementById('ai-desc-btn');
  const descArea = document.getElementById('task-desc');

  if (title.length < 3) {
    alert('Please enter a task name (minimum 3 characters) first.');
    return;
  }

  try {
    descBtn.disabled = true;
    descBtn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-1"></i> Analyzing...';

    const res = await fetch('/api/ai/description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'AI generation failed');
    
    descArea.value = data.description;
    updateCharCounter('task-desc', 'desc-char-counter', 500);
  } catch (err) {
    alert('AI Helper error: ' + err.message);
  } finally {
    descBtn.disabled = false;
    descBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles animate-pulse"></i> AI Auto-Fill';
  }
}

// Trigger AI priority suggestion
async function triggerAIPriority() {
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const priorityBtn = document.getElementById('ai-priority-btn');
  const prioritySelect = document.getElementById('task-priority');

  if (!title || !desc) {
    alert('Please provide both task title and description first.');
    return;
  }

  try {
    priorityBtn.disabled = true;
    priorityBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';

    const res = await fetch('/api/ai/priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc })
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'AI evaluation failed');

    prioritySelect.value = data.priority;
  } catch (err) {
    alert('AI Helper error: ' + err.message);
  } finally {
    priorityBtn.disabled = false;
    priorityBtn.innerHTML = '<i class="fa-solid fa-brain"></i> Suggest';
  }
}

// Trigger AI tasks overview summary
async function triggerAISummary() {
  const aiBox = document.getElementById('ai-summary-text');
  
  try {
    aiBox.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-1 text-indigo-400"></i> Running AI analytics...';
    
    const res = await fetch('/api/ai/summary');
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'AI summary failed');

    aiBox.textContent = `"${data.summary}"`;
  } catch (err) {
    aiBox.textContent = `"Failed to run analytics: ${err.message}"`;
  }
}

// Trigger direct EJS POST flow (Task 1 & 2 Demo)
function triggerDirectFormPost() {
  const form = document.getElementById('task-form');
  
  // Change form method/action so it bypasses REST API and does a browser direct POST
  form.action = '/task';
  form.method = 'POST';
  form.submit();
}

// Form validation UI styling helpers
function showInputError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);
  if (input && errorEl) {
    input.classList.add('ring-red-500', 'focus:ring-red-500');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function hideInputErrors() {
  ['task-title', 'task-desc'].forEach(id => {
    const input = document.getElementById(id);
    const errorEl = document.getElementById(`${id}-error`);
    if (input && errorEl) {
      input.classList.remove('ring-red-500', 'focus:ring-red-500');
      errorEl.classList.add('hidden');
    }
  });
}

// HTML escape helper to prevent XSS
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
