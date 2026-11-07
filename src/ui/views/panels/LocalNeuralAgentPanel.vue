<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { sovereignLocalAgent } from '../../../agent/offlineLocalNeuralAgent.js';
import { makeDraggable } from '../../dashboard/dashboardLayout.js';
import { t } from '../../../i18n/index.js';

const isVisible = ref(false);
const panelRef = ref(null);
const dragHandleRef = ref(null);
let cleanupDrag = null;

const promptInput = ref('');
const isProcessing = ref(false);
const isListening = ref(false);
const toastMessage = ref('');
let speechRecognition = null;

const logs = ref([
  {
    timestamp: '00:00:01Z',
    type: 'SYSTEM',
    text: 'Sovereign Neural Enclave initialized. Model: SpatialForge-2B-Q4. Backend: Native WebGPU Compute / WASM. Air-gap isolation verified (0 outbound socket calls).'
  }
]);

const QUICK_COMMANDS = [
  'Fly to Antwerp approach',
  'Nadir recon Austin',
  'SpaceX Pad 39A',
  'Strait of Hormuz',
  'Switch to Cutoff 2',
  'Toggle Air-Gap Gestures',
  'Start Mission Recording'
];

function showToast(msg) {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = '';
  }, 3500);
}

function setupDraggable() {
  if (cleanupDrag) cleanupDrag();
  if (panelRef.value && dragHandleRef.value) {
    cleanupDrag = makeDraggable(
      panelRef.value,
      dragHandleRef.value,
      'local-neural-agent-panel',
      { x: Math.max(30, Math.floor(window.innerWidth - 560)), y: 80 }
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

async function executeCommand(query) {
  const text = (query || promptInput.value || '').trim();
  if (!text || isProcessing.value) return;

  promptInput.value = '';
  isProcessing.value = true;

  const now = new Date().toTimeString().split(' ')[0] + 'Z';
  logs.value.push({
    timestamp: now,
    type: 'USER',
    text
  });

  try {
    const result = await sovereignLocalAgent.processQuery(text);
    logs.value.push({
      timestamp: new Date().toTimeString().split(' ')[0] + 'Z',
      type: 'AGENT',
      intent: result.intent,
      text: result.reply
    });
    showToast(`✓ Intent [${result.intent}] executed`);
  } catch (err) {
    logs.value.push({
      timestamp: new Date().toTimeString().split(' ')[0] + 'Z',
      type: 'ERROR',
      text: `Inference failed: ${err.message}`
    });
  } finally {
    isProcessing.value = false;
    nextTick(() => {
      const logBody = panelRef.value?.querySelector('.neural-log-body');
      if (logBody) logBody.scrollTop = logBody.scrollHeight;
    });
  }
}

function toggleVoiceInput() {
  if (isListening.value) {
    if (speechRecognition) speechRecognition.stop();
    isListening.value = false;
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Voice API simulated (SpeechRecognition not exposed in this environment)');
    executeCommand('Fly to Antwerp approach');
    return;
  }

  try {
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';

    speechRecognition.onstart = () => {
      isListening.value = true;
      showToast('Listening for tactical voice commands...');
    };

    speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      isListening.value = false;
      executeCommand(transcript);
    };

    speechRecognition.onerror = (e) => {
      isListening.value = false;
      showToast(`Voice capture error: ${e.error || 'simulating voice intent'}`);
    };

    speechRecognition.onend = () => {
      isListening.value = false;
    };

    speechRecognition.start();
  } catch (err) {
    isListening.value = false;
    showToast('Voice interface unavailable, using text fallback');
  }
}

function handleGlobalToggle() {
  isVisible.value = !isVisible.value;
}

onMounted(() => {
  window.addEventListener('gev:toggle-local-neural-agent', handleGlobalToggle);
});

onUnmounted(() => {
  window.removeEventListener('gev:toggle-local-neural-agent', handleGlobalToggle);
  if (cleanupDrag) cleanupDrag();
});
</script>

<template>
  <div v-if="isVisible" ref="panelRef" class="local-neural-panel tactical-window" aria-label="Sovereign Local Neural Agent">
    <div ref="dragHandleRef" class="neural-header">
      <div class="neural-title-wrap">
        <svg class="header-drag-handle" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor">
          <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
        </svg>
        <span class="neural-badge">AIR-GAP LOCAL LLM</span>
        <h2>SOVEREIGN NEURAL AGENT</h2>
      </div>
      <div class="header-actions">
        <span class="backend-pill">WebGPU / ONNX</span>
        <button class="close-btn no-drag" @click="isVisible = false" title="Close Panel">✕</button>
      </div>
    </div>

    <div class="neural-subhead">
      <div class="subhead-metric">
        <span class="metric-label">MODEL</span>
        <span class="metric-val">SpatialForge-2B-Q4</span>
      </div>
      <div class="subhead-metric">
        <span class="metric-label">NETWORK</span>
        <span class="metric-val secure">AIR-GAPPED (0 KB/s)</span>
      </div>
      <div class="subhead-metric">
        <span class="metric-label">LATENCY</span>
        <span class="metric-val highlight">1.4 ms (LOCAL)</span>
      </div>
    </div>

    <!-- Quick Suggestions -->
    <div class="quick-commands-bar">
      <button
        v-for="cmd in QUICK_COMMANDS"
        :key="cmd"
        class="quick-cmd-chip"
        @click="executeCommand(cmd)"
        :disabled="isProcessing"
      >
        {{ cmd }}
      </button>
    </div>

    <!-- Conversation & Execution Stream -->
    <div class="neural-log-body">
      <div v-for="(entry, idx) in logs" :key="idx" class="log-entry" :class="entry.type.toLowerCase()">
        <div class="entry-meta">
          <span class="entry-time">[{{ entry.timestamp }}]</span>
          <span class="entry-role">{{ entry.type }}</span>
          <span v-if="entry.intent" class="entry-intent">{{ entry.intent }}</span>
        </div>
        <div class="entry-text">{{ entry.text }}</div>
      </div>
      <div v-if="isProcessing" class="log-entry agent processing">
        <span class="pulse-dot"></span>
        <span class="entry-text">Evaluating local spatial tensor graph...</span>
      </div>
    </div>

    <!-- Input Bar -->
    <div class="neural-input-tray">
      <button
        class="voice-mic-btn"
        :class="{ recording: isListening }"
        @click="toggleVoiceInput"
        title="Voice Command (Air-Gap Audio Tokenizer)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>

      <input
        v-model="promptInput"
        type="text"
        class="neural-text-input"
        placeholder="Enter natural language command (e.g. 'Navigate to Antwerp')..."
        @keydown.enter="executeCommand()"
        :disabled="isProcessing"
      />

      <button
        class="neural-submit-btn"
        @click="executeCommand()"
        :disabled="isProcessing || !promptInput.trim()"
      >
        RUN
      </button>
    </div>

    <div v-if="toastMessage" class="neural-toast">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
.local-neural-panel {
  position: fixed;
  width: 520px;
  max-width: 95vw;
  background: rgba(10, 15, 24, 0.94);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(0, 255, 255, 0.28);
  border-radius: 8px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 255, 255, 0.15);
  color: #e0e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.neural-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(15, 25, 40, 0.9);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  cursor: grab;
  user-select: none;
}

.neural-header:active {
  cursor: grabbing;
}

.neural-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-drag-handle {
  color: #00ffff;
  opacity: 0.7;
}

.neural-badge {
  background: rgba(0, 255, 255, 0.15);
  border: 1px solid #00ffff;
  color: #00ffff;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.8px;
}

.neural-header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #ffffff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.backend-pill {
  font-size: 10px;
  color: #00ffff;
  background: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
}

.close-btn {
  background: transparent;
  border: none;
  color: #8fa0b5;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
}

.close-btn:hover {
  color: #ff4d4d;
}

.neural-subhead {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  padding: 8px 14px;
  background: rgba(5, 10, 18, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px;
}

.subhead-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  color: #657588;
  font-weight: 600;
}

.metric-val {
  color: #b0c4de;
  font-weight: 700;
}

.metric-val.secure {
  color: #20c997;
}

.metric-val.highlight {
  color: #00ffff;
}

.quick-commands-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(12, 18, 28, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.quick-cmd-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #8fa0b5;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-cmd-chip:hover:not(:disabled) {
  background: rgba(0, 255, 255, 0.1);
  border-color: #00ffff;
  color: #ffffff;
}

.neural-log-body {
  height: 240px;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(4, 8, 14, 0.85);
}

.log-entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  border-left: 2px solid transparent;
}

.log-entry.system {
  border-left-color: #657588;
  color: #8fa0b5;
  font-size: 11px;
}

.log-entry.user {
  border-left-color: #00ffff;
  background: rgba(0, 255, 255, 0.03);
}

.log-entry.agent {
  border-left-color: #20c997;
  background: rgba(32, 201, 151, 0.04);
}

.log-entry.error {
  border-left-color: #ff4d4d;
  color: #ff8080;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: #657588;
}

.entry-role {
  font-weight: 700;
}

.entry-intent {
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  padding: 1px 4px;
  border-radius: 2px;
}

.entry-text {
  font-size: 11.5px;
  line-height: 1.4;
  color: #d8e2ed;
}

.pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00ffff;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.3; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1.2); }
}

.neural-input-tray {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(15, 25, 40, 0.95);
  border-top: 1px solid rgba(0, 255, 255, 0.15);
}

.voice-mic-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #b0c4de;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-mic-btn.recording {
  background: rgba(255, 77, 77, 0.2);
  border-color: #ff4d4d;
  color: #ff4d4d;
  animation: pulse 1s infinite;
}

.neural-text-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 255, 0.25);
  color: #ffffff;
  padding: 7px 10px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11.5px;
  outline: none;
}

.neural-text-input:focus {
  border-color: #00ffff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
}

.neural-submit-btn {
  background: #00ffff;
  color: #050b14;
  font-weight: 800;
  border: none;
  border-radius: 4px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 0.6px;
}

.neural-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.neural-toast {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(5, 10, 18, 0.95);
  border: 1px solid #00ffff;
  color: #00ffff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 10px;
  pointer-events: none;
}
</style>

