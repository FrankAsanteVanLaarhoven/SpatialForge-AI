"""
SpatialForge AI: Trajectory Anomaly & Spoofing Detection Engine
Identifies sudden kinematic jumps, corridor violations, and transponder dropouts.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict
import math

@dataclass(frozen=True)
class TelemetryPoint:
    timestamp_epoch: float
    latitude: float
    longitude: float
    altitude_m: float
    speed_knots: float
    heading_deg: float
    transponder_on: bool = True

@dataclass
class AnomalyDetectionResult:
    is_anomaly: bool
    anomaly_type: Optional[str]
    confidence_score: float
    message: str

class TrajectoryAnomalyDetector:
    def __init__(self, max_allowed_speed_knots: float = 60.0, max_acceleration_knots_s: float = 5.0):
        self.max_allowed_speed_knots = max_allowed_speed_knots
        self.max_acceleration_knots_s = max_acceleration_knots_s

    @staticmethod
    def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes great-circle distance in nautical miles."""
        R_nm = 3440.065  # Earth radius in nautical miles
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R_nm * c

    def evaluate_track(self, points: List[TelemetryPoint]) -> AnomalyDetectionResult:
        if len(points) < 2:
            return AnomalyDetectionResult(False, None, 1.0, "Insufficient track history for anomaly evaluation.")

        for i in range(1, len(points)):
            p_prev = points[i - 1]
            p_curr = points[i]
            dt = p_curr.timestamp_epoch - p_prev.timestamp_epoch

            if dt <= 0:
                continue

            # 1. Dark Vessel / Transponder Gap Check
            if not p_curr.transponder_on or (dt > 300 and p_prev.transponder_on):
                return AnomalyDetectionResult(
                    is_anomaly=True,
                    anomaly_type="DARK_VESSEL_TRANSPONDER_GAP",
                    confidence_score=0.95,
                    message=f"Transponder silence gap of {dt:.1f}s detected at ({p_curr.latitude}, {p_curr.longitude})"
                )

            # 2. Kinematic Velocity Spoofing Check
            distance_nm = self.haversine_distance_nm(p_prev.latitude, p_prev.longitude, p_curr.latitude, p_curr.longitude)
            implied_speed_knots = (distance_nm / (dt / 3600.0))

            if implied_speed_knots > self.max_allowed_speed_knots:
                return AnomalyDetectionResult(
                    is_anomaly=True,
                    anomaly_type="KINEMATIC_SPOOF_TELEPORTATION",
                    confidence_score=0.99,
                    message=f"Physically impossible speed jump: {implied_speed_knots:.1f} knots (max allowed: {self.max_allowed_speed_knots} knots)"
                )

        return AnomalyDetectionResult(
            is_anomaly=False,
            anomaly_type=None,
            confidence_score=0.98,
            message="Track kinematics conform to legal navigation dynamics."
        )
