<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { makeDraggable } from '../../dashboard/dashboardLayout.js';
import { SVG_ICONS } from '../../icons/engineeringIcons.js';

const isVisible = ref(false);
const isCollapsed = ref(false);
const activeSection = ref('space-native');
const searchQuery = ref('');
const panelRef = ref(null);
const headerDragRef = ref(null);
let cleanupDrag = null;

function setupDraggable() {
  if (cleanupDrag) cleanupDrag();
  if (panelRef.value && headerDragRef.value) {
    cleanupDrag = makeDraggable(
      panelRef.value,
      headerDragRef.value,
      'sovereign-docs-panel',
      { x: Math.max(20, (window.innerWidth - 760) / 2), y: 90 }
    );
  }
}

watch(isVisible, (val) => {
  if (val) {
    nextTick(() => setupDraggable());
  } else {
    if (cleanupDrag) cleanupDrag();
  }
});

function toggleDocs() {
  isVisible.value = !isVisible.value;
}

onMounted(() => {
  window.addEventListener('gev:toggle-documentation', toggleDocs);
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-documentation', toggleDocs);
  if (cleanupDrag) cleanupDrag();
});

const DOC_SECTIONS = [
  { id: 'space-native', title: 'Space-Native AI & LEO Mesh', icon: 'orbital' },
  { id: 'uncertainty', title: '3D Spatial Uncertainty', icon: 'vectorArrow' },
  { id: 'court-audit', title: 'Court-Admissible Evidence (DSSE)', icon: 'check' },
  { id: 'flight-sea', title: 'Flight Radar & Marine AIS', icon: 'speed' },
  { id: 'cityscapes', title: 'City Cameras & 3D Splats', icon: 'eye' },
  { id: 'microservices', title: 'Microservices & API Architecture', icon: 'chip' },
  { id: 'hotkeys', title: 'Keyboard Shortcuts & Controls', icon: 'search' },
];
</script>

<template>
  <div v-if="isVisible" ref="panelRef" id="sovereign-docs-panel" class="sovereign-docs-container" :class="{ collapsed: isCollapsed }">
    <!-- DRAG HEADER -->
    <div ref={headerDragRef} class="docs-header" title="Click and drag to customize window position">
      <div class="docs-header-left">
        <svg class="header-drag-handle" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor">
          <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
        </svg>
        <strong class="docs-title">SPATIALFORGE OPERATOR MANUAL</strong>
        <span class="docs-badge">SOVEREIGN ARCHITECTURE GUIDE</span>
      </div>
      <div class="docs-header-actions no-drag">
        <button class="docs-action-btn" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? 'Expand Manual' : 'Minimize to Header'">
          {{ isCollapsed ? '+' : '−' }}
        </button>
        <button class="docs-action-btn close" @click="isVisible = false" title="Close Documentation">
          ✕
        </button>
      </div>
    </div>

    <!-- MAIN BODY (HIDDEN WHEN COLLAPSED) -->
    <div v-if="!isCollapsed" class="docs-body">
      <!-- SIDEBAR NAV -->
      <aside class="docs-sidebar">
        <div class="docs-nav-list">
          <button
            v-for="sec in DOC_SECTIONS"
            :key="sec.id"
            class="docs-nav-btn"
            :class="{ active: activeSection === sec.id }"
            @click="activeSection = sec.id"
          >
            <span class="eng-icon-inline" v-html="SVG_ICONS[sec.icon] || SVG_ICONS.chip"></span>
            <span>{{ sec.title }}</span>
          </button>
        </div>
      </aside>

      <!-- CONTENT DISPLAY -->
      <main class="docs-content">
        <!-- SECTION 1: SPACE-NATIVE AI & LEO FEDERATED LEARNING -->
        <article v-if="activeSection === 'space-native'">
          <h3>Space-Native AI &amp; LEO Federated Learning Mesh</h3>
          <p class="lead">
            SpatialForge implements the world’s first decentralized on-orbit parameter training system, synchronizing 8-bit quantized neural gradients across satellite constellations via 100 Gbps optical Inter-Satellite Links (ISL).
          </p>

          <div class="doc-card">
            <h4>How to Trigger an Orbital Federated Training Round</h4>
            <ol>
              <li>Open the Starship Cockpit HUD (click <strong>STARSHIP &amp; STARLINK</strong> in the top tactical bar).</li>
              <li>Select the <strong>SPACE-NATIVE &amp; AUDIT</strong> tab on the right rail.</li>
              <li>Review the active constellation nodes: <em>Starlink LEO Mesh (#1042)</em>, <em>Sentinel-2A (#088)</em>, <em>PlanetScope (#312)</em>, <em>Airborne HAPS</em>, and <em>Port of Antwerp Ground Anchor</em>.</li>
              <li>Click <strong>TRIGGER LEO ASYNC FEDERATED ROUND</strong>.</li>
              <li>Observe the global FedAvg loss decay (e.g. from <code>0.0418</code> down to <code>0.0094</code>) and 99.2% gradient compression across the laser crosslink mesh.</li>
            </ol>
          </div>

          <div class="doc-card highlight">
            <h4>Why Space-Native Federated Learning Matters</h4>
            <p>
              Downlinking raw Earth Observation imagery or gigabytes of RF signals creates massive bottlenecks. Space-Native AI executes local edge inference directly on orbital satellites, sharing only lightweight model weights and gradient deltas.
            </p>
          </div>
        </article>

        <!-- SECTION 2: 3D SPATIAL UNCERTAINTY ELLIPSOIDS -->
        <article v-if="activeSection === 'uncertainty'">
          <h3>Dynamic 3D Spatial Uncertainty Ellipsoids</h3>
          <p class="lead">
            Telemetry is never a single dimensionless point. SpatialForge dynamically derives 3D spatial covariance matrices (&sigma;x &times; &sigma;y &times; &sigma;z) that expand when targets enter orbital blindspots and collapse upon multi-sensor fusion.
          </p>

          <div class="doc-card">
            <h4>Live 3D Globe Projection</h4>
            <ol>
              <li>In the <strong>SPACE-NATIVE &amp; AUDIT</strong> tab or the top tactical bar, click <strong>RENDER 3D UNCERTAINTY ELLIPSOIDS ON GLOBE</strong>.</li>
              <li>Navigate the 3D globe to inspect monitored vessels and flights:
                <ul>
                  <li><strong>Nominal (Multi-Sensor Confirmed):</strong> Rendered as a tight cyan glowing ellipsoid (&plusmn;14m &times; 9m &times; 5m) around verified targets like <em>CMA CGM Excellence</em>.</li>
                  <li><strong>Occluded (Dark Vessel / Spoof Warning):</strong> Dynamically expands up to &plusmn;520m in glowing red/amber when transponders go dark (e.g. <em>M/V Shadow Falcon</em> in the Baltic Sea).</li>
                </ul>
              </li>
              <li>Select any target to view exact semi-major, semi-minor, and vertical confidence volumes.</li>
            </ol>
          </div>
        </article>

        <!-- SECTION 3: COURT-ADMISSIBLE FORENSIC EVIDENCE (DSSE) -->
        <article v-if="activeSection === 'court-audit'">
          <h3>Court-Admissible Forensic Attestation (Ed25519 DSSE)</h3>
          <p class="lead">
            Designed for international maritime arbitration, environmental protection, and sovereign border defense compliant with <strong>ISO/IEC 27037:2012</strong> and <strong>Federal Rules of Evidence 902(14)</strong>.
          </p>

          <div class="doc-card">
            <h4>Generating &amp; Exporting Legal Evidence Bundles</h4>
            <ol>
              <li>Select a monitored vessel, aircraft, or critical facility in the 3D cockpit.</li>
              <li>Click <strong>SEAL WITH Ed25519 DSSE CONTRACT</strong>:
                <ul>
                  <li>The cryptographic enclave generates an in-toto compliant statement envelope (<code>application/vnd.in-toto+json</code>).</li>
                  <li>Computes a SHA-256 Merkle tree root consensus across all participating sensor logs.</li>
                  <li>Generates an Ed25519 digital signature with hardware security module verification.</li>
                </ul>
              </li>
              <li>Click <strong>EXPORT COURT EVIDENCE BUNDLE (.JSON)</strong> to download the complete, self-authenticating legal document.</li>
            </ol>
          </div>
        </article>

        <!-- SECTION 4: FLIGHT RADAR & MARITIME AIS -->
        <article v-if="activeSection === 'flight-sea'">
          <h3>Skyscanner-Style Flight Radar &amp; MarineTraffic AIS</h3>
          <p class="lead">
            Real-time ADS-B transponder decoding and global AIS kinematic tracking synchronized with live 3D Cesium trajectories.
          </p>

          <div class="doc-card">
            <h4>How to Track Flights and Ships</h4>
            <ul>
              <li>Click the <strong>FLIGHT &amp; SEA RADAR</strong> tab in the cockpit.</li>
              <li>Switch between <strong>COMMERCIAL FLIGHTS</strong> and <strong>GLOBAL MARITIME</strong>.</li>
              <li>Search by callsign, airline, destination airport, vessel name, or IMO number.</li>
              <li>Click <strong>FLY TO TARGET</strong> to vector the 3D camera into a direct follow-track orientation.</li>
            </ul>
          </div>
        </article>

        <!-- SECTION 5: CITY CAMERAS & 3D GAUSSIAN SPLATS -->
        <article v-if="activeSection === 'cityscapes'">
          <h3>Global Cityscape Cameras &amp; 3D Gaussian Splats</h3>
          <p class="lead">
            Live ground-truth verification combining ultra-HD traffic/webcam streams with photorealistic 3D Gaussian Splat reconstructions.
          </p>

          <div class="doc-card">
            <h4>Available Capital Centers</h4>
            <p>
              Includes Austin (Texas Capitol), London (Tower Bridge &amp; Thames), Tokyo (Shinjuku &amp; Shibuya), Paris (Eiffel Tower &amp; Seine), Kyiv (Maidan &amp; Dnipro), and Dubai (Burj Khalifa).
            </p>
            <p>Click <strong>FLY TO 3D GAUSSIAN RECON</strong> to transition the camera down to street level.</p>
          </div>
        </article>

        <!-- SECTION 6: MICROSERVICES & API ARCHITECTURE -->
        <article v-if="activeSection === 'microservices'">
          <h3>Microservices &amp; API Architecture</h3>
          <p class="lead">
            SpatialForge operates a multi-lingual, high-throughput microservices topology for sovereign edge deployment:
          </p>

          <div class="doc-card">
            <h4>Microservice Ports &amp; Services</h4>
            <table class="doc-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Port</th>
                  <th>Language</th>
                  <th>Functionality</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Core Gateway</strong></td>
                  <td><code>:8080</code></td>
                  <td>Go 1.26</td>
                  <td>Central ingress, reverse proxy, authentication, rate limiting.</td>
                </tr>
                <tr>
                  <td><strong>Evidence Audit Server</strong></td>
                  <td><code>:8090</code></td>
                  <td>Python 3.11</td>
                  <td>Ed25519 DSSE attestation, throughput latency benchmark (&lt;2.0s).</td>
                </tr>
                <tr>
                  <td><strong>3D Cockpit Client</strong></td>
                  <td><code>:5173</code></td>
                  <td>Vue 3 + Cesium</td>
                  <td>Photorealistic 3D digital twin GIS interface.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <!-- SECTION 7: KEYBOARD SHORTCUTS & CONTROLS -->
        <article v-if="activeSection === 'hotkeys'">
          <h3>Keyboard Shortcuts &amp; Cockpit Navigation</h3>
          <div class="doc-card">
            <table class="doc-table">
              <thead>
                <tr>
                  <th>Key / Action</th>
                  <th>Function</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>1</code></td><td>Set visual style: <strong>Normal (Photorealistic)</strong></td></tr>
                <tr><td><code>2</code></td><td>Set visual style: <strong>CRT (Retro Phosphor Scanlines)</strong></td></tr>
                <tr><td><code>3</code></td><td>Set visual style: <strong>NVG (Night Vision Intensification)</strong></td></tr>
                <tr><td><code>4</code></td><td>Set visual style: <strong>FLIR (Thermal Heat Map Contrast)</strong></td></tr>
                <tr><td><code>5</code></td><td>Set visual style: <strong>Anime (Cel-Shaded Outlines)</strong></td></tr>
                <tr><td><code>6</code></td><td>Set visual style: <strong>Noir (Monochrome Contrast)</strong></td></tr>
                <tr><td><code>`</code></td><td>Toggle frame-rate (FPS) readout</td></tr>
                <tr><td><strong>Left Click + Drag</strong></td><td>Rotate 3D globe</td></tr>
                <tr><td><strong>Scroll Wheel</strong></td><td>Zoom altitude in / out</td></tr>
                <tr><td><strong>Right Click + Drag</strong></td><td>Tilt camera pitch and heading</td></tr>
                <tr><td><strong>Panel Headers</strong></td><td>Click and drag to customize window positions anywhere</td></tr>
              </tbody>
            </table>
          </div>
        </article>
      </main>
    </div>
  </div>
</template>

<style scoped>
.sovereign-docs-container {
  position: fixed;
  width: 780px;
  max-width: 95vw;
  height: 580px;
  max-height: 85vh;
  background: rgba(10, 15, 30, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.2);
  backdrop-filter: blur(16px);
  z-index: 2100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  resize: both;
  min-width: 480px;
  min-height: 280px;
}

.sovereign-docs-container.collapsed {
  height: auto !important;
  resize: none !important;
}

.docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(56, 189, 248, 0.25);
  cursor: grab;
  user-select: none;
}

.docs-header:active {
  cursor: grabbing;
}

.docs-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-drag-handle {
  color: #38bdf8;
  opacity: 0.7;
}

.docs-title {
  font-size: 0.68rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.05em;
}

.docs-badge {
  font-size: 0.44rem;
  font-weight: 800;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid #38bdf8;
  color: #38bdf8;
}

.docs-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.docs-action-btn {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 0.6rem;
  font-weight: 700;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.docs-action-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border-color: #38bdf8;
}

.docs-action-btn.close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-color: #ef4444;
}

.docs-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.docs-sidebar {
  width: 220px;
  background: rgba(15, 23, 42, 0.7);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.6rem 0.4rem;
  overflow-y: auto;
}

.docs-nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.docs-nav-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  font-size: 0.52rem;
  font-weight: 700;
  padding: 0.45rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s ease;
}

.docs-nav-btn:hover {
  background: rgba(56, 189, 248, 0.1);
  color: #f1f5f9;
}

.docs-nav-btn.active {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.3));
  border-color: #38bdf8;
  color: #38bdf8;
  font-weight: 800;
}

.docs-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  color: #cbd5e1;
  font-size: 0.52rem;
  line-height: 1.5;
}

.docs-content h3 {
  font-size: 0.8rem;
  font-weight: 800;
  color: #38bdf8;
  margin-bottom: 0.4rem;
}

.docs-content .lead {
  font-size: 0.56rem;
  color: #94a3b8;
  margin-bottom: 0.8rem;
}

.doc-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.8rem;
}

.doc-card.highlight {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.05);
}

.doc-card h4 {
  font-size: 0.62rem;
  font-weight: 800;
  color: #f1f5f9;
  margin-bottom: 0.4rem;
}

.doc-card ol, .doc-card ul {
  padding-left: 1.2rem;
  margin-bottom: 0.4rem;
}

.doc-card li {
  margin-bottom: 0.35rem;
}

.doc-card code {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.4);
  color: #38bdf8;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  font-size: 0.48rem;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.48rem;
  margin-top: 0.4rem;
}

.doc-table th, .doc-table td {
  padding: 0.35rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.doc-table th {
  background: rgba(0, 0, 0, 0.4);
  color: #38bdf8;
  font-weight: 800;
}
</style>
