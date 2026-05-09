# TanStack Start for the Dashboard

We chose **TanStack Start** (currently in Release Candidate) for the web application (homepage, login, register, and visual dashboard). It provides fullstack React with SSR, Server Functions (type-safe RPCs), and streaming — ideal for the bot builder experience. The Backend API for Runtimes remains separate (Hono) to ensure high availability and a clean separation between the web layer and the bot orchestration layer.

## Considered Options

- **React + Vite SPA** — rejected: while stable, it lacks the fullstack type-safe RPCs and SSR that TanStack Start provides out of the box.
- **Next.js** — rejected: more opinionated (App Router, RSC), heavier bundle, and less transparent server/client split.
- **TanStack Start** — accepted: built on TanStack Router + Vite, less magic than Next.js, excellent type-safe routing, and a natural fit for a visual dashboard that needs both client interactivity and server-side data loading.
