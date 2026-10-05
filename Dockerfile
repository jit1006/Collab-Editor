# Multi-stage Dockerfile for Production Deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies for build
RUN npm run install:all

# Copy source files
COPY . .

# Build both server (TypeScript) and client (Vite bundle)
RUN npm run build

# Production image stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copy package descriptors
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install production dependencies for server
RUN npm install --omit=dev --prefix server

# Copy built server and client artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

CMD ["npm", "start"]
