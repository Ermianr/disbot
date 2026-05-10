FROM rust:1-bookworm AS builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps/orchestrator ./apps/orchestrator
COPY apps/runtime ./apps/runtime
RUN cargo build --release -p disbot-orchestrator

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /usr/src/app/target/release/disbot-orchestrator /usr/local/bin/disbot-orchestrator
CMD ["disbot-orchestrator"]
