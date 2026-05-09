# Agent Instructions

## Package Manager & Monorepo

- **Package manager:** Bun (`bun.lock`). Always use `bun install`, `bun run`, etc. Never use `npm`, `pnpm`, or `yarn`.
- **Monorepo:** Turborepo + Bun workspaces (`apps/*`, `packages/*`).
- **Root scripts:** `bun run build`, `bun run dev`, `bun run lint`, `bun run typecheck`, `bun run test` delegate to `turbo run <task>`.

## Domain Language

See `CONTEXT.md` for strict terminology:

- **User** — platform user (avoid "account", "client")
- **Bot** — declarative configuration (avoid "app", "project")
- **Runtime** — live Discord process (avoid "worker", "instance", "server")
- **Orchestrator** — container manager (avoid "manager", "scheduler")

# Rules

1. Never commit directly to `main`. Always create an issue first, then work through a pull request (PR).
2. Always ask for approval before making major changes or pushing anything to the remote repository.
3. Always write documentation, variable names, comments, and code-related content in English.
4. Follow the Conventional Commits specification for commit messages.
5. Branch names and pull request titles must be clear, descriptive, and easy to understand.
6. Issue titles must be written in natural language. Do not use Conventional Commit format for issues. Conventional Commits are allowed only for commits and pull request titles.

## Conventional Commits Examples

Use these prefixes for **commits and PR titles only**. Never include issue numbers in the title; put `Closes #<n>` in the PR body instead.

| Type | Example |
|------|---------|
| `feat` | `feat: add runtime health-check endpoint` |
| `fix` | `fix: resolve CORS failure on API health endpoint` |
| `refactor` | `refactor: extract health schema to shared package` |
| `docs` | `docs: add ADR for NATS message broker` |
| `test` | `test: cover runtime state machine with unit tests` |
| `chore` | `chore: update Biome config to v2` |
| `build` | `build: add multi-stage Dockerfile for web` |
| `ci` | `ci: add GitHub Actions lint and test workflow` |
