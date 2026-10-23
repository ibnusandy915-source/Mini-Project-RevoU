# Implementation Plan: Productivity Dashboard

## Overview

Implement a self-contained, single-page productivity dashboard using plain HTML5, CSS3, and Vanilla JavaScript (ES2020+). No build step, no framework, no external runtime dependencies. All logic lives in three files: `index.html`, `css/style.css`, and `js/app.js`. State is held in memory during a session and persisted via `window.localStorage`.

The implementation proceeds bottom-up: project scaffold → Storage module → Theme → Greeting/UserName → FocusTimer/PomoDuration → TodoList → QuickLinks → CSS layout/visual polish → integration wiring → final validation.

---

## Tasks

- [x] 1. Scaffold project structure and set up testing tooling
  - [x] 1.1 Create the three application files and directory structure
    - Create `index.html` with semantic HTML skeleton (meta viewport, charset, `<head>` inline theme script placeholder, link to `css/style.css`, script tag for `js/app.js`)
    - Create `css/style.css` (empty, ready for rules)
    - Create `js/app.js` (empty IIFE wrapper, `DOMContentLoaded` stub)
    - Create `__tests__/` directory
    - _Requirements: 9.4, 9.6_

  - [x] 1.2 Initialise `package.json` and install dev dependencies
    - Run `npm init -y` and install `vitest`, `@vitest/ui`, `fast-check`, `@testing-library/dom`, `jsdom`
    - Add `"test": "vitest run"` and `"test:ui": "vitest --ui"` scripts
    - Add `vitest.config.js` configured with `jsdom` environment
    - _Requirements: 9.6_

- [x] 2. Implement the Storage module
  - [x] 2.1 Write the `Storage` module in `js/app.js`
    - Define `KEYS` object with all five `pd_`-prefixed keys
    - Implement `isAvailable()` using a test write/delete probe
    - Implement `get(key)`: JSON.parse wrapped in try/catch; return `null` + `console.warn` on parse error
    - Implement `set(key, value)`: JSON.stringify + `localStorage.setItem`; throw `StorageError` when unavailable
    - Implement `remove(key)`
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ]* 2.2 Write unit tests for Storage module (`__tests__/storage.test.js`)
    - Test `get()` with valid JSON, `get()` with malformed JSON (returns null, calls console.warn), `set()`, `remove()`, `isAvailable()` with mocked localStorage
    - _Requirements: 8.3_

  - [ ]* 2.3 Write property test for Storage — JSON parse error resilience (Property 26)
    - **Property 26: JSON Parse Error Resilience**
    - **Validates: Requirements 8.3**
    - Use `fc.string()` filtered to strings that are not valid JSON; assert `Storage.get(key)` returns `null` and does not throw

  - [ ]* 2.4 Write property test for Storage — User Name persistence round-trip (Property 5)
    - **Property 5: User Name Persistence Round-Trip**
    - **Validates: Requirements 2.2**
    - Use `fc.string()` filtered to valid names (≥1 non-whitespace, ≤50 chars); call `UserName.save(n)` then `Storage.get(Storage.KEYS.USER_NAME)`; assert result strictly equals `n`

- [x] 3. Implement the Theme module
  - [x] 3.1 Write the `Theme` module and the early-apply inline script
    - In `<head>` of `index.html`, add an inline `<script>` that reads `pd_theme` from localStorage and sets `document.documentElement.setAttribute('data-theme', ...)` synchronously — defaulting to `"light"` if absent or unknown
    - Implement `Theme.applyEarly()`, `Theme.init()` (wires toggle button), `Theme.toggle()`, `Theme.current()` in `js/app.js`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 3.2 Write unit tests for Theme module (`__tests__/theme.test.js`)
    - Test `applyEarly()` with stored theme, `applyEarly()` with no stored theme (defaults to light), `toggle()` flips `data-theme`
    - _Requirements: 7.4, 7.5_

  - [ ]* 3.3 Write property test for Theme — toggle idempotence (Property 24)
    - **Property 24: Theme Toggle Idempotence**
    - **Validates: Requirements 7.2**
    - For any current theme state, calling `Theme.toggle()` twice SHALL leave `data-theme` equal to the original value

  - [ ]* 3.4 Write property test for Theme — persistence round-trip (Property 25)
    - **Property 25: Theme Persistence Round-Trip**
    - **Validates: Requirements 7.3**
    - For any theme value in `{"light","dark"}`, after `Theme.toggle()`, `Storage.get(Storage.KEYS.THEME)` SHALL return the new active theme string

- [x] 4. Implement the Greeting and UserName modules
  - [x] 4.1 Write pure functions for the Greeting module
    - Implement `Greeting.formatTime(date)` → `"HH:MM:SS"`
    - Implement `Greeting.formatDate(date)` → `"Full Weekday, Full Month Day, Year"`
    - Implement `Greeting.getGreetingForHour(hour)` covering all 24 hours per requirements 1.3–1.6
    - Implement `Greeting.buildGreetingText(greeting, name)` → `"${greeting}, ${name}!"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 4.2 Write property tests for Greeting pure functions (Properties 1–4)
    - **Property 1: Time Formatter Produces Valid HH:MM:SS** — `fc.date()` → matches `/^\d{2}:\d{2}:\d{2}$/`
    - **Property 2: Date Formatter Produces Valid Full Date String** — `fc.date()` → contains correct weekday/month/day/year
    - **Property 3: Greeting Correctly Covers All 24 Hours** — `fc.integer({min:0,max:23})` → correct greeting string
    - **Property 4: Greeting With Name Formats Correctly** — `fc.tuple(fc.string(), fc.string({minLength:1}))` → `"${g}, ${n}!"`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

  - [x] 4.3 Write the Greeting module DOM integration and clock
    - Implement `Greeting.init()`: start `setInterval(Greeting.tick, 1000)`, render initial time/date/greeting
    - Implement `Greeting.tick()`: update time display element
    - Implement `Greeting.updateName(name)`: update the greeting name portion; revert to name-free format when name is empty/null
    - _Requirements: 1.1, 1.2, 1.7, 1.8_

  - [x] 4.4 Write the UserName module
    - Implement `UserName.validate(name)`: ≥1 non-whitespace char, ≤50 chars
    - Implement `UserName.save(name)`: validate → persist via Storage → call `Greeting.updateName(name)`; return `{ ok, error }`
    - Implement `UserName.clear()`: remove from Storage, call `Greeting.updateName(null)`
    - Implement `UserName.init()`: load stored name, render in greeting, wire save/clear buttons and input field
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 4.5 Write unit tests for Greeting and UserName modules (`__tests__/greeting.test.js`, `__tests__/username.test.js`)
    - Greeting: `updateName(null)` reverts to nameless greeting; `init()` starts the clock interval
    - UserName: valid name saves and calls `Greeting.updateName`; whitespace-only name is rejected with error message; `clear()` removes from storage and reverts greeting
    - _Requirements: 1.7, 1.8, 2.5, 2.7_

  - [ ]* 4.6 Write property tests for UserName validation (Properties 6–7)
    - **Property 6: User Name Validation Accepts Valid Inputs** — `fc.string()` filtered to ≥1 non-whitespace, ≤50 chars → `validate()` returns `true`
    - **Property 7: User Name Validation Rejects Whitespace-Only Inputs** — `fc.stringOf(fc.constantFrom(' ','\t','\n','\r'))` → `validate()` returns `false`
    - **Validates: Requirements 2.6, 2.7**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the FocusTimer and PomoDuration modules
  - [x] 6.1 Write the `FocusTimer` pure function: `formatTime(totalSeconds)`
    - Implement `FocusTimer.formatTime(totalSeconds)` → `"MM:SS"` with zero-padding
    - _Requirements: 3.1_

  - [ ]* 6.2 Write property test for FocusTimer formatter (Property 8)
    - **Property 8: Timer Formatter Produces Valid MM:SS**
    - **Validates: Requirements 3.1**
    - `fc.integer({min:0,max:7200})` → `FocusTimer.formatTime(n)` matches `/^\d{2}:\d{2}$/`

  - [x] 6.3 Write the `FocusTimer` stateful module
    - Define `_state: { totalSeconds, remainingSeconds, running, intervalId, pendingDuration }`
    - Implement `start()`: no-op if already running; `setInterval(_tick, 1000)`; update button states
    - Implement `stop()`: clear interval, retain `remainingSeconds`, update button states
    - Implement `reset()`: stop, set `remainingSeconds = totalSeconds`, update display and button states
    - Implement `_tick()`: decrement `remainingSeconds` (floor at 0), update display; call `_onComplete()` when zero
    - Implement `_onComplete()`: stop timer, play audio alert (silent catch on autoplay failure), call `Notification.show()`
    - Implement `applyDuration(minutes)`: guard no-op if running; update `totalSeconds`, reset display
    - Implement `queueDuration(minutes)`: store in `pendingDuration`; apply on next `start()`
    - Implement `getState()`: return current state (for testing)
    - Implement `init()`: wire Start/Stop/Reset buttons, set initial display
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 6.4 Write unit tests for FocusTimer module (`__tests__/focus-timer.test.js`)
    - `start()` → `stop()` retains remaining time
    - Countdown reaches zero triggers completion callback
    - `applyDuration()` while idle updates display
    - `queueDuration()` while running does not interrupt current countdown
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.5 Write property tests for FocusTimer state invariants (Properties 9–10)
    - **Property 9: Timer Reset Always Returns to Initial Duration** — after N ticks then `reset()`, `remainingSeconds === totalSeconds` and `running === false`
    - **Property 10: Timer Controls Reflect Timer State** — any timer state → Start enabled ↔ not running, Stop enabled ↔ running
    - **Validates: Requirements 3.5, 3.7, 3.8**

  - [x] 6.6 Write the `PomoDuration` module
    - Implement `PomoDuration.validate(value)`: integer in [1, 120]
    - Implement `PomoDuration.load()`: read from Storage; fall back to `DEFAULT_MINUTES = 25` for absent/non-numeric/out-of-range values
    - Implement `PomoDuration.save(value)`: validate → persist → call `FocusTimer.applyDuration()` (idle) or `FocusTimer.queueDuration()` (running); display inline error on invalid input
    - Implement `PomoDuration.init()`: load duration, call `FocusTimer.applyDuration()`, wire input + save button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 6.7 Write unit tests for PomoDuration module (`__tests__/pomo-duration.test.js`)
    - `save()` while timer running queues duration
    - `save()` while idle applies immediately
    - _Requirements: 4.5, 4.6_

  - [ ]* 6.8 Write property tests for PomoDuration validation and defaults (Properties 11–13)
    - **Property 11: Pomodoro Duration Persistence Round-Trip** — `fc.integer({min:1,max:120})` → save then get === original
    - **Property 12: Invalid Duration Storage Defaults to 25** — `fc.anything()` filtered to absent/non-numeric/out-of-range → `load()` returns `25`
    - **Property 13: Out-of-Range Duration Input is Rejected** — `fc.integer()` filtered to outside [1,120] → `validate()` returns `false`
    - **Validates: Requirements 4.2, 4.4, 4.7**

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the TodoList module
  - [x] 8.1 Write `TodoList` pure functions and data helpers
    - Implement `TodoList.validateText(text)`: ≥1 non-whitespace char, ≤200 chars
    - Define Task factory: `{ id: crypto.randomUUID(), text, completed: false, createdAt: Date.now() }`
    - _Requirements: 5.1, 5.9, 5.10_

  - [ ]* 8.2 Write property test for TodoList text validation (Property 19)
    - **Property 19: Task Text Validation Rejects Whitespace-Only Input**
    - **Validates: Requirements 5.9, 5.10**
    - `fc.stringOf(fc.constantFrom(' ','\t','\n','\r'))` → `TodoList.validateText(s)` returns `false`

  - [x] 8.3 Write `TodoList` stateful module — CRUD and persistence
    - Implement `add(text)`: validate → push task → `_persist()` → `_render()`; return `{ ok, error }`; display inline validation error on failure
    - Implement `startEdit(id)`: replace task row with editable field pre-populated with current text
    - Implement `saveEdit(id, text)`: validate → update task → `_persist()` → `_render()`; return `{ ok, error }`; display inline error adjacent to edit field on failure
    - Implement `toggle(id)`: flip `completed`, `_persist()`, update strikethrough style in DOM
    - Implement `delete(id)`: remove from array, `_persist()`, `_render()`
    - Implement `_persist()`: `Storage.set(KEYS.TASKS, tasks)`; catch `StorageError` and show inline error banner
    - Implement `_render()`: render task list in insertion order; each row has edit/toggle/delete controls
    - Implement `init()`: load from Storage (default `[]`); `_render()`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.11_

  - [ ]* 8.4 Write unit tests for TodoList module (`__tests__/todo-list.test.js`)
    - `add()` then `delete()` leaves list empty
    - `startEdit()` pre-populates field with current text
    - Edit cancel restores original text
    - LocalStorage unavailable shows error banner
    - _Requirements: 5.2, 5.3, 5.7, 5.11_

  - [ ]* 8.5 Write property tests for TodoList operations (Properties 14–18)
    - **Property 14: Task Addition Round-Trip** — valid text → after `add(t)`, task appears in DOM and in localStorage
    - **Property 15: Task Edit Round-Trip** — valid replacement text → after `saveEdit(id,t)`, DOM and localStorage reflect updated text
    - **Property 16: Task Completion Toggle Idempotence and Persistence** — `toggle(id)` twice restores original completion; storage reflects state after each toggle
    - **Property 17: Task Deletion Round-Trip** — after `delete(id)`, task absent from DOM and localStorage
    - **Property 18: Task Load Order Preserved** — arbitrary ordered Task array in localStorage → `init()` renders in same order
    - **Validates: Requirements 5.2, 5.4, 5.5, 5.6, 5.7, 5.8**

- [x] 9. Implement the QuickLinks module
  - [x] 9.1 Write `QuickLinks` pure functions
    - Implement `QuickLinks.validate(label, url)`: label non-empty (≤30), url non-empty (≤2048)
    - Implement `QuickLinks.normalizeUrl(url)`: prepend `"https://"` if url lacks `http://` or `https://` prefix
    - _Requirements: 6.6, 6.7_

  - [ ]* 9.2 Write property tests for QuickLinks pure functions (Properties 22–23)
    - **Property 22: Quick Link Empty Field Validation** — `fc.tuple` with empty label or url → `validate()` returns `false`
    - **Property 23: URL Normalisation Ensures HTTPS Scheme** — `fc.string()` without http/https prefix → `normalizeUrl()` starts with `"https://"`
    - **Validates: Requirements 6.6, 6.7**

  - [x] 9.3 Write `QuickLinks` stateful module — CRUD and persistence
    - Implement `add(label, url)`: validate → check count < 20 → normalise URL → push link → `_persist()` → `_render()`; return `{ ok, error }`; show inline error for validation failures and max-reached
    - Implement `delete(id)`: remove from array, `_persist()`, `_render()`
    - Implement `_persist()`: `Storage.set(KEYS.QUICK_LINKS, links)`
    - Implement `_render()`: render link buttons; clicking opens URL in new tab via `window.open(url, '_blank')`; each button has a delete control
    - Implement `init()`: load from Storage (default `[]`); `_render()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 9.4 Write unit tests for QuickLinks module (`__tests__/quick-links.test.js`)
    - `add()` with 20 existing links is rejected with error message
    - URL opened in new tab via `window.open`
    - _Requirements: 6.3, 6.8_

  - [ ]* 9.5 Write property tests for QuickLinks CRUD (Properties 20–21)
    - **Property 20: Quick Link Addition Round-Trip** — valid label/url with count < 20 → after `add()`, button in DOM and link in localStorage with normalised URL
    - **Property 21: Quick Link Deletion Round-Trip** — after `delete(id)`, button absent from DOM and absent from localStorage
    - **Validates: Requirements 6.2, 6.4**

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Build the HTML structure and CSS layout
  - [x] 11.1 Write the full semantic HTML markup in `index.html`
    - Greeting panel: time display, date display, greeting text, name input + save/clear buttons
    - Focus Timer widget: timer display, Start/Stop/Reset buttons, duration input + save button
    - Todo List widget: task input + add button, task list container
    - Quick Links panel: label input, URL input, add button, links container
    - Theme toggle button in header
    - Notification/toast element (hidden by default)
    - All elements have `id` or `data-*` attributes matching module selectors
    - _Requirements: 9.1, 9.4, 9.6_

  - [x] 11.2 Implement responsive grid layout in `css/style.css`
    - Define CSS custom properties for the purple-dominant palette (light and dark variants) on `:root` and `[data-theme="dark"]`
    - Layout: Greeting at top (full width), Focus Timer + Todo List side-by-side in middle row, Quick Links at bottom (full width)
    - Media query `@media (max-width: 768px)`: stack all panels in single column
    - Ensure text/background contrast meets WCAG 2.1 AA (≥4.5:1 for normal text)
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 11.3 Style all widget components in `css/style.css`
    - Greeting panel: large time display, readable date, greeting text typography
    - Buttons (Start/Stop/Reset, Save, Clear, Add, Delete): focus-visible outline, disabled state styling
    - Task list items: strikethrough style for completed tasks, edit/delete controls
    - Quick link buttons: consistent button style with delete affordance
    - Inline validation error messages: colour and placement per error handling spec
    - Notification/toast: visible overlay or banner, auto-dismiss animation
    - Input fields: focus states, character limit feedback
    - Theme toggle: visible control with accessible label
    - _Requirements: 3.7, 3.8, 5.5, 7.1, 9.3_

- [x] 12. Wire all modules together in the `App` coordinator
  - [x] 12.1 Implement the `App` coordinator and `DOMContentLoaded` boot sequence
    - Wire initialisation order: `Storage` → `Theme.init()` → `Greeting.init()` → `UserName.init()` → `PomoDuration.init()` → `FocusTimer.init()` → `TodoList.init()` → `QuickLinks.init()`
    - Implement `Notification.show(message)` (called by `FocusTimer._onComplete()`): display visual toast/banner; auto-dismiss after 5 seconds
    - Confirm `Theme.applyEarly()` inline script in `<head>` runs before `DOMContentLoaded`
    - _Requirements: 7.4, 8.2, 3.6_

  - [x] 12.2 Verify cross-module communication wiring
    - Confirm `PomoDuration.save()` calls `FocusTimer.applyDuration()` (idle) or `FocusTimer.queueDuration()` (running)
    - Confirm `UserName.save()` / `UserName.clear()` calls `Greeting.updateName()`
    - Confirm `FocusTimer._onComplete()` calls `Notification.show()`
    - _Requirements: 3.5, 3.6, 4.5, 4.6, 2.3, 2.5_

- [x] 13. Final validation and polish
  - [x] 13.1 Verify no external network requests are made
    - Assert `fetch` and `XMLHttpRequest` are never called during the app lifecycle (no external script tags, no CDN links, no API calls)
    - _Requirements: 8.4, 9.6_

  - [x] 13.2 Verify file structure and no external framework dependencies
    - Confirm only `index.html`, `css/style.css`, `js/app.js` are application files
    - Confirm no `<script src="...">` tags pointing to external frameworks
    - _Requirements: 9.4, 9.6_

  - [x] 13.3 Verify LocalStorage unavailability error handling
    - Mock `localStorage` to throw on `setItem` for each widget (TodoList, QuickLinks, etc.)
    - Assert that each affected widget shows its inline error banner and that the rest of the app remains functional
    - _Requirements: 5.11, 8.3_

  - [ ]* 13.4 Write integration smoke tests (`__tests__/integration.test.js`)
    - Flash-of-wrong-theme prevention: assert `<html data-theme>` is set before `DOMContentLoaded` fires
    - No network requests: assert `fetch` and `XMLHttpRequest` are never called during app lifecycle
    - File structure check: assert `index.html`, `css/style.css`, `js/app.js` exist; no external framework `<script>` tags in HTML
    - _Requirements: 7.4, 8.4, 9.6_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for full traceability
- Property tests use **fast-check** (minimum 100 iterations each) and are tagged with `// Feature: productivity-dashboard, Property N: <property text>`
- Unit tests use **Vitest** with **jsdom** environment and **@testing-library/dom**
- The inline `<head>` theme script is critical for flash-of-wrong-theme prevention (Requirement 7.4) — it must execute synchronously before the browser paints
- `crypto.randomUUID()` is available in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+) and requires HTTPS or localhost — no polyfill needed for the target environment
- Checkpoint tasks are not leaf tasks and are excluded from the dependency graph below

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["2.4", "3.2", "3.3", "3.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["4.5", "4.6", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["6.4", "6.5", "6.6"] },
    { "id": 8, "tasks": ["6.7", "6.8", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["8.4", "8.5", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3"] },
    { "id": 12, "tasks": ["9.4", "9.5", "11.1"] },
    { "id": 13, "tasks": ["11.2"] },
    { "id": 14, "tasks": ["11.3"] },
    { "id": 15, "tasks": ["12.1"] },
    { "id": 16, "tasks": ["12.2"] },
    { "id": 17, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 18, "tasks": ["13.4"] }
  ]
}
```
