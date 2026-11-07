package collector

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/stealth-crawler/internal/fingerprint"
	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/stealth-crawler/internal/proxy"
	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/stealth-crawler/internal/throttle"
)

type StealthCollector struct {
	client *http.Client
	pool   *proxy.ProxyPool
	pacer  *throttle.HumanizedPacer
}

func NewStealthCollector(pool *proxy.ProxyPool) *StealthCollector {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
		MaxIdleConns:        100,
		IdleConnTimeout:     90 * time.Second,
		DisableCompression: false,
	}

	return &StealthCollector{
		client: &http.Client{
			Transport: tr,
			Timeout:   15 * time.Second,
		},
		pool:  pool,
		pacer: throttle.NewHumanizedPacer(1200, 400),
	}
}

// FetchStealth executes an HTTP GET with randomized fingerprint and proxy
func (c *StealthCollector) FetchStealth(ctx context.Context, targetURL string) ([]byte, error) {
	// 1. Humanized jitter delay
	c.pacer.Wait()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}

	// 2. Apply browser fingerprint profile
	profile := fingerprint.GetRandomProfile()
	fingerprint.ApplyStealthHeaders(req, profile)

	// 3. Set Proxy if available
	var activeProxy *url.URL
	if c.pool != nil {
		p, err := c.pool.Next()
		if err == nil && p != nil {
			activeProxy = p
			if tr, ok := c.client.Transport.(*http.Transport); ok {
				tr.Proxy = http.ProxyURL(p)
			}
		}
	}

	resp, err := c.client.Do(req)
	if err != nil {
		if activeProxy != nil && c.pool != nil {
			c.pool.ReportFailure(activeProxy)
		}
		return nil, fmt.Errorf("stealth request failed: %w", err)
	}
	defer resp.Body.Close()

	// Anti-bot detection check (429 Too Many Requests or 403 Forbidden)
	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusForbidden {
		if activeProxy != nil && c.pool != nil {
			c.pool.ReportFailure(activeProxy)
		}
		return nil, fmt.Errorf("rate limited or challenged (status %d)", resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// ParseADSBStates parses standard OpenSky ADS-B vector frames
func ParseADSBStates(data []byte) ([]map[string]any, error) {
	var payload struct {
		Time   int64   `json:"time"`
		States [][]any `json:"states"`
	}

	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, err
	}

	var results []map[string]any
	for _, s := range payload.States {
		if len(s) >= 7 {
			results = append(results, map[string]any{
				"icao24":    s[0],
				"callsign":  s[1],
				"origin":    s[2],
				"time_pos":  s[3],
				"longitude": s[5],
				"latitude":  s[6],
			})
		}
	}
	return results, nil
}
