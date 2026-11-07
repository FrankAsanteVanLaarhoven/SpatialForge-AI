# 🌐 SpatialForge AI — Sovereign Spatial Intelligence Platform

**SpatialForge AI** is a sovereign spatial intelligence, real-time tactical reconnaissance, and bi-temporal geospatial evidence replay platform. It combines a high-fidelity 3D Cesium planetary visualization client with an enterprise-grade multi-service backend powered by **TypeScript**, **Rust**, **Go**, **Python**, and **PostgreSQL + PostGIS**.

![SpatialForge AI](public/logo.svg)

---

## 🏛️ Modern Sovereign Platform Architecture

SpatialForge AI is built as a high-performance, modular sovereign architecture:

```
spatialforge-platform/
├── Makefile                               # Unified build, test, and container orchestrator
├── docker-compose.yml                     # Local PostGIS 16 + Redis telemetry stack
│
├── services/
│   ├── core-gateway/                      # [Go 1.26] Sovereign API Gateway, Session Security & Reverse Proxy Router
│   │   ├── cmd/server/main.go             # High-throughput multiplexer (:8080)
│   │   ├── internal/auth/                 # Constant-time token verification, HMAC-SHA256, IP rate limiting
│   │   ├── internal/dispatcher/           # Ingestion hashing, bi-temporal consensus, and event fan-out
│   │   ├── internal/websocket/            # Real-time SSE/WebSocket spatial streaming hub
│   │   └── internal/api/router.go         # Dynamic reverse-proxy routing & microservice topology
│   │
│   ├── crypto-enclave/                    # [Rust 1.90] Memory-Safe Cryptographic Attestation Enclave
│   │   ├── src/merkle.rs                  # Zero-allocation SHA-256 Merkle root & proof calculation
│   │   ├── src/signer.rs                  # Ed25519 keypair generation, bundle signing, and verification
│   │   └── src/main.rs                    # Fast CLI & IPC attestation binary (spatialforge-crypto)
│   │
│   ├── stealth-crawler/                   # [Go 1.26] Military-Grade Stealth OSINT Ingestion Engine
│   │   ├── internal/fingerprint/          # JA3/JA4 TLS handshake randomization & browser mimicry
│   │   ├── internal/proxy/                # Rotating proxy pool with latency scoring & quarantine circuit breaker
│   │   ├── internal/throttle/             # Humanized pacing via Gaussian jitter distribution
│   │   └── internal/collector/            # Stealth ADS-B OpenSky & maritime AIS ingestion
│   │
│   └── python-intelligence/               # [Python 3.11] Advanced Spatial Analytics & ML
│       ├── engine/trajectory_anomaly.py   # Kinematic spoofing & dark vessel transponder gap detection
│       ├── engine/sensor_fusion.py        # Bayesian/Kalman multi-origin uncertainty fusion
│       └── engine/db_postgis.py           # PostgreSQL/PostGIS spatial geometry query & write builder
│
├── storage/
│   └── postgres/init_postgis.sql          # Partitioned telemetry tables, GIST indices & corridor procedures
│
└── spatialforge-ai/                       # [Vue 3 + TypeScript + Cesium 3D] Modernized Sovereign Client
    ├── tsconfig.json                      # Strict TypeScript compiler configuration
    └── src/types/
        ├── evidence.ts                    # W3C PROV-O, bi-temporal cutoffs, and SHA-256 evidence bundles
        ├── routing.ts                     # Gateway routing contracts & microservice endpoint schemas
        ├── spatial.ts                     # 3D Cartesian coordinates, corridor polygons & tactical views
        └── telemetry.ts                   # AIS, ADS-B, and anomaly report schemas
```

---

## 🚀 Key Capabilities

* **TypeScript Enterprise Client:** Strict type safety across all evidence bundles, spatial coordinates, and telemetry vectors.
* **Rust Cryptographic Enclave:** Sub-millisecond zero-allocation SHA-256 Merkle proofs and Ed25519 signature attestation.
* **Go Core Gateway & Router:** Reverse-proxies `/api/v1/intelligence/` and `/api/v1/crawler/`, enforces constant-time HMAC security, and broadcasts real-time SSE streams to 3D Cesium.
* **Military-Grade Stealth Crawler:** Rotates realistic TLS ClientHello profiles (Chrome 131, Firefox 133, Safari 18) with JA3/JA4 emulation, Gaussian jitter pacing, and proxy circuit-breakers for stealth OSINT collection.
* **PostgreSQL + PostGIS:** Partitioned high-throughput spatial telemetry tables with GIST geometry indices, corridor crossing procedures, and bi-temporal historical tables.
* **8 Unique Tactical Recon Perspectives:** Texas Capitol Nadir Recon (Austin, TX), Port of Antwerp Approach-A, SpaceX Pad 39A Launch Complex, Strait of Hormuz Chokepoint, Miraflores Locks, Great Bitter Lake Convoy Grid, Shinjuku Cyber Metropolis, and LEO Terminator.

---

## 🛠️ Master Makefile Orchestration

```bash
# Build all Go, Rust, and TypeScript binaries
make build

# Run all test suites across Go, Rust, Python, and Engine
make test

# Start local PostgreSQL (PostGIS) and Redis services via Docker
make services-up

# Initialize PostGIS schema, partitions, and stored procedures
make db-init

# Start the Go API Gateway and reverse-proxy router (:8080)
make run-gateway

# Launch the Military-Grade Stealth Scraping Engine
make run-crawler

# Launch the 3D Cesium Web UI (:4173)
make run-client
```

---

## 📄 License & Sovereignty

Authored and maintained by **Frank Asante-Van Laarhoven**. Released under the MIT License.
