package proxy

import (
	"errors"
	"net/url"
	"sync"
	"time"
)

type Node struct {
	URL          *url.URL
	LatencyMs    int64
	FailureCount int
	IsQuarantined bool
	QuarantinedAt time.Time
}

type ProxyPool struct {
	nodes []*Node
	index int
	mu    sync.Mutex
}

func NewProxyPool(proxyURLs []string) (*ProxyPool, error) {
	pool := &ProxyPool{}
	for _, raw := range proxyURLs {
		parsed, err := url.Parse(raw)
		if err != nil {
			return nil, err
		}
		pool.nodes = append(pool.nodes, &Node{URL: parsed})
	}
	return pool, nil
}

// Next selects the next healthy proxy via round-robin with automatic quarantine revival
func (p *ProxyPool) Next() (*url.URL, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.nodes) == 0 {
		return nil, nil // Direct connection fallback
	}

	now := time.Now()
	for i := 0; i < len(p.nodes); i++ {
		idx := (p.index + i) % len(p.nodes)
		node := p.nodes[idx]

		// Check quarantine timeout (revive after 2 minutes)
		if node.IsQuarantined {
			if now.Sub(node.QuarantinedAt) > 2*time.Minute {
				node.IsQuarantined = false
				node.FailureCount = 0
			} else {
				continue
			}
		}

		p.index = (idx + 1) % len(p.nodes)
		return node.URL, nil
	}

	return nil, errors.New("all proxies in pool are currently quarantined")
}

// ReportFailure tracks consecutive errors and trips circuit breaker
func (p *ProxyPool) ReportFailure(targetURL *url.URL) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, n := range p.nodes {
		if n.URL.String() == targetURL.String() {
			n.FailureCount++
			if n.FailureCount >= 3 {
				n.IsQuarantined = true
				n.QuarantinedAt = time.Now()
			}
			break
		}
	}
}
