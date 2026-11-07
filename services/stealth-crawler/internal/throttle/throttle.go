package throttle

import (
	"math/rand"
	"time"
)

type HumanizedPacer struct {
	baseDelayMs  int
	stdDevMs     int
	lastRequest  time.Time
}

func NewHumanizedPacer(baseDelayMs, stdDevMs int) *HumanizedPacer {
	return &HumanizedPacer{
		baseDelayMs: baseDelayMs,
		stdDevMs:    stdDevMs,
		lastRequest: time.Now(),
	}
}

// Wait calculates a realistic human browsing delay before dispatching
func (p *HumanizedPacer) Wait() {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	// Box-Muller transform for Gaussian distribution
	delay := int(r.NormFloat64()*float64(p.stdDevMs)) + p.baseDelayMs
	if delay < 500 {
		delay = 500 // Min 500ms safety floor
	}

	time.Sleep(time.Duration(delay) * time.Millisecond)
	p.lastRequest = time.Now()
}
