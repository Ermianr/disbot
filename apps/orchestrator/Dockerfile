FROM rust:1-bookworm AS builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps/orchestrator ./apps/orchestrator
COPY apps/runtime ./apps/runtime
RUN cargo build --release --locked -p disbot-orchestrator

FROM debian:bookworm-slim AS runtime
RUN groupadd --system app && useradd --system --gid app --home /app app
WORKDIR /app
COPY --from=builder --chown=app:app /usr/src/app/target/release/disbot-orchestrator /usr/local/bin/disbot-orchestrator
USER app
CMD ["disbot-orchestrator"]
