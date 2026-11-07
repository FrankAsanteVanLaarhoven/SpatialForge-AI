package dispatcher

import (
	"testing"
	"time"
)

func TestBiTemporalConsensus(t *testing.T) {
	d := NewIngestionDispatcher()
	baseTime := time.Date(2026, 11, 7, 14, 0, 0, 0, time.UTC)

	// 1. Ingest frame from origin A
	frame1 := TelemetryFrame{
		TargetID:      "vessel-alpha",
		SensorID:      "ais-receiver-1",
		RootOrigin:    "transponder-A",
		CaptureTime:   baseTime,
		IngestionTime: baseTime.Add(100 * time.Millisecond),
		Latitude:      51.2194,
		Longitude:     4.4025,
	}
	if _, err := d.IngestFrame(frame1); err != nil {
		t.Fatalf("failed to ingest frame 1: %v", err)
	}

	// At baseTime + 2s with only Origin A: status must be INSUFFICIENT
	cutoff1 := baseTime.Add(2 * time.Second)
	verdict1 := d.EvaluateBiTemporalConsensus("vessel-alpha", cutoff1, 5*time.Second)
	if verdict1.Adjudication != "INSUFFICIENT" {
		t.Errorf("expected INSUFFICIENT, got %s", verdict1.Adjudication)
	}
	if verdict1.ActiveOrigins != 1 {
		t.Errorf("expected 1 active origin, got %d", verdict1.ActiveOrigins)
	}

	// 2. Ingest frame from independent origin B
	frame2 := TelemetryFrame{
		TargetID:      "vessel-alpha",
		SensorID:      "coastal-radar-9",
		RootOrigin:    "coastal-radar-root",
		CaptureTime:   baseTime.Add(1 * time.Second),
		IngestionTime: baseTime.Add(1100 * time.Millisecond),
		Latitude:      51.2195,
		Longitude:     4.4026,
	}
	if _, err := d.IngestFrame(frame2); err != nil {
		t.Fatalf("failed to ingest frame 2: %v", err)
	}

	// At baseTime + 3s with Origin A & Origin B: status must be ADMITTED
	cutoff2 := baseTime.Add(3 * time.Second)
	verdict2 := d.EvaluateBiTemporalConsensus("vessel-alpha", cutoff2, 5*time.Second)
	if verdict2.Adjudication != "ADMITTED" {
		t.Errorf("expected ADMITTED, got %s", verdict2.Adjudication)
	}
	if verdict2.ActiveOrigins != 2 {
		t.Errorf("expected 2 active origins, got %d", verdict2.ActiveOrigins)
	}
	if verdict2.BundleHash == "" {
		t.Errorf("expected non-empty bundle hash")
	}
}
