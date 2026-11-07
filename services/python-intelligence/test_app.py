import unittest
from io import BytesIO
import json
import time

from app import IntelligenceHandler

class MockSocket:
    def __init__(self, data: bytes):
        self.rfile = BytesIO(data)
        self.wfile = BytesIO()

    def sendall(self, data: bytes):
        self.wfile.write(data)

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self.rfile
        return self.wfile

class MockServer:
    def __init__(self):
        self.server_name = "127.0.0.1"
        self.server_port = 5001

class TestIntelligenceHandler(unittest.TestCase):
    def _execute_request(self, method: str, path: str, payload: dict = None) -> tuple:
        body = json.dumps(payload).encode('utf-8') if payload else b""
        raw_request = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\nContent-Length: {len(body)}\r\nContent-Type: application/json\r\n\r\n".encode('utf-8') + body
        
        sock = MockSocket(raw_request)
        server = MockServer()
        
        # Suppress stderr logging during tests
        handler = IntelligenceHandler(sock, ("127.0.0.1", 12345), server)
        
        response_bytes = sock.wfile.getvalue()
        header_part, _, body_part = response_bytes.partition(b"\r\n\r\n")
        status_line = header_part.split(b"\r\n")[0].decode('utf-8')
        status_code = int(status_line.split()[1])
        data = json.loads(body_part.decode('utf-8')) if body_part else {}
        return status_code, data

    def test_health_check(self):
        status_code, data = self._execute_request("GET", "/health")
        self.assertEqual(status_code, 200)
        self.assertEqual(data["status"], "HEALTHY")
        self.assertEqual(data["service"], "spatialforge-python-intelligence")

    def test_anomaly_endpoint(self):
        t0 = time.time()
        payload = {
            "points": [
                {"timestamp_epoch": t0, "latitude": 51.2194, "longitude": 4.4025, "speed_knots": 15.0},
                {"timestamp_epoch": t0 + 5, "latitude": 52.0000, "longitude": 4.4025, "speed_knots": 15.0}
            ]
        }
        status_code, data = self._execute_request("POST", "/api/v1/intelligence/anomaly/evaluate", payload)
        self.assertEqual(status_code, 200)
        self.assertTrue(data["is_anomaly"])
        self.assertEqual(data["anomaly_type"], "KINEMATIC_SPOOF_TELEPORTATION")

    def test_fusion_endpoint(self):
        payload = {
            "observations": [
                {"sensor_id": "ais-1", "origin_type": "AIS", "latitude": 51.2194, "longitude": 4.4025, "variance_m2": 25.0},
                {"sensor_id": "radar-1", "origin_type": "RADAR", "latitude": 51.2196, "longitude": 4.4027, "variance_m2": 100.0}
            ]
        }
        status_code, data = self._execute_request("POST", "/api/v1/intelligence/fusion/estimate", payload)
        self.assertEqual(status_code, 200)
        self.assertEqual(data["active_origins"], 2)
        self.assertAlmostEqual(data["fused_lat"], 51.2194, places=3)

if __name__ == '__main__':
    unittest.main()
