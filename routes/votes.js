const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { ensureUser } = require('../middleware/auth');

// Submit votes (Phase 2)
router.post('/submit', ensureUser, async (req, res) => {
  try {
    const { quizId, votes } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.status(400).json({ error: 'Quiz not found' });
    }

    if (quiz.phase !== 2) {
      return res.status(400).json({ error: 'Voting is not open' });
    }

    if (!votes || !Array.isArray(votes) || votes.length !== 3) {
      return res.status(400).json({ error: 'You must submit exactly 3 votes' });
    }

    // Validate votes have correct points (1, 2, 3)
    const points = votes.map(v => v.points).sort();
    if (points[0] !== 1 || points[1] !== 2 || points[2] !== 3) {
      return res.status(400).json({ error: 'Votes must have 1, 2, and 3 points' });
    }

    // Check if user already voted
    const hasVoted = await queries.hasUserVoted(quiz.id, req.userId);
    if (hasVoted) {
      return res.status(400).json({ error: 'You have already voted' });
    }

    // Prevent voting for own song
    const songs = await queries.getSongsWithUserId(quiz.id);
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
      await queries.submitVote(quiz.id, req.userId, vote.songId, vote.points);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting votes:', error);
    res.status(500).json({ error: 'Failed to submit votes' });
  }
});

// Get user's votes
router.get('/my-votes', ensureUser, async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ votes: [], hasVoted: false });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.json({ votes: [], hasVoted: false });
    }

    const votes = await queries.getUserVotes(quiz.id, req.userId);
    const hasVoted = await queries.hasUserVoted(quiz.id, req.userId);

    res.json({ votes, hasVoted });
  } catch (error) {
    console.error('Error getting votes:', error);
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

// Get results (Phase 3)
router.get('/results', ensureUser, async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ results: [], phase: 0 });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.json({ results: [], phase: 0 });
    }

    if (quiz.phase < 3) {
      return res.status(400).json({ error: 'Results are not available yet' });
    }

    const results = await queries.getResults(quiz.id);

    res.json({ results, theme: quiz.theme });
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// Calculate badges for songs based on voting patterns
function calculateBadges(voteBreakdown, results) {
  const badges = {};

  const songStats = {};
  results.forEach(r => {
    songStats[r.id] = {
      id: r.id,
      song_name: r.song_name,
      submitter_name: r.submitter_name,
      total_points: r.total_points,
      votes: [],
      voters: new Set(),
      points3: 0,
      points2: 0,
      points1: 0
    };
    badges[r.id] = [];
  });

  voteBreakdown.forEach(vote => {
    if (vote.points && songStats[vote.song_id]) {
      const stats = songStats[vote.song_id];
      stats.votes.push(vote);
      stats.voters.add(vote.voter_id);
      if (vote.points === 3) stats.points3++;
      else if (vote.points === 2) stats.points2++;
      else if (vote.points === 1) stats.points1++;
    }
  });

  const songList = Object.values(songStats);
  const songsWithVotes = songList.filter(s => s.votes.length > 0);

  if (songsWithVotes.length === 0) {
    return badges;
  }

  // 1. People's Champion - Most unique voters
  const maxVoters = Math.max(...songsWithVotes.map(s => s.voters.size));
  if (maxVoters >= 2) {
    songsWithVotes
      .filter(s => s.voters.size === maxVoters)
      .forEach(s => badges[s.id].push({
        id: 'peoples-champion',
        name: "People's Champion",
        description: `Received votes from ${maxVoters} different people`,
        icon: '\u{1F451}'
      }));
  }

  // 2. Polarizing - Received both 3-point and 1-point votes
  songsWithVotes
    .filter(s => s.points3 > 0 && s.points1 > 0)
    .forEach(s => badges[s.id].push({
      id: 'polarizing',
      name: 'Polarizing',
      description: 'Love it or hate it - received both highest and lowest votes',
      icon: '\u{1F3AD}'
    }));

  // 3. Unanimous Love - All votes were 3 points (min 2 votes)
  songsWithVotes
    .filter(s => s.votes.length >= 2 && s.points3 === s.votes.length)
    .forEach(s => badges[s.id].push({
      id: 'unanimous-love',
      name: 'Unanimous Love',
      description: 'Everyone who voted gave it top marks',
      icon: '\u{1F49C}'
    }));

  // 4. Dark Horse - Top 3 but no 3-point votes
  results.slice(0, 3).forEach((r) => {
    const stats = songStats[r.id];
    if (stats.votes.length > 0 && stats.points3 === 0) {
      badges[r.id].push({
        id: 'dark-horse',
        name: 'Dark Horse',
        description: 'Made it to top 3 without any first-place votes',
        icon: '\u{1F40E}'
      });
    }
  });

  // 5. Crowd Favorite - Highest percentage of 3-point votes (min 2 votes)
  const eligibleForCrowdFavorite = songsWithVotes.filter(s => s.votes.length >= 2);
  if (eligibleForCrowdFavorite.length > 0) {
    const maxThreePointRatio = Math.max(
      ...eligibleForCrowdFavorite.map(s => s.points3 / s.votes.length)
    );
    if (maxThreePointRatio > 0) {
      eligibleForCrowdFavorite
        .filter(s => s.points3 / s.votes.length === maxThreePointRatio && s.points3 > 0)
        .forEach(s => badges[s.id].push({
          id: 'crowd-favorite',
          name: 'Crowd Favorite',
          description: `${Math.round(maxThreePointRatio * 100)}% of voters gave it 3 points`,
          icon: '\u{2B50}'
        }));
    }
  }

  // 6. Sweeping Victory - Won by 3+ points
  if (results.length >= 2) {
    const margin = results[0].total_points - results[1].total_points;
    if (margin >= 3) {
      badges[results[0].id].push({
        id: 'sweeping-victory',
        name: 'Sweeping Victory',
        description: `Won by ${margin} points over second place`,
        icon: '\u{1F3C6}'
      });
    }
  }

  // 7. Photo Finish - Top 3 within 1 point of each other
  if (results.length >= 2) {
    for (let i = 0; i < Math.min(2, results.length - 1); i++) {
      const diff = results[i].total_points - results[i + 1].total_points;
      if (diff === 1) {
        badges[results[i].id].push({
          id: 'photo-finish',
          name: 'Photo Finish',
          description: 'Won by just 1 point',
          icon: '\u{1F4F8}'
        });
        badges[results[i + 1].id].push({
          id: 'photo-finish',
          name: 'Photo Finish',
          description: 'Lost by just 1 point',
          icon: '\u{1F4F8}'
        });
      }
    }
  }

  // 8. Hidden Gem - Few votes (1-2) but all were 2 or 3 points
  songsWithVotes
    .filter(s => s.votes.length <= 2 && s.votes.length > 0 && s.points1 === 0)
    .forEach(s => badges[s.id].push({
      id: 'hidden-gem',
      name: 'Hidden Gem',
      description: 'Few discovered it, but those who did loved it',
      icon: '\u{1F48E}'
    }));

  // 9. The Steady One - Every vote received was exactly 2 points (min 2 votes)
  songsWithVotes
    .filter(s => s.votes.length >= 2 && s.points2 === s.votes.length)
    .forEach(s => badges[s.id].push({
      id: 'steady-one',
      name: 'The Steady One',
      description: "Consistently everyone's second choice",
      icon: '\u{2696}\u{FE0F}'
    }));

  // 10. Heartbreaker - 2nd place with more 3-point votes than 1st
  if (results.length >= 2) {
    const first = songStats[results[0].id];
    const second = songStats[results[1].id];
    if (second.points3 > first.points3) {
      badges[results[1].id].push({
        id: 'heartbreaker',
        name: 'Heartbreaker',
        description: 'More first-place votes than the winner, but fell short on totals',
        icon: '\u{1F494}'
      });
    }
  }

  // 11. Underdog - Lowest scoring song that still got at least one 3-point vote
  const songsWithThreePoints = songsWithVotes.filter(s => s.points3 > 0);
  if (songsWithThreePoints.length > 0) {
    const minPointsWithThree = Math.min(...songsWithThreePoints.map(s => s.total_points));
    const underdogs = songsWithThreePoints.filter(s => s.total_points === minPointsWithThree);
    underdogs
      .filter(s => results.findIndex(r => r.id === s.id) >= 3)
      .forEach(s => badges[s.id].push({
        id: 'underdog',
        name: 'Underdog',
        description: "Someone's favorite that didn't make the podium",
        icon: '\u{1F415}'
      }));
  }

  // 12. First to the Party - First song to receive a vote
  const votesWithTime = voteBreakdown.filter(v => v.voted_at);
  if (votesWithTime.length > 0) {
    const firstVoteTime = Math.min(...votesWithTime.map(v => v.voted_at));
    const firstVoted = votesWithTime.find(v => v.voted_at === firstVoteTime);
    if (firstVoted && badges[firstVoted.song_id]) {
      badges[firstVoted.song_id].push({
        id: 'first-to-party',
        name: 'First to the Party',
        description: 'The first song to receive a vote',
        icon: '\u{1F389}'
      });
    }
  }

  // 13. Late Bloomer - Last song to receive its first vote
  const songsFirstVoteTime = {};
  voteBreakdown.forEach(v => {
    if (v.voted_at && !songsFirstVoteTime[v.song_id]) {
      songsFirstVoteTime[v.song_id] = v.voted_at;
    }
  });
  const firstVoteTimes = Object.values(songsFirstVoteTime);
  if (firstVoteTimes.length >= 3) {
    const latestFirstVote = Math.max(...firstVoteTimes);
    const lateBloomers = Object.entries(songsFirstVoteTime)
      .filter(([_, time]) => time === latestFirstVote)
      .map(([songId, _]) => parseInt(songId));
    lateBloomers.forEach(songId => {
      if (badges[songId]) {
        badges[songId].push({
          id: 'late-bloomer',
          name: 'Late Bloomer',
          description: 'Last to get noticed, but still got votes',
          icon: '\u{1F338}'
        });
      }
    });
  }

  return badges;
}

// Get badges for results (Phase 3)
router.get('/badges', ensureUser, async (req, res) => {
  try {
    const quizId = req.query.quizId;
    if (!quizId) {
      return res.json({ badges: {} });
    }

    const quiz = await queries.getQuiz(quizId);
    if (!quiz) {
      return res.json({ badges: {} });
    }

    if (quiz.phase < 3) {
      return res.status(400).json({ error: 'Badges are not available yet' });
    }

    const [results, voteBreakdown] = await Promise.all([
      queries.getResults(quiz.id),
      queries.getVoteBreakdown(quiz.id)
    ]);

    const badges = calculateBadges(voteBreakdown, results);

    res.json({ badges });
  } catch (error) {
    console.error('Error getting badges:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

module.exports = router;
