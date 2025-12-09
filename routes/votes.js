const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { ensureUser } = require('../middleware/auth');
const { submissionLimiter, submissionSpeedLimiter, readLimiter } = require('../middleware/rateLimits');

// Submit votes (Phase 2)
router.post('/submit', submissionSpeedLimiter, submissionLimiter, ensureUser, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();

    if (!flow) {
      return res.status(400).json({ error: 'No active flow' });
    }

    if (flow.phase !== 2) {
      return res.status(400).json({ error: 'Voting is not open' });
    }

    const { votes } = req.body;

    if (!votes || !Array.isArray(votes) || votes.length !== 3) {
      return res.status(400).json({ error: 'You must submit exactly 3 votes' });
    }

    // Validate votes have correct points (1, 2, 3)
    const points = votes.map(v => v.points).sort();
    if (points[0] !== 1 || points[1] !== 2 || points[2] !== 3) {
      return res.status(400).json({ error: 'Votes must have 1, 2, and 3 points' });
    }

    // Check if user already voted
    const hasVoted = await queries.hasUserVoted(flow.id, req.userId);
    if (hasVoted) {
      return res.status(400).json({ error: 'You have already voted' });
    }

    // Prevent voting for own song
    const songs = await queries.getSongsWithUserId(flow.id);
    const userSong = songs.find(s => s.user_id === req.userId);
    if (userSong && votes.some(v => v.songId === userSong.id)) {
      return res.status(400).json({ error: 'You cannot vote for your own song' });
    }

    // Check for duplicate song votes
    const songIds = votes.map(v => v.songId);
    if (new Set(songIds).size !== songIds.length) {
      return res.status(400).json({ error: 'Cannot vote for the same song multiple times' });
    }

    // Submit all votes
    for (const vote of votes) {
      await queries.submitVote(flow.id, req.userId, vote.songId, vote.points);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting votes:', error);
    res.status(500).json({ error: 'Failed to submit votes' });
  }
});

// Get user's votes
router.get('/my-votes', readLimiter, ensureUser, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();

    if (!flow) {
      return res.json({ votes: [], hasVoted: false });
    }

    const votes = await queries.getUserVotes(flow.id, req.userId);
    const hasVoted = await queries.hasUserVoted(flow.id, req.userId);

    res.json({ votes, hasVoted });
  } catch (error) {
    console.error('Error getting votes:', error);
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

// Get results (Phase 3)
router.get('/results', readLimiter, ensureUser, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();

    if (!flow) {
      return res.json({ results: [], phase: 0 });
    }

    if (flow.phase < 3) {
      return res.status(400).json({ error: 'Results are not available yet' });
    }

    const results = await queries.getResults(flow.id);

    res.json({ results, theme: flow.theme });
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

module.exports = router;
