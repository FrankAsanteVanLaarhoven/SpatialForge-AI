# Contributing to SpatialForge AI

Welcome to **SpatialForge AI**. We welcome contributions to enhance our sovereign spatial intelligence and geospatial evidence replay platform.

## Development Setup

```bash
git clone https://github.com/FrankAsanteVanLaarhoven/SpatialForge-AI.git
cd SpatialForge-AI
npm install
npm run dev
```

Open `http://localhost:4173/` to view the 3D Cesium intelligence platform.

## Verification Engine

Before submitting changes, ensure all 40 autonomous verification unit tests pass:

```bash
cd engine
python3 -m unittest -v
```

## Guidelines

* Follow the quality gate specifications in `DEVELOPMENT_QUALITY.md`.
* Ensure new features preserve deterministic bi-temporal cutoff replay invariance.
* Code contributions must adhere to clean architecture and OGC / W3C standards.
