<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { AirgapGestureEngine } from '../../airgap/airgapGestureEngine.js';

const isEnabled = ref(false);
const showCameraPreview = ref(true);
const currentGesture = ref('STANDBY');
const hasHand = ref(false);
const isGrabbing = ref(false);
const cursorX = ref(window.innerWidth / 2);
const cursorY = ref(window.innerHeight / 2);
const pinchDistance = ref(0);
const swipeFeedback = ref('');
const isSimulated = ref(false);

let engine = null;
let swipeTimeout = null;

const gestureLabel = computed(() => {
  if (!isEnabled.value) return 'OFFLINE';
  if (!hasHand.value) return 'SEARCHING HAND...';
  if (isGrabbing.value) return 'PINCH GRAB [HOLDING]';
  if (currentGesture.value === 'SWIPE_LEFT') return 'SWIPE LEFT <<<';
  if (currentGesture.value === 'SWIPE_RIGHT') return 'SWIPE RIGHT >>>';
  return 'TRACKING [OPEN PALM]';
});

function handleSwipe(gesture) {
  swipeFeedback.value = gesture === 'SWIPE_RIGHT' ? 'SWIPE RIGHT >>>' : '<<< SWIPE LEFT';
  clearTimeout(swipeTimeout);
  swipeTimeout = setTimeout(() => {
    swipeFeedback.value = '';
  }, 1200);

  // Trigger view or shot change on swipe
  window.dispatchEvent(new CustomEvent('gev:airgap-swipe', { detail: { direction: gesture } }));
}

function startGestureTracking() {
  if (engine) engine.stop();

  engine = new AirgapGestureEngine({
    onFrame: (frame) => {
      hasHand.value = frame.hasHand;
      currentGesture.value = frame.gesture;
      isGrabbing.value = frame.isGrabbing;
      cursorX.value = frame.cursorX;
      cursorY.value = frame.cursorY;
      pinchDistance.value = Math.round(frame.pinchDist || 0);
      isSimulated.value = Boolean(engine?.isSimulated);
    },
    onGesture: (e) => {
      if (e.type === 'SWIPE_LEFT' || e.type === 'SWIPE_RIGHT') {
        handleSwipe(e.type);
      }
    }
  });

  engine.start();
  window.__airgapEngine = engine;
  isEnabled.value = true;
}

function stopGestureTracking() {
  if (engine) {
    engine.stop();
    engine = null;
  }
  delete window.__airgapEngine;
  isEnabled.value = false;
  hasHand.value = false;
  isGrabbing.value = false;
  currentGesture.value = 'STANDBY';
}

function toggleTracking() {
  if (isEnabled.value) {
    stopGestureTracking();
  } else {
    startGestureTracking();
  }
}

function toggleSimulator() {
  if (!engine) return;
  engine.isSimulated = !engine.isSimulated;
  isSimulated.value = engine.isSimulated;
}

onMounted(() => {
  window.addEventListener('gev:toggle-airgap-gesture', toggleTracking);
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-airgap-gesture', toggleTracking);
  stopGestureTracking();
  clearTimeout(swipeTimeout);
});
</script>

<template>
  <!-- Holographic Floating Laser Reticle (Follows Hand in the Air) -->
  <div
    v-if="isEnabled && hasHand"
    class="airgap-reticle"
    :class="{ grabbing: isGrabbing }"
    :style="{ left: `${cursorX}px`, top: `${cursorY}px` }"
    aria-hidden="true"
  >
    <div class="reticle-core"></div>
    <div class="reticle-ring"></div>
    <div class="reticle-spokes">
      <span class="spoke sp-top"></span>
      <span class="spoke sp-bottom"></span>
      <span class="spoke sp-left"></span>
      <span class="spoke sp-right"></span>
    </div>
    <div class="reticle-tag font-mono">
      <span>{{ isGrabbing ? 'LOCKED [GRAB]' : 'AIR-GAP POINTER' }}</span>
      <span v-if="pinchDistance" class="dist-val">{{ pinchDistance }}px</span>
    </div>
  </div>

  <!-- Big Holographic Swipe Banner Flash -->
  <div v-if="swipeFeedback" class="airgap-swipe-banner font-mono" role="status">
    {{ swipeFeedback }}
  </div>

  <!-- Touchless Air-Gap HUD Control Box (Bottom Left) -->
  <aside
    v-if="isEnabled"
    class="airgap-hud-card"
    role="region"
    aria-label="Touchless Air-Gap Gesture Control"
  >
    <div class="hud-top">
      <div class="hud-status-chip" :class="{ active: hasHand, grabbing: isGrabbing }">
        <span class="pulse-ring"></span>
        <span class="chip-text">{{ gestureLabel }}</span>
      </div>
      <button class="hud-toggle-btn" @click="stopGestureTracking" title="Disable Air-Gap Tracking">✕</button>
    </div>

    <!-- Live Vision Feed & Landmark Monitor -->
    <div v-if="showCameraPreview" class="camera-monitor-wrap">
      <div class="camera-grid-bg">
        <div class="monitor-reticle" :style="{ left: `${(cursorX / (typeof window !== 'undefined' ? window.innerWidth : 1)) * 100}%`, top: `${(cursorY / (typeof window !== 'undefined' ? window.innerHeight : 1)) * 100}%` }"></div>
        <div class="monitor-scanlines"></div>
      </div>
      <div class="monitor-stats font-mono">
        <span>FPS: 60</span>
        <span>MODE: {{ isSimulated ? 'VIRTUAL TRACKPAD' : 'LOCAL VISION' }}</span>
        <span>COORDS: {{ Math.round(cursorX) }}, {{ Math.round(cursorY) }}</span>
      </div>
    </div>

    <!-- Quick Gesture Guides & Controls -->
    <div class="gesture-tips">
      <div class="tip-row" :class="{ highlight: isGrabbing }">
        <span class="tip-icon"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 8h6M5 8l2-2M5 8l2 2M11 8l-2-2M11 8l-2 2"/></svg></span>
        <span class="tip-desc"><strong>Pinch Index &amp; Thumb:</strong> Grab &amp; Drag Panels / Globe</span>
      </div>
      <div class="tip-row" :class="{ highlight: currentGesture.includes('SWIPE') }">
        <span class="tip-icon"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 8h12M10 4l4 4-4 4"/></svg></span>
        <span class="tip-desc"><strong>Quick Hand Swipe:</strong> Cycle Tactical Views &amp; Shots</span>
      </div>
      <div class="tip-row" :class="{ highlight: currentGesture === 'OPEN_PALM' }">
        <span class="tip-icon"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="2"/></svg></span>
        <span class="tip-desc"><strong>Open Palm:</strong> Hover &amp; Point Laser Cursor</span>
      </div>
    </div>

    <div class="hud-footer">
      <button class="mode-switch-btn font-mono" @click="toggleSimulator">
        {{ isSimulated ? 'SWITCH TO WEBCAM' : 'SWITCH TO SIMULATOR' }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* ── Holographic Air-Gap Reticle ──────────────────────────── */
.airgap-reticle {
  position: fixed;
  width: 44px;
  height: 44px;
  margin-left: -22px;
  margin-top: -22px;
  pointer-events: none;
  z-index: 9999;
  transition: transform 0.08s ease-out;
}

.reticle-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  background: #00f6ff;
  border-radius: 50%;
  box-shadow: 0 0 12px #00f6ff, 0 0 24px rgba(0, 246, 255, 0.8);
  transition: transform 0.15s ease, background 0.15s ease;
}

.airgap-reticle.grabbing .reticle-core {
  background: #f59e0b;
  box-shadow: 0 0 16px #f59e0b, 0 0 30px rgba(245, 158, 11, 0.9);
  transform: scale(1.6);
}

.reticle-ring {
  position: absolute;
  inset: 0;
  border: 1.5px dashed rgba(0, 246, 255, 0.7);
  border-radius: 50%;
  animation: rotate-reticle 6s linear infinite;
}

.airgap-reticle.grabbing .reticle-ring {
  border: 2px solid #f59e0b;
  animation: pulse-ring 0.8s infinite alternate;
}

@keyframes rotate-reticle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-ring {
  from { transform: scale(0.9); opacity: 0.7; }
  to { transform: scale(1.2); opacity: 1; }
}

.reticle-spokes .spoke {
  position: absolute;
  background: #00f6ff;
}
.sp-top { top: -6px; left: 50%; width: 1px; height: 6px; }
.sp-bottom { bottom: -6px; left: 50%; width: 1px; height: 6px; }
.sp-left { left: -6px; top: 50%; width: 6px; height: 1px; }
.sp-right { right: -6px; top: 50%; width: 6px; height: 1px; }

.reticle-tag {
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(9, 14, 26, 0.92);
  border: 1px solid #00f6ff;
  color: #00f6ff;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
  display: flex;
  gap: 6px;
}

.airgap-reticle.grabbing .reticle-tag {
  border-color: #f59e0b;
  color: #f59e0b;
}

.dist-val {
  color: #94a3b8;
}

/* ── Swipe Flash Banner ──────────────────────────────────── */
.airgap-swipe-banner {
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(9, 14, 26, 0.94);
  border: 2px solid #00f6ff;
  color: #00f6ff;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0.15em;
  padding: 16px 36px;
  border-radius: 8px;
  box-shadow: 0 0 50px rgba(0, 246, 255, 0.6), inset 0 0 20px rgba(0, 246, 255, 0.3);
  pointer-events: none;
  z-index: 10000;
  animation: swipe-fade 0.3s ease-out;
}

@keyframes swipe-fade {
  from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* ── Air-Gap HUD Card ────────────────────────────────────── */
.airgap-hud-card {
  position: fixed;
  bottom: 84px;
  left: 20px;
  width: 290px;
  background: rgba(9, 14, 26, 0.95);
  border: 1px solid rgba(0, 246, 255, 0.4);
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 246, 255, 0.2);
  backdrop-filter: blur(14px);
  color: #f1f5f9;
  z-index: 1500;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  user-select: none;
}

.hud-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hud-status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
}

.hud-status-chip.active {
  color: #00f6ff;
}

.hud-status-chip.grabbing {
  color: #f59e0b;
}

.pulse-ring {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.hud-toggle-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
}
.hud-toggle-btn:hover {
  color: #fff;
}

.camera-monitor-wrap {
  position: relative;
  height: 110px;
  background: #020617;
  border: 1px solid rgba(0, 246, 255, 0.25);
  border-radius: 6px;
  overflow: hidden;
}

.camera-grid-bg {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0, 246, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 246, 255, 0.08) 1px, transparent 1px);
  background-size: 16px 16px;
}

.monitor-reticle {
  position: absolute;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border: 1.5px solid #00f6ff;
  border-radius: 50%;
  box-shadow: 0 0 8px #00f6ff;
  transition: all 0.05s ease;
}

.monitor-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 246, 255, 0.03) 2px,
    rgba(0, 246, 255, 0.03) 4px
  );
  pointer-events: none;
}

.monitor-stats {
  position: absolute;
  bottom: 4px;
  left: 6px;
  right: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #38bdf8;
  opacity: 0.85;
}

.gesture-tips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9.5px;
  color: #94a3b8;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.tip-row.highlight {
  background: rgba(0, 246, 255, 0.12);
  color: #00f6ff;
}

.tip-icon {
  font-size: 13px;
}

.hud-footer {
  display: flex;
  justify-content: flex-end;
}

.mode-switch-btn {
  background: rgba(0, 246, 255, 0.08);
  border: 1px solid rgba(0, 246, 255, 0.3);
  color: #38bdf8;
  font-size: 8.5px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.mode-switch-btn:hover {
  background: rgba(0, 246, 255, 0.2);
  color: #00f6ff;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
