import { useCallback, useEffect, useRef, useState } from "react";
import { useCollaboration } from "../hooks/useCollaboration";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useToast } from "../components/Toaster";
import { NameModal } from "../components/NameModal";
import { TopBar } from "../components/TopBar";
import { Sidebar } from "../components/Sidebar";
import { EditorPane, type EditorPaneHandle } from "../components/EditorPane";
import { BottomPanel } from "../components/BottomPanel";
import type { EditorSettings } from "../components/SettingsMenu";
import type { ExecuteResponse, Identity, RoomUser } from "../types";
import { runCode } from "../lib/runCode";
import { copyToClipboard, downloadCode } from "../lib/fileActions";

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
};

/**
 * The room screen. Owns the name-gate flow and composes the collaboration hook with all
 * UI panels. Nothing collaborative runs until a valid identity is confirmed.
 */
export function RoomPage({ roomId }: { roomId: string }) {
  const { theme, toggle } = useTheme();
  const toast = useToast();

  // Returning-user prefill, but confirmation is still required (Requirement 2.5).
  const [storedName, setStoredName] = useLocalStorage<string>("displayName", "");
  const [identity, setIdentity] = useState<Identity | null>(null);

  // A pre-connect socket purely for the name-availability check, created lazily so the
  // NameModal can validate duplicates before we spin up full collaboration.
  const [preSocket, setPreSocket] = useState<import("socket.io-client").Socket | null>(
    null,
  );
  const preSocketRef = useRef<import("socket.io-client").Socket | null>(null);
  useEffect(() => {
    // Only needed while the name gate is open.
    if (identity) return;
    let active = true;
    import("socket.io-client").then(({ io }) => {
      if (!active) return;
      const s = io({ path: "/socket.io", transports: ["websocket", "polling"] });
      preSocketRef.current = s;
      setPreSocket(s);
    });
    return () => {
      active = false;
      preSocketRef.current?.disconnect();
      preSocketRef.current = null;
    };
  }, [identity]);

  const collab = useCollaboration(roomId, identity);
  const editorRef = useRef<EditorPaneHandle>(null);

  // Editor settings persisted locally.
  const [settings, setSettings] = useLocalStorage<EditorSettings>(
    "editorSettings",
    DEFAULT_SETTINGS,
  );

  // Run state.
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [stdin, setStdin] = useState("");
  const [sharedBy, setSharedBy] = useState<string | null>(null);

  // Chat unread badge.
  const [unread, setUnread] = useState(0);
  const chatOpenRef = useRef(false);

  // UI chrome.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // --- Join/leave toasts ---
  useEffect(() => {
    return collab.onUserEvent(({ type, name }) => {
      toast.show(`${name} ${type === "joined" ? "joined" : "left"}`);
    });
  }, [collab, toast]);

  // --- Shared output from others ---
  useEffect(() => {
    return collab.onSharedOutput((payload) => {
      const p = payload as { result: ExecuteResponse; by: string };
      setResult(p.result);
      setSharedBy(p.by);
    });
  }, [collab]);

  // --- Unread chat counting ---
  useEffect(() => {
    if (collab.chat.length === 0) return;
    const last = collab.chat[collab.chat.length - 1];
    if (!chatOpenRef.current && last.name !== identity?.name) {
      setUnread((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collab.chat.length]);

  // --- Run code ---
  const handleRun = useCallback(async () => {
    const code = editorRef.current?.getValue() ?? "";
    if (!code.trim()) {
      toast.show("Nothing to run", "warning");
      return;
    }
    setRunning(true);
    setSharedBy(null);
    const res = await runCode(collab.language, code, stdin);
    setResult(res);
    setRunning(false);
  }, [collab.language, stdin, toast]);

  // --- Download / copy ---
  const handleDownload = useCallback(() => {
    const code = editorRef.current?.getValue() ?? "";
    downloadCode(code, collab.language);
  }, [collab.language]);

  // --- Copy invite link ---
  const handleCopyInvite = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href);
    toast.show(ok ? "Invite link copied" : "Copy failed", ok ? "success" : "warning");
  }, [toast]);

  // --- Share output with the room ---
  const handleShareOutput = useCallback(() => {
    if (!result || !identity) return;
    collab.shareOutput({ result, by: identity.name });
    toast.show("Output shared with the room", "success");
  }, [result, identity, collab, toast]);

  // --- Awareness: typing + cursor ---
  const handleTyping = useCallback(
    (typing: boolean) => collab.setAwarenessField("typing", typing),
    [collab],
  );
  const handleCursor = useCallback(
    (pos: { lineNumber: number; column: number }) =>
      collab.setAwarenessField("cursor", pos),
    [collab],
  );

  // --- Follow mode ---
  const handleFollow = useCallback((user: RoomUser) => {
    if (user.cursor) {
      editorRef.current?.revealPosition(user.cursor.lineNumber, user.cursor.column);
    }
    setMobileSidebar(false);
  }, []);

  // Global Ctrl/Cmd+S guard (so the browser save dialog never appears, even when the
  // editor isn't focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDownload]);

  // Name gate: block everything until identity is confirmed.
  if (!identity) {
    return (
      <NameModal
        roomId={roomId}
        initialName={storedName}
        socket={preSocket}
        onConfirm={(id) => {
          setStoredName(id.name);
          setIdentity(id);
          // The pre-connect socket is replaced by the collaboration socket.
          preSocketRef.current?.disconnect();
          preSocketRef.current = null;
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <TopBar
        roomId={roomId}
        language={collab.language}
        onLanguageChange={collab.setLanguage}
        onRun={handleRun}
        running={running}
        theme={theme}
        onToggleTheme={toggle}
        status={collab.status}
        onCopyInvite={handleCopyInvite}
        onToggleSidebar={() => {
          // On mobile (<768px) toggle the drawer; on desktop collapse the panel.
          if (window.matchMedia("(max-width: 767px)").matches) {
            setMobileSidebar((v) => !v);
          } else {
            setSidebarCollapsed((v) => !v);
          }
        }}
        settings={settings}
        onSettingsChange={setSettings}
        onFormat={() => editorRef.current?.format()}
        isOwner={collab.isOwner}
        readOnly={collab.readOnly}
        onToggleReadOnly={collab.setReadOnly}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          users={collab.users}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebar}
          onCloseMobile={() => setMobileSidebar(false)}
          onFollow={handleFollow}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <EditorPane
              ref={editorRef}
              yText={collab.yText}
              provider={collab.provider}
              language={collab.language}
              theme={theme}
              readOnly={collab.readOnly && !collab.isOwner}
              fontSize={settings.fontSize}
              tabSize={settings.tabSize}
              wordWrap={settings.wordWrap}
              minimap={settings.minimap}
              onRun={handleRun}
              onDownload={handleDownload}
              onTyping={handleTyping}
              onCursor={handleCursor}
            />
          </div>

          <BottomPanel
            result={result}
            running={running}
            stdin={stdin}
            onStdinChange={setStdin}
            onClearOutput={() => {
              setResult(null);
              setSharedBy(null);
            }}
            onShareOutput={handleShareOutput}
            sharedBy={sharedBy}
            messages={collab.chat}
            onSendChat={collab.sendChat}
            selfName={identity.name}
            unread={unread}
            onChatOpened={() => {
              chatOpenRef.current = true;
              setUnread(0);
            }}
          />
        </main>
      </div>
    </div>
  );
}
