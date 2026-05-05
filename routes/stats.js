const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { ensureAuth } = require('../middleware/auth');

// GET /api/stats/quiz/:quizId - Per-quiz statistics
router.get('/quiz/:quizId', ensureAuth, async (req, res) => {
  try {
    const quiz = await queries.getQuiz(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.owner_id !== req.account.id) {
      const isMod = await queries.isModerator(req.params.quizId, req.account.id);
      if (!isMod) {
        return res.status(403).json({ error: 'Not your quiz' });
      }
    }

    const results = await queries.getResults(quiz.id);
    const voteBreakdown = await queries.getVoteBreakdown(quiz.id);
    const songs = await queries.getSongs(quiz.id, false);

    const songStats = results.map(r => {
      const songVotes = voteBreakdown.filter(v => v.song_id === r.id && v.points);
      return {
        songName: r.song_name,
        songAuthor: r.song_author,
        submitterName: r.submitter_name,
        totalPoints: r.total_points,
        threePointVotes: songVotes.filter(v => v.points === 3).length,
        twoPointVotes: songVotes.filter(v => v.points === 2).length,
        onePointVotes: songVotes.filter(v => v.points === 1).length,
        totalVoters: new Set(songVotes.map(v => v.voter_id)).size
      };
    });

    res.json({
      quiz: { id: quiz.id, theme: quiz.theme, createdAt: quiz.created_at, completedAt: quiz.completed_at },
      songStats,
      totalSongs: songs.length,
      totalVoters: new Set(voteBreakdown.filter(v => v.voter_id).map(v => v.voter_id)).size
    });
  } catch (error) {
    console.error('Error getting quiz stats:', error);
    res.status(500).json({ error: 'Failed to get quiz statistics' });
  }
});

// GET /api/stats/leaderboard - Cross-quiz all-time leaderboard
router.get('/leaderboard', ensureAuth, async (req, res) => {
  try {
    const leaderboard = await queries.getAllTimeLeaderboard(req.account.id);
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// GET /api/stats/overview - Cross-quiz overview
router.get('/overview', ensureAuth, async (req, res) => {
  try {
    const quizzes = await queries.getCompletedQuizzes(req.account.id);
    const submitterStats = await queries.getSubmitterStats(req.account.id);
    const trends = await queries.getParticipationTrends(req.account.id);

    res.json({
      totalQuizzes: quizzes.length,
      quizzes: quizzes.map(q => ({
        id: q.id,
        theme: q.theme,
        createdAt: q.created_at,
        completedAt: q.completed_at
      })),
      submitterStats,
      trends
    });
  } catch (error) {
    console.error('Error getting overview:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

module.exports = router;
