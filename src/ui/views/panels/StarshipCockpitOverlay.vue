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
import {
  STARLINK_BUSINESS_PLANS,
  TERRAFAB_NETWORK_NODES,
  FUTURE_OUTLOOK_PHASES,
  calculateBusinessArbitrage,
  sovereignFabEngine,
  LAYER_DEFINITIONS,
  SOVEREIGN_CHIP_FAMILIES,
} from '../../../layers/starship/terraFabBusinessIntelligence.js';
import {
  sovereignRedis,
  EMPIRICAL_NEWS_FEED,
  ENTERPRISE_QUERY_TEMPLATES,
  evaluateEnterpriseQuery,
  generateExecutiveReport,
  ingestUploadedReport,
} from '../../../layers/starship/enterpriseDecisionEngine.js';
import {
  globalTracker,
  GLOBAL_FLIGHT_FLEET,
  GLOBAL_MARITIME_FLEET,
} from '../../../layers/tracking/flightMaritimeTracker.js';
import {
  GLOBAL_CITYSCAPES,
  flyToCityscape,
} from '../../../layers/cityscapes/cityscapeRegistry.js';
import { SUPER_INTELLIGENCE_SPEC } from '../../../layers/starship/superIntelligenceEngine.js';
import { SVG_ICONS, getEngIcon } from '../../icons/engineeringIcons.js';

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
const activeTab = ref('telemetry'); // telemetry, infra, media, biz

// Business & TerraFab Intelligence State
const selectedBizPlan = ref(STARLINK_BUSINESS_PLANS[0]);
const selectedOutlookPhase = ref(FUTURE_OUTLOOK_PHASES[0]);
const selectedArbitrageScenario = ref('HFT_FINANCE');
const bizArbitrage = computed(() => calculateBusinessArbitrage(selectedArbitrageScenario.value));

// Sovereign Fab Coordination Layer (L1-L6) State
const fabEngineSummary = ref(sovereignFabEngine.getLayerHealthSummary());
const selectedFabLayerKey = ref('L3');
const selectedFabLayer = computed(() => LAYER_DEFINITIONS[selectedFabLayerKey.value]);
const selectedFabChip = ref(fabEngineSummary.value.chipInventory[0]);
const selectedBizSubSection = ref('DECISION_ENGINE'); // Default to Enterprise Decision Hub & Reports
let fabUnsub = null;

// Enterprise Decision Engine & Report Hub State
const enterpriseQueryInput = ref('');
const activeDecisionResult = ref(null);
const redisCacheStatus = ref(sovereignRedis.getStatus());
const isEvaluatingQuery = ref(false);
const uploadStatusMsg = ref('');
const fileInputRef = ref(null);

function handleRunEnterpriseQuery(text) {
  if (text) enterpriseQueryInput.value = text;
  if (!enterpriseQueryInput.value) return;
  isEvaluatingQuery.value = true;
  setTimeout(() => {
    activeDecisionResult.value = evaluateEnterpriseQuery(enterpriseQueryInput.value);
    redisCacheStatus.value = sovereignRedis.getStatus();
    isEvaluatingQuery.value = false;
  }, 350);
}

function handleDownloadReport(format) {
  const rep = generateExecutiveReport(format, selectedArbitrageScenario.value);
  const blob = new Blob([rep.content], { type: rep.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = rep.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const res = await ingestUploadedReport(file);
    uploadStatusMsg.value = res.summary;
    redisCacheStatus.value = sovereignRedis.getStatus();
  } catch (err) {
    uploadStatusMsg.value = `Upload Error: ${err.message}`;
  }
}

// Global Tracker (Skyscanner Flight & MarineTraffic Vessel State)
const trackerMode = ref('FLIGHTS'); // FLIGHTS or MARITIME
const trackerSearchQuery = ref('');
const activeFlights = ref(globalTracker.getAllFlights());
const activeVessels = ref(globalTracker.getAllVessels());
const selectedFlight = ref(GLOBAL_FLIGHT_FLEET[0]);
const selectedVessel = ref(GLOBAL_MARITIME_FLEET[0]);
let trackerUnsub = null;

const filteredFlights = computed(() => {
  if (!trackerSearchQuery.value) return activeFlights.value;
  return globalTracker.searchFlights(trackerSearchQuery.value);
});

const filteredVessels = computed(() => {
  if (!trackerSearchQuery.value) return activeVessels.value;
  return globalTracker.searchVessels(trackerSearchQuery.value);
});

function flyToFlight(flight) {
  selectedFlight.value = flight;
  const viewer = window.viewer;
  const Cesium = window.Cesium || window.cesium;
  if (viewer?.camera && Cesium) {
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        flight.longitude,
        flight.latitude,
        (flight.altitudeFt || 35000) * 0.3048 + 3500
      ),
      orientation: {
        heading: Cesium.Math.toRadians(flight.headingDeg || 0),
        pitch: Cesium.Math.toRadians(-28),
        roll: 0.0,
      },
      duration: 2.2,
    });
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'flights' } }));
  }
}

function flyToVessel(vessel) {
  selectedVessel.value = vessel;
  const viewer = window.viewer;
  const Cesium = window.Cesium || window.cesium;
  if (viewer?.camera && Cesium) {
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(vessel.longitude, vessel.latitude, 4500),
      orientation: {
        heading: Cesium.Math.toRadians(vessel.courseDeg || 0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0.0,
      },
      duration: 2.2,
    });
    window.dispatchEvent(new CustomEvent('gev:enable-layer', { detail: { id: 'ais-live-vessels' } }));
  }
}

// Global Cityscape Cameras & Views State
const selectedCityId = ref('city-austin');
const selectedCityModeIdx = ref(0);
const activeCity = computed(
  () => GLOBAL_CITYSCAPES.find((c) => c.id === selectedCityId.value) || GLOBAL_CITYSCAPES[0]
);

function handleSelectCity(cityId, modeIdx = 0) {
  selectedCityId.value = cityId;
  selectedCityModeIdx.value = modeIdx;
  flyToCityscape(cityId, modeIdx);
}

function flyToAustinFab() {
  const viewer = window.viewer;
  const Cesium = window.Cesium || window.cesium;
  if (viewer?.camera && Cesium) {
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.6171, 30.2223, 1400),
      orientation: {
        heading: Cesium.Math.toRadians(35),
        pitch: Cesium.Math.toRadians(-32),
        roll: 0.0,
      },
      duration: 2.2,
    });
  }
}

function flyToGrimesMegaFab() {
  const viewer = window.viewer;
  const Cesium = window.Cesium || window.cesium;
  if (viewer?.camera && Cesium) {
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-95.98, 30.55, 3200),
      orientation: {
        heading: Cesium.Math.toRadians(190),
        pitch: Cesium.Math.toRadians(-38),
        roll: 0.0,
      },
      duration: 2.2,
    });
  }
}

onMounted(() => {
  fabUnsub = sovereignFabEngine.subscribe((updatedSummary) => {
    fabEngineSummary.value = updatedSummary;
    if (!selectedFabChip.value && updatedSummary.chipInventory.length > 0) {
      selectedFabChip.value = updatedSummary.chipInventory[0];
    }
  });

  trackerUnsub = globalTracker.subscribe((data) => {
    activeFlights.value = data.flights;
    activeVessels.value = data.vessels;
  });
});

onUnmounted(() => {
  if (fabUnsub) fabUnsub();
  if (trackerUnsub) trackerUnsub();
});

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
          <span class="eng-icon-inline" v-html="SVG_ICONS.loop"></span> {{ isShowcaseMode ? '36S SHOWCASE LOOP' : 'MANUAL CLOCK' }}
        </button>

        <button
          class="mode-pill-btn cinematic-pill"
          :class="{ active: isCinematicView }"
          @click="toggleCinematicView()"
          title="Toggle Cinematic Mode: Keep Full 3D Globe Backdrop Clear"
        >
          <span class="eng-icon-inline" v-html="SVG_ICONS.cinematic"></span> {{ isCinematicView ? 'GLOBE VIEW' : 'FULL HUD' }}
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

      <button class="starship-close-btn" type="button" @click="emit('close')" title="Exit Starship Mission" v-html="SVG_ICONS.close"></button>
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
              <span class="eng-icon-inline" v-html="SVG_ICONS.chopstick"></span> JUMP TO CHOPSTICK CATCH
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
            :class="{ active: activeTab === 'radar' }"
            @click="activeTab = 'radar'"
          >
            FLIGHT & SEA RADAR
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'cityscapes' }"
            @click="activeTab = 'cityscapes'"
          >
            CITY CAMERAS
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'media' }"
            @click="activeTab = 'media'"
          >
            LIVE MEDIA
          </button>
          <button
            class="tab-btn highlight-biz-tab"
            :class="{ active: activeTab === 'biz' }"
            @click="activeTab = 'biz'"
          >
            TERRAFAB & BIZ
          </button>
        </div>

        <!-- TAB 1: STARLINK & MOBILE CARRIER RADAR -->
        <div v-if="activeTab === 'telemetry'" class="tab-content">
          <div class="starlink-card">
            <div class="starlink-card-header">
              <span class="starlink-logo"><span class="eng-icon-inline" v-html="SVG_ICONS.orbital"></span> STARLINK SPACE MESH</span>
              <div class="starlink-badges-group">
                <span class="starlink-badge-11k">11,000 SATELLITES</span>
                <span class="starlink-badge-live">LIVE LEO</span>
              </div>
            </div>

            <!-- NEXT-GEN 100x OPTICAL LASER LINK STATS -->
            <div class="starlink-laser-banner">
              <div class="laser-today">
                <span class="laser-lbl">TODAY:</span>
                <strong class="laser-val">≈ 100 Gbps</strong>
              </div>
              <div class="laser-indicator">
                <div class="laser-beam-anim"></div>
                <span class="laser-mult"><span class="eng-icon-inline" v-html="SVG_ICONS.speed"></span> 100× SPEED</span>
              </div>
              <div class="laser-nextgen">
                <span class="laser-lbl">NEXT GEN:</span>
                <strong class="laser-val highlight-green">10 Terabits/s</strong>
              </div>
            </div>

            <!-- ORBITAL AI & INDUSTRIAL INFRASTRUCTURE CROSS-LINKS -->
            <div class="infrastructure-matrix-chips">
              <div class="infra-chip active">
                <span class="infra-icon" v-html="SVG_ICONS.orbital"></span>
                <div class="infra-text">
                  <strong>STARLINK</strong>
                  <small>11,000+ Active</small>
                </div>
              </div>
              <div class="infra-chip active">
                <span class="infra-icon" v-html="SVG_ICONS.chip"></span>
                <div class="infra-text">
                  <strong>AI COMPUTERS IN ORBIT</strong>
                  <small>GPU Inference</small>
                </div>
              </div>
              <div class="infra-chip">
                <span class="infra-icon" v-html="SVG_ICONS.cleanroom"></span>
                <div class="infra-text">
                  <strong>CHIP FACTORIES</strong>
                  <small>TSMC • Intel • Samsung</small>
                </div>
              </div>
              <div class="infra-chip">
                <span class="infra-icon" v-html="SVG_ICONS.power"></span>
                <div class="infra-text">
                  <strong>POWER PLANTS</strong>
                  <small>Palo Verde • Hoover</small>
                </div>
              </div>
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

            <!-- MECHAZILLA TOWER CATCH STATUS -->
            <div class="mechazilla-quick-card" v-if="telemetry.booster.caught || missionTimeS >= 400">
              <div class="mechazilla-quick-head">
                <span class="tower-icon" v-html="SVG_ICONS.chopstick"></span>
                <strong>THE REAL TOWER: MECHAZILLA</strong>
                <span class="catch-pill">ONCE AN HOUR · MUSK</span>
              </div>
              <p class="tower-desc">
                <strong>BOOSTER CATCH:</strong> The arms close, pins rest on the arms above launch mount. Re-fly cadence: once an hour in principle.
              </p>
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
                <span class="eng-icon-inline" v-html="SVG_ICONS.metrics"></span> {{ isGeneratingSitrep ? 'ANALYZING SENSOR MATRIX...' : 'RUN AUTONOMOUS AI SITREP' }}
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
              <button class="infra-search-btn" type="button" @click="handleSearch">FLY <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span></button>
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
              <span class="infra-title"><span class="eng-icon-inline" v-html="SVG_ICONS.business"></span> HYPERSCALE DATA CENTERS</span>
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
                <span class="sample-loc">{{ item.city }} <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span></span>
              </div>
            </div>
          </div>

          <!-- ENERGY SOURCES & POWER GRID SECTION -->
          <div class="infra-card">
            <div class="infra-card-header">
              <span class="infra-title"><span class="eng-icon-inline" v-html="SVG_ICONS.power"></span> ENERGY SOURCES & POWER GRID</span>
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
                <span class="sample-loc">{{ item.city }} <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span></span>
              </div>
            </div>
          </div>

          <!-- GRID BLACKOUT & SATELLITE FAILOVER SIMULATOR -->
          <div class="infra-card">
            <div class="infra-card-header">
              <span class="infra-title"><span class="eng-icon-inline" v-html="SVG_ICONS.alert"></span> GRID OUTAGE & D2C FAILOVER SIMULATOR</span>
              <span class="infra-badge-count danger">STRESS TEST</span>
            </div>
            <p class="infra-desc">Simulates loss of 110kV transmission feed: models data center UPS depletion and autonomous handover to Starlink Direct-to-Cell LEO mesh.</p>
            <div class="infra-action-row">
              <button class="infra-toggle-btn danger-btn" type="button" @click="handleSimulateGridFailure('Frankfurt')">
                <span class="eng-icon-inline" v-html="SVG_ICONS.alert"></span> SIMULATE 110kV GRID BLACKOUT
              </button>
            </div>
            <div v-if="gridSimulationResult" class="simulation-result-box">
              <strong class="sim-alert"><span class="eng-icon-inline" v-html="SVG_ICONS.alert"></span> {{ gridSimulationResult.message }}</strong>
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
                  LAUNCH FEED <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: FLIGHT & SEA RADAR (SKYSCANNER & MARINETRAFFIC STYLE) -->
        <div v-if="activeTab === 'radar'" class="tab-content">
          <div class="radar-hud-card">
            <div class="radar-header-row">
              <div class="radar-title">
                <span class="eng-icon-inline" v-html="SVG_ICONS.aviation"></span>
                <span>GLOBAL FLIGHT & MARITIME TRACKER</span>
              </div>
              <span class="radar-live-badge">SKYSCANNER / AIS</span>
            </div>
            <p class="radar-desc">
              Real-time civil aviation and maritime tracking with origin takeoff, destination arrival, flight/sea voyage elapsed & remaining duration, operator registries, and 3D vector camera targeting.
            </p>

            <!-- MODE SWITCHER -->
            <div class="tracker-mode-switch">
              <button
                class="mode-switch-btn"
                :class="{ active: trackerMode === 'FLIGHTS' }"
                @click="trackerMode = 'FLIGHTS'"
              >
                <span class="eng-icon-inline" v-html="SVG_ICONS.aviation"></span>
                FLIGHTS (SKYSCANNER)
              </button>
              <button
                class="mode-switch-btn"
                :class="{ active: trackerMode === 'MARITIME' }"
                @click="trackerMode = 'MARITIME'"
              >
                <span class="eng-icon-inline" v-html="SVG_ICONS.maritime"></span>
                MARITIME (AIS VESSELS)
              </button>
            </div>

            <!-- SEARCH FILTER -->
            <div class="tracker-search-wrap">
              <span class="eng-icon-inline search-icon" v-html="SVG_ICONS.search"></span>
              <input
                v-model="trackerSearchQuery"
                type="text"
                class="tracker-search-input"
                :placeholder="trackerMode === 'FLIGHTS' ? 'Search flight number, airline, origin, dest (e.g. DL189, JFK, Emirates)...' : 'Search vessel name, operator, MMSI, port (e.g. Maersk, Rotterdam)...'"
              />
              <button v-if="trackerSearchQuery" class="clear-search-btn" @click="trackerSearchQuery = ''">
                <span class="eng-icon-inline" v-html="SVG_ICONS.close"></span>
              </button>
            </div>

            <!-- FLIGHTS LIST VIEW -->
            <div v-if="trackerMode === 'FLIGHTS'" class="tracker-items-list">
              <div
                v-for="flt in filteredFlights"
                :key="flt.id"
                class="tracker-card flight-card"
                :class="{ selected: selectedFlight?.id === flt.id }"
                @click="selectedFlight = flt"
              >
                <div class="tracker-card-top">
                  <div class="airline-brand-row">
                    <span class="airline-code-badge">{{ flt.airlineIata }}</span>
                    <span class="airline-name">{{ flt.airline }}</span>
                    <span class="flight-callsign">{{ flt.flightNumber }} ({{ flt.callsign }})</span>
                  </div>
                  <span class="flight-phase-chip">{{ flt.phase }}</span>
                </div>

                <!-- ROUTE & TAKEOFF / ARRIVAL TIMES -->
                <div class="route-airports-grid">
                  <div class="airport-col origin">
                    <div class="airport-code">{{ flt.origin.code }}</div>
                    <div class="airport-city">{{ flt.origin.city }}</div>
                    <div class="flight-time-line">
                      <span class="time-lbl">TAKEOFF:</span>
                      <strong class="time-val">{{ flt.origin.actualTakeoff }}</strong>
                    </div>
                    <div class="sched-sub">Sched {{ flt.origin.scheduledTakeoff }}</div>
                  </div>

                  <div class="route-center-vector">
                    <span class="flight-vector-arrow">➔</span>
                    <span class="duration-pill">{{ flt.totalFormatted }}</span>
                  </div>

                  <div class="airport-col destination">
                    <div class="airport-code">{{ flt.destination.code }}</div>
                    <div class="airport-city">{{ flt.destination.city }}</div>
                    <div class="flight-time-line">
                      <span class="time-lbl">EST. ARRIVAL:</span>
                      <strong class="time-val highlight-green">{{ flt.destination.estimatedArrival }}</strong>
                    </div>
                    <div class="sched-sub">Sched {{ flt.destination.scheduledArrival }}</div>
                  </div>
                </div>

                <!-- PROGRESS BAR & DURATION BREAKDOWN -->
                <div class="duration-progress-bar-wrap">
                  <div class="duration-labels-row">
                    <span>Elapsed: <strong>{{ flt.elapsedFormatted }}</strong></span>
                    <span class="pct-badge">{{ flt.progressPct }}% COMPLETE</span>
                    <span>Remaining: <strong>{{ flt.remainingFormatted }}</strong></span>
                  </div>
                  <div class="flight-progress-track">
                    <div class="flight-progress-fill" :style="{ width: flt.progressPct + '%' }"></div>
                  </div>
                </div>

                <!-- METRICS & 3D CAMERA ACTION -->
                <div class="tracker-metrics-action-row">
                  <div class="telemetry-chips">
                    <span class="chip-metric">ALT <strong>{{ flt.altitudeFt.toLocaleString() }} FT</strong></span>
                    <span class="chip-metric">SPD <strong>{{ flt.groundSpeedKts }} KTS</strong></span>
                    <span class="chip-metric">HDG <strong>{{ flt.headingDeg }}°</strong></span>
                    <span class="chip-metric model-txt">{{ flt.aircraft }}</span>
                  </div>
                  <button class="fly-vector-btn" type="button" @click.stop="flyToFlight(flt)">
                    FLY TO 3D <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                  </button>
                </div>
              </div>
            </div>

            <!-- MARITIME LIST VIEW -->
            <div v-if="trackerMode === 'MARITIME'" class="tracker-items-list">
              <div
                v-for="ves in filteredVessels"
                :key="ves.id"
                class="tracker-card vessel-card"
                :class="{ selected: selectedVessel?.id === ves.id }"
                @click="selectedVessel = ves"
              >
                <div class="tracker-card-top">
                  <div class="airline-brand-row">
                    <span class="operator-code-badge">{{ ves.operatorCode }}</span>
                    <span class="airline-name">{{ ves.operator }}</span>
                    <span class="vessel-imo">IMO {{ ves.imo }}</span>
                  </div>
                  <span class="vessel-status-chip">{{ ves.status }}</span>
                </div>

                <h4 class="vessel-full-name">{{ ves.vesselName }}</h4>

                <!-- ROUTE & PORT ETAS -->
                <div class="route-airports-grid maritime-ports">
                  <div class="airport-col origin">
                    <div class="port-code">{{ ves.originPort.code }}</div>
                    <div class="airport-city">{{ ves.originPort.name }}</div>
                    <div class="flight-time-line">
                      <span class="time-lbl">DEPARTED:</span>
                      <strong class="time-val">{{ ves.originPort.departureDate }}</strong>
                    </div>
                  </div>

                  <div class="route-center-vector">
                    <span class="flight-vector-arrow">➔</span>
                    <span class="duration-pill sea">{{ ves.totalFormatted }}</span>
                  </div>

                  <div class="airport-col destination">
                    <div class="port-code">{{ ves.destPort.code }}</div>
                    <div class="airport-city">{{ ves.destPort.name }}</div>
                    <div class="flight-time-line">
                      <span class="time-lbl">ETA PORT:</span>
                      <strong class="time-val highlight-green">{{ ves.destPort.eta }}</strong>
                    </div>
                  </div>
                </div>

                <!-- VOYAGE PROGRESS -->
                <div class="duration-progress-bar-wrap">
                  <div class="duration-labels-row">
                    <span>At Sea: <strong>{{ ves.elapsedFormatted }}</strong></span>
                    <span class="pct-badge sea">{{ ves.progressPct }}% OF PASSAGE</span>
                    <span>Remaining: <strong>{{ ves.remainingFormatted }}</strong></span>
                  </div>
                  <div class="flight-progress-track sea">
                    <div class="flight-progress-fill sea" :style="{ width: ves.progressPct + '%' }"></div>
                  </div>
                </div>

                <!-- METRICS & 3D CAMERA ACTION -->
                <div class="tracker-metrics-action-row">
                  <div class="telemetry-chips">
                    <span class="chip-metric">SPD <strong>{{ ves.speedKts }} KTS</strong></span>
                    <span class="chip-metric">DRAUGHT <strong>{{ ves.draughtM }}M</strong></span>
                    <span class="chip-metric">CAP <strong>{{ ves.capacity }}</strong></span>
                    <span class="chip-metric model-txt">{{ ves.vesselType }}</span>
                  </div>
                  <button class="fly-vector-btn sea" type="button" @click.stop="flyToVessel(ves)">
                    FLY TO 3D <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: CITYSCAPE CAMERA VIEWS & URBAN RECON -->
        <div v-if="activeTab === 'cityscapes'" class="tab-content">
          <div class="cityscapes-hud-card">
            <div class="cityscapes-header-row">
              <div class="cityscapes-title">
                <span class="eng-icon-inline" v-html="SVG_ICONS.camera"></span>
                <span>GLOBAL CITYSCAPE CAMERAS & 3D RECON</span>
              </div>
              <span class="live-rec-badge"><span class="rec-dot"></span> LIVE CCTV</span>
            </div>
            <p class="cityscapes-desc">
              High-resolution street-level viewpoints, architectural nadir surveillance, and panoramic 3D camera vantage points across major global technology corridors and metropolises.
            </p>

            <!-- SELECTED CITY LIVE STREAM / PREVIEW -->
            <div class="city-live-viewfinder">
              <div class="viewfinder-overlay">
                <div class="viewfinder-top">
                  <span class="cam-id-tag">CAM-{{ activeCity.id.toUpperCase() }}</span>
                  <span class="cam-elevation">{{ activeCity.elevation }}</span>
                </div>
                <div class="viewfinder-crosshairs"></div>
                <div class="viewfinder-bottom">
                  <span class="city-name-tag">{{ activeCity.name }} ({{ activeCity.city }})</span>
                  <span class="weather-tag">{{ activeCity.weather }}</span>
                </div>
              </div>
              <div class="viewfinder-feed-sim">
                <div class="scanlines"></div>
                <div class="feed-ambient-glitch">
                  <div class="city-feed-watermark">{{ activeCity.tag }}</div>
                </div>
              </div>
            </div>

            <!-- CAMERA ANGLE SELECTORS FOR ACTIVE CITY -->
            <div class="city-cam-modes-row">
              <span class="cam-mode-lbl">CAMERA ANGLE:</span>
              <div class="cam-modes-btns">
                <button
                  v-for="(mode, mIdx) in activeCity.cameraModes"
                  :key="mIdx"
                  class="cam-angle-btn"
                  :class="{ active: selectedCityModeIdx === mIdx }"
                  @click="handleSelectCity(activeCity.id, mIdx)"
                >
                  {{ mode.name }} ({{ mode.alt }}m)
                </button>
              </div>
            </div>

            <!-- CITY GRID SELECTOR -->
            <div class="city-selector-grid">
              <div
                v-for="city in GLOBAL_CITYSCAPES"
                :key="city.id"
                class="city-tile-card"
                :class="{ active: selectedCityId === city.id }"
                @click="handleSelectCity(city.id, 0)"
              >
                <div class="city-tile-top">
                  <span class="city-tile-name">{{ city.city }}</span>
                  <span class="city-tile-country">{{ city.country }}</span>
                </div>
                <div class="city-tile-tag">{{ city.tag }}</div>
                <div class="city-tile-desc">{{ city.description }}</div>
                <div class="city-tile-footer">
                  <span class="pop-lbl">Pop: {{ city.population }}</span>
                  <span class="fly-city-chip">
                    FLY 3D <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: REVERSE-ENGINEERED SOVEREIGN FAB & BIZ COORDINATION FABRIC -->
        <div v-if="activeTab === 'biz'" class="tab-content">
          <!-- NAVIGATION SUB-HEADER PILLS -->
          <div class="biz-subnav-pills">
            <button
              class="biz-subnav-btn highlight-gold"
              :class="{ active: selectedBizSubSection === 'DECISION_ENGINE' }"
              @click="selectedBizSubSection = 'DECISION_ENGINE'"
            >
              <span class="eng-icon-inline" v-html="SVG_ICONS.metrics"></span>
              DECISION ENGINE & REPORTS
            </button>
            <button
              class="biz-subnav-btn highlight-super-intel"
              :class="{ active: selectedBizSubSection === 'SUPER_INTEL' }"
              @click="selectedBizSubSection = 'SUPER_INTEL'"
            >
              <span class="eng-icon-inline" v-html="SVG_ICONS.power"></span>
              SUPER INTEL (100GW+)
            </button>
            <button
              class="biz-subnav-btn"
              :class="{ active: selectedBizSubSection === 'FAB_COORDINATION' }"
              @click="selectedBizSubSection = 'FAB_COORDINATION'"
            >
              <span class="eng-icon-inline" v-html="SVG_ICONS.chip"></span>
              FABRIC (L1-L6)
            </button>
            <button
              class="biz-subnav-btn"
              :class="{ active: selectedBizSubSection === 'COMMERCIAL_PLANS' }"
              @click="selectedBizSubSection = 'COMMERCIAL_PLANS'"
            >
              <span class="eng-icon-inline" v-html="SVG_ICONS.antenna"></span>
              COMMERCIAL PLANS
            </button>
            <button
              class="biz-subnav-btn"
              :class="{ active: selectedBizSubSection === 'ARBITRAGE' }"
              @click="selectedBizSubSection = 'ARBITRAGE'"
            >
              <span class="eng-icon-inline" v-html="SVG_ICONS.metrics"></span>
              LATENCY ROI
            </button>
            <button
              class="biz-subnav-btn"
              :class="{ active: selectedBizSubSection === 'OUTLOOK' }"
              @click="selectedBizSubSection = 'OUTLOOK'"
            >
              <span class="eng-icon-inline" v-html="SVG_ICONS.orbital"></span>
              2026-2030 OUTLOOK
            </button>
          </div>

                    <!-- SUB-SECTION 0: ENTERPRISE DECISION HUB & REPORTS -->
          <div v-if="selectedBizSubSection === 'DECISION_ENGINE'" class="biz-card decision-hub-card">
            <div class="biz-card-header">
              <span class="biz-logo">
                <span class="eng-icon-inline" v-html="SVG_ICONS.metrics"></span>
                EMPIRICAL DECISION HUB & REPORT ARCHIVE
              </span>
              <span class="biz-badge-special">REDIS 7.2 ENCLAVE</span>
            </div>
            <p class="biz-desc">
              Empirical decision-making engine synthesizing real-time news feeds, Sovereign Redis telemetry cache, and Texas-LEO fab metrics. Download executive dossiers or upload external datasets.
            </p>

            <!-- 1. REPORT DOWNLOAD & UPLOAD ACTION BAR -->
            <div class="report-actions-panel">
              <div class="report-download-group">
                <span class="action-label">DOWNLOAD EXECUTIVE DOSSIER:</span>
                <div class="download-btn-row">
                  <button class="report-dl-btn json" @click="handleDownloadReport('json')" title="Download full empirical dataset as JSON">
                    <span class="eng-icon-inline" v-html="SVG_ICONS.package"></span> EXPORT JSON DATASET
                  </button>
                  <button class="report-dl-btn md" @click="handleDownloadReport('markdown')" title="Download executive briefing dossier as Markdown">
                    <span class="eng-icon-inline" v-html="SVG_ICONS.business"></span> EXPORT MARKDOWN DOSSIER
                  </button>
                </div>
              </div>

              <!-- UPLOAD FILE DROPZONE -->
              <div class="report-upload-group">
                <span class="action-label">INGEST ENTERPRISE REPORT / DATASET:</span>
                <div class="upload-dropzone" @click="fileInputRef?.click()">
                  <input
                    type="file"
                    ref="fileInputRef"
                    class="hidden-file-input"
                    accept=".json,.csv,.txt,.geojson"
                    @change="handleFileUpload"
                  />
                  <span class="eng-icon-inline" v-html="SVG_ICONS.chip"></span>
                  <span>Click or drag corporate brief (.json, .csv, .geojson)</span>
                </div>
                <div v-if="uploadStatusMsg" class="upload-feedback-pill">
                  {{ uploadStatusMsg }}
                </div>
              </div>
            </div>

            <!-- 2. ENTERPRISE QUERY & INFORMATION REQUEST CONSOLE -->
            <div class="decision-query-box">
              <div class="query-box-head">
                <span class="eng-icon-inline" v-html="SVG_ICONS.search"></span>
                <strong>EMPIRICAL INFORMATION REQUEST & CORPORATE INQUIRY</strong>
              </div>
              <div class="query-input-row">
                <input
                  type="text"
                  class="decision-input"
                  placeholder="Ask corporate inquiry (e.g. Evaluate vacuum laser vs subsea fiber risk...)"
                  v-model="enterpriseQueryInput"
                  @keydown.enter="handleRunEnterpriseQuery(enterpriseQueryInput)"
                />
                <button
                  class="decision-run-btn"
                  :disabled="isEvaluatingQuery"
                  @click="handleRunEnterpriseQuery(enterpriseQueryInput)"
                >
                  {{ isEvaluatingQuery ? 'ANALYZING...' : 'RESOLVE' }}
                </button>
              </div>

              <!-- TEMPLATE INQUIRIES -->
              <div class="query-template-chips">
                <button
                  v-for="tmpl in ENTERPRISE_QUERY_TEMPLATES"
                  :key="tmpl.id"
                  class="query-chip"
                  @click="handleRunEnterpriseQuery(tmpl.text)"
                >
                  {{ tmpl.label }}
                </button>
              </div>

              <!-- QUERY RESULT OUTPUT MATRIX -->
              <div v-if="activeDecisionResult" class="decision-result-matrix">
                <div class="result-header-row">
                  <div>
                    <span class="res-sub">SCENARIO:</span>
                    <strong>{{ activeDecisionResult.scenario }}</strong>
                  </div>
                  <span class="risk-badge" :class="activeDecisionResult.riskRating.toLowerCase()">
                    {{ activeDecisionResult.riskRating }}
                  </span>
                </div>

                <div class="recommendation-block">
                  <div class="rec-title">STRATEGIC RECOMMENDATION:</div>
                  <p>{{ activeDecisionResult.recommendation }}</p>
                </div>

                <div class="evidence-grid">
                  <div v-for="ev in activeDecisionResult.evidenceData" :key="ev.label" class="evidence-item">
                    <small>{{ ev.label }}</small>
                    <strong>{{ ev.value }}</strong>
                  </div>
                </div>

                <div class="merkle-proof-row">
                  <span>MERKLE ROOT HASH:</span>
                  <code>{{ activeDecisionResult.cryptographicProof }}</code>
                </div>
              </div>
            </div>

            <!-- 3. REAL-WORLD NEWS WIRE SIGNALS -->
            <div class="news-wire-box">
              <div class="news-head">
                <span class="eng-icon-inline" v-html="SVG_ICONS.antenna"></span>
                <strong>REAL-TIME EMPIRICAL NEWS WIRE & SENSORS</strong>
                <span class="news-count-pill">{{ EMPIRICAL_NEWS_FEED.length }} SIGNALS</span>
              </div>
              <div class="news-stream">
                <div v-for="news in EMPIRICAL_NEWS_FEED" :key="news.id" class="news-item">
                  <div class="news-top">
                    <span class="news-sev" :class="news.severity.toLowerCase()">{{ news.severity }}</span>
                    <span class="news-time">{{ news.timestamp }}</span>
                  </div>
                  <strong class="news-title">{{ news.headline }}</strong>
                  <p class="news-impact"><strong>EMPIRICAL IMPACT:</strong> {{ news.empiricalImpact }}</p>
                  <div class="news-action"><strong>ACTION:</strong> {{ news.recommendedAction }}</div>
                </div>
              </div>
            </div>

            <!-- 4. SOVEREIGN REDIS ENCLAVE TELEMETRY STATUS -->
            <div class="redis-status-strip">
              <div class="redis-stat">
                <small>CACHE ENGINE</small>
                <strong>{{ redisCacheStatus.engine }}</strong>
              </div>
              <div class="redis-stat">
                <small>ENDPOINT</small>
                <strong>{{ redisCacheStatus.endpoint }}</strong>
              </div>
              <div class="redis-stat">
                <small>ACTIVE KEYS</small>
                <strong>{{ redisCacheStatus.totalKeys }}</strong>
              </div>
              <div class="redis-stat">
                <small>HIT RATIO</small>
                <strong class="green-text">{{ redisCacheStatus.hitRatioPct }}%</strong>
              </div>
            </div>
          </div>

          <!-- SUB-SECTION: DIGITAL SUPER INTELLIGENCE & 100GW+ ORBITAL COMPUTE -->
          <div v-if="selectedBizSubSection === 'SUPER_INTEL'" class="biz-card super-intel-card">
            <div class="biz-card-header">
              <span class="biz-logo">
                <span class="eng-icon-inline" v-html="SVG_ICONS.power"></span>
                DIGITAL SUPER INTELLIGENCE & ORBITAL COMPUTE
              </span>
              <span class="biz-badge-special gold">100GW+ SCALE</span>
            </div>
            <p class="biz-desc">
              Why we need unprecedented energy and why super intelligence must expand to space: Singlet requests decompose into thousands of concurrent physics/engineering workloads, surpassing terrestrial electricity and cooling limits.
            </p>

            <!-- 1. ELON MUSK NOV 6, 2026 DOCTRINE -->
            <div class="musk-doctrine-banner">
              <div class="quote-card primary">
                <div class="quote-text">
                  "...the only way to be competitive with China is to take the intelligence to space."
                </div>
                <div class="quote-meta">ELON MUSK · NOV 6, 2026</div>
              </div>

              <div class="quote-pair-row">
                <div class="quote-subcard">
                  <div class="sub-quote-metric">A few hundred GW a year</div>
                  <div class="sub-quote-label">GLOBAL ORBITAL COMPUTE POWER TARGET · MUSK</div>
                </div>
                <div class="quote-subcard">
                  <div class="sub-quote-metric">> $100B → > $500B ARR</div>
                  <div class="sub-quote-label">DEC 2026: >$100B · DEC 2027: >$500B RECURRING</div>
                </div>
              </div>

              <div class="quote-caveat">
                "...this is not a promise, this is what I think will happen, this is my best guess."
                <span class="caveat-author">— MUSK · NOV 6, 2026</span>
              </div>
            </div>

            <!-- 2. TASK DECOMPOSITION: 1 REQUEST -> 1,642 COMPUTING TASKS -->
            <div class="task-decomposition-panel">
              <div class="decomp-header">
                <span class="decomp-badge">WORKLOAD EXPLOSION</span>
                <h4>ONE REQUEST: DESIGN A BUILDING</h4>
                <span class="decomp-total">1,642 COMPUTING TASKS</span>
              </div>
              <p class="decomp-sub">
                A single enterprise prompt triggers an exponential cascade of multi-domain physics simulations, structural finite element analyses, and real-time market optimizations:
              </p>

              <div class="decomp-columns-grid">
                <div class="decomp-col">
                  <div class="decomp-col-header">
                    <span class="cat-name">MATERIALS</span>
                    <span class="task-count">480 Tasks</span>
                  </div>
                  <div class="workload-indicators">
                    <div v-for="i in 12" :key="'mat-'+i" class="w-block active"></div>
                  </div>
                  <ul class="decomp-tasks-list">
                    <li>Carbon-negative curing kinetics</li>
                    <li>Alloy thermal expansion & yield stress</li>
                    <li>Polymer UV facade degradation</li>
                    <li>Embodied carbon LCA balance</li>
                  </ul>
                </div>

                <div class="decomp-col">
                  <div class="decomp-col-header">
                    <span class="cat-name">STRUCTURE</span>
                    <span class="task-count">720 Tasks</span>
                  </div>
                  <div class="workload-indicators">
                    <div v-for="i in 12" :key="'str-'+i" class="w-block active"></div>
                  </div>
                  <ul class="decomp-tasks-list">
                    <li>Richter 8.5 seismic dynamic response</li>
                    <li>CFD aerodynamic vortex shedding</li>
                    <li>Sub-millimeter beam deflection FEA</li>
                    <li>Bedrock foundation shear resistance</li>
                  </ul>
                </div>

                <div class="decomp-col">
                  <div class="decomp-col-header">
                    <span class="cat-name">COST & SUPPLY</span>
                    <span class="task-count">442 Tasks</span>
                  </div>
                  <div class="workload-indicators">
                    <div v-for="i in 12" :key="'cst-'+i" class="w-block active"></div>
                  </div>
                  <ul class="decomp-tasks-list">
                    <li>Global spot steel & copper pricing</li>
                    <li>Multimodal shipping route lead times</li>
                    <li>Robotic crane sequence kinematics</li>
                    <li>50-year net-zero energy cash flows</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 3. TERRESTRIAL BOTTLENECKS VS SPECULATOR ILLUSION -->
            <div class="speculator-vs-reality-box">
              <div class="speculator-banner">
                <div class="speculator-title">Order GPUs ➔ rake in cash?</div>
                <div class="speculator-sub">WHAT SPECULATORS THINK · MUSK</div>
              </div>

              <div class="bottleneck-explanation">
                <div class="bottleneck-headline">One delay holds up the whole project</div>
                <div class="bottlenecks-triad">
                  <div class="bottleneck-item">
                    <div class="b-icon-line">
                      <span class="eng-icon-inline" v-html="SVG_ICONS.power"></span>
                      <strong>ELECTRICITY</strong>
                    </div>
                    <p>5-7 year utility queue for 500MW+ substation interconnects. Local grids cannot handle simultaneous hyperclusters.</p>
                  </div>
                  <div class="bottleneck-item">
                    <div class="b-icon-line">
                      <span class="eng-icon-inline" v-html="SVG_ICONS.cleanroom"></span>
                      <strong>COOLING</strong>
                    </div>
                    <p>Billions of gallons of water consumed; severe regulatory moratoriums on municipal data center cooling permits.</p>
                  </div>
                  <div class="bottleneck-item">
                    <div class="b-icon-line">
                      <span class="eng-icon-inline" v-html="SVG_ICONS.laser"></span>
                      <strong>FAST CONNECTIONS</strong>
                    </div>
                    <p>Subsea fiber cuts, optical repeater latency, and physical terrestrial rights-of-way bottlenecks.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. CONCEPT: ORBITAL COMPUTER (JUL-SEP 2027) -->
            <div class="orbital-computer-deepdive">
              <div class="orbital-concept-header">
                <div class="milestone-badge">Jul–Sep 2027</div>
                <div class="concept-title">CONCEPT · ORBITAL COMPUTER (Q3 OF NEXT YEAR)</div>
              </div>

              <div class="orbital-diagram-wrap">
                <div class="orbital-sat-wireframe">
                  <div class="sat-wing left"></div>
                  <div class="sat-core-box">
                    <div class="die-grid">
                      <div class="tpu-cell"></div><div class="tpu-cell"></div><div class="tpu-cell"></div>
                      <div class="tpu-cell"></div><div class="tpu-cell"></div><div class="tpu-cell"></div>
                    </div>
                  </div>
                  <div class="sat-wing right"></div>
                  <div class="sat-radiator-fins">
                    <div class="fin"></div><div class="fin"></div><div class="fin"></div><div class="fin"></div>
                  </div>
                </div>

                <div class="orbital-advantages-list">
                  <div class="adv-item">
                    <span class="adv-tag">SOLAR FLUX</span>
                    <strong>Long stretches of sunlight:</strong> 1,361 W/m² continuous unattenuated solar radiation in sun-synchronous orbit with 100% uptime and zero weather loss.
                  </div>
                  <div class="adv-item">
                    <span class="adv-tag">VACUUM RADIATORS</span>
                    <strong>No air: radiators release the heat into space</strong> via Stefan-Boltzmann radiative cooling (P = ε σ A T⁴) directly into 2.7K vacuum. Consumes zero water.
                  </div>
                  <div class="adv-item">
                    <span class="adv-tag">STARSHIP LAUNCH</span>
                    <strong>Megawatt launch cadence:</strong> Starship payload volume and sub-$100/kg cost unlocks deploying hundreds of gigawatts in orbit.
                  </div>
                </div>
              </div>

              <div class="in-orbit-tests-checklist">
                <div class="tests-header">TESTS IN ORBIT:</div>
                <div class="tests-items">
                  <div class="test-check-item">
                    <span class="eng-icon-inline check" v-html="SVG_ICONS.check"></span>
                    <span>Useful work (Tensor Compute Delivered)</span>
                  </div>
                  <div class="test-check-item">
                    <span class="eng-icon-inline check" v-html="SVG_ICONS.check"></span>
                    <span>Power drawn (Continuous Solar Bus)</span>
                  </div>
                  <div class="test-check-item">
                    <span class="eng-icon-inline check" v-html="SVG_ICONS.check"></span>
                    <span>Heat released (Vacuum Thermal Radiator Balance)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 5. TEXAS SEMICONDUCTOR CORRIDOR ("UNDER ONE ROOF") -->
            <div class="texas-fab-corridor-box">
              <div class="corridor-header">
                <span class="eng-icon-inline" v-html="SVG_ICONS.chip"></span>
                <h4>TEXAS SEMICONDUCTOR CORRIDOR · MUSK PLANS</h4>
              </div>

              <div class="fabs-comparison-grid">
                <div class="fab-detail-card austin">
                  <div class="fab-badge green">AUSTIN · RESEARCH FAB</div>
                  <div class="under-one-roof-badge">DESIGN · MAKE · TEST UNDER ONE ROOF</div>
                  <div class="fab-loop-cycle">
                    <div class="loop-step">DESIGN</div>
                    <div class="loop-arrow">➔</div>
                    <div class="loop-step">MAKE</div>
                    <div class="loop-arrow">➔</div>
                    <div class="loop-step">TEST</div>
                  </div>
                  <div class="fab-rapid-iteration-quote">
                    "First chip runs too hot? Next version back sooner: test, try again."
                  </div>
                  <p class="fab-desc">
                    Eliminates traditional 6-month outsourced foundry turnarounds by co-locating silicon architecture, EUV photolithography, and wafer testing under a single roof.
                  </p>
                  <button class="fly-fab-btn" type="button" @click="flyToAustinFab()">
                    FLY TO AUSTIN FAB (30.22° N, 97.61° W) <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                  </button>
                </div>

                <div class="fab-detail-card grimes">
                  <div class="fab-badge white">GRIMES COUNTY · PLANNED PRODUCTION</div>
                  <div class="under-one-roof-badge mass">MASS SILICON PRODUCTION</div>
                  <div class="production-stats-row">
                    <div>OUTPUT: <strong>300mm Wafers</strong></div>
                    <div>ROLE: <strong>Starlink Gen-3 & Orbital AI</strong></div>
                  </div>
                  <p class="fab-desc">
                    Gigascale mass wafer manufacturing connected via Texas high-speed logistics to Starbase Boca Chica for immediate orbital rocket integration.
                  </p>
                  <button class="fly-fab-btn" type="button" @click="flyToGrimesMegaFab()">
                    FLY TO GRIMES COUNTY MEGAFAB <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- SUB-SECTION A: 6-LAYER SOVEREIGN COORDINATION FABRIC -->
          <div v-if="selectedBizSubSection === 'FAB_COORDINATION'" class="biz-card fabric-master-card">
            <div class="biz-card-header">
              <span class="biz-logo">
                <span class="eng-icon-inline" v-html="SVG_ICONS.chip"></span>
                SOVEREIGN FABRIC COORDINATION LAYER
              </span>
              <span class="biz-badge-special">CLOSED-LOOP DFM</span>
            </div>
            <p class="biz-desc">
              Full-stack 6-layer manufacturing architecture connecting cleanroom power grids, 2nm/3nm EUV lithography, 3D chiplet packaging, and orbital LEO computing clusters into a single observable event bus.
            </p>

            <!-- 6-LAYER COORDINATION MATRIX GRID -->
            <div class="fab-layers-matrix">
              <div
                v-for="(layerData, key) in fabEngineSummary.layers"
                :key="key"
                class="fab-layer-cell"
                :class="{ active: selectedFabLayerKey === key.toUpperCase() }"
                @click="selectedFabLayerKey = key.toUpperCase()"
              >
                <div class="layer-cell-top">
                  <span class="layer-tag">{{ key.toUpperCase() }}</span>
                  <span class="layer-status-dot" :class="layerData.status.toLowerCase()"></span>
                </div>
                <div class="layer-cell-title">{{ LAYER_DEFINITIONS[key.toUpperCase()].code }}</div>
                <div class="layer-cell-meta">
                  <span>{{ layerData.activeItems }} items</span>
                  <span v-if="layerData.alerts > 0" class="alert-count">{{ layerData.alerts }} alert</span>
                </div>
              </div>
            </div>

            <!-- ACTIVE LAYER DETAIL CARD -->
            <div class="active-layer-detail-card" v-if="selectedFabLayer">
              <div class="detail-head">
                <div class="detail-title-group">
                  <strong>{{ selectedFabLayer.id }}: {{ selectedFabLayer.name }}</strong>
                  <span class="facility-pill">{{ selectedFabLayer.facility }}</span>
                </div>
                <span class="metric-live-badge">{{ fabEngineSummary.layers[selectedFabLayerKey.toLowerCase()].throughput24h }} {{ selectedFabLayer.metricUnit }}</span>
              </div>
              <p class="detail-desc">{{ selectedFabLayer.description }}</p>
            </div>

            <!-- SPC STATISTICAL PROCESS CONTROL REAL-TIME ALERTS -->
            <div class="spc-alert-box" v-if="fabEngineSummary.spcViolations.length > 0">
              <div class="spc-head">
                <span class="eng-icon-inline" v-html="SVG_ICONS.alert"></span>
                <strong>AUTOMATED STATISTICAL PROCESS CONTROL (SPC)</strong>
                <span class="spc-pill">{{ fabEngineSummary.spcViolations[0].severity }}</span>
              </div>
              <div class="spc-content">
                <div><strong>CHAMBER:</strong> {{ fabEngineSummary.spcViolations[0].chamberId }}</div>
                <div><strong>RULE:</strong> {{ fabEngineSummary.spcViolations[0].rule }}</div>
                <div><strong>PARAM:</strong> {{ fabEngineSummary.spcViolations[0].parameter }} = <span class="highlight-val">{{ fabEngineSummary.spcViolations[0].value }}</span> (UCL: {{ fabEngineSummary.spcViolations[0].ucl }})</div>
                <div class="spc-action"><strong>AUTONOMOUS ACTION:</strong> {{ fabEngineSummary.spcViolations[0].action }}</div>
              </div>
            </div>

            <!-- CHIP LIFECYCLE JOURNEY VIEWER (SILICON TO ORBIT) -->
            <div class="lifecycle-card">
              <div class="lifecycle-header">
                <span class="eng-icon-inline" v-html="SVG_ICONS.package"></span>
                <strong>CHIP LIFECYCLE JOURNEY (SILICON TO ORBIT)</strong>
              </div>
              <div class="chip-picker-row">
                <button
                  v-for="chip in fabEngineSummary.chipInventory"
                  :key="chip.chipId"
                  class="chip-pick-btn"
                  :class="{ active: selectedFabChip.chipId === chip.chipId }"
                  @click="selectedFabChip = chip"
                >
                  {{ chip.chipId }}
                </button>
              </div>

              <div class="chip-journey-detail" v-if="selectedFabChip">
                <div class="journey-meta-row">
                  <div>FAMILY: <strong>{{ selectedFabChip.family }}</strong></div>
                  <div>GRADE: <strong class="green-text">{{ selectedFabChip.grade }}</strong></div>
                  <div>YIELD: <strong>{{ selectedFabChip.yieldPercent }}%</strong></div>
                  <div>THETA-JA: <strong>{{ selectedFabChip.thetaJA }} °C/W</strong></div>
                </div>

                <!-- 5-STAGE PIPELINE STEPPER -->
                <div class="journey-steps-stepper">
                  <div class="step-node active">
                    <div class="step-circle" v-html="SVG_ICONS.chip"></div>
                    <span class="step-name">L2 Design</span>
                  </div>
                  <div class="step-connector"></div>
                  <div class="step-node active">
                    <div class="step-circle" v-html="SVG_ICONS.cleanroom"></div>
                    <span class="step-name">L3 Litho</span>
                  </div>
                  <div class="step-connector"></div>
                  <div class="step-node active">
                    <div class="step-circle" v-html="SVG_ICONS.package"></div>
                    <span class="step-name">L4 3D Pkg</span>
                  </div>
                  <div class="step-connector"></div>
                  <div class="step-node" :class="{ active: selectedFabChip.qualified }">
                    <div class="step-circle" v-html="SVG_ICONS.test"></div>
                    <span class="step-name">L5 Qual</span>
                  </div>
                  <div class="step-connector"></div>
                  <div class="step-node" :class="{ active: selectedFabChip.telemetry }">
                    <div class="step-circle" v-html="SVG_ICONS.orbital"></div>
                    <span class="step-name">L6 Orbit</span>
                  </div>
                </div>

                <div class="chip-destination-box">
                  <div class="dest-label">CURRENT LOCATION & DISPOSITION:</div>
                  <strong>{{ selectedFabChip.destination }}</strong>
                  <div v-if="selectedFabChip.telemetry" class="in-situ-telemetry">
                    <span>In-Situ Latency: <strong>{{ selectedFabChip.telemetry.latencyMs }} ms</strong></span>
                    <span>Core Temp: <strong>{{ selectedFabChip.telemetry.inSituTempC }} °C</strong></span>
                    <span>Throttling: <strong>{{ selectedFabChip.telemetry.throttling ? 'YES' : 'NONE (0%)' }}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- PHYSICAL TEXAS FAB NODES -->
            <div class="terrafab-nodes-list">
              <div
                v-for="node in TERRAFAB_NETWORK_NODES"
                :key="node.id"
                class="terrafab-node-item"
              >
                <div class="node-head">
                  <strong>{{ node.name }}</strong>
                  <span class="node-status-pill">{{ node.status }}</span>
                </div>
                <div class="node-sub">{{ node.role }} · {{ node.location }}</div>
                <div class="node-metrics-bar">
                  <span>Power: <strong>{{ node.powerCapacityMw }} MW</strong></span>
                  <span>Turnaround: <strong>{{ node.turnaroundTime }}</strong></span>
                </div>
                <p class="node-focus">{{ node.focus }}</p>
                <button
                  v-if="node.coords[0] !== 0"
                  class="fly-node-btn"
                  type="button"
                  @click="flyToTarget(node.coords[0], node.coords[1], 1500, 45, -50)"
                >
                  VECTOR CAMERA 3D <span class="eng-icon-inline" v-html="SVG_ICONS.vectorArrow"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- SUB-SECTION B: COMMERCIAL PLANS & AVAILABILITY -->
          <div v-if="selectedBizSubSection === 'COMMERCIAL_PLANS'" class="biz-card">
            <div class="biz-card-header">
              <span class="biz-logo">
                <span class="eng-icon-inline" v-html="SVG_ICONS.antenna"></span>
                COMMERCIAL SERVICE & PRICING
              </span>
              <span class="biz-badge-avail">99.9% GLOBAL</span>
            </div>
            <div class="plan-selector-chips">
              <button
                v-for="plan in STARLINK_BUSINESS_PLANS"
                :key="plan.id"
                class="plan-chip"
                :class="{ active: selectedBizPlan.id === plan.id }"
                @click="selectedBizPlan = plan"
              >
                <span class="eng-icon-inline" v-html="getEngIcon(plan.iconType)"></span>
                {{ plan.name.split(' ')[0] }}
              </button>
            </div>

            <div class="plan-details-box">
              <div class="plan-title-row">
                <h4>
                  <span class="eng-icon-inline" v-html="getEngIcon(selectedBizPlan.iconType)"></span>
                  {{ selectedBizPlan.name }}
                </h4>
                <div class="plan-price-tag">
                  <strong>${{ selectedBizPlan.monthlyCost }}</strong>/mo
                  <small v-if="selectedBizPlan.hardwareCost > 0">(${{ selectedBizPlan.hardwareCost }} HW)</small>
                </div>
              </div>
              <p class="plan-target"><strong>TARGET:</strong> {{ selectedBizPlan.target }}</p>
              <div class="plan-specs-grid">
                <div>DOWN: <strong>{{ selectedBizPlan.downlinkMbps }}</strong></div>
                <div>UP: <strong>{{ selectedBizPlan.uplinkMbps }}</strong></div>
                <div>PING: <strong>{{ selectedBizPlan.latencyMs }}</strong></div>
                <div>UPTIME: <strong>{{ selectedBizPlan.availabilityGlobalPct }}%</strong></div>
              </div>
              <ul class="plan-features">
                <li v-for="feat in selectedBizPlan.features" :key="feat">
                  <span class="eng-icon-inline feat-check" v-html="SVG_ICONS.check"></span>
                  {{ feat }}
                </li>
              </ul>
            </div>
          </div>

          <!-- SUB-SECTION C: FINANCIAL LATENCY & ROI ARBITRAGE SIMULATOR -->
          <div v-if="selectedBizSubSection === 'ARBITRAGE'" class="biz-card arbitrage-card">
            <div class="biz-card-header">
              <span class="biz-logo">
                <span class="eng-icon-inline" v-html="SVG_ICONS.metrics"></span>
                FINANCIAL ARBITRAGE & ROI
              </span>
              <span class="biz-badge-roi">+{{ bizArbitrage.annualRoiPct }}% ROI</span>
            </div>
            <div class="arbitrage-toggle-row">
              <label>SCENARIO:</label>
              <select v-model="selectedArbitrageScenario" class="biz-select">
                <option value="HFT_FINANCE">High-Frequency Trading (London-NY-Tokyo)</option>
                <option value="MARITIME_CONTAINER">Global Container Fleet (50 Vessels)</option>
                <option value="DATA_CENTER_FAILOVER">Enterprise 110kV Blackout Failover</option>
              </select>
            </div>
            <div class="arbitrage-stats-grid">
              <div class="arb-stat">
                <small>VACUUM LATENCY SAVINGS</small>
                <strong class="green-text">-{{ bizArbitrage.latencySavedMs }} ms</strong>
              </div>
              <div class="arb-stat">
                <small>MONTHLY RISK MITIGATION</small>
                <strong>${{ (bizArbitrage.riskMitigationValueUsd / 1000).toFixed(0) }}k</strong>
              </div>
              <div class="arb-stat">
                <small>STARLINK MONTHLY COST</small>
                <strong>${{ (bizArbitrage.starlinkCostUsd / 1000).toFixed(0) }}k</strong>
              </div>
              <div class="arb-stat">
                <small>NET MONTHLY BENEFIT</small>
                <strong class="gold-text">${{ (bizArbitrage.netMonthlyBenefitUsd / 1000).toFixed(0) }}k</strong>
              </div>
            </div>
            <p class="arb-note">{{ bizArbitrage.vacuumSpeedVsGlassAdvantage }}</p>
          </div>

          <!-- SUB-SECTION D: PLANETARY FUTURE OUTLOOK 2026 - 2030 -->
          <div v-if="selectedBizSubSection === 'OUTLOOK'" class="biz-card future-card">
            <div class="biz-card-header">
              <span class="biz-logo">
                <span class="eng-icon-inline" v-html="SVG_ICONS.orbital"></span>
                FUTURE OUTLOOK 2026–2030
              </span>
              <span class="biz-badge-dom">DOMINANCE INDEX</span>
            </div>
            <div class="timeline-stepper">
              <button
                v-for="ph in FUTURE_OUTLOOK_PHASES"
                :key="ph.year"
                class="timeline-step-btn"
                :class="{ active: selectedOutlookPhase.year === ph.year }"
                @click="selectedOutlookPhase = ph"
              >
                {{ ph.year }}
              </button>
            </div>

            <div class="timeline-phase-body">
              <h4>{{ selectedOutlookPhase.title }}</h4>
              <div class="future-metrics-row">
                <div>SATELLITES: <strong>{{ selectedOutlookPhase.satellitesInOrbit.toLocaleString() }}</strong></div>
                <div>OPTICAL ISL: <strong>{{ selectedOutlookPhase.opticalLaserSpeed }}</strong></div>
                <div>REVENUE: <strong>{{ selectedOutlookPhase.annualRunRate }}</strong></div>
                <div>POWER: <strong>{{ selectedOutlookPhase.powerDemandGw }}</strong></div>
              </div>
              <p class="phase-desc">{{ selectedOutlookPhase.summary }}</p>
              <div class="dominance-bar-wrapper">
                <div class="dominance-lbl">
                  <span>Global Space & Terrestrial AI Dominance</span>
                  <strong>{{ selectedOutlookPhase.starlinkDominanceIndex }}%</strong>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: selectedOutlookPhase.starlinkDominanceIndex + '%' }"></div>
                </div>
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
  flex: 1 1 auto;
  min-width: 0;
  scrollbar-width: thin;
  padding: 0.1rem 0.25rem;
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
  flex-shrink: 0;
  margin-left: 0.6rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
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

.starlink-badges-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.starlink-badge-11k {
  font-size: 0.6rem;
  font-weight: 700;
  background: rgba(163, 230, 53, 0.2);
  color: #a3e635;
  border: 1px solid rgba(163, 230, 53, 0.4);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  letter-spacing: 0.05em;
}

.starlink-badge-live {
  font-size: 0.6rem;
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

.starlink-laser-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(163, 230, 53, 0.3);
  border-radius: 4px;
  padding: 0.45rem 0.6rem;
  margin-bottom: 0.6rem;
}

.laser-today, .laser-nextgen {
  display: flex;
  flex-direction: column;
}

.laser-lbl {
  font-size: 0.55rem;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.laser-val {
  font-size: 0.72rem;
  font-weight: 700;
  color: #f8fafc;
}

.highlight-green {
  color: #a3e635 !important;
  text-shadow: 0 0 8px rgba(163, 230, 53, 0.5);
}

.laser-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.laser-beam-anim {
  width: 48px;
  height: 2px;
  background: #a3e635;
  box-shadow: 0 0 6px #a3e635;
  border-radius: 1px;
}

.laser-mult {
  font-size: 0.55rem;
  font-weight: 700;
  color: #a3e635;
}

.infrastructure-matrix-chips {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}

.infra-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(2, 6, 23, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.3rem 0.45rem;
}

.infra-chip.active {
  border-color: rgba(0, 255, 255, 0.3);
  background: rgba(6, 25, 45, 0.75);
}

.infra-icon {
  font-size: 0.8rem;
}

.infra-text {
  display: flex;
  flex-direction: column;
}

.infra-text strong {
  font-size: 0.58rem;
  color: #f1f5f9;
  line-height: 1.1;
}

.infra-text small {
  font-size: 0.52rem;
  color: #94a3b8;
}

.mechazilla-quick-card {
  background: rgba(20, 15, 5, 0.75);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 4px;
  padding: 0.45rem 0.6rem;
  margin-top: 0.6rem;
}

.mechazilla-quick-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.mechazilla-quick-head strong {
  font-size: 0.65rem;
  color: #fbbf24;
}

.catch-pill {
  font-size: 0.55rem;
  font-weight: 700;
  background: rgba(163, 230, 53, 0.2);
  color: #a3e635;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.tower-desc {
  font-size: 0.58rem;
  color: #cbd5e1;
  line-height: 1.3;
  margin: 0;
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

/* ── TERRAFAB & BIZ INTELLIGENCE CONSOLE STYLES ────────────────────────── */
.highlight-biz-tab.active {
  background: rgba(234, 179, 8, 0.25) !important;
  border-color: #eab308 !important;
  color: #fef08a !important;
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.4) !important;
}

.biz-card {
  background: rgba(10, 15, 30, 0.88);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 6px;
  padding: 0.8rem;
  backdrop-filter: blur(8px);
  margin-bottom: 0.8rem;
}

.biz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.biz-logo {
  font-size: 0.72rem;
  font-weight: 700;
  color: #facc15;
}

.biz-badge-special, .biz-badge-avail, .biz-badge-roi, .biz-badge-dom {
  font-size: 0.58rem;
  font-weight: 700;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  letter-spacing: 0.05em;
}

.biz-badge-special { background: rgba(234, 179, 8, 0.2); color: #fef08a; border: 1px solid #eab308; }
.biz-badge-avail { background: rgba(34, 197, 94, 0.2); color: #86efac; border: 1px solid #22c55e; }
.biz-badge-roi { background: rgba(56, 189, 248, 0.2); color: #7dd3fc; border: 1px solid #38bdf8; }
.biz-badge-dom { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid #a855f7; }

.biz-desc {
  font-size: 0.6rem;
  color: #94a3b8;
  line-height: 1.35;
  margin-bottom: 0.6rem;
}

.terrafab-nodes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.terrafab-node-item {
  background: rgba(2, 6, 23, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.5rem;
}

.node-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-head strong {
  font-size: 0.68rem;
  color: #f8fafc;
}

.node-status-pill {
  font-size: 0.52rem;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 0.1rem 0.25rem;
  border-radius: 2px;
}

.node-sub {
  font-size: 0.58rem;
  color: #cbd5e1;
  margin-top: 2px;
}

.node-metrics-bar {
  display: flex;
  justify-content: space-between;
  font-size: 0.56rem;
  color: #94a3b8;
  margin: 0.3rem 0;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.node-metrics-bar strong {
  color: #38bdf8;
}

.node-focus {
  font-size: 0.55rem;
  color: #94a3b8;
  margin: 0.2rem 0 0.4rem 0;
  line-height: 1.3;
}

.fly-node-btn {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: all 0.15s ease;
}

.fly-node-btn:hover {
  background: #38bdf8;
  color: #020617;
}

/* Plan selector */
.plan-selector-chips {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: 0.6rem;
}

.plan-chip {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 0.56rem;
  padding: 0.25rem 0.45rem;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.plan-chip.active {
  background: rgba(34, 197, 94, 0.25);
  border-color: #22c55e;
  color: #86efac;
}

.plan-details-box {
  background: rgba(2, 6, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.6rem;
}

.plan-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.plan-title-row h4 {
  font-size: 0.7rem;
  color: #f8fafc;
  margin: 0;
}

.plan-price-tag strong {
  font-size: 0.8rem;
  color: #22c55e;
}

.plan-price-tag small {
  font-size: 0.55rem;
  color: #94a3b8;
}

.plan-target {
  font-size: 0.58rem;
  color: #cbd5e1;
  margin-bottom: 0.4rem;
}

.plan-specs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.25rem;
  font-size: 0.56rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.3rem 0.5rem;
  border-radius: 3px;
  margin-bottom: 0.4rem;
}

.plan-specs-grid strong {
  color: #f1f5f9;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.55rem;
  color: #94a3b8;
}

/* Arbitrage */
.biz-select {
  background: #091322;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  font-size: 0.58rem;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  width: 100%;
  margin-top: 0.2rem;
}

.arbitrage-toggle-row label {
  font-size: 0.55rem;
  color: #94a3b8;
}

.arbitrage-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  margin: 0.5rem 0;
}

.arb-stat {
  background: rgba(2, 6, 23, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.4rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.arb-stat small {
  font-size: 0.5rem;
  color: #94a3b8;
}

.arb-stat strong {
  font-size: 0.75rem;
  color: #f8fafc;
}

.green-text { color: #22c55e !important; }
.gold-text { color: #facc15 !important; }

.arb-note {
  font-size: 0.55rem;
  color: #38bdf8;
  font-style: italic;
  margin: 0;
}

/* Future outlook timeline */
.timeline-stepper {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
}

.timeline-step-btn {
  flex: 1;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 0.58rem;
  padding: 0.25rem 0.4rem;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 700;
}

.timeline-step-btn.active {
  background: rgba(168, 85, 247, 0.25);
  border-color: #a855f7;
  color: #d8b4fe;
}

.timeline-phase-body h4 {
  font-size: 0.68rem;
  color: #f8fafc;
  margin-bottom: 0.3rem;
}

.future-metrics-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.25rem;
  font-size: 0.55rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.3rem 0.5rem;
  border-radius: 3px;
  margin-bottom: 0.4rem;
}

.future-metrics-row strong {
  color: #c084fc;
}

.phase-desc {
  font-size: 0.58rem;
  color: #cbd5e1;
  line-height: 1.35;
  margin-bottom: 0.5rem;
}

.dominance-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dominance-lbl {
  display: flex;
  justify-content: space-between;
  font-size: 0.52rem;
  color: #94a3b8;
}

.dominance-lbl strong {
  color: #a855f7;
}

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #a855f7, #facc15);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Precision Engineering Vector Icons styling */
.eng-icon {
  width: 14px;
  height: 14px;
  display: inline-block;
  vertical-align: middle;
}

.eng-icon-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  margin-right: 4px;
}

.eng-icon-inline svg {
  width: 13px;
  height: 13px;
}

.feat-check svg {
  width: 11px;
  height: 11px;
  color: #22c55e;
}

/* Sub-nav navigation pills */
.biz-subnav-pills {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.biz-subnav-btn {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.biz-subnav-btn:hover {
  background: rgba(30, 41, 59, 0.9);
  color: #f1f5f9;
}

.biz-subnav-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

/* 6-Layer Coordination Matrix */
.fab-layers-matrix {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
  margin: 0.5rem 0;
}

.fab-layer-cell {
  background: rgba(2, 6, 23, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.35rem 0.45rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fab-layer-cell:hover {
  border-color: rgba(56, 189, 248, 0.4);
}

.fab-layer-cell.active {
  background: rgba(15, 23, 42, 0.95);
  border-color: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
}

.layer-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-tag {
  font-size: 0.55rem;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
}

.layer-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 5px #22c55e;
}

.layer-status-dot.degraded { background: #eab308; }
.layer-status-dot.down { background: #ef4444; }

.layer-cell-title {
  font-size: 0.62rem;
  font-weight: 700;
  color: #f8fafc;
  margin-top: 0.1rem;
}

.layer-cell-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.5rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.layer-cell-meta .alert-count {
  color: #ef4444;
  font-weight: 700;
}

.active-layer-detail-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
}

.detail-title-group strong {
  font-size: 0.65rem;
  color: #f8fafc;
  display: block;
}

.facility-pill {
  font-size: 0.5rem;
  color: #38bdf8;
  font-family: monospace;
}

.metric-live-badge {
  font-size: 0.52rem;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  font-weight: 700;
}

.detail-desc {
  font-size: 0.55rem;
  color: #cbd5e1;
  line-height: 1.35;
  margin: 0;
}

/* SPC Alert Box */
.spc-alert-box {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  padding: 0.45rem;
  margin-bottom: 0.5rem;
}

.spc-head {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.58rem;
  color: #f87171;
  margin-bottom: 0.25rem;
}

.spc-pill {
  background: rgba(239, 68, 68, 0.2);
  border-radius: 2px;
  padding: 0.1rem 0.25rem;
  font-size: 0.48rem;
  font-weight: 800;
  margin-left: auto;
}

.spc-content {
  font-size: 0.52rem;
  color: #cbd5e1;
  line-height: 1.35;
}

.highlight-val {
  color: #f87171;
  font-weight: 800;
}

.spc-action {
  color: #38bdf8;
  margin-top: 0.2rem;
  font-size: 0.52rem;
}

/* Chip Lifecycle Journey */
.lifecycle-card {
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.lifecycle-header {
  font-size: 0.58rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
}

.chip-picker-row {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.4rem;
  overflow-x: auto;
}

.chip-pick-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.5rem;
  font-family: monospace;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.chip-pick-btn.active {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  color: #f8fafc;
  font-weight: 700;
}

.journey-meta-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.2rem 0.5rem;
  font-size: 0.52rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.02);
  padding: 0.3rem 0.4rem;
  border-radius: 3px;
  margin-bottom: 0.4rem;
}

.journey-steps-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.5rem 0;
}

.step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  opacity: 0.4;
}

.step-node.active {
  opacity: 1;
}

.step-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
}

.step-node.active .step-circle {
  background: rgba(56, 189, 248, 0.2);
  border-color: #00f0ff;
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.3);
}

.step-name {
  font-size: 0.48rem;
  color: #cbd5e1;
}

.step-connector {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 0.2rem;
  margin-bottom: 0.7rem;
}

.chip-destination-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(56, 189, 248, 0.3);
  padding: 0.35rem 0.45rem;
  border-radius: 3px;
  font-size: 0.52rem;
}

.dest-label {
  color: #94a3b8;
  font-size: 0.48rem;
}

.in-situ-telemetry {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.25rem;
  color: #38bdf8;
  font-family: monospace;
}


/* Decision Hub & Reports Styling */
.decision-hub-card {
  border-color: rgba(250, 204, 21, 0.3) !important;
}

.biz-subnav-btn.highlight-gold {
  color: #facc15;
  border-color: rgba(250, 204, 21, 0.4);
}

.biz-subnav-btn.highlight-gold.active {
  background: rgba(250, 204, 21, 0.18);
  border-color: #facc15;
  color: #fef08a;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.25);
}

.report-actions-panel {
  background: rgba(2, 6, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.action-label {
  font-size: 0.48rem;
  color: #94a3b8;
  font-weight: 700;
  display: block;
  margin-bottom: 0.2rem;
}

.download-btn-row {
  display: flex;
  gap: 0.3rem;
}

.report-dl-btn {
  flex: 1;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 0.52rem;
  font-weight: 700;
  padding: 0.3rem 0.4rem;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.report-dl-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #f8fafc;
}

.report-dl-btn.md {
  border-color: rgba(168, 85, 247, 0.4);
  color: #c084fc;
}

.report-dl-btn.md:hover {
  background: rgba(168, 85, 247, 0.2);
  color: #f8fafc;
}

.upload-dropzone {
  border: 1px dashed rgba(250, 204, 21, 0.4);
  background: rgba(250, 204, 21, 0.04);
  border-radius: 4px;
  padding: 0.4rem;
  text-align: center;
  font-size: 0.5rem;
  color: #fef08a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}

.upload-dropzone:hover {
  background: rgba(250, 204, 21, 0.1);
  border-color: #facc15;
}

.hidden-file-input {
  display: none;
}

.upload-feedback-pill {
  font-size: 0.5rem;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  margin-top: 0.2rem;
  font-family: monospace;
}

/* Decision Query Box */
.decision-query-box {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.query-box-head {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.55rem;
  color: #f8fafc;
  margin-bottom: 0.3rem;
}

.query-input-row {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
}

.decision-input {
  flex: 1;
  background: rgba(2, 6, 23, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  font-size: 0.55rem;
  padding: 0.3rem 0.5rem;
  border-radius: 3px;
  outline: none;
}

.decision-input:focus {
  border-color: #00f0ff;
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.3);
}

.decision-run-btn {
  background: rgba(0, 240, 255, 0.25);
  border: 1px solid #00f0ff;
  color: #00f0ff;
  font-size: 0.55rem;
  font-weight: 800;
  padding: 0 0.6rem;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.decision-run-btn:hover {
  background: #00f0ff;
  color: #020617;
}

.query-template-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.4rem;
}

.query-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.48rem;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  cursor: pointer;
}

.query-chip:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-color: #38bdf8;
}

/* Query Result Matrix */
.decision-result-matrix {
  background: rgba(2, 6, 23, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 4px;
  padding: 0.45rem;
  margin-top: 0.4rem;
}

.result-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.52rem;
  margin-bottom: 0.3rem;
}

.res-sub {
  color: #94a3b8;
  margin-right: 4px;
}

.risk-badge {
  font-size: 0.48rem;
  font-weight: 800;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.risk-badge.high_opportunity { background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid #22c55e; }
.risk-badge.critical_infrastructure { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
.risk-badge.moderate { background: rgba(234, 179, 8, 0.2); color: #eab308; border: 1px solid #eab308; }

.recommendation-block {
  background: rgba(255, 255, 255, 0.03);
  border-left: 2px solid #00f0ff;
  padding: 0.3rem 0.45rem;
  border-radius: 0 3px 3px 0;
  margin-bottom: 0.4rem;
}

.rec-title {
  font-size: 0.48rem;
  font-weight: 800;
  color: #00f0ff;
  margin-bottom: 0.15rem;
}

.recommendation-block p {
  font-size: 0.52rem;
  color: #f1f5f9;
  line-height: 1.35;
  margin: 0;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.3rem;
}

.evidence-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.35rem;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
}

.evidence-item small {
  font-size: 0.46rem;
  color: #94a3b8;
}

.evidence-item strong {
  font-size: 0.52rem;
  color: #e2e8f0;
}

.merkle-proof-row {
  display: flex;
  gap: 0.3rem;
  font-size: 0.46rem;
  color: #64748b;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 0.25rem;
}

.merkle-proof-row code {
  color: #a855f7;
  font-size: 0.44rem;
}

/* News Wire Box */
.news-wire-box {
  background: rgba(2, 6, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.45rem;
  margin-bottom: 0.5rem;
}

.news-head {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.55rem;
  color: #f8fafc;
  margin-bottom: 0.35rem;
}

.news-count-pill {
  margin-left: auto;
  font-size: 0.48rem;
  color: #38bdf8;
  font-family: monospace;
}

.news-stream {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 180px;
  overflow-y: auto;
}

.news-item {
  background: rgba(15, 23, 42, 0.7);
  border-left: 2px solid #38bdf8;
  border-radius: 0 3px 3px 0;
  padding: 0.3rem 0.4rem;
}

.news-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.15rem;
}

.news-sev {
  font-size: 0.45rem;
  font-weight: 800;
  padding: 0.05rem 0.25rem;
  border-radius: 2px;
}

.news-sev.high_impact { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.news-sev.strategic_positive { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.news-sev.critical_risk { background: rgba(234, 179, 8, 0.2); color: #facc15; }
.news-sev.transformative { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

.news-time {
  font-size: 0.46rem;
  color: #64748b;
}

.news-title {
  font-size: 0.54rem;
  color: #f8fafc;
  display: block;
  margin-bottom: 0.15rem;
}

.news-impact {
  font-size: 0.48rem;
  color: #cbd5e1;
  margin: 0 0 0.15rem 0;
  line-height: 1.3;
}

.news-action {
  font-size: 0.48rem;
  color: #38bdf8;
}

/* Redis Status Strip */
.redis-status-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
  background: rgba(2, 6, 23, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 0.3rem 0.4rem;
}

.redis-stat {
  display: flex;
  flex-direction: column;
}

.redis-stat small {
  font-size: 0.44rem;
  color: #64748b;
}

.redis-stat strong {
  font-size: 0.5rem;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Super Intelligence & Orbital Compute Styling */
.biz-subnav-btn.highlight-super-intel {
  color: #c084fc;
  border-color: rgba(192, 132, 252, 0.4);
}

.biz-subnav-btn.highlight-super-intel.active {
  background: rgba(168, 85, 247, 0.2);
  border-color: #c084fc;
  color: #f3e8ff;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
}

.super-intel-card {
  border-color: rgba(168, 85, 247, 0.35) !important;
}

.musk-doctrine-banner {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.quote-card.primary {
  background: rgba(15, 23, 42, 0.85);
  border-left: 3px solid #a855f7;
  padding: 0.5rem 0.6rem;
  border-radius: 0 4px 4px 0;
}

.quote-text {
  font-size: 0.62rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.35;
  margin-bottom: 0.2rem;
}

.quote-meta {
  font-size: 0.46rem;
  color: #94a3b8;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.quote-pair-row {
  display: flex;
  gap: 0.4rem;
}

.quote-subcard {
  flex: 1;
  background: rgba(2, 6, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.4rem 0.5rem;
}

.sub-quote-metric {
  font-size: 0.72rem;
  font-weight: 800;
  color: #a3e635;
  letter-spacing: 0.02em;
}

.sub-quote-label {
  font-size: 0.44rem;
  color: #94a3b8;
  font-weight: 700;
}

.quote-caveat {
  font-size: 0.5rem;
  color: #94a3b8;
  font-style: italic;
  padding: 0.2rem 0.4rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.caveat-author {
  font-weight: 700;
  font-style: normal;
  color: #cbd5e1;
  margin-left: 0.25rem;
}

/* Task Decomposition */
.task-decomposition-panel {
  background: rgba(2, 6, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.decomp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.decomp-badge {
  font-size: 0.44rem;
  font-weight: 800;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.decomp-header h4 {
  font-size: 0.58rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
}

.decomp-total {
  font-size: 0.56rem;
  font-weight: 800;
  color: #a3e635;
}

.decomp-sub {
  font-size: 0.48rem;
  color: #94a3b8;
  margin: 0 0 0.4rem 0;
  line-height: 1.3;
}

.decomp-columns-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.decomp-col {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 0.35rem;
}

.decomp-col-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.cat-name {
  font-size: 0.48rem;
  font-weight: 800;
  color: #f1f5f9;
}

.task-count {
  font-size: 0.46rem;
  color: #a3e635;
  font-weight: 700;
}

.workload-indicators {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin-bottom: 0.3rem;
}

.w-block.active {
  height: 3px;
  background: #a3e635;
  border-radius: 1px;
}

.decomp-tasks-list {
  margin: 0;
  padding-left: 0.75rem;
  font-size: 0.44rem;
  color: #cbd5e1;
  line-height: 1.35;
}

/* Speculator vs Reality */
.speculator-vs-reality-box {
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.speculator-banner {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
  padding: 0.35rem 0.5rem;
  border-radius: 0 3px 3px 0;
  margin-bottom: 0.4rem;
}

.speculator-title {
  font-size: 0.64rem;
  font-weight: 800;
  color: #fca5a5;
}

.speculator-sub {
  font-size: 0.44rem;
  color: #94a3b8;
  font-weight: 700;
}

.bottleneck-headline {
  font-size: 0.54rem;
  font-weight: 800;
  color: #fef08a;
  margin-bottom: 0.35rem;
}

.bottlenecks-triad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.bottleneck-item {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  padding: 0.35rem;
}

.b-icon-line {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.48rem;
  color: #f87171;
  font-weight: 800;
  margin-bottom: 0.2rem;
}

.bottleneck-item p {
  margin: 0;
  font-size: 0.44rem;
  color: #94a3b8;
  line-height: 1.3;
}

/* Orbital Computer Concept */
.orbital-computer-deepdive {
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.orbital-concept-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.milestone-badge {
  background: rgba(163, 230, 53, 0.15);
  border: 1px solid #a3e635;
  color: #a3e635;
  font-size: 0.48rem;
  font-weight: 800;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
}

.concept-title {
  font-size: 0.54rem;
  font-weight: 800;
  color: #f8fafc;
}

.orbital-diagram-wrap {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.4rem;
}

.orbital-sat-wireframe {
  width: 90px;
  height: 60px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sat-wing {
  width: 24px;
  height: 38px;
  border: 1px solid #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 1px;
}

.sat-core-box {
  width: 32px;
  height: 32px;
  border: 1px solid #a3e635;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.die-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.tpu-cell {
  width: 5px;
  height: 5px;
  background: #a3e635;
}

.sat-radiator-fins {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
}

.sat-radiator-fins .fin {
  width: 1px;
  height: 12px;
  background: #f8fafc;
  opacity: 0.6;
}

.orbital-advantages-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.adv-item {
  font-size: 0.46rem;
  color: #cbd5e1;
  line-height: 1.3;
}

.adv-tag {
  font-size: 0.42rem;
  font-weight: 800;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 0.05rem 0.2rem;
  border-radius: 2px;
  margin-right: 0.2rem;
}

.in-orbit-tests-checklist {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 0.35rem 0.5rem;
}

.tests-header {
  font-size: 0.48rem;
  font-weight: 800;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.tests-items {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.test-check-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.48rem;
  color: #f1f5f9;
}

.eng-icon-inline.check {
  color: #a3e635;
}

/* Texas Semiconductor Corridor */
.texas-fab-corridor-box {
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 4px;
  padding: 0.5rem;
}

.corridor-header {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.54rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 0.4rem;
}

.fabs-comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

.fab-detail-card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
}

.fab-badge {
  font-size: 0.48rem;
  font-weight: 800;
  margin-bottom: 0.2rem;
}

.fab-badge.green {
  color: #a3e635;
}

.fab-badge.white {
  color: #f8fafc;
}

.under-one-roof-badge {
  font-size: 0.42rem;
  color: #38bdf8;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.1);
  padding: 0.1rem 0.25rem;
  border-radius: 2px;
  margin-bottom: 0.3rem;
}

.fab-loop-cycle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.48rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 0.25rem;
}

.fab-rapid-iteration-quote {
  font-size: 0.46rem;
  color: #fef08a;
  font-style: italic;
  margin-bottom: 0.3rem;
  line-height: 1.3;
}

.fab-desc {
  font-size: 0.44rem;
  color: #94a3b8;
  line-height: 1.3;
  margin: 0 0 0.4rem 0;
  flex: 1;
}

.fly-fab-btn {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #a3e635;
  font-size: 0.46rem;
  font-weight: 700;
  padding: 0.25rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  transition: all 0.2s ease;
}

.fly-fab-btn:hover {
  background: rgba(34, 197, 94, 0.25);
  color: #f8fafc;
}

/* Radar (Skyscanner & Maritime) Styling */
.radar-hud-card, .cityscapes-hud-card {
  background: rgba(10, 15, 29, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 0.6rem;
}

.radar-header-row, .cityscapes-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.radar-title, .cityscapes-title {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.62rem;
  font-weight: 800;
  color: #f8fafc;
}

.radar-live-badge {
  font-size: 0.44rem;
  font-weight: 800;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.radar-desc, .cityscapes-desc {
  font-size: 0.48rem;
  color: #94a3b8;
  margin: 0 0 0.5rem 0;
  line-height: 1.35;
}

.tracker-mode-switch {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}

.mode-switch-btn {
  flex: 1;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.5rem;
  font-weight: 700;
  padding: 0.3rem 0.4rem;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
}

.mode-switch-btn.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
}

.tracker-search-wrap {
  position: relative;
  margin-bottom: 0.5rem;
}

.tracker-search-wrap .search-icon {
  position: absolute;
  left: 0.4rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  width: 12px;
  height: 12px;
}

.tracker-search-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(2, 6, 23, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  padding: 0.35rem 1.6rem 0.35rem 1.4rem;
  color: #f8fafc;
  font-size: 0.5rem;
}

.clear-search-btn {
  position: absolute;
  right: 0.4rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.tracker-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 480px;
  overflow-y: auto;
}

.tracker-card {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.45rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tracker-card:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(56, 189, 248, 0.3);
}

.tracker-card.selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
}

.tracker-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.airline-brand-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.airline-code-badge, .operator-code-badge {
  font-size: 0.44rem;
  font-weight: 800;
  background: #38bdf8;
  color: #020617;
  padding: 0.08rem 0.25rem;
  border-radius: 2px;
}

.operator-code-badge {
  background: #34d399;
}

.airline-name {
  font-size: 0.52rem;
  font-weight: 700;
  color: #f1f5f9;
}

.flight-callsign, .vessel-imo {
  font-size: 0.46rem;
  color: #94a3b8;
}

.vessel-full-name {
  font-size: 0.58rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 0.3rem 0;
}

.flight-phase-chip, .vessel-status-chip {
  font-size: 0.42rem;
  font-weight: 800;
  color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
  padding: 0.08rem 0.25rem;
  border-radius: 2px;
}

.route-airports-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.35rem;
}

.airport-col {
  display: flex;
  flex-direction: column;
}

.airport-code, .port-code {
  font-size: 0.72rem;
  font-weight: 800;
  color: #f8fafc;
}

.airport-city {
  font-size: 0.44rem;
  color: #94a3b8;
  margin-bottom: 0.15rem;
}

.flight-time-line {
  font-size: 0.46rem;
  color: #cbd5e1;
}

.time-lbl {
  color: #64748b;
  font-size: 0.42rem;
  margin-right: 0.15rem;
}

.time-val.highlight-green {
  color: #a3e635;
}

.sched-sub {
  font-size: 0.4rem;
  color: #64748b;
}

.route-center-vector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.flight-vector-arrow {
  color: #38bdf8;
  font-size: 0.75rem;
}

.duration-pill {
  font-size: 0.44rem;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  padding: 0.06rem 0.25rem;
  border-radius: 2px;
}

.duration-pill.sea {
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
}

.duration-progress-bar-wrap {
  margin-bottom: 0.35rem;
}

.duration-labels-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.44rem;
  color: #94a3b8;
  margin-bottom: 0.15rem;
}

.pct-badge {
  font-weight: 800;
  color: #38bdf8;
}

.pct-badge.sea {
  color: #34d399;
}

.flight-progress-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.flight-progress-fill {
  height: 100%;
  background: #38bdf8;
}

.flight-progress-fill.sea {
  background: #34d399;
}

.tracker-metrics-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
}

.telemetry-chips {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.chip-metric {
  font-size: 0.42rem;
  color: #94a3b8;
  background: rgba(2, 6, 23, 0.8);
  padding: 0.08rem 0.25rem;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.chip-metric strong {
  color: #f1f5f9;
}

.chip-metric.model-txt {
  color: #38bdf8;
}

.fly-vector-btn {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 0.46rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.fly-vector-btn:hover {
  background: rgba(56, 189, 248, 0.25);
  color: #f8fafc;
}

.fly-vector-btn.sea {
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.4);
  color: #34d399;
}

.fly-vector-btn.sea:hover {
  background: rgba(52, 211, 153, 0.25);
  color: #f8fafc;
}

/* Cityscapes & Cameras Styling */
.live-rec-badge {
  font-size: 0.44rem;
  font-weight: 800;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.rec-dot {
  width: 5px;
  height: 5px;
  background: #ef4444;
  border-radius: 50%;
  animation: blink 1s infinite alternate;
}

@keyframes blink {
  0% { opacity: 0.2; }
  100% { opacity: 1; }
}

.city-live-viewfinder {
  height: 110px;
  background: rgba(2, 6, 23, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  margin-bottom: 0.4rem;
}

.viewfinder-overlay {
  position: absolute;
  inset: 0;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 3;
}

.viewfinder-top, .viewfinder-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 0.46rem;
  font-weight: 700;
  color: #38bdf8;
}

.weather-tag {
  color: #a3e635;
}

.viewfinder-crosshairs {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: 1px dashed rgba(56, 189, 248, 0.4);
  border-radius: 50%;
}

.viewfinder-feed-sim {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(14, 165, 233, 0.15) 0%, rgba(2, 6, 23, 0.95) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanlines {
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
  background-size: 100% 4px;
  pointer-events: none;
}

.city-feed-watermark {
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.15);
  letter-spacing: 0.1em;
}

.city-cam-modes-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.cam-mode-lbl {
  font-size: 0.46rem;
  font-weight: 800;
  color: #94a3b8;
}

.cam-modes-btns {
  display: flex;
  gap: 0.3rem;
  flex: 1;
}

.cam-angle-btn {
  flex: 1;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 0.44rem;
  font-weight: 700;
  padding: 0.25rem 0.35rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cam-angle-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

.city-selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  max-height: 400px;
  overflow-y: auto;
}

.city-tile-card {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  padding: 0.35rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.city-tile-card:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(56, 189, 248, 0.3);
}

.city-tile-card.active {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
}

.city-tile-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.15rem;
}

.city-tile-name {
  font-size: 0.52rem;
  font-weight: 800;
  color: #f8fafc;
}

.city-tile-country {
  font-size: 0.42rem;
  color: #94a3b8;
}

.city-tile-tag {
  font-size: 0.4rem;
  color: #38bdf8;
  font-weight: 700;
  margin-bottom: 0.15rem;
}

.city-tile-desc {
  font-size: 0.42rem;
  color: #cbd5e1;
  line-height: 1.3;
  margin-bottom: 0.25rem;
}

.city-tile-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pop-lbl {
  font-size: 0.4rem;
  color: #64748b;
}

.fly-city-chip {
  font-size: 0.42rem;
  font-weight: 700;
  color: #a3e635;
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

</style>

