-- SpatialForge AI: Sovereign Spatial Intelligence & Bi-Temporal Storage Schema
-- Target: PostgreSQL 16+ with PostGIS 3.4+ and pgcrypto

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Sensor Registration & Cryptographic Authority
CREATE TABLE IF NOT EXISTS sensor_origins (
    sensor_id VARCHAR(64) PRIMARY KEY,
    sensor_type VARCHAR(32) NOT NULL, -- 'AIS', 'ADSB', 'RADAR', 'SAT_OPTICAL', 'CCTV'
    owner_organization VARCHAR(128) NOT NULL,
    public_key_ed25519 TEXT NOT NULL,
    trust_weight DOUBLE PRECISION DEFAULT 1.0 CHECK (trust_weight >= 0.0 AND trust_weight <= 1.0),
    is_active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partitioned Real-Time Spatial Telemetry Table
CREATE TABLE IF NOT EXISTS spatial_telemetry (
    id BIGSERIAL,
    target_id VARCHAR(64) NOT NULL,        -- MMSI, ICAO24, NORAD ID, or Track UUID
    sensor_id VARCHAR(64) REFERENCES sensor_origins(sensor_id),
    capture_time TIMESTAMPTZ NOT NULL,     -- Observation occurrence (GPS / Event time)
    ingestion_time TIMESTAMPTZ DEFAULT NOW(), -- Database receipt (System time)
    geom GEOMETRY(PointZ, 4326) NOT NULL,  -- Lon, Lat, Altitude (WGS84 ellipsoidal)
    speed_knots DOUBLE PRECISION,
    heading_deg DOUBLE PRECISION,
    uncertainty_radius_m DOUBLE PRECISION DEFAULT 5.0,
    raw_payload_hash VARCHAR(64) NOT NULL, -- SHA-256 raw wire hash
    signature TEXT,                        -- Ed25519 sensor signature
    PRIMARY KEY (id, capture_time)
) PARTITION BY RANGE (capture_time);

-- Create initial monthly partitions for high-throughput scaling
CREATE TABLE IF NOT EXISTS spatial_telemetry_2026_11 PARTITION OF spatial_telemetry
    FOR VALUES FROM ('2026-11-01 00:00:00Z') TO ('2026-12-01 00:00:00Z');

CREATE TABLE IF NOT EXISTS spatial_telemetry_2026_12 PARTITION OF spatial_telemetry
    FOR VALUES FROM ('2026-12-01 00:00:00Z') TO ('2027-01-01 00:00:00Z');

-- Spatial indices (GIST) for spatial bounding queries
CREATE INDEX IF NOT EXISTS idx_telemetry_geom ON spatial_telemetry USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_telemetry_target_time ON spatial_telemetry (target_id, capture_time DESC);

-- 3. Bi-Temporal Target Tracks & Corridor Boundaries
CREATE TABLE IF NOT EXISTS target_tracks (
    track_id VARCHAR(64) PRIMARY KEY,
    target_callsign VARCHAR(64),
    target_class VARCHAR(32) NOT NULL,     -- 'VESSEL', 'AIRCRAFT', 'SATELLITE', 'GROUND'
    first_detected TIMESTAMPTZ NOT NULL,
    last_detected TIMESTAMPTZ NOT NULL,
    current_geom GEOMETRY(PointZ, 4326),
    corridor_geom GEOMETRY(Polygon, 4326), -- Permitted transit zone
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_target_tracks_geom ON target_tracks USING GIST (current_geom);

-- 4. Sovereign Evidence Bundles & Merkle Trees
CREATE TABLE IF NOT EXISTS evidence_bundles (
    bundle_id VARCHAR(64) PRIMARY KEY,
    case_urn VARCHAR(128) NOT NULL,
    evaluation_cutoff TIMESTAMPTZ NOT NULL,
    policy_name VARCHAR(64) NOT NULL,      -- e.g. '2-Origin-Consensus'
    adjudication_status VARCHAR(32) NOT NULL, -- 'ADMITTED', 'INSUFFICIENT', 'REJECTED'
    merkle_root_hash VARCHAR(64) NOT NULL,
    canonical_bundle_hash VARCHAR(64) NOT NULL,
    provo_json_ld JSONB NOT NULL,
    signed_by_key_id VARCHAR(64) NOT NULL,
    ed25519_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_bundles (case_urn, evaluation_cutoff);

-- 5. Stored Procedures: Spatial Corridor Crossings & Anomaly Trigger
CREATE OR REPLACE FUNCTION check_corridor_conformance(
    p_track_id VARCHAR(64),
    p_point GEOMETRY(PointZ, 4326)
) RETURNS BOOLEAN AS $$
DECLARE
    v_corridor GEOMETRY;
    v_inside BOOLEAN;
BEGIN
    SELECT corridor_geom INTO v_corridor FROM target_tracks WHERE track_id = p_track_id;
    IF v_corridor IS NULL THEN
        RETURN TRUE; -- No corridor constraint assigned
    END IF;
    
    v_inside := ST_Contains(v_corridor, ST_Force2D(p_point));
    IF NOT v_inside THEN
        UPDATE target_tracks 
        SET is_anomaly = TRUE, 
            anomaly_reason = 'Spatial corridor violation detected at ' || NOW()::TEXT
        WHERE track_id = p_track_id;
    END IF;
    RETURN v_inside;
END;
$$ LANGUAGE plpgsql;
