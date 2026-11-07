/**
 * SpatialForge AI - Orchestration & Service Routing Contracts
 */

export interface ServiceEndpoint {
  serviceId: 'core-gateway' | 'crypto-enclave' | 'stealth-crawler' | 'python-intelligence' | 'postgres-postgis';
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'ws' | 'wss' | 'grpc';
  isHealthy: boolean;
  latencyMs: number;
}

export interface RoutingOrchestratorConfig {
  gatewayBaseUrl: string;
  wsStreamUrl: string;
  enclaveRpcUrl: string;
  crawlerManagerUrl: string;
  enableMutualTls: boolean;
  hmacHeader: string;
}

export interface IngestionRoutePacket {
  route: '/api/v1/telemetry' | '/api/v1/replay/adjudicate' | '/api/v1/evidence/sign' | '/api/v1/crawler/task';
  method: 'GET' | 'POST' | 'PUT';
  payloadJson: string;
  hmacSignature: string;
}

