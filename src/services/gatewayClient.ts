/**
 * SpatialForge AI - Sovereign Gateway Client (TypeScript)
 * Connects the 3D Cesium GIS UI to the Go API Gateway and Python Intelligence Engine.
 */

import type { EvidenceBundlePayload } from '@/types/evidence';
import type { TelemetryVector, AnomalyReport } from '@/types/telemetry';
import type { ServiceEndpoint } from '@/types/routing';

export class SovereignGatewayClient {
  private baseUrl: string;
  private hmacToken: string;
  private eventSource: EventSource | null = null;

  constructor(baseUrl = 'http://localhost:8080', hmacToken = 'spatialforge_master_cryptographic_enclave_key_2026') {
    this.baseUrl = baseUrl;
    this.hmacToken = hmacToken;
  }

  /**
   * Health check on Go Gateway and active microservices
   */
  async checkHealth(): Promise<{ status: string; service: string; version: string; cache_mode?: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/health`);
    if (!res.ok) {
      throw new Error(`Gateway health check failed: HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Diagnostic health & status check on Redis telemetry cache and vector bus
   */
  async getCacheStatus(): Promise<{
    mode: string;
    redis_target: string;
    redis_connected: boolean;
    in_memory_keys: number;
    last_checked_utc: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/v1/cache/status`);
    if (!res.ok) {
      throw new Error(`Failed to query cache status: HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Discovers active routing topology across microservices
   */
  async getRoutingTopology(): Promise<{ orchestrator: string; routes: Record<string, string> }> {
    const res = await fetch(`${this.baseUrl}/api/v1/routes`);
    if (!res.ok) {
      throw new Error(`Failed to fetch routing topology: HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Queries bi-temporal consensus adjudication for a target at a historical cutoff
   */
  async queryAdjudication(targetId: string, cutoffIso?: string): Promise<EvidenceBundlePayload> {
    const url = new URL(`${this.baseUrl}/api/v1/replay/adjudicate`);
    url.searchParams.set('target_id', targetId);
    if (cutoffIso) {
      url.searchParams.set('cutoff', cutoffIso);
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.hmacToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Adjudication request failed: HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Subscribes to live spatial telemetry vector stream
   */
  subscribeTelemetryStream(onVector: (v: TelemetryVector) => void, onError?: (err: Event) => void): () => void {
    const streamUrl = `${this.baseUrl}/api/v1/stream`;
    this.eventSource = new EventSource(streamUrl);

    this.eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as TelemetryVector;
        onVector(parsed);
      } catch (e) {
        console.warn('[GatewayClient] Failed to parse telemetry vector:', e);
      }
    };

    if (onError) {
      this.eventSource.onerror = onError;
    }

    return () => {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }
}

export const gatewayClient = new SovereignGatewayClient();

