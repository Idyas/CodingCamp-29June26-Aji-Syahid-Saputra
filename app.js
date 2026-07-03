/* ============================================================
   Life Dashboard — app.js
   MVP: Greeting, Focus Timer, To-Do List, Quick Links
   Challenges: ✅ Light/Dark Mode  ✅ Custom Name  ✅ Prevent Duplicates
   Bonus:       Sort Tasks
   ============================================================ */

'use strict';

/* ── Storage Keys ──────────────────────────────────────────── */
const KEY = {
  TODOS:     'ld_todos',
  LINKS:     'ld_links',
  THEME:     'ld_theme',
  NAME:      'ld_name',
  TIMER_DUR: 'ld_timer_duration',
};

/* ── State ─────────────────────────────────────────────────── */
let todos      = [];
let links      = [];
let todoFilter = 'all';   // 'all' | 'active' | 'done'
let sortOrder  = 'newest';

// Timer
let timerTotal   = 25 * 60;   // seconds, may be changed by user
let timerSecs    = timerTotal;
let timerTick    = null;
let timerRunning = false;

/* ── Helpers ───────────────────────────────────────────────── */
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fb; }
  catch { return fb; }
};

const esc = s => String(s)
  .replace(/&/g,  '&amp;')
  .replace(/</g,  '&lt;')
  .replace(/>/g,  '&gt;')
  .replace(/"/g,  '&quot;')
  .replace(/'/g,  '&#39;');

const pad2 = n => String(n).padStart(2, '0');

let _toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 2700);
}

/* ════════════════════════════════════════════════════════════
   CHALLENGE 1 — LIGHT / DARK MODE
   ════════════════════════════════════════════════════════════ */
function initTheme() {
  const saved = load(KEY.THEME, 'dark');
  applyTheme(saved);

  document.getElementById('btn-theme').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('btn-theme').textContent = theme === 'dark' ? '🌙' : '☀️';
  save(KEY.THEME, theme);
}

/* ════════════════════════════════════════════════════════════
   CHALLENGE 2 — CUSTOM NAME IN GREETING
   ════════════════════════════════════════════════════════════ */
function initNameModal() {
  const modal     = document.getElementById('name-modal');
  const nameInput = document.getElementById('name-input');

  document.getElementById('btn-name').addEventListener('click', () => {
    nameInput.value = load(KEY.NAME, '');
    modal.classList.remove('hidden');
    nameInput.focus();
  });

  document.getElementById('name-save-btn').addEventListener('click', saveName);
  document.getElementById('name-cancel-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Close on overlay click
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveName();
    if (e.key === 'Escape') modal.classList.add('hidden');
  });
}

function saveName() {
  const val = document.getElementById('name-input').value.trim();
  save(KEY.NAME, val);
  document.getElementById('name-modal').classList.add('hidden');
  toast(val ? `Hi ${val}! Name saved. 👋` : 'Name cleared.', 'ok');
}

/* ── Greeting (uses saved name) ──────────────────────────── */
function tickGreeting() {
  const now  = new Date();
  const h    = now.getHours();
  const name = load(KEY.NAME, 'Aji Syahid Saputra');

  document.getElementById('greeting-time').textContent =
    `${pad2(h)}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

  document.getElementById('greeting-date').textContent =
    now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const who  = name ? `, ${name}` : '';
  let emoji, phrase;
  if      (h <  5)  { emoji = '🌙'; phrase = `Burning the midnight oil${who}!`; }
  else if (h < 12)  { emoji = '☀️'; phrase = `Good morning${who} — let's crush today!`; }
  else if (h < 17)  { emoji = '🌤️'; phrase = `Good afternoon${who} — stay in the zone.`; }
  else if (h < 20)  { emoji = '🌇'; phrase = `Good evening${who} — great work today!`; }
  else              { emoji = '🌙'; phrase = `Good night${who} — rest up for tomorrow.`; }

  document.getElementById('greeting-msg').textContent = `${emoji} ${phrase}`;
}

/* ════════════════════════════════════════════════════════════
   FOCUS TIMER  (+ custom duration)
   ════════════════════════════════════════════════════════════ */
function initTimer() {
  const savedMin = load(KEY.TIMER_DUR, 25);
  setTimerDuration(savedMin, false);

  document.getElementById('timer-duration-input').value = savedMin;

  document.getElementById('btn-set-duration').addEventListener('click', () => {
    const raw = parseInt(document.getElementById('timer-duration-input').value, 10);
    if (!raw || raw < 1 || raw > 120) {
      toast('Enter a duration between 1 and 120 minutes.', 'error'); return;
    }
    save(KEY.TIMER_DUR, raw);
    setTimerDuration(raw, true);
    toast(`Timer set to ${raw} minute${raw > 1 ? 's' : ''}.`, 'ok');
  });

  document.getElementById('btn-start').addEventListener('click', startTimer);
  document.getElementById('btn-stop').addEventListener('click',  stopTimer);
  document.getElementById('btn-reset').addEventListener('click', resetTimer);
}

function setTimerDuration(minutes, doReset) {
  timerTotal = minutes * 60;
  if (doReset) {
    clearInterval(timerTick);
    timerRunning = false;
    timerSecs    = timerTotal;
    document.getElementById('timer-label').textContent = `Pomodoro · ${minutes} min`;
    renderTimer();
  }
}

function renderTimer() {
  const digits = document.getElementById('timer-digits');
  digits.textContent = `${pad2(Math.floor(timerSecs / 60))}:${pad2(timerSecs % 60)}`;
  digits.className   = 'timer-digits'
    + (timerRunning && timerSecs > 0 ? ' running' : '')
    + (timerSecs === 0               ? ' done'    : '');

  const pct = timerTotal > 0 ? (timerSecs / timerTotal) * 100 : 0;
  const bar = document.getElementById('timer-bar');
  bar.style.width = `${pct}%`;
  bar.className   = 'timer-bar' + (timerSecs === 0 ? ' done' : '');

  document.getElementById('btn-start').disabled = timerRunning || timerSecs === 0;
  document.getElementById('btn-stop').disabled  = !timerRunning;
}

function startTimer() {
  if (timerRunning || timerSecs === 0) return;
  timerRunning = true;
  renderTimer();
  timerTick = setInterval(() => {
    timerSecs--;
    renderTimer();
    if (timerSecs <= 0) {
      clearInterval(timerTick);
      timerRunning = false;
      document.getElementById('timer-label').textContent = '🎉 Session complete!';
      toast('Focus session done — take a break! 🎉', 'ok');
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerTick);
  timerRunning = false;
  renderTimer();
}

function resetTimer() {
  clearInterval(timerTick);
  timerRunning = false;
  timerSecs    = timerTotal;
  const mins   = Math.round(timerTotal / 60);
  document.getElementById('timer-label').textContent = `Pomodoro · ${mins} min`;
  renderTimer();
}

/* ════════════════════════════════════════════════════════════
   TO-DO LIST
   CHALLENGE 3 — PREVENT DUPLICATE TASKS
   BONUS       — SORT TASKS
   ════════════════════════════════════════════════════════════ */
const saveTodos = () => save(KEY.TODOS, todos);

function getSorted(list) {
  const copy = [...list];
  if (sortOrder === 'oldest')     return copy.reverse();
  if (sortOrder === 'alpha')      return copy.sort((a, b) => a.text.localeCompare(b.text));
  if (sortOrder === 'alpha-desc') return copy.sort((a, b) => b.text.localeCompare(a.text));
  return copy; // 'newest' — already stored newest-first
}

function getFiltered() {
  const filtered =
    todoFilter === 'active' ? todos.filter(t => !t.done) :
    todoFilter === 'done'   ? todos.filter(t =>  t.done) :
    todos;
  return getSorted(filtered);
}

function renderTodos() {
  const list      = document.getElementById('todo-list');
  const displayed = getFiltered();
  const doneCount = todos.filter(t => t.done).length;

  document.getElementById('todo-stats').textContent =
    `${doneCount} of ${todos.length} task${todos.length !== 1 ? 's' : ''} done`;

  if (displayed.length === 0) {
    list.innerHTML = `
      <li class="empty-state">
        <span class="empty-icon">${todoFilter === 'done' ? '🎉' : todoFilter === 'active' ? '✨' : '📋'}</span>
        ${todoFilter === 'done'   ? 'No completed tasks yet.' :
          todoFilter === 'active' ? 'All tasks done — nice work!' :
                                    'No tasks yet. Add one above!'}
      </li>`;
    return;
  }

  list.innerHTML = '';
  displayed.forEach(todo => {
    const li = document.createElement('li');
    li.className  = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;
    li.innerHTML  = `
      <div class="todo-check${todo.done ? ' checked' : ''}"
           data-action="toggle" role="checkbox"
           aria-checked="${todo.done}" tabindex="0"
           title="${todo.done ? 'Mark active' : 'Mark done'}">
        ${todo.done ? '✓' : ''}
      </div>
      <span class="todo-text">${esc(todo.text)}</span>
      <div class="todo-actions">
        <button class="act-btn edit"   data-action="edit"   title="Edit">✏️</button>
        <button class="act-btn delete" data-action="delete" title="Delete">🗑️</button>
      </div>`;
    list.appendChild(li);
  });
}

/* CHALLENGE 3: prevent duplicate (case-insensitive) */
function isDuplicate(text) {
  return todos.some(t => t.text.trim().toLowerCase() === text.trim().toLowerCase());
}

function addTodo(text) {
  const t = text.trim();
  if (!t) { toast('Please enter a task.', 'error'); return; }

  // ── Duplicate check ──
  if (isDuplicate(t)) {
    toast(`"${t}" already exists!`, 'warn');
    // shake the input
    const inp = document.getElementById('todo-input');
    inp.classList.remove('shake');
    void inp.offsetWidth; // reflow to restart animation
    inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 500);
    return;
  }

  todos.unshift({ id: uid(), text: t, done: false, at: Date.now() });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const t = todos.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter(x => x.id !== id);
  saveTodos();
  renderTodos();
  toast('Task deleted.');
}

function editTodo(id) {
  const todo = todos.find(x => x.id === id);
  if (!todo) return;
  const li      = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!li) return;

  const textEl  = li.querySelector('.todo-text');
  const actEl   = li.querySelector('.todo-actions');

  const inp = document.createElement('input');
  inp.type      = 'text';
  inp.className = 'todo-edit-input';
  inp.value     = todo.text;
  inp.maxLength = 200;
  li.replaceChild(inp, textEl);
  inp.focus(); inp.select();

  actEl.innerHTML = `
    <button class="act-btn" data-action="save"   title="Save">💾</button>
    <button class="act-btn" data-action="cancel" title="Cancel">✕</button>`;

  const doSave = () => {
    const v = inp.value.trim();
    if (!v) { renderTodos(); return; }
    // Duplicate check (ignore same task)
    if (v.toLowerCase() !== todo.text.toLowerCase() && isDuplicate(v)) {
      toast(`"${v}" already exists!`, 'warn');
      inp.classList.remove('shake');
      void inp.offsetWidth;
      inp.classList.add('shake');
      return;
    }
    todo.text = v;
    saveTodos();
    toast('Task updated.', 'ok');
    renderTodos();
  };

  actEl.querySelector('[data-action="save"]').addEventListener('click', doSave);
  actEl.querySelector('[data-action="cancel"]').addEventListener('click', renderTodos);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  doSave();
    if (e.key === 'Escape') renderTodos();
  });
}

function clearDone() {
  const n = todos.filter(t => t.done).length;
  if (!n) return;
  todos = todos.filter(t => !t.done);
  saveTodos();
  renderTodos();
  toast(`Cleared ${n} completed task${n > 1 ? 's' : ''}.`);
}

function initTodos() {
  todos = load(KEY.TODOS, []);

  const inp    = document.getElementById('todo-input');
  const addBtn = document.getElementById('todo-add-btn');

  const tryAdd = () => { addTodo(inp.value); inp.value = ''; inp.focus(); };
  addBtn.addEventListener('click', tryAdd);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryAdd(); });

  // Delegated list events
  document.getElementById('todo-list').addEventListener('click', e => {
    const li     = e.target.closest('.todo-item');
    if (!li) return;
    const id     = li.dataset.id;
    const source = e.target.closest('[data-action]');
    if (!source) return;
    const act = source.dataset.action;
    if (act === 'toggle') toggleTodo(id);
    if (act === 'edit')   editTodo(id);
    if (act === 'delete') deleteTodo(id);
  });

  // Keyboard support for checkbox
  document.getElementById('todo-list').addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      const cb = e.target.closest('.todo-check');
      if (cb) { e.preventDefault(); toggleTodo(cb.closest('.todo-item').dataset.id); }
    }
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      todoFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTodos();
    });
  });

  // Sort select
  document.getElementById('sort-select').addEventListener('change', e => {
    sortOrder = e.target.value;
    renderTodos();
  });

  document.getElementById('clear-done-btn').addEventListener('click', clearDone);

  renderTodos();
}

/* ════════════════════════════════════════════════════════════
   QUICK LINKS
   ════════════════════════════════════════════════════════════ */
const saveLinks = () => save(KEY.LINKS, links);

function faviconSrc(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return null; }
}

function renderLinks() {
  const grid = document.getElementById('links-grid');

  if (links.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-icon">🔗</span>No quick links yet. Add one below!
      </div>`;
    return;
  }

  grid.innerHTML = '';
  links.forEach(lnk => {
    const a = document.createElement('a');
    a.className    = 'link-card';
    a.href         = lnk.url;
    a.target       = '_blank';
    a.rel          = 'noopener noreferrer';
    a.dataset.id   = lnk.id;

    const fav = faviconSrc(lnk.url);
    a.innerHTML = `
      ${fav ? `<img class="link-favicon" src="${fav}" alt="" loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` : ''}
      <span class="link-fallback"${fav ? ' style="display:none"' : ''}>🌐</span>
      <span>${esc(lnk.name)}</span>
      <button class="link-remove" data-id="${lnk.id}" title="Remove">✕</button>`;
    grid.appendChild(a);
  });
}

function addLink(name, rawUrl) {
  const n = name.trim();
  let   u = rawUrl.trim();
  if (!n || !u) { toast('Fill in both label and URL.', 'error'); return false; }
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); } catch { toast('Invalid URL — check and retry.', 'error'); return false; }

  links.push({ id: uid(), name: n, url: u });
  saveLinks();
  renderLinks();
  toast(`"${n}" added.`, 'ok');
  return true;
}

function removeLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
  toast('Link removed.');
}

function initLinks() {
  links = load(KEY.LINKS, []);

  const nameInp = document.getElementById('link-name-input');
  const urlInp  = document.getElementById('link-url-input');

  const tryAdd = () => {
    if (addLink(nameInp.value, urlInp.value)) {
      nameInp.value = ''; urlInp.value = ''; nameInp.focus();
    }
  };

  document.getElementById('link-add-btn').addEventListener('click', tryAdd);
  urlInp.addEventListener('keydown', e => { if (e.key === 'Enter') tryAdd(); });

  document.getElementById('links-grid').addEventListener('click', e => {
    const btn = e.target.closest('.link-remove');
    if (btn) { e.preventDefault(); e.stopPropagation(); removeLink(btn.dataset.id); }
  });

  renderLinks();
}

/* ── Bootstrap ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNameModal();

  // Start greeting clock
  tickGreeting();
  setInterval(tickGreeting, 1000);

  initTimer();
  initTodos();
  initLinks();
});
