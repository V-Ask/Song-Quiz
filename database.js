const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Current flow/theme table (only one active at a time)
    db.run(`CREATE TABLE IF NOT EXISTS current_flow (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      theme TEXT NOT NULL,
      phase INTEGER DEFAULT 0,
      phase_timer INTEGER DEFAULT NULL,
      phase_started_at INTEGER DEFAULT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`);

    // Songs submitted by users
    db.run(`CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_id INTEGER NOT NULL,
      song_name TEXT NOT NULL,
      song_author TEXT NOT NULL,
      song_link TEXT NOT NULL,
      submitter_name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      submitted_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (flow_id) REFERENCES current_flow(id)
    )`);

    // Votes placed by users
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      song_id INTEGER NOT NULL,
      points INTEGER NOT NULL CHECK (points IN (1, 2, 3)),
      voted_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(flow_id, user_id, points),
      FOREIGN KEY (flow_id) REFERENCES current_flow(id),
      FOREIGN KEY (song_id) REFERENCES songs(id)
    )`);

    // Track user sessions
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`);
  });
}

// Database query helpers
const queries = {
  // Flow/Theme management
  getCurrentFlow: () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM current_flow WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  createFlow: (theme, timer = null) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM current_flow WHERE id = 1', (err) => {
        if (err) return reject(err);
        db.run('DELETE FROM songs', (err) => {
          if (err) return reject(err);
          db.run('DELETE FROM votes', (err) => {
            if (err) return reject(err);
            db.run(
              'INSERT INTO current_flow (id, theme, phase, phase_timer, phase_started_at) VALUES (1, ?, 0, ?, strftime("%s", "now"))',
              [theme, timer],
              function(err) {
                if (err) reject(err);
                else resolve({ id: 1, theme, phase: 0 });
              }
            );
          });
        });
      });
    });
  },

  updatePhase: (phase, timer = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE current_flow SET phase = ?, phase_timer = ?, phase_started_at = strftime("%s", "now") WHERE id = 1',
        [phase, timer],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  // Song management
  submitSong: (flowId, songName, songAuthor, songLink, submitterName, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO songs (flow_id, song_name, song_author, song_link, submitter_name, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [flowId, songName, songAuthor, songLink, submitterName, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  hasUserSubmitted: (flowId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM songs WHERE flow_id = ? AND user_id = ?',
        [flowId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },

  getSongs: (flowId, hideSubmitters = false) => {
    return new Promise((resolve, reject) => {
      const query = hideSubmitters
        ? 'SELECT id, song_name, song_author, song_link FROM songs WHERE flow_id = ? ORDER BY id'
        : 'SELECT id, song_name, song_author, song_link, submitter_name FROM songs WHERE flow_id = ? ORDER BY id';

      db.all(query, [flowId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getSongsWithUserId: (flowId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, song_name, song_author, song_link, submitter_name, user_id FROM songs WHERE flow_id = ? ORDER BY id',
        [flowId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Vote management
  submitVote: (flowId, userId, songId, points) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO votes (flow_id, user_id, song_id, points) VALUES (?, ?, ?, ?)',
        [flowId, userId, songId, points],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  hasUserVoted: (flowId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM votes WHERE flow_id = ? AND user_id = ?',
        [flowId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count === 3);
        }
      );
    });
  },

  getUserVotes: (flowId, userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT song_id, points FROM votes WHERE flow_id = ? AND user_id = ?',
        [flowId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getResults: (flowId) => {
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
        WHERE s.flow_id = ?
        GROUP BY s.id
        ORDER BY total_points DESC, s.id ASC`,
        [flowId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // User management
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
