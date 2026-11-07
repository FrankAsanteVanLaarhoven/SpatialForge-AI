package fingerprint

import (
	"crypto/tls"
	"math/rand"
	"net/http"
	"time"
)

type BrowserProfile struct {
	Name            string
	UserAgent       string
	SecChUa         string
	SecChUaPlatform string
	Accept          string
	AcceptLanguage  string
	CipherSuites    []uint16
}

var Profiles = []BrowserProfile{
	{
		Name:            "Chrome 131 macOS",
		UserAgent:       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		SecChUa:         `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`,
		SecChUaPlatform: `"macOS"`,
		Accept:          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		AcceptLanguage:  "en-US,en;q=0.9",
		CipherSuites: []uint16{
			tls.TLS_AES_128_GCM_SHA256,
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_CHACHA20_POLY1305_SHA256,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		},
	},
	{
		Name:            "Firefox 133 macOS",
		UserAgent:       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
		SecChUa:         "",
		SecChUaPlatform: "",
		Accept:          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		AcceptLanguage:  "en-US,en;q=0.5",
		CipherSuites: []uint16{
			tls.TLS_AES_128_GCM_SHA256,
			tls.TLS_CHACHA20_POLY1305_SHA256,
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
	},
}

// GetRandomProfile returns a randomized realistic browser profile
func GetRandomProfile() BrowserProfile {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return Profiles[r.Intn(len(Profiles))]
}

// ApplyStealthHeaders sets deceptive browser-conforming HTTP request headers
func ApplyStealthHeaders(req *http.Request, p BrowserProfile) {
	req.Header.Set("User-Agent", p.UserAgent)
	req.Header.Set("Accept", p.Accept)
	req.Header.Set("Accept-Language", p.AcceptLanguage)
	req.Header.Set("Accept-Encoding", "gzip, deflate, br, zstd")
	req.Header.Set("DNT", "1")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	if p.SecChUa != "" {
		req.Header.Set("sec-ch-ua", p.SecChUa)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("sec-ch-ua-platform", p.SecChUaPlatform)
		req.Header.Set("Sec-Fetch-Dest", "document")
		req.Header.Set("Sec-Fetch-Mode", "navigate")
		req.Header.Set("Sec-Fetch-Site", "none")
		req.Header.Set("Sec-Fetch-User", "?1")
	}
}
