# Design Document

## Overview

The Productivity Dashboard is a self-contained, single-page web application built with plain HTML5, CSS3, and Vanilla JavaScript (ES2020+). It requires no build step, no bundler, and no runtime dependencies. All state is held in memory during a session and persisted to `window.localStorage` between sessions.

The application is structured as three files:
- `index.html` — markup and script/style references
- `css/style.css` — all styling, including theme variables
- `js/app.js` — all application logic

Four primary widgets compose the dashboard: **Greeting Panel**, **Focus Timer**, **To-Do List**, and **Quick Links**. Cross-cutting concerns include **Theme (light/dark mode)**, **custom User Name**, and **configurable Pomodoro Duration**, all persisted via LocalStorage.

---

## Architecture

### Module Structure

`app.js` is organised as a set of self-contained module objects using the Revealing Module Pattern (IIFE-based namespaces), each encapsulating its own state and DOM interactions. A single `App` coordinator object wires everything together during `DOMContentLoaded`.

```
App (coordinator)
├── Storage       — thin wrapper around localStorage with JSON parse/stringify
├── Theme         — light/dark mode toggle + persistence
├── Greeting      — clock, date, greeting text, user name display
├── UserName      — name input, save, validation, persistence
├── FocusTimer    — countdown timer, controls, audio alert, duration management
├── PomoDuration  — duration input, validation, persistence, timer integration
├── TodoList      — task CRUD, rendering, persistence
└── QuickLinks    — link CRUD, rendering, URL normalisation, persistence
```

### Initialisation Sequence

Theme is applied **synchronously in the `<head>`** (via an inline `<script>` tag) before the browser paints any content, eliminating flash-of-wrong-theme. All other modules are initialised in the `DOMContentLoaded` callback in the order:

1. `Storage` — no DOM dependency
2. `Theme.init()` — already applied, just wires the toggle button
3. `Greeting.init()` — starts the clock interval
4. `UserName.init()` — loads name, wires input
5. `PomoDuration.init()` — loads duration, updates timer display
6. `FocusTimer.init()` — wires controls
7. `TodoList.init()` — loads and renders tasks
8. `QuickLinks.init()` — loads and renders links

### Event Communication

Modules communicate via direct function calls rather than a global event bus, keeping the dependency graph simple:

- `PomoDuration` calls `FocusTimer.applyDuration(minutes)` after a valid save when the timer is idle
- `UserName` calls `Greeting.updateName(name)` after a successful save/clear
- `FocusTimer` calls `Notification.show(message)` when the countdown reaches zero

---

## Components and Interfaces

### Storage Module

```js
const Storage = {
  KEYS: {
    USER_NAME:        'pd_user_name',
    THEME:            'pd_theme',
    POMODORO_DURATION:'pd_pomodoro_duration',
    TASKS:            'pd_tasks',
    QUICK_LINKS:      'pd_quick_links',
  },

  // Returns parsed value or null; logs warning on parse error
  get(key),

  // Serialises value to JSON and writes to localStorage
  // Throws StorageError if localStorage is unavailable
  set(key, value),

  // Removes key from localStorage
  remove(key),

  // Returns true if localStorage is available and writable
  isAvailable(),
}
```

All LocalStorage keys are prefixed with `pd_` to avoid collisions with other applications sharing the same origin.

### Theme Module

```js
const Theme = {
  LIGHT: 'light',
  DARK: 'dark',

  // Called from <head> inline script — reads localStorage and sets data-theme on <html>
  applyEarly(),

  // Wires the toggle button; reads current state from <html> data-theme
  init(),

  // Flips the current theme, updates <html> data-theme, persists
  toggle(),

  // Returns current theme string ('light' | 'dark')
  current(),
}
```

Theme is stored as the string `"light"` or `"dark"` under `pd_theme`. The `<html>` element carries a `data-theme` attribute (`data-theme="dark"` or `data-theme="light"`) that CSS selects against using `[data-theme="dark"]` selectors on custom properties.

### Greeting Module

```js
const Greeting = {
  // Starts setInterval(tick, 1000); renders time, date, and greeting message
  init(),

  // Called every second; updates time display
  tick(),

  // Returns the greeting string for a given hour (0–23)
  getGreetingForHour(hour),    // Pure function

  // Formats a Date as "HH:MM:SS"
  formatTime(date),            // Pure function

  // Formats a Date as "Full Weekday, Full Month Day, Year"
  formatDate(date),            // Pure function

  // Updates the displayed name portion of the greeting
  updateName(name),
}
```

### UserName Module

```js
const UserName = {
  // Loads stored name, renders in greeting, wires save/clear buttons
  init(),

  // Returns true if name is valid (≥1 non-whitespace char, ≤50 chars)
  validate(name),              // Pure function

  // Persists name, updates greeting; returns { ok, error }
  save(name),

  // Removes name from storage, reverts greeting
  clear(),
}
```

### FocusTimer Module

```js
const FocusTimer = {
  // Internal state: { totalSeconds, remainingSeconds, running, intervalId }
  _state,

  // Wires Start/Stop/Reset buttons; sets initial display
  init(),

  // Formats seconds to "MM:SS" — pure function
  formatTime(totalSeconds),    // Pure function

  // Begins or resumes countdown
  start(),

  // Pauses countdown, retains remaining time
  stop(),

  // Stops and resets remaining time to current total duration
  reset(),

  // Applies a new duration (in minutes) when timer is idle; resets display
  applyDuration(minutes),

  // Queues a duration change to apply on next start
  queueDuration(minutes),

  // Called each tick; decrements remaining time, checks for zero
  _tick(),

  // Fires when remaining reaches 0: stops timer, plays alert, shows notification
  _onComplete(),

  // Returns current state object (for testing)
  getState(),
}
```

State machine for timer controls:

| State   | Start button | Stop button | Reset button |
|---------|-------------|-------------|--------------|
| idle    | enabled     | disabled    | enabled      |
| running | disabled    | enabled     | enabled      |
| paused  | enabled     | disabled    | enabled      |

### PomoDuration Module

```js
const PomoDuration = {
  DEFAULT_MINUTES: 25,
  MIN: 1,
  MAX: 120,

  // Loads stored duration, inits FocusTimer display, wires input + save button
  init(),

  // Returns integer in [1,120] or DEFAULT_MINUTES for any invalid stored value
  load(),                      // Pure function over localStorage value

  // Returns true if value is integer in [1,120]
  validate(value),             // Pure function

  // Persists and applies or queues duration
  save(value),
}
```

### TodoList Module

```js
const TodoList = {
  // Loads tasks from storage and renders them
  init(),

  // Returns true if text has ≥1 non-whitespace char and length ≤200
  validateText(text),          // Pure function

  // Adds a task; returns { ok, error }
  add(text),

  // Begins inline edit for a task item
  startEdit(id),

  // Saves edited text; returns { ok, error }
  saveEdit(id, text),

  // Toggles completion state; persists
  toggle(id),

  // Removes task by id; persists
  delete(id),

  // Persists current tasks array to localStorage
  _persist(),

  // Renders all tasks to the DOM; preserves insertion order
  _render(),
}
```

Each Task object in the array:
```js
{ id: string (UUID v4), text: string, completed: boolean, createdAt: number (timestamp) }
```

Tasks are stored as a JSON array under `pd_tasks`. Ordering in the rendered list matches the array index (insertion order).

### QuickLinks Module

```js
const QuickLinks = {
  MAX_LINKS: 20,

  // Loads links from storage and renders buttons
  init(),

  // Returns true if label is non-empty (≤30 chars) and url is non-empty (≤2048 chars)
  validate(label, url),        // Pure function

  // Prepends 'https://' if url lacks http:// or https:// prefix
  normalizeUrl(url),           // Pure function

  // Adds a link if count < 20; persists; returns { ok, error }
  add(label, url),

  // Removes link by id; persists
  delete(id),

  // Renders all Quick_Link buttons
  _render(),
}
```

Each Quick_Link object:
```js
{ id: string (UUID v4), label: string, url: string }
```

---

## Data Models

### LocalStorage Schema

| Key                    | Type    | Default     | Description                              |
|------------------------|---------|-------------|------------------------------------------|
| `pd_user_name`         | string  | (absent)    | User's display name, raw string          |
| `pd_theme`             | string  | `"light"`   | Active theme: `"light"` or `"dark"`      |
| `pd_pomodoro_duration` | number  | `25`        | Timer duration in whole minutes          |
| `pd_tasks`             | Task[]  | `[]`        | Array of Task objects, JSON-serialised   |
| `pd_quick_links`       | Link[]  | `[]`        | Array of Quick_Link objects, JSON-serialised |

### Task Object

```ts
interface Task {
  id: string;          // UUID v4
  text: string;        // 1–200 printable characters, at least 1 non-whitespace
  completed: boolean;  // false by default
  createdAt: number;   // Date.now() at creation, used to preserve order
}
```

### Quick_Link Object

```ts
interface QuickLink {
  id: string;    // UUID v4
  label: string; // 1–30 characters
  url: string;   // 1–2048 characters, always starts with http:// or https://
}
```

### In-Memory Timer State

```ts
interface TimerState {
  totalSeconds: number;    // Current configured duration in seconds
  remainingSeconds: number;// Seconds left in current countdown
  running: boolean;        // Whether the interval is active
  intervalId: number|null; // Return value of setInterval
  pendingDuration: number|null; // Queued duration change (applies on next start)
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time Formatter Produces Valid HH:MM:SS

*For any* `Date` object, `Greeting.formatTime(date)` SHALL return a string that matches the pattern `HH:MM:SS` where HH is the zero-padded 24-hour hour, MM is the zero-padded minute, and SS is the zero-padded second of the given date.

**Validates: Requirements 1.1**

---

### Property 2: Date Formatter Produces Valid Full Date String

*For any* `Date` object, `Greeting.formatDate(date)` SHALL return a string containing the correct full weekday name, full month name, numeric day, and 4-digit year corresponding to the date's local time components.

**Validates: Requirements 1.2**

---

### Property 3: Greeting Correctly Covers All 24 Hours

*For any* integer hour in [0, 23], `Greeting.getGreetingForHour(hour)` SHALL return `"Good Morning"` for hours [5–11], `"Good Afternoon"` for hours [12–17], `"Good Evening"` for hours [18–20], and `"Good Night"` for hours [21–23] and [0–4]. Every possible hour value maps to exactly one greeting — no hour is unhandled.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Greeting With Name Formats Correctly

*For any* non-empty name string `n` and greeting string `g`, `Greeting.buildGreetingText(g, n)` SHALL return the string `"${g}, ${n}!"`.

**Validates: Requirements 1.7**

---

### Property 5: User Name Persistence Round-Trip

*For any* valid user name string `n` (non-empty, ≤50 chars, at least one non-whitespace character), calling `UserName.save(n)` followed by `Storage.get(Storage.KEYS.USER_NAME)` SHALL return a value strictly equal to `n`.

**Validates: Requirements 2.2**

---

### Property 6: User Name Validation Accepts Valid Inputs

*For any* string `s` of printable Unicode characters with at least one non-whitespace character and total length ≤50, `UserName.validate(s)` SHALL return `true`.

**Validates: Requirements 2.6**

---

### Property 7: User Name Validation Rejects Whitespace-Only Inputs

*For any* string `s` composed entirely of whitespace characters (space, tab, newline, etc.), `UserName.validate(s)` SHALL return `false`.

**Validates: Requirements 2.7**

---

### Property 8: Timer Formatter Produces Valid MM:SS

*For any* integer `totalSeconds` in [0, 7200], `FocusTimer.formatTime(totalSeconds)` SHALL return a string matching the pattern `MM:SS` where MM is the zero-padded total minutes and SS is the zero-padded remaining seconds.

**Validates: Requirements 3.1**

---

### Property 9: Timer Reset Always Returns to Initial Duration

*For any* timer state (idle, running after N ticks, or paused), calling `FocusTimer.reset()` SHALL result in `remainingSeconds === totalSeconds` and `running === false`.

**Validates: Requirements 3.5**

---

### Property 10: Timer Controls Reflect Timer State

*For any* timer state, the Start button SHALL be enabled if and only if the timer is not running, and the Stop button SHALL be enabled if and only if the timer is running. (Reset is always enabled.)

**Validates: Requirements 3.7, 3.8**

---

### Property 11: Pomodoro Duration Persistence Round-Trip

*For any* integer `d` in [1, 120], calling `PomoDuration.save(d)` followed by `Storage.get(Storage.KEYS.POMODORO_DURATION)` SHALL return a value numerically equal to `d`.

**Validates: Requirements 4.2**

---

### Property 12: Invalid Duration Storage Defaults to 25

*For any* stored value `v` that is absent, non-numeric, or outside the integer range [1, 120], `PomoDuration.load()` SHALL return `25`.

**Validates: Requirements 4.4**

---

### Property 13: Out-of-Range Duration Input is Rejected

*For any* input value `v` that is not an integer in [1, 120], `PomoDuration.validate(v)` SHALL return `false`.

**Validates: Requirements 4.7**

---

### Property 14: Task Addition Round-Trip

*For any* valid task text `t` (non-empty, ≤200 chars, at least one non-whitespace character), after calling `TodoList.add(t)`, the task SHALL appear in the rendered list AND `Storage.get(Storage.KEYS.TASKS)` SHALL contain a Task object whose `text` equals `t`.

**Validates: Requirements 5.2**

---

### Property 15: Task Edit Round-Trip

*For any* existing task and valid replacement text `t`, after calling `TodoList.saveEdit(id, t)`, the rendered task item and the matching record in localStorage SHALL both reflect the updated text `t`.

**Validates: Requirements 5.4**

---

### Property 16: Task Completion Toggle Idempotence and Persistence

*For any* task, toggling completion state twice via `TodoList.toggle(id)` SHALL leave the task in its original completion state. After each toggle, `Storage.get(Storage.KEYS.TASKS)` SHALL reflect the current completion state of that task.

**Validates: Requirements 5.5, 5.6**

---

### Property 17: Task Deletion Round-Trip

*For any* task present in the list, after calling `TodoList.delete(id)`, the task SHALL be absent from the rendered list AND absent from `Storage.get(Storage.KEYS.TASKS)`.

**Validates: Requirements 5.7**

---

### Property 18: Task Load Order Preserved

*For any* ordered sequence of tasks stored in localStorage, after calling `TodoList.init()`, the rendered list order SHALL match the original insertion order (by `createdAt` timestamp / array index).

**Validates: Requirements 5.8**

---

### Property 19: Task Text Validation Rejects Whitespace-Only Input

*For any* string `s` composed entirely of whitespace characters, `TodoList.validateText(s)` SHALL return `false` — regardless of whether the call context is task addition or task editing.

**Validates: Requirements 5.9, 5.10**

---

### Property 20: Quick Link Addition Round-Trip

*For any* valid label `l` and URL `u` when the total Quick_Link count is fewer than 20, after calling `QuickLinks.add(l, u)`, a button with the label `l` SHALL appear in the rendered panel AND `Storage.get(Storage.KEYS.QUICK_LINKS)` SHALL contain a Quick_Link object whose `label` equals `l` and whose normalised `url` equals `QuickLinks.normalizeUrl(u)`.

**Validates: Requirements 6.2**

---

### Property 21: Quick Link Deletion Round-Trip

*For any* Quick_Link present in the panel, after calling `QuickLinks.delete(id)`, the corresponding button SHALL be absent from the rendered panel AND absent from `Storage.get(Storage.KEYS.QUICK_LINKS)`.

**Validates: Requirements 6.4**

---

### Property 22: Quick Link Empty Field Validation

*For any* submission where `label === ''` or `url === ''`, `QuickLinks.validate(label, url)` SHALL return `false`.

**Validates: Requirements 6.6**

---

### Property 23: URL Normalisation Ensures HTTPS Scheme

*For any* URL string `u` that does NOT begin with `"http://"` or `"https://"`, `QuickLinks.normalizeUrl(u)` SHALL return a string that begins with `"https://"` and ends with `u`.

**Validates: Requirements 6.7**

---

### Property 24: Theme Toggle Idempotence

*For any* current theme state `t` (either `"light"` or `"dark"`), calling `Theme.toggle()` twice SHALL result in the `<html>` element's `data-theme` attribute being equal to `t` — the theme is restored to its original value.

**Validates: Requirements 7.2**

---

### Property 25: Theme Persistence Round-Trip

*For any* theme value `t` in `{"light", "dark"}`, after calling `Theme.toggle()` (which changes and persists the theme), `Storage.get(Storage.KEYS.THEME)` SHALL return the new active theme string.

**Validates: Requirements 7.3**

---

### Property 26: JSON Parse Error Resilience

*For any* string `s` that is not valid JSON, calling `Storage.get(key)` when localStorage contains `s` under that key SHALL return `null` and SHALL call `console.warn` with a descriptive message — it SHALL NOT throw an exception.

**Validates: Requirements 8.3**

---

## Error Handling

### LocalStorage Unavailability

`Storage.isAvailable()` probes localStorage with a test write/delete on module load. If unavailable (e.g., private browsing with storage blocked, or storage quota exceeded):

- `Storage.set()` throws a `StorageError` which each module catches
- The affected widget displays a persistent inline error banner: *"Could not save data — your browser may have storage disabled."*
- The application continues to function in-memory for the current session

### JSON Parse Errors

`Storage.get()` wraps `JSON.parse()` in a try/catch. On failure it:
1. Returns `null`
2. Logs `console.warn('pd: failed to parse stored value for key "${key}"', error)`

Each module treats a `null` return from `Storage.get()` as "no data stored" and uses its default state.

### Invalid Stored Values

Each module's `load()` function validates the parsed value against its expected type and range. Invalid values fall back silently to defaults (no user-visible error — the app simply starts fresh for that widget):
- Non-numeric or out-of-range `pd_pomodoro_duration` → defaults to 25
- Non-array `pd_tasks` or `pd_quick_links` → defaults to empty array
- Unknown `pd_theme` value → defaults to `"light"`

### Timer Edge Cases

- If `setInterval` is called while an interval is already active, `FocusTimer.start()` is a no-op (guarded by the `running` flag).
- `FocusTimer._tick()` guards against going below 0: `remainingSeconds = Math.max(0, remainingSeconds - 1)`.
- If the `AudioContext` / `Audio` alert fails (e.g., browser autoplay policy), the failure is caught silently and only the visual notification fires.

### Input Validation Summary

| Field              | Constraint                        | Error displayed                                 |
|--------------------|-----------------------------------|-------------------------------------------------|
| User Name          | ≥1 non-whitespace, ≤50 chars     | Inline message below input                      |
| Pomodoro Duration  | Integer 1–120                     | Inline message below input                      |
| Task text (add)    | ≥1 non-whitespace, ≤200 chars    | Inline message below task input                 |
| Task text (edit)   | ≥1 non-whitespace, ≤200 chars    | Inline message adjacent to edit field           |
| Quick Link label   | Non-empty, ≤30 chars              | Inline message below label input                |
| Quick Link URL     | Non-empty, ≤2048 chars            | Inline message below URL input                  |
| Quick Links count  | <20 entries                       | Inline message: max links reached               |

---

## Testing Strategy

### Overview

The application logic is implemented as pure functions wherever possible (formatters, validators, normalizers) and thin stateful modules for DOM interaction. This separation makes the core logic highly testable without a DOM.

Testing uses **[Vitest](https://vitest.dev/)** (zero-config, ESM-native, fast) as the test runner and **[fast-check](https://fast-check.dev/)** as the property-based testing library. DOM interaction tests use **[@testing-library/dom](https://testing-library.com/docs/dom-testing-library/intro/)** with **jsdom** (built into Vitest).

### Unit Tests

Unit tests cover specific examples, integration points between modules, and edge conditions:

- **Storage Module**: `get()` with valid JSON, `get()` with invalid JSON, `set()`, `remove()`, `isAvailable()` with mocked localStorage
- **Theme Module**: `applyEarly()` with stored theme, `applyEarly()` with no stored theme (defaults to light), `toggle()` flips `data-theme`
- **Greeting Module**: `updateName(null)` reverts to nameless greeting; `init()` starts the clock interval
- **FocusTimer Module**: `start()` → `stop()` retains remaining time; countdown reaches zero triggers completion callback; `applyDuration()` while idle updates display; `queueDuration()` while running does not interrupt current countdown
- **PomoDuration Module**: `save()` while timer running queues duration; `save()` while idle applies immediately
- **TodoList Module**: `add()` then `delete()` leaves list empty; `startEdit()` pre-populates field; edit cancel restores original text
- **QuickLinks Module**: `add()` with 20 existing links is rejected with error message; URL opened in new tab via `window.open`

### Property-Based Tests

Each property-based test uses **fast-check** and runs a minimum of **100 iterations**. Each test is tagged with a comment referencing its design property.

```
// Feature: productivity-dashboard, Property N: <property text>
```

**Greeting Module — Pure Functions:**
```
Property 1: Time Formatter — fc.date() → Greeting.formatTime(date) matches /^\d{2}:\d{2}:\d{2}$/
Property 2: Date Formatter — fc.date() → Greeting.formatDate(date) contains correct weekday/month/day/year
Property 3: Greeting Hour Mapping — fc.integer({min:0,max:23}) → correct greeting string
Property 4: Greeting With Name — fc.tuple(fc.string(), fc.string({minLength:1})) → "${g}, ${n}!"
```

**UserName Module — Validation:**
```
Property 6: Valid Name Acceptance — fc.string() filtered to non-whitespace ≥1 char, ≤50 → validate() true
Property 7: Whitespace Rejection — fc.stringOf(fc.constantFrom(' ','\t','\n','\r')) → validate() false
```

**Storage Module — Persistence:**
```
Property 5:  User Name Round-Trip    — fc.string filtered to valid names → save then get === original
Property 11: Duration Round-Trip     — fc.integer({min:1,max:120}) → save then get === original
Property 26: JSON Error Resilience   — fc.string filtered to invalid JSON → get returns null, no throw
```

**FocusTimer Module:**
```
Property 8:  Time Formatter           — fc.integer({min:0,max:7200}) → formatTime matches /^\d{2}:\d{2}$/
Property 9:  Reset Idempotence        — fc.nat() ticks then reset → remainingSeconds===totalSeconds, not running
Property 10: Control State Invariant  — any timer state → Start enabled ↔ not running, Stop enabled ↔ running
```

**PomoDuration Module:**
```
Property 12: Invalid Duration Default — fc.anything() filtered to absent/non-numeric/out-of-range → load() === 25
Property 13: Out-of-range Rejected    — fc.integer() filtered to outside [1,120] → validate() false
```

**TodoList Module:**
```
Property 14: Task Add Round-Trip      — fc.string filtered to valid text → add then get from storage === text
Property 15: Task Edit Round-Trip     — fc.tuple(id, valid text) → saveEdit then get from storage === new text
Property 16: Toggle Idempotence       — fc.uuid() + any task list → toggle twice === original completion state
Property 17: Task Delete Round-Trip   — any task → delete then storage doesn't contain task id
Property 18: Load Order Preserved     — fc.array(Task) → init renders in same order
Property 19: Whitespace Task Rejected — fc.stringOf(whitespace chars) → validateText() false
```

**QuickLinks Module:**
```
Property 20: Link Add Round-Trip      — fc.tuple(label,url) with count<20 → add then in storage
Property 21: Link Delete Round-Trip   — any link → delete then absent from storage
Property 22: Empty Field Rejected     — fc.tuple with empty label or url → validate() false
Property 23: URL Normalisation        — fc.string without http/https prefix → normalizeUrl starts with 'https://'
```

**Theme Module:**
```
Property 24: Toggle Idempotence       — any theme state → toggle twice === original data-theme
Property 25: Theme Persistence        — any theme → toggle then storage === new theme string
```

### Integration / Smoke Tests

- **LocalStorage unavailability**: Mock `localStorage` to throw on `setItem`; assert error banner appears in affected widget and app remains functional
- **Flash-of-wrong-theme prevention**: Assert `<html data-theme>` is set before `DOMContentLoaded` fires
- **No network requests**: Assert `fetch` and `XMLHttpRequest` are never called during app lifecycle
- **File structure**: Assert `index.html`, `css/style.css`, `js/app.js` exist; no external framework `<script>` tags in HTML

### Running Tests

```bash
# Install dev dependencies (Vitest + fast-check + testing-library)
npm install -D vitest @vitest/ui fast-check @testing-library/dom jsdom

# Run all tests once (CI-friendly)
npx vitest run

# Run with UI (development)
npx vitest --ui
```

Test files are co-located in a `__tests__/` directory at the project root:
```
__tests__/
  storage.test.js
  theme.test.js
  greeting.test.js
  username.test.js
  focus-timer.test.js
  pomo-duration.test.js
  todo-list.test.js
  quick-links.test.js
```
