/**
 * Minimal y-websocket-protocol server.
 *
 * Implements the same wire protocol the browser `y-websocket` provider speaks:
 *   messageSync (0)      -> sync protocol (step1/step2/update)
 *   messageAwareness (1) -> awareness protocol (presence, cursors)
 *
 * One shared Y.Doc per room name (the WS url path, e.g. /yjs/<roomId>). State is kept in
 * memory; optional y-leveldb persistence can be enabled with PERSIST=1.
 *
 * This mirrors the reference implementation shipped in `y-websocket/bin/utils` but is
 * written explicitly here so the whole server is strongly typed and dependency-light.
 */

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import type { WebSocket } from "ws";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** Optional LevelDB persistence provider, loaded lazily when PERSIST=1. */
type Persistence = {
  bindState: (docName: string, doc: Y.Doc) => Promise<void>;
  writeState: (docName: string, doc: Y.Doc) => Promise<void>;
} | null;

let persistence: Persistence = null;
if (process.env.PERSIST === "1") {
  // Dynamically import so y-leveldb is optional at runtime.
  import("y-leveldb")
    .then(({ LeveldbPersistence }) => {
      const ldb = new LeveldbPersistence(
        process.env.LEVELDB_DIR ?? "./.leveldb",
      );
      persistence = {
        bindState: async (docName, doc) => {
          const persisted = await ldb.getYDoc(docName);
          const update = Y.encodeStateAsUpdate(persisted);
          Y.applyUpdate(doc, update);
          doc.on("update", (u: Uint8Array) => {
            ldb.storeUpdate(docName, u);
          });
        },
        writeState: async () => {
          /* updates are stored incrementally above */
        },
      };
      console.log("[yjs] LevelDB persistence enabled");
    })
    .catch((e) => console.warn("[yjs] persistence disabled:", e.message));
}

/** A room is a Y.Doc plus its awareness and the set of connected sockets. */
class WSSharedDoc extends Y.Doc {
  name: string;
  conns = new Map<WebSocket, Set<number>>();
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    // Relay awareness changes to all connected clients.
    this.awareness.on(
      "update",
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        const changed = added.concat(updated, removed);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          enc,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
        );
        const buf = encoding.toUint8Array(enc);
        this.conns.forEach((_, conn) => send(this, conn, buf));
      },
    );

    // Relay document updates to all connected clients.
    this.on("update", (update: Uint8Array, origin: unknown) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const buf = encoding.toUint8Array(enc);
      this.conns.forEach((_, conn) => {
        if (conn !== origin) send(this, conn, buf);
      });
    });
  }
}

const docs = new Map<string, WSSharedDoc>();

function getYDoc(docName: string): WSSharedDoc {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new WSSharedDoc(docName);
    if (persistence) void persistence.bindState(docName, doc);
    docs.set(docName, doc);
  }
  return doc;
}

/** ws readyState value for an open socket. */
const WS_OPEN = 1;

function send(doc: WSSharedDoc, conn: WebSocket, message: Uint8Array): void {
  if (conn.readyState !== WS_OPEN) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(message, (err) => {
      if (err) closeConn(doc, conn);
    });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc: WSSharedDoc, conn: WebSocket): void {
  const controlled = doc.conns.get(conn);
  if (controlled) {
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlled),
      null,
    );
  }
  conn.close();
}

/**
 * Wire a freshly-accepted WebSocket into its room doc.
 * `docName` is derived from the request URL path.
 */
export function setupWSConnection(conn: WebSocket, docName: string): void {
  conn.binaryType = "arraybuffer";
  const doc = getYDoc(docName);
  doc.conns.set(conn, new Set());

  conn.on("message", (message: ArrayBuffer | Buffer) => {
    try {
      const data = new Uint8Array(
        message instanceof ArrayBuffer ? message : (message as Buffer),
      );
      const decoder = decoding.createDecoder(data);
      const encoder = encoding.createEncoder();
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          if (encoding.length(encoder) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder));
          }
          break;
        }
        case MESSAGE_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            conn,
          );
          break;
        }
      }
    } catch (err) {
      console.error("[yjs] message error", err);
    }
  });

  conn.on("close", () => closeConn(doc, conn));

  // Heartbeat to detect dead connections.
  let alive = true;
  conn.on("pong", () => {
    alive = true;
  });
  const interval = setInterval(() => {
    if (!alive) {
      closeConn(doc, conn);
      clearInterval(interval);
      return;
    }
    alive = false;
    try {
      conn.ping();
    } catch {
      closeConn(doc, conn);
      clearInterval(interval);
    }
  }, 30_000);
  conn.on("close", () => clearInterval(interval));

  // Step 1: send our state vector so the client can compute a diff.
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
  }

  // Send current awareness states to the newcomer.
  const states = doc.awareness.getStates();
  if (states.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        doc.awareness,
        Array.from(states.keys()),
      ),
    );
    send(doc, conn, encoding.toUint8Array(encoder));
  }
}
