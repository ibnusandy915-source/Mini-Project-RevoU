/**
 * Productivity Dashboard — Application Logic
 * File: js/app.js
 *
 * Architecture: Revealing Module Pattern (IIFE-based namespaces).
 * Each module encapsulates its own state and DOM interactions.
 * The App coordinator object wires everything together on DOMContentLoaded.
 *
 * Module structure:
 *   Storage       — thin localStorage wrapper with JSON parse/stringify
 *   Theme         — light/dark mode toggle + persistence
 *   Greeting      — clock, date, greeting text, user name display
 *   UserName      — name input, save, validation, persistence
 *   FocusTimer    — countdown timer, controls, audio alert, duration management
 *   PomoDuration  — duration input, validation, persistence, timer integration
 *   TodoList      — task CRUD, rendering, persistence
 *   QuickLinks    — link CRUD, rendering, URL normalisation, persistence
 *   Notification  — toast/banner display
 *   App           — coordinator, boot sequence
 */

'use strict';

// ---------------------------------------------------------------------------
// Storage module
// ---------------------------------------------------------------------------

class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

const Storage = (() => {
  const KEYS = {
    USER_NAME:         'pd_user_name',
    THEME:             'pd_theme',
    POMODORO_DURATION: 'pd_pomodoro_duration',
    TASKS:             'pd_tasks',
    QUICK_LINKS:       'pd_quick_links',
  };

  function isAvailable() {
    try {
      const test = '__pd_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Returns parsed value or null; logs warning on parse error
  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`pd: failed to parse stored value for key "${key}"`, e);
      return null;
    }
  }

  // Serialises and writes; throws StorageError if unavailable
  function set(key, value) {
    if (!isAvailable()) {
      throw new StorageError('localStorage is not available');
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  return { KEYS, isAvailable, get, set, remove };
})();

// ---------------------------------------------------------------------------
// Theme module
// ---------------------------------------------------------------------------
const Theme = (() => {
  const LIGHT = 'light';
  const DARK = 'dark';

  // Already applied by the inline head script; this just wires the toggle button.
  function init() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggle);
      _updateButtonLabel(current());
    }
  }

  function toggle() {
    const next = current() === DARK ? LIGHT : DARK;
    document.documentElement.setAttribute('data-theme', next);
    try { Storage.set(Storage.KEYS.THEME, next); } catch (e) {}
    _updateButtonLabel(next);
  }

  function current() {
    return document.documentElement.getAttribute('data-theme') || LIGHT;
  }

  function _updateButtonLabel(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = theme === DARK ? '☀️ Light Mode' : '🌙 Dark Mode';
      btn.setAttribute('aria-label', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  return { init, toggle, current };
})();

// ---------------------------------------------------------------------------
// Greeting module
// ---------------------------------------------------------------------------
const Greeting = (() => {
  let _intervalId = null;

  // Pure function: formats a Date to "HH:MM:SS" (24-hour, zero-padded)
  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Pure function: formats a Date to "Full Weekday, Full Month Day, Year"
  // e.g. "Monday, July 14, 2025"
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Pure function: returns greeting string for a given hour (0-23)
  function getGreetingForHour(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night'; // hours 21-23 and 0-4
  }

  // Pure function: builds greeting text with optional name
  function buildGreetingText(greeting, name) {
    if (name && name.trim()) {
      return `${greeting}, ${name}!`;
    }
    return greeting;
  }

  function init() {
    tick();
    _intervalId = setInterval(tick, 1000);
  }

  function tick() {
    const now = new Date();
    const timeEl = document.getElementById('time-display');
    const dateEl = document.getElementById('date-display');
    const greetEl = document.getElementById('greeting-text');

    if (timeEl) timeEl.textContent = formatTime(now);
    if (dateEl) dateEl.textContent = formatDate(now);

    const storedName = Storage.get(Storage.KEYS.USER_NAME);
    const greetingWord = getGreetingForHour(now.getHours());
    if (greetEl) greetEl.textContent = buildGreetingText(greetingWord, storedName);
  }

  // Updates the greeting name portion; pass null/empty to revert to name-free format
  function updateName(name) {
    const greetEl = document.getElementById('greeting-text');
    if (!greetEl) return;
    const hour = new Date().getHours();
    const greetingWord = getGreetingForHour(hour);
    greetEl.textContent = buildGreetingText(greetingWord, name);
  }

  return { init, tick, formatTime, formatDate, getGreetingForHour, buildGreetingText, updateName };
})();

// ---------------------------------------------------------------------------
// UserName module
// ---------------------------------------------------------------------------
const UserName = (() => {
  // Returns true if name has >=1 non-whitespace char and length <=50
  function validate(name) {
    if (typeof name !== 'string') return false;
    if (name.length > 50) return false;
    return /\S/.test(name); // at least one non-whitespace character
  }

  function save(name) {
    if (!validate(name)) {
      const errEl = document.getElementById('name-error');
      if (errEl) errEl.textContent = 'Name cannot be blank or exceed 50 characters.';
      return { ok: false, error: 'Invalid name' };
    }
    const trimmed = name.trim();
    try {
      Storage.set(Storage.KEYS.USER_NAME, trimmed);
    } catch (e) {
      const errEl = document.getElementById('name-error');
      if (errEl) errEl.textContent = 'Could not save name — storage unavailable.';
      return { ok: false, error: 'Storage unavailable' };
    }
    Greeting.updateName(trimmed);
    const errEl = document.getElementById('name-error');
    if (errEl) errEl.textContent = '';
    // Update the input field to show trimmed value
    const inputEl = document.getElementById('name-input');
    if (inputEl) inputEl.value = trimmed;
    return { ok: true };
  }

  function clear() {
    Storage.remove(Storage.KEYS.USER_NAME);
    Greeting.updateName(null);
    const inputEl = document.getElementById('name-input');
    if (inputEl) inputEl.value = '';
    const errEl = document.getElementById('name-error');
    if (errEl) errEl.textContent = '';
  }

  function init() {
    const stored = Storage.get(Storage.KEYS.USER_NAME);
    if (stored) {
      Greeting.updateName(stored);
      const inputEl = document.getElementById('name-input');
      if (inputEl) inputEl.value = stored;
    }

    const saveBtn = document.getElementById('name-save-btn');
    const clearBtn = document.getElementById('name-clear-btn');
    const inputEl = document.getElementById('name-input');

    if (saveBtn && inputEl) {
      saveBtn.addEventListener('click', () => save(inputEl.value));
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save(inputEl.value);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', clear);
    }
  }

  return { init, validate, save, clear };
})();

// ---------------------------------------------------------------------------
// Notification module
// ---------------------------------------------------------------------------
const Notification = (() => {
  let _dismissTimer = null;

  function show(message) {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = message;
    el.removeAttribute('hidden');
    el.classList.add('notification--visible');
    if (_dismissTimer) clearTimeout(_dismissTimer);
    _dismissTimer = setTimeout(() => hide(), 5000);
  }

  function hide() {
    const el = document.getElementById('notification');
    if (!el) return;
    el.setAttribute('hidden', '');
    el.classList.remove('notification--visible');
  }

  return { show, hide };
})();

// ---------------------------------------------------------------------------
// FocusTimer module
// ---------------------------------------------------------------------------
const FocusTimer = (() => {
  const DEFAULT_MINUTES = 25;

  const _state = {
    totalSeconds: DEFAULT_MINUTES * 60,
    remainingSeconds: DEFAULT_MINUTES * 60,
    running: false,
    intervalId: null,
    pendingDuration: null,
  };

  // Pure function: converts total seconds to "MM:SS" zero-padded
  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function init() {
    _updateDisplay();
    _updateControls();

    const startBtn = document.getElementById('timer-start-btn');
    const stopBtn  = document.getElementById('timer-stop-btn');
    const resetBtn = document.getElementById('timer-reset-btn');

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn)  stopBtn.addEventListener('click', stop);
    if (resetBtn) resetBtn.addEventListener('click', reset);
  }

  function start() {
    if (_state.running) return; // no-op if already running
    // Apply any pending duration change before starting
    if (_state.pendingDuration !== null) {
      _state.totalSeconds = _state.pendingDuration * 60;
      _state.remainingSeconds = _state.totalSeconds;
      _state.pendingDuration = null;
      _updateDisplay();
    }
    _state.running = true;
    _state.intervalId = setInterval(_tick, 1000);
    _updateControls();
  }

  function stop() {
    if (!_state.running) return;
    clearInterval(_state.intervalId);
    _state.intervalId = null;
    _state.running = false;
    _updateControls();
  }

  function reset() {
    stop();
    _state.remainingSeconds = _state.totalSeconds;
    _state.pendingDuration = null;
    _updateDisplay();
    _updateControls();
  }

  // Applies a new duration (in minutes) when timer is idle; resets display
  function applyDuration(minutes) {
    if (_state.running) return;
    _state.totalSeconds = minutes * 60;
    _state.remainingSeconds = _state.totalSeconds;
    _state.pendingDuration = null;
    _updateDisplay();
  }

  // Queues a duration change to apply on next start (called when timer is running)
  function queueDuration(minutes) {
    _state.pendingDuration = minutes;
  }

  function _tick() {
    _state.remainingSeconds = Math.max(0, _state.remainingSeconds - 1);
    _updateDisplay();
    if (_state.remainingSeconds === 0) {
      _onComplete();
    }
  }

  function _onComplete() {
    stop();
    // Audible alert (silent catch on autoplay restriction)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.5);
    } catch (e) { /* autoplay policy — visual notification still fires */ }
    // Visual notification
    Notification.show('⏰ Focus session complete! Time for a break.');
  }

  function _updateDisplay() {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = formatTime(_state.remainingSeconds);
  }

  function _updateControls() {
    const startBtn = document.getElementById('timer-start-btn');
    const stopBtn  = document.getElementById('timer-stop-btn');
    const resetBtn = document.getElementById('timer-reset-btn');

    if (startBtn) startBtn.disabled = _state.running;
    if (stopBtn)  stopBtn.disabled  = !_state.running;
    if (resetBtn) resetBtn.disabled = false; // always enabled
  }

  function getState() {
    return { ..._state };
  }

  return { init, formatTime, start, stop, reset, applyDuration, queueDuration, getState };
})();

// ---------------------------------------------------------------------------
// PomoDuration module
// ---------------------------------------------------------------------------
const PomoDuration = (() => {
  const DEFAULT_MINUTES = 25;
  const MIN = 1;
  const MAX = 120;

  function validate(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= MIN && n <= MAX;
  }

  function load() {
    const stored = Storage.get(Storage.KEYS.POMODORO_DURATION);
    if (stored === null) return DEFAULT_MINUTES;
    const n = Number(stored);
    if (!Number.isInteger(n) || n < MIN || n > MAX) return DEFAULT_MINUTES;
    return n;
  }

  function save(value) {
    const errEl = document.getElementById('duration-error');
    if (!validate(value)) {
      if (errEl) errEl.textContent = `Please enter a whole number between ${MIN} and ${MAX}.`;
      return { ok: false, error: 'Invalid duration' };
    }
    const minutes = Number(value);
    try {
      Storage.set(Storage.KEYS.POMODORO_DURATION, minutes);
    } catch (e) {
      if (errEl) errEl.textContent = 'Could not save duration — storage unavailable.';
      return { ok: false, error: 'Storage unavailable' };
    }
    if (errEl) errEl.textContent = '';
    // Apply or queue depending on timer state
    const state = FocusTimer.getState();
    if (state.running) {
      FocusTimer.queueDuration(minutes);
    } else {
      FocusTimer.applyDuration(minutes);
    }
    return { ok: true };
  }

  function init() {
    const minutes = load();
    FocusTimer.applyDuration(minutes);

    const input   = document.getElementById('duration-input');
    const saveBtn = document.getElementById('duration-save-btn');

    if (input) input.value = minutes;

    if (saveBtn && input) {
      saveBtn.addEventListener('click', () => save(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save(input.value);
      });
    }
  }

  return { init, validate, load, save };
})();

// ---------------------------------------------------------------------------
// TodoList module
// ---------------------------------------------------------------------------
const TodoList = (() => {
  let _tasks = []; // In-memory array of Task objects

  // Pure function: validates task text (>=1 non-whitespace, <=200 chars)
  function validateText(text) {
    if (typeof text !== 'string') return false;
    if (text.length > 200) return false;
    return /\S/.test(text);
  }

  // Creates a new Task object
  function _createTask(text) {
    return {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
    };
  }

  function init() {
    const stored = Storage.get(Storage.KEYS.TASKS);
    _tasks = Array.isArray(stored) ? stored : [];
    _render();

    const input  = document.getElementById('todo-input');
    const addBtn = document.getElementById('todo-add-btn');

    if (addBtn && input) {
      addBtn.addEventListener('click', () => _handleAdd(input));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _handleAdd(input);
      });
    }
  }

  function _handleAdd(input) {
    const text = input ? input.value : '';
    const result = add(text);
    if (result.ok && input) input.value = '';
  }

  function add(text) {
    const errEl = document.getElementById('todo-error');
    if (!validateText(text)) {
      if (errEl) errEl.textContent = 'Task cannot be empty.';
      return { ok: false, error: 'Invalid text' };
    }
    if (errEl) errEl.textContent = '';
    const task = _createTask(text);
    _tasks.push(task);
    const persisted = _persist();
    _render();
    return persisted ? { ok: true } : { ok: false, error: 'Storage unavailable' };
  }

  function startEdit(id) {
    const li = document.querySelector(`[data-task-id="${id}"]`);
    if (!li) return;
    const task = _tasks.find(t => t.id === id);
    if (!task) return;

    // Replace row content with edit form
    li.innerHTML = `
      <input type="text" class="todo__edit-input" maxlength="200" value="${_escapeHtml(task.text)}" aria-label="Edit task" />
      <span class="error-msg todo__edit-error" role="alert" aria-live="assertive"></span>
      <button class="btn btn--save" data-action="save-edit" data-id="${id}" type="button">Save</button>
      <button class="btn btn--cancel" data-action="cancel-edit" data-id="${id}" type="button">Cancel</button>
    `;
    const editInput = li.querySelector('.todo__edit-input');
    if (editInput) {
      editInput.focus();
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit(id, editInput.value);
        if (e.key === 'Escape') _render(); // cancel on Escape
      });
    }
  }

  function saveEdit(id, text) {
    const li = document.querySelector(`[data-task-id="${id}"]`);
    const errEl = li ? li.querySelector('.todo__edit-error') : null;
    if (!validateText(text)) {
      if (errEl) errEl.textContent = 'Task cannot be empty.';
      return { ok: false, error: 'Invalid text' };
    }
    const idx = _tasks.findIndex(t => t.id === id);
    if (idx === -1) return { ok: false, error: 'Task not found' };
    _tasks[idx].text = text.trim();
    const persisted = _persist();
    _render();
    return persisted ? { ok: true } : { ok: false, error: 'Storage unavailable' };
  }

  function toggle(id) {
    const idx = _tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    _tasks[idx].completed = !_tasks[idx].completed;
    _persist();
    // Update only the visual style without full re-render to avoid focus loss
    const li = document.querySelector(`[data-task-id="${id}"]`);
    if (li) {
      const label = li.querySelector('.todo__task-text');
      if (label) label.classList.toggle('todo__task-text--done', _tasks[idx].completed);
      const checkbox = li.querySelector('.todo__checkbox');
      if (checkbox) checkbox.checked = _tasks[idx].completed;
    }
  }

  function deleteTask(id) {
    _tasks = _tasks.filter(t => t.id !== id);
    _persist();
    _render();
  }

  function _persist() {
    const storageErrEl = document.getElementById('todo-storage-error');
    try {
      Storage.set(Storage.KEYS.TASKS, _tasks);
      if (storageErrEl) storageErrEl.hidden = true;
      return true;
    } catch (e) {
      if (storageErrEl) {
        storageErrEl.hidden = false;
        storageErrEl.textContent = 'Could not save tasks — your browser may have storage disabled.';
      }
      return false;
    }
  }

  function _render() {
    const ul = document.getElementById('todo-items');
    if (!ul) return;
    ul.innerHTML = '';
    _tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'todo__item';
      li.setAttribute('data-task-id', task.id);
      li.innerHTML = `
        <input type="checkbox" class="todo__checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark as done" />
        <span class="todo__task-text${task.completed ? ' todo__task-text--done' : ''}">${_escapeHtml(task.text)}</span>
        <button class="btn btn--edit" data-action="edit" data-id="${task.id}" type="button" aria-label="Edit task">Edit</button>
        <button class="btn btn--delete" data-action="delete" data-id="${task.id}" type="button" aria-label="Delete task">Delete</button>
      `;
      ul.appendChild(li);
    });

    // Single delegated event listener on the list
    ul.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id  = btn.dataset.id;
      const act = btn.dataset.action;
      if (act === 'edit')        startEdit(id);
      if (act === 'save-edit')   { const li = btn.closest('[data-task-id]'); saveEdit(id, li.querySelector('.todo__edit-input').value); }
      if (act === 'cancel-edit') _render();
      if (act === 'delete')      deleteTask(id);
    };
    ul.onchange = (e) => {
      if (e.target.classList.contains('todo__checkbox')) {
        const li = e.target.closest('[data-task-id]');
        if (li) toggle(li.dataset.taskId);
      }
    };
  }

  // Escapes HTML special characters to prevent XSS
  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return { init, validateText, add, startEdit, saveEdit, toggle, delete: deleteTask };
})();

// ---------------------------------------------------------------------------
// QuickLinks module
// ---------------------------------------------------------------------------
const QuickLinks = (() => {
  const MAX_LINKS = 20;
  let _links = [];

  // Pure function: validates label (non-empty, <=30 chars) and url (non-empty, <=2048 chars)
  function validate(label, url) {
    if (typeof label !== 'string' || label.trim().length === 0) return false;
    if (label.length > 30) return false;
    if (typeof url !== 'string' || url.trim().length === 0) return false;
    if (url.length > 2048) return false;
    return true;
  }

  // Pure function: prepends 'https://' if url lacks http:// or https:// scheme
  function normalizeUrl(url) {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  function init() {
    const stored = Storage.get(Storage.KEYS.QUICK_LINKS);
    _links = Array.isArray(stored) ? stored : [];
    _render();

    const labelInput = document.getElementById('link-label-input');
    const urlInput   = document.getElementById('link-url-input');
    const addBtn     = document.getElementById('link-add-btn');

    if (addBtn && labelInput && urlInput) {
      addBtn.addEventListener('click', () => add(labelInput.value, urlInput.value));
    }
  }

  function add(label, url) {
    const errEl = document.getElementById('link-error');

    // Validate empty fields first, then count limit
    if (!label || label.trim().length === 0) {
      if (errEl) errEl.textContent = 'Label cannot be empty.';
      return { ok: false, error: 'Empty label' };
    }
    if (!url || url.trim().length === 0) {
      if (errEl) errEl.textContent = 'URL cannot be empty.';
      return { ok: false, error: 'Empty URL' };
    }
    if (!validate(label, url)) {
      if (errEl) errEl.textContent = 'Label must be ≤30 characters and URL must be ≤2048 characters.';
      return { ok: false, error: 'Invalid input' };
    }
    if (_links.length >= MAX_LINKS) {
      if (errEl) errEl.textContent = `Maximum of ${MAX_LINKS} quick links reached. Delete one to add more.`;
      return { ok: false, error: 'Max links reached' };
    }

    if (errEl) errEl.textContent = '';
    const link = {
      id: crypto.randomUUID(),
      label: label.trim(),
      url: normalizeUrl(url),
    };
    _links.push(link);
    _persist();
    _render();

    // Clear inputs on success
    const labelInput = document.getElementById('link-label-input');
    const urlInput   = document.getElementById('link-url-input');
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';

    return { ok: true };
  }

  function deleteLink(id) {
    _links = _links.filter(l => l.id !== id);
    _persist();
    _render();
  }

  function _persist() {
    try {
      Storage.set(Storage.KEYS.QUICK_LINKS, _links);
    } catch (e) {
      const errEl = document.getElementById('link-error');
      if (errEl) errEl.textContent = 'Could not save links — storage unavailable.';
    }
  }

  function _render() {
    const container = document.getElementById('links-container');
    if (!container) return;
    container.innerHTML = '';
    _links.forEach(link => {
      const item = document.createElement('div');
      item.className = 'links__item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('data-link-id', link.id);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--link';
      btn.textContent = link.label;
      btn.setAttribute('aria-label', `Open ${link.label}`);
      btn.addEventListener('click', () => window.open(link.url, '_blank', 'noopener,noreferrer'));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn--delete';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', `Delete ${link.label} link`);
      delBtn.addEventListener('click', () => deleteLink(link.id));

      item.appendChild(btn);
      item.appendChild(delBtn);
      container.appendChild(item);
    });
  }

  return { init, validate, normalizeUrl, add, delete: deleteLink };
})();

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  Theme.init();
  Greeting.init();
  UserName.init();
  PomoDuration.init(); // loads duration and calls FocusTimer.applyDuration
  FocusTimer.init();   // wires buttons (after applyDuration sets initial display)
  TodoList.init();
  QuickLinks.init();
  console.log('Productivity Dashboard initialising…');
});
