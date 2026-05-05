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
  loadModeratedQuizzes();
  pollInterval = setInterval(() => {
    loadQuizzes();
    loadModeratedQuizzes();
  }, 5000);
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

// Forgot password link
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('forgotPasswordForm').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  document.querySelector('.auth-tabs').classList.add('hidden');
});

document.getElementById('backToLogin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgotPasswordForm').classList.add('hidden');
  document.querySelector('.auth-tabs').classList.remove('hidden');
  showAuthTab('login');
});

// Forgot password form
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value;

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      const el = document.getElementById('authError');
      el.textContent = data.message;
      el.style.color = 'var(--success)';
      el.style.background = 'rgba(16, 185, 129, 0.1)';
      el.style.borderColor = 'var(--success)';
      el.classList.remove('hidden');
    } else {
      showAuthError(data.error || 'Failed to send reset email');
    }
  } catch (error) {
    showAuthError('Failed to send reset email');
  }
});

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
  const schedule1 = document.getElementById('schedule1Input').value;
  const schedule2 = document.getElementById('schedule2Input').value;
  const schedule3 = document.getElementById('schedule3Input').value;

  const formData = new FormData();
  formData.append('theme', theme);
  if (timer) formData.append('timer', timer);
  if (selectedThemeImageFile) formData.append('themeImage', selectedThemeImageFile);

  // Convert datetime-local values to unix timestamps
  if (schedule1) formData.append('phase1At', Math.floor(new Date(schedule1).getTime() / 1000));
  if (schedule2) formData.append('phase2At', Math.floor(new Date(schedule2).getTime() / 1000));
  if (schedule3) formData.append('phase3At', Math.floor(new Date(schedule3).getTime() / 1000));

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

      // Only auto-advance to phase 1 if no schedule is set for phase 1
      if (!schedule1) {
        await fetch(`/api/quiz/${data.quizId}/phase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 1 })
        });
      }

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
        ${quiz.phase < 3 ? `
          <div class="quiz-schedule" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
            <strong style="font-size:0.85rem;color:var(--text-dim);">Schedule</strong>
            <div style="font-size:0.85rem;margin-top:0.25rem;">
              ${[1,2,3].map(p => {
                const schedVal = quiz['phase_' + p + '_at'];
                const label = p === 1 ? 'Submissions' : p === 2 ? 'Voting' : 'Results';
                const isPast = quiz.phase >= p;
                if (isPast) return '';
                return '<div style="display:flex;align-items:center;gap:0.5rem;margin:0.25rem 0;">' +
                  '<span style="min-width:90px;">' + label + ':</span>' +
                  '<input type="datetime-local" id="sched-' + quiz.id + '-' + p + '"' +
                  ' value="' + (schedVal ? new Date(schedVal * 1000).toISOString().slice(0, 16) : '') + '"' +
                  ' style="flex:1;padding:0.3rem;background:var(--surface);border:1px solid var(--border);border-radius:0.3rem;color:var(--text);font-size:0.8rem;">' +
                  (schedVal ? ' <span class="countdown" data-target="' + schedVal + '" style="color:var(--primary);font-size:0.8rem;min-width:80px;"></span>' : '') +
                  '</div>';
              }).join('')}
              <button class="btn-small btn-copy" onclick="saveSchedule('${quiz.id}')" style="margin-top:0.5rem;">Save Schedule</button>
            </div>
          </div>
        ` : ''}
        <div class="quiz-moderators" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <strong style="font-size:0.85rem;color:var(--text-dim);">Moderators</strong>
          </div>
          <div id="modList-${quiz.id}" class="mod-list" style="font-size:0.85rem;"></div>
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
            <input type="text" id="modInput-${quiz.id}" placeholder="Username" style="flex:1;padding:0.4rem 0.6rem;background:var(--surface);border:1px solid var(--border);border-radius:0.4rem;color:var(--text);font-size:0.8rem;">
            <button class="btn-small btn-copy" onclick="inviteModerator('${quiz.id}')">Invite</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Load moderator lists for each quiz
  quizzes.forEach(quiz => loadModerators(quiz.id));
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

// === Schedule management ===

async function saveSchedule(quizId) {
  const body = {};
  const p1Input = document.getElementById(`sched-${quizId}-1`);
  const p2Input = document.getElementById(`sched-${quizId}-2`);
  const p3Input = document.getElementById(`sched-${quizId}-3`);

  if (p1Input && p1Input.value) body.phase1At = Math.floor(new Date(p1Input.value).getTime() / 1000);
  if (p2Input && p2Input.value) body.phase2At = Math.floor(new Date(p2Input.value).getTime() / 1000);
  if (p3Input && p3Input.value) body.phase3At = Math.floor(new Date(p3Input.value).getTime() / 1000);

  try {
    const res = await fetch(`/api/quiz/${quizId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      await loadQuizzes();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save schedule');
    }
  } catch (error) {
    alert('Failed to save schedule');
  }
}

// Countdown timer updater (runs every second)
setInterval(() => {
  document.querySelectorAll('.countdown[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const now = Math.floor(Date.now() / 1000);
    const diff = target - now;

    if (diff <= 0) {
      el.textContent = 'Now!';
      return;
    }

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      el.textContent = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      el.textContent = `${hours}h ${minutes}m`;
    } else {
      el.textContent = `${minutes}m ${seconds}s`;
    }
  });
}, 1000);

// === Moderator management ===

async function inviteModerator(quizId) {
  const input = document.getElementById(`modInput-${quizId}`);
  const username = input.value.trim();
  if (!username) return;

  try {
    const res = await fetch(`/api/quiz/${quizId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (res.ok) {
      input.value = '';
      loadModerators(quizId);
    } else {
      alert(data.error || 'Failed to invite moderator');
    }
  } catch (error) {
    alert('Failed to invite moderator');
  }
}

async function removeModerator(quizId, accountId) {
  if (!confirm('Remove this moderator?')) return;
  try {
    const res = await fetch(`/api/quiz/${quizId}/moderators/${accountId}`, { method: 'DELETE' });
    if (res.ok) {
      loadModerators(quizId);
    }
  } catch (error) {
    alert('Failed to remove moderator');
  }
}

async function loadModerators(quizId) {
  try {
    const res = await fetch(`/api/quiz/${quizId}/moderators`);
    const data = await res.json();
    const container = document.getElementById(`modList-${quizId}`);
    if (!container) return;

    if (data.moderators.length === 0) {
      container.innerHTML = '<span style="color:var(--text-dim)">No moderators</span>';
      return;
    }

    container.innerHTML = data.moderators.map(m =>
      `<span style="display:inline-flex;align-items:center;gap:0.25rem;margin:0.25rem 0.25rem 0.25rem 0;padding:0.2rem 0.5rem;background:var(--surface);border-radius:0.5rem;border:1px solid var(--border);">
        ${escapeHtml(m.display_name)}
        <button onclick="removeModerator('${quizId}', '${m.id}')" style="background:none;border:none;color:var(--error);cursor:pointer;font-size:0.9rem;padding:0 0.25rem;">&times;</button>
      </span>`
    ).join('');
  } catch (error) {
    console.error('Error loading moderators:', error);
  }
}

// === Moderated quizzes ===

async function loadModeratedQuizzes() {
  try {
    const res = await fetch('/api/quiz/moderated');
    const data = await res.json();
    const quizzes = data.quizzes || [];
    const section = document.getElementById('moderatedSection');

    if (quizzes.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    renderModeratedQuizzes(quizzes);
  } catch (error) {
    console.error('Error loading moderated quizzes:', error);
  }
}

function renderModeratedQuizzes(quizzes) {
  const container = document.getElementById('moderatedQuizList');
  container.innerHTML = quizzes.map(quiz => {
    const date = new Date(quiz.created_at * 1000).toLocaleDateString();
    const phaseLabels = ['Setup', 'Submissions', 'Voting', 'Results'];
    const presentationUrl = `${window.location.origin}/presentation?quiz=${quiz.id}`;

    return `
      <div class="quiz-card" data-quiz-id="${quiz.id}">
        <div class="quiz-card-header">
          <h3>${escapeHtml(quiz.theme)}</h3>
          <span class="phase-badge phase-${quiz.phase}">Phase ${quiz.phase}: ${phaseLabels[quiz.phase]}</span>
        </div>
        <div class="quiz-card-meta">Created ${date} (Moderator)</div>
        <div class="quiz-card-actions">
          <button class="btn-small btn-copy" onclick="copyLink('${quiz.id}', this)">Copy Link</button>
          <a href="${presentationUrl}" target="_blank" class="btn-small btn-presentation" style="text-decoration:none">Presentation</a>
          ${quiz.completed_at ? `<a href="/stats?quiz=${quiz.id}" class="btn-small btn-stats" style="text-decoration:none">View Stats</a>` : ''}
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

// Make functions available globally for onclick handlers
window.showAuthTab = showAuthTab;
window.advancePhase = advancePhase;
window.copyLink = copyLink;
window.deleteQuiz = deleteQuiz;
window.inviteModerator = inviteModerator;
window.removeModerator = removeModerator;
window.saveSchedule = saveSchedule;

init();
