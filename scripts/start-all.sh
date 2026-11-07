#!/usr/bin/env bash
# ==============================================================================
# SpatialForge AI • All-In-One Sovereign Multi-Service Launcher
# Orchestrates Go Core Gateway (8080), Python Intelligence (5001), and Vite 3D Client (4173)
# ==============================================================================

set -eo pipefail

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}"
echo "================================================================================"
echo "   SPATIALFORGE AI • SOVEREIGN SPATIAL INTELLIGENCE & RECONNAISSANCE PLATFORM   "
echo "================================================================================"
echo -e "${RESET}"

# Cleanup on exit
PIDS=()
cleanup() {
  echo -e "\n${YELLOW}[SpatialForge] Shutting down all platform services...${RESET}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}[SpatialForge] All services stopped cleanly.${RESET}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Python Intelligence Engine (Port 5001)
echo -e "${CYAN}[1/3] Starting Python Intelligence & Kinematics Engine (:5001)...${RESET}"
if command -v python3 &>/dev/null; then
  python3 services/python-intelligence/server.py &
  PIDS+=($!)
  echo -e "${GREEN}✓ Python Intelligence active (PID: ${PIDS[-1]})${RESET}"
else
  echo -e "${YELLOW}Warning: python3 not found, skipping Python Intelligence service.${RESET}"
fi

# 2. Build and Start Go Core API Gateway (Port 8080)
echo -e "${CYAN}[2/3] Starting Go Core Gateway & Reverse-Proxy Router (:8080)...${RESET}"
if command -v go &>/dev/null; then
  (cd services/core-gateway && go run cmd/server/main.go) &
  PIDS+=($!)
  echo -e "${GREEN}✓ Go Core Gateway active (PID: ${PIDS[-1]})${RESET}"
else
  echo -e "${YELLOW}Warning: go not found, skipping Go Gateway service.${RESET}"
fi

# 3. Start 3D Cesium GIS Frontend (Port 4173)
echo -e "${CYAN}[3/3] Starting SpatialForge 3D Cesium Client (:4173)...${RESET}"
echo -e "${GREEN}================================================================================${RESET}"
echo -e "${GREEN}   SpatialForge 3D Web Console:     http://localhost:4173/                      ${RESET}"
echo -e "${GREEN}   Go Core Gateway API:             http://localhost:8080/                      ${RESET}"
echo -e "${GREEN}   Python Kinematics Intelligence:  http://localhost:5001/                      ${RESET}"
echo -e "${GREEN}   Rust Cryptographic Enclave:      services/crypto-enclave/target/release/     ${RESET}"
echo -e "${GREEN}================================================================================${RESET}"

npm run dev
