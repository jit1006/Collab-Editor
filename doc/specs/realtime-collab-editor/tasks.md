# Implementation Plan — Real-Time Collaborative Code Editor

- [x] 1. Monorepo scaffold & shared config
  - Root `package.json` with `dev` running client+server concurrently; `.gitignore`.
  - Restructure to `/client` and `/server`.
  - _Requirements: 17_

- [x] 2. Shared language registry
  - `server/src/languages.ts` and `client/src/lib/languages.ts`: ids, labels, monaco id,
    piston language+version, extension, Hello-World templates for all required languages.
  - _Requirements: 1.1, 1.4, 7.1, 12.1_

- [x] 3. Server: Express + execute proxy
  - `/health`, `/api/execute` with validation, language mapping, 10s timeout, normalized
    response.
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Server: y-websocket + Socket.IO
  - ws upgrade with `setupWSConnection`; Socket.IO rooms for chat, join/leave, name
    availability check, shared output, read-only/language relays.
  - _Requirements: 5.4, 6.1, 9.1, 10.1, 13.2, 15.1_

- [x] 5. Client: pure libs + unit tests
  - `validateName.ts`, `theme.ts`, `colors.ts`, `ids.ts`; Vitest tests for name + theme.
  - _Requirements: 2.2, 2.3, 4.3, 4.4, 17.2_

- [x] 6. Client: ThemeProvider + no-flash
  - Inline pre-paint script; `ThemeProvider`; Tailwind `darkMode: class`.
  - _Requirements: 4.1–4.5_

- [x] 7. Client: routing & room creation
  - `/room/:roomId`, create-room, copy invite link.
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Client: collaboration hook
  - `useCollaboration`: Y.Doc, WebsocketProvider, awareness, socket, status, users.
  - _Requirements: 1.3, 3.3, 6.1, 13.1, 13.2_

- [x] 9. Client: NameModal (name gate)
  - Validation, duplicate check via socket, localStorage prefill, color assignment, lock.
  - _Requirements: 2.1–2.6_

- [x] 10. Client: EditorPane
  - Monaco + MonacoBinding, remote cursor styles, language sync, template on empty,
    typing indicator, follow mode, shortcuts, read-only.
  - _Requirements: 1.2, 1.4, 1.5, 3.4, 3.5, 6.1, 14.1, 15.1_

- [x] 11. Client: Sidebar
  - Avatars/initials, count, (You), typing, follow click, collapse/drawer.
  - _Requirements: 3.1–3.6_

- [x] 12. Client: TopBar + settings + connection badge
  - Room id+copy, language dropdown, Run, theme toggle, settings menu, status.
  - _Requirements: 1.1, 4.1, 7.1, 11.1, 13.1_

- [x] 13. Client: BottomPanel (Output/Input/Chat) + Toaster
  - Resizable panel, output clear + share, stdin, chat w/ unread badge, join/leave toasts.
  - _Requirements: 7.2, 7.4, 8.1, 9.1, 10.1_

- [x] 14. File actions & keyboard shortcuts
  - Download w/ extension, copy code, Ctrl+Enter / Ctrl+S.
  - _Requirements: 12.1, 14.1_

- [x] 15. README & final polish
  - Setup/run instructions, ARIA/responsive pass, env notes.
  - _Requirements: 16.1, 17.1, 17.3_
</text>
