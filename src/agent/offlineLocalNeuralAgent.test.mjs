import test from 'node:test';
import assert from 'node:assert/strict';
import { OfflineLocalNeuralAgent, sovereignLocalAgent } from './offlineLocalNeuralAgent.js';
import { WebGPUKinematicParticleEngine } from '../layers/wind/webgpuKinematicParticleEngine.js';

test('OfflineLocalNeuralAgent resolves sovereign spatial intents in air-gap mode', async () => {
  const agent = new OfflineLocalNeuralAgent();
  assert.equal(agent.isReady, true);

  // Antwerp maritime intent
  const antwerp = await agent.processQuery('Fly to Antwerp approach');
  assert.equal(antwerp.intent, 'NAVIGATE_ANTWERP');
  assert.equal(antwerp.executed, true);
  assert.match(antwerp.reply, /Antwerp/i);

  // Austin nadir intent
  const austin = await agent.processQuery('Texas Capitol Nadir');
  assert.equal(austin.intent, 'NAVIGATE_AUSTIN');
  assert.equal(austin.executed, true);

  // Cutoff 2 evidence adjudication
  const cutoff = await agent.processQuery('Switch to cutoff 2');
  assert.equal(cutoff.intent, 'SET_CUTOFF_2');
  assert.equal(cutoff.executed, true);
  assert.match(cutoff.reply, /14:05:20Z/);

  // Airgap gesture toggle
  const airgap = await agent.processQuery('Enable touchless gestures');
  assert.equal(airgap.intent, 'TOGGLE_AIRGAP');
  assert.equal(airgap.executed, true);

  // Mission recording toggle
  const rec = await agent.processQuery('Start mission recording');
  assert.equal(rec.intent, 'START_RECORDING');
  assert.equal(rec.executed, true);
});

test('WebGPUKinematicParticleEngine initializes and provides fallback on non-WebGPU runtimes', async () => {
  const engine = new WebGPUKinematicParticleEngine();
  assert.equal(engine.maxParticles, 100000);
  assert.equal(engine.workgroupSize, 64);
  assert.equal(engine.workgroups, 1563);

  // Test headless non-WebGPU initialization
  const initialized = await engine.initialize();
  assert.equal(initialized, false); // Node environment has no navigator.gpu, cleanly returns false
});
