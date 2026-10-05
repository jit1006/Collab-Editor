import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  ConnectionStatus,
  Identity,
  RoomUser,
} from "../types";
import { DEFAULT_LANGUAGE_ID } from "../lib/languages";
import { messageId } from "../lib/ids";

/** Build the ws base url for the Yjs provider from the current origin or env var. */
function yjsBaseUrl(): string {
  const customWs = import.meta.env.VITE_WS_URL;
  if (customWs) return `${customWs.replace(/\/$/, "")}/yjs`;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/yjs`;
}

export interface Collaboration {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  socket: Socket | null;
  /** Shared code text. */
  yText: Y.Text;
  /** Shared room config map: { language, readOnly, ownerId }. */
  roomConfig: Y.Map<unknown>;
  users: RoomUser[];
  onlineCount: number;
  status: ConnectionStatus;
  language: string;
  readOnly: boolean;
  isOwner: boolean;
  setLanguage: (id: string) => void;
  setReadOnly: (v: boolean) => void;
  /** Update local awareness (cursor/typing). */
  setAwarenessField: (field: "cursor" | "typing", value: unknown) => void;
  chat: ChatMessage[];
  sendChat: (text: string) => void;
  shareOutput: (payload: unknown) => void;
  onSharedOutput: (cb: (payload: unknown) => void) => () => void;
  onUserEvent: (cb: (e: { type: "joined" | "left"; name: string }) => void) => () => void;
}

/**
 * Owns all collaboration state for a room: the Yjs document + websocket provider +
 * awareness, and the Socket.IO connection for chat/presence events. Cleans everything
 * up on unmount. Pass `identity` once the name gate is cleared (null before that).
 */
export function useCollaboration(
  roomId: string,
  identity: Identity | null,
): Collaboration {
  // Create the doc once per room.
  const doc = useMemo(() => new Y.Doc(), [roomId]);
  const yText = useMemo(() => doc.getText("monaco"), [doc]);
  const roomConfig = useMemo(() => doc.getMap("roomConfig"), [doc]);

  // Destroy the doc when the room changes / component unmounts.
  useEffect(() => {
    return () => doc.destroy();
  }, [doc]);

  const providerRef = useRef<WebsocketProvider | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Mirrored in state so consumers (EditorPane) re-render once the provider exists.
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const sharedOutputCbs = useRef(new Set<(p: unknown) => void>());
  const userEventCbs = useRef(
    new Set<(e: { type: "joined" | "left"; name: string }) => void>(),
  );

  const [status, setStatus] = useState<ConnectionStatus>("reconnecting");
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE_ID);
  const [readOnly, setReadOnlyState] = useState<boolean>(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  // --- Yjs provider lifecycle (starts only after identity is confirmed) ---
  useEffect(() => {
    if (!identity) return;

    const provider = new WebsocketProvider(yjsBaseUrl(), roomId, doc, {
      connect: true,
    });
    providerRef.current = provider;
    setProvider(provider);

    // Set local awareness identity.
    provider.awareness.setLocalStateField("user", {
      name: identity.name,
      color: identity.color,
    });
    provider.awareness.setLocalStateField("typing", false);
    provider.awareness.setLocalStateField("cursor", null);

    // Claim ownership if nobody owns the room yet (first user in).
    const claimOwnership = () => {
      if (!roomConfig.get("ownerId")) {
        roomConfig.set("ownerId", String(provider.awareness.clientID));
      }
      setIsOwner(
        roomConfig.get("ownerId") === String(provider.awareness.clientID),
      );
    };

    // Connection status mapping.
    const onStatus = (e: { status: "connected" | "disconnected" | "connecting" }) => {
      setStatus(
        e.status === "connected"
          ? "connected"
          : e.status === "connecting"
            ? "reconnecting"
            : "offline",
      );
      if (e.status === "connected") {
        // Give sync a tick before claiming ownership.
        setTimeout(claimOwnership, 300);
      }
    };
    provider.on("status", onStatus);

    const onOnline = () => setStatus("reconnecting");
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // --- Awareness → users list ---
    const rebuildUsers = () => {
      const states = provider.awareness.getStates();
      const list: RoomUser[] = [];
      states.forEach((state, clientId) => {
        const user = (state as { user?: { name: string; color: string } }).user;
        if (!user) return;
        list.push({
          clientId,
          name: user.name,
          color: user.color,
          typing: Boolean((state as { typing?: boolean }).typing),
          cursor:
            ((state as { cursor?: RoomUser["cursor"] }).cursor as RoomUser["cursor"]) ??
            null,
          isSelf: clientId === provider.awareness.clientID,
        });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(list);
    };
    provider.awareness.on("change", rebuildUsers);

    // --- roomConfig (language / readOnly) sync ---
    const applyConfig = () => {
      const lang = roomConfig.get("language");
      if (typeof lang === "string") setLanguageState(lang);
      setReadOnlyState(Boolean(roomConfig.get("readOnly")));
      setIsOwner(
        roomConfig.get("ownerId") === String(provider.awareness.clientID),
      );
    };
    roomConfig.observe(applyConfig);
    applyConfig();

    return () => {
      provider.off("status", onStatus);
      provider.awareness.off("change", rebuildUsers);
      roomConfig.unobserve(applyConfig);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      provider.destroy();
      providerRef.current = null;
      setProvider(null);
    };
    // doc/roomConfig/yText are stable for a given roomId
  }, [roomId, identity, doc, roomConfig]);

  // --- Socket.IO lifecycle (chat / presence) ---
  useEffect(() => {
    if (!identity) return;
    const serverUrl = import.meta.env.VITE_SERVER_URL || undefined;
    const socket = io(serverUrl, { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => {
      socket.emit(
        "join",
        { roomId, name: identity.name, color: identity.color },
        () => {},
      );
    });

    socket.on("chat", (msg: ChatMessage) => {
      setChat((prev) => [...prev, msg]);
    });

    socket.on("user-joined", ({ name }: { name: string }) => {
      userEventCbs.current.forEach((cb) => cb({ type: "joined", name }));
    });
    socket.on("user-left", ({ name }: { name: string }) => {
      userEventCbs.current.forEach((cb) => cb({ type: "left", name }));
    });
    socket.on("shared-output", (payload: unknown) => {
      sharedOutputCbs.current.forEach((cb) => cb(payload));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [roomId, identity]);

  // --- Public API ---
  const setLanguage = useCallback(
    (id: string) => {
      roomConfig.set("language", id);
      setLanguageState(id);
    },
    [roomConfig],
  );

  const setReadOnly = useCallback(
    (v: boolean) => {
      roomConfig.set("readOnly", v);
      setReadOnlyState(v);
    },
    [roomConfig],
  );

  const setAwarenessField = useCallback(
    (field: "cursor" | "typing", value: unknown) => {
      providerRef.current?.awareness.setLocalStateField(field, value);
    },
    [],
  );

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !identity || !socketRef.current) return;
      const msg: ChatMessage = {
        id: messageId(),
        name: identity.name,
        color: identity.color,
        text: trimmed,
        ts: Date.now(),
      };
      socketRef.current.emit("chat", msg);
    },
    [identity],
  );

  const shareOutput = useCallback((payload: unknown) => {
    socketRef.current?.emit("share-output", payload);
  }, []);

  const onSharedOutput = useCallback((cb: (p: unknown) => void) => {
    sharedOutputCbs.current.add(cb);
    return () => sharedOutputCbs.current.delete(cb);
  }, []);

  const onUserEvent = useCallback(
    (cb: (e: { type: "joined" | "left"; name: string }) => void) => {
      userEventCbs.current.add(cb);
      return () => userEventCbs.current.delete(cb);
    },
    [],
  );

  return {
    doc,
    provider,
    socket,
    yText,
    roomConfig,
    users,
    onlineCount: users.length,
    status,
    language,
    readOnly,
    isOwner,
    setLanguage,
    setReadOnly,
    setAwarenessField,
    chat,
    sendChat,
    shareOutput,
    onSharedOutput,
    onUserEvent,
  };
}
