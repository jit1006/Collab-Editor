import { useCallback, useRef, useState, type ReactNode } from "react";
import type { ChatMessage, ExecuteResponse } from "../types";
import { OutputPanel } from "./OutputPanel";
import { Chat } from "./Chat";

type Tab = "output" | "chat";

interface BottomPanelProps {
  // Output
  result: ExecuteResponse | null;
  running: boolean;
  stdin: string;
  onStdinChange: (v: string) => void;
  onClearOutput: () => void;
  onShareOutput: () => void;
  sharedBy: string | null;
  // Chat
  messages: ChatMessage[];
  onSendChat: (text: string) => void;
  selfName: string;
  /** Count of unread chat messages while the chat tab is inactive. */
  unread: number;
  onChatOpened: () => void;
}

/**
 * Resizable bottom panel with Output / Input (stdin lives inside Output) / Chat tabs.
 * Drag the top edge to resize.
 */
export function BottomPanel(props: BottomPanelProps) {
  const [tab, setTab] = useState<Tab>("output");
  const [height, setHeight] = useState(240);
  const dragging = useRef(false);

  const startResize = useCallback(() => {
    dragging.current = true;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Resize relative to viewport bottom; clamp to sensible bounds.
      const next = window.innerHeight - e.clientY;
      setHeight(Math.min(Math.max(next, 120), window.innerHeight - 160));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const openChat = () => {
    setTab("chat");
    props.onChatOpened();
  };

  return (
    <div
      className="flex flex-col border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        className="h-1.5 w-full cursor-row-resize bg-slate-200 dark:bg-slate-700 hover:bg-blue-400"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel"
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700" role="tablist">
        <TabButton active={tab === "output"} onClick={() => setTab("output")} id="tab-output">
          Output
        </TabButton>
        <TabButton active={tab === "chat"} onClick={openChat} id="tab-chat">
          Chat
          {props.unread > 0 && tab !== "chat" && (
            <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {props.unread}
            </span>
          )}
        </TabButton>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "output" ? (
          <OutputPanel
            result={props.result}
            running={props.running}
            stdin={props.stdin}
            onStdinChange={props.onStdinChange}
            onClear={props.onClearOutput}
            onShare={props.onShareOutput}
            sharedBy={props.sharedBy}
          />
        ) : (
          <Chat
            messages={props.messages}
            onSend={props.onSendChat}
            selfName={props.selfName}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  id,
  children,
}: {
  active: boolean;
  onClick: () => void;
  id: string;
  children: ReactNode;
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
