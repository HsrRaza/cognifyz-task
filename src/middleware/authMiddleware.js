const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Parse JWT token from cookies or authorization header
  let token = req.cookies ? req.cookies.token : null;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123!_cognifyz_task_manager');
    req.user = decoded; // Attach user payload ({ id, username, email })
    next();
  } catch (err) {
    res.clearCookie('token');
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    return res.redirect('/auth/login');
  }
};

const redirectIfLoggedIn = (req, res, next) => {
  const token = req.cookies ? req.cookies.token : null;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123!_cognifyz_task_manager');
      return res.redirect('/tasks'); // Redirect to dashboard
    } catch (err) {
      res.clearCookie('token');
    }
  }
  next();
};

module.exports = {
  authMiddleware,
  redirectIfLoggedIn
};
