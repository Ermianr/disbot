FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/runtime/package.json ./apps/runtime/
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY packages/typescript-config ./packages/typescript-config
COPY apps/web ./apps/web
RUN bun install --frozen-lockfile

FROM install AS build
ENV NODE_ENV=production
WORKDIR /usr/src/app/apps/web
RUN bun run build
WORKDIR /usr/src/app

FROM oven/bun:1-slim AS release
WORKDIR /usr/src/app
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/web ./apps/web
COPY --from=install /usr/src/app/packages ./packages
COPY package.json ./
WORKDIR /usr/src/app/apps/web
ENV NODE_ENV=production
EXPOSE 3001
CMD ["bun", "run", "start"]
