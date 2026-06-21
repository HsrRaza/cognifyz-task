const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

// Import routes
const viewRoutes = require('./routes/viewRoutes');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev')); // Logging (Task 8)
app.use(cors());        // CORS (Task 8)

// Helmet security setup with adjusted CSP for external CDNs (Task 8)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://api.open-meteo.com"]
    }
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder
app.use(express.static(path.join(__dirname, '../public')));

// Mount routes
app.use('/', viewRoutes);
app.use('/auth', authRoutes);
app.use('/api/tasks', apiRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler] Caught error:', err.message);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(status).json({ error: message });
  }

  res.status(status).render('showTask', {
    title: 'Error - Smart Task Manager',
    task: {
      title: 'An Error Occurred',
      description: message,
      priority: 'High',
      error: `Error Code ${status}`
    },
    user: req.user || null
  });
});

module.exports = app;
