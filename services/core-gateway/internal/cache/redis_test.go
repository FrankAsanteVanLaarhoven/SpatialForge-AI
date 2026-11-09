package cache

import (
	"context"
	"testing"
	"time"
)

func TestSovereignRedisClient_Lifecycle(t *testing.T) {
	ctx := context.Background()
	client := NewSovereignRedisClient()

	// 1. Test Ping
	isAlive, statusMsg, err := client.Ping(ctx)
	if err != nil {
		t.Fatalf("Ping returned unexpected error: %v", err)
	}
	if statusMsg == "" {
		t.Errorf("Expected non-empty status message")
	}
	t.Logf("Redis ping status: %s (connected: %v)", statusMsg, isAlive)

	// 2. Test Set and Get
	testKey := "test:spatialforge:telemetry:v1"
	testVal := `{"vessel": "EVER-GIVEN", "lat": 30.01, "lon": 32.55}`

	if err := client.Set(ctx, testKey, testVal, 5*time.Second); err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	val, found, err := client.Get(ctx, testKey)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if !found {
		t.Fatalf("Key %q should be found", testKey)
	}
	if val != testVal {
		t.Errorf("Expected val %q, got %q", testVal, val)
	}

	// 3. Test TTL expiration
	expKey := "test:spatialforge:expiring"
	if err := client.Set(ctx, expKey, "temp-value", 50*time.Millisecond); err != nil {
		t.Fatalf("Set expiring key failed: %v", err)
	}
	time.Sleep(70 * time.Millisecond)
	_, expFound, _ := client.Get(ctx, expKey)
	if expFound {
		t.Errorf("Expected expiring key to have expired and not be found")
	}

	// 4. Test Pub/Sub
	subCh, unsub := client.Subscribe(ctx, "telemetry:alerts")
	defer unsub()

	expectedMsg := "COLLISION_RISK_DETECTED"
	if err := client.Publish(ctx, "telemetry:alerts", expectedMsg); err != nil {
		t.Fatalf("Publish failed: %v", err)
	}

	select {
	case msg := <-subCh:
		if msg != expectedMsg {
			t.Errorf("Expected pub/sub message %q, got %q", expectedMsg, msg)
		}
	case <-time.After(1 * time.Second):
		t.Errorf("Timed out waiting for pub/sub message")
	}

	// 5. Test Status Diagnostics
	status := client.GetStatus()
	if status["mode"] == "" {
		t.Errorf("Expected mode in status map")
	}
	if status["redis_target"] == "" {
		t.Errorf("Expected redis_target in status map")
	}
}

