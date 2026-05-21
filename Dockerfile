#### Stage 1: Build ####
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set minimum-release-age 0
RUN pnpm install --frozen-lockfile

COPY . .

# Generate Prisma client (with Alpine/musl target)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Prepare a minimal Prisma CLI bundle for runtime migrations.
# Resolves pnpm symlinks (-L) so Docker COPY gets real files.
RUN mkdir -p /prisma-cli && cp -rL node_modules/prisma /prisma-cli/prisma

#### Stage 2: Production runner ####
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built app (standalone includes only the necessary dependencies)
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Copy Prisma schema and migrations (needed for migrate deploy)
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./

# Copy Prisma CLI from builder (avoids ~300MB global install)
COPY --from=builder --chown=node:node /prisma-cli/prisma ./node_modules/prisma

# Entrypoint
COPY --chown=node:node entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Data directory (will be volume-mounted)
RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
