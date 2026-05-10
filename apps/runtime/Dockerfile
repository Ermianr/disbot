FROM rust:1-bookworm AS builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps/orchestrator ./apps/orchestrator
COPY apps/runtime ./apps/runtime
RUN cargo build --release -p disbot-runtime

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /usr/src/app/target/release/disbot-runtime /usr/local/bin/disbot-runtime
CMD ["disbot-runtime"]
