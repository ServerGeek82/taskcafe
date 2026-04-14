package route

import (
	"net/http"
	"sync"
	"time"
)

// ipRateLimiter tracks per-IP request counts within a sliding window.
type ipRateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func newIPRateLimiter(limit int, window time.Duration) *ipRateLimiter {
	rl := &ipRateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

// allow returns true if the request from ip is within the rate limit.
func (rl *ipRateLimiter) allow(ip string) bool {
	now := time.Now()
	cutoff := now.Add(-rl.window)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Remove timestamps outside the window
	times := rl.requests[ip]
	valid := times[:0]
	for _, t := range times {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	rl.requests[ip] = append(valid, now)
	return len(rl.requests[ip]) <= rl.limit
}

// cleanup periodically removes stale IP entries to bound memory usage.
func (rl *ipRateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-rl.window)
		rl.mu.Lock()
		for ip, times := range rl.requests {
			valid := times[:0]
			for _, t := range times {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = valid
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimitMiddleware returns a Chi-compatible middleware that enforces the
// given per-IP rate limit. Excess requests receive 429 Too Many Requests.
func RateLimitMiddleware(limit int, window time.Duration) func(http.Handler) http.Handler {
	limiter := newIPRateLimiter(limit, window)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			// Prefer the real IP set by RealIP middleware
			if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
				ip = realIP
			} else if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = forwarded
			}
			if !limiter.allow(ip) {
				http.Error(w, "too many requests", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
