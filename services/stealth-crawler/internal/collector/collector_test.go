package collector

import (
	"testing"

	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/stealth-crawler/internal/fingerprint"
)

func TestFingerprintRandomization(t *testing.T) {
	p1 := fingerprint.GetRandomProfile()
	if p1.UserAgent == "" {
		t.Errorf("expected non-empty user-agent")
	}
	if len(p1.CipherSuites) == 0 {
		t.Errorf("expected cipher suites in profile")
	}
}

func TestParseADSBStates(t *testing.T) {
	sampleJSON := []byte(`{
		"time": 1700000000,
		"states": [
			["484163", "KLM101  ", "Netherlands", 1700000000, 1700000000, 4.402, 51.219, 10000, false]
		]
	}`)

	states, err := ParseADSBStates(sampleJSON)
	if err != nil {
		t.Fatalf("failed to parse states: %v", err)
	}

	if len(states) != 1 {
		t.Fatalf("expected 1 state, got %d", len(states))
	}
	if states[0]["icao24"] != "484163" {
		t.Errorf("expected 484163, got %v", states[0]["icao24"])
	}
}
