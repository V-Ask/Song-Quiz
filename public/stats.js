const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quiz');

async function init() {
  const meRes = await fetch('/api/auth/me');
  const meData = await meRes.json();

  document.getElementById('loading').classList.add('hidden');

  if (!meData.authenticated) {
    document.getElementById('notAuthenticated').classList.remove('hidden');
    return;
  }

  document.getElementById('statsContent').classList.remove('hidden');

  if (quizId) {
    await loadQuizStats(quizId);
  } else {
    await loadOverviewStats();
  }
}

async function loadQuizStats(quizId) {
  try {
    const res = await fetch(`/api/stats/quiz/${quizId}`);
    if (!res.ok) {
      const err = await res.json();
      document.getElementById('statsContent').innerHTML = `<div class="card"><p class="error-message">${escapeHtml(err.error || 'Failed to load stats')}</p></div>`;
      return;
    }
    const data = await res.json();
    renderQuizStats(data);
  } catch (error) {
    console.error('Error loading quiz stats:', error);
    document.getElementById('statsContent').innerHTML = '<div class="card"><p class="error-message">Failed to load statistics</p></div>';
  }
}

async function loadOverviewStats() {
  try {
    const [overviewRes, leaderboardRes] = await Promise.all([
      fetch('/api/stats/overview'),
      fetch('/api/stats/leaderboard')
    ]);
    const overview = await overviewRes.json();
    const leaderboard = await leaderboardRes.json();
    renderOverviewStats(overview, leaderboard);
  } catch (error) {
    console.error('Error loading overview stats:', error);
    document.getElementById('statsContent').innerHTML = '<div class="card"><p class="error-message">Failed to load statistics</p></div>';
  }
}

function renderQuizStats(data) {
  const container = document.getElementById('statsContent');
  const { quiz, songStats, totalSongs, totalVoters } = data;
  const date = new Date(quiz.createdAt * 1000).toLocaleDateString();

  container.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(quiz.theme)}</h2>
      <p style="color:var(--text-dim);margin-bottom:1rem;">Quiz from ${date}</p>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalSongs}</div>
          <div class="stat-label">Songs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalVoters}</div>
          <div class="stat-label">Voters</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${songStats.length > 0 ? songStats[0].totalPoints : 0}</div>
          <div class="stat-label">Top Score</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Total Points by Song</h2>
      <div class="chart-container">
        <canvas id="pointsChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h2>Vote Distribution</h2>
      <div class="chart-container">
        <canvas id="distributionChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h2>Song Details</h2>
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Song</th>
            <th>Submitter</th>
            <th>Points</th>
            <th>3pt</th>
            <th>2pt</th>
            <th>1pt</th>
          </tr>
        </thead>
        <tbody>
          ${songStats.map((s, i) => `
            <tr>
              <td class="leaderboard-rank">${i + 1}</td>
              <td>${escapeHtml(s.songName)} <span style="color:var(--text-dim)">by ${escapeHtml(s.songAuthor)}</span></td>
              <td>${escapeHtml(s.submitterName)}</td>
              <td style="font-weight:700;color:var(--primary)">${s.totalPoints}</td>
              <td>${s.threePointVotes}</td>
              <td>${s.twoPointVotes}</td>
              <td>${s.onePointVotes}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Points bar chart
  if (songStats.length > 0) {
    new Chart(document.getElementById('pointsChart'), {
      type: 'bar',
      data: {
        labels: songStats.map(s => s.songName),
        datasets: [{
          label: 'Total Points',
          data: songStats.map(s => s.totalPoints),
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderColor: 'rgba(124, 58, 237, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(55,65,81,0.5)' } },
          x: { ticks: { color: '#9ca3af', maxRotation: 45 }, grid: { display: false } }
        }
      }
    });

    // Distribution stacked bar chart
    new Chart(document.getElementById('distributionChart'), {
      type: 'bar',
      data: {
        labels: songStats.map(s => s.songName),
        datasets: [
          { label: '3 Points', data: songStats.map(s => s.threePointVotes), backgroundColor: '#fbbf24' },
          { label: '2 Points', data: songStats.map(s => s.twoPointVotes), backgroundColor: '#c0c0c0' },
          { label: '1 Point', data: songStats.map(s => s.onePointVotes), backgroundColor: '#cd7f32' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#9ca3af' } } },
        scales: {
          x: { stacked: true, ticks: { color: '#9ca3af', maxRotation: 45 }, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: 'rgba(55,65,81,0.5)' } }
        }
      }
    });
  }
}

function renderOverviewStats(overview, leaderboard) {
  const container = document.getElementById('statsContent');
  const { totalQuizzes, quizzes, submitterStats, trends } = overview;

  if (totalQuizzes === 0) {
    container.innerHTML = '<div class="no-data"><h2>No completed quizzes yet</h2><p>Statistics will appear here after you complete your first quiz.</p><a href="/dashboard" class="btn btn-primary" style="margin-top:1rem;">Go to Dashboard</a></div>';
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h2>Overview</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalQuizzes}</div>
          <div class="stat-label">Quizzes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${submitterStats.length}</div>
          <div class="stat-label">Participants</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Participation Trends</h2>
      <div class="chart-container">
        <canvas id="trendsChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h2>All-Time Leaderboard</h2>
      ${leaderboard.leaderboard.length > 0 ? `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Points</th>
              <th>Quizzes</th>
              <th>Submissions</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.leaderboard.map((entry, i) => `
              <tr>
                <td class="leaderboard-rank">${i + 1}</td>
                <td>${escapeHtml(entry.submitter_name)}</td>
                <td style="font-weight:700;color:var(--primary)">${entry.all_time_points}</td>
                <td>${entry.quizzes_participated}</td>
                <td>${entry.total_submissions}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p class="no-data">No data yet</p>'}
    </div>

    <div class="card">
      <h2>Top Submitters</h2>
      <div class="chart-container">
        <canvas id="submittersChart"></canvas>
      </div>
    </div>

    <div class="card quiz-list-stats">
      <h2>Completed Quizzes</h2>
      ${quizzes.map(q => {
        const date = new Date(q.createdAt * 1000).toLocaleDateString();
        return `<div style="padding:0.75rem 0;border-bottom:1px solid var(--border)">
          <a href="/stats?quiz=${q.id}">${escapeHtml(q.theme)}</a>
          <span style="color:var(--text-dim);margin-left:1rem;font-size:0.85rem">${date}</span>
        </div>`;
      }).join('')}
    </div>
  `;

  // Participation trends chart
  if (trends.length > 0) {
    new Chart(document.getElementById('trendsChart'), {
      type: 'line',
      data: {
        labels: trends.map(t => t.theme),
        datasets: [
          {
            label: 'Songs Submitted',
            data: trends.map(t => t.songCount),
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Voters',
            data: trends.map(t => t.voterCount),
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236,72,153,0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#9ca3af' } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: 'rgba(55,65,81,0.5)' } },
          x: { ticks: { color: '#9ca3af', maxRotation: 45 }, grid: { display: false } }
        }
      }
    });
  }

  // Top submitters chart
  if (submitterStats.length > 0) {
    const top10 = submitterStats.slice(0, 10);
    new Chart(document.getElementById('submittersChart'), {
      type: 'bar',
      data: {
        labels: top10.map(s => s.name),
        datasets: [{
          label: 'Total Points',
          data: top10.map(s => s.totalPoints),
          backgroundColor: 'rgba(236, 72, 153, 0.7)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(55,65,81,0.5)' } },
          y: { ticks: { color: '#9ca3af' }, grid: { display: false } }
        }
      }
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();
