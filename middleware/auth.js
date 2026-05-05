const { v4: uuidv4 } = require('uuid');
const { queries } = require('../database');

// Middleware to ensure anonymous user has a valid session (voters)
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

// Middleware to ensure user is authenticated (registered account with valid session)
async function ensureAuth(req, res, next) {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = await queries.getSession(sessionToken);
    if (!session) {
      res.clearCookie('sessionToken');
      return res.status(401).json({ error: 'Session expired' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > session.expires_at) {
      await queries.deleteSession(sessionToken);
      res.clearCookie('sessionToken');
      return res.status(401).json({ error: 'Session expired' });
    }

    const account = await queries.getAccountById(session.account_id);
    if (!account) {
      return res.status(401).json({ error: 'Account not found' });
    }

    req.account = account;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Middleware to ensure authenticated user owns or moderates the quiz
async function ensureQuizOwner(req, res, next) {
  try {
    const quizId = req.params.quizId || req.body.quizId || req.query.quizId;
    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID required' });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.owner_id === req.account.id) {
      req.quiz = quiz;
      req.quizRole = 'owner';
      return next();
    }

    // Check if user is a moderator
    const isMod = await queries.isModerator(quizId, req.account.id);
    if (isMod) {
      req.quiz = quiz;
      req.quizRole = 'moderator';
      return next();
    }

    return res.status(403).json({ error: 'Not your quiz' });
  } catch (error) {
    console.error('Quiz owner check error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
}

module.exports = { ensureUser, ensureAuth, ensureQuizOwner };
