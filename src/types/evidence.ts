/**
 * SpatialForge AI - Sovereign Evidence & Bi-Temporal Consensus Types
 */

export type AdjudicationState = 'ADMITTED' | 'INSUFFICIENT' | 'REJECTED';

export interface SensorOrigin {
  id: string;
  type: 'AIS' | 'ADSB' | 'RADAR' | 'SAT_OPTICAL' | 'CCTV';
  organization: string;
  publicKeyEd25519: string;
  trustWeight: number; // 0.0 - 1.0
  isActive: boolean;
}

export interface AdmittedObservation {
  id: string;
  sensorId: string;
  rootOrigin: string;
  captureTimeUtc: string;
  availableTimeUtc: string;
  sha256Hash: string;
  positionInsideZone: boolean;
  latitude: number;
  longitude: number;
  altitudeM?: number;
}

export interface BiTemporalCutoff {
  id: string;
  label: string;
  timestampUtc: string;
  isInitialAlert: boolean;
}

export interface EvidenceBundlePayload {
  bundleId: string;
  caseUrn: string;
  evaluationCutoffUtc: string;
  policy: string; // e.g. "2-Origin-Consensus"
  state: AdjudicationState;
  activeOrigins: number;
  requiredOrigins: number;
  canonicalSha256: string;
  merkleRootHash: string;
  signedByPublicKey: string;
  ed25519Signature: string;
  provoJsonLd: {
    '@context': string;
    entity: string;
    cutoff: string;
    derivation: string[];
    attestationTimestamp: string;
  };
  admittedObservations: AdmittedObservation[];
  excludedObservations: Array<{
    id: string;
    reason: string;
    ageSeconds: number;
  }>;
}

