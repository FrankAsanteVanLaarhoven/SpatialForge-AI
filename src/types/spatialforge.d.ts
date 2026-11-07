/**
 * SpatialForge AI — Sovereign Core TypeScript Declarations
 * Type definitions for Bi-Temporal Replay, Cryptographic Enclave, WebGPU, and Local Neural Agent.
 */

export interface TacticalLocation {
  id: string;
  title: string;
  location: string;
  tag: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  pitch: number;
  style: 'normal' | 'retro' | 'surveillance' | 'thermal';
  desc: string;
  iconKey: string;
}

export interface TelemetryFix {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  speedKnots: number;
  headingDegrees: number;
  source: 'ADSB' | 'AIS' | 'SATELLITE' | 'RADAR';
  sha256Proof?: string;
  anomalyFlag?: boolean;
}

export interface Ed25519Attestation {
  payloadType: 'application/vnd.spatialforge.evidence+json';
  payload: string; // Base64 encoded JSON
  signatures: Array<{
    keyid: string;
    sig: string; // Base64 Ed25519 signature
  }>;
  merkleRoot: string;
  timestampEpochMs: number;
}

export interface WebGPUKinematicParticleState {
  totalParticles: number;
  timeEpoch: number;
  vortexCenterLon: number;
  vortexCenterLat: number;
  vortexIntensity: number;
  deltaSeconds: number;
}

export interface AirgapHandGesture {
  type: 'HOVER' | 'PINCH_DRAG' | 'SWIPE_LEFT' | 'SWIPE_RIGHT';
  palmCentroid: { x: number; y: number };
  indexTip: { x: number; y: number };
  thumbTip: { x: number; y: number };
  pinchDistance: number;
  isPinching: boolean;
  confidence: number;
}

export interface LocalNeuralAgentQuery {
  prompt: string;
  intent: string;
  reply: string;
  executed: boolean;
  telemetry?: Record<string, unknown> | null;
  inferenceTimeMs: number;
}
