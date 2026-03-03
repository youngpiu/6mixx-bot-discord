# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build application
# ============================================
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN pnpm exec prisma generate --config ./prisma.config.ts

# Build TypeScript
RUN pnpm build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Security: run as non-root
RUN addgroup --system --gid 1001 botgroup && \
    adduser --system --uid 1001 botuser

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated

# Copy Prisma schema (needed at runtime for migrations)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Set ownership
RUN chown -R botuser:botgroup /app

USER botuser

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
