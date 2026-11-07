# syntax=docker/dockerfile:1
FROM rust:1.80-alpine AS builder

RUN apk add --no-cache musl-dev
WORKDIR /app

COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/spatialforge-crypto /app/spatialforge-crypto

ENTRYPOINT ["/app/spatialforge-crypto"]
