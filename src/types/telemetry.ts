/**
 * SpatialForge AI - Real-Time Telemetry & Target Vector Types
 */

export type TargetCategory = 'VESSEL' | 'AIRCRAFT' | 'SATELLITE' | 'GROUND_RECON';

export interface SpatialCoordinates {
  latitude: number;
  longitude: number;
  altitudeM: number;
  accuracyRadiusM?: number;
}

export interface TelemetryVector extends SpatialCoordinates {
  targetId: string;
  category: TargetCategory;
  callsign: string;
  speedKnots: number;
  headingDeg: number;
  verticalRateFpm?: number;
  timestampUtc: string;
  sensorRoot: string;
  rawPayloadHash: string;
}

export interface AnomalyReport {
  targetId: string;
  timestampUtc: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'CORRIDOR_VIOLATION' | 'VELOCITY_SPOOF' | 'TRANSPONDER_GAP' | 'DARK_VESSEL';
  details: string;
  confidenceScore: number;
}

