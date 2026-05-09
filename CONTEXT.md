# Bot Builder Platform

A platform that allows non-programmers to create and operate Discord bots through a visual dashboard.

## Language

**User**:
A person who registers on the platform to create and manage Discord bots.
_Avoid_: Account, client

**Bot**:
The declarative configuration created by a User in the visual dashboard that defines how a Discord bot should behave.
_Avoid_: App, project, bot instance

**Runtime**:
The live process connected to Discord that executes a Bot's configuration and responds to events.
_Avoid_: Worker, instance, container, server

**Orchestrator**:
The service responsible for managing Runtimes — starting, stopping, and restarting them in response to Bot lifecycle events.
_Avoid_: Manager, scheduler, supervisor

## Relationships

- A **User** owns many **Bots**
- A **Bot** belongs to exactly one **User**
- A **Bot** may have zero or one active **Runtime** at any given time
- A **Runtime** executes exactly one **Bot**
- A **Runtime** loads the **Bot**'s configuration and interprets it to respond to Discord events
- An **Orchestrator** manages many **Runtimes** on a single host, each in its own Docker container

## Configuration

- A **Bot**'s declarative configuration is stored as JSONB in the primary database (Postgres).
- A **Runtime** fetches its **Bot**'s configuration from the Backend via HTTP on startup.
- When a **User** edits a **Bot**'s configuration, the active **Runtime** is restarted by the Orchestrator so the new configuration is picked up cleanly.

## DSL (MVP)

The visual dashboard generates a declarative JSON configuration describing event triggers and sequential actions.

**Supported events:**
- `message_create` — a message is sent in a channel (optional filters: contains keyword, starts with prefix)
- `slash_command` — a slash command defined by the Bot is invoked (parameters optional)
- `member_join` — a user joins a guild

**Supported actions (executed sequentially):**
- `send_message` — reply in the same channel
- `send_dm` — send a direct message to the user
- `add_role` — assign a role to the user
- `remove_role` — remove a role from the user
- `call_webhook` — perform an HTTP GET/POST to an external URL

**Error handling:**
Each action has an optional `on_error` field (`"continue"` or `"stop"`). `"stop"` halts the action chain; `"continue"` proceeds to the next action. Defaults to `"stop"` if omitted.

**Error handling:**
Each action has an optional `on_error` field (`"continue"` or `"stop"`). `"stop"` halts the action chain; `"continue"` proceeds to the next action. Defaults to `"stop"` if omitted.

**Variables:**
Basic placeholders are supported: `{user}`, `{guild}`, `{channel}`. Advanced templating (e.g., nested results from `call_webhook`) is deferred to v2.

**Example configuration:**
```json
{
  "triggers": [
    {
      "event": "message_create",
      "filters": { "prefix": "!hola" },
      "actions": [
        { "type": "send_message", "content": "¡Hola, {user}!" }
      ]
    },
    {
      "event": "slash_command",
      "command": "clima",
      "parameters": [
        { "name": "ciudad", "type": "string", "required": true }
      ],
      "actions": [
        { "type": "send_message", "content": "Consultando clima para {ciudad}..." }
      ]
    },
    {
      "event": "member_join",
      "actions": [
        { "type": "send_dm", "content": "Bienvenido al servidor, {user}!" },
        { "type": "add_role", "role_id": "123456789", "on_error": "continue" }
      ]
    }
  ]
}
```

## Example dialogue

> **Dev:** "When a **User** creates a **Bot**, do we immediately spin up a **Runtime**?"
> **Domain expert:** "No — the **Runtime** only starts when the **User** explicitly enables the **Bot** in the dashboard."

> **Dev:** "If a **User** changes a command while the **Runtime** is running, does the change apply instantly?"
> **Domain expert:** "The Orchestrator notices the change and restarts the **Runtime** with the new configuration — no hot-reload inside the process."

> **Dev:** "Who registers the slash commands with Discord?"
> **Domain expert:** "The **Runtime** does it on startup. It reads the DSL, finds any `slash_command` triggers, and registers them via Discord's HTTP API before connecting to the Gateway."

> **Dev:** "How does the **Runtime** know which messages to respond to?"
> **Domain expert:** "It receives all events via the Gateway and filters them in-memory based on the DSL triggers. Discord doesn't pre-filter for us."

## Flagged ambiguities

- "bot" was used to mean both the visual configuration and the live Discord connection — resolved: **Bot** is the configuration; **Runtime** is the live process.

## Repository Structure

- Single hybrid monorepo with both JavaScript/TypeScript and Rust codebases.
- Monorepo orchestrated by **Turborepo**; JavaScript package manager is **Bun**.
- `apps/web/` — TanStack Start dashboard (`@disbot/web`)
- `apps/api/` — Hono backend API (`@disbot/api`)
- `apps/orchestrator/` — Rust orchestrator service (`@disbot/orchestrator`)
- `apps/runtime/` — Rust runtime service (`@disbot/runtime`)
- `packages/shared/` — Zod schemas and shared types (`@disbot/shared`), organized in three subpaths: `dsl` (Bot configuration schemas), `api` (HTTP request/response schemas), and `types` (pure TypeScript types and constants)
- `packages/typescript-config/` — Shared TypeScript configurations (`@disbot/typescript-config`)
- `packages/database/` — Postgres schema, Drizzle ORM client, and migrations (`@disbot/database`)
- Rust crates live under `apps/` but each includes a minimal `package.json` so Turborepo can orchestrate builds alongside the JS packages.
- Each deployable service includes its own `Dockerfile` for production builds.
- Internal packages use explicit `exports` subpaths where the package spans multiple domains (`packages/shared/dsl`, `packages/shared/schemas`, etc.) to avoid barrel-file overhead. Small cohesive packages (`packages/database`) may use a single barrel export.
- Testing follows native conventions per ecosystem: co-located `*.test.ts` files in JS/TS packages; `#[cfg(test)]` modules inside `src/` and a top-level `tests/` directory for integration tests in Rust crates.
- A Cargo workspace at the repository root groups Rust crates. Shared Rust code (Bot DSL models, NATS message types) lives in `crates/shared/` so that both `orchestrator` and `runtime` depend on a single source of truth.
- The Bot DSL is defined as **Zod schemas** in `packages/shared/` and exported to JSON Schema. Rust structs in `crates/shared/` are generated from that JSON Schema via `typify` to ensure a single source of truth. Generated Rust files are committed; a `generate:rust-types` script regenerates them on demand, and CI verifies they remain synchronized.
- **Biome** is used for linting and formatting across all JavaScript/TypeScript packages.
- `turbo.json` at root defines tasks (`build`, `dev`, `lint`, `typecheck`, `test`) with dependency graphs (`^build`) so that workspace packages build in the correct order.
- `docker-compose.yml` at root for local development and production deployment.
- Local development uses Docker Compose **only** for stateful infrastructure (Postgres, Redis, NATS). Application services (`web`, `api`, `orchestrator`) run natively via `turbo dev` for optimal DX and fast hot-reload. The Orchestrator connects to the host Docker socket to spawn Runtime containers.
- A single `.env` file at the repository root provides all environment variables for Docker Compose and native applications. A committed `.env.example` serves as the documented template.
- `apps/web` (TanStack Start) communicates with `apps/api` (Hono) exclusively via HTTP. The `apps/api` service is the sole backend and the only service that interacts with the database and message queue directly.
- `apps/web` resolves the backend URL via an `API_URL` environment variable (e.g., `http://localhost:3000` in development), used by Server Functions to call `apps/api`.
- Production deployment is handled by **Dokploy** using a root `docker-compose.yml`. Dokploy manages Traefik routing and TLS automatically via its UI; no manual Traefik labels are included in the compose file. Services expose ports internally (`expose:`) so Dokploy can route domains to them.
- Development uses a separate `docker-compose.dev.yml` that runs only the stateful infrastructure (Postgres, Redis, NATS). Application services run natively via `turbo dev`.

---

## Configuration Delivery

- An **Orchestrator** subscribes to a message queue for lifecycle events (`StartBot`, `StopBot`, `RestartBot`) published by the **Backend**.
- The **Orchestrator** starts, stops, and restarts **Runtimes** in response to those events.
- When a **Runtime** starts, it receives a `BOT_ID` and a short-lived `RUNTIME_TOKEN` (JWT) via environment variables.
- The **Runtime** authenticates with the **Backend** via HTTPS using the JWT and fetches its **Bot**'s declarative configuration and Discord token.
- The Discord token is never stored in environment variables or logs.
- **Runtime** containers connect to the Docker Compose internal network to communicate securely with the **Backend** API.

## Infrastructure

- The MVP runs on a **single VPS**.
- The **Backend**, database, message queue, **Orchestrator**, and all **Runtimes** coexist on that host.
- All services are deployed via **Docker Compose**.
- Each **Runtime** runs in its own Docker container for isolation and resource metering.
- **Runtimes** have resource limits (memory, CPU) enforced by Docker cgroups.
- The **Orchestrator** creates, starts, stops, and destroys Runtime containers via the Docker API.
- The **Orchestrator** applies restart policies with exponential backoff: up to 3 attempts within 5 minutes for unexpected exits; OOM kills are retried once; clean exits (code 0) are not restarted. After repeated failures the Bot is marked `error`.
- **Runtime** resource limits (memory and CPU) are configured per tier in the database and enforced by Docker cgroups when the Orchestrator creates each container.
- Runtime and Orchestrator containers use **debian:bookworm-slim** as the base image for the MVP.
- Migration to multi-host is deferred until the platform exceeds ~1,500 active Bots or requires high-availability guarantees.

## Authentication

- **Users** authenticate with **username**, **email**, and **password** via the webapp.
- Sessions are stored in **Redis** as HTTP-only cookies.
- The **Backend** validates sessions against Redis for every request.
- Discord Bot Tokens are encrypted at rest with **AES-256-GCM** using a master key stored in an environment variable.
- The Orchestrator and Runtime never store the master key; the Backend decrypts the token and transmits it to the Runtime over the internal Docker network.

## Rate Limiting

- Platform-level rate limits protect the shared VPS IP from Discord Cloudflare bans. All Runtimes share the host's public IP; if one Bot spams, all Bots are at risk.
- Each Runtime consults **Redis** before executing actions (`send_message`, `send_dm`, `call_webhook`, `add_role`, `remove_role`) to check per-Bot quotas.
- Limits are **configurable per tier** (free vs paid) in the database.
- If a Bot exceeds its limit, the action is skipped, a warning is logged, and the Bot is marked `rate_limited`. Repeated violations result in automatic suspension.
- The **Backend** also enforces rate limits on its own endpoints: login (5/min/IP), registration (3/hr/IP), bot creation (5/hr/user), and telemetry ingestion.

## Observability

- Observability is **internal only** — no third-party services (Sentry, Datadog, etc.).
- Each **Runtime** emits structured logs to stdout/stderr, captured by Docker.
- The Orchestrator exposes recent logs via the Docker API for display in the dashboard.
- Backend errors are captured by middleware and stored in the database.
- Frontend errors are sent to the Backend via `POST /api/telemetry/errors` and stored in the database.
- Docker log rotation is configured to prevent disk exhaustion.
- Advanced metrics (RAM/CPU per bot, request latency dashboards) are deferred to Phase 2.

## Message Queue

- The **Backend** publishes lifecycle events (`StartBot`, `StopBot`, `RestartBot`) to **NATS + JetStream**.
- The **Orchestrator** subscribes via queue group for automatic load distribution.
- NATS runs inside a Docker container with a persistent volume for JetStream logs.
- Messages include `bot_id`, `user_id`, and `timestamp` for audit purposes.
- Messages expire after 1 hour (TTL) to prevent stale operations.
