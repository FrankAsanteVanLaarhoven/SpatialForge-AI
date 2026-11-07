#!/usr/bin/env python3
"""
SpatialForge AI: Python Intelligence Microservice
Exposes REST endpoints for trajectory anomaly detection, Bayesian sensor fusion, and PostGIS queries.
Listens on port 5001 (proxied via Go Gateway at /api/v1/intelligence/).
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
import time

from engine.trajectory_anomaly import TrajectoryAnomalyDetector, TelemetryPoint
from engine.sensor_fusion import SpatialFusionEngine, SensorObservation
from engine.db_postgis import PostGISDataLayer

detector = TrajectoryAnomalyDetector(max_allowed_speed_knots=50.0)
db_layer = PostGISDataLayer()

class IntelligenceHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: dict):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        if self.path in ['/health', '/api/v1/intelligence/health', '/']:
            self._send_json(200, {
                "status": "HEALTHY",
                "service": "spatialforge-python-intelligence",
                "engine": "v2.0-SOTA",
                "capabilities": ["kinematic_spoof_detection", "bayesian_sensor_fusion", "postgis_queries"]
            })
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode('utf-8'))
        except Exception as e:
            self._send_json(400, {"error": f"Invalid JSON payload: {str(e)}"})
            return

        if self.path.endswith('/anomaly/evaluate'):
            points_data = payload.get('points', [])
            points = [
                TelemetryPoint(
                    timestamp_epoch=p.get('timestamp_epoch', time.time()),
                    latitude=float(p['latitude']),
                    longitude=float(p['longitude']),
                    altitude_m=float(p.get('altitude_m', 0.0)),
                    speed_knots=float(p.get('speed_knots', 0.0)),
                    heading_deg=float(p.get('heading_deg', 0.0)),
                    transponder_on=bool(p.get('transponder_on', True))
                )
                for p in points_data
            ]
            result = detector.evaluate_track(points)
            self._send_json(200, {
                "is_anomaly": result.is_anomaly,
                "anomaly_type": result.anomaly_type,
                "confidence_score": result.confidence_score,
                "message": result.message
            })

        elif self.path.endswith('/fusion/estimate'):
            obs_data = payload.get('observations', [])
            observations = [
                SensorObservation(
                    sensor_id=o['sensor_id'],
                    origin_type=o.get('origin_type', 'AIS'),
                    latitude=float(o['latitude']),
                    longitude=float(o['longitude']),
                    variance_m2=float(o.get('variance_m2', 25.0)),
                    weight=float(o.get('weight', 1.0))
                )
                for o in obs_data
            ]
            try:
                fused = SpatialFusionEngine.fuse_observations(observations)
                self._send_json(200, {
                    "fused_lat": fused.fused_lat,
                    "fused_lon": fused.fused_lon,
                    "uncertainty_radius_m": fused.uncertainty_radius_m,
                    "confidence": fused.confidence,
                    "active_origins": fused.active_origins
                })
            except Exception as e:
                self._send_json(400, {"error": str(e)})

        else:
            self._send_json(404, {"error": "Endpoint not recognized"})

def run_server(port=5001):
    server = HTTPServer(('0.0.0.0', port), IntelligenceHandler)
    print(f"[Python Intelligence] Spatial AI & Anomaly Engine listening on :{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Python Intelligence] Shutting down cleanly.")
        server.server_close()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    run_server(port)

