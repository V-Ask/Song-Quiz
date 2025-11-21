let isAdmin = false;

// Initialize admin panel
async function init() {
  await checkAdminStatus();
  if (isAdmin) {
    await loadDashboard();
    setInterval(loadDashboard, 5000); // Refresh every 5 seconds
  }
}

// Check if user is already logged in as admin
async function checkAdminStatus() {
  try {
    const response = await fetch('/api/admin/check');
    const data = await response.json();
    isAdmin = data.isAdmin;

    if (isAdmin) {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
}

// Handle admin login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('adminPassword').value;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      isAdmin = true;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      await loadDashboard();
    } else {
      const errorEl = document.getElementById('loginError');
      errorEl.textContent = 'Invalid password';
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Login failed');
  }
});

// Load admin dashboard
async function loadDashboard() {
  try {
    const response = await fetch('/api/admin/status');
    const data = await response.json();

    if (!data.flow) {
      // No flow exists, show create flow section
      document.getElementById('createFlowSection').classList.remove('hidden');
      document.getElementById('phaseControl').classList.add('hidden');
      document.getElementById('submissionsSection').classList.add('hidden');
      document.getElementById('resultsSection').classList.add('hidden');

      document.getElementById('currentPhase').textContent = 'No active flow';
      document.getElementById('currentTheme').textContent = '-';
      document.getElementById('songCount').textContent = '0';
    } else {
      // Flow exists
      document.getElementById('currentPhase').textContent = `Phase ${data.flow.phase}`;
      document.getElementById('currentTheme').textContent = data.flow.theme;
      document.getElementById('songCount').textContent = data.songCount;

      if (data.flow.phase === 0) {
        document.getElementById('createFlowSection').classList.remove('hidden');
        document.getElementById('phaseControl').classList.add('hidden');
      } else {
        document.getElementById('createFlowSection').classList.add('hidden');
        document.getElementById('phaseControl').classList.remove('hidden');
      }

      // Show submissions if any
      if (data.songs && data.songs.length > 0) {
        displaySubmissions(data.songs);
      } else {
        document.getElementById('submissionsSection').classList.add('hidden');
      }

      // Show results in phase 3
      if (data.flow.phase >= 3 && data.results) {
        displayResults(data.results);
      } else {
        document.getElementById('resultsSection').classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Create new flow
document.getElementById('flowForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const theme = document.getElementById('themeInput').value;
  const timer = document.getElementById('timerInput').value;

  try {
    const response = await fetch('/api/admin/flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme,
        timer: timer ? parseInt(timer) : null
      })
    });

    if (response.ok) {
      document.getElementById('flowForm').reset();
      // Automatically advance to phase 1
      await updatePhase(1);
      await loadDashboard();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to create flow');
    }
  } catch (error) {
    console.error('Error creating flow:', error);
    alert('Failed to create flow');
  }
});

// Update phase
async function updatePhase(phase) {
  try {
    const response = await fetch('/api/admin/phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase })
    });

    if (response.ok) {
      await loadDashboard();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to update phase');
    }
  } catch (error) {
    console.error('Error updating phase:', error);
    alert('Failed to update phase');
  }
}

// Phase control buttons
document.getElementById('startSubmission').addEventListener('click', () => updatePhase(1));
document.getElementById('startVoting').addEventListener('click', () => updatePhase(2));
document.getElementById('showResults').addEventListener('click', () => updatePhase(3));
document.getElementById('resetFlow').addEventListener('click', () => updatePhase(0));

// Display submissions
function displaySubmissions(songs) {
  const submissionsSection = document.getElementById('submissionsSection');
  const submissionsList = document.getElementById('submissionsList');

  submissionsSection.classList.remove('hidden');
  submissionsList.innerHTML = '';

  songs.forEach(song => {
    const item = document.createElement('div');
    item.className = 'submission-item';
    item.innerHTML = `
      <div class="submission-info">
        <div class="submission-details">
          <h4>${escapeHtml(song.song_name)}</h4>
          <p>by ${escapeHtml(song.song_author)}</p>
          <a href="${escapeHtml(song.song_link)}" target="_blank" class="song-link">
            ${escapeHtml(song.song_link)}
          </a>
        </div>
        <div class="submission-submitter">
          ${escapeHtml(song.submitter_name)}
        </div>
      </div>
    `;
    submissionsList.appendChild(item);
  });
}

// Display results
function displayResults(results) {
  const resultsSection = document.getElementById('resultsSection');
  const resultsList = document.getElementById('adminResultsList');

  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  results.forEach((result, index) => {
    const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <div class="result-rank ${rankClass}">${index + 1}</div>
      <div class="result-info">
        <div class="result-title">${escapeHtml(result.song_name)}</div>
        <div class="result-artist">by ${escapeHtml(result.song_author)}</div>
        <div class="result-submitter">Submitted by ${escapeHtml(result.submitter_name)}</div>
        <a href="${escapeHtml(result.song_link)}" target="_blank" class="song-link">Listen →</a>
      </div>
      <div class="result-points">${result.total_points} pts</div>
    `;
    resultsList.appendChild(item);
  });
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();
