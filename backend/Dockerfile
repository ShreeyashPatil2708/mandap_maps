# Backend Dockerfile - Node.js/Express API
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Stage 1: Install dependencies (production only)
FROM base AS deps

# Copy package files for workspace
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

# Install production dependencies only (hoisted to root node_modules)
RUN npm ci --omit=dev --workspaces --include-workspace-root

# Stage 2: Build (copy source code)
FROM base AS builder

# Copy installed dependencies (hoisted to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY backend/ ./backend/
COPY package.json ./package.json

# Stage 3: Runner - minimal runtime image
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application (dependencies hoisted to root)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "backend/src/index.js"]