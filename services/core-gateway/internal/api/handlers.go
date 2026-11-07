package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/core-gateway/internal/dispatcher"
)

type APIHandler struct {
	Dispatcher *dispatcher.IngestionDispatcher
}

func NewAPIHandler(d *dispatcher.IngestionDispatcher) *APIHandler {
	return &APIHandler{Dispatcher: d}
}

func (h *APIHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":      "HEALTHY",
		"service":     "spatialforge-core-gateway",
		"version":     "2.0.0",
		"security":    "military-grade mTLS/HMAC enabled",
		"system_time": time.Now().UTC().Format(time.RFC3339Nano),
	})
}

func (h *APIHandler) IngestTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var frame dispatcher.TelemetryFrame
	if err := json.NewDecoder(r.Body).Decode(&frame); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	ingested, err := h.Dispatcher.IngestFrame(frame)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ingested)
}

func (h *APIHandler) ReplayAdjudication(w http.ResponseWriter, r *http.Request) {
	targetID := r.URL.Query().Get("target_id")
	cutoffStr := r.URL.Query().Get("cutoff")

	if targetID == "" {
		http.Error(w, "target_id query param is required", http.StatusBadRequest)
		return
	}

	cutoff := time.Now().UTC()
	if cutoffStr != "" {
		parsed, err := time.Parse(time.RFC3339, cutoffStr)
		if err != nil {
			http.Error(w, "invalid cutoff format (RFC3339 expected): "+err.Error(), http.StatusBadRequest)
			return
		}
		cutoff = parsed
	}

	verdict := h.Dispatcher.EvaluateBiTemporalConsensus(targetID, cutoff, 10*time.Second)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(verdict)
}
