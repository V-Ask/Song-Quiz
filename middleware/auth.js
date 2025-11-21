const { v4: uuidv4 } = require('uuid');
const { queries } = require('../database');

// Admin password (in production, this should be hashed and stored securely)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware to ensure user has a valid session
async function ensureUser(req, res, next) {
  let userId = req.cookies.userId;

  if (!userId) {
    userId = uuidv4();
    res.cookie('userId', userId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'strict'
    });
    await queries.createUser(userId);
  } else {
    await queries.createUser(userId);
  }

  req.userId = userId;
  next();
}

// Middleware to check admin authentication
function ensureAdmin(req, res, next) {
  const adminAuth = req.cookies.adminAuth;

  if (adminAuth !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Route to authenticate as admin
function loginAdmin(req, res) {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    res.cookie('adminAuth', ADMIN_PASSWORD, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'strict'
    });
    return res.json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid password' });
}

// Route to check if user is admin
function checkAdmin(req, res) {
  const adminAuth = req.cookies.adminAuth;
  res.json({ isAdmin: adminAuth === ADMIN_PASSWORD });
}

module.exports = { ensureUser, ensureAdmin, loginAdmin, checkAdmin, ADMIN_PASSWORD };
