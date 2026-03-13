FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Production build
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Ensure runtime-writable paths for non-root user
RUN mkdir -p /app/.data && chown -R bun:bun /app

USER bun
CMD ["bun", "run", "src/index.ts"]
