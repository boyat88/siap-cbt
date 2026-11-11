# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build the frontend (Vite -> dist/)
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# Only production runtime deps are needed; reuse node_modules from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.cjs ./server.cjs
COPY --from=build /app/package.json ./package.json

# Persistent data directory (mount a volume here in production)
RUN mkdir -p /app/server-data
VOLUME ["/app/server-data"]

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/state >/dev/null 2>&1 || exit 1

CMD ["node", "server.cjs"]