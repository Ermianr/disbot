# Docker Container per Runtime

Every **Runtime** executes inside its own Docker container. The **Orchestrator** uses the Docker Engine API (via `bollard`) to create, start, stop, and destroy containers dynamically. Each container has hard resource limits (memory, CPU) enforced by cgroups, giving us precise metrics per Bot and strong isolation between free-tier and paid-tier users.

## Considered Options

- **Native processes in a single container** — rejected: no hard isolation; a misbehaving free-tier Bot could trigger the OOM killer and crash the Orchestrator or paid-tier Bots.
- **cgroups v2 inside the container** — rejected: requires `--privileged` and `--cgroupns=host`, which is complex and often blocked by PaaS platforms.
- **Systemd inside Docker** — rejected: heavy overhead, requires privileged mode, anti-pattern for this use case.
- **Docker container per Runtime** — accepted: hard isolation via cgroups, native metrics via `docker stats`, compatible with Docker Compose and most PaaS platforms that expose the Docker socket.
