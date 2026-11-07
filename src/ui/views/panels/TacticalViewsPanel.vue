<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useDisplayStore } from '../../stores/display.js';
import { t } from '../../../i18n/index.js';
import { makeDraggable, resetDashboardLayout } from '../../dashboard/dashboardLayout.js';

const display = useDisplayStore();
const isOpen = ref(false);
const activeViewId = ref('austin-nadir');
const toastMessage = ref('');
const panelContainerRef = ref(null);
const headerDragRef = ref(null);
let cleanupDrag = null;

const TACTICAL_VIEWS = [
  {
    id: 'austin-nadir',
    title: 'Texas Capitol Nadir Recon',
    location: 'Austin, Texas',
    tag: 'URBAN NADIR',
    lat: 30.2747,
    lon: -97.7404,
    alt: 1180,
    heading: 180,
    pitch: -89.5,
    style: 'retro',
    desc: 'High-altitude orthogonal satellite surveillance of Texas Capitol dome, Great Walk & urban corridor.',
    iconKey: 'nadir'
  },
  {
    id: 'antwerp-approach',
    title: 'Port of Antwerp Approach-A',
    location: 'Antwerp, Belgium',
    tag: 'MARITIME ADJUDICATION',
    lat: 51.2750,
    lon: 4.3180,
    alt: 1650,
    heading: 42,
    pitch: -52,
    style: 'normal',
    desc: 'Bi-temporal evidence replay zone for vessel-A zone occupancy & multi-broker AIS correlation.',
    iconKey: 'maritime'
  },
  {
    id: 'cape-pad39a',
    title: 'SpaceX Pad 39A Launch Complex',
    location: 'Cape Canaveral, FL',
    tag: 'SPACE LAUNCH',
    lat: 28.6083,
    lon: -80.6041,
    alt: 1350,
    heading: 38,
    pitch: -58,
    style: 'normal',
    desc: 'Launch pad & crawlerway for SpaceX Starship/Falcon orbital trajectory insertions.',
    iconKey: 'rocket'
  },
  {
    id: 'hormuz-choke',
    title: 'Strait of Hormuz Chokepoint',
    location: 'Oman / Iran',
    tag: 'STRATEGIC CHOKEPOINT',
    lat: 26.5667,
    lon: 56.4500,
    alt: 35000,
    heading: 350,
    pitch: -65,
    style: 'surveillance',
    desc: 'Vital hydrocarbon shipping artery with live AIS tracking and electronic warfare detection.',
    iconKey: 'chokepoint'
  },
  {
    id: 'panama-locks',
    title: 'Miraflores Locks (Panama Canal)',
    location: 'Panama City, Panama',
    tag: 'TRANSIT LOCKS',
    lat: 8.9972,
    lon: -79.5931,
    alt: 1600,
    heading: 320,
    pitch: -54,
    style: 'normal',
    desc: 'Multi-sensor maritime locks with automated transponder gate occupancy validation.',
    iconKey: 'locks'
  },
  {
    id: 'suez-lake',
    title: 'Great Bitter Lake Convoy Grid',
    location: 'Suez Canal, Egypt',
    tag: 'CANAL TRANSIT',
    lat: 30.3333,
    lon: 32.3667,
    alt: 22000,
    heading: 340,
    pitch: -62,
    style: 'thermal',
    desc: 'Strategic convoy staging anchorage monitoring subsea telecommunication cable crossings.',
    iconKey: 'satellite'
  },
  {
    id: 'tokyo-cyber',
    title: 'Shinjuku Cyber Metropolis',
    location: 'Tokyo, Japan',
    tag: 'CYBER SENSOR GRID',
    lat: 35.6905,
    lon: 139.6995,
    alt: 950,
    heading: 25,
    pitch: -48,
    style: 'noir',
    desc: 'Ultra-dense skyscraper canyon with cyber telemetry and commuter transit surveillance.',
    iconKey: 'cyber'
  },
  {
    id: 'leo-terminator',
    title: 'Low Earth Orbit Terminator',
    location: 'Global Kinetic Orbit',
    tag: 'ORBITAL SURVEILLANCE',
    lat: 18.0000,
    lon: 40.0000,
    alt: 4500000,
    heading: 0,
    pitch: -88,
    style: 'normal',
    desc: 'High-altitude satellite reconnaissance track tracing atmospheric limb and day/night boundary.',
    iconKey: 'orbit'
  }
];

function togglePanel() {
  isOpen.value = !isOpen.value;
}

function activateView(v) {
  activeViewId.value = v.id;
  if (v.style) {
    try {
      display.act('setStyle', v.style);
    } catch (e) {
      console.debug('setStyle error:', e);
    }
  }

  const viewer = window.viewer;
  const Cesium = window.Cesium || window.cesium;

  if (viewer?.camera && Cesium) {
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(v.lon, v.lat, v.alt),
      orientation: {
        heading: Cesium.Math.toRadians(v.heading || 0),
        pitch: Cesium.Math.toRadians(v.pitch || -45),
        roll: 0.0
      },
      duration: 2.4
    });
  }

  // Auto-enable relevant layers for the selected tactical scenario
  if (v.id === 'antwerp-approach' || v.id === 'hormuz-choke' || v.id === 'panama-locks' || v.id === 'suez-lake') {
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'ais-live-vessels' } }));
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'military' } }));
  } else if (v.id === 'austin-nadir' || v.id === 'tokyo-cyber') {
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'flights' } }));
  } else if (v.id === 'cape-pad39a' || v.id === 'leo-terminator') {
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'satellites' } }));
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'rocket-launches' } }));
  }

  showToast(`[TACTICAL RECON] Active: ${v.title} · ${v.location}`);
}

function showToast(msg) {
  toastMessage.value = msg;
  setTimeout(() => { toastMessage.value = ''; }, 4000);
}

function toggleReplayConsole() {
  window.dispatchEvent(new CustomEvent('gev:toggle-evidence-replay'));
}

function toggleStealthIntel() {
  window.dispatchEvent(new CustomEvent('gev:toggle-stealth-intel'));
}

function toggleMissionRecorder() {
  window.dispatchEvent(new CustomEvent('gev:toggle-mission-recording'));
}

function handleResetLayout() {
  resetDashboardLayout();
  showToast('✓ Dashboard layout reset to default cockpit positions');
}

function setupDraggable() {
  if (cleanupDrag) cleanupDrag();
  if (panelContainerRef.value && headerDragRef.value) {
    cleanupDrag = makeDraggable(
      panelContainerRef.value,
      headerDragRef.value,
      'tactical-views-panel',
      { x: Math.max(20, Math.floor((window.innerWidth - 820) / 2)), y: 64 }
    );
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    nextTick(() => {
      setupDraggable();
    });
  } else {
    if (cleanupDrag) cleanupDrag();
  }
});

function handleGlobalToggle() {
  isOpen.value = !isOpen.value;
}

onMounted(() => {
  window.addEventListener('gev:toggle-tactical-views', handleGlobalToggle);
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-tactical-views', handleGlobalToggle);
  if (cleanupDrag) cleanupDrag();
});
</script>

<template>
  <div id="tactical-views-root">
    <!-- Quick Access Top Bar Trigger -->
    <div class="tactical-views-trigger-bar">
      <button
        class="tactical-trigger-btn"
        :class="{ active: isOpen }"
        @click="togglePanel"
        title="Toggle Unique Tactical Recon Views"
      >
        <span class="pulse-indicator"></span>
        <span class="trigger-icon">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="8" cy="8" r="6"/>
            <circle cx="8" cy="8" r="2" fill="currentColor"/>
            <line x1="8" y1="0" x2="8" y2="3"/>
            <line x1="8" y1="13" x2="8" y2="16"/>
            <line x1="0" y1="8" x2="3" y2="8"/>
            <line x1="13" y1="8" x2="16" y2="8"/>
          </svg>
        </span>
        <span class="trigger-text">TACTICAL VIEWS ({{ TACTICAL_VIEWS.length }})</span>
        <span class="trigger-chevron">{{ isOpen ? '▲' : '▼' }}</span>
      </button>
      <button
        class="tactical-trigger-btn replay-toggle-btn"
        @click="toggleReplayConsole"
        title="Toggle Bi-Temporal Evidence Replay & Case Adjudication Console"
      >
        <span class="pulse-indicator amber"></span>
        <span class="trigger-icon">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
            <line x1="8" y1="2" x2="8" y2="14"/>
            <line x1="2" y1="5" x2="14" y2="5"/>
            <path d="M4 5l-2 5h4L4 5zM12 5l-2 5h4l-2-5z"/>
            <line x1="5" y1="14" x2="11" y2="14"/>
          </svg>
        </span>
        <span class="trigger-text">REPLAY CONSOLE</span>
      </button>
      <button
        class="tactical-trigger-btn stealth-toggle-btn"
        @click="toggleStealthIntel"
        title="Toggle Multi-Service Mesh & Stealth Scraping HUD"
      >
        <span class="pulse-indicator green"></span>
        <span class="trigger-icon">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M8 1l6 2.5v5c0 4-3 6.5-6 7.5-3-1-6-3.5-6-7.5v-5L8 1z"/>
          </svg>
        </span>
        <span class="trigger-text">STEALTH INTEL</span>
      </button>
      <button
        class="tactical-trigger-btn rec-toggle-btn"
        @click="toggleMissionRecorder"
        title="Toggle Mission Recording & Picture-in-Picture Hub"
      >
        <span class="pulse-indicator red"></span>
        <span class="trigger-icon">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="3" width="8" height="10" rx="1.5"/>
            <polygon points="10 6 15 3 15 13 10 10" fill="currentColor"/>
          </svg>
        </span>
        <span class="trigger-text">REC & PIP</span>
      </button>
      <button
        class="tactical-trigger-btn reset-layout-btn"
        @click="handleResetLayout"
        title="Reset all draggable panels to default cockpit layout"
      >
        <span class="trigger-icon">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="2" y="2" width="5" height="5" rx="1"/>
            <rect x="9" y="2" width="5" height="5" rx="1"/>
            <rect x="2" y="9" width="5" height="5" rx="1"/>
            <rect x="9" y="9" width="5" height="5" rx="1"/>
          </svg>
        </span>
        <span class="trigger-text">RESET DOCK</span>
      </button>
    </div>

    <!-- Collapsible Tactical Carousel / Grid -->
    <transition name="tactical-fade">
      <aside v-if="isOpen" ref="panelContainerRef" class="tactical-views-container" aria-label="Tactical Reconnaissance Views">
        <div ref="headerDragRef" class="tactical-header">
          <div class="tactical-title-wrap">
            <svg class="header-drag-handle" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" style="vertical-align: -2px; margin-right: 6px; opacity: 0.7;">
              <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
              <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
            </svg>
            <span class="tactical-badge">SOVEREIGN RECON</span>
            <h2>UNIQUE OPERATIONAL PERSPECTIVES</h2>
          </div>
          <button class="tactical-close-btn no-drag" @click="isOpen = false" title="Close Panel">✕</button>
        </div>

        <div class="tactical-card-grid">
          <article
            v-for="v in TACTICAL_VIEWS"
            :key="v.id"
            class="tactical-card"
            :class="{ active: activeViewId === v.id }"
            @click="activateView(v)"
          >
            <div class="card-top">
              <span class="card-icon">
                <svg v-if="v.iconKey === 'nadir'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="14" height="14" rx="2"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="1" x2="10" y2="5"/><line x1="10" y1="15" x2="10" y2="19"/><line x1="1" y1="10" x2="5" y2="10"/><line x1="15" y1="10" x2="19" y2="10"/></svg>
                <svg v-else-if="v.iconKey === 'maritime'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="4" r="2.5"/><line x1="10" y1="6.5" x2="10" y2="17"/><line x1="6" y1="9" x2="14" y2="9"/><path d="M4 12c0 4 3 6 6 6s6-2 6-6"/></svg>
                <svg v-else-if="v.iconKey === 'rocket'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 2l3 5v5l-3-2-3 2V7l3-5z"/><path d="M7 12l-3 4 2 1 2-2M13 12l3 4-2 1-2-2"/><circle cx="10" cy="17" r="1.5" fill="currentColor"/></svg>
                <svg v-else-if="v.iconKey === 'chokepoint'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6c3 2 4-2 7 0s4-2 7 0M3 10c3 2 4-2 7 0s4-2 7 0M3 14c3 2 4-2 7 0s4-2 7 0"/></svg>
                <svg v-else-if="v.iconKey === 'locks'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 13l2-6h12l2 6H2z"/><rect x="7" y="4" width="6" height="3" fill="currentColor"/><line x1="10" y1="2" x2="10" y2="4"/></svg>
                <svg v-else-if="v.iconKey === 'satellite'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7"/><ellipse cx="10" cy="10" rx="7" ry="2.5"/><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>
                <svg v-else-if="v.iconKey === 'cyber'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="5" height="10"/><rect x="8" y="3" width="5" height="14"/><rect x="13" y="9" width="4" height="8"/><line x1="10.5" y1="1" x2="10.5" y2="3"/></svg>
                <svg v-else-if="v.iconKey === 'orbit'" viewBox="0 0 20 20" class="tactical-svg" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="6"/><path d="M2 10a8 8 0 0116 0" stroke-dasharray="2 2"/></svg>
              </span>
              <span class="card-tag">{{ v.tag }}</span>
              <span v-if="v.style !== 'normal'" class="card-style-badge">{{ v.style.toUpperCase() }}</span>
            </div>
            <h3 class="card-title">{{ v.title }}</h3>
            <div class="card-loc">{{ v.location }}</div>
            <p class="card-desc">{{ v.desc }}</p>
            <div class="card-telemetry">
              <span>{{ v.lat.toFixed(4) }}°, {{ v.lon.toFixed(4) }}°</span>
              <span class="card-alt">{{ v.alt >= 10000 ? `${(v.alt/1000).toFixed(0)}k` : v.alt }}m ALT</span>
            </div>
          </article>
        </div>
      </aside>
    </transition>

    <!-- Mini Feedback Toast -->
    <div v-if="toastMessage" class="tactical-toast">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
#tactical-views-root {
  position: absolute;
  top: 14px;
  right: 180px;
  z-index: 1000;
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.tactical-views-trigger-bar {
  display: flex;
  align-items: center;
}

.tactical-trigger-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(9, 13, 22, 0.82);
  border: 1px solid rgba(0, 246, 255, 0.4);
  color: #e0f2fe;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 246, 255, 0.15);
  backdrop-filter: blur(12px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tactical-trigger-btn:hover {
  background: rgba(14, 24, 40, 0.95);
  border-color: #00f6ff;
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 246, 255, 0.3);
  transform: translateY(-1px);
}

.tactical-trigger-btn.active {
  background: rgba(0, 246, 255, 0.15);
  border-color: #00f6ff;
  color: #00f6ff;
  box-shadow: 0 0 16px rgba(0, 246, 255, 0.4);
}

.pulse-indicator {
  width: 7px;
  height: 7px;
  background: #00f6ff;
  border-radius: 50%;
  box-shadow: 0 0 8px #00f6ff;
  animation: pulse-glow 2s infinite ease-in-out;
}

.pulse-indicator.amber {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
}

.pulse-indicator.green {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.pulse-indicator.red {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.tactical-views-container.panel-dragging {
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 246, 255, 0.45);
  border-color: #00f6ff;
}

.header-drag-handle {
  cursor: grab;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.2); }
}

.trigger-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.trigger-chevron {
  font-size: 8px;
  opacity: 0.7;
}

.tactical-views-container {
  position: fixed;
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1080px, 94vw);
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(8, 12, 20, 0.94);
  border: 1px solid rgba(0, 246, 255, 0.35);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.75), 0 0 32px rgba(0, 246, 255, 0.12);
  backdrop-filter: blur(20px);
  padding: 18px 22px;
  z-index: 1050;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 246, 255, 0.3) transparent;
}

.tactical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.tactical-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tactical-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  background: rgba(0, 246, 255, 0.18);
  color: #00f6ff;
  border: 1px solid rgba(0, 246, 255, 0.4);
  padding: 2px 7px;
  border-radius: 4px;
}

.tactical-header h2 {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #ffffff;
  margin: 0;
  text-transform: uppercase;
}

.tactical-close-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  font-size: 12px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tactical-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ffffff;
}

.tactical-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
  gap: 14px;
}

.tactical-card {
  background: rgba(14, 21, 33, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.tactical-card:hover {
  background: rgba(20, 32, 50, 0.85);
  border-color: rgba(0, 246, 255, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 246, 255, 0.2);
}

.tactical-card.active {
  background: rgba(0, 246, 255, 0.1);
  border-color: #00f6ff;
  box-shadow: 0 0 16px rgba(0, 246, 255, 0.3);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: rgba(0, 246, 255, 0.08);
  border: 1px solid rgba(0, 246, 255, 0.25);
  color: #00f6ff;
  box-shadow: inset 0 0 6px rgba(0, 246, 255, 0.05);
}

.tactical-svg {
  width: 15px;
  height: 15px;
}

.card-tag {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.card-style-badge {
  font-size: 8px;
  font-weight: 800;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.14);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: auto;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.card-loc {
  font-size: 10.5px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.card-desc {
  font-size: 10px;
  line-height: 1.4;
  color: #cbd5e1;
  opacity: 0.85;
  margin: 0 0 12px 0;
  flex-grow: 1;
}

.card-telemetry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #64748b;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 8px;
}

.card-alt {
  color: #38bdf8;
  font-weight: 600;
}

.tactical-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(9, 13, 22, 0.92);
  border: 1px solid #00f6ff;
  color: #00f6ff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 8px 20px;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 246, 255, 0.3);
  backdrop-filter: blur(12px);
  pointer-events: none;
  animation: toast-in 0.25s ease-out;
  z-index: 2000;
}

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.tactical-fade-enter-active,
.tactical-fade-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.tactical-fade-enter-from,
.tactical-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.98);
}
</style>

