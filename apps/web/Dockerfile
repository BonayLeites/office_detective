FROM node:20-bookworm-slim AS deps

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS builder

WORKDIR /app
RUN corepack enable

COPY --from=deps /app ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @office-detective/web build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
RUN corepack enable

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @office-detective/web exec next start -H 0.0.0.0 -p 3000"]
