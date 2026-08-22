# Syntax: docker/dockerfile:1
# Dijalankan dari root directory: docker build -f apps/web/Dockerfile .

# ---- Base Node ----
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Builder ----
FROM base AS builder
WORKDIR /app
RUN npm i -g turbo
COPY . .
RUN turbo prune web --docker

# ---- Installer ----
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .

# Build Web (Next.js)
RUN pnpm turbo run build --filter=web...

# ---- Runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output
# Copy public assets
COPY --from=installer /app/apps/web/public ./apps/web/public

# Copy built artifacts (Pastikan output: 'standalone' aktif di next.config.mjs)
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Command Next.js standalone
CMD ["node", "apps/web/server.js"]
