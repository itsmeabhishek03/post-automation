# ─────────────────────────────────────────────────────────────
# Dockerfile — AI Content Automation
# ─────────────────────────────────────────────────────────────
# Multi-stage build:
#   Stage 1 (deps)   — installs only production dependencies
#   Stage 2 (runner) — copies source + deps, runs as non-root
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Install production dependencies ──────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only the files needed to resolve dependencies first
# (leverages Docker layer caching — rebuild only on package changes)
COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: Production runner ────────────────────────────────
FROM node:20-alpine AS runner

# Security: set timezone so cron "10 AM" refers to a known zone
ENV TZ=UTC
ENV NODE_ENV=production

WORKDIR /app

# Create a non-root user to run the application
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy production deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# The generated posts directory must be writable by the app user.
# It will be mounted as a Docker volume in production so data persists.
RUN mkdir -p src/data/generated-posts && \
    chown -R appuser:appgroup /app

USER appuser

# Expose the Express port (default 5000, overridable via env)
EXPOSE 5000

# Healthcheck — Docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
