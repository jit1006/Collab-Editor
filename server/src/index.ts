/**
 * Server entrypoint.
 *
 * Boots an Express HTTP server that hosts:
 *   - GET  /health          health check
 *   - GET  /api/languages   available language definitions
 *   - POST /api/execute     Judge0 / Piston execution proxy
 *   - WS   /yjs/<roomId>     Yjs document sync (y-websocket protocol)
 *   - Socket.IO             chat / presence / room events
 *   - Static Files          client SPA (when client/dist exists)
 *
 * All services share a single HTTP server so one port serves everything in production.
 */

import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { Server as SocketIOServer } from "socket.io";

import { handleExecute } from "./execute.js";
import { setupWSConnection } from "./yjs.js";
import { registerSocketHandlers } from "./socket.js";
import { LANGUAGES } from "./languages.js";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Expose the language registry for client or API callers.
app.get("/api/languages", (_req, res) => {
  res.json(LANGUAGES);
});

app.post("/api/execute", handleExecute);

// Serve static client files when client/dist exists (production single-port deployment)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

if (fs.existsSync(clientDistPath)) {
  console.log(`[server] Serving static client from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io") || req.path.startsWith("/yjs")) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const httpServer = createServer(app);

// --- Socket.IO (chat / presence) ---
const io = new SocketIOServer(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
  path: "/socket.io",
});
registerSocketHandlers(io);

// --- Yjs WebSocket server ---
// We use noServer mode and route the HTTP "upgrade" event ourselves so Socket.IO and the
// Yjs WS server can coexist on the same port.
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, request) => {
  // Room name is the path after /yjs/, defaulting to "default".
  const url = (request.url ?? "/").split("?")[0];
  const roomId = decodeURIComponent(url.replace(/^\/yjs\/?/, "")) || "default";
  setupWSConnection(ws, roomId);
});

httpServer.on("upgrade", (request, socket, head) => {
  const { url } = request;
  // Let Socket.IO handle its own upgrade path.
  if (url && url.startsWith("/socket.io")) return;
  if (url && url.startsWith("/yjs")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] yjs ws:   ws://localhost:${PORT}/yjs/<roomId>`);
  console.log(`[server] socket.io at /socket.io`);
});
