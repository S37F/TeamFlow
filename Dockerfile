# Production Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 teamflow

# Create logs directory
RUN mkdir -p /app/logs && chown -R teamflow:nodejs /app/logs

# Copy built application
COPY --from=builder --chown=teamflow:nodejs /app/dist ./dist
COPY --from=builder --chown=teamflow:nodejs /app/package.json ./package.json
COPY --from=builder --chown=teamflow:nodejs /app/package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

USER teamflow

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/index.cjs"]
