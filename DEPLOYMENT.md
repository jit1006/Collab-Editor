# Deployment Guide

This repository contains a full-stack real-time collaborative code editor built with:
- **Frontend**: React + Vite + Monaco Editor + Yjs + Socket.IO client
- **Backend**: Express + Yjs WebSockets (`y-websocket`) + Socket.IO + Judge0 / Piston execution proxy

The server serves the compiled static frontend bundle directly when `client/dist` is present, allowing you to deploy the entire application (web app + WebSockets + execution proxy) as a **single service on one port**.

---

## 🚀 Option 1: Deploying on Render (Recommended - Free & Instant)

Render natively supports multi-stage Docker builds and WebSockets out of the box.

1. Push your repository to GitHub / GitLab.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Select **Docker** as the Runtime.
5. Set Environment Variables (optional, sensible defaults applied):
   - `PORT`: `3001`
   - `EXECUTION_PROVIDER`: `judge0`
   - `JUDGE0_URL`: `https://ce.judge0.com`
6. Click **Create Web Service**. Render will automatically build the container and deploy your live app!

---

## 🚂 Option 2: Deploying on Railway

1. Push your repository to GitHub.
2. Go to [Railway](https://railway.app/) and create a **New Project** -> **Deploy from GitHub repo**.
3. Select this repository. Railway will detect the `Dockerfile` automatically.
4. Set Environment Variables under **Variables**:
   - `PORT`: `3001`
   - `EXECUTION_PROVIDER`: `judge0`
   - `JUDGE0_URL`: `https://ce.judge0.com`
5. Generate a public domain under **Settings** -> **Networking** -> **Generate Domain**.

---

## 🐳 Option 3: Deploying with Docker (Self-Hosted / VPS / DigitalOcean)

Run locally or on any server with Docker installed:

```bash
# Build the Docker image
docker build -t collab-editor .

# Run the container on port 3001
docker run -d -p 3001:3001 --name collab-editor collab-editor
```

Open `http://localhost:3001` in your browser.

---

## 💻 Option 4: Manual Deployment (Node.js Server)

On a VPS (Ubuntu / Debian / EC2):

```bash
# 1. Install dependencies and build
npm run install:all
npm run build

# 2. Start production server (serves frontend + WebSockets + backend API)
npm start
```

You can run `npm start` with a process manager like **pm2**:

```bash
npm install -g pm2
pm2 start server/dist/index.js --name "collab-editor"
```

---

## 🌐 Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP & WebSocket server port |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origins |
| `EXECUTION_PROVIDER` | `judge0` | Execution engine (`judge0` or `piston`) |
| `JUDGE0_URL` | `https://ce.judge0.com` | Judge0 API endpoint URL |
| `JUDGE0_API_KEY` | *(empty)* | Optional API Key for RapidAPI or protected Judge0 |
| `PISTON_URL` | `https://emkc.org/api/v2/piston` | Piston API URL (used if `EXECUTION_PROVIDER=piston`) |
| `PERSIST` | *(disabled)* | Set to `1` to enable LevelDB Yjs room persistence |
| `LEVELDB_DIR` | `./.leveldb` | Directory for LevelDB state storage |
