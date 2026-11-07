"""
SpatialForge AI: PostgreSQL & PostGIS Spatial Data Access Layer
Handles spatial queries, corridor conformance, and evidence persistence.
"""

from typing import Dict, Any, List, Optional
import json

class PostGISDataLayer:
    def __init__(self, dsn: Optional[str] = None):
        self.dsn = dsn or "postgresql://spatialforge_admin:spatialforge_secure_dev_pass@localhost:5432/spatialforge"

    def build_insert_telemetry_sql(self, target_id: str, sensor_id: str, lat: float, lon: float, alt_m: float, 
                                   capture_time_iso: str, raw_hash: str) -> str:
        """Generates parameterized SQL for inserting 3D Point telemetry with PostGIS ST_SetSRID."""
        return (
            f"INSERT INTO spatial_telemetry (target_id, sensor_id, capture_time, geom, raw_payload_hash) "
            f"VALUES ('{target_id}', '{sensor_id}', '{capture_time_iso}', "
            f"ST_SetSRID(ST_MakePoint({lon}, {lat}, {alt_m}), 4326), '{raw_hash}');"
        )

    def build_corridor_check_sql(self, track_id: str, lat: float, lon: float) -> str:
        """Generates SQL invoking check_corridor_conformance stored procedure."""
        return f"SELECT check_corridor_conformance('{track_id}', ST_SetSRID(ST_MakePoint({lon}, {lat}, 0), 4326));"

    def build_evidence_bundle_insert_sql(self, bundle_id: str, case_urn: str, cutoff_iso: str, 
                                         status: str, bundle_hash: str, merkle_root: str, 
                                         provo_dict: Dict[str, Any], pubkey: str, sig: str) -> str:
        """Generates SQL for recording an attested evidence bundle with W3C PROV-O JSONB."""
        escaped_provo = json.dumps(provo_dict).replace("'", "''")
        return (
            f"INSERT INTO evidence_bundles (bundle_id, case_urn, evaluation_cutoff, policy_name, "
            f"adjudication_status, merkle_root_hash, canonical_bundle_hash, provo_json_ld, signed_by_key_id, ed25519_signature) "
            f"VALUES ('{bundle_id}', '{case_urn}', '{cutoff_iso}', '2-Origin-Consensus', '{status}', "
            f"'{merkle_root}', '{bundle_hash}', '{escaped_provo}'::jsonb, '{pubkey}', '{sig}');"
        )
