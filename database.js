const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Registered quiz creator accounts
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`);

    // Server-side sessions for authenticated users
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);

    // Quizzes (replaces singleton current_flow)
    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      theme TEXT NOT NULL,
      theme_image TEXT DEFAULT NULL,
      phase INTEGER DEFAULT 0,
      phase_timer INTEGER DEFAULT NULL,
      phase_started_at INTEGER DEFAULT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      completed_at INTEGER DEFAULT NULL,
      FOREIGN KEY (owner_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);

    // Songs submitted by users
    db.run(`CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id TEXT NOT NULL,
      song_name TEXT NOT NULL,
      song_author TEXT NOT NULL,
      song_link TEXT NOT NULL,
      submitter_name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      submitted_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`);

    // Votes placed by users
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      song_id INTEGER NOT NULL,
      points INTEGER NOT NULL CHECK (points IN (1, 2, 3)),
      voted_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(quiz_id, user_id, points),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )`);

    // Anonymous user session tracking (voters)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`);
  });
}

// Database query helpers
const queries = {
  // === Account management ===

  createAccount: (id, username, email, passwordHash, displayName) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO accounts (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
        [id, username, email, passwordHash, displayName],
        function(err) {
          if (err) reject(err);
          else resolve({ id, username, displayName });
        }
      );
    });
  },

  getAccountByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM accounts WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAccountByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM accounts WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAccountById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, username, email, display_name, created_at FROM accounts WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // === Session management ===

  createSession: (id, accountId, expiresAt) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO sessions (id, account_id, expires_at) VALUES (?, ?, ?)',
        [id, accountId, expiresAt],
        function(err) {
          if (err) reject(err);
          else resolve({ id, accountId });
        }
      );
    });
  },

  getSession: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  deleteSession: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM sessions WHERE id = ?', [sessionId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  deleteExpiredSessions: () => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM sessions WHERE expires_at < strftime("%s", "now")', function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // === Quiz management ===

  getQuiz: (quizId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  createQuiz: (quizId, ownerId, theme, timer = null, themeImage = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO quizzes (id, owner_id, theme, theme_image, phase, phase_timer, phase_started_at) VALUES (?, ?, ?, ?, 0, ?, strftime("%s", "now"))',
        [quizId, ownerId, theme, themeImage, timer],
        function(err) {
          if (err) reject(err);
          else resolve({ id: quizId, theme, phase: 0 });
        }
      );
    });
  },

  updateQuizPhase: (quizId, phase, timer = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE quizzes SET phase = ?, phase_timer = ?, phase_started_at = strftime("%s", "now") WHERE id = ?',
        [phase, timer, quizId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  markQuizCompleted: (quizId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE quizzes SET completed_at = strftime("%s", "now") WHERE id = ?',
        [quizId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  getQuizzesByOwner: (ownerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM quizzes WHERE owner_id = ? ORDER BY created_at DESC',
        [ownerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getCompletedQuizzes: (ownerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM quizzes WHERE owner_id = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC',
        [ownerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  deleteQuiz: (quizId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM quizzes WHERE id = ?', [quizId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // === Song management ===

  submitSong: (quizId, songName, songAuthor, songLink, submitterName, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO songs (quiz_id, song_name, song_author, song_link, submitter_name, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [quizId, songName, songAuthor, songLink, submitterName, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  hasUserSubmitted: (quizId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM songs WHERE quiz_id = ? AND user_id = ?',
        [quizId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },

  getSongs: (quizId, hideSubmitters = false) => {
    return new Promise((resolve, reject) => {
      const query = hideSubmitters
        ? 'SELECT id, song_name, song_author, song_link FROM songs WHERE quiz_id = ? ORDER BY id'
        : 'SELECT id, song_name, song_author, song_link, submitter_name FROM songs WHERE quiz_id = ? ORDER BY id';

      db.all(query, [quizId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getSongsWithUserId: (quizId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, song_name, song_author, song_link, submitter_name, user_id FROM songs WHERE quiz_id = ? ORDER BY id',
        [quizId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getUserSong: (quizId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, song_name, song_author, song_link, submitter_name FROM songs WHERE quiz_id = ? AND user_id = ?',
        [quizId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  updateSong: (quizId, userId, songName, songAuthor, songLink, submitterName) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE songs SET song_name = ?, song_author = ?, song_link = ?, submitter_name = ? WHERE quiz_id = ? AND user_id = ?',
        [songName, songAuthor, songLink, submitterName, quizId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  // === Vote management ===

  submitVote: (quizId, userId, songId, points) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO votes (quiz_id, user_id, song_id, points) VALUES (?, ?, ?, ?)',
        [quizId, userId, songId, points],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  hasUserVoted: (quizId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM votes WHERE quiz_id = ? AND user_id = ?',
        [quizId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count === 3);
        }
      );
    });
  },

  getUserVotes: (quizId, userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT song_id, points FROM votes WHERE quiz_id = ? AND user_id = ?',
        [quizId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getResults: (quizId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          s.id,
          s.song_name,
          s.song_author,
          s.song_link,
          s.submitter_name,
          COALESCE(SUM(v.points), 0) as total_points
        FROM songs s
        LEFT JOIN votes v ON s.id = v.song_id
        WHERE s.quiz_id = ?
        GROUP BY s.id
        ORDER BY total_points DESC, s.id ASC`,
        [quizId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getVoteBreakdown: (quizId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          s.id as song_id,
          s.song_name,
          s.submitter_name,
          v.points,
          v.user_id as voter_id,
          v.voted_at
        FROM songs s
        LEFT JOIN votes v ON s.id = v.song_id
        WHERE s.quiz_id = ?
        ORDER BY s.id, v.points DESC`,
        [quizId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // === Statistics queries ===

  getAllTimeLeaderboard: (ownerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          s.submitter_name,
          COUNT(DISTINCT s.quiz_id) as quizzes_participated,
          COALESCE(SUM(v_totals.total_points), 0) as all_time_points,
          COUNT(DISTINCT s.id) as total_submissions
        FROM songs s
        INNER JOIN quizzes q ON s.quiz_id = q.id
        LEFT JOIN (
          SELECT song_id, SUM(points) as total_points
          FROM votes
          GROUP BY song_id
        ) v_totals ON s.id = v_totals.song_id
        WHERE q.owner_id = ? AND q.completed_at IS NOT NULL
        GROUP BY s.submitter_name
        ORDER BY all_time_points DESC`,
        [ownerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getSubmitterStats: (ownerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          s.submitter_name as name,
          COALESCE(SUM(v_totals.total_points), 0) as totalPoints,
          COUNT(DISTINCT s.quiz_id) as quizzesParticipated,
          CASE
            WHEN COUNT(s.id) > 0 THEN ROUND(COALESCE(SUM(v_totals.total_points), 0) * 1.0 / COUNT(s.id), 1)
            ELSE 0
          END as averagePoints
        FROM songs s
        INNER JOIN quizzes q ON s.quiz_id = q.id
        LEFT JOIN (
          SELECT song_id, SUM(points) as total_points
          FROM votes
          GROUP BY song_id
        ) v_totals ON s.id = v_totals.song_id
        WHERE q.owner_id = ? AND q.completed_at IS NOT NULL
        GROUP BY s.submitter_name
        ORDER BY totalPoints DESC`,
        [ownerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getParticipationTrends: (ownerId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          q.id as quizId,
          q.theme,
          q.created_at as date,
          COUNT(DISTINCT s.id) as songCount,
          COUNT(DISTINCT v.user_id) as voterCount
        FROM quizzes q
        LEFT JOIN songs s ON q.id = s.quiz_id
        LEFT JOIN votes v ON q.id = v.quiz_id
        WHERE q.owner_id = ? AND q.completed_at IS NOT NULL
        GROUP BY q.id
        ORDER BY q.created_at ASC`,
        [ownerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // === Anonymous user management (voters) ===

  createUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT OR IGNORE INTO users (id) VALUES (?)', [userId], function(err) {
        if (err) reject(err);
        else resolve({ id: userId });
      });
    });
  }
};

module.exports = { db, initializeDatabase, queries };
