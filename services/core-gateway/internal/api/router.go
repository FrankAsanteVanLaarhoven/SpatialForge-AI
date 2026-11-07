package api

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync"
	"time"
)

type OrchestrationRouter struct {
	mu           sync.RWMutex
	routes       map[string]*url.URL
	reverseProxy map[string]*httputil.ReverseProxy
}

func NewOrchestrationRouter() *OrchestrationRouter {
	return &OrchestrationRouter{
		routes:       make(map[string]*url.URL),
		reverseProxy: make(map[string]*httputil.ReverseProxy),
	}
}

// RegisterService mounts a backend microservice to an API route prefix
func (r *OrchestrationRouter) RegisterService(prefix string, targetURL string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	parsed, err := url.Parse(targetURL)
	if err != nil {
		return err
	}

	proxy := httputil.NewSingleHostReverseProxy(parsed)
	// Custom director for route preservation and security headers
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Header.Set("X-SpatialForge-Gateway", "Core-V2")
	}

	r.routes[prefix] = parsed
	r.reverseProxy[prefix] = proxy
	log.Printf("[Router] Registered service route %s -> %s\n", prefix, targetURL)
	return nil
}

// HandleRoutes creates a multiplexer handling core API and reverse-proxied routes
func (r *OrchestrationRouter) HandleRoutes(w http.ResponseWriter, req *http.Request) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for prefix, proxy := range r.reverseProxy {
		if len(req.URL.Path) >= len(prefix) && req.URL.Path[:len(prefix)] == prefix {
			proxy.ServeHTTP(w, req)
			return
		}
	}

	http.NotFound(w, req)
}

// ListRoutes surfaces active routing topology for observability
func (r *OrchestrationRouter) ListRoutes(w http.ResponseWriter, req *http.Request) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	topology := make(map[string]string)
	for prefix, target := range r.routes {
		topology[prefix] = target.String()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"orchestrator": "SpatialForge Sovereign Core Gateway",
		"active_nodes": len(topology),
		"routes":       topology,
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
	})
}
