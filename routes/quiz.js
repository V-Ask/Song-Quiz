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
    const { theme, timer } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const quizId = uuidv4();
    const themeImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const quiz = await queries.createQuiz(quizId, req.account.id, theme, timer || null, themeImagePath);
    res.json({ quizId: quiz.id, theme: quiz.theme, phase: quiz.phase });
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

// DELETE /api/quiz/:quizId - Delete a quiz
router.delete('/:quizId', ensureAuth, ensureQuizOwner, async (req, res) => {
  try {
    await queries.deleteQuiz(req.params.quizId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

module.exports = router;
