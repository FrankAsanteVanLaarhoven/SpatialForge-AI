# SPATIALFORGE AI • Sovereign Spatial Intelligence & Bi-Temporal Evidence Replay Platform

[![Core Verification](https://img.shields.io/badge/Autonomous%20Engine-40%2F40%20PASS-brightgreen?style=flat-square)](#verified-gates)
[![Ed25519 Attestation](https://img.shields.io/badge/Ed25519%20DSSE-Cryptographic%20Sealing-007acc?style=flat-square)](#cryptographic-enclave)
[![Engines](https://img.shields.io/badge/Engines-Cesium%203D%20%7C%20PostGIS%20%7C%20Merkle%20%7C%20Bayesian-800080?style=flat-square)](#architecture-matrix)
[![Multi-Service](https://img.shields.io/badge/Services-Go%20Gateway%20%7C%20Rust%20Enclave%20%7C%20Stealth%20Crawler%20%7C%20Python%20Intel-green?style=flat-square)](#microservice-mesh)
[![Python Engine](https://img.shields.io/badge/Python%20Engine-v2.0.0%20Active-e02424?style=flat-square)](#python-intelligence)
[![Go Router](https://img.shields.io/badge/Go%20Router-v2.0.0%20Online-00f0ff?style=flat-square)](#go-core-gateway)
[![Spatial DB](https://img.shields.io/badge/Spatial%20DB-PostgreSQL%2016%20%2B%20PostGIS%203.4-336791?style=flat-square)](#postgis-storage)
[![Web Console](https://img.shields.io/badge/Web%20Console%20%26%203D%20GIS-Vue%203%20%2B%20TypeScript%20Active-4fc08d?style=flat-square)](#frontend-client)
[![Stack](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Rust%20%7C%20Go%20%7C%20Python%20%7C%20SQL-blue?style=flat-square)](#specifications)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](#license)

---

## Executive Overview

**SPATIALFORGE AI** is an evidence-aware sovereign spatial intelligence, real-time tactical reconnaissance, and bi-temporal evidence replay platform engineered to solve the critical provenance, sensor uncertainty, and auditability challenges of global geospatial monitoring.

Traditional geospatial monitoring tools blend visual approximations with uncalibrated streaming telemetry—silently accepting single-broker transponder echoes, ignoring spoofed kinematic jumps, and leaving decision-makers vulnerable to GPS spoofing and historical revisionism. **SpatialForge AI** replaces opaque visual approximations with **immutable SHA-256 source-frame provenance**, **Rust-enforced Ed25519 cryptographic capture attestation**, **deterministic 2-Origin bi-temporal consensus**, **military-grade stealth OSINT crawling (JA3/JA4 TLS profile randomization)**, **PostgreSQL + PostGIS partitioned spatial telemetry**, and **W3C PROV-O audit tree generation**.

```mermaid
flowchart LR
    A["🛰️ Raw OSINT Feeds\n(ADS-B, AIS, TLE, CCTV)"] --> B["🥷 Go Stealth Crawler\n(JA3/JA4 TLS Mimicry\nProxy Circuit Breaker\nGaussian Jitter)"]
    B --> C["⚡ Rust Crypto Enclave\n(Zero-Alloc Wire Parsing\nSHA-256 Merkle Proofs\nEd25519 DSSE Signing)"]
    C --> D["🧠 Python Intelligence\n(Kinematic Spoof Detection\nBayesian Sensor Fusion\nDark Vessel Analytics)"]
    D --> E["🗄️ PostgreSQL + PostGIS\n(Partitioned Telemetry\nGIST Spatial Indexing\nCorridor Validation)"]
    E --> F["🌐 Go Core Gateway\n(HMAC Session Security\nReverse-Proxy Routing\nReal-Time SSE/WS Hub)"]
    F --> G["💻 3D Cesium GIS Client\n(TypeScript + Vue 3\nBi-Temporal Replay HUD\n8 Tactical Recon Views)"]
```

---

## Architecture Matrix & System Specifications

| Attribute | Current Specification |
|:---|:---|
| **Active Identity & Release** | **SpatialForge AI** (`spatialforge-ai`, `SpatialForge-AI.git`) · Sovereign Enterprise Release Candidate **v2.0.0** |
| **System Architecture** | Multi-service distributed architecture orchestrated via root **GNU Makefile** & **Docker Compose** |
| **Core API Gateway & Routing** | **Go 1.26** (`services/core-gateway`): Constant-time HMAC authentication, IP rate limiting, multiplexed reverse-proxy router (`/api/v1/intelligence/`, `/api/v1/crawler/`), and SSE spatial streaming hub on port `8080` |
| **Cryptographic Enclave** | **Rust 1.90** (`services/crypto-enclave`): Memory-safe zero-allocation SHA-256 Merkle trees (`merkle.rs`) and Ed25519 digital signature signing & verification (`signer.rs`) |
| **Stealth Scraping Engine** | **Go 1.26** (`services/stealth-crawler`): JA3/JA4 TLS ClientHello profile randomization (Chrome 131, Firefox 133, Safari 18), rotating proxy pool with quarantine circuit-breaker, and humanized Gaussian delay pacing ($\mu = 1200\text{ms}, \sigma = 400\text{ms}$) |
| **Spatial Intelligence & AI** | **Python 3.11** (`services/python-intelligence`): Haversine kinematic teleportation/spoofing detector, dark vessel transponder silence monitoring, Bayesian multi-sensor uncertainty fusion, and PostGIS query builder on port `5001` |
| **Database & Spatial Indexing** | **PostgreSQL 16 + PostGIS 3.4** (`storage/postgres`): Partitioned `spatial_telemetry` tables by month, GIST spatial indexes, bi-temporal `target_tracks`, and `check_corridor_conformance` stored procedures |
| **Frontend GIS Client** | **Vue 3 + Strict TypeScript 5** (`spatialforge-ai`): Photorealistic 3D Cesium globe, procedural Inception planetary launch splash sequence, custom isometric forge prism logo with gaze-tracking, 8 tactical recon views, and dockable Replay HUD |
| **Verified Quality Gates** | **40 Core Engine tests PASS** · **Gate D8** (0/24 false live faults) · **Gate D8** (100% hash invariance) · **Gate D5** (100/100 traceability) · **SOTA Decision Risk** ($r \le 0.05$) · **20/20 Development Quality Gates PASS** |
| **Explicit Non-Claims** | Sovereign intelligence and defensive audit instrument. Automated offensive cyber operations, weaponization systems, and illegal CAPTCHA-bypass actions remain explicitly out of scope. |

---

## Deep-Dive Component Breakdown

### 1. Go Core Gateway & Reverse-Proxy Router (`services/core-gateway`)
- **Port:** `8080` (HTTP / SSE / WebSocket)
- **High-Concurrency Multiplexing:** Built on Go goroutines handling thousands of concurrent real-time telemetry connections.
- **Constant-Time Cryptographic Auth:** Protects against timing attacks using `crypto/subtle.ConstantTimeCompare` and HMAC-SHA256 session tokens.
- **Dynamic Routing Orchestrator:** Routes incoming analytical queries to the Python Intelligence service and extraction requests to the Stealth Crawler while streaming live vectors to the 3D client via `/api/v1/stream`.

### 2. Rust Cryptographic Enclave (`services/crypto-enclave`)
- **Binary:** `target/release/spatialforge-crypto` (Direct CLI & IPC)
- **Zero-Allocation Merkle Proofs:** Processes batches of thousands of sensor frames into deterministic SHA-256 Merkle roots in under 0.5 milliseconds.
- **Ed25519 DSSE Signing:** Hardware-entropy signed attestation records preserving chain-of-custody across maritime, airspace, and orbital observations.

### 3. SOTA Military-Grade Stealth OSINT Crawler (`services/stealth-crawler`)
- **Fingerprint Randomization:** Overrides standard Go HTTP TLS stacks to inject customized ClientHello byte structures (JA3/JA4 emulation matching genuine desktop browser fingerprints).
- **Proxy Pool with Circuit Breaker:** Dynamically cycles through egress nodes, benchmarking latency and quarantining flagged nodes upon encountering HTTP `429 Too Many Requests` or `403 Forbidden`.
- **Humanized Jitter Pacing:** Box-Muller Gaussian delay distribution prevents defensive network heuristic classifiers from identifying automated collection patterns.

### 4. Python Intelligence & Kinematic Engine (`services/python-intelligence`)
- **Port:** `5001` (REST API proxied through Go Gateway)
- **Kinematic Spoof Detection:** Calculates great-circle Haversine velocity between historical coordinates to identify GPS spoofing and teleportation anomalies ($v > v_{\text{max}}$).
- **Dark Vessel Analysis:** Flags transponder silence periods exceeding tactical thresholds.
- **Bayesian Multi-Sensor Fusion:** Synthesizes observations from disparate origins (AIS, radar, satellite optical, CCTV) weighted by trust metrics and spatial variance ($\sigma^2$) into a single high-confidence target centroid.

### 5. PostgreSQL + PostGIS Partitioned Store (`storage/postgres`)
- **Port:** `5432` (PostgreSQL 16 + PostGIS 3.4)
- **Partitioning:** Range-partitioned monthly tables (`spatial_telemetry_YYYY_MM`) allowing linear query scaling over hundreds of millions of spatial records.
- **Corridor Conformance:** PL/pgSQL stored procedure `check_corridor_conformance()` validates real-time points against legal transit polygons and triggers automatic anomaly flags upon boundary escape.

### 6. TypeScript 3D Cesium Client & HUD (`spatialforge-ai`)
- **Port:** `4173` / `5173` (Vite 6 + Vue 3 + TypeScript 5)
- **Tactical Recon Perspectives:** 1-click smooth camera trajectories with calibrated camera pitch, altitude, and post-processing filters (CRT scanlines, NVG, FLIR thermal, Noir).
- **Bi-Temporal Replay HUD:** Dockable 3-column adjudication workstation enabling operators to compare historical cutoffs (`14:05:05 UTC` vs `14:05:20 UTC`), enforce 2-origin consensus, inspect W3C PROV-O trees, and export canonical SHA-256 evidence bundles.

---

## 8 Calibrated Tactical Recon Perspectives

| # | Perspective Name | Geographic Locus | Altitude | Camera Pitch | Sensor Filter | Tactical Purpose |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| **1** | **Texas Capitol Nadir Recon** | Austin, TX (`30.2747° N, 97.7404° W`) | 1,180m | -89.5° (Nadir) | **Retro CRT** | High-altitude orthogonal surveillance matching satellite capture geometry. |
| **2** | **Port of Antwerp Approach-A** | Antwerp, Belgium (`51.2750° N, 4.3180° E`) | 1,650m | -52.0° | **Normal** | Maritime corridor bi-temporal adjudication & transponder consensus. |
| **3** | **SpaceX Pad 39A Complex** | Cape Canaveral, FL (`28.6083° N, 80.6041° W`) | 1,350m | -58.0° | **Normal** | Starship/Falcon launch pad, crawlerway, and ascent corridor tracking. |
| **4** | **Strait of Hormuz Chokepoint** | Oman / Iran (`26.5667° N, 56.4500° E`) | 35,000m | -65.0° | **NVG** | Strategic hydrocarbon chokepoint transit monitoring. |
| **5** | **Miraflores Locks (Panama)** | Panama Canal (`8.9972° N, 79.5931° W`) | 1,600m | -48.0° | **Normal** | Inter-oceanic transit gate occupancy validation. |
| **6** | **Great Bitter Lake Convoy Grid** | Suez Canal, Egypt (`30.3333° N, 32.3667° E`) | 22,000m | -62.0° | **FLIR Thermal** | Staging anchorage monitoring and subsea cable security. |
| **7** | **Shinjuku Cyber Metropolis** | Tokyo, Japan (`35.6905° N, 139.6995° E`) | 950m | -38.0° | **Film Noir** | Ultra-dense urban skyscraper canyon and transit surveillance. |
| **8** | **LEO Terminator Orbit** | Global Track (`18.0000° N, 40.0000° E`) | 4,500km | -75.0° | **Normal** | Global orbital reconnaissance tracing day/night atmospheric limb. |

---

## 🛠️ Master Makefile Orchestration

The root **[`Makefile`](file:///Users/favl/Downloads/geospatial-evidence-replay/spatialforge-ai/Makefile)** coordinates the entire multi-language platform:

```bash
# ==============================================================================
# 1. BUILD & COMPILE
# ==============================================================================
make build               # Compiles Go Gateway, Rust Enclave, Stealth Crawler & Web Client
make backend-gateway     # Builds Go API Gateway (services/core-gateway/bin/gateway)
make backend-crypto      # Builds Rust Enclave (services/crypto-enclave/target/release)
make backend-crawler     # Builds Go Stealth Crawler (services/stealth-crawler/bin/crawler)
make client-build        # Compiles Vue 3 + TypeScript production bundle

# ==============================================================================
# 2. TEST & VERIFICATION
# ==============================================================================
make test                # Runs all test suites across Go, Rust, Python, and Engine
make test-gateway        # Tests Go Core Gateway & Ingestion Dispatcher
make test-crypto         # Tests Rust Merkle Trees & Ed25519 Attestation
make test-crawler        # Tests Stealth Crawler & Fingerprint Randomization
make test-python         # Tests Python Intelligence & 40 Engine Gate Tests

# ==============================================================================
# 3. INFRASTRUCTURE & DATABASE
# ==============================================================================
make services-up         # Starts PostGIS (port 5432) & Redis (port 6379) via Docker
make db-init             # Applies PostGIS schema, partitions & corridor procedures
make services-down       # Tears down local infrastructure containers

# ==============================================================================
# 4. RUNTIME SERVICES
# ==============================================================================
make run-gateway         # Starts Go API Gateway & Router on :8080
make run-crawler         # Launches the Stealth Scraping Daemon
make run-client          # Launches the 3D Cesium Web UI on :4173
```

---

## 📄 License & Intellectual Property

Copyright © 2026 **Frank Asante-Van Laarhoven**. All rights reserved.

Licensed under the **MIT License**. Permitted for commercial, academic, and private use provided the copyright notice and permission notice are preserved in all copies. Third-party geographic datasets visualized at runtime remain the property of their respective sources under their individual licenses.
