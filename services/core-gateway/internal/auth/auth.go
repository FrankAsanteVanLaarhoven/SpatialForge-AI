package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	ErrUnauthorized = errors.New("unauthorized: missing or invalid credentials")
	ErrRateLimited  = errors.New("rate limited: too many requests")
)

type SecurityManager struct {
	hmacSecret []byte
	rateLimits map[string]*rateBucket
	mu         sync.Mutex
}

type rateBucket struct {
	tokens    float64
	lastCheck time.Time
}

func NewSecurityManager(secret string) *SecurityManager {
	return &SecurityManager{
		hmacSecret: []byte(secret),
		rateLimits: make(map[string]*rateBucket),
	}
}

// ConstantTimeVerify compares the incoming token with expected token in constant time
func (s *SecurityManager) ConstantTimeVerify(incomingToken, expectedToken string) bool {
	incomingBytes := []byte(incomingToken)
	expectedBytes := []byte(expectedToken)
	return subtle.ConstantTimeCompare(incomingBytes, expectedBytes) == 1
}

// GenerateHMAC creates a cryptographically signed session token
func (s *SecurityManager) GenerateHMAC(payload string) string {
	mac := hmac.New(sha256.New, s.hmacSecret)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyHMAC verifies whether the token signature matches payload
func (s *SecurityManager) VerifyHMAC(payload, signature string) bool {
	expectedSig := s.GenerateHMAC(payload)
	return s.ConstantTimeVerify(signature, expectedSig)
}

// AllowRate checks token bucket rate limiting (capacity: 100, refill rate: 20/sec)
func (s *SecurityManager) AllowRate(clientIP string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	const capacity = 100.0
	const refillRate = 20.0 // per second

	now := time.Now()
	bucket, exists := s.rateLimits[clientIP]
	if !exists {
		s.rateLimits[clientIP] = &rateBucket{
			tokens:    capacity - 1.0,
			lastCheck: now,
		}
		return true
	}

	elapsed := now.Sub(bucket.lastCheck).Seconds()
	bucket.tokens += elapsed * refillRate
	if bucket.tokens > capacity {
		bucket.tokens = capacity
	}
	bucket.lastCheck = now

	if bucket.tokens >= 1.0 {
		bucket.tokens -= 1.0
		return true
	}

	return false
}

// Middleware creates standard HTTP authentication and rate limiting handler
func (s *SecurityManager) Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := strings.Split(r.RemoteAddr, ":")[0]
		if !s.AllowRate(ip) {
			http.Error(w, ErrRateLimited.Error(), http.StatusTooManyRequests)
			return
		}

		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("Content-Security-Policy", "default-src 'self'")

		next(w, r)
	}
}
