import unittest
import time
from engine.trajectory_anomaly import TrajectoryAnomalyDetector, TelemetryPoint
from engine.sensor_fusion import SpatialFusionEngine, SensorObservation
from engine.db_postgis import PostGISDataLayer

class TestPythonIntelligence(unittest.TestCase):
    def setUp(self):
        self.detector = TrajectoryAnomalyDetector(max_allowed_speed_knots=45.0)

    def test_normal_kinematics(self):
        t0 = time.time()
        # Vessel traveling at ~15 knots
        points = [
            TelemetryPoint(t0, 51.2194, 4.4025, 0.0, 15.0, 180.0, True),
            TelemetryPoint(t0 + 60, 51.2152, 4.4025, 0.0, 15.2, 180.0, True),
        ]
        result = self.detector.evaluate_track(points)
        self.assertFalse(result.is_anomaly)
        self.assertIsNone(result.anomaly_type)

    def test_teleportation_spoof_detection(self):
        t0 = time.time()
        # Vessel jumps 10 miles in 5 seconds (> 7000 knots)
        points = [
            TelemetryPoint(t0, 51.2194, 4.4025, 0.0, 15.0, 180.0, True),
            TelemetryPoint(t0 + 5, 51.4000, 4.4025, 0.0, 15.0, 180.0, True),
        ]
        result = self.detector.evaluate_track(points)
        self.assertTrue(result.is_anomaly)
        self.assertEqual(result.anomaly_type, "KINEMATIC_SPOOF_TELEPORTATION")

    def test_sensor_fusion_weighted_consensus(self):
        obs = [
            SensorObservation("ais-1", "AIS", 51.2194, 4.4025, 25.0, 1.0),
            SensorObservation("radar-1", "RADAR", 51.2196, 4.4027, 100.0, 0.9),
        ]
        fused = SpatialFusionEngine.fuse_observations(obs)
        self.assertEqual(fused.active_origins, 2)
        self.assertAlmostEqual(fused.fused_lat, 51.2194, places=3)
        self.assertGreater(fused.confidence, 0.9)

    def test_postgis_sql_generation(self):
        db = PostGISDataLayer()
        sql = db.build_insert_telemetry_sql("vessel-1", "sensor-1", 51.2194, 4.4025, 0.0, "2026-11-07T14:00:00Z", "hash123")
        self.assertIn("ST_SetSRID", sql)
        self.assertIn("vessel-1", sql)

if __name__ == '__main__':
    unittest.main()
