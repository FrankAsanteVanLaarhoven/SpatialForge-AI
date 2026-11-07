# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod ./
# Download dependencies if any
RUN go mod download || true

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/core-gateway .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/core-gateway /app/core-gateway

EXPOSE 8080
ENV PORT=8080
CMD ["/app/core-gateway"]

