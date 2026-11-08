<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  STARBASE_LOCATION,
  MISSION_PHASES,
  SHOWCASE_TOTAL_SECONDS,
  showcaseToMissionTime,
  calculateStarshipTelemetry,
  formatMissionTime,
} from '../../../layers/starship/starshipMission.js';
import {
  STARLINK_THEATERS,
  calculateStarlinkBeams,
} from '../../../layers/starship/starlinkConnectivity.js';
import {
  detectMobileProviders,
  MEDIA_PROVIDERS,
} from '../../../layers/starship/mobileMediaRadar.js';
import { createStarshipScene } from '../../../layers/starship/starshipScene.js';
import {
  runAutonomousSitrep,
  executeFindAndFly,
  simulateGridOutageAndFallback,
  CRITICAL_INFRASTRUCTURE_REGISTRY,
  flyToTarget,
} from '../../../agent/geoAiExecutive.js';

const props = defineProps({
  visible: { type: Boolean, default: true },
});

const emit = defineEmits(['close']);

// Mission and Showcase state
const isShowcaseMode = ref(true); // 36-second takeoff and catch showcase loop by default!
const showcaseSeconds = ref(0);
const isCinematicView = ref(false); // Collapses side HUDs so globe backdrop takes center stage
const missionTimeS = ref(-5);
const isPlaying = ref(true);
const playbackSpeed = ref(1.0);
const selectedCamMode = ref('AUTO_DIRECTOR');
const activeTab = ref('telemetry'); // telemetry, starlink, media

// Telemetry computed
const telemetry = computed(() => calculateStarshipTelemetry(missionTimeS.value));

// Starlink state
const starlinkData = computed(() => calculateStarlinkBeams());
const activeTheater = ref(STARLINK_THEATERS[0]);

// Mobile detection
const mobileInfo = computed(() =>
  detectMobileProviders(telemetry.value.ship.latitude, telemetry.value.ship.longitude)
);

let animFrame = null;
let lastTick = performance.now();
let sceneController = null;

function tick() {
  if (isPlaying.value) {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    if (isShowcaseMode.value) {
      showcaseSeconds.value = (showcaseSeconds.value + dt * playbackSpeed.value) % SHOWCASE_TOTAL_SECONDS;
      missionTimeS.value = showcaseToMissionTime(showcaseSeconds.value);
    } else {
      missionTimeS.value += dt * playbackSpeed.value;
      if (missionTimeS.value > 660) {
        missionTimeS.value = 660;
        isPlaying.value = false;
      }
    }
  } else {
    lastTick = performance.now();
  }

  // Update 3D scene
  if (sceneController) {
    sceneController.update(telemetry.value);
  }

  animFrame = requestAnimationFrame(tick);
}

function setPhase(phase) {
  isShowcaseMode.value = false; // Switch to interactive manual timeline when clicking phase
  missionTimeS.value = phase.timeStart;
  if (phase.id === 'chopstick_catch') {
    setCamera('CHOPSTICK_CAM');
  } else if (phase.id === 'liftoff') {
    setCamera('TOWER_CAM');
  } else if (phase.id === 'seco' || phase.id === 'starlink_deploy') {
    setCamera('SHIP_EARTHCAM');
  }
}

function jumpToCatch() {
  isShowcaseMode.value = false;
  missionTimeS.value = 408; // 7 seconds before Mechazilla catch
  setCamera('CHOPSTICK_CAM');
  isPlaying.value = true;
}

function toggleShowcase() {
  isShowcaseMode.value = !isShowcaseMode.value;
  if (isShowcaseMode.value) {
    showcaseSeconds.value = 0;
    selectedCamMode.value = 'AUTO_DIRECTOR';
    if (sceneController) sceneController.setCameraMode('AUTO_DIRECTOR');
  }
}

function toggleCinematicView() {
  isCinematicView.value = !isCinematicView.value;
}

function setCamera(mode) {
  selectedCamMode.value = mode;
  if (sceneController) {
    sceneController.setCameraMode(mode);
  }
}

function togglePlay() {
  isPlaying.value = !isPlaying.value;
  lastTick = performance.now();
}

function resetMission() {
  if (isShowcaseMode.value) {
    showcaseSeconds.value = 0;
  }
  missionTimeS.value = -5;
  isPlaying.value = true;
  setCamera('AUTO_DIRECTOR');
}

function openMedia(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function toggleLayer(layerId) {
  window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: layerId } }));
}

// AI Situational Intelligence & Infrastructure State
const sitrepData = ref(null);
const isGeneratingSitrep = ref(false);
const searchQuery = ref('');
const searchFeedback = ref('');
const gridSimulationResult = ref(null);

async function handleGenerateSitrep() {
  isGeneratingSitrep.value = true;
  sitrepData.value = null;
  try {
    sitrepData.value = await runAutonomousSitrep(telemetry.value.ship);
  } catch (err) {
    console.error('Sitrep error:', err);
  } finally {
    isGeneratingSitrep.value = false;
  }
}

async function handleSearch() {
  if (!searchQuery.value) return;
  const res = await executeFindAndFly(searchQuery.value);
  searchFeedback.value = res.message;
  if (res.target) {
    searchQuery.value = res.target.name;
  }
  setTimeout(() => { searchFeedback.value = ''; }, 5000);
}

function handleFlyTo(item) {
  if (item.category === 'datacenter') {
    toggleLayer('local-datacenters');
  } else if (item.category === 'energy_dam') {
    toggleLayer('local-dams');
  } else if (item.category === 'subsea_cable') {
    toggleLayer('telegeography-submarine-cables');
  }
  flyToTarget(item.lat, item.lon, item.alt, item.heading, item.pitch);
  searchFeedback.value = `Vectoring 3D camera to ${item.name}`;
  setTimeout(() => { searchFeedback.value = ''; }, 4000);
}

function handleSimulateGridFailure(name = 'Frankfurt') {
  gridSimulationResult.value = simulateGridOutageAndFallback(name);
}

onMounted(() => {
  // Connect to live Cesium viewer
  if (window.viewer) {
    try {
      sceneController = createStarshipScene(window.viewer);
      sceneController.setCameraMode(selectedCamMode.value);
    } catch (err) {
      console.warn('[Starship] Scene init error:', err);
    }
  }
  animFrame = requestAnimationFrame(tick);
});

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame);
  if (sceneController) sceneController.destroy();
});
</script>

<template>
  <div v-if="props.visible" id="starship-cockpit-overlay" class="starship-overlay-root">
    <!-- TOP TACTICAL HEADER -->
    <header class="starship-top-header">
      <div class="starship-brand">
        <span class="starship-dot-live"></span>
        <strong class="starship-title">SPACEX STARSHIP FLIGHT 5 & 6</strong>
        <span class="starship-subtitle">MECHAZILLA CATCH & STARLINK LEO DEPLOY</span>
      </div>

      <!-- SHOWCASE MODE SWITCHER & CINEMATIC TOGGLE -->
      <div class="header-action-group">
        <button
          class="mode-pill-btn"
          :class="{ active: isShowcaseMode }"
          @click="toggleShowcase()"
          title="Toggle 36-Second Continuous Takeoff & Catch Showcase"
        >
          {{ isShowcaseMode ? '🎬 36S SHOWCASE LOOP' : '⏱ MANUAL CLOCK' }}
        </button>

        <button
          class="mode-pill-btn cinematic-pill"
          :class="{ active: isCinematicView }"
          @click="toggleCinematicView()"
          title="Toggle Cinematic Mode: Keep Full 3D Globe Backdrop Clear"
        >
          {{ isCinematicView ? '👁 GLOBE VIEW' : '📊 FULL HUD' }}
        </button>
      </div>

      <!-- MISSION MILESTONE TIMELINE -->
      <div class="starship-milestones-track" v-if="!isCinematicView">
        <button
          v-for="phase in MISSION_PHASES"
          :key="phase.id"
          class="milestone-chip"
          :class="{
            'active-phase': telemetry.phase.id === phase.id,
            'completed-phase': missionTimeS > phase.timeEnd,
          }"
          :title="phase.description"
          @click="setPhase(phase)"
        >
          {{ phase.name }}
        </button>
      </div>

      <button class="starship-close-btn" type="button" @click="emit('close')" title="Exit Starship Mission">×</button>
    </header>

    <!-- MAIN COCKPIT VIEWPORT -->
    <div class="starship-main-hud" :class="{ 'cinematic-view': isCinematicView }">
      <!-- LEFT HUD: VEHICLE TELEMETRY -->
      <aside class="starship-telemetry-panel" v-if="!isCinematicView">
        <div class="hud-box">
          <div class="hud-box-header">
            <span>FLIGHT DYNAMICS</span>
            <span class="hud-status-badge">{{ telemetry.phase.name }}</span>
          </div>

          <!-- PRIMARY GAUGES -->
          <div class="hud-gauges-grid">
            <div class="gauge-card">
              <span class="gauge-label">SPEED</span>
              <div class="gauge-val-group">
                <span class="gauge-number">{{ telemetry.booster.caught ? telemetry.ship.speedKmh : telemetry.booster.speedKmh }}</span>
                <span class="gauge-unit">KM/H</span>
              </div>
              <span class="gauge-sub">{{ telemetry.booster.caught ? telemetry.ship.speedMach : telemetry.booster.speedMach }} MACH</span>
            </div>

            <div class="gauge-card">
              <span class="gauge-label">ALTITUDE</span>
              <div class="gauge-val-group">
                <span class="gauge-number">{{ telemetry.booster.caught ? telemetry.ship.altitudeKm : telemetry.booster.altitudeKm }}</span>
                <span class="gauge-unit">KM</span>
              </div>
              <span class="gauge-sub">{{ telemetry.booster.caught ? (telemetry.ship.altitudeM).toFixed(0) : (telemetry.booster.altitudeM).toFixed(0) }} M</span>
            </div>
          </div>

          <!-- STAGE ENGINE CLUSTERS -->
          <div class="stage-engines-section">
            <div class="engine-cluster-row">
              <span class="cluster-name">SUPER HEAVY (33 RAPTORS)</span>
              <span class="cluster-val">{{ telemetry.booster.activeEngines }} ACTIVE ({{ telemetry.booster.throttlePct }}%)</span>
            </div>
            <div class="engine-bar-bg">
              <div class="engine-bar-fill" :style="{ width: `${telemetry.booster.throttlePct}%` }"></div>
            </div>

            <div class="engine-cluster-row" style="margin-top: 0.6rem;">
              <span class="cluster-name">STARSHIP (6 RAPTORS)</span>
              <span class="cluster-val">{{ telemetry.ship.activeEngines }} ACTIVE ({{ telemetry.ship.throttlePct }}%)</span>
            </div>
            <div class="engine-bar-bg">
              <div class="engine-bar-fill ship-fill" :style="{ width: `${telemetry.ship.throttlePct}%` }"></div>
            </div>
          </div>

          <!-- MECHAZILLA CATCH RADAR -->
          <div class="mechazilla-radar-card" :class="{ 'catch-confirmed': telemetry.mechazilla.clampLocked }">
            <div class="radar-header">
              <span class="radar-title">MECHAZILLA CATCH TOWER</span>
              <span class="radar-badge" :class="telemetry.mechazilla.status">
                {{ telemetry.mechazilla.status }}
              </span>
            </div>
            <div class="radar-specs">
              <div class="spec-row">
                <span>TOWER HEIGHT:</span>
                <strong>146 M</strong>
              </div>
              <div class="spec-row">
                <span>CHOPSTICK ARMS:</span>
                <strong>{{ telemetry.mechazilla.clampLocked ? 'CLAMP LOCKED' : `${telemetry.mechazilla.chopstickAngleDeg}° ANGLE` }}</strong>
              </div>
              <div class="spec-row">
                <span>PIN ZONE STATUS:</span>
                <strong :style="{ color: telemetry.mechazilla.clampLocked ? '#22c55e' : telemetry.mechazilla.pinContact ? '#eab308' : '#38bdf8' }">
                  {{ telemetry.mechazilla.clampLocked ? 'BOOSTER CAPTURED' : telemetry.mechazilla.pinContact ? 'PIN ENGAGED' : 'ALIGNING' }}
                </strong>
              </div>
            </div>

            <button class="jump-catch-btn" type="button" @click="jumpToCatch()">
              ⚡ JUMP TO CHOPSTICK CATCH
            </button>
          </div>
        </div>
      </aside>

      <!-- CENTER BOTTOM: MISSION CONTROL BAR -->
      <footer class="starship-center-controls">
        <div class="mission-clock-display">
          <span class="mission-clock">{{ telemetry.missionTimeString }}</span>
          <span class="mission-phase-label">{{ telemetry.phase.description }}</span>
        </div>

        <!-- PLAYBACK SCRUBBER -->
        <div class="scrubber-row">
          <button class="ctrl-btn" type="button" @click="togglePlay()">
            {{ isPlaying ? 'PAUSE' : 'PLAY' }}
          </button>
          <button class="ctrl-btn" type="button" @click="resetMission()">RESET</button>
          <input
            type="range"
            min="-30"
            max="660"
            step="1"
            class="starship-scrubber"
            v-model.number="missionTimeS"
          />
          <div class="speed-selector">
            <button
              v-for="spd in [1, 2, 5, 10]"
              :key="spd"
              class="speed-btn"
              :class="{ active: playbackSpeed === spd }"
              @click="playbackSpeed = spd"
            >
              {{ spd }}x
            </button>
          </div>
        </div>

        <!-- MULTI-CAM SELECTOR -->
        <div class="camera-director-dock">
          <span class="cam-label">CAM:</span>
          <button
            v-for="cam in [
              { id: 'AUTO_DIRECTOR', name: 'AUTO DIRECTOR' },
              { id: 'TOWER_CAM', name: 'TOWER CAM' },
              { id: 'BOOSTER_ROCKETCAM', name: 'ROCKETCAM' },
              { id: 'SHIP_EARTHCAM', name: 'SHIP EARTHCAM' },
              { id: 'CHOPSTICK_CAM', name: 'CHOPSTICKS' },
              { id: 'CHASE_DRONE_CAM', name: 'CHASE DRONE' },
              { id: 'ORBIT_VIEW', name: 'ORBIT 3D' },
              { id: 'FREE_ORBIT', name: 'FREE GLOBE' },
            ]"
            :key="cam.id"
            class="cam-btn"
            :class="{ active: selectedCamMode === cam.id }"
            @click="setCamera(cam.id)"
          >
            {{ cam.name }}
          </button>
        </div>
      </footer>

      <!-- RIGHT HUD: STARLINK & MEDIA RADAR -->
      <aside class="starship-right-panel" v-if="!isCinematicView">
        <div class="right-tabs-nav">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'telemetry' }"
            @click="activeTab = 'telemetry'"
          >
            CONNECTIVITY
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'infra' }"
            @click="activeTab = 'infra'"
          >
            INFRA & ENERGY
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'media' }"
            @click="activeTab = 'media'"
          >
            LIVE MEDIA
          </button>
        </div>

        <!-- TAB 1: STARLINK & MOBILE CARRIER RADAR -->
        <div v-if="activeTab === 'telemetry'" class="tab-content">
          <div class="starlink-card">
            <div class="starlink-card-header">
              <span class="starlink-logo">🛰️ STARLINK SPACE MESH</span>
              <span class="starlink-badge-live">LIVE LEO</span>
            </div>

            <div class="starlink-metrics">
              <div class="metric-col">
                <span class="metric-title">PING</span>
                <strong class="metric-num">{{ activeTheater.pingMs }} ms</strong>
              </div>
              <div class="metric-col">
                <span class="metric-title">DOWNLINK</span>
                <strong class="metric-num">{{ activeTheater.downlinkMbps }} Mbps</strong>
              </div>
              <div class="metric-col">
                <span class="metric-title">UPLINK</span>
                <strong class="metric-num">{{ activeTheater.uplinkMbps }} Mbps</strong>
              </div>
            </div>

            <div class="theater-select-group">
              <label class="theater-lbl">TACTICAL THEATER:</label>
              <select class="theater-dropdown" v-model="activeTheater">
                <option v-for="th in STARLINK_THEATERS" :key="th.id" :value="th">
                  {{ th.name }} ({{ th.activeTerminals.toLocaleString() }} terminals)
                </option>
              </select>
            </div>
            <p class="theater-note">{{ activeTheater.notes }}</p>
          </div>

          <!-- DETECTED MOBILE CARRIERS -->
          <div class="mobile-carriers-card">
            <div class="carrier-header">
              <span>DETECTED MOBILE NETWORKS</span>
              <span class="country-pill">{{ mobileInfo.detectedCountry }}</span>
            </div>
            <div class="carrier-list">
              <div
                v-for="carrier in mobileInfo.carriers"
                :key="carrier.name"
                class="carrier-item"
              >
                <div class="carrier-left">
                  <strong>{{ carrier.name }}</strong>
                  <small>{{ carrier.tech }} · MCC: {{ carrier.mcc }}-{{ carrier.mnc }}</small>
                </div>
                <div class="carrier-right">
                  <span class="d2c-badge" v-if="carrier.directToCellReady">STARLINK D2C</span>
                  <span class="carrier-status">{{ carrier.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: CRITICAL INFRASTRUCTURE, ENERGY SOURCES & AI EXECUTIVES -->
        <div v-if="activeTab === 'infra'" class="tab-content">
          <!-- AI AUTONOMOUS SITREP ENGINE -->
          <div class="infra-card ai-sitrep-card">
            <div class="infra-card-header">
              <span class="infra-title">🤖 AI AUTONOMOUS SITUATION BRIEFING</span>
              <span class="infra-badge-count ai-badge">REAL-TIME INTEL</span>
            </div>
            <p class="infra-desc">Multi-model neural assessment synthesizing current coordinates, active Starlink LEO beams, mobile carrier mesh, and critical compute nodes.</p>
            <div class="infra-action-row">
              <button
                class="infra-toggle-btn ai-btn"
                type="button"
                :disabled="isGeneratingSitrep"
                @click="handleGenerateSitrep"
              >
                {{ isGeneratingSitrep ? '⚡ ANALYZING SENSOR MATRIX...' : '⚡ RUN AUTONOMOUS AI SITREP' }}
              </button>
            </div>

            <!-- SITREP REPORT MODAL / READOUT -->
            <div v-if="sitrepData" class="sitrep-report-box">
              <div class="sitrep-meta">
                <span class="sitrep-model">MODEL: {{ sitrepData.model }}</span>
                <span class="sitrep-time">COORD: {{ sitrepData.lat.toFixed(2) }}°, {{ sitrepData.lon.toFixed(2) }}°</span>
              </div>
              <pre class="sitrep-text">{{ sitrepData.report }}</pre>
            </div>
          </div>

          <!-- NATURAL LANGUAGE "FIND & FLY" SPATIAL ENGINE -->
          <div class="infra-card">
            <div class="infra-card-header">
              <span class="infra-title">🎯 NATURAL LANGUAGE "FIND & FLY"</span>
              <span class="infra-badge-count">SEMANTIC SEARCH</span>
            </div>
            <div class="infra-search-row">
              <input
                type="text"
                class="infra-search-input"
                placeholder="Find datacenter, dam, cable, city..."
                v-model="searchQuery"
                @keydown.enter="handleSearch"
              />
              <button class="infra-search-btn" type="button" @click="handleSearch">FLY ↗</button>
            </div>
            <p v-if="searchFeedback" class="search-feedback-msg">{{ searchFeedback }}</p>
            <div class="quick-chips-row">
              <button
                v-for="chip in [
                  { label: 'FRA1 (77 MW)', query: 'FRA1' },
                  { label: 'Ashburn AWS', query: 'Ashburn' },
                  { label: 'Google Inzai', query: 'Inzai' },
                  { label: 'Dnipro Hydro', query: 'Dnipro' },
                  { label: 'Hoover Dam', query: 'Hoover' },
                  { label: 'Marseille Cables', query: 'Marseille' }
                ]"
                :key="chip.label"
                class="chip-btn"
                @click="searchQuery = chip.query; handleSearch()"
              >
                {{ chip.label }}
              </button>
            </div>
          </div>

          <!-- DATACENTER LAYER SECTION -->
          <div class="infra-card">
            <div class="infra-card-header">
              <span class="infra-title">🏢 HYPERSCALE DATA CENTERS</span>
              <span class="infra-badge-count">4,300+ MAPPED</span>
            </div>
            <p class="infra-desc">Global AI compute clusters, colocation campuses (Equinix, Digital Realty, AWS, Google Cloud, Azure) with verified power draw.</p>
            <div class="infra-action-row">
              <button class="infra-toggle-btn" type="button" @click="toggleLayer('local-datacenters')">
                📡 TOGGLE 4,300+ DATA CENTERS
              </button>
            </div>
            <div class="infra-sample-list">
              <div
                v-for="item in CRITICAL_INFRASTRUCTURE_REGISTRY.filter(i => i.category === 'datacenter').slice(0, 3)"
                :key="item.id"
                class="infra-sample-item clickable"
                @click="handleFlyTo(item)"
                title="Click to fly 3D camera to this data center"
              >
                <span class="sample-dot blue"></span>
                <span class="sample-name">{{ item.name }}</span>
                <span class="sample-loc">{{ item.city }} ↗</span>
              </div>
            </div>
          </div>

          <!-- ENERGY SOURCES & POWER GRID SECTION -->
          <div class="infra-card">
            <div class="infra-card-header">
              <span class="infra-title">⚡ ENERGY SOURCES & POWER GRID</span>
              <span class="infra-badge-count energy">500+ DAMS & GRIDS</span>
            </div>
            <p class="infra-desc">Hydroelectric generating stations, satellite radiative heat (FIRMS MW), substations, and global subsea fiber cables.</p>
            <div class="infra-action-col">
              <button class="infra-toggle-btn energy" type="button" @click="toggleLayer('local-dams')">
                🌊 TOGGLE DAMS & HYDRO PLANTS
              </button>
              <button class="infra-toggle-btn cables" type="button" @click="toggleLayer('telegeography-submarine-cables')">
                🌐 TOGGLE SUBSEA FIBER CABLES
              </button>
            </div>
            <div class="infra-sample-list">
              <div
                v-for="item in CRITICAL_INFRASTRUCTURE_REGISTRY.filter(i => i.category === 'energy_dam' || i.category === 'subsea_cable').slice(0, 3)"
                :key="item.id"
                class="infra-sample-item clickable"
                @click="handleFlyTo(item)"
                title="Click to fly 3D camera to this energy/cable facility"
              >
                <span class="sample-dot" :class="item.category === 'energy_dam' ? 'green' : 'purple'"></span>
                <span class="sample-name">{{ item.name }}</span>
                <span class="sample-loc">{{ item.city }} ↗</span>
              </div>
            </div>
          </div>

          <!-- GRID BLACKOUT & SATELLITE FAILOVER SIMULATOR -->
          <div class="infra-card">
            <div class="infra-card-header">
              <span class="infra-title">💥 GRID OUTAGE & D2C FAILOVER SIMULATOR</span>
              <span class="infra-badge-count danger">STRESS TEST</span>
            </div>
            <p class="infra-desc">Simulates loss of 110kV transmission feed: models data center UPS depletion and autonomous handover to Starlink Direct-to-Cell LEO mesh.</p>
            <div class="infra-action-row">
              <button class="infra-toggle-btn danger-btn" type="button" @click="handleSimulateGridFailure('Frankfurt')">
                ⚠️ SIMULATE 110kV GRID BLACKOUT
              </button>
            </div>
            <div v-if="gridSimulationResult" class="simulation-result-box">
              <strong class="sim-alert">⚡ {{ gridSimulationResult.message }}</strong>
              <div class="sim-badges">
                <span class="sim-pill">POWER CUT: {{ gridSimulationResult.powerLostMw }} MW</span>
                <span class="sim-pill">UPS RUNTIME: {{ gridSimulationResult.generatorBatteryReserveHours }}H</span>
                <span class="sim-pill active">D2C SATELLITE: ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: LIVE MEDIA & BROADCAST PROVIDERS -->
        <div v-if="activeTab === 'media'" class="tab-content">
          <div class="media-list-container">
            <div
              v-for="media in MEDIA_PROVIDERS"
              :key="media.id"
              class="media-item-card"
              @click="openMedia(media.url)"
            >
              <div class="media-card-top">
                <span class="media-badge">{{ media.badge }}</span>
                <span class="media-cat">{{ media.category }}</span>
              </div>
              <h4 class="media-title">{{ media.title }}</h4>
              <div class="media-action-row">
                <span class="media-provider-name">{{ media.provider }}</span>
                <button class="launch-stream-btn" type="button" @click.stop="openMedia(media.url)">
                  LAUNCH FEED ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.starship-overlay-root {
  position: absolute;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  font-family: var(--font-mono, monospace);
  color: #f8fafc;
  background: radial-gradient(circle at 50% 20%, transparent 60%, rgba(2, 6, 23, 0.65) 100%);
}

.starship-top-header {
  pointer-events: auto;
  position: absolute;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1280px, calc(100vw - 40px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.1rem;
  background: rgba(10, 15, 30, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15);
  backdrop-filter: blur(16px);
  gap: 0.8rem;
  z-index: 1050;
}

.starship-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.starship-dot-live {
  width: 9px;
  height: 9px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse-dot 1.2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}

.starship-title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #38bdf8;
}

.starship-subtitle {
  font-size: 0.68rem;
  color: #94a3b8;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding-left: 0.5rem;
}

.header-action-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-pill-btn {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #e0f2fe;
  padding: 0.3rem 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.08em;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
}

.mode-pill-btn:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  color: #fff;
}

.mode-pill-btn.active {
  background: rgba(56, 189, 248, 0.35);
  border-color: #38bdf8;
  color: #00ffff;
  box-shadow: 0 0 14px rgba(0, 255, 255, 0.4);
}

.mode-pill-btn.cinematic-pill.active {
  border-color: #f59e0b;
  color: #fbbf24;
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.4);
}

.starship-milestones-track {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  overflow-x: auto;
}

.milestone-chip {
  background: rgba(15, 23, 42, 0.7);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  font-size: 0.62rem;
  font-family: inherit;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.milestone-chip:hover {
  border-color: #38bdf8;
  color: #fff;
}

.milestone-chip.active-phase {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
  font-weight: 700;
}

.milestone-chip.completed-phase {
  color: #64748b;
  border-color: rgba(255, 255, 255, 0.05);
}

.starship-close-btn {
  background: transparent;
  border: 0;
  color: #94a3b8;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
}

.starship-close-btn:hover {
  color: #fff;
}

.starship-main-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.starship-telemetry-panel {
  pointer-events: auto;
  position: absolute;
  top: 136px;
  left: 20px;
  width: 320px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  z-index: 1040;
}

.hud-box {
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 0.9rem;
  backdrop-filter: blur(8px);
}

.hud-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #94a3b8;
  margin-bottom: 0.8rem;
}

.hud-status-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.65rem;
}

.hud-gauges-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.gauge-card {
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.6rem;
}

.gauge-label {
  font-size: 0.62rem;
  color: #94a3b8;
  display: block;
}

.gauge-val-group {
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  margin: 0.2rem 0;
}

.gauge-number {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
}

.gauge-unit {
  font-size: 0.65rem;
  color: #38bdf8;
}

.gauge-sub {
  font-size: 0.62rem;
  color: #cbd5e1;
}

.stage-engines-section {
  background: rgba(2, 6, 23, 0.5);
  border-radius: 4px;
  padding: 0.6rem;
  margin-bottom: 0.8rem;
}

.engine-cluster-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.62rem;
  color: #cbd5e1;
  margin-bottom: 0.25rem;
}

.engine-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.engine-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  transition: width 0.1s linear;
}

.engine-bar-fill.ship-fill {
  background: linear-gradient(90deg, #38bdf8, #00ffff);
}

.mechazilla-radar-card {
  background: rgba(2, 6, 23, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 5px;
  padding: 0.75rem;
  transition: all 0.3s ease;
}

.mechazilla-radar-card.catch-confirmed {
  border-color: #22c55e;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
}

.radar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.radar-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: #38bdf8;
}

.radar-badge {
  font-size: 0.6rem;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.radar-badge.CLAMP_LOCKED_BOOSTER_CAUGHT {
  background: rgba(34, 197, 94, 0.25);
  color: #22c55e;
  font-weight: 700;
}

.radar-specs {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.65rem;
  margin-bottom: 0.6rem;
}

.spec-row {
  display: flex;
  justify-content: space-between;
}

.jump-catch-btn {
  width: 100%;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fbbf24;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.jump-catch-btn:hover {
  background: rgba(245, 158, 11, 0.35);
  color: #fff;
}

/* CENTER BOTTOM CONTROLS */
.starship-center-controls {
  pointer-events: auto;
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(10, 15, 30, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 12px;
  padding: 0.55rem 1.1rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15);
  backdrop-filter: blur(16px);
  gap: 0.45rem;
  min-width: 520px;
  max-width: min(860px, calc(100vw - 40px));
  z-index: 1050;
}

.mission-clock-display {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
}

.mission-clock {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
}

.mission-phase-label {
  font-size: 0.72rem;
  color: #94a3b8;
}

.scrubber-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.ctrl-btn {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  padding: 0.3rem 0.6rem;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
}

.ctrl-btn:hover {
  background: #38bdf8;
  color: #000;
}

.starship-scrubber {
  flex: 1;
  accent-color: #38bdf8;
  cursor: pointer;
}

.speed-selector {
  display: flex;
  gap: 0.2rem;
}

.speed-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  font-family: inherit;
  font-size: 0.62rem;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  cursor: pointer;
}

.speed-btn.active {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  color: #fff;
  font-weight: 700;
}

.camera-director-dock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cam-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #94a3b8;
}

.cam-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  font-family: inherit;
  font-size: 0.65rem;
  padding: 0.25rem 0.55rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cam-btn:hover {
  border-color: #38bdf8;
  color: #fff;
}

.cam-btn.active {
  background: #38bdf8;
  color: #020617;
  font-weight: 800;
  border-color: #38bdf8;
}

/* RIGHT PANEL */
.starship-right-panel {
  pointer-events: auto;
  position: absolute;
  top: 136px;
  right: 20px;
  width: 340px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  z-index: 1040;
}

.right-tabs-nav {
  display: flex;
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 0.25rem;
  backdrop-filter: blur(8px);
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: 0;
  color: #94a3b8;
  font-family: inherit;
  font-size: 0.68rem;
  padding: 0.35rem 0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  font-weight: 700;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.starlink-card {
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 0.8rem;
  backdrop-filter: blur(8px);
}

.starlink-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.starlink-logo {
  font-size: 0.72rem;
  font-weight: 700;
  color: #00ffff;
}

.starlink-badge-live {
  font-size: 0.6rem;
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

.starlink-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  background: rgba(2, 6, 23, 0.6);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.6rem;
}

.metric-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-title {
  font-size: 0.58rem;
  color: #94a3b8;
}

.metric-num {
  font-size: 0.85rem;
  color: #fff;
}

.theater-select-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.4rem;
}

.theater-lbl {
  font-size: 0.62rem;
  color: #94a3b8;
}

.theater-dropdown {
  background: rgba(2, 6, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  font-family: inherit;
  font-size: 0.65rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
}

.theater-note {
  font-size: 0.6rem;
  color: #94a3b8;
  line-height: 1.3;
}

.mobile-carriers-card {
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 0.8rem;
  backdrop-filter: blur(8px);
}

.carrier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #cbd5e1;
  margin-bottom: 0.6rem;
}

.country-pill {
  font-size: 0.6rem;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

.carrier-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.carrier-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(2, 6, 23, 0.5);
  border-radius: 4px;
  padding: 0.4rem 0.5rem;
}

.carrier-left {
  display: flex;
  flex-direction: column;
}

.carrier-left strong {
  font-size: 0.68rem;
  color: #f8fafc;
}

.carrier-left small {
  font-size: 0.58rem;
  color: #94a3b8;
}

.carrier-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.d2c-badge {
  font-size: 0.55rem;
  font-weight: 700;
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.carrier-status {
  font-size: 0.58rem;
  color: #cbd5e1;
}

.media-list-container {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.media-item-card {
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 6px;
  padding: 0.75rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.15s ease;
}

.media-item-card:hover {
  border-color: #38bdf8;
  transform: translateY(-1px);
}

.media-card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.media-badge {
  font-size: 0.55rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.media-cat {
  font-size: 0.58rem;
  color: #94a3b8;
}

.media-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.media-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.media-provider-name {
  font-size: 0.62rem;
  color: #94a3b8;
}

.launch-stream-btn {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  font-family: inherit;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  cursor: pointer;
}

.launch-stream-btn:hover {
  background: #38bdf8;
  color: #000;
}

/* INFRASTRUCTURE & ENERGY STYLES */
.infra-card {
  background: rgba(10, 15, 30, 0.88);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 0.75rem;
  backdrop-filter: blur(8px);
}

.infra-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.infra-title {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #38bdf8;
}

.infra-badge-count {
  font-size: 0.58rem;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}

.infra-badge-count.energy {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.infra-desc {
  font-size: 0.6rem;
  color: #94a3b8;
  line-height: 1.35;
  margin-bottom: 0.6rem;
}

.infra-action-row,
.infra-action-col {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.infra-action-col {
  flex-direction: column;
}

.infra-toggle-btn {
  flex: 1;
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid #38bdf8;
  color: #e0f2fe;
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.infra-toggle-btn:hover {
  background: rgba(56, 189, 248, 0.35);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
}

.infra-toggle-btn.energy {
  border-color: #22c55e;
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
}

.infra-toggle-btn.energy:hover {
  background: rgba(34, 197, 94, 0.35);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
}

.infra-toggle-btn.cables {
  border-color: #a855f7;
  color: #d8b4fe;
  background: rgba(168, 85, 247, 0.15);
}

.infra-toggle-btn.cables:hover {
  background: rgba(168, 85, 247, 0.35);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
}

.infra-sample-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: rgba(2, 6, 23, 0.5);
  border-radius: 4px;
  padding: 0.4rem;
}

.infra-sample-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.58rem;
  gap: 0.4rem;
}

.sample-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sample-dot.blue { background: #38bdf8; }
.sample-dot.green { background: #22c55e; }

.sample-name {
  flex: 1;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sample-loc {
  color: #64748b;
  font-size: 0.55rem;
}

/* AI SITREP & SEARCH STYLES */
.ai-sitrep-card {
  border-color: rgba(0, 246, 255, 0.45);
  box-shadow: 0 0 16px rgba(0, 246, 255, 0.12);
}

.ai-badge {
  background: rgba(0, 246, 255, 0.25) !important;
  color: #00ffff !important;
  border: 1px solid rgba(0, 246, 255, 0.4);
}

.infra-toggle-btn.ai-btn {
  background: linear-gradient(135deg, rgba(0, 246, 255, 0.2), rgba(168, 85, 247, 0.25));
  border-color: #00f6ff;
  color: #ffffff;
  box-shadow: 0 0 14px rgba(0, 246, 255, 0.3);
  font-size: 0.65rem;
  padding: 0.5rem;
}

.infra-toggle-btn.ai-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(0, 246, 255, 0.4), rgba(168, 85, 247, 0.45));
  box-shadow: 0 0 20px rgba(0, 246, 255, 0.6);
}

.infra-toggle-btn.ai-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.sitrep-report-box {
  margin-top: 0.6rem;
  background: rgba(2, 6, 23, 0.9);
  border: 1px solid rgba(0, 246, 255, 0.3);
  border-radius: 6px;
  padding: 0.6rem;
  max-height: 240px;
  overflow-y: auto;
}

.sitrep-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.58rem;
  color: #00ffff;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.3rem;
  margin-bottom: 0.4rem;
}

.sitrep-text {
  font-family: inherit;
  font-size: 0.58rem;
  line-height: 1.4;
  color: #e2e8f0;
  white-space: pre-wrap;
  margin: 0;
}

.infra-search-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.infra-search-input {
  flex: 1;
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #f8fafc;
  font-family: inherit;
  font-size: 0.62rem;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
}

.infra-search-input:focus {
  outline: none;
  border-color: #00f6ff;
  box-shadow: 0 0 8px rgba(0, 246, 255, 0.4);
}

.infra-search-btn {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
}

.infra-search-btn:hover {
  background: #38bdf8;
  color: #020617;
}

.search-feedback-msg {
  font-size: 0.58rem;
  color: #38bdf8;
  margin: 0.2rem 0 0.4rem 0;
}

.quick-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.chip-btn {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-family: inherit;
  font-size: 0.56rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip-btn:hover {
  border-color: #38bdf8;
  color: #ffffff;
  background: rgba(56, 189, 248, 0.2);
}

.infra-sample-item.clickable {
  cursor: pointer;
  transition: all 0.15s ease;
}

.infra-sample-item.clickable:hover {
  background: rgba(56, 189, 248, 0.15);
  border-radius: 3px;
}

.sample-dot.purple { background: #a855f7; }

.infra-badge-count.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.infra-toggle-btn.danger-btn {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

.infra-toggle-btn.danger-btn:hover {
  background: rgba(239, 68, 68, 0.4);
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.5);
}

.simulation-result-box {
  margin-top: 0.6rem;
  background: rgba(30, 10, 15, 0.85);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 6px;
  padding: 0.6rem;
}

.sim-alert {
  font-size: 0.6rem;
  color: #fca5a5;
  display: block;
  margin-bottom: 0.4rem;
  line-height: 1.35;
}

.sim-badges {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.sim-pill {
  font-size: 0.54rem;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

.sim-pill.active {
  border-color: #22c55e;
  color: #4ade80;
}
</style>

