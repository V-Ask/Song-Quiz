let currentPhase = -1;

// Initialize presentation
async function init() {
  await updateDisplay();
  // Check for updates every 3 seconds
  setInterval(updateDisplay, 3000);
}

// Update the display based on current phase
async function updateDisplay() {
  try {
    const response = await fetch('/api/flow');
    const data = await response.json();

    // Only update if phase changed
    if (data.phase !== currentPhase) {
      currentPhase = data.phase;
      showPhase(data.phase);
    }

    // Update phase-specific content
    switch (data.phase) {
      case 1:
        await loadSubmissionPhase(data);
        break;
      case 2:
        await loadVotingPhase(data);
        break;
      case 3:
        await loadResultsPhase(data);
        break;
    }
  } catch (error) {
    console.error('Error updating display:', error);
  }
}

// Show specific phase display
function showPhase(phase) {
  // Hide all phases
  for (let i = 0; i <= 3; i++) {
    const phaseEl = document.getElementById(`phase${i}`);
    if (phaseEl) {
      phaseEl.classList.add('hidden');
    }
  }

  // Show current phase
  const currentPhaseEl = document.getElementById(`phase${phase}`);
  if (currentPhaseEl) {
    currentPhaseEl.classList.remove('hidden');
  }
}

// Phase 1: Submission phase
async function loadSubmissionPhase(data) {
  document.getElementById('theme1').textContent = data.theme || 'No theme set';

  try {
    const response = await fetch('/api/songs/list');
    const songsData = await response.json();
    const count = songsData.songs ? songsData.songs.length : 0;

    const counterEl = document.getElementById('submissionCount');
    counterEl.textContent = `${count} song${count !== 1 ? 's' : ''} submitted`;
  } catch (error) {
    console.error('Error loading submission count:', error);
  }
}

// Phase 2: Voting phase
async function loadVotingPhase(data) {
  document.getElementById('theme2').textContent = data.theme || 'No theme set';

  try {
    const response = await fetch('/api/songs/list');
    const songsData = await response.json();
    const songs = songsData.songs || [];

    const songsList = document.getElementById('songsList');
    songsList.innerHTML = '';

    songs.forEach(song => {
      const songCard = document.createElement('div');
      songCard.className = 'song-card';
      songCard.innerHTML = `
        <div class="song-title">${escapeHtml(song.song_name)}</div>
        <div class="song-artist">by ${escapeHtml(song.song_author)}</div>
        <div class="song-submitter">submitted by ${escapeHtml(song.submitter_name)}</div>
      `;
      songsList.appendChild(songCard);
    });
  } catch (error) {
    console.error('Error loading songs:', error);
  }
}

// Phase 3: Results phase
async function loadResultsPhase(data) {
  document.getElementById('theme3').textContent = data.theme || 'No theme set';

  try {
    const response = await fetch('/api/votes/results');
    const resultsData = await response.json();
    const results = resultsData.results || [];

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach((result, index) => {
      const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
      const resultCard = document.createElement('div');
      resultCard.className = 'result-card';
      resultCard.innerHTML = `
        <div class="result-rank ${rankClass}">${index + 1}</div>
        <div class="result-info">
          <div class="result-title">${escapeHtml(result.song_name)}</div>
          <div class="result-artist">by ${escapeHtml(result.song_author)}</div>
          <div class="result-submitter">submitted by ${escapeHtml(result.submitter_name)}</div>
        </div>
        <div class="result-points">${result.total_points} pts</div>
      `;
      resultsList.appendChild(resultCard);
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

// Start the presentation
init();
