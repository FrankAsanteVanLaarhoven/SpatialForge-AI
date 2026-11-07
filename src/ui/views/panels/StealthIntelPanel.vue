<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { makeDraggable } from '../../dashboard/dashboardLayout.js';

const isVisible = ref(false);
const activeTab = ref('mesh'); // 'mesh' | 'stealth' | 'live-vectors'
const panelOverlayRef = ref(null);
const headerDragRef = ref(null);
let cleanupDrag = null;

function setupDraggable() {
  if (cleanupDrag) cleanupDrag();
  if (panelOverlayRef.value && headerDragRef.value) {
    cleanupDrag = makeDraggable(
      panelOverlayRef.value,
      headerDragRef.value,
      'stealth-intel-panel',
      { x: Math.max(20, Math.floor((window.innerWidth - 760) / 2)), y: 72 }
    );
  }
}

watch(isVisible, (val) => {
  if (val) {
    nextTick(() => {
      setupDraggable();
    });
  } else {
    if (cleanupDrag) cleanupDrag();
  }
});

const microservices = ref([
  {
    name: 'Go Core Gateway',
    runtime: 'Go 1.26',
    role: 'API Gateway & Reverse-Proxy Router',
    port: '8080',
    status: 'ONLINE',
    pingMs: 2,
    routes: ['/api/v1/telemetry', '/api/v1/replay/adjudicate', '/api/v1/stream']
  },
  {
    name: 'Rust Crypto Enclave',
    runtime: 'Rust 1.90',
    role: 'Merkle Proofs & Ed25519 Signing',
    port: 'Binary / IPC',
    status: 'OPTIMIZED',
    pingMs: 0.4,
    routes: ['calculate_merkle_root()', 'attest_bundle()', 'verify_attestation()']
  },
  {
    name: 'Python Intelligence Engine',
    runtime: 'Python 3.11',
    role: 'Kinematic Spoofing & Bayesian Fusion',
    port: '5001',
    status: 'ONLINE',
    pingMs: 1.2,
    routes: ['/api/v1/intelligence/anomaly/evaluate', '/api/v1/intelligence/fusion/estimate']
  },
  {
    name: 'PostgreSQL + PostGIS',
    runtime: 'PostGIS 3.4',
    role: 'Partitioned Spatial Telemetry & Corridors',
    port: '5432',
    status: 'READY',
    pingMs: 1,
    routes: ['spatial_telemetry_2026_11', 'target_tracks', 'evidence_bundles']
  }
]);

const stealthConfig = ref({
  activeProfile: 'Chrome 131 macOS (x86_64 / arm64)',
  ja3Fingerprint: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
  ja4Fingerprint: 't13d1516h2_8daaf6152771_e562704de552',
  proxyPoolSize: 12,
  healthyProxies: 12,
  quarantinedProxies: 0,
  pacingModel: 'Gaussian Box-Muller (μ=1200ms, σ=400ms)',
  activeTargets: [
    { type: 'ADS-B', source: 'OpenSky Network', cadence: '2.4s', status: 'INGESTING' },
    { type: 'AIS', source: 'Coastal Transponder Grid', cadence: '3.0s', status: 'INGESTING' },
    { type: 'TLE', source: 'Celestrak Satellite Ephemeris', cadence: '60s', status: 'SYNCED' }
  ]
});

const actionFeedback = ref('');

function triggerAction(actionName) {
  if (actionName === 'cycle-profile') {
    stealthConfig.value.activeProfile = stealthConfig.value.activeProfile.includes('Chrome') 
      ? 'Firefox 133 macOS (Gecko/20100101)' 
      : 'Chrome 131 macOS (x86_64 / arm64)';
    actionFeedback.value = `[STEALTH] Rotated TLS ClientHello to ${stealthConfig.value.activeProfile}`;
  } else if (actionName === 'merkle-proof') {
    actionFeedback.value = '[RUST ENCLAVE] SHA-256 Merkle root computed over 4,096 leaves in 0.38ms: 5f98c21...8b';
  } else if (actionName === 'spoof-test') {
    actionFeedback.value = '[PYTHON INTEL] Anomaly flagged: MMSI 244710000 sudden jump Δd=14.2nm in 4s (Speed: 12,780 kts)';
  }
  setTimeout(() => { actionFeedback.value = ''; }, 4500);
}

function handleToggle() {
  isVisible.value = !isVisible.value;
}

onMounted(() => {
  window.addEventListener('gev:toggle-stealth-intel', handleToggle);
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-stealth-intel', handleToggle);
});
</script>

<template>
  <transition name="fade-slide">
    <aside v-if="isVisible" ref="panelOverlayRef" class="stealth-intel-overlay" aria-label="Stealth Intel and Microservices Console">
      <!-- Header -->
      <div ref="headerDragRef" class="stealth-header">
        <div class="brand-badge-wrap">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" style="vertical-align: -2px; margin-right: 6px; opacity: 0.7;">
            <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
          </svg>
          <span class="stealth-pill-badge">SOVEREIGN ARCHITECTURE</span>
          <h2>STEALTH INTEL & ORCHESTRATION MESH</h2>
        </div>
        <div class="header-actions">
          <div class="tabs-nav">
            <button :class="{ active: activeTab === 'mesh' }" @click="activeTab = 'mesh'">MICROSERVICES (4)</button>
            <button :class="{ active: activeTab === 'stealth' }" @click="activeTab = 'stealth'">STEALTH CRAWLER</button>
          </div>
          <button class="close-btn" @click="isVisible = false" title="Close Panel">✕</button>
        </div>
      </div>

      <!-- Action Toast Feedback -->
      <div v-if="actionFeedback" class="action-toast-banner">
        {{ actionFeedback }}
      </div>

      <!-- Tab 1: Microservices Topology -->
      <div v-if="activeTab === 'mesh'" class="mesh-grid">
        <div v-for="ms in microservices" :key="ms.name" class="service-card">
          <div class="service-top">
            <span class="service-name">{{ ms.name }}</span>
            <span class="service-runtime">{{ ms.runtime }}</span>
          </div>
          <p class="service-role">{{ ms.role }}</p>
          <div class="service-metrics">
            <span class="metric-item">Port: <strong>{{ ms.port }}</strong></span>
            <span class="metric-item">Latency: <strong>{{ ms.pingMs }}ms</strong></span>
            <span class="metric-status" :class="ms.status.toLowerCase()">● {{ ms.status }}</span>
          </div>
          <div class="service-endpoints">
            <div v-for="route in ms.routes" :key="route" class="endpoint-chip">
              {{ route }}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Stealth Crawler OSINT Status -->
      <div v-if="activeTab === 'stealth'" class="stealth-view">
        <div class="stealth-metrics-row">
          <div class="stealth-stat-box">
            <span class="stat-label">ACTIVE TLS PROFILE</span>
            <span class="stat-value highlight">{{ stealthConfig.activeProfile }}</span>
          </div>
          <div class="stealth-stat-box">
            <span class="stat-label">PROXY POOL HEALTH</span>
            <span class="stat-value positive">{{ stealthConfig.healthyProxies }} / {{ stealthConfig.proxyPoolSize }} HEALTHY</span>
          </div>
          <div class="stealth-stat-box">
            <span class="stat-label">PACING JITTER</span>
            <span class="stat-value">{{ stealthConfig.pacingModel }}</span>
          </div>
        </div>

        <div class="fingerprint-details-card">
          <h3>FINGERPRINT SIGNATURE (JA3 / JA4 EMULATION)</h3>
          <div class="fp-code-block">
            <p><strong>JA3:</strong> {{ stealthConfig.ja3Fingerprint }}</p>
            <p><strong>JA4:</strong> {{ stealthConfig.ja4Fingerprint }}</p>
          </div>
        </div>

        <div class="osint-targets-card">
          <h3>ACTIVE OSINT EXTRACTION TARGETS</h3>
          <div class="targets-list">
            <div v-for="tgt in stealthConfig.activeTargets" :key="tgt.type" class="target-row">
              <span class="target-type">{{ tgt.type }}</span>
              <span class="target-source">{{ tgt.source }}</span>
              <span class="target-cadence">Poll: {{ tgt.cadence }}</span>
              <span class="target-badge">{{ tgt.status }}</span>
            </div>
          </div>
        </div>

        <!-- Interactive Control Bar -->
        <div class="stealth-action-bar">
          <button class="action-btn cyan" @click="triggerAction('cycle-profile')">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align: -1px; margin-right: 4px;"><path d="M2 8a6 6 0 1 0 1.5-4M2 3v5h5"/></svg>Rotate Browser TLS Profile (Go)
          </button>
          <button class="action-btn purple" @click="triggerAction('merkle-proof')">
            ⚡ Verify SHA-256 Merkle Proof (Rust)
          </button>
          <button class="action-btn amber" @click="triggerAction('spoof-test')">
            ⚠️ Evaluate Kinematic Spoofing (Python)
          </button>
        </div>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.stealth-intel-overlay {
  position: absolute;
  top: 54px;
  right: 20px;
  width: 620px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 120px);
  background: rgba(10, 14, 23, 0.96);
  border: 1px solid rgba(0, 240, 255, 0.35);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 240, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  z-index: 9998;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
}

.stealth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(0, 240, 255, 0.2);
}

.brand-badge-wrap h2 {
  font-size: 13px;
  letter-spacing: 1.5px;
  margin: 4px 0 0;
  color: #ffffff;
  font-weight: 700;
}

.stealth-pill-badge {
  font-size: 9px;
  padding: 2px 6px;
  background: rgba(0, 240, 255, 0.15);
  border: 1px solid #00f0ff;
  border-radius: 3px;
  color: #00f0ff;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tabs-nav {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  padding: 3px;
  border-radius: 4px;
}

.tabs-nav button {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
}

.tabs-nav button.active {
  background: rgba(0, 240, 255, 0.2);
  color: #00f0ff;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.action-toast-banner {
  background: rgba(0, 240, 255, 0.2);
  border-bottom: 1px solid #00f0ff;
  color: #00f0ff;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  animation: pulse 1s infinite alternate;
}

.mesh-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
}

.service-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.service-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.service-name {
  font-size: 12px;
  font-weight: 700;
  color: #38bdf8;
}

.service-runtime {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 5px;
  border-radius: 3px;
  color: #cbd5e1;
}

.service-role {
  font-size: 10px;
  color: #94a3b8;
  margin: 0;
}

.service-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.metric-status.online, .metric-status.optimized, .metric-status.ready {
  color: #10b981;
  font-weight: 700;
}

.service-endpoints {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.endpoint-chip {
  font-size: 9px;
  color: #64748b;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stealth-view {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.stealth-metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stealth-stat-box {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 9px;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
}

.stat-value.highlight {
  color: #00f0ff;
}

.stat-value.positive {
  color: #10b981;
}

.fingerprint-details-card, .osint-targets-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 12px;
}

.fingerprint-details-card h3, .osint-targets-card h3 {
  font-size: 10px;
  letter-spacing: 1px;
  color: #94a3b8;
  margin: 0 0 8px;
}

.fp-code-block {
  font-size: 9px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px;
  border-radius: 4px;
  word-break: break-all;
  color: #a5f3fc;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fp-code-block p {
  margin: 0;
}

.targets-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.target-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 10px;
  border-radius: 4px;
}

.target-type {
  font-weight: 700;
  color: #38bdf8;
  width: 50px;
}

.target-badge {
  font-size: 9px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 700;
}

.stealth-action-bar {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.action-btn.cyan {
  background: rgba(0, 240, 255, 0.1);
  border-color: #00f0ff;
  color: #00f0ff;
}

.action-btn.cyan:hover {
  background: rgba(0, 240, 255, 0.25);
}

.action-btn.purple {
  background: rgba(168, 85, 247, 0.1);
  border-color: #a855f7;
  color: #c084fc;
}

.action-btn.purple:hover {
  background: rgba(168, 85, 247, 0.25);
}

.action-btn.amber {
  background: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
  color: #fbbf24;
}

.action-btn.amber:hover {
  background: rgba(245, 158, 11, 0.25);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
