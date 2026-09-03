# Frontend Dockerfile - Multi-stage build
# Stage 1: Build the React/Vite app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install dependencies (including dev deps for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./frontend/

# Build the frontend
RUN npm run build --workspace frontend

# Stage 2: Serve with nginx
FROM nginx:alpine AS runner

# Copy built assets from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]