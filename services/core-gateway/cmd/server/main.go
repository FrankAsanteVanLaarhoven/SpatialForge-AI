package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/core-gateway/internal/api"
	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/core-gateway/internal/auth"
	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/core-gateway/internal/cache"
	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/core-gateway/internal/dispatcher"
	"github.com/FrankAsanteVanLaarhoven/spatialforge-ai/services/core-gateway/internal/websocket"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	secret := os.Getenv("SPATIALFORGE_SECRET")
	if secret == "" {
		secret = "spatialforge_master_cryptographic_enclave_key_2026"
	}

	secManager := auth.NewSecurityManager(secret)
	redisCache := cache.NewSovereignRedisClient()
	disp := dispatcher.NewIngestionDispatcher()
	apiHandler := api.NewAPIHandler(disp, redisCache)
	router := api.NewOrchestrationRouter()
	streamHub := websocket.NewSpatialStreamingHub()
	go streamHub.Run()

	// Bridge Redis / Sovereign PubSub channel to WebSocket/SSE real-time streaming hub
	telemetrySub, _ := redisCache.Subscribe(context.Background(), "spatialforge:telemetry:stream")
	go func() {
		for msg := range telemetrySub {
			streamHub.BroadcastVector([]byte(msg))
		}
	}()

	// Register microservice backends (default or environment overridden)
	pythonIntelURL := os.Getenv("PYTHON_INTELLIGENCE_URL")
	if pythonIntelURL == "" {
		pythonIntelURL = "http://127.0.0.1:5001"
	}
	_ = router.RegisterService("/api/v1/intelligence/", pythonIntelURL)

	stealthCrawlerURL := os.Getenv("STEALTH_CRAWLER_URL")
	if stealthCrawlerURL == "" {
		stealthCrawlerURL = "http://127.0.0.1:5003"
	}
	_ = router.RegisterService("/api/v1/crawler/", stealthCrawlerURL)

	mux := http.NewServeMux()

	// Public health & routing topology
	mux.HandleFunc("/healthz", apiHandler.HealthCheck)
	mux.HandleFunc("/api/v1/health", apiHandler.HealthCheck)
	mux.HandleFunc("/api/v1/cache/status", apiHandler.CacheStatus)
	mux.HandleFunc("/api/v1/routes", router.ListRoutes)
	mux.HandleFunc("/api/v1/stream", streamHub.ServeSSE)

	// Protected core endpoints
	mux.HandleFunc("/api/v1/telemetry", secManager.Middleware(apiHandler.IngestTelemetry))
	mux.HandleFunc("/api/v1/replay/adjudicate", secManager.Middleware(apiHandler.ReplayAdjudication))

	// Forward proxied routes
	mux.HandleFunc("/api/v1/intelligence/", secManager.Middleware(router.HandleRoutes))
	mux.HandleFunc("/api/v1/crawler/", secManager.Middleware(router.HandleRoutes))

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown listener
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[SpatialForge Core Gateway] Sovereign API Gateway & Router running on :%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Listen error: %v", err)
		}
	}()

	<-stop
	log.Println("[SpatialForge Core Gateway] Shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}

	fmt.Println("[SpatialForge Core Gateway] Server stopped cleanly")
}
