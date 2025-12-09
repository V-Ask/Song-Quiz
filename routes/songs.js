const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { ensureUser } = require('../middleware/auth');
const { submissionLimiter, submissionSpeedLimiter, readLimiter } = require('../middleware/rateLimits');

// Submit a song (Phase 1)
router.post('/submit', submissionSpeedLimiter, submissionLimiter, ensureUser, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();

    if (!flow) {
      return res.status(400).json({ error: 'No active flow' });
    }

    if (flow.phase !== 1) {
      return res.status(400).json({ error: 'Submissions are not open' });
    }

    const { songName, songAuthor, songLink, submitterName } = req.body;

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
    const hasSubmitted = await queries.hasUserSubmitted(flow.id, req.userId);
    if (hasSubmitted) {
      return res.status(400).json({ error: 'You have already submitted a song' });
    }

    const song = await queries.submitSong(
      flow.id,
      songName,
      songAuthor,
      songLink,
      submitterName,
      req.userId
    );

    res.json({ success: true, song });
  } catch (error) {
    console.error('Error submitting song:', error);
    res.status(500).json({ error: 'Failed to submit song' });
  }
});

// Get list of songs
router.get('/list', readLimiter, ensureUser, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();

    if (!flow) {
      return res.json({ songs: [], phase: 0 });
    }

    // Hide submitters during voting phase
    const hideSubmitters = flow.phase === 2;
    const songs = await queries.getSongs(flow.id, hideSubmitters);

    // Check if user has submitted
    const hasSubmitted = await queries.hasUserSubmitted(flow.id, req.userId);

    res.json({
      songs,
      phase: flow.phase,
      theme: flow.theme,
      hasSubmitted
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

module.exports = router;
