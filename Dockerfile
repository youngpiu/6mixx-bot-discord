# ============================================
# Base image
# ============================================
FROM node:22-alpine AS base

# Prisma engines on Alpine commonly require OpenSSL + CA certificates.
RUN apk add --no-cache openssl ca-certificates

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build application
# ============================================
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN pnpm exec prisma generate --config ./prisma.config.ts

# Build TypeScript
RUN pnpm build

# ============================================
# Stage 3: Migration runner
# ============================================
FROM base AS migration

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma

# Generate Prisma client for seed/migrate commands
RUN pnpm exec prisma generate --config ./prisma.config.ts

CMD ["pnpm", "exec", "prisma", "migrate", "deploy", "--config", "./prisma.config.ts"]

# ============================================
# Stage 4: Production runtime
# ============================================
FROM base AS production

# Security: run as non-root
RUN addgroup --system --gid 1001 botgroup && \
    adduser --system --uid 1001 botuser

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated

# Keep Prisma schema/config for runtime Prisma client compatibility.
COPY prisma ./prisma
COPY prisma.config.ts ./

# Set ownership
RUN chown -R botuser:botgroup /app

USER botuser

ENV NODE_ENV=production

CMD ["node", "dist/src/index.js"]
