const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const { initializeDatabase, queries } = require('./database');
const { ensureUser, loginAdmin, checkAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for inline scripts in frontend
}));

// Initialize database
initializeDatabase();

// Auth routes
app.post('/api/admin/login', loginAdmin);
app.get('/api/admin/check', checkAdmin);

// API routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/votes', require('./routes/votes'));

// Get current flow info (for all users)
app.get('/api/flow', ensureUser, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();
    if (!flow) {
      return res.json({ phase: 0, theme: null });
    }

    const hasSubmitted = await queries.hasUserSubmitted(flow.id, req.userId);
    const hasVoted = await queries.hasUserVoted(flow.id, req.userId);

    res.json({
      phase: flow.phase,
      theme: flow.theme,
      hasSubmitted,
      hasVoted
    });
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({ error: 'Failed to get flow info' });
  }
});

// Timer check endpoint (for auto-phase progression)
app.get('/api/timer-check', async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();
    if (!flow || !flow.phase_timer) {
      return res.json({ shouldAdvance: false });
    }

    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - flow.phase_started_at;

    if (elapsed >= flow.phase_timer && flow.phase < 3) {
      await queries.updatePhase(flow.phase + 1, flow.phase_timer);
      return res.json({ shouldAdvance: true, newPhase: flow.phase + 1 });
    }

    res.json({
      shouldAdvance: false,
      timeRemaining: flow.phase_timer - elapsed
    });
  } catch (error) {
    console.error('Error checking timer:', error);
    res.status(500).json({ error: 'Failed to check timer' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/presentation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'presentation.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Presentation view: http://localhost:${PORT}/presentation`);
  console.log(`Default admin password: admin123`);
});
