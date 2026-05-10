FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/runtime/package.json ./apps/runtime/
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api
RUN bun install --frozen-lockfile

FROM base AS release
COPY --from=install /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "start"]
