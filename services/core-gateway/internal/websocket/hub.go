package websocket

import (
	"log"
	"net/http"
	"sync"
	"time"
)

// Client represents an active WebSocket subscriber
type Client struct {
	ID       string
	SendChan chan []byte
}

// SpatialStreamingHub manages concurrent client subscriptions and broadcasts telemetry vectors
type SpatialStreamingHub struct {
	clients    map[string]*Client
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewSpatialStreamingHub() *SpatialStreamingHub {
	return &SpatialStreamingHub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan []byte, 1024),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *SpatialStreamingHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			log.Printf("[WebSocket Hub] Client subscribed: %s (Total: %d)\n", client.ID, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				delete(h.clients, client.ID)
				close(client.SendChan)
			}
			h.mu.Unlock()
			log.Printf("[WebSocket Hub] Client unsubscribed: %s\n", client.ID)

		case message := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.SendChan <- message:
				default:
					// Drop or slow client backpressure
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastVector queues a serialized telemetry vector to all active subscribers
func (h *SpatialStreamingHub) BroadcastVector(payload []byte) {
	select {
	case h.broadcast <- payload:
	default:
		// Queue full, drop frame to maintain real-time SLA
	}
}

// ServeStream provides HTTP streaming fallback (Server-Sent Events) for real-time 3D Cesium updates
func (h *SpatialStreamingHub) ServeSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	client := &Client{
		ID:       r.RemoteAddr + "_" + time.Now().Format("150405.000"),
		SendChan: make(chan []byte, 128),
	}

	h.register <- client
	defer func() {
		h.unregister <- client
	}()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case msg, ok := <-client.SendChan:
			if !ok {
				return
			}
			w.Write([]byte("data: " + string(msg) + "\n\n"))
			flusher.Flush()
		}
	}
}
