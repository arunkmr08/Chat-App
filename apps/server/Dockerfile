# Multi-stage build for production API server

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy all apps and packages
COPY apps/server ./apps/server
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build server
RUN pnpm --filter @zoai/server build

# Stage 2: Production
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy server package.json
COPY apps/server/package.json ./apps/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built server from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy migration files
COPY infra/migrations ./infra/migrations

WORKDIR /app/apps/server

# Expose port
EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "pnpm run migrate && node dist/index.js"]
