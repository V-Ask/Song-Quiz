let currentPhase = 0;
let selectedVotes = {};

// Initialize app
async function init() {
  await updatePhase();
  setInterval(checkForUpdates, 5000); // Check for updates every 5 seconds
}

// Check for phase updates
async function checkForUpdates() {
  try {
    const response = await fetch('/api/flow');
    const data = await response.json();

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
    const response = await fetch('/api/flow');
    const data = await response.json();
    currentPhase = data.phase;

    // Hide all phases
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

  if (data.hasSubmitted) {
    document.getElementById('submissionForm').classList.add('hidden');
    const status = document.getElementById('submissionStatus');
    status.textContent = '✓ You have already submitted a song';
    status.classList.remove('hidden');
    status.classList.add('status-message', 'success');
  } else {
    document.getElementById('submissionForm').classList.remove('hidden');
    document.getElementById('submissionStatus').classList.add('hidden');
  }
}

// Handle song submission
document.getElementById('songForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
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
      document.getElementById('songForm').reset();
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
    document.getElementById('votingSection').innerHTML = `
      <div class="status-message success">
        ✓ You have already voted
      </div>
    `;
    return;
  }

  try {
    const response = await fetch('/api/songs/list');
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
          <a href="${escapeHtml(song.song_link)}" target="_blank" class="song-link">Listen →</a>
        </div>
        <div class="vote-points">
          <button class="point-btn" data-song-id="${song.id}" data-points="3">3 points</button>
          <button class="point-btn" data-song-id="${song.id}" data-points="2">2 points</button>
          <button class="point-btn" data-song-id="${song.id}" data-points="1">1 point</button>
        </div>
      `;
      songsList.appendChild(songItem);
    });

    // Add vote button listeners
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

  // Check if this point value is already assigned
  if (selectedVotes[points] === songId) {
    // Unselect
    delete selectedVotes[points];
  } else if (selectedVotes[points]) {
    // Already assigned to another song, reassign
    selectedVotes[points] = songId;
  } else {
    // Assign new vote
    selectedVotes[points] = songId;
  }

  updateVoteButtons();
}

// Update vote button states
function updateVoteButtons() {
  // Reset all buttons
  document.querySelectorAll('.point-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.disabled = false;
  });

  // Mark selected votes
  Object.entries(selectedVotes).forEach(([points, songId]) => {
    const btn = document.querySelector(
      `.point-btn[data-song-id="${songId}"][data-points="${points}"]`
    );
    if (btn) {
      btn.classList.add('selected');
      btn.closest('.song-item').classList.add('selected');
    }

    // Disable other point buttons for this song
    document.querySelectorAll(`.point-btn[data-song-id="${songId}"]`).forEach(b => {
      if (b.dataset.points !== points) {
        b.disabled = true;
      }
    });

    // Disable same point value for other songs
    document.querySelectorAll(`.point-btn[data-points="${points}"]`).forEach(b => {
      if (parseInt(b.dataset.songId) !== songId) {
        b.disabled = true;
      }
    });
  });

  // Update song item selection state
  document.querySelectorAll('.song-item').forEach(item => {
    const songId = parseInt(item.querySelector('.point-btn').dataset.songId);
    const hasVote = Object.values(selectedVotes).includes(songId);
    if (hasVote) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  // Enable/disable submit button
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
      body: JSON.stringify({ votes })
    });

    const result = await response.json();

    if (response.ok) {
      selectedVotes = {};
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
    const response = await fetch('/api/votes/results');
    const data = await response.json();

    document.getElementById('theme3').textContent = data.theme;

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    data.results.forEach((result, index) => {
      const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      resultItem.innerHTML = `
        <div class="result-rank ${rankClass}">${index + 1}</div>
        <div class="result-info">
          <div class="result-title">${escapeHtml(result.song_name)}</div>
          <div class="result-artist">by ${escapeHtml(result.song_author)}</div>
          <div class="result-submitter">Submitted by ${escapeHtml(result.submitter_name)}</div>
          <a href="${escapeHtml(result.song_link)}" target="_blank" class="song-link">Listen →</a>
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
