/**
 * Client-Side Authentication Helper
 */

// Login Submit Handler
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const submitBtn = document.getElementById('submit-btn');
  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');

  // Basic Validation
  if (!email || !password) {
    showError('Email and Password are required.');
    return;
  }

  try {
    setLoading(true);
    errorBanner.classList.add('hidden');

    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Invalid credentials or validation failed');
    }

    // Success - redirect to tasks workspace
    window.location.href = '/tasks';
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-2"></i> Signing in...';
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  }
}

// Register Submit Handler
async function handleRegisterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const submitBtn = document.getElementById('submit-btn');
  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');

  // Reset errors
  errorBanner.classList.add('hidden');
  errorMessage.innerHTML = '';
  hideFieldErrors();

  let hasErrors = false;

  // Validation checks
  if (username.length < 3) {
    showFieldError('username', 'Username must be at least 3 characters.');
    hasErrors = true;
  }
  if (!validateEmail(email)) {
    showFieldError('email', 'Please enter a valid email address.');
    hasErrors = true;
  }
  if (password.length < 6) {
    showFieldError('password', 'Password must be at least 6 characters.');
    hasErrors = true;
  }

  if (hasErrors) return;

  try {
    setLoading(true);

    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.errors) {
        // Display validation errors on fields
        Object.keys(data.errors).forEach(field => {
          if (data.errors[field]) {
            showFieldError(field, data.errors[field]);
          }
        });
        throw new Error('Please resolve validation errors below.');
      }
      throw new Error(data.error || 'Registration failed');
    }

    // Success - redirect to workspace
    window.location.href = '/tasks';
  } catch (err) {
    errorMessage.textContent = err.message;
    errorBanner.classList.remove('hidden');
  } finally {
    setLoading(false);
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-2"></i> Registering...';
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  }
}

// Field validation UI handlers
function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-validation-err`);
  const inputEl = document.getElementById(fieldId);
  if (errorEl && inputEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    inputEl.classList.add('ring-red-500', 'focus:ring-red-500');
  }
}

function hideFieldErrors() {
  ['username', 'email', 'password'].forEach(fieldId => {
    const errorEl = document.getElementById(`${fieldId}-validation-err`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl && inputEl) {
      errorEl.classList.add('hidden');
      inputEl.classList.remove('ring-red-500', 'focus:ring-red-500');
    }
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Live Password Strength Meter
function checkPasswordStrength(password) {
  const container = document.getElementById('strength-container');
  const label = document.getElementById('strength-label');
  const bar = document.getElementById('strength-bar');
  const criteria = document.getElementById('strength-criteria');

  if (!password) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  let score = 0;
  
  // Rule 1: Length >= 6
  if (password.length >= 6) score++;
  // Rule 2: Contains lowercase letter
  if (/[a-z]/.test(password)) score++;
  // Rule 3: Contains uppercase letter
  if (/[A-Z]/.test(password)) score++;
  // Rule 4: Contains number
  if (/[0-9]/.test(password)) score++;
  // Rule 5: Contains special character
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Update Strength Meter GUI
  if (score <= 2) {
    // Weak
    label.textContent = 'Weak';
    label.className = 'font-bold text-red-400';
    bar.style.width = '33%';
    bar.className = 'strength-bar bg-red-500 h-1 rounded-full';
    criteria.textContent = 'Add mixed case & digits';
  } else if (score <= 4) {
    // Medium
    label.textContent = 'Medium';
    label.className = 'font-bold text-amber-400';
    bar.style.width = '66%';
    bar.className = 'strength-bar bg-amber-500 h-1 rounded-full';
    criteria.textContent = 'Add symbols/uppercase';
  } else {
    // Strong
    label.textContent = 'Strong';
    label.className = 'font-bold text-emerald-400';
    bar.style.width = '100%';
    bar.className = 'strength-bar bg-emerald-500 h-1 rounded-full';
    criteria.textContent = 'Excellent complexity!';
  }
}
