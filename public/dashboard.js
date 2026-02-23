let currentAccount = null;
let selectedThemeImageFile = null;
let pollInterval = null;

async function init() {
  const meRes = await fetch('/api/auth/me');
  const meData = await meRes.json();

  if (meData.authenticated) {
    currentAccount = meData.account;
    showDashboard();
  } else {
    showAuth();
  }
}

function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  if (pollInterval) clearInterval(pollInterval);
}

function showDashboard() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('displayName').textContent = currentAccount.displayName;
  loadQuizzes();
  pollInterval = setInterval(loadQuizzes, 5000);
}

function showAuthTab(tab) {
  document.getElementById('authError').classList.add('hidden');
  if (tab === 'login') {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
  } else {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
  }
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok) {
      currentAccount = data.account;
      showDashboard();
    } else {
      showAuthError(data.error || 'Login failed');
    }
  } catch (error) {
    showAuthError('Login failed');
  }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const displayName = document.getElementById('regDisplayName').value;
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, displayName })
    });
    const data = await res.json();

    if (res.ok) {
      currentAccount = data.account;
      showDashboard();
    } else {
      showAuthError(data.error || 'Registration failed');
    }
  } catch (error) {
    showAuthError('Registration failed');
  }
});

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentAccount = null;
  showAuth();
});

// Theme image handling
document.getElementById('themeImageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      e.target.value = '';
      return;
    }
    selectedThemeImageFile = file;
    document.getElementById('previewImg').src = URL.createObjectURL(file);
    document.getElementById('imagePreview').classList.remove('hidden');
  }
});

document.getElementById('removeImage').addEventListener('click', () => {
  selectedThemeImageFile = null;
  document.getElementById('themeImageInput').value = '';
  document.getElementById('imagePreview').classList.add('hidden');
  URL.revokeObjectURL(document.getElementById('previewImg').src);
});

// Create quiz
document.getElementById('createQuizForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const theme = document.getElementById('themeInput').value;
  const timer = document.getElementById('timerInput').value;

  const formData = new FormData();
  formData.append('theme', theme);
  if (timer) formData.append('timer', timer);
  if (selectedThemeImageFile) formData.append('themeImage', selectedThemeImageFile);

  try {
    const res = await fetch('/api/quiz/create', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('createQuizForm').reset();
      selectedThemeImageFile = null;
      document.getElementById('imagePreview').classList.add('hidden');

      // Auto-advance to phase 1
      await fetch(`/api/quiz/${data.quizId}/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 1 })
      });

      await loadQuizzes();
    } else {
      alert(data.error || 'Failed to create quiz');
    }
  } catch (error) {
    alert('Failed to create quiz');
  }
});

// Load quizzes
async function loadQuizzes() {
  try {
    const res = await fetch('/api/quiz/my-quizzes');
    const data = await res.json();
    renderQuizzes(data.quizzes || []);
  } catch (error) {
    console.error('Error loading quizzes:', error);
  }
}

function renderQuizzes(quizzes) {
  const container = document.getElementById('quizList');

  if (quizzes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No quizzes yet. Create your first one above!</p></div>';
    return;
  }

  container.innerHTML = quizzes.map(quiz => {
    const date = new Date(quiz.created_at * 1000).toLocaleDateString();
    const phaseLabels = ['Setup', 'Submissions', 'Voting', 'Results'];
    const shareUrl = `${window.location.origin}/?quiz=${quiz.id}`;
    const presentationUrl = `${window.location.origin}/presentation?quiz=${quiz.id}`;

    return `
      <div class="quiz-card" data-quiz-id="${quiz.id}">
        <div class="quiz-card-header">
          <h3>${escapeHtml(quiz.theme)}</h3>
          <span class="phase-badge phase-${quiz.phase}">Phase ${quiz.phase}: ${phaseLabels[quiz.phase]}</span>
        </div>
        <div class="quiz-card-meta">Created ${date}</div>
        <div class="quiz-card-actions">
          <button class="btn-small btn-copy" onclick="copyLink('${quiz.id}', this)">Copy Link</button>
          <a href="${presentationUrl}" target="_blank" class="btn-small btn-presentation" style="text-decoration:none">Presentation</a>
          ${quiz.completed_at ? `<a href="/stats?quiz=${quiz.id}" class="btn-small btn-stats" style="text-decoration:none">View Stats</a>` : ''}
          <button class="btn-small btn-delete" onclick="deleteQuiz('${quiz.id}')">Delete</button>
        </div>
        ${quiz.phase > 0 && quiz.phase < 3 ? `
          <div class="quiz-phase-control">
            <div class="phase-buttons">
              ${quiz.phase === 1 ? `<button class="btn btn-phase" onclick="advancePhase('${quiz.id}', 2)">Start Voting</button>` : ''}
              ${quiz.phase === 2 ? `<button class="btn btn-phase" onclick="advancePhase('${quiz.id}', 3)">Show Results</button>` : ''}
            </div>
          </div>
        ` : ''}
        ${quiz.phase === 0 ? `
          <div class="quiz-phase-control">
            <button class="btn btn-phase" onclick="advancePhase('${quiz.id}', 1)">Start Submissions</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function advancePhase(quizId, phase) {
  try {
    const res = await fetch(`/api/quiz/${quizId}/phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase })
    });
    if (res.ok) {
      await loadQuizzes();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to advance phase');
    }
  } catch (error) {
    alert('Failed to advance phase');
  }
}

async function copyLink(quizId, btn) {
  const url = `${window.location.origin}/?quiz=${quizId}`;
  try {
    await navigator.clipboard.writeText(url);
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.color = 'var(--success)';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.color = '';
    }, 2000);
  } catch {
    prompt('Copy this link:', url);
  }
}

async function deleteQuiz(quizId) {
  if (!confirm('Are you sure you want to delete this quiz? This cannot be undone.')) return;

  try {
    const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadQuizzes();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete quiz');
    }
  } catch (error) {
    alert('Failed to delete quiz');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.showAuthTab = showAuthTab;
window.advancePhase = advancePhase;
window.copyLink = copyLink;
window.deleteQuiz = deleteQuiz;

init();
