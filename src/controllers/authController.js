const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (res, user) => {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email
  };
  
  const token = jwt.sign(
    payload, 
    process.env.JWT_SECRET || 'supersecretjwtkey123!_cognifyz_task_manager', 
    { expiresIn: '30d' }
  );

  // Set secure HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

const authController = {
  // Render login page
  renderLogin(req, res) {
    res.render('login', { title: 'Login - Smart Task Manager', error: null });
  },

  // Render register page
  renderRegister(req, res) {
    res.render('register', { title: 'Register - Smart Task Manager', error: null });
  },

  // Handle register submission (JSON API)
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res.status(400).json({
          errors: {
            username: userExists.username === username ? 'Username is already taken' : undefined,
            email: userExists.email === email ? 'Email is already registered' : undefined
          }
        });
      }

      // Create new user
      const user = new User({ username, email, password });
      await user.save();

      // Issue token and set cookie
      generateToken(res, user);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: { id: user._id, username: user.username, email: user.email }
      });
    } catch (err) {
      console.error('[Auth Controller] Registration Error:', err.message);
      return res.status(500).json({ error: 'Server error during registration' });
    }
  },

  // Handle login submission (JSON API)
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Issue token and set cookie
      generateToken(res, user);

      return res.json({
        success: true,
        message: 'Login successful',
        user: { id: user._id, username: user.username, email: user.email }
      });
    } catch (err) {
      console.error('[Auth Controller] Login Error:', err.message);
      return res.status(500).json({ error: 'Server error during login' });
    }
  },

  // Handle logout
  logout(req, res) {
    res.clearCookie('token');
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: 'Logged out successfully' });
    }
    res.redirect('/auth/login');
  }
};

module.exports = authController;
