#### Stage 1: Build ####
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

#### Stage 2: Production runner ####
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Prisma globally to run migrations without massive node_modules.
# We also clean the npm cache immediately to save space.
RUN npm install -g prisma@7.8.0 && npm cache clean --force

# Copy built app (standalone includes only the necessary dependencies)
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Copy Prisma schema and migrations (needed for migrate deploy)
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./

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
