const rateLimit = require('express-rate-limit');

// Rate limiter for general API routes
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Stricter rate limiter for authentication routes (Login/Register)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 authentication requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login or registration attempts. Please try again after 15 minutes.'
  }
});

module.exports = {
  apiRateLimiter,
  authRateLimiter
};
