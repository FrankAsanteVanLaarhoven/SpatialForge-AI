"""
SpatialForge AI: Multi-Sensor Bayesian Uncertainty Fusion
Fuses observations from AIS, Radar, Optical Satellites, and CCTV into a weighted consensus vector.
"""

from dataclasses import dataclass
from typing import List, Dict, Tuple
import math

@dataclass(frozen=True)
class SensorObservation:
    sensor_id: str
    origin_type: str # 'AIS', 'RADAR', 'SAT_OPTICAL', 'CCTV'
    latitude: float
    longitude: float
    variance_m2: float # Spatial variance (sigma^2)
    weight: float      # Cryptographic trust weight [0.0, 1.0]

@dataclass
class FusedSpatialEstimate:
    fused_lat: float
    fused_lon: float
    uncertainty_radius_m: float
    confidence: float
    active_origins: int

class SpatialFusionEngine:
    @staticmethod
    def fuse_observations(observations: List[SensorObservation]) -> FusedSpatialEstimate:
        if not observations:
            raise ValueError("Cannot fuse empty observation set")

        total_weight_lat = 0.0
        total_weight_lon = 0.0
        weighted_lat_sum = 0.0
        weighted_lon_sum = 0.0
        origins_seen = set()

        for obs in observations:
            # Weight = trust_weight / variance
            if obs.variance_m2 <= 0:
                var = 1.0
            else:
                var = obs.variance_m2
            
            w = obs.weight / var
            weighted_lat_sum += obs.latitude * w
            weighted_lon_sum += obs.longitude * w
            total_weight_lat += w
            total_weight_lon += w
            origins_seen.add(obs.origin_type)

        fused_lat = weighted_lat_sum / total_weight_lat
        fused_lon = weighted_lon_sum / total_weight_lon

        # Resulting variance = 1 / sum(weights)
        fused_variance = 1.0 / total_weight_lat
        uncertainty_radius_m = math.sqrt(fused_variance)

        return FusedSpatialEstimate(
            fused_lat=round(fused_lat, 6),
            fused_lon=round(fused_lon, 6),
            uncertainty_radius_m=round(uncertainty_radius_m, 2),
            confidence=min(0.99, round(0.5 + 0.25 * len(origins_seen), 2)),
            active_origins=len(origins_seen)
        )
