# Syntax: docker/dockerfile:1
# Dijalankan dari root directory: docker build -f apps/api/Dockerfile .

# ---- Base Node ----
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Builder ----
FROM base AS builder
# Set working directory di dalam container
WORKDIR /app
# Gunakan turbo untuk memotong workspace menjadi versi yang lebih ringan untuk api
RUN npm i -g turbo
COPY . .
RUN turbo prune api --docker

# ---- Installer ----
FROM base AS installer
WORKDIR /app
# Install dependencies
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Copy kode yang sudah dipangkas
COPY --from=builder /app/out/full/ .

# Generate Prisma Client & Build
WORKDIR /app/apps/api
RUN pnpm prisma generate
WORKDIR /app
RUN pnpm turbo run build --filter=api...

# ---- Runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only (jika perlu) tapi kita akan copy /node_modules dari installer
COPY --from=installer /app . 

EXPOSE 4000

# Start up command
WORKDIR /app/apps/api
CMD ["pnpm", "start:prod"]
