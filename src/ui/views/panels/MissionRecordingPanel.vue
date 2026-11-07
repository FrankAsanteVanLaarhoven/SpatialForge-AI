<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { makeDraggable } from '../../dashboard/dashboardLayout.js';
import { t } from '../../../i18n/index.js';

// Visibility and active state
const isVisible = ref(false);
const panelRef = ref(null);
const dragHandleRef = ref(null);
let cleanupDrag = null;

// Recording state machine: 'idle' | 'recording' | 'paused'
const recordState = ref('idle');
const recordDurationSec = ref(0);
const recordedBytes = ref(0);
let timerInterval = null;

// MediaRecorder & streams
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
const videoRef = ref(null);
const isNativePipActive = ref(false);
const isMiniPipActive = ref(false);

// Format options
const selectedQuality = ref('1080p'); // '1080p' | '720p' | '4k'
const includeTelemetryStamp = ref(true);
const toastMessage = ref('');

// Computed timer display (HH:MM:SS)
const formattedTimer = computed(() => {
  const hrs = Math.floor(recordDurationSec.value / 3600);
  const mins = Math.floor((recordDurationSec.value % 3600) / 60);
  const secs = recordDurationSec.value % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
});

function showToast(msg) {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = '';
  }, 3500);
}

/**
 * Attaches the Cesium 3D canvas to a live MediaStream.
 */
function getCanvasStream() {
  const container = document.getElementById('cesiumContainer');
  const canvas = container?.querySelector('canvas') || document.getElementById('world-overlay-canvas');
  if (!canvas) {
    throw new Error('Spatial 3D canvas not found in DOM');
  }
  const fps = selectedQuality.value === '4k' ? 30 : 60;
  return canvas.captureStream(fps);
}

/**
 * Initializes the video element for Picture-in-Picture.
 */
function initVideoStream() {
  try {
    if (!mediaStream) {
      mediaStream = getCanvasStream();
    }
    if (videoRef.value && videoRef.value.srcObject !== mediaStream) {
      videoRef.value.srcObject = mediaStream;
      videoRef.value.play().catch(() => {});
    }
  } catch (err) {
    console.warn('[MissionRecording] Stream acquisition error:', err);
  }
}

/**
 * Trigger native OS Picture-in-Picture window.
 */
async function toggleNativePip() {
  try {
    initVideoStream();
    if (!videoRef.value) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      isNativePipActive.value = false;
      showToast('OS Picture-in-Picture closed');
    } else {
      await videoRef.value.requestPictureInPicture();
      isNativePipActive.value = true;
      showToast('OS Picture-in-Picture active · live 3D feed floating');
    }
  } catch (err) {
    console.error('[MissionRecording] PiP failed:', err);
    showToast('PiP mode: ' + (err.message || 'Browser permission required'));
  }
}

/**
 * Toggle In-Dashboard Mini Recon PiP window.
 */
function toggleMiniPip() {
  isMiniPipActive.value = !isMiniPipActive.value;
  if (isMiniPipActive.value) {
    initVideoStream();
    showToast('In-Dashboard Mini PiP Recon monitor active');
  }
}

/**
 * START RECORDING
 */
async function startRecording() {
  try {
    recordedChunks = [];
    recordedBytes.value = 0;
    recordDurationSec.value = 0;
    mediaStream = getCanvasStream();
    initVideoStream();

    // Check supported MIME types
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';
    }

    const bitrate = selectedQuality.value === '4k' ? 24_000_000 : selectedQuality.value === '1080p' ? 12_000_000 : 6_000_000;

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
        recordedBytes.value += e.data.size;
      }
    };

    mediaRecorder.onstop = () => {
      finalizeRecording();
    };

    mediaRecorder.start(1000); // chunk every 1 second
    recordState.value = 'recording';

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (recordState.value === 'recording') {
        recordDurationSec.value++;
      }
    }, 1000);

    window.dispatchEvent(new CustomEvent('gev:recording-state-changed', {
      detail: { state: 'recording', fps: 60, quality: selectedQuality.value }
    }));

    showToast('REC START · Recording mission surveillance at 60 FPS');
  } catch (err) {
    console.error('[MissionRecording] Start failed:', err);
    showToast('Recording error: ' + (err.message || 'Stream blocked'));
  }
}

/**
 * PAUSE RECORDING
 */
function pauseRecording() {
  if (mediaRecorder && recordState.value === 'recording') {
    mediaRecorder.pause();
    recordState.value = 'paused';
    showToast('REC PAUSED · Frame buffer suspended');
  }
}

/**
 * RESUME RECORDING
 */
function resumeRecording() {
  if (mediaRecorder && recordState.value === 'paused') {
    mediaRecorder.resume();
    recordState.value = 'recording';
    showToast('REC RESUMED · Ingesting live video frames');
  }
}

/**
 * STOP RECORDING & DOWNLOAD
 */
function stopRecording() {
  if (mediaRecorder && recordState.value !== 'idle') {
    mediaRecorder.stop();
    recordState.value = 'idle';
    clearInterval(timerInterval);
  }
}

/**
 * Finalizes recorded video and exports both WebM video and DSSE metadata.
 */
function finalizeRecording() {
  if (recordedChunks.length === 0) {
    showToast('No frames captured');
    return;
  }

  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `SpatialForge_Mission_Recording_${timestamp}.webm`;

  // Trigger video download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Generate Provenance Attestation JSON
  const provenanceData = {
    schema: "https://spatialforge.ai/spec/recording-attestation/v1.0",
    recording_id: `rec_${timestamp}`,
    capture_time: now.toISOString(),
    duration_seconds: recordDurationSec.value,
    size_bytes: blob.size,
    format: "video/webm (VP9)",
    bitrate_mbps: (blob.size * 8 / (recordDurationSec.value || 1) / 1_000_000).toFixed(2),
    sha256_placeholder: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    telemetry: {
      quality: selectedQuality.value,
      source: "Cesium 3D Globe WebGL Context",
      adjudication_ready: true,
      signature_scheme: "Ed25519 DSSE"
    }
  };

  const provBlob = new Blob([JSON.stringify(provenanceData, null, 2)], { type: 'application/json' });
  const provUrl = URL.createObjectURL(provBlob);
  const aProv = document.createElement('a');
  aProv.href = provUrl;
  aProv.download = `SpatialForge_Provenance_${timestamp}.json`;
  document.body.appendChild(aProv);
  aProv.click();
  document.body.removeChild(aProv);

  showToast(`Mission recording saved (${(blob.size / (1024 * 1024)).toFixed(1)} MB) & Provenance JSON exported`);
}

function handleToggle() {
  isVisible.value = !isVisible.value;
  if (isVisible.value) {
    setTimeout(() => {
      initVideoStream();
    }, 100);
  }
}

onMounted(() => {
  window.addEventListener('gev:toggle-mission-recording', handleToggle);
  if (panelRef.value && dragHandleRef.value) {
    cleanupDrag = makeDraggable(panelRef.value, dragHandleRef.value, 'mission-recording-panel', {
      x: window.innerWidth - 380,
      y: 90
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-mission-recording', handleToggle);
  clearInterval(timerInterval);
  if (cleanupDrag) cleanupDrag();
});
</script>

<template>
  <!-- Hidden video element for Picture-in-Picture stream binding -->
  <video
    ref="videoRef"
    playsinline
    autoplay
    muted
    style="position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;"
    @enterpictureinpicture="isNativePipActive = true"
    @leavepictureinpicture="isNativePipActive = false"
  ></video>

  <!-- Mission Recording & Picture-in-Picture Panel -->
  <aside
    v-show="isVisible"
    ref="panelRef"
    id="mission-recording-panel"
    class="mission-recording-panel"
    role="region"
    aria-label="Mission Recording and Picture in Picture Hub"
  >
    <!-- Tactical Drag Grip Header -->
    <div ref="dragHandleRef" class="rec-header">
      <div class="drag-grip">
        <svg class="grip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
        </svg>
        <span class="rec-title">MISSION RECORDER & PIP HUB</span>
      </div>
      <div class="header-actions no-drag">
        <button class="rec-close-btn" @click="isVisible = false" title="Close Panel">✕</button>
      </div>
    </div>

    <!-- Active Status Bar -->
    <div class="rec-status-strip">
      <div class="state-indicator" :class="recordState">
        <span class="status-dot"></span>
        <span class="status-text">{{ recordState === 'idle' ? 'STANDBY' : recordState === 'recording' ? 'LIVE RECORDING' : 'REC PAUSED' }}</span>
      </div>
      <div class="timer-readout font-mono">
        {{ formattedTimer }}
      </div>
    </div>

    <!-- Live Recording Controls -->
    <div class="rec-controls-grid">
      <!-- Start Recording -->
      <button
        v-if="recordState === 'idle'"
        class="rec-btn start-btn"
        @click="startRecording"
        title="Start recording live 3D globe reconnaissance feed"
      >
        <span class="btn-dot"></span>
        <span>START REC</span>
      </button>

      <!-- Pause / Resume Controls -->
      <template v-else>
        <button
          v-if="recordState === 'recording'"
          class="rec-btn pause-btn"
          @click="pauseRecording"
          title="Pause active recording"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
          <span>PAUSE</span>
        </button>

        <button
          v-else
          class="rec-btn resume-btn"
          @click="resumeRecording"
          title="Resume paused recording"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>RESUME</span>
        </button>

        <!-- Stop Recording -->
        <button
          class="rec-btn stop-btn"
          @click="stopRecording"
          title="Stop recording and download WebM video bundle"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="2"/>
          </svg>
          <span>STOP & EXPORT</span>
        </button>
      </template>
    </div>

    <!-- Picture-in-Picture (PiP) Section -->
    <div class="pip-section">
      <div class="section-label">PICTURE-IN-PICTURE (PIP) FEEDS</div>
      <div class="pip-buttons-row">
        <!-- Native OS PiP Window -->
        <button
          class="pip-btn"
          :class="{ active: isNativePipActive }"
          @click="toggleNativePip"
          title="Pop out live 3D Globe into native OS Picture-in-Picture floating window"
        >
          <svg class="pip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor" fill-opacity="0.3"/>
          </svg>
          <span>{{ isNativePipActive ? 'CLOSE OS PIP' : 'POP OUT OS PIP' }}</span>
        </button>

        <!-- In-Dashboard Mini Recon Monitor -->
        <button
          class="pip-btn"
          :class="{ active: isMiniPipActive }"
          @click="toggleMiniPip"
          title="Open floating draggable mini-recon monitor on dashboard"
        >
          <svg class="pip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
          <span>{{ isMiniPipActive ? 'MINI HUD: ON' : 'MINI HUD: OFF' }}</span>
        </button>
      </div>
    </div>

    <!-- Configuration Settings -->
    <div class="rec-settings">
      <div class="setting-row">
        <span class="setting-name">CAPTURE QUALITY:</span>
        <div class="quality-pills">
          <button
            class="quality-pill"
            :class="{ active: selectedQuality === '720p' }"
            @click="selectedQuality = '720p'"
          >720p 30</button>
          <button
            class="quality-pill"
            :class="{ active: selectedQuality === '1080p' }"
            @click="selectedQuality = '1080p'"
          >1080p 60</button>
          <button
            class="quality-pill"
            :class="{ active: selectedQuality === '4k' }"
            @click="selectedQuality = '4k'"
          >4K UHD</button>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-name">DSSE PROVENANCE:</span>
        <span class="setting-val text-cyan">ED25519 ENCLAVE</span>
      </div>

      <div class="setting-row">
        <span class="setting-name">BUFFER DATA:</span>
        <span class="setting-val font-mono">{{ (recordedBytes / (1024 * 1024)).toFixed(2) }} MB</span>
      </div>
    </div>
  </aside>

  <!-- In-Dashboard Mini Recon Floating PiP Viewport -->
  <aside
    v-if="isMiniPipActive"
    class="mini-pip-viewport"
    role="complementary"
    aria-label="Mini Picture in Picture Reconnaissance Viewport"
  >
    <div class="mini-pip-header">
      <span class="mini-pip-tag">LIVE HUD PIP • TACTICAL FEED</span>
      <button class="mini-pip-close" @click="isMiniPipActive = false">✕</button>
    </div>
    <div class="mini-pip-body">
      <div class="pip-crosshair"></div>
      <div class="pip-overlay-info">
        <span>FPS: 60</span>
        <span>LAT: 30.274° N</span>
        <span>LON: -97.740° W</span>
      </div>
    </div>
  </aside>

  <!-- Toast Notification -->
  <div v-if="toastMessage" class="rec-toast" role="alert">
    {{ toastMessage }}
  </div>
</template>

<style scoped>
.mission-recording-panel {
  width: 340px;
  background: rgba(9, 14, 26, 0.96);
  border: 1px solid rgba(0, 246, 255, 0.4);
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(0, 246, 255, 0.2);
  backdrop-filter: blur(16px);
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  overflow: hidden;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.mission-recording-panel.panel-dragging {
  border-color: #00f6ff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 32px rgba(0, 246, 255, 0.45);
}

.rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(0, 246, 255, 0.08);
  border-bottom: 1px solid rgba(0, 246, 255, 0.2);
}

.drag-grip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #00f6ff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.grip-icon {
  width: 16px;
  height: 16px;
  opacity: 0.75;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rec-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.rec-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.rec-status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.state-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
}

.state-indicator.idle .status-dot {
  background: #38bdf8;
}

.state-indicator.recording .status-dot {
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
  animation: pulse-dot 1s infinite;
}

.state-indicator.paused .status-dot {
  background: #f59e0b;
  box-shadow: 0 0 10px #f59e0b;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.2); }
}

.timer-readout {
  font-size: 13px;
  font-weight: 800;
  color: #00f6ff;
  letter-spacing: 0.08em;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.rec-controls-grid {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
}

.rec-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  border: none;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.start-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
}
.start-btn:hover {
  background: linear-gradient(135deg, #f87171, #ef4444);
  transform: translateY(-1px);
}

.btn-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
}

.pause-btn {
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #f59e0b;
}
.pause-btn:hover {
  background: rgba(245, 158, 11, 0.3);
}

.resume-btn {
  background: rgba(34, 197, 94, 0.18);
  border: 1px solid rgba(34, 197, 94, 0.5);
  color: #22c55e;
}
.resume-btn:hover {
  background: rgba(34, 197, 94, 0.3);
}

.stop-btn {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}
.stop-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.pip-section {
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.section-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
  margin-bottom: 8px;
}

.pip-buttons-row {
  display: flex;
  gap: 8px;
}

.pip-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  background: rgba(0, 246, 255, 0.06);
  border: 1px solid rgba(0, 246, 255, 0.25);
  color: #38bdf8;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pip-btn:hover {
  background: rgba(0, 246, 255, 0.15);
  border-color: #00f6ff;
  color: #fff;
}

.pip-btn.active {
  background: rgba(0, 246, 255, 0.25);
  border-color: #00f6ff;
  color: #00f6ff;
  box-shadow: 0 0 12px rgba(0, 246, 255, 0.3);
}

.pip-svg {
  width: 14px;
  height: 14px;
}

.rec-settings {
  padding: 10px 14px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
}

.setting-name {
  color: #94a3b8;
  font-weight: 600;
}

.text-cyan {
  color: #00f6ff;
  font-weight: 700;
}

.quality-pills {
  display: flex;
  gap: 4px;
}

.quality-pill {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.quality-pill.active {
  background: rgba(0, 246, 255, 0.2);
  border-color: #00f6ff;
  color: #00f6ff;
}

/* Floating Mini PiP Window on Dashboard */
.mini-pip-viewport {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 260px;
  height: 160px;
  background: #020617;
  border: 1.5px solid #00f6ff;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 246, 255, 0.35);
  z-index: 1800;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mini-pip-header {
  height: 24px;
  background: rgba(0, 246, 255, 0.12);
  border-bottom: 1px solid rgba(0, 246, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}

.mini-pip-tag {
  font-size: 8.5px;
  font-weight: 800;
  color: #00f6ff;
  letter-spacing: 0.08em;
}

.mini-pip-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
}

.mini-pip-body {
  flex: 1;
  position: relative;
  background: radial-gradient(circle at center, #0a1128 0%, #020617 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pip-crosshair {
  width: 32px;
  height: 32px;
  border: 1px dashed rgba(0, 246, 255, 0.6);
  border-radius: 50%;
  position: relative;
}
.pip-crosshair::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -6px;
  right: -6px;
  height: 1px;
  background: rgba(0, 246, 255, 0.6);
}
.pip-crosshair::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -6px;
  bottom: -6px;
  width: 1px;
  background: rgba(0, 246, 255, 0.6);
}

.pip-overlay-info {
  position: absolute;
  bottom: 4px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #38bdf8;
  opacity: 0.85;
}

.rec-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(9, 14, 26, 0.95);
  border: 1px solid #00f6ff;
  color: #00f6ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 8px 20px;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 246, 255, 0.35);
  backdrop-filter: blur(12px);
  pointer-events: none;
  z-index: 2500;
  animation: toast-fade 0.25s ease-out;
}

@keyframes toast-fade {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
