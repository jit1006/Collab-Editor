# Design — Real-Time Collaborative Code Editor

## Overview

A monorepo with two apps:

```
/client   React + Vite + TypeScript + Tailwind. Monaco editor, Yjs sync, presence,
          chat, run panel, theme, name gate.
/server   Express + ws (y-websocket protocol) + Socket.IO + /api/execute Judge0 / Piston proxy.
```

The source of truth for the document is a **Yjs document** per room, synchronized over a
WebSocket using the `y-websocket` wire protocol. `y-monaco`'s `MonacoBinding` binds the
shared `Y.Text` to the Monaco model, giving conflict-free concurrent editing and, through
the **Awareness** protocol, remote cursors/selections and presence. Chat messages and
join/leave events and shared room settings (language, read-only, shared output) travel
over **Socket.IO** on the same HTTP server, which is lighter to reason about for discrete
events than modeling everything in the CRDT.

Language and read-only are stored in a shared `Y.Map` ("roomConfig") so they are CRDT-
synced and survive reconnects along with the document.

### Why these choices
- **Yjs over WebSocket** is the canonical low-latency CRDT path and meets the <200ms,
  conflict-free, reconnect-intact requirements with minimal custom code.
- **Socket.IO** handles ephemeral room events (chat, toasts, shared output) with rooms
  and auto-reconnect out of the box.
- **Judge0 CE via a backend proxy** keeps the public API behind our server (CORS, timeout,
  rate-limit, hiding the upstream), satisfying the execute requirement. Piston is supported as a secondary engine.

## Architecture

```
┌──────────────── client (Vite) ────────────────┐        ┌──────── server (Node) ────────┐
│  ThemeProvider ─ TopBar ─ Sidebar ─ EditorPane │        │  Express                       │
│                         │                       │ WS     │   ├─ GET  /health             │
│                 Monaco  ├── y-monaco ──Y.Doc────┼───────▶│   └─ POST /api/execute (Judge0)│
│                         │   Awareness           │        │  ws server (y-websocket proto) │
│  OutputPanel ─ Input ─ Chat ─ Toasts            │ IO     │  Socket.IO (chat/room events)  │
│                         └── socket.io-client ───┼───────▶│  Static client server (/dist)  │
└────────────────────────────────────────────────┘        └────────────────────────────────┘
```

### Server

- `src/index.ts` — boots Express + HTTP server, mounts Socket.IO and the ws upgrade, serves static client build from `client/dist`.
- `src/yjs.ts` — y-websocket connection handling (`setupWSConnection`), optional
  `y-leveldb` persistence behind an env flag.
- `src/socket.ts` — Socket.IO namespace: room join/leave, chat relay, presence names for
  duplicate-name validation, shared output broadcast, toast events.
- `src/execute.ts` — `/api/execute` handler: validates body, maps our language id →
  Judge0 runtime ID (or Piston runtime), POSTs to Judge0 with a 10s timeout (AbortController), normalizes the
  response to `{ stdout, stderr, code, time, error? }`.
- `src/languages.ts` — shared language registry (id, label, monaco id, judge0Id, piston language +
  version, file extension, Hello-World template). Mirrored on the client.

Duplicate-name check: the client asks the server (Socket.IO ack) whether a name is free
in the room before entering; the server tracks `{ roomId -> Set<lowercased name> }`.

### Client

Component tree (per `/room/:roomId`):

```
<ThemeProvider>                      resolves theme pre-paint, exposes { theme, toggle }
  <RoomPage>
    collab = useCollaboration(roomId, user)   // owns Y.Doc, provider, awareness, socket
    <NameModal/>            // blocks until a valid, unique name is confirmed
    <TopBar/>               // logo, room id + copy, language, Run, theme, settings, status
    <div flex>
      <Sidebar/>            // active users, counts, typing, follow, collapse/drawer
      <EditorPane/>         // Monaco + MonacoBinding + remote cursor styles
    </div>
    <BottomPanel/>          // resizable: Output | Input | Chat tabs
    <Toaster/>             // join/leave + info toasts
```

Key hooks/modules:
- `lib/validateName.ts` — **pure** `validateName(name, takenNames)` → `{ ok, error? }`.
  Unit-tested. No DOM/network imports.
- `lib/theme.ts` — **pure** helpers: `getSystemTheme()`, `resolveInitialTheme(stored,
  system)`, `nextTheme(t)`, `applyThemeClass(doc, t)`. Unit-tested (the resolution logic
  is pure; the DOM apply takes an injected document).
- `lib/languages.ts` — client copy of the language registry + `monacoLanguage(id)`,
  `extensionFor(id)`, `templateFor(id)`.
- `lib/colors.ts` — `colorForName(name)` deterministic palette pick + contrast text.
- `hooks/useCollaboration.ts` — creates `Y.Doc`, `WebsocketProvider`, `awareness`, the
  Socket.IO client; exposes doc text, roomConfig map, users list, connection status,
  chat API, run-output sharing, and cleanup on unmount.
- `hooks/useLocalStorage.ts` — typed persisted state.
- `components/*` — NameModal, TopBar, Sidebar, EditorPane, OutputPanel, Chat, BottomPanel,
  Toaster, SettingsMenu, ConnectionBadge.

### Theme — no-flash strategy
A tiny inline script in `index.html` runs before React, reads `localStorage.theme` (or
`prefers-color-scheme`), and sets `class="dark"` on `<html>` plus a `color-scheme` style.
`ThemeProvider` then hydrates from the same source so there is no mismatch. Tailwind is
configured in `darkMode: 'class'`.

### Data models (TypeScript)

```ts
type ThemeMode = 'light' | 'dark';

interface LanguageDef {
  id: string;            // our id, e.g. 'cpp'
  label: string;         // 'C++'
  monaco: string;        // monaco language id, e.g. 'cpp'
  piston: string;        // piston language, e.g. 'c++'
  version: string;       // piston runtime version, e.g. '10.2.0'
  ext: string;           // '.cpp'
  template: string;      // Hello World
}

interface RoomUser {
  clientId: number;      // yjs awareness client id
  name: string;
  color: string;
  typing: boolean;
  cursor?: { lineNumber: number; column: number } | null;
}

interface ChatMessage { id: string; name: string; color: string; text: string; ts: number; }

interface ExecuteRequest  { language: string; version?: string; code: string; stdin?: string; }
interface ExecuteResponse { stdout: string; stderr: string; code: number | null; time: number; error?: string; }

// Shared Yjs structures per room:
//   doc.getText('monaco')         -> the code
//   doc.getMap('roomConfig')      -> { language: string; readOnly: boolean; ownerId: string }
// Awareness state per client:
//   { user: { name, color }, cursor, selection, typing }
```

### `/api/execute` flow
1. Validate `{ language, code }` (reject empty). Clamp code size.
2. Resolve language → `{ piston language, version }` from the registry.
3. `fetch(PISTON_URL + '/execute', { signal: AbortController(10s) })`.
4. Normalize `run`/`compile` output into `ExecuteResponse`; on abort return
   `{ error: 'Execution timed out', code: null, ... }`.

## Error handling
- Execute: upstream errors / timeouts → structured `ExecuteResponse.error`, HTTP 200 with
  the error field (so the client always renders the panel) except 400 for bad input.
- WebSocket/Socket.IO drop → `status: 'reconnecting'`; both libraries auto-reconnect; the
  Y.Doc is retained client-side so content survives.
- Name gate blocks all collaboration side effects until confirmed.

## Testing strategy
- **Unit (Vitest):**
  - `validateName`: empty/whitespace, too short (<2), too long (>20), trims, duplicate
    (case-insensitive), self-name allowed, valid.
  - `theme`: `resolveInitialTheme` precedence (stored > system), `nextTheme` toggles,
    `getSystemTheme` via injected matchMedia, `applyThemeClass` sets/removes `dark` on an
    injected document.
- Manual/local acceptance (needs network, done by developer): two-tab sync & cursors
  <200ms, Piston C++ and Python runs, reconnect integrity, no console errors.

## Project layout
```
/client
  index.html (no-flash script)
  src/
    main.tsx  App.tsx
    lib/{validateName,theme,languages,colors,ids}.ts
    hooks/{useCollaboration,useLocalStorage}.ts
    components/{NameModal,TopBar,Sidebar,EditorPane,OutputPanel,Chat,BottomPanel,
                Toaster,SettingsMenu,ConnectionBadge}.tsx
    types.ts  index.css
    __tests__/{validateName.test.ts, theme.test.ts}
  tailwind/postcss/vite/tsconfig configs, vitest.config.ts
/server
  src/{index,yjs,socket,execute,languages}.ts  tsconfig  package.json
README.md  package.json (root dev script runs both)
```
</text>
