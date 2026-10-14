/**
 * ThermalMind API Rate Limiting Middleware
 * Protects authentication and heavy computational endpoints against abuse.
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Strict rate limiter for authentication endpoints (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 login attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. For security reasons, please try again in 15 minutes.'
  }
});

// Heavy AI training & CSV upload rate limiter
const heavyJobLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Heavy compute job limit reached. Please wait a minute before submitting again.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  heavyJobLimiter
};
