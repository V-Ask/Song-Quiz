const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quiz');

let currentPhase = 0;
let selectedVotes = {};
let justSubmitted = false;
let justVoted = false;

// Initialize app
async function init() {
  if (!quizId) {
    // No quiz specified - show landing page
    document.getElementById('phaseIndicator').textContent = '';
    document.getElementById('landing').classList.remove('hidden');
    return;
  }

  await updatePhase();
  setInterval(checkForUpdates, 5000);
}

// Check for phase updates
async function checkForUpdates() {
  try {
    const response = await fetch(`/api/flow?quizId=${quizId}`);
    const data = await response.json();

    if (data.error) return;

    if (data.phase !== currentPhase) {
      currentPhase = data.phase;
      await updatePhase();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// Update UI based on current phase
async function updatePhase() {
  try {
    const response = await fetch(`/api/flow?quizId=${quizId}`);
    const data = await response.json();

    if (data.error) {
      document.getElementById('phaseIndicator').textContent = '';
      document.getElementById('quizNotFound').classList.remove('hidden');
      return;
    }

    currentPhase = data.phase;

    // Hide all phases
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('quizNotFound').classList.add('hidden');
    for (let i = 0; i <= 3; i++) {
      document.getElementById(`phase${i}`).classList.add('hidden');
    }

    // Update phase indicator
    const phaseIndicator = document.getElementById('phaseIndicator');
    const phaseNames = ['Waiting', 'Submissions Open', 'Voting Open', 'Results'];
    phaseIndicator.textContent = `Phase ${data.phase}: ${phaseNames[data.phase]}`;

    // Show current phase
    document.getElementById(`phase${data.phase}`).classList.remove('hidden');

    // Load phase-specific content
    switch (data.phase) {
      case 1:
        await loadSubmissionPhase(data);
        break;
      case 2:
        await loadVotingPhase(data);
        break;
      case 3:
        await loadResultsPhase();
        break;
    }
  } catch (error) {
    console.error('Error updating phase:', error);
  }
}

// Phase 1: Submission
async function loadSubmissionPhase(data) {
  document.getElementById('theme1').textContent = data.theme;

  // Display theme image if present
  const imageContainer = document.getElementById('themeImageContainer');
  const themeImage = document.getElementById('themeImage');
  if (data.themeImage) {
    themeImage.src = data.themeImage;
    imageContainer.classList.remove('hidden');
  } else {
    imageContainer.classList.add('hidden');
  }

  const submitButton = document.querySelector('#songForm button[type="submit"]');
  const status = document.getElementById('submissionStatus');

  if (data.hasSubmitted) {
    try {
      const response = await fetch(`/api/songs/my-song?quizId=${quizId}`);
      const result = await response.json();

      if (result.song) {
        document.getElementById('submitterName').value = result.song.submitter_name;
        document.getElementById('songName').value = result.song.song_name;
        document.getElementById('songAuthor').value = result.song.song_author;
        document.getElementById('songLink').value = result.song.song_link;

        submitButton.textContent = 'Update Song';
      }
    } catch (error) {
      console.error('Error loading user song:', error);
    }

    document.getElementById('submissionForm').classList.remove('hidden');

    if (justSubmitted) {
      status.textContent = 'Song updated successfully';
      status.classList.remove('hidden');
      status.classList.add('status-message', 'success');
    } else {
      status.classList.add('hidden');
    }
  } else {
    document.getElementById('submissionForm').classList.remove('hidden');
    submitButton.textContent = 'Submit Song';
    document.getElementById('songForm').reset();
    status.classList.add('hidden');
  }
}

// Handle song submission
document.getElementById('songForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    quizId,
    submitterName: document.getElementById('submitterName').value,
    songName: document.getElementById('songName').value,
    songAuthor: document.getElementById('songAuthor').value,
    songLink: document.getElementById('songLink').value
  };

  try {
    const response = await fetch('/api/songs/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
      if (!result.updated) {
        document.getElementById('songForm').reset();
      }
      justSubmitted = true;
      await updatePhase();
    } else {
      alert(result.error || 'Failed to submit song');
    }
  } catch (error) {
    console.error('Error submitting song:', error);
    alert('Failed to submit song');
  }
});

// Phase 2: Voting
async function loadVotingPhase(data) {
  document.getElementById('theme2').textContent = data.theme;

  if (data.hasVoted) {
    const message = justVoted ? 'You have voted' : 'You have already voted';
    document.getElementById('votingSection').innerHTML = `
      <div class="status-message success">
        ${message}
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`/api/songs/list?quizId=${quizId}`);
    const songsData = await response.json();
    const songs = songsData.songs;

    const songsList = document.getElementById('songsList');
    songsList.innerHTML = '';

    songs.forEach(song => {
      const songItem = document.createElement('div');
      songItem.className = 'song-item';
      songItem.innerHTML = `
        <div class="song-info">
          <div class="song-title">${escapeHtml(song.song_name)}</div>
          <div class="song-artist">by ${escapeHtml(song.song_author)}</div>
          <a href="${escapeHtml(song.song_link)}" target="_blank" class="song-link">Listen</a>
        </div>
        <div class="vote-points">
          <button class="point-btn" data-song-id="${song.id}" data-points="3">3 points</button>
          <button class="point-btn" data-song-id="${song.id}" data-points="2">2 points</button>
          <button class="point-btn" data-song-id="${song.id}" data-points="1">1 point</button>
        </div>
      `;
      songsList.appendChild(songItem);
    });

    document.querySelectorAll('.point-btn').forEach(btn => {
      btn.addEventListener('click', handleVoteClick);
    });

    updateVoteButtons();
  } catch (error) {
    console.error('Error loading songs:', error);
  }
}

// Handle vote button click
function handleVoteClick(e) {
  const songId = parseInt(e.target.dataset.songId);
  const points = parseInt(e.target.dataset.points);

  if (selectedVotes[points] === songId) {
    delete selectedVotes[points];
  } else if (selectedVotes[points]) {
    selectedVotes[points] = songId;
  } else {
    selectedVotes[points] = songId;
  }

  updateVoteButtons();
}

// Update vote button states
function updateVoteButtons() {
  document.querySelectorAll('.point-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.disabled = false;
  });

  Object.entries(selectedVotes).forEach(([points, songId]) => {
    const btn = document.querySelector(
      `.point-btn[data-song-id="${songId}"][data-points="${points}"]`
    );
    if (btn) {
      btn.classList.add('selected');
      btn.closest('.song-item').classList.add('selected');
    }

    document.querySelectorAll(`.point-btn[data-song-id="${songId}"]`).forEach(b => {
      if (b.dataset.points !== points) {
        b.disabled = true;
      }
    });

    document.querySelectorAll(`.point-btn[data-points="${points}"]`).forEach(b => {
      if (parseInt(b.dataset.songId) !== songId) {
        b.disabled = true;
      }
    });
  });

  document.querySelectorAll('.song-item').forEach(item => {
    const songId = parseInt(item.querySelector('.point-btn').dataset.songId);
    const hasVote = Object.values(selectedVotes).includes(songId);
    if (hasVote) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  const submitBtn = document.getElementById('submitVotes');
  submitBtn.disabled = Object.keys(selectedVotes).length !== 3;
}

// Submit votes
document.getElementById('submitVotes').addEventListener('click', async () => {
  const votes = Object.entries(selectedVotes).map(([points, songId]) => ({
    songId,
    points: parseInt(points)
  }));

  try {
    const response = await fetch('/api/votes/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, votes })
    });

    const result = await response.json();

    if (response.ok) {
      selectedVotes = {};
      justVoted = true;
      await updatePhase();
    } else {
      alert(result.error || 'Failed to submit votes');
    }
  } catch (error) {
    console.error('Error submitting votes:', error);
    alert('Failed to submit votes');
  }
});

// Phase 3: Results
async function loadResultsPhase() {
  try {
    const [resultsRes, badgesRes] = await Promise.all([
      fetch(`/api/votes/results?quizId=${quizId}`),
      fetch(`/api/votes/badges?quizId=${quizId}`)
    ]);
    const data = await resultsRes.json();
    const badgesData = await badgesRes.json();
    const badges = badgesData.badges || {};

    document.getElementById('theme3').textContent = data.theme;

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    data.results.forEach((result, index) => {
      const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
      const songBadges = badges[result.id] || [];
      const badgesHtml = songBadges.length > 0
        ? `<div class="badges-container">${songBadges.map(b =>
            `<span class="badge" title="${escapeHtml(b.description)}">
              <span class="badge-icon">${b.icon}</span>
              <span class="badge-name">${escapeHtml(b.name)}</span>
            </span>`
          ).join('')}</div>`
        : '';

      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      resultItem.innerHTML = `
        <div class="result-rank ${rankClass}">${index + 1}</div>
        <div class="result-info">
          <div class="result-title">${escapeHtml(result.song_name)}</div>
          <div class="result-artist">by ${escapeHtml(result.song_author)}</div>
          <div class="result-submitter">Submitted by ${escapeHtml(result.submitter_name)}</div>
          ${badgesHtml}
          <a href="${escapeHtml(result.song_link)}" target="_blank" class="song-link">Listen</a>
        </div>
        <div class="result-points">${result.total_points} pts</div>
      `;
      resultsList.appendChild(resultItem);
    });
  } catch (error) {
    console.error('Error loading results:', error);
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();
