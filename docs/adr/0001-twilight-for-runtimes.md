# Twilight for Runtimes

The platform runs many independent Runtimes (one per Bot), so per-process memory overhead is a critical cost driver. We chose **twilight** over serenity and discord.js because its modular crate design lets us compile only what each Runtime needs (gateway + HTTP + model), omitting cache, command frameworks, and voice when unused. This keeps the RSS per process at roughly 8–15 MB versus 18–30 MB+ in the alternatives. The explicit shard model also fits our single-bot-per-process architecture better than serenity's opinionated Client/ShardManager abstraction.

## Considered Options

- **discord.js** — rejected: Node.js runtime footprint (~80–150 MB per process) is too high for a freemium multi-tenant platform.
- **serenity** — rejected: while mature, its batteries-included design (cache enabled by default, unified Client, built-in command framework) inflates per-process memory and couples concepts we need to keep separate.
- **twilight** — accepted: modular, low-level control, smaller per-process footprint, designed for operators running many shards.
