const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quiz');

let currentPhase = -1;
let currentHighlightIndex = 0;
let highlightInterval = null;
let cachedResultsJson = null;
let cachedResultCards = null;

// Initialize presentation
async function init() {
  if (!quizId) {
    document.querySelector('.presentation-container').innerHTML =
      '<div style="text-align:center"><h1 style="font-size:48px;margin-bottom:20px">No Quiz Specified</h1><p style="font-size:24px;opacity:0.8">Use a quiz link to access the presentation view.</p></div>';
    return;
  }

  await updateDisplay();
  setInterval(updateDisplay, 3000);
}

// Update the display based on current phase
async function updateDisplay() {
  try {
    const response = await fetch(`/api/flow?quizId=${quizId}`);
    const data = await response.json();

    if (data.error) return;

    // Only update if phase changed
    if (data.phase !== currentPhase) {
      currentPhase = data.phase;
      showPhase(data.phase);
    }

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
  if (currentPhase === 3 && phase !== 3) {
    stopHighlightCycle();
    cachedResultsJson = null;
  }

  for (let i = 0; i <= 3; i++) {
    const phaseEl = document.getElementById(`phase${i}`);
    if (phaseEl) phaseEl.classList.add('hidden');
  }

  const currentPhaseEl = document.getElementById(`phase${phase}`);
  if (currentPhaseEl) currentPhaseEl.classList.remove('hidden');
}

// Phase 1: Submission phase
async function loadSubmissionPhase(data) {
  document.getElementById('theme1').textContent = data.theme || 'No theme set';

  const imageContainer = document.getElementById('themeImageContainer');
  const themeImage = document.getElementById('themeImage1');
  if (data.themeImage) {
    themeImage.src = data.themeImage;
    imageContainer.classList.remove('hidden');
  } else {
    imageContainer.classList.add('hidden');
  }

  try {
    const response = await fetch(`/api/songs/list?quizId=${quizId}`);
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
    const response = await fetch(`/api/songs/list?quizId=${quizId}`);
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
    const [resultsRes, badgesRes] = await Promise.all([
      fetch(`/api/votes/results?quizId=${quizId}`),
      fetch(`/api/votes/badges?quizId=${quizId}`)
    ]);
    const resultsData = await resultsRes.json();
    const badgesData = await badgesRes.json();
    const results = resultsData.results || [];
    const badges = badgesData.badges || {};

    const newResultsJson = JSON.stringify({ results, badges });
    if (newResultsJson === cachedResultsJson) {
      return;
    }
    cachedResultsJson = newResultsJson;
    cachedResultCards = null;

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach((result, index) => {
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

      const resultCard = document.createElement('div');
      resultCard.className = 'result-card';
      resultCard.innerHTML = `
        <div class="result-rank ${rankClass}">${index + 1}</div>
        <div class="result-info">
          <div class="result-title">${escapeHtml(result.song_name)}</div>
          <div class="result-artist">by ${escapeHtml(result.song_author)}</div>
          <div class="result-submitter">submitted by ${escapeHtml(result.submitter_name)}</div>
          ${badgesHtml}
        </div>
        <div class="result-points">${result.total_points} pts</div>
      `;
      resultsList.appendChild(resultCard);
    });

    startHighlightCycle(results.length);
  } catch (error) {
    console.error('Error loading results:', error);
  }
}

// Highlight cycling
function startHighlightCycle(totalResults) {
  if (totalResults === 0) return;
  stopHighlightCycle();
  currentHighlightIndex = 0;
  updateHighlight(totalResults);
  highlightInterval = setInterval(() => {
    currentHighlightIndex = (currentHighlightIndex + 1) % totalResults;
    updateHighlight(totalResults);
  }, 3000);
}

function updateHighlight(totalResults) {
  if (!cachedResultCards || cachedResultCards.length !== totalResults) {
    cachedResultCards = document.querySelectorAll('.result-card');
  }
  for (let i = 0; i < cachedResultCards.length; i++) {
    if (i === currentHighlightIndex) {
      cachedResultCards[i].classList.add('highlighted');
      cachedResultCards[i].scrollIntoView({ behavior: 'instant', block: 'center' });
    } else {
      cachedResultCards[i].classList.remove('highlighted');
    }
  }
}

function stopHighlightCycle() {
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();
