const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const { initializeDatabase, queries } = require('./database');
const { ensureUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Initialize database
initializeDatabase();

// Clean up expired sessions and reset tokens periodically (every hour)
setInterval(async () => {
  try {
    await queries.deleteExpiredSessions();
    await queries.deleteExpiredResetTokens();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 60 * 60 * 1000);

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/stats', require('./routes/stats'));

// Get quiz info (for voters - anonymous access)
app.get('/api/flow', ensureUser, async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ phase: 0, theme: null, error: 'No quiz specified' });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.json({ phase: 0, theme: null, error: 'Quiz not found' });
    }

    const hasSubmitted = await queries.hasUserSubmitted(quiz.id, req.userId);
    const hasVoted = await queries.hasUserVoted(quiz.id, req.userId);

    res.json({
      phase: quiz.phase,
      theme: quiz.theme,
      themeImage: quiz.theme_image,
      quizId: quiz.id,
      hasSubmitted,
      hasVoted,
      schedule: {
        phase1At: quiz.phase_1_at,
        phase2At: quiz.phase_2_at,
        phase3At: quiz.phase_3_at
      }
    });
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({ error: 'Failed to get flow info' });
  }
});

// Timer check endpoint (for auto-phase progression)
app.get('/api/timer-check', async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ shouldAdvance: false });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz || quiz.phase >= 3) {
      return res.json({ shouldAdvance: false });
    }

    const now = Math.floor(Date.now() / 1000);
    const nextPhase = quiz.phase + 1;

    // Check absolute scheduled timestamp first (takes precedence)
    const scheduleField = `phase_${nextPhase}_at`;
    const scheduledAt = quiz[scheduleField];

    if (scheduledAt && now >= scheduledAt) {
      await queries.updateQuizPhase(quizId, nextPhase, quiz.phase_timer);
      if (nextPhase === 3) {
        await queries.markQuizCompleted(quizId);
      }
      return res.json({ shouldAdvance: true, newPhase: nextPhase });
    }

    // Fall back to duration-based timer
    if (quiz.phase_timer) {
      const elapsed = now - quiz.phase_started_at;
      if (elapsed >= quiz.phase_timer) {
        await queries.updateQuizPhase(quizId, nextPhase, quiz.phase_timer);
        if (nextPhase === 3) {
          await queries.markQuizCompleted(quizId);
        }
        return res.json({ shouldAdvance: true, newPhase: nextPhase });
      }

      return res.json({
        shouldAdvance: false,
        timeRemaining: quiz.phase_timer - elapsed,
        timerType: 'duration'
      });
    }

    // If scheduled timestamp exists but hasn't been reached yet
    if (scheduledAt) {
      return res.json({
        shouldAdvance: false,
        timeRemaining: scheduledAt - now,
        scheduledAt: scheduledAt,
        timerType: 'scheduled'
      });
    }

    res.json({ shouldAdvance: false });
  } catch (error) {
    console.error('Error checking timer:', error);
    res.status(500).json({ error: 'Failed to check timer' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/presentation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'presentation.html'));
});

app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Redirect old admin route to dashboard
app.get('/admin', (req, res) => {
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`Presentation view: http://localhost:${PORT}/presentation`);
});
