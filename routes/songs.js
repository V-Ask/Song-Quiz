const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { ensureUser } = require('../middleware/auth');

// Submit or update a song (Phase 1)
router.post('/submit', ensureUser, async (req, res) => {
  try {
    const { quizId, songName, songAuthor, songLink, submitterName } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.status(400).json({ error: 'Quiz not found' });
    }

    if (quiz.phase !== 1) {
      return res.status(400).json({ error: 'Submissions are not open' });
    }

    if (!songName || !songAuthor || !songLink || !submitterName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate song link
    const validDomains = ['spotify.com', 'youtube.com', 'youtu.be', 'soundcloud.com'];
    const isValidLink = validDomains.some(domain => songLink.includes(domain));

    if (!isValidLink) {
      return res.status(400).json({ error: 'Link must be from Spotify, YouTube, or SoundCloud' });
    }

    // Check if user already submitted
    const hasSubmitted = await queries.hasUserSubmitted(quiz.id, req.userId);

    if (hasSubmitted) {
      // Update existing submission
      await queries.updateSong(
        quiz.id,
        req.userId,
        songName,
        songAuthor,
        songLink,
        submitterName
      );
      res.json({ success: true, updated: true });
    } else {
      // Create new submission
      const song = await queries.submitSong(
        quiz.id,
        songName,
        songAuthor,
        songLink,
        submitterName,
        req.userId
      );
      res.json({ success: true, song, updated: false });
    }
  } catch (error) {
    console.error('Error submitting song:', error);
    res.status(500).json({ error: 'Failed to submit song' });
  }
});

// Get user's submitted song
router.get('/my-song', ensureUser, async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ song: null });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.json({ song: null });
    }

    const song = await queries.getUserSong(quiz.id, req.userId);
    res.json({ song });
  } catch (error) {
    console.error('Error getting user song:', error);
    res.status(500).json({ error: 'Failed to get user song' });
  }
});

// Get list of songs
router.get('/list', ensureUser, async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ songs: [], phase: 0 });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.json({ songs: [], phase: 0 });
    }

    // Hide submitters during voting phase
    const hideSubmitters = quiz.phase === 2;
    const songs = await queries.getSongs(quiz.id, hideSubmitters);

    // Check if user has submitted
    const hasSubmitted = await queries.hasUserSubmitted(quiz.id, req.userId);

    res.json({
      songs,
      phase: quiz.phase,
      theme: quiz.theme,
      hasSubmitted
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

module.exports = router;
