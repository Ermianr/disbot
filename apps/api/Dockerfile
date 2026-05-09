FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile

FROM base AS release
COPY --from=install /usr/src/app/node_modules node_modules
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/typescript-config ./packages/typescript-config
COPY package.json ./
WORKDIR /usr/src/app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
