const STATE_KEY = 'zaneos_v1_daily';
const IDEAS_KEY  = 'zaneos_v1_ideas';

const SECTIONS = {
  morning:  ['workout', 'supplements', 'breakfast', 'protein'],
  business: ['growth'],
  evening:  ['magnesium', 'reels', 'family', 'read'],
};

const TOTALS = { morning: 4, business: 1, evening: 4 };

function getTodayKey() {
  // YYYY-MM-DD in local time
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
    if (!stored || stored.date !== getTodayKey()) return freshState();
    return stored;
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadIdeas() {
  try {
    return JSON.parse(localStorage.getItem(IDEAS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveIdeas() {
  localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
}

let state = loadState();
let ideas = loadIdeas();

function init() {
  // Date header
  document.getElementById('date-display').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Wire up checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
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

  // Ideas
  document.getElementById('add-btn').addEventListener('click', addIdea);
  document.getElementById('idea-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addIdea();
  });

  updateScores();
  renderIdeas();
}

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
  } else if (total >= 6) {
    totalEl.classList.remove('perfect');
    totalEl.style.color = '#f59e0b';
  } else {
    totalEl.classList.remove('perfect');
    totalEl.style.color = '';
  }
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

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

init();
