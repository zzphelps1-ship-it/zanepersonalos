const STATE_KEY     = 'zaneos_v1_daily';
const IDEAS_KEY     = 'zaneos_v1_ideas';
const NOTES_LOG_KEY = 'zaneos_v1_notes_log';
const TOMORROW_KEY  = 'zaneos_v1_tomorrow';
const ACTIVITY_KEY  = 'zaneos_v1_activity';

const GROWTH_ACTIVITIES = [
  // Sales
  { category: 'Sales',                text: 'Call old leads' },
  { category: 'Sales',                text: 'Follow up old estimates' },
  { category: 'Sales',                text: 'Ask a past customer for a review' },
  { category: 'Sales',                text: 'Ask a past customer for a referral' },
  { category: 'Sales',                text: 'Reach out to a no-show lead' },
  // Customers
  { category: 'Customers',            text: 'Check in with a coating customer' },
  { category: 'Customers',            text: 'Follow up with a detail customer' },
  { category: 'Customers',            text: 'Ask for before/after photos' },
  { category: 'Customers',            text: 'Ask for a testimonial' },
  // Content
  { category: 'Content',              text: 'Post before/after' },
  { category: 'Content',              text: 'Film a 30-second coating video' },
  { category: 'Content',              text: 'Record a FAQ video' },
  { category: 'Content',              text: 'Take new portfolio photos' },
  // Partnerships
  { category: 'Partnerships',         text: 'Contact a tint shop' },
  { category: 'Partnerships',         text: 'Contact a PPF shop' },
  { category: 'Partnerships',         text: 'Contact a dealership salesperson' },
  { category: 'Partnerships',         text: 'Contact a local realtor' },
  // Business Development
  { category: 'Business Dev',         text: 'Improve quote script' },
  { category: 'Business Dev',         text: 'Improve follow-up script' },
  { category: 'Business Dev',         text: 'Review ad performance' },
  { category: 'Business Dev',         text: 'Review closed vs lost jobs' },
  // Emergency
  { category: '🚨 Emergency',         text: 'Call 5 old leads' },
  { category: '🚨 Emergency',         text: 'Ask 3 customers for reviews' },
  { category: '🚨 Emergency',         text: 'Post one before/after' },
];

const TOTAL_ACTIVITIES = GROWTH_ACTIVITIES.length; // 24

const SECTIONS = {
  morning:  ['workout', 'supplements', 'breakfast', 'protein'],
  business: ['growth'],
  evening:  ['magnesium', 'reels', 'family', 'read'],
};

const TOTALS = { morning: 4, business: 1, evening: 4 };

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function freshState() {
  return {
    date: getTodayKey(),
    morning:  { workout: false, supplements: false, breakfast: false, protein: false },
    business: { growth: false },
    evening:  { magnesium: false, reels: false, family: false, read: false },
    notes: '',
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY));
    if (!stored || stored.date !== getTodayKey()) {
      // Archive yesterday's note before resetting
      if (stored?.notes?.trim()) {
        const log = loadNotesLog();
        if (!log.find(e => e.date === stored.date)) {
          log.unshift({ date: stored.date, text: stored.notes.trim() });
          localStorage.setItem(NOTES_LOG_KEY, JSON.stringify(log));
        }
      }
      return freshState();
    }
    return stored;
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// ── Activity Picker ──────────────────────────────────────────
function freshActivity() {
  return { date: getTodayKey(), usedIndices: [], rerollsLeft: 1, currentIndex: null };
}

function loadActivity() {
  try {
    const stored = JSON.parse(localStorage.getItem(ACTIVITY_KEY));
    if (!stored || stored.date !== getTodayKey()) return freshActivity();
    return stored;
  } catch { return freshActivity(); }
}

function saveActivity() {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
}

function pickRandom(excludeIdx = null) {
  const available = GROWTH_ACTIVITIES
    .map((_, i) => i)
    .filter(i => !activity.usedIndices.includes(i) && i !== excludeIdx);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function openSuggestion() {
  if (activity.currentIndex === null) {
    let idx = pickRandom();
    if (idx === null) {
      // Cycle complete — reset and start fresh
      activity.usedIndices = [];
      saveActivity();
      idx = pickRandom();
    }
    activity.currentIndex = idx;
    saveActivity();
  }
  renderSuggestion(true);
}

function closeSuggestion() {
  renderSuggestion(false);
}

function markDone() {
  if (activity.currentIndex === null) return;
  activity.usedIndices.push(activity.currentIndex);
  activity.currentIndex = null;
  if (activity.usedIndices.length >= TOTAL_ACTIVITIES) {
    activity.usedIndices = []; // Cycle complete — reset
  }
  saveActivity();
  renderSuggestion(false);
  renderActivityProgress();
}

function reroll() {
  if (activity.rerollsLeft <= 0 || activity.currentIndex === null) return;
  const newIdx = pickRandom(activity.currentIndex); // exclude current, put it back
  if (newIdx === null) return;
  activity.currentIndex = newIdx;
  activity.rerollsLeft--;
  saveActivity();
  renderSuggestion(true);
}

function renderSuggestion(show) {
  const card = document.getElementById('suggestion-card');
  if (!show || activity.currentIndex === null) {
    card.style.display = 'none';
    return;
  }

  const item      = GROWTH_ACTIVITIES[activity.currentIndex];
  const emergency = item.category.includes('Emergency');
  const done      = activity.usedIndices.length;
  const remaining = TOTAL_ACTIVITIES - done;

  card.style.display = 'block';
  card.innerHTML = `
    <div class="suggestion-inner${emergency ? ' emergency' : ''}">
      <div class="suggestion-top">
        <span class="suggestion-category">${item.category}</span>
        <button class="suggestion-close" onclick="closeSuggestion()">×</button>
      </div>
      <p class="suggestion-text">${escapeHtml(item.text)}</p>
      <div class="suggestion-actions">
        <button class="suggestion-done" onclick="markDone()">✓ Done</button>
        ${activity.rerollsLeft > 0
          ? `<button class="suggestion-reroll" onclick="reroll()">↺ Re-roll <span class="reroll-badge">${activity.rerollsLeft} left</span></button>`
          : `<span class="reroll-used">No re-rolls left today</span>`
        }
      </div>
      <p class="suggestion-progress">${done} of ${TOTAL_ACTIVITIES} done this cycle &nbsp;·&nbsp; ${remaining} remaining</p>
    </div>
  `;
}

function renderActivityProgress() {
  const el = document.getElementById('activity-progress');
  if (el) el.textContent = `${activity.usedIndices.length}/${TOTAL_ACTIVITIES}`;
}

// ── Notes Log ────────────────────────────────────────────────
function loadNotesLog() {
  try { return JSON.parse(localStorage.getItem(NOTES_LOG_KEY)) || []; }
  catch { return []; }
}

function saveNotesLog() {
  localStorage.setItem(NOTES_LOG_KEY, JSON.stringify(notesLog));
}

function deleteNoteLog(date) {
  notesLog = notesLog.filter(e => e.date !== date);
  saveNotesLog();
  renderNotesLog();
}

function renderNotesLog() {
  const section = document.getElementById('notes-log-section');
  const list = document.getElementById('notes-log-list');

  if (notesLog.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = notesLog.map(entry => `
    <div class="log-entry">
      <div class="log-header">
        <span class="log-date">${formatDateFull(entry.date)}</span>
        <button class="idea-delete" onclick="deleteNoteLog('${entry.date}')" title="Remove">×</button>
      </div>
      <p class="log-text">${escapeHtml(entry.text)}</p>
    </div>
  `).join('');
}

// ── Tomorrow ─────────────────────────────────────────────────
function loadTomorrow() {
  try { return JSON.parse(localStorage.getItem(TOMORROW_KEY)) || []; }
  catch { return []; }
}

function saveTomorrow() {
  localStorage.setItem(TOMORROW_KEY, JSON.stringify(tomorrow));
}

function addTomorrow() {
  const input = document.getElementById('tomorrow-input');
  const text = input.value.trim();
  if (!text) return;

  tomorrow.unshift({ id: Date.now(), text, done: false, date: getTodayKey() });
  saveTomorrow();
  input.value = '';
  renderTomorrow();
}

function toggleTomorrow(id) {
  const item = tomorrow.find(t => t.id === id);
  if (item) item.done = !item.done;
  saveTomorrow();
  renderTomorrow();
}

function deleteTomorrow(id) {
  tomorrow = tomorrow.filter(t => t.id !== id);
  saveTomorrow();
  renderTomorrow();
}

function renderTomorrow() {
  const list = document.getElementById('tomorrow-list');

  if (tomorrow.length === 0) {
    list.innerHTML = '<p class="ideas-empty">Nothing planned yet.</p>';
    return;
  }

  list.innerHTML = tomorrow.map(item => `
    <li class="tomorrow-item ${item.done ? 'done' : ''}">
      <label class="check-item" style="padding:6px 0; flex:1;">
        <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleTomorrow(${item.id})">
        <span class="checkmark tomorrow-check"></span>
        <span class="task-label">${escapeHtml(item.text)}</span>
      </label>
      <button class="idea-delete" onclick="deleteTomorrow(${item.id})" title="Remove">×</button>
    </li>
  `).join('');
}

// ── Ideas ────────────────────────────────────────────────────
function loadIdeas() {
  try { return JSON.parse(localStorage.getItem(IDEAS_KEY)) || []; }
  catch { return []; }
}

function saveIdeas() {
  localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
}

function addIdea() {
  const input = document.getElementById('idea-input');
  const text = input.value.trim();
  if (!text) return;

  ideas.unshift({ id: Date.now(), text, date: getTodayKey() });
  saveIdeas();
  input.value = '';
  renderIdeas();
}

function deleteIdea(id) {
  ideas = ideas.filter(i => i.id !== id);
  saveIdeas();
  renderIdeas();
}

function renderIdeas() {
  const list = document.getElementById('ideas-list');

  if (ideas.length === 0) {
    list.innerHTML = '<p class="ideas-empty">No ideas yet — add some for v2.</p>';
    return;
  }

  list.innerHTML = ideas.map(idea => `
    <li class="idea-item">
      <span class="idea-bullet">·</span>
      <span class="idea-text">${escapeHtml(idea.text)}</span>
      <span class="idea-date">${formatDate(idea.date)}</span>
      <button class="idea-delete" onclick="deleteIdea(${idea.id})" title="Remove">×</button>
    </li>
  `).join('');
}

// ── Scores ───────────────────────────────────────────────────
function updateScores() {
  let total = 0;

  for (const [section, keys] of Object.entries(SECTIONS)) {
    const done = keys.filter(k => state[section]?.[k]).length;
    document.getElementById(`score-${section}`).textContent = `${done}/${TOTALS[section]}`;
    total += done;
  }

  const totalEl = document.getElementById('score-total');
  totalEl.textContent = `${total}/9`;

  if (total === 9) {
    totalEl.classList.add('perfect');
    totalEl.style.color = '';
  } else if (total >= 6) {
    totalEl.classList.remove('perfect');
    totalEl.style.color = '#f59e0b';
  } else {
    totalEl.classList.remove('perfect');
    totalEl.style.color = '';
  }
}

// ── Helpers ──────────────────────────────────────────────────
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Init ─────────────────────────────────────────────────────
let state    = loadState();
let ideas    = loadIdeas();
let notesLog = loadNotesLog();
let tomorrow = loadTomorrow();
let activity = loadActivity();

function init() {
  document.getElementById('date-display').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Checkboxes
  document.querySelectorAll('input[data-section]').forEach(cb => {
    const { section, key } = cb.dataset;
    cb.checked = state[section]?.[key] ?? false;
    cb.addEventListener('change', () => {
      state[section][key] = cb.checked;
      saveState();
      updateScores();
    });
  });

  // Notes
  const notesEl = document.getElementById('notes-input');
  notesEl.value = state.notes || '';
  notesEl.addEventListener('input', () => {
    state.notes = notesEl.value;
    saveState();
  });

  // Tomorrow
  document.getElementById('tomorrow-add-btn').addEventListener('click', addTomorrow);
  document.getElementById('tomorrow-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTomorrow();
  });

  // Ideas
  document.getElementById('add-btn').addEventListener('click', addIdea);
  document.getElementById('idea-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addIdea();
  });

  updateScores();
  renderTomorrow();
  renderNotesLog();
  renderIdeas();
  renderActivityProgress();
  // Restore suggestion card if one was open when they last left
  if (activity.currentIndex !== null) renderSuggestion(true);
}

init();
