# Stage 1: Install dependencies
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y python3 make g++ openssl libsqlite3-dev
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Rebuild the source code only when needed
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y openssl libsqlite3-0 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a system user and group
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --create-home nextjs

# Set up directory structure and permissions
RUN mkdir -p .next public/uploads prisma/data && chown -R nextjs:nodejs /app

# Copy all the necessary files for the application
# Copy full node_modules first to ensure prisma CLI is available for entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
# Copy standalone output which will include pruned node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy other assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
