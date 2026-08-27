# syntax=docker/dockerfile:1

# ---- deps: install production dependencies only ----
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- runtime ----
FROM oven/bun:1-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src

USER bun
EXPOSE 3000

CMD ["bun", "src/index.ts"]
