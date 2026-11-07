/**
 * SpatialForge AI - 3D Cesium Viewport & Tactical Recon Perspectives
 */

export interface TacticalPerspective {
  id: string;
  name: string;
  region: string;
  coordinates: {
    lat: number;
    lon: number;
    alt: number;
    pitch: number;
    heading: number;
  };
  filter: 'crt' | 'nvg' | 'flir' | 'noir' | 'normal';
  description: string;
  tacticalCallout: string;
}

export interface CorridorBoundary {
  corridorId: string;
  zoneType: 'PORT_APPROACH' | 'CHOKEPOINT' | 'AIR_CORRIDOR' | 'RESTRICTED_AIRSPACE';
  polygonGeoJson: GeoJSON.Polygon;
  minAltitudeM?: number;
  maxAltitudeM?: number;
}

