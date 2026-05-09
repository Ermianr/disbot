FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=install /usr/src/app/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build --filter=web

FROM oven/bun:1-slim AS release
WORKDIR /usr/src/app
COPY --from=install /usr/src/app/node_modules node_modules
COPY --from=build /usr/src/app/apps/web/dist ./apps/web/dist
COPY apps/web/package.json ./apps/web/
COPY package.json ./
WORKDIR /usr/src/app/apps/web
ENV NODE_ENV=production
EXPOSE 3001
CMD ["bun", "run", "start"]
