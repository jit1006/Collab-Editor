# Requirements — Real-Time Collaborative Code Editor

## Introduction

A browser-based, real-time collaborative code editor. Multiple users join a shared
room via a URL, edit the same document concurrently with conflict-free merging (CRDT),
see each other's cursors/selections and presence, chat, and run code in many languages
through a server-side execution proxy. The app supports light/dark themes, a mandatory
name gate, an active-users sidebar, and a resizable Output / Input / Chat panel.

Tech: React + Vite + TypeScript + Tailwind CSS on the client; Monaco Editor via
`@monaco-editor/react`; Yjs (CRDT) with `y-websocket` + `y-monaco` for sync and the
Awareness API for presence; Node.js + Express + a `y-websocket` server + Socket.IO for
chat/room events; code execution proxied to the Piston API. No database — room state is
in memory (optionally persisted with `y-leveldb`).

> Environment note: this spec is implemented against a sandbox with no npm/registry or
> outbound internet access, so dependency installation, dev-server startup, and live
> Piston runs are performed by the developer locally. The codebase and unit tests are
> written to be fully runnable once `npm install` succeeds.

## Requirements

### Requirement 1 — Language selection
**User story:** As a user, I want to pick the programming language so the editor
highlights syntax correctly and runs my code with the right runtime, synced to everyone.

#### Acceptance criteria
1. WHEN the user opens the language dropdown THEN the system SHALL list at least:
   C++, C, Python, Java, JavaScript, TypeScript, Go, Rust, C#, PHP, Ruby, Kotlin, SQL.
2. WHEN the user selects a language THEN the system SHALL update Monaco's language mode.
3. WHEN the language changes THEN the system SHALL propagate the choice to all users in
   the room in real time via a shared Yjs value.
4. WHEN a language is selected AND the document is empty (only whitespace) THEN the
   system SHALL load that language's default "Hello World" starter template.
5. WHEN the document is non-empty THEN switching language SHALL NOT overwrite content.

### Requirement 2 — Name gate (mandatory entry)
**User story:** As a user, I must enter a valid, unique display name before I can use the
editor, so collaborators are identifiable.

#### Acceptance criteria
1. WHEN a user first visits a room THEN the system SHALL show a full-screen modal asking
   for a name AND SHALL lock the editor, sidebar, and all features behind it.
2. WHEN the name is empty after trimming, shorter than 2, or longer than 20 characters
   THEN the system SHALL reject it with a clear inline error.
3. WHEN the trimmed name duplicates another active user's name in the same room (case-
   insensitive) THEN the system SHALL reject it with a clear error.
4. WHEN a valid name is submitted THEN the system SHALL store it in `localStorage` and
   unlock the app.
5. WHEN a returning user opens the app THEN the system SHALL prefill the stored name but
   STILL require explicit confirmation.
6. WHEN a user joins THEN the system SHALL assign a unique color automatically.

### Requirement 3 — Active users sidebar
**User story:** As a user, I want to see who is in the room so I know who I'm collaborating with.

#### Acceptance criteria
1. WHEN users are present THEN the sidebar SHALL show each user's colored avatar
   (initials), name, and an "(You)" label for self.
2. THE sidebar SHALL show a live online count.
3. WHEN a user joins or leaves THEN the list and count SHALL update within ~200ms.
4. WHEN a user is actively editing THEN the system SHALL show a "typing…" indicator by
   their entry.
5. WHEN a user clicks another user THEN the editor SHALL scroll to that user's cursor
   (follow mode).
6. THE sidebar SHALL be collapsible on desktop and become a drawer on mobile.

### Requirement 4 — Theme (night / day mode)
**User story:** As a user, I want a theme toggle that applies everywhere and persists.

#### Acceptance criteria
1. THE top bar SHALL contain a sun/moon toggle button.
2. WHEN toggled THEN the whole UI AND the Monaco theme (vs-dark / light) SHALL update.
3. THE choice SHALL persist in `localStorage`.
4. WHEN no stored choice exists THEN the system SHALL default to `prefers-color-scheme`.
5. THE initial render SHALL NOT flash the wrong theme (resolved before paint).

### Requirement 5 — Rooms & invites
1. EACH session SHALL have a unique room ID in the URL (`/room/:roomId`).
2. "Create Room" SHALL generate a random ID and navigate to it.
3. "Copy Invite Link" SHALL copy the room URL to the clipboard.
4. Users opening the same link SHALL join the same Yjs/Socket.IO session.

### Requirement 6 — Remote cursors & selections
1. THE system SHALL render each collaborator's cursor and selection in their color with a
   name label inside Monaco, via Yjs Awareness + `y-monaco`.

### Requirement 7 — Run code
1. A Run button SHALL execute the current code in the selected language via the backend
   `/api/execute` proxy to Piston.
2. THE UI SHALL provide a stdin input box and an output panel showing stdout, stderr,
   exit code, and execution time.
3. WHILE a run is in flight THE UI SHALL show a loading state and SHALL time out ~10s.
4. Output MAY optionally be shared with everyone in the room.

### Requirement 8 — Output panel
1. THE Output / Input / Chat panel SHALL be resizable and have a Clear action for output.

### Requirement 9 — Room chat
1. THE system SHALL provide a chat panel with a message list, timestamps, and an unread
   badge when the chat tab is not active.

### Requirement 10 — Join/leave notifications
1. WHEN a user joins or leaves THEN the system SHALL show a toast ("<name> joined" /
   "<name> left").

### Requirement 11 — Editor settings
1. THE system SHALL allow adjusting font size (+/-), tab size, word-wrap toggle, minimap
   toggle, and running Monaco's format action.

### Requirement 12 — File actions
1. THE system SHALL download the code with the language-correct extension and copy code
   to the clipboard.

### Requirement 13 — Connection status & resilience
1. THE system SHALL show Connected / Reconnecting / Offline status.
2. THE client SHALL auto-reconnect AND the document SHALL remain intact after reconnect.

### Requirement 14 — Keyboard shortcuts
1. Ctrl/Cmd+Enter SHALL run code; Ctrl/Cmd+S SHALL download code (preventing the browser
   save dialog).

### Requirement 15 — Read-only mode (optional)
1. THE room creator SHALL be able to toggle a read-only mode that prevents viewers from
   editing; the state SHALL be synced to the room.

### Requirement 16 — Accessibility & responsiveness
1. THE layout SHALL be responsive; controls SHALL be keyboard-accessible with ARIA labels.

### Requirement 17 — Quality
1. THE code SHALL be TypeScript-typed and commented.
2. THE system SHALL ship unit tests for name validation and theme logic.
3. THE app SHALL run without console errors and handle disconnects gracefully.
</text>
</invoke>
