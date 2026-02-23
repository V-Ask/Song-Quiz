const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { queries } = require('../database');
const { ensureAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUsername = await queries.getAccountByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const existingEmail = await queries.getAccountByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const accountId = uuidv4();

    await queries.createAccount(accountId, username, email, passwordHash, displayName);

    // Auto-login after registration
    const sessionId = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
    await queries.createSession(sessionId, accountId, expiresAt);

    res.cookie('sessionToken', sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'strict'
    });

    res.json({ success: true, account: { id: accountId, username, displayName } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const account = await queries.getAccountByUsername(username);
    if (!account) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionId = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    await queries.createSession(sessionId, account.id, expiresAt);

    res.cookie('sessionToken', sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'strict'
    });

    res.json({ success: true, account: { id: account.id, username: account.username, displayName: account.display_name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', ensureAuth, async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    await queries.deleteSession(sessionToken);
    res.clearCookie('sessionToken');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      return res.json({ authenticated: false });
    }

    const session = await queries.getSession(sessionToken);
    if (!session || Math.floor(Date.now() / 1000) > session.expires_at) {
      return res.json({ authenticated: false });
    }

    const account = await queries.getAccountById(session.account_id);
    if (!account) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      account: { id: account.id, username: account.username, displayName: account.display_name }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.json({ authenticated: false });
  }
});

module.exports = router;
