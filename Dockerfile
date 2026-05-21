#### Stage 1: Install dependencies ####
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set minimum-release-age 0
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema and generate client for production node_modules
COPY prisma ./prisma
RUN npx prisma generate

#### Stage 2: Build ####
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set minimum-release-age 0
RUN pnpm install --frozen-lockfile

COPY . .

# Generate Prisma client (with Alpine target)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

#### Stage 3: Production runner ####
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy production node_modules (this now includes the generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and migrations (needed for migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Data directory (will be volume-mounted)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
