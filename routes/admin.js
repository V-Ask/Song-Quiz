const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { ensureAdmin } = require('../middleware/auth');

// Create a new flow with theme (Phase 0)
router.post('/flow', ensureAdmin, async (req, res) => {
  try {
    const { theme, timer } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const flow = await queries.createFlow(theme, timer || null);
    res.json(flow);
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

// Update phase
router.post('/phase', ensureAdmin, async (req, res) => {
  try {
    const { phase, timer } = req.body;

    if (phase === undefined || phase < 0 || phase > 3) {
      return res.status(400).json({ error: 'Invalid phase' });
    }

    await queries.updatePhase(phase, timer || null);
    res.json({ success: true, phase });
  } catch (error) {
    console.error('Error updating phase:', error);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// Get current flow status
router.get('/status', ensureAdmin, async (req, res) => {
  try {
    const flow = await queries.getCurrentFlow();
    if (!flow) {
      return res.json({ flow: null });
    }

    const songs = await queries.getSongs(flow.id, false);
    const results = flow.phase >= 3 ? await queries.getResults(flow.id) : null;

    res.json({
      flow,
      songs,
      results,
      songCount: songs.length
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
