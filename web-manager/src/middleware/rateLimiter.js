const rateLimit = require('express-rate-limit');
const config = require('../utils/config');

/**
 * Rate limiter for update-related endpoints
 */
const updateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many update requests from this IP, please try again later.',
    retry_after: config.rateLimit.windowMs / 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many update requests from this IP, please try again later.',
      retry_after: config.rateLimit.windowMs / 1000,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * General API rate limiter (more permissive)
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many API requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  updateLimiter,
  apiLimiter
};
