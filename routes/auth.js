const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { queries } = require('../database');
const { ensureAuth } = require('../middleware/auth');
const emailConfig = require('../config/email');

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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always return same message to prevent email enumeration
    const account = await queries.getAccountByEmail(email);
    if (!account) {
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
    await queries.createPasswordResetToken(token, account.id, expiresAt);

    const resetUrl = `${emailConfig.appUrl}/api/auth/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });

    await transporter.sendMail({
      from: emailConfig.from,
      to: email,
      subject: 'Song Quiz - Password Reset',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset for your Song Quiz account (<strong>${account.username}</strong>).</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `
    });

    res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// GET /api/auth/reset-password - Serve reset form
router.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('Invalid reset link');
    }

    const resetToken = await queries.getPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).send('Invalid or expired reset link');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > resetToken.expires_at) {
      return res.status(400).send('This reset link has expired');
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Song Quiz</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="container">
          <header><h1>Song Quiz</h1></header>
          <main>
            <div class="card">
              <h2>Reset Password</h2>
              <form id="resetForm">
                <div class="form-group">
                  <label for="newPassword">New Password</label>
                  <input type="password" id="newPassword" required placeholder="At least 6 characters" minlength="6">
                </div>
                <div class="form-group">
                  <label for="confirmPassword">Confirm Password</label>
                  <input type="password" id="confirmPassword" required placeholder="Repeat your password">
                </div>
                <button type="submit" class="btn btn-primary">Reset Password</button>
                <div id="message" class="hidden" style="margin-top:1rem;"></div>
              </form>
            </div>
          </main>
          <footer><span class="version">v2.0.0</span></footer>
        </div>
        <script>
          document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            const msgEl = document.getElementById('message');

            if (password !== confirm) {
              msgEl.textContent = 'Passwords do not match';
              msgEl.className = 'error-message';
              return;
            }

            try {
              const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: '${token}', password })
              });
              const data = await res.json();
              if (res.ok) {
                msgEl.textContent = 'Password reset successful! Redirecting to login...';
                msgEl.className = 'status-message success';
                msgEl.classList.remove('hidden');
                setTimeout(() => window.location.href = '/dashboard', 2000);
              } else {
                msgEl.textContent = data.error || 'Reset failed';
                msgEl.className = 'error-message';
                msgEl.classList.remove('hidden');
              }
            } catch {
              msgEl.textContent = 'Reset failed';
              msgEl.className = 'error-message';
              msgEl.classList.remove('hidden');
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Reset password page error:', error);
    res.status(500).send('Something went wrong');
  }
});

// POST /api/auth/reset-password - Process password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const resetToken = await queries.getPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > resetToken.expires_at) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await queries.updateAccountPassword(resetToken.account_id, passwordHash);
    await queries.markResetTokenUsed(token);
    await queries.deleteSessionsByAccount(resetToken.account_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
