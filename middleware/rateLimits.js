const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Global rate limit for all endpoints
// Prevents general abuse across the entire application
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limit for authentication endpoints
// Prevents brute force attacks on admin login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests
});

// Rate limit for submission endpoints (songs and votes)
// Prevents spam submissions
const submissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 submissions per minute
  message: 'Too many submissions from this IP, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Progressive slow down for submission endpoints
// Adds delays before hard blocking to provide better UX
const submissionSpeedLimiter = slowDown({
  windowMs: 1 * 60 * 1000, // 1 minute
  delayAfter: 5, // Allow 5 requests per minute at full speed
  delayMs: (hits) => hits * 200, // Add 200ms delay per request after delayAfter
});

// Lighter rate limit for read-only endpoints
// Allows more frequent polling for status/results
const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  authLimiter,
  submissionLimiter,
  submissionSpeedLimiter,
  readLimiter,
};
