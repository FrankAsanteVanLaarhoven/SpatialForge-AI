package dispatcher

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

type TelemetryFrame struct {
	ID             string    `json:"id"`
	TargetID       string    `json:"target_id"`
	SensorID       string    `json:"sensor_id"`
	RootOrigin     string    `json:"root_origin"`
	CaptureTime    time.Time `json:"capture_time"`
	IngestionTime  time.Time `json:"ingestion_time"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	AltitudeM      float64   `json:"altitude_m"`
	SpeedKnots     float64   `json:"speed_knots"`
	HeadingDeg     float64   `json:"heading_deg"`
	Confidence     float64   `json:"confidence"`
	WirePayloadHex string    `json:"wire_payload_hex"`
	HashSHA256     string    `json:"hash_sha256"`
}

type ConsensusVerdict struct {
	CaseURN        string           `json:"case_urn"`
	CutoffTime     time.Time        `json:"cutoff_time"`
	ActiveOrigins  int              `json:"active_origins"`
	RequiredOrigin int              `json:"required_origins"`
	Adjudication   string           `json:"adjudication"` // "ADMITTED", "INSUFFICIENT"
	AdmittedFrames []TelemetryFrame `json:"admitted_frames"`
	BundleHash     string           `json:"bundle_hash"`
}

type IngestionDispatcher struct {
	framesStore map[string][]TelemetryFrame // target_id -> frames
	mu          sync.RWMutex
}

func NewIngestionDispatcher() *IngestionDispatcher {
	return &IngestionDispatcher{
		framesStore: make(map[string][]TelemetryFrame),
	}
}

// IngestFrame validates, hashes, and stores the incoming spatial observation
func (d *IngestionDispatcher) IngestFrame(frame TelemetryFrame) (TelemetryFrame, error) {
	if frame.TargetID == "" || frame.SensorID == "" {
		return frame, fmt.Errorf("target_id and sensor_id are required")
	}

	if frame.IngestionTime.IsZero() {
		frame.IngestionTime = time.Now().UTC()
	}

	// Compute deterministic SHA-256 hash of the frame
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("%s:%s:%s:%d:%.6f:%.6f",
		frame.TargetID,
		frame.SensorID,
		frame.RootOrigin,
		frame.CaptureTime.UnixNano(),
		frame.Latitude,
		frame.Longitude,
	)))
	frame.HashSHA256 = hex.EncodeToString(hasher.Sum(nil))

	d.mu.Lock()
	d.framesStore[frame.TargetID] = append(d.framesStore[frame.TargetID], frame)
	d.mu.Unlock()

	return frame, nil
}

// EvaluateBiTemporalConsensus adjudicates target state at a specific historical cutoff
func (d *IngestionDispatcher) EvaluateBiTemporalConsensus(targetID string, cutoff time.Time, maxAge time.Duration) ConsensusVerdict {
	d.mu.RLock()
	allFrames := d.framesStore[targetID]
	d.mu.RUnlock()

	var admitted []TelemetryFrame
	originsSeen := make(map[string]bool)

	for _, f := range allFrames {
		// Bi-temporal condition: observation must have been captured AND ingested before or at cutoff
		if f.CaptureTime.After(cutoff) || f.IngestionTime.After(cutoff) {
			continue
		}
		// Tolerance check
		if cutoff.Sub(f.CaptureTime) > maxAge {
			continue
		}

		admitted = append(admitted, f)
		originsSeen[f.RootOrigin] = true
	}

	distinctOrigins := len(originsSeen)
	status := "INSUFFICIENT"
	if distinctOrigins >= 2 {
		status = "ADMITTED"
	}

	// Compute canonical bundle SHA-256 hash
	bundleBytes, _ := json.Marshal(admitted)
	hasher := sha256.New()
	hasher.Write(bundleBytes)
	bundleHash := hex.EncodeToString(hasher.Sum(nil))

	return ConsensusVerdict{
		CaseURN:        fmt.Sprintf("urn:case:%s@%s", targetID, cutoff.Format(time.RFC3339)),
		CutoffTime:     cutoff,
		ActiveOrigins:  distinctOrigins,
		RequiredOrigin: 2,
		Adjudication:   status,
		AdmittedFrames: admitted,
		BundleHash:     bundleHash,
	}
}
