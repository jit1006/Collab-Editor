# CollabCode — Real-Time Collaborative Code Editor

A browser-based collaborative code editor. Multiple people join a room via a shared link
and edit the same document in real time with conflict-free merging (CRDT), see each
other's cursors and presence, chat, and run code in many languages.

> **Live sync** powered by **Yjs** over WebSocket · **Monaco** editor · **Socket.IO** for
> chat/presence · code execution via **Judge0 CE** (and **Piston**) behind a backend proxy.

---

## Features

- **Real-time collaborative editing** (Yjs CRDT + `y-monaco`) — concurrent edits merge
  without conflicts; the document survives reconnects.
- **Live remote cursors & selections** with name labels, each in the user's color.
- **Mandatory name gate** — valid (2–20 chars), unique-per-room names; prefilled from
  `localStorage` but always confirmed; auto-assigned color.
- **Active-users sidebar** — avatars/initials, online count, "(You)", live typing
  indicator, click-to-follow a user's cursor; collapsible, mobile drawer.
- **Day / Night theme** — app + Monaco, persisted, defaults to system, no flash on load.
- **Rooms & invites** — unique room id in the URL (`/room/:id`), create room, copy
  invite link.
- **Run code** — Run button + stdin box + output panel (stdout, stderr, exit code,
  time), ~10s timeout, loading state. Output can be shared with the room.
- **Chat** — message list with timestamps and an unread badge.
- **Join/leave toasts**, **connection status** (Connected / Reconnecting / Offline) with
  auto-reconnect.
- **Editor settings** — font size, tab size, word wrap, minimap, format.
- **File actions** — download with the correct extension, copy to clipboard.
- **Keyboard shortcuts** — `Ctrl/Cmd+Enter` run, `Ctrl/Cmd+S` download.
- **Read-only mode** — the room creator can lock editing for viewers.
- **Accessible & responsive** — ARIA labels, keyboard-navigable controls.

## Supported languages

C++, C, Python, Java, JavaScript, TypeScript, Go, Rust, C#, PHP, Ruby, Kotlin, SQL — each
with syntax highlighting, a "Hello World" starter, the right file extension, and Judge0 / Piston
runtimes for execution.

---

## Tech stack

| Area        | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| Client      | React 18 + Vite + TypeScript + Tailwind CSS v3                |
| Editor      | Monaco (`@monaco-editor/react`)                               |
| Realtime    | Yjs + `y-websocket` + `y-monaco` (+ Awareness for presence)   |
| Chat/events | Socket.IO                                                     |
| Server      | Node.js + Express + `ws` (y-websocket protocol) + Socket.IO   |
| Execution   | Judge0 CE (default) / Piston API via `POST /api/execute` proxy|
| Deployment  | Single-port Express static server / Docker / Render           |
| Tests       | Vitest (name validation + theme logic)                        |

No database required — room state lives in memory. Optional disk persistence via `y-leveldb`
(set `PERSIST=1`).

---

## Project structure

```
.
├── client/                 React app (Vite + Monaco + Yjs)
│   └── src/
│       ├── components/      NameModal, TopBar, Sidebar, EditorPane, OutputPanel,
│       │                    Chat, BottomPanel, SettingsMenu, ConnectionBadge, Toaster
│       ├── hooks/           useCollaboration, useLocalStorage
│       ├── lib/             validateName, theme, languages, colors, ids, runCode,
│       │                    fileActions  (+ __tests__)
│       ├── pages/           RoomPage
│       ├── theme/           ThemeProvider
│       ├── App.tsx  main.tsx  types.ts  index.css
├── server/                 Express + y-websocket + Socket.IO + execute proxy
│   └── src/                 index, yjs, socket, execute, languages, types.d.ts
├── Dockerfile              Multi-stage Dockerfile for deployment
├── render.yaml             Render cloud deployment configuration
├── DEPLOYMENT.md           Comprehensive deployment guide
├── .env.example            Environment configuration template
├── package.json            Root scripts (runs client + server together)
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js **18+** (20+ recommended)
- Internet access from the server to `https://ce.judge0.com` (for code execution)

### Install

From the repo root:

```bash
npm run install:all
```

This installs the root tooling and both workspaces (`client` and `server`).

### Run (development)

```bash
npm run dev
```

This starts **both**:

- the server on **http://localhost:3001** (HTTP API + Yjs WS + Socket.IO), and
- the Vite client on **http://localhost:5173** (which proxies `/api`, `/socket.io`, and
  `/yjs` to the server).

Open http://localhost:5173, click **Create a room**, enter a name, and share the invite
link with another browser tab to collaborate.

### Build & run (production)

```bash
npm run build     # builds server (tsc) and client (vite)
npm start         # runs the compiled server on PORT (default 3001)
```

In production, the Express server automatically serves the compiled frontend bundle from `client/dist`, so a single port handles the UI, WebSockets, and Execution API.

### Test

```bash
npm test          # runs client unit tests (Vitest): validateName + theme
```

---

## Configuration (env vars)

Server (`server/`):

| Var                  | Default                        | Description                                          |
| -------------------- | ------------------------------ | ---------------------------------------------------- |
| `PORT`               | `3001`                         | HTTP / WebSocket server port                         |
| `CLIENT_ORIGIN`      | `*`                            | CORS origin for the client                           |
| `EXECUTION_PROVIDER` | `judge0`                       | Execution engine (`judge0` or `piston`)              |
| `JUDGE0_URL`         | `https://ce.judge0.com`        | Judge0 API endpoint URL                              |
| `JUDGE0_API_KEY`     | *(empty)*                      | Optional API Key for RapidAPI or self-hosted Judge0  |
| `PISTON_URL`         | `https://emkc.org/api/v2/piston`| Piston API endpoint (used if `EXECUTION_PROVIDER=piston`)|
| `PERSIST`            | *(unset)*                      | Set to `1` to enable `y-leveldb` document persistence|
| `LEVELDB_DIR`        | `./.leveldb`                   | Directory for LevelDB persistence                    |

---

## How it works

- **Document sync.** Each room is one `Y.Doc`. The client's `y-websocket` provider syncs
  it to the server's minimal y-websocket-protocol implementation (`server/src/yjs.ts`),
  and `y-monaco` binds the shared `Y.Text` to the Monaco model. Cursors/selections and
  presence flow through the Yjs **Awareness** protocol.
- **Language & read-only** live in a shared `Y.Map` ("roomConfig") so they're CRDT-synced
  and survive reconnects.
- **Chat, join/leave, name checks, shared output** use **Socket.IO** rooms on the same
  HTTP server.
- **Running code** posts to `/api/execute`, which maps the language to a Judge0 runtime ID (or Piston runtime),
  calls the execution service with a 10s timeout, and returns a normalized
  `{ stdout, stderr, code, time, error? }`.

---

## Deployment

For full deployment instructions on **Render**, **Railway**, **Docker**, or a **VPS**, see [DEPLOYMENT.md](file:///c:/Users/hp/Desktop/projects/collaborativeeditor/CodeEditor/DEPLOYMENT.md).
