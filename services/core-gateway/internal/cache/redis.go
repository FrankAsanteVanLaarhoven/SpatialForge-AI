package cache

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// TelemetryCache defines the distributed Redis caching interface with in-memory fallback.
type TelemetryCache interface {
	Ping(ctx context.Context) (bool, string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration) error
	Get(ctx context.Context, key string) (string, bool, error)
	Publish(ctx context.Context, channel string, message string) error
	Subscribe(ctx context.Context, channel string) (<-chan string, func())
	IsRedisConnected() bool
	GetStatus() map[string]interface{}
}

type cacheItem struct {
	value     string
	expiresAt time.Time
}

// SovereignRedisClient manages Redis connection with graceful in-memory degradation.
type SovereignRedisClient struct {
	host            string
	port            string
	address         string
	isConnected     bool
	lastPingCheck   time.Time
	mu              sync.RWMutex
	inMemoryStore   map[string]cacheItem
	inMemoryPubSubs map[string][]chan string
}

// NewSovereignRedisClient initializes Redis client using environment or defaults.
func NewSovereignRedisClient() *SovereignRedisClient {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	client := &SovereignRedisClient{
		host:            host,
		port:            port,
		address:         fmt.Sprintf("%s:%s", host, port),
		inMemoryStore:   make(map[string]cacheItem),
		inMemoryPubSubs: make(map[string][]chan string),
	}

	// Initial probe with short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()
	_, _, _ = client.Ping(ctx)

	return client
}

func (c *SovereignRedisClient) executeCommand(cmd []string) (string, error) {
	conn, err := net.DialTimeout("tcp", c.address, 1*time.Second)
	if err != nil {
		c.mu.Lock()
		c.isConnected = false
		c.mu.Unlock()
		return "", err
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(1500 * time.Millisecond))

	// Write RESP Array
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("*%d\r\n", len(cmd)))
	for _, part := range cmd {
		sb.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(part), part))
	}

	if _, err := conn.Write([]byte(sb.String())); err != nil {
		c.mu.Lock()
		c.isConnected = false
		c.mu.Unlock()
		return "", err
	}

	reader := bufio.NewReader(conn)
	line, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}

	line = strings.TrimRight(line, "\r\n")
	if len(line) == 0 {
		return "", fmt.Errorf("empty response from redis")
	}

	switch line[0] {
	case '+': // Simple string (e.g. +PONG, +OK)
		return line[1:], nil
	case ':': // Integer (e.g. :1)
		return line[1:], nil
	case '$': // Bulk string
		length, err := strconv.Atoi(line[1:])
		if err != nil || length < 0 {
			return "", nil // Nil bulk string (key not found)
		}
		data := make([]byte, length+2) // value + \r\n
		var readTotal int
		for readTotal < length+2 {
			n, err := reader.Read(data[readTotal:])
			if err != nil {
				return "", err
			}
			readTotal += n
		}
		return string(data[:length]), nil
	case '-': // Error
		return "", fmt.Errorf("redis error: %s", line[1:])
	default:
		return line, nil
	}
}

// Ping checks Redis health or falls back to in-memory status.
func (c *SovereignRedisClient) Ping(ctx context.Context) (bool, string, error) {
	res, err := c.executeCommand([]string{"PING"})
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lastPingCheck = time.Now()

	if err == nil && (res == "PONG" || strings.Contains(res, "PONG")) {
		c.isConnected = true
		return true, "PONG (Redis 7.2 active)", nil
	}

	c.isConnected = false
	return false, "LOCAL_ENCLAVE (In-Memory Fallback Active)", nil
}

// Set stores a key-value pair in Redis or local memory.
func (c *SovereignRedisClient) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	c.mu.RLock()
	connected := c.isConnected
	c.mu.RUnlock()

	if connected {
		var cmd []string
		if ttl > 0 {
			cmd = []string{"SET", key, value, "EX", strconv.Itoa(int(ttl.Seconds()))}
		} else {
			cmd = []string{"SET", key, value}
		}
		if _, err := c.executeCommand(cmd); err == nil {
			return nil
		}
		// If failed, fall through to in-memory
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	var exp time.Time
	if ttl > 0 {
		exp = time.Now().Add(ttl)
	}
	c.inMemoryStore[key] = cacheItem{value: value, expiresAt: exp}
	return nil
}

// Get retrieves a key from Redis or local memory.
func (c *SovereignRedisClient) Get(ctx context.Context, key string) (string, bool, error) {
	c.mu.RLock()
	connected := c.isConnected
	c.mu.RUnlock()

	if connected {
		res, err := c.executeCommand([]string{"GET", key})
		if err == nil {
			if res != "" {
				return res, true, nil
			}
			return "", false, nil
		}
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	item, ok := c.inMemoryStore[key]
	if !ok {
		return "", false, nil
	}

	if !item.expiresAt.IsZero() && time.Now().After(item.expiresAt) {
		return "", false, nil
	}

	return item.value, true, nil
}

// Publish distributes an event through Redis Pub/Sub channel or in-memory channel.
func (c *SovereignRedisClient) Publish(ctx context.Context, channel string, message string) error {
	c.mu.RLock()
	connected := c.isConnected
	c.mu.RUnlock()

	if connected {
		if _, err := c.executeCommand([]string{"PUBLISH", channel, message}); err == nil {
			return nil
		}
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	if subs, ok := c.inMemoryPubSubs[channel]; ok {
		for _, sub := range subs {
			select {
			case sub <- message:
			default:
			}
		}
	}
	return nil
}

// Subscribe registers a subscriber channel for in-memory pub/sub events.
func (c *SovereignRedisClient) Subscribe(ctx context.Context, channel string) (<-chan string, func()) {
	ch := make(chan string, 32)
	c.mu.Lock()
	c.inMemoryPubSubs[channel] = append(c.inMemoryPubSubs[channel], ch)
	c.mu.Unlock()

	unsubscribe := func() {
		c.mu.Lock()
		defer c.mu.Unlock()
		subs := c.inMemoryPubSubs[channel]
		for i, sub := range subs {
			if sub == ch {
				c.inMemoryPubSubs[channel] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}
	}

	return ch, unsubscribe
}

// IsRedisConnected reports whether connection to physical Redis port is established.
func (c *SovereignRedisClient) IsRedisConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.isConnected
}

// GetStatus returns operational cache diagnostic metrics.
func (c *SovereignRedisClient) GetStatus() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	mode := "REDIS_TCP"
	if !c.isConnected {
		mode = "IN_MEMORY_ENCLAVE"
	}
	return map[string]interface{}{
		"mode":             mode,
		"redis_target":     c.address,
		"redis_connected":  c.isConnected,
		"in_memory_keys":   len(c.inMemoryStore),
		"last_checked_utc": c.lastPingCheck.UTC().Format(time.RFC3339),
	}
}
