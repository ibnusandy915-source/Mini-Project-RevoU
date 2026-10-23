# Requirements Document

## Introduction

A personal productivity dashboard delivered as a standalone web application using HTML, CSS, and Vanilla JavaScript. The dashboard runs entirely in the browser with no backend server, persisting all user data in LocalStorage. It provides four core productivity widgets — a Greeting panel, a Focus Timer (Pomodoro), a To-Do List, and a Quick Links panel — together with a light/dark mode toggle, a customizable user name in the greeting, and a configurable Pomodoro duration. The visual design follows a purple-themed, minimal layout with clear typographic hierarchy and full responsiveness across modern browsers.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **App**: Synonym for Dashboard.
- **Greeting_Panel**: The top section of the Dashboard displaying the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The Pomodoro-style countdown timer widget.
- **Todo_List**: The task management widget.
- **Quick_Links**: The widget containing user-defined shortcut buttons to external URLs.
- **LocalStorage**: The browser's `window.localStorage` API used for all data persistence.
- **Theme**: The active color scheme — either "light" or "dark".
- **Pomodoro_Duration**: The configurable countdown duration for the Focus_Timer, defaulting to 25 minutes.
- **Task**: A single to-do item with a text description and a completion state.
- **Quick_Link**: A user-defined record consisting of a label and a URL, rendered as a clickable button.
- **User_Name**: The customizable name displayed in the greeting message, stored in LocalStorage.

---

## Requirements

### Requirement 1: Greeting Panel

**User Story:** As a user, I want to see the current time, date, and a contextual greeting so that I am oriented and welcomed when I open the dashboard.

#### Acceptance Criteria

1. THE Greeting_Panel SHALL display the current local time in HH:MM:SS format, updating every second.
2. THE Greeting_Panel SHALL display the current local date in the format "[Full Weekday Name], [Full Month Name] [Day], [4-digit Year]" (e.g., "Monday, July 14, 2025").
3. IF the local hour is between 05:00 and 11:59 inclusive, THEN THE Greeting_Panel SHALL display the greeting "Good Morning".
4. IF the local hour is between 12:00 and 17:59 inclusive, THEN THE Greeting_Panel SHALL display the greeting "Good Afternoon".
5. IF the local hour is between 18:00 and 20:59 inclusive, THEN THE Greeting_Panel SHALL display the greeting "Good Evening".
6. IF the local hour is between 21:00 and 23:59 inclusive, or between 00:00 and 04:59 inclusive, THEN THE Greeting_Panel SHALL display the greeting "Good Night".
7. WHEN a User_Name has been stored in the application's local settings, THE Greeting_Panel SHALL display the greeting in the format "[Greeting], [User_Name]!" (e.g., "Good Morning, Alex!").
8. WHEN no User_Name has been stored in the application's local settings, THE Greeting_Panel SHALL display the greeting text without a name suffix.

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to set my name so that the greeting feels personal.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field that allows the user to enter a User_Name of up to 50 characters.
2. WHEN the user saves a User_Name, THE App SHALL persist the value in LocalStorage under a defined key.
3. WHEN the App is loaded and a User_Name is found in LocalStorage, THE App SHALL read the User_Name and display it in the Greeting_Panel.
4. WHEN the App is loaded and no User_Name is found in LocalStorage, THE App SHALL display the Greeting_Panel in name-free format, showing a greeting without a name component.
5. WHEN the user clears or removes the User_Name, THE App SHALL remove the stored value from LocalStorage and revert the Greeting_Panel to name-free format, showing a greeting without a name component.
6. THE App SHALL accept User_Name values consisting of printable Unicode characters where at least one character is not a whitespace character.
7. IF the submitted User_Name consists entirely of whitespace characters, THEN THE App SHALL reject the input and display an error message indicating the name cannot be blank, leaving any previously stored User_Name unchanged.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a countdown timer so that I can work in focused Pomodoro sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display the remaining time in MM:SS format at all times.
2. WHILE the Focus_Timer is in the stopped or reset state, THE Focus_Timer SHALL display the full Pomodoro_Duration (default 25:00).
3. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down one second per real-world second from the currently displayed time.
4. WHILE the Focus_Timer is running, WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop counting and restore the display to the full Pomodoro_Duration.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, play an audible alert, and display a visual notification to the user.
7. WHILE the Focus_Timer is running, THE Focus_Timer SHALL disable the Start control and enable the Stop and Reset controls.
8. WHILE the Focus_Timer is stopped or paused, THE Focus_Timer SHALL enable the Start control and disable the Stop control.

---

### Requirement 4: Customizable Pomodoro Duration

**User Story:** As a user, I want to set a custom timer duration so that I can adjust the Focus_Timer to match my preferred work intervals.

#### Acceptance Criteria

1. THE Focus_Timer SHALL provide an input mechanism that allows the user to specify the Pomodoro_Duration in whole minutes between 1 and 120.
2. WHEN the user saves a new Pomodoro_Duration, THE App SHALL persist the value in LocalStorage under a designated key.
3. WHEN the App is loaded, THE App SHALL read the Pomodoro_Duration from LocalStorage and initialise the Focus_Timer with that value.
4. IF the stored Pomodoro_Duration value is absent, non-numeric, or outside the range of 1 to 120 minutes, THEN THE App SHALL initialise the Focus_Timer with a default duration of 25 minutes.
5. WHILE the Focus_Timer is not running, WHEN the user saves a new Pomodoro_Duration, THE Focus_Timer SHALL reset and display the new duration within 1 second.
6. WHILE the Focus_Timer is running, WHEN the user saves a new Pomodoro_Duration, THE App SHALL store the new value and apply it when the Focus_Timer is next started, without interrupting the current session.
7. IF the user attempts to save a Pomodoro_Duration outside the 1–120 minute range, THEN THE Focus_Timer SHALL display an inline validation message and reject the value.

---

### Requirement 5: To-Do List

**User Story:** As a user, I want to manage a list of tasks so that I can track and complete my daily work items.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field and a submit control for adding a new Task with a text description of up to 200 characters.
2. WHEN the user submits a new Task, THE Todo_List SHALL add the Task to the list, clear the input field, and persist the updated list to LocalStorage.
3. WHEN the user activates the edit control on a Task, THE Todo_List SHALL present an editable field pre-populated with the current Task text, enforcing a maximum of 200 characters, allowing the user to modify and save the updated text.
4. WHEN the user saves an edited Task, THE Todo_List SHALL update the Task in the list and persist the change to LocalStorage.
5. WHEN the user activates the completion toggle on a Task, THE Todo_List SHALL update the Task's completion state: applying a strikethrough visual style when the Task is marked complete and removing it when the Task is marked incomplete.
6. WHEN a Task's completion state is toggled, THE Todo_List SHALL persist the updated state to LocalStorage.
7. WHEN the user activates the delete control on a Task, THE Todo_List SHALL remove the Task from the list and persist the updated list to LocalStorage.
8. WHEN the App is loaded, THE Todo_List SHALL read all Tasks from LocalStorage and render them in the order they were originally added.
9. IF the user submits a Task with an empty or whitespace-only description, THEN THE Todo_List SHALL reject the submission and display an inline validation message.
10. IF the user saves an edited Task with an empty or whitespace-only description, THEN THE Todo_List SHALL reject the save and display an inline validation message adjacent to the edit field.
11. IF LocalStorage is unavailable when the Todo_List attempts to read or write Task data, THEN THE Todo_List SHALL display an error message indicating that tasks cannot be saved or loaded.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and access my favourite website shortcuts so that I can navigate to them quickly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links panel SHALL provide input fields for a label (up to 30 characters) and a URL (up to 2048 characters), plus a submit control for adding a new Quick_Link.
2. WHEN the user submits a new Quick_Link and the total number of saved Quick_Links is fewer than 20, THE Quick_Links panel SHALL add a button labelled with the Quick_Link label and persist the Quick_Link to LocalStorage.
3. WHEN the user activates a Quick_Link button, THE App SHALL open the associated URL in a new browser tab.
4. WHEN the user activates the delete control on a Quick_Link, THE Quick_Links panel SHALL remove the Quick_Link button and persist the updated list to LocalStorage.
5. WHEN the App is loaded, THE Quick_Links panel SHALL read all Quick_Links from LocalStorage and render a button for each one.
6. IF the user submits a Quick_Link with an empty label or an empty URL, THEN THE Quick_Links panel SHALL reject the submission and display an inline validation message indicating which field is empty.
7. IF the user submits a Quick_Link with a URL that does not begin with "http://" or "https://", THEN THE Quick_Links panel SHALL prepend "https://" to the URL before saving.
8. IF the user submits a new Quick_Link and the total number of saved Quick_Links is already 20, THEN THE Quick_Links panel SHALL reject the submission and display an inline message indicating the maximum number of Quick_Links has been reached.

---

### Requirement 7: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between light and dark color schemes so that the dashboard is comfortable to use in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a visible toggle control that switches the Theme between "light" and "dark".
2. WHEN the user activates the Theme toggle, THE App SHALL apply the selected Theme to all Dashboard widgets immediately without requiring a page reload.
3. WHEN the user activates the Theme toggle, THE App SHALL persist the selected Theme value in LocalStorage under a defined key.
4. WHEN the App is loaded, THE App SHALL read the Theme from LocalStorage and apply it before rendering visible content, preventing a flash of the wrong theme.
5. IF no Theme value is stored in LocalStorage, THEN THE App SHALL apply the "light" Theme by default.

---

### Requirement 8: Persistence and Data Integrity

**User Story:** As a user, I want my settings and data to be retained across browser sessions so that I do not lose my work.

#### Acceptance Criteria

1. THE App SHALL store all persistent data — Tasks, Quick_Links, User_Name, Pomodoro_Duration, and Theme — exclusively in LocalStorage using well-defined, non-colliding keys.
2. WHEN the App is loaded, THE App SHALL read all persisted values from LocalStorage and initialise each widget before the page is visible to the user.
3. IF a LocalStorage read operation returns an unparseable JSON string, THEN THE App SHALL discard that value, log a warning to the browser console, and initialise the corresponding widget with its default state.
4. THE App SHALL not make any network requests for data storage or retrieval.

---

### Requirement 9: Layout and Visual Design

**User Story:** As a user, I want a clean, readable, and responsive interface so that the dashboard is easy to use on different screen sizes.

#### Acceptance Criteria

1. THE Dashboard SHALL render the Greeting_Panel at the top of the page, the Focus_Timer and Todo_List side-by-side in the middle row, and the Quick_Links panel at the bottom.
2. WHEN the viewport width is 768 px or less, THE Dashboard SHALL stack all panels vertically in a single column.
3. THE Dashboard SHALL use a purple-dominant color palette with sufficient contrast between text and background to meet WCAG 2.1 AA contrast requirements (minimum 4.5:1 for normal text).
4. THE Dashboard SHALL use a single CSS file located at css/style.css and a single JavaScript file located at js/app.js.
5. THE Dashboard SHALL load and render all content within 2 seconds on a standard broadband connection, given that no network requests are made after initial page load.
6. THE App SHALL consist of a single HTML file (index.html), one CSS file (css/style.css), and one JavaScript file (js/app.js), with no external framework dependencies.
