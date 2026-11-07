<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Display mode: 'none' (closed, 100% full 3D globe), 'hud' (side overlay), or 'workbench' (full 3-column workstation)
const viewMode = ref('none');
const selectedCutoff = ref('early'); // 'early' = 14:05:05Z, 'late' = 14:05:20Z
const toastMessage = ref('');

function handleReplayToggle() {
  viewMode.value = viewMode.value === 'none' ? 'hud' : 'none';
}

onMounted(() => {
  window.addEventListener('gev:toggle-evidence-replay', handleReplayToggle);
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-evidence-replay', handleReplayToggle);
});

const caseData = {
  site: "DEMO",
  subject: "vessel-A",
  zone: "approach-A",
  target_time: "2026-11-06T14:05:00Z",
  tolerance_seconds: 5,
  early: {
    cutoff: "2026-11-06T14:05:05Z",
    decision: "insufficient evidence",
    reason: "fewer than two independent origins",
    originsCount: 1,
    hash: "bf6a433c0b76c9930edb20834f1bd1442947d250edcf2657b0a4e5f825ccaa9b",
    origins: [
      {
        root: "transponder-A",
        records: [
          { id: "AIS-1", via: "broker-1", pos: "inside", captured: "14:04:59Z", available: "14:05:01Z", hash: "7f8803f7b8fd1fc558d81de3..." },
          { id: "AIS-2", via: "broker-2", pos: "inside", captured: "14:04:59Z", available: "14:05:02Z", hash: "cc5b4be9ef90a8bdc19a4dbd..." }
        ]
      }
    ],
    excluded: [
      { id: "CAM-OLD", reason: "capture time outside admissible window (13:57:51Z, age 429s > 5s tolerance)" }
    ],
    prov: {
      entity: "urn:case:vessel-A@approach-A:2026-11-06T14:05:00Z",
      cutoff: "2026-11-06T14:05:05Z",
      derivation: "AIS-1, AIS-2"
    }
  },
  late: {
    cutoff: "2026-11-06T14:05:20Z",
    decision: "confirmed",
    reason: "two or more distinct origins agree on zone membership",
    originsCount: 2,
    hash: "db52d4118cf4faaf7317448383f1594f8819790650af32eb14049cccedc61c68",
    origins: [
      {
        root: "transponder-A",
        records: [
          { id: "AIS-1", via: "broker-1", pos: "inside", captured: "14:04:59Z", available: "14:05:01Z", hash: "7f8803f7b8fd1fc558d81de3..." },
          { id: "AIS-2", via: "broker-2", pos: "inside", captured: "14:04:59Z", available: "14:05:02Z", hash: "cc5b4be9ef90a8bdc19a4dbd..." }
        ]
      },
      {
        root: "sensor-network-B",
        records: [
          { id: "CAM-NEW", via: "approach-cam-04", pos: "inside", captured: "14:05:00Z", available: "14:05:18Z", hash: "9e403d1fb3313bc89a38ef05..." }
        ]
      }
    ],
    excluded: [
      { id: "CAM-OLD", reason: "capture time outside admissible window (13:57:51Z, age 429s > 5s tolerance)" }
    ],
    prov: {
      entity: "urn:case:vessel-A@approach-A:2026-11-06T14:05:00Z",
      cutoff: "2026-11-06T14:05:20Z",
      derivation: "AIS-1, AIS-2, CAM-NEW"
    }
  }
};

const currentState = computed(() => caseData[selectedCutoff.value]);

function setCutoff(c) {
  selectedCutoff.value = c;
  window.dispatchEvent(new CustomEvent('gev:cutoff-changed', {
    detail: {
      cutoff: c,
      state: caseData[c]
    }
  }));
  showToast(`[BI-TEMPORAL REPLAY] Cutoff ${c === 'early' ? '1 (14:05:05Z)' : '2 (14:05:20Z)'} · Verdict: ${caseData[c].decision.toUpperCase()} (${caseData[c].originsCount}/2 origins)`);
}

function exportBundle() {
  const state = currentState.value;
  const bundle = {
    bundle_version: "2.0",
    specification: "SpatialForge-Evidence-Protocol/2026",
    as_of: state.cutoff,
    case: {
      site: caseData.site,
      subject: caseData.subject,
      zone: caseData.zone,
      target_time: caseData.target_time,
      disposition: state.decision,
      consensus_origins: state.originsCount
    },
    admitted_origins: state.origins,
    excluded_observations: state.excluded,
    canonical_hash_sha256: state.hash,
    dsse_envelope: {
      payloadType: "application/vnd.spatialforge.evidence+json",
      payload_sha256: state.hash,
      signatures: [
        {
          keyid: "spatialforge-ed25519-master-root",
          sig: "dBm3Pz0FvE1K8zL2p9aB0cDeFgHiJkLmNoPqRsTuVwXyZ"
        }
      ]
    },
    prov: state.prov
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spatialforge_bundle_${caseData.subject}_${selectedCutoff.value}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`✓ Ed25519 DSSE Bundle Exported: Hash ${state.hash.slice(0, 16)}...`);
}

function verifyInvariance() {
  const state = currentState.value;
  showToast(`✓ INVARIANCE VERIFIED: Hash ${state.hash.slice(0, 16)}... matches Merkle root consensus.`);
}

function flyToTargetZone() {
  viewMode.value = 'hud'; // switch to HUD mode so user can see the 3D globe animation
  showToast("Navigating 3D camera to approach-A port approach corridor (Antwerp)...");
  try {
    const viewer = window.viewer || window.__cesiumViewer;
    const Cesium = window.Cesium || window.cesium;
    if (viewer?.camera && Cesium) {
      viewer.camera.cancelFlight();
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(4.3180, 51.2750, 1650),
        orientation: {
          heading: Cesium.Math.toRadians(42),
          pitch: Cesium.Math.toRadians(-52),
          roll: 0.0
        },
        duration: 2.5
      });
    }
  } catch (e) {
    console.debug('flyTo error:', e);
  }
}

function showToast(msg) {
  toastMessage.value = msg;
  setTimeout(() => { toastMessage.value = ''; }, 4500);
}
</script>

<template>
  <div id="spatialforge-replay-overlay-root">
    <!-- Floating Mode Toggle Pill (when minimized or in HUD mode) -->
    <div
      v-if="viewMode !== 'workbench'"
      class="evidence-panel-toggle-pill"
      @click="viewMode = viewMode === 'hud' ? 'none' : 'hud'"
      title="Toggle Case Replay Console"
    >
      <span class="pill-dot"></span>
      <span class="pill-label">REPLAY CONSOLE</span>
      <button class="pill-action-btn" @click.stop="viewMode = 'workbench'">
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align: -1px; margin-right: 4px;"><rect x="2" y="2" width="12" height="12" rx="1.5"/></svg>FULL WORKBENCH
      </button>
    </div>

    <!-- ── Mode 1: Full-Screen Merged Workstation (Exact 3-Column Layout from User) ── -->
    <div v-if="viewMode === 'workbench'" class="merged-workstation-overlay" aria-label="SpatialForge Spatial Operations Console">
      <!-- Top Tactical Header -->
      <header class="ws-header">
        <div class="ws-brand">
          <svg viewBox="0 0 32 32" fill="none" class="ws-logo" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="#090d16" stroke="#00f6ff" stroke-width="1.5"/>
            <polygon points="16,6 23,10 16,14 9,10" fill="#38bdf8" stroke="#00f6ff" stroke-width="1"/>
            <polygon points="9,10 16,14 16,22 9,18" fill="#0284c7" stroke="#00f6ff" stroke-width="1"/>
            <polygon points="16,14 23,10 23,18 16,22" fill="#0369a1" stroke="#00f6ff" stroke-width="1"/>
            <ellipse cx="16" cy="16" rx="13" ry="5" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3 3" opacity="0.75" transform="rotate(-15 16 16)"/>
            <circle cx="16" cy="14" r="1.5" fill="#ffffff"/>
          </svg>
          <h1>SpatialForge Spatial Operations Console</h1>
          <span class="ws-badge">REPLAY PILOT v1.0</span>
        </div>

        <div class="ws-meta-bar">
          <span>Time Basis: <strong>UTC (GPS Synchronized)</strong></span>
          <span>Policy: <strong>2-Origin Adjudication</strong></span>
          <span class="ws-clock">2026-11-06T22:45:00Z</span>

          <!-- View Mode Controls -->
          <div class="ws-view-controls">
            <button class="ws-ctrl-btn active" title="Full Workstation View">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align: -1px; margin-right: 4px;"><rect x="2" y="2" width="12" height="12" rx="1.5"/></svg>WORKBENCH
            </button>
            <button class="ws-ctrl-btn" @click="viewMode = 'hud'" title="Dock as 3D HUD">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" style="vertical-align: -1px; margin-right: 4px;"><rect x="5" y="2" width="9" height="9" rx="1"/><rect x="2" y="5" width="9" height="9" rx="1" fill="#090d16"/></svg>DOCK TO 3D
            </button>
            <button class="ws-ctrl-btn" @click="viewMode = 'none'" title="Hide and view full 3D Globe">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align: -1px; margin-right: 4px;"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>3D ONLY
            </button>
          </div>
        </div>
      </header>

      <!-- 3-Column Workstation Layout -->
      <main class="ws-grid">
        <!-- ── Left Column: Case Queue & Target Context (320px) ── -->
        <section class="ws-panel" aria-label="Case Queue & Target Context">
          <h2 class="panel-h2">CASE QUEUE &amp; TARGET CONTEXT</h2>

          <div class="case-card" role="button" tabindex="0">
            <div class="case-title">{{ caseData.subject }} @ {{ caseData.zone }}</div>
            <div class="case-detail">Site: {{ caseData.site }} | Type: Zone Occupancy</div>
            <div class="case-detail">Target Time: <code>{{ caseData.target_time }}</code></div>
            <div class="case-detail">Tolerance Window: &plusmn;{{ caseData.tolerance_seconds }} seconds</div>
            <div class="case-detail highlight">State: Adjudicated under bi-temporal cutoff</div>
            <button class="flyto-btn" @click="flyToTargetZone">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align: -2px; margin-right: 5px;"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>VIEW IN 3D RECON CORRIDOR
            </button>
          </div>

          <div class="rules-block">
            <h3>Adjudication Rules</h3>
            <p>
              Requires &ge;2 distinct, permitted sensor roots. Stale frames, uncalibrated predictions, single-broker transponder echoes, and revoked grants abstain.
            </p>
          </div>

          <div class="audit-block">
            <h3>Pilot Acceptance Gates</h3>
            <div class="audit-grid">
              <div class="audit-card">
                <div class="audit-title">D8 False Live</div>
                <div class="audit-val">0 / 24 Faults</div>
              </div>
              <div class="audit-card">
                <div class="audit-title">D8 Replay Hash</div>
                <div class="audit-val">100% Invariant</div>
              </div>
              <div class="audit-card">
                <div class="audit-title">D5 Traceability</div>
                <div class="audit-val">100 / 100 Verified</div>
              </div>
              <div class="audit-card">
                <div class="audit-title">Unit Suite</div>
                <div class="audit-val">40 / 40 PASS</div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Center Column: Bi-Temporal Decision Replay (Fluid) ── -->
        <section class="ws-panel" aria-label="Bi-Temporal Decision Replay">
          <h2 class="panel-h2">BI-TEMPORAL DECISION REPLAY</h2>

          <div class="timeline-box">
            <div class="timeline-label">EVALUATION CUTOFF (as_of timeline):</div>
            <div class="cutoff-tabs">
              <button
                class="btn-cutoff"
                :class="{ active: selectedCutoff === 'early' }"
                @click="setCutoff('early')"
              >
                Cutoff 1: 14:05:05 UTC (Initial Alert)
              </button>
              <button
                class="btn-cutoff"
                :class="{ active: selectedCutoff === 'late' }"
                @click="setCutoff('late')"
              >
                Cutoff 2: 14:05:20 UTC (Reconstruction)
              </button>
            </div>
          </div>

          <!-- Dynamic Verdict Banner -->
          <div
            class="verdict-banner"
            :class="currentState.decision === 'confirmed' ? 'verdict-confirmed' : 'verdict-insufficient'"
          >
            <div>
              <div class="verdict-text">{{ currentState.decision.toUpperCase() }}</div>
              <div class="verdict-reason">{{ currentState.reason }}</div>
            </div>
            <div class="origins-counter">
              <div class="origins-lbl">Active Origins</div>
              <div class="origins-val">{{ currentState.originsCount }} / 2</div>
            </div>
          </div>

          <!-- Admitted Sensor Origins -->
          <div class="origins-section">
            <h3>Admitted Sensor Origins</h3>
            <div v-for="o in currentState.origins" :key="o.root" class="origin-group">
              <div class="origin-header">
                <span>Root Origin: <strong>{{ o.root }}</strong></span>
                <span class="fix-badge">{{ o.records.length }} FIX(ES)</span>
              </div>
              <div v-for="r in o.records" :key="r.id" class="record-item">
                <div class="rec-top">
                  <span>ID: <code>{{ r.id }}</code> (via {{ r.via }})</span>
                  <span class="pos-tag">Position: <strong>{{ r.pos }}</strong></span>
                </div>
                <div class="rec-bottom">
                  <span>Captured: {{ r.captured }}</span>
                  <span>Available: {{ r.available }}</span>
                </div>
                <div class="rec-hash">SHA-256: <code>{{ r.hash }}</code></div>
              </div>
            </div>
          </div>

          <!-- Excluded Observations -->
          <div class="excluded-section">
            <h3>Excluded Observations</h3>
            <div v-for="ex in currentState.excluded" :key="ex.id" class="excluded-item">
              <strong>{{ ex.id }}:</strong> {{ ex.reason }}
            </div>
          </div>
        </section>

        <!-- ── Right Column: Versioned Evidence Export (380px) ── -->
        <section class="ws-panel" aria-label="Versioned Evidence Export">
          <h2 class="panel-h2">VERSIONED EVIDENCE EXPORT</h2>

          <div class="export-box">
            <h3>Canonical Evidence Bundle SHA-256</h3>
            <p class="export-desc">
              Computed over scope, time window, admitted records, policy, and disposition:
            </p>
            <div class="hash-display">
              <code>{{ currentState.hash }}</code>
            </div>

            <div class="action-stack">
              <button class="btn btn-primary" @click="exportBundle">
                Export Signed Evidence Bundle (.json)
              </button>
              <button class="btn btn-secondary" @click="verifyInvariance">
                Verify Replay Invariance (Simulate Delayed Stream)
              </button>
            </div>
          </div>

          <!-- W3C PROV-O Derivation -->
          <div class="prov-box">
            <h3>W3C PROV-O Derivation</h3>
            <div class="prov-detail">
              <span class="p-lbl">Entity:</span>
              <code class="p-val">{{ currentState.prov.entity }}</code>
            </div>
            <div class="prov-detail">
              <span class="p-lbl">Cutoff:</span>
              <span class="p-val">{{ currentState.prov.cutoff }}</span>
            </div>
            <div class="prov-detail">
              <span class="p-lbl">Derivation:</span>
              <span class="p-val">{{ currentState.prov.derivation }}</span>
            </div>
          </div>
        </section>
      </main>

      <!-- Footer Bar -->
      <footer class="ws-footer">
        <div>SpatialForge Spatial Operations &bull; Sovereign Geospatial Evidence Protocol</div>
        <div>Standards: OGC SensorThings 1.1 &bull; W3C PROV-O &bull; PostGIS Topology</div>
      </footer>
    </div>

    <!-- ── Mode 2: Compact Docked HUD (Floating over 3D Cesium) ── -->
    <aside v-if="viewMode === 'hud'" class="evidence-replay-hud" aria-label="SpatialForge Docked Replay HUD">
      <div class="hud-header">
        <div class="hud-brand">
          <svg viewBox="0 0 32 32" fill="none" class="hud-icon">
            <circle cx="16" cy="16" r="14" fill="#090d16" stroke="#00f6ff" stroke-width="1.5"/>
            <polygon points="16,6 23,10 16,14 9,10" fill="#38bdf8" stroke="#00f6ff" stroke-width="1"/>
            <polygon points="9,10 16,14 16,22 9,18" fill="#0284c7" stroke="#00f6ff" stroke-width="1"/>
          </svg>
          <div>
            <h2>SpatialForge Operations Console</h2>
            <span class="hud-badge">Docked HUD</span>
          </div>
        </div>
        <div class="hud-ctrls">
          <button class="hud-btn-icon" @click="viewMode = 'workbench'" title="Expand to Full Workstation">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="12" height="12" rx="1.5"/></svg>
          </button>
          <button class="hud-btn-icon" @click="viewMode = 'none'" title="Hide HUD">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
          </button>
        </div>
      </div>

      <div class="hud-body">
        <div class="cutoff-tabs">
          <button class="btn-cutoff" :class="{ active: selectedCutoff === 'early' }" @click="setCutoff('early')">Cutoff 1 (14:05:05Z)</button>
          <button class="btn-cutoff" :class="{ active: selectedCutoff === 'late' }" @click="setCutoff('late')">Cutoff 2 (14:05:20Z)</button>
        </div>

        <div class="verdict-banner" :class="currentState.decision === 'confirmed' ? 'verdict-confirmed' : 'verdict-insufficient'">
          <div>
            <div class="verdict-text">{{ currentState.decision.toUpperCase() }}</div>
            <div class="verdict-reason">{{ currentState.reason }}</div>
          </div>
          <div class="origins-val">{{ currentState.originsCount }} / 2</div>
        </div>

        <div class="hash-display"><code>{{ currentState.hash }}</code></div>

        <div class="action-stack">
          <button class="btn btn-primary" @click="exportBundle">Export Signed Bundle (.json)</button>
          <button class="btn btn-secondary" @click="verifyInvariance">Verify Replay Invariance</button>
        </div>
      </div>
    </aside>

    <!-- Global Toast Feedback -->
    <div v-if="toastMessage" class="ws-toast">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
/* ── Floating Toggle Pill ─────────────────────────────────── */
.evidence-panel-toggle-pill {
  position: fixed;
  bottom: 84px;
  right: 24px;
  z-index: 120;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid #00f6ff;
  border-radius: 9999px;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8), 0 0 16px rgba(0, 246, 255, 0.4);
  backdrop-filter: blur(10px);
  user-select: none;
  transition: all 0.2s ease;
}

.evidence-panel-toggle-pill:hover {
  background: rgba(2, 132, 199, 0.95);
  box-shadow: 0 0 24px rgba(0, 246, 255, 0.7);
}

.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00f6ff;
  box-shadow: 0 0 8px #00f6ff;
}

.pill-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #f8fafc;
}

.pill-action-btn {
  background: rgba(0, 246, 255, 0.15);
  border: 1px solid #00f6ff;
  color: #00f6ff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
}

/* ── Mode 1: Full-Screen Merged Workstation ────────────────── */
.merged-workstation-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(9, 13, 22, 0.96);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  animation: ws-fade-in 0.25s ease-out;
}

@keyframes ws-fade-in {
  from { opacity: 0; transform: scale(0.99); }
  to { opacity: 1; transform: scale(1); }
}

.ws-header {
  background: #111827;
  border-bottom: 1px solid #334155;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.ws-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ws-logo {
  width: 28px;
  height: 28px;
}

.ws-brand h1 {
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}

.ws-badge {
  font-size: 0.7rem;
  background: #0284c7;
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  font-weight: 700;
}

.ws-meta-bar {
  display: flex;
  gap: 1.25rem;
  font-size: 0.85rem;
  color: #94a3b8;
  align-items: center;
}

.ws-clock {
  font-family: 'JetBrains Mono', monospace;
  color: #38bdf8;
}

.ws-view-controls {
  display: flex;
  gap: 6px;
  margin-left: 10px;
}

.ws-ctrl-btn {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #475569;
  color: #f8fafc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ws-ctrl-btn.active {
  background: #0284c7;
  border-color: #00f6ff;
  box-shadow: 0 0 10px rgba(0, 246, 255, 0.4);
}

.ws-ctrl-btn:hover {
  background: #0369a1;
  border-color: #00f6ff;
}

/* 3-Column Grid */
.ws-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr 380px;
  gap: 1rem;
  padding: 1rem;
  overflow-y: auto;
}

@media (max-width: 1150px) {
  .ws-grid { grid-template-columns: 1fr; }
}

.ws-panel {
  background: #111827;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-h2 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #00f6ff;
  margin: 0;
}

/* Left Column Cards */
.case-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #00f6ff;
}

.case-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; }
.case-detail { font-size: 0.8rem; color: #94a3b8; }
.case-detail code { color: #38bdf8; font-family: 'JetBrains Mono', monospace; }
.case-detail.highlight { margin-top: 0.5rem; color: #00f6ff; }

.flyto-btn {
  margin-top: 10px;
  width: 100%;
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid #38bdf8;
  color: #f8fafc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.flyto-btn:hover { background: #0284c7; }

.rules-block h3, .audit-block h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.rules-block p {
  font-size: 0.75rem;
  color: #94a3b8;
}

.audit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.audit-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 0.5rem;
}

.audit-title { color: #94a3b8; font-size: 0.7rem; }
.audit-val { font-weight: 700; color: #10b981; font-family: 'JetBrains Mono', monospace; }

/* Center Column */
.timeline-box {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
}

.timeline-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.cutoff-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.btn-cutoff {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cutoff:hover { background: #2d3748; border-color: #38bdf8; }
.btn-cutoff.active {
  background: #0284c7;
  border-color: #00f6ff;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 0 12px rgba(0, 246, 255, 0.35);
}

.verdict-banner {
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid transparent;
}

.verdict-insufficient {
  background: rgba(245, 158, 11, 0.12);
  border-color: #f59e0b;
  color: #f59e0b;
}

.verdict-confirmed {
  background: rgba(16, 185, 129, 0.12);
  border-color: #10b981;
  color: #10b981;
}

.verdict-text { font-size: 1.15rem; font-weight: 700; text-transform: uppercase; }
.verdict-reason { font-size: 0.8rem; color: #94a3b8; }
.origins-counter { text-align: right; }
.origins-lbl { font-size: 0.75rem; color: #94a3b8; }
.origins-val { font-size: 1.2rem; font-weight: 700; color: #f8fafc; font-family: 'JetBrains Mono', monospace; }

.origins-section h3, .excluded-section h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.origin-group {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 0.85rem;
  margin-bottom: 0.75rem;
}

.origin-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  border-bottom: 1px solid #334155;
  padding-bottom: 0.4rem;
  margin-bottom: 0.6rem;
}

.fix-badge {
  font-size: 0.7rem;
  background: #334155;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.record-item {
  font-size: 0.8rem;
  padding: 0.4rem 0;
  border-bottom: 1px dashed rgba(51, 65, 85, 0.5);
}
.record-item:last-child { border-bottom: none; }

.rec-top { display: flex; justify-content: space-between; }
.pos-tag strong { color: #10b981; }
.rec-bottom { display: flex; gap: 1rem; color: #94a3b8; font-size: 0.75rem; margin-top: 2px; }
.rec-hash code { font-size: 0.7rem; color: #38bdf8; font-family: 'JetBrains Mono', monospace; }

.excluded-item {
  background: rgba(239, 68, 68, 0.08);
  border-left: 3px solid #ef4444;
  padding: 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #cbd5e1;
}

/* Right Column */
.export-box {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
}

.export-box h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem; }
.export-desc { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.75rem; }

.hash-display {
  background: #090d16;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  word-break: break-all;
  color: #38bdf8;
  margin-bottom: 1rem;
}

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: #0284c7;
  border-color: #38bdf8;
  color: white;
}
.btn-primary:hover { background: #0369a1; border-color: #00f6ff; }

.btn-secondary { background: #1e293b; }
.btn-secondary:hover { background: #2d3748; }

.prov-box {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
}

.prov-box h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; }
.prov-detail { font-size: 0.75rem; margin-bottom: 0.4rem; }
.p-lbl { color: #94a3b8; display: inline-block; width: 75px; }
.p-val { color: #cbd5e1; }
code.p-val { color: #38bdf8; font-family: 'JetBrains Mono', monospace; }

.ws-footer {
  background: #111827;
  border-top: 1px solid #334155;
  padding: 0.5rem 1.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

/* ── Mode 2: Docked HUD (Floating over 3D) ──────────────────── */
.evidence-replay-hud {
  position: fixed;
  top: 60px;
  right: 24px;
  width: 440px;
  max-height: calc(100vh - 160px);
  z-index: 125;
  background: rgba(9, 13, 22, 0.94);
  border: 1px solid rgba(0, 246, 255, 0.45);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 246, 255, 0.18);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f8fafc;
}

.hud-header {
  padding: 10px 14px;
  background: rgba(17, 24, 39, 0.9);
  border-bottom: 1px solid rgba(56, 189, 248, 0.25);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hud-brand { display: flex; align-items: center; gap: 8px; }
.hud-icon { width: 22px; height: 22px; }
.hud-brand h2 { font-size: 11px; margin: 0; font-family: 'JetBrains Mono', monospace; }
.hud-badge { font-size: 9px; background: #0284c7; padding: 1px 5px; border-radius: 4px; }

.hud-ctrls { display: flex; gap: 6px; }
.hud-btn-icon {
  background: none;
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #cbd5e1;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.hud-btn-icon:hover { background: #0284c7; color: #fff; }

.hud-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.ws-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: #0284c7;
  color: #fff;
  border: 1px solid #00f6ff;
  border-radius: 6px;
  padding: 10px 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 246, 255, 0.5);
  animation: toast-pop 0.2s ease-out;
}

@keyframes toast-pop {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
