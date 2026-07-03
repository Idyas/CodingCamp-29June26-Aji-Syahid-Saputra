/* =========================================
   Life Dashboard — app.js
   Vanilla JS · LocalStorage · No dependencies
   ========================================= */

'use strict';

// ── Storage Keys ──────────────────────────────────────────────────────────────
const STORAGE = {
  TODOS: 'ld_todos',
  LINKS: 'ld_links',
};

// ── State ─────────────────────────────────────────────────────────────────────
let todos      = [];
let links      = [];
let todoFilter = 'all'; // 'all' | 'active' | 'done'

// Timer
const TOTAL_SECS   = 25 * 60;
let timerSecs      = TOTAL_SECS;
let timerTick      = null;
let timerRunning   = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const save  = (key, val)       => localStorage.setItem(key, JSON.stringify(val));
const load  = (key, fallback)  => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function tickGreeting() {
  const now = new Date();
  const h   = now.getHours();
  const pad = n => String(n).padStart(2, '0');

  document.getElementById('greeting-time').textContent =
    `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  document.getElementById('greeting-date').textContent =
    now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

  let msg;
  if      (h < 5)  msg = '🌙 Burning the midnight oil!';
  else if (h < 12) msg = '☀️ Good morning — let\'s crush today!';
  else if (h < 17) msg = '🌤️ Good afternoon — stay in the zone.';
  else if (h < 20) msg = '🌇 Good evening — great work today!';
  else             msg = '🌙 Good night — rest up for tomorrow.';

  document.getElementById('greeting-message').textContent = msg;
}

// ── Focus Timer ───────────────────────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, '0'); }

function renderTimer() {
  const m = Math.floor(timerSecs / 60);
  const s = timerSecs % 60;
  const digits = document.getElementById('timer-digits');

  digits.textContent = `${pad2(m)}:${pad2(s)}`;
  digits.className   = 'timer-digits' +
                       (timerRunning && timerSecs > 0 ? ' running' : '') +
                       (timerSecs === 0               ? ' done'    : '');

  const pct = (timerSecs / TOTAL_SECS) * 100;
  const bar = document.getElementById('timer-bar');
  bar.style.width   = `${pct}%`;
  bar.className      = 'timer-progress-bar' + (timerSecs === 0 ? ' done' : '');

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
  timerSecs    = TOTAL_SECS;
  document.getElementById('timer-label').textContent = 'Pomodoro · 25 min';
  renderTimer();
}

// ── To-Do List ────────────────────────────────────────────────────────────────
const saveTodos = () => save(STORAGE.TODOS, todos);

function renderTodos() {
  const list     = document.getElementById('todo-list');
  const filtered = todoFilter === 'active' ? todos.filter(t => !t.done)
                 : todoFilter === 'done'   ? todos.filter(t =>  t.done)
                 : todos;

  const doneCount = todos.filter(t => t.done).length;
  document.getElementById('todo-stats-text').textContent =
    `${doneCount} of ${todos.length} task${todos.length !== 1 ? 's' : ''} done`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <li class="empty-state">
        <span class="empty-icon">${todoFilter === 'done' ? '🎉' : '📋'}</span>
        ${todoFilter === 'done'
          ? 'No completed tasks yet.'
          : todoFilter === 'active'
            ? 'All tasks are done — nice work!'
            : 'No tasks yet. Add one above!'}
      </li>`;
    return;
  }

  list.innerHTML = '';
  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className   = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id  = todo.id;
    li.innerHTML   = `
      <div class="todo-checkbox${todo.done ? ' checked' : ''}"
           data-action="toggle" role="checkbox"
           aria-checked="${todo.done}" tabindex="0"
           title="Mark as ${todo.done ? 'active' : 'done'}">
        ${todo.done ? '✓' : ''}
      </div>
      <span class="todo-text">${esc(todo.text)}</span>
      <div class="todo-actions">
        <button class="btn-icon edit"   data-action="edit"   title="Edit task">✏️</button>
        <button class="btn-icon delete" data-action="delete" title="Delete task">🗑️</button>
      </div>`;
    list.appendChild(li);
  });
}

function addTodo(text) {
  const t = text.trim();
  if (!t) { toast('Please enter a task.', 'error'); return; }
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
  const li   = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!li) return;

  const textEl    = li.querySelector('.todo-text');
  const actionsEl = li.querySelector('.todo-actions');

  // Swap text → input
  const inp = document.createElement('input');
  inp.type      = 'text';
  inp.className = 'todo-text-edit';
  inp.value     = todo.text;
  inp.maxLength = 200;
  li.replaceChild(inp, textEl);
  inp.focus();
  inp.select();

  // Swap actions → save/cancel
  actionsEl.innerHTML = `
    <button class="btn-icon" data-action="save"   title="Save">💾</button>
    <button class="btn-icon" data-action="cancel" title="Cancel">✕</button>`;

  const save_ = () => {
    const v = inp.value.trim();
    if (v) { todo.text = v; saveTodos(); toast('Task updated.', 'ok'); }
    renderTodos();
  };
  const cancel_ = () => renderTodos();

  actionsEl.querySelector('[data-action="save"]').addEventListener('click', save_);
  actionsEl.querySelector('[data-action="cancel"]').addEventListener('click', cancel_);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  save_();
    if (e.key === 'Escape') cancel_();
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

// ── Quick Links ───────────────────────────────────────────────────────────────
const saveLinks = () => save(STORAGE.LINKS, links);

function faviconUrl(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return null; }
}

function renderLinks() {
  const grid = document.getElementById('links-grid');

  if (links.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-icon">🔗</span>No quick links yet.
      </div>`;
    return;
  }

  grid.innerHTML = '';
  links.forEach(lnk => {
    const a   = document.createElement('a');
    a.className = 'link-card';
    a.href      = lnk.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.dataset.id = lnk.id;

    const fav = faviconUrl(lnk.url);
    const imgTag = fav
      ? `<img class="link-favicon" src="${fav}" alt="" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
      : '';
    const fbTag = `<span class="link-fallback"${fav ? ' style="display:none"' : ''}>🌐</span>`;

    a.innerHTML = `
      ${imgTag}${fbTag}
      <span>${esc(lnk.name)}</span>
      <button class="link-remove" data-id="${lnk.id}" title="Remove link">✕</button>`;
    grid.appendChild(a);
  });
}

function addLink(name, rawUrl) {
  const n = name.trim();
  let   u = rawUrl.trim();
  if (!n || !u) { toast('Please fill in both label and URL.', 'error'); return false; }
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); }
  catch { toast('Invalid URL — please check and retry.', 'error'); return false; }

  links.push({ id: uid(), name: n, url: u });
  saveLinks();
  renderLinks();
  toast(`"${n}" added to quick links.`, 'ok');
  return true;
}

function removeLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
  toast('Link removed.');
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initGreeting() {
  tickGreeting();
  setInterval(tickGreeting, 1000);
}

function initTimer() {
  document.getElementById('btn-start').addEventListener('click', startTimer);
  document.getElementById('btn-stop').addEventListener('click',  stopTimer);
  document.getElementById('btn-reset').addEventListener('click', resetTimer);
  renderTimer();
}

function initTodos() {
  todos = load(STORAGE.TODOS, []);

  const inp    = document.getElementById('todo-input');
  const addBtn = document.getElementById('todo-add-btn');

  addBtn.addEventListener('click', () => {
    addTodo(inp.value);
    inp.value = '';
    inp.focus();
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      addTodo(inp.value);
      inp.value = '';
    }
  });

  // Delegated list events
  document.getElementById('todo-list').addEventListener('click', e => {
    const li     = e.target.closest('.todo-item');
    if (!li) return;
    const id     = li.dataset.id;
    const source = e.target.closest('[data-action]');
    if (!source) return;
    const action = source.dataset.action;
    if (action === 'toggle')  toggleTodo(id);
    if (action === 'edit')    editTodo(id);
    if (action === 'delete')  deleteTodo(id);
  });

  // Keyboard support for checkbox
  document.getElementById('todo-list').addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      const cb = e.target.closest('.todo-checkbox');
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

  document.getElementById('clear-done-btn').addEventListener('click', clearDone);

  renderTodos();
}

function initLinks() {
  links = load(STORAGE.LINKS, []);

  const nameInp = document.getElementById('link-name-input');
  const urlInp  = document.getElementById('link-url-input');
  const addBtn  = document.getElementById('link-add-btn');

  const tryAdd = () => {
    const ok = addLink(nameInp.value, urlInp.value);
    if (ok) { nameInp.value = ''; urlInp.value = ''; nameInp.focus(); }
  };

  addBtn.addEventListener('click', tryAdd);
  urlInp.addEventListener('keydown', e => { if (e.key === 'Enter') tryAdd(); });

  // Delegated remove
  document.getElementById('links-grid').addEventListener('click', e => {
    const btn = e.target.closest('.link-remove');
    if (btn) { e.preventDefault(); e.stopPropagation(); removeLink(btn.dataset.id); }
  });

  renderLinks();
}

document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  initTimer();
  initTodos();
  initLinks();
});
