const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { queries } = require('../database');
const { ensureAuth, ensureQuizOwner } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'theme-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// POST /api/quiz/create - Create a new quiz
router.post('/create', ensureAuth, upload.single('themeImage'), async (req, res) => {
  try {
    const { theme, timer, phase1At, phase2At, phase3At } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const quizId = uuidv4();
    const themeImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const p1 = phase1At ? parseInt(phase1At) : null;
    const p2 = phase2At ? parseInt(phase2At) : null;
    const p3 = phase3At ? parseInt(phase3At) : null;

    const quiz = await queries.createQuiz(quizId, req.account.id, theme, timer || null, themeImagePath, p1, p2, p3);
    res.json({ quizId: quiz.id, theme: quiz.theme, phase: quiz.phase, hasSchedule: !!(p1 || p2 || p3) });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// GET /api/quiz/my-quizzes - List all quizzes owned by current account
router.get('/my-quizzes', ensureAuth, async (req, res) => {
  try {
    const quizzes = await queries.getQuizzesByOwner(req.account.id);
    res.json({ quizzes });
  } catch (error) {
    console.error('Error listing quizzes:', error);
    res.status(500).json({ error: 'Failed to list quizzes' });
  }
});

// GET /api/quiz/moderated - List quizzes where current user is a moderator
router.get('/moderated', ensureAuth, async (req, res) => {
  try {
    const quizzes = await queries.getQuizzesByModerator(req.account.id);
    res.json({ quizzes });
  } catch (error) {
    console.error('Error listing moderated quizzes:', error);
    res.status(500).json({ error: 'Failed to list moderated quizzes' });
  }
});

// POST /api/quiz/:quizId/phase - Advance phase
router.post('/:quizId/phase', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    const { phase, timer } = req.body;

    if (phase === undefined || phase < 0 || phase > 3) {
      return res.status(400).json({ error: 'Invalid phase' });
    }

    await queries.updateQuizPhase(req.params.quizId, phase, timer || null);

    if (phase === 3) {
      await queries.markQuizCompleted(req.params.quizId);
    }

    res.json({ success: true, phase });
  } catch (error) {
    console.error('Error updating phase:', error);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// GET /api/quiz/:quizId/status - Get quiz status (owner only)
router.get('/:quizId/status', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    const quiz = req.quiz;
    const songs = await queries.getSongs(quiz.id, false);
    const results = quiz.phase >= 3 ? await queries.getResults(quiz.id) : null;

    res.json({
      quiz,
      songs,
      results,
      songCount: songs.length
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /api/quiz/:quizId/schedule - Update phase schedule
router.post('/:quizId/schedule', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    const { phase1At, phase2At, phase3At } = req.body;

    const p1 = phase1At ? parseInt(phase1At) : null;
    const p2 = phase2At ? parseInt(phase2At) : null;
    const p3 = phase3At ? parseInt(phase3At) : null;

    await queries.updateQuizSchedule(req.params.quizId, p1, p2, p3);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/quiz/:quizId - Delete a quiz (owner only)
router.delete('/:quizId', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    if (req.quizRole !== 'owner') {
      return res.status(403).json({ error: 'Only the quiz owner can delete a quiz' });
    }
    await queries.deleteQuiz(req.params.quizId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// POST /api/quiz/:quizId/invite - Invite moderator by username (owner only)
router.post('/:quizId/invite', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    if (req.quizRole !== 'owner') {
      return res.status(403).json({ error: 'Only the quiz owner can invite moderators' });
    }

    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const account = await queries.getAccountByUsername(username);
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (account.id === req.account.id) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    const isMod = await queries.isModerator(req.params.quizId, account.id);
    if (isMod) {
      return res.status(409).json({ error: 'User is already a moderator' });
    }

    await queries.addModerator(req.params.quizId, account.id);
    res.json({ success: true, moderator: { id: account.id, username: account.username, displayName: account.display_name } });
  } catch (error) {
    console.error('Error inviting moderator:', error);
    res.status(500).json({ error: 'Failed to invite moderator' });
  }
});

// DELETE /api/quiz/:quizId/moderators/:accountId - Remove moderator (owner only)
router.delete('/:quizId/moderators/:accountId', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    if (req.quizRole !== 'owner') {
      return res.status(403).json({ error: 'Only the quiz owner can remove moderators' });
    }

    await queries.removeModerator(req.params.quizId, req.params.accountId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing moderator:', error);
    res.status(500).json({ error: 'Failed to remove moderator' });
  }
});

// GET /api/quiz/:quizId/moderators - List moderators
router.get('/:quizId/moderators', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    const moderators = await queries.getModerators(req.params.quizId);
    res.json({ moderators });
  } catch (error) {
    console.error('Error listing moderators:', error);
    res.status(500).json({ error: 'Failed to list moderators' });
  }
});

module.exports = router;
