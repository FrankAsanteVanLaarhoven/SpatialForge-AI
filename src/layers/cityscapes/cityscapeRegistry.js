/**
 * SpatialForge 3D // Global Cityscape & Live Camera Registry
 * 
 * Provides interactive 3D camera viewpoints, live streaming CCTV / cityscape camera feeds,
 * architectural nadir surveillance, and panoramic street-level views for major global metropolises.
 */

export const GLOBAL_CITYSCAPES = [
  {
    id: 'city-austin',
    name: 'Austin Tech Corridor & Capitol',
    city: 'Austin, Texas',
    country: 'United States',
    tag: 'SEMICONDUCTOR FAB CORRIDOR',
    lat: 30.2672,
    lon: -97.7431,
    alt: 650,
    heading: 195,
    pitch: -32,
    style: 'surveillance',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/austin/lake.jpg',
    description: 'Home to the Sovereign Austin Research Fab (Design-Make-Test Under One Roof), Lady Bird Lake skyline, and Texas Capitol.',
    elevation: '150m ASL',
    population: '975,000',
    weather: '24°C · Clear Sky',
    cameraModes: [
      { name: 'Skyline Orbit', alt: 650, pitch: -32, heading: 195 },
      { name: 'Nadir Orthogonal', alt: 2200, pitch: -89.5, heading: 0 },
      { name: 'Street Level Eye', alt: 85, pitch: -5, heading: 180 }
    ]
  },
  {
    id: 'city-nyc',
    name: 'Manhattan Midtown & Central Park',
    city: 'New York City',
    country: 'United States',
    tag: 'GLOBAL FINANCIAL CAPITAL',
    lat: 40.7580,
    lon: -73.9855,
    alt: 880,
    heading: 45,
    pitch: -38,
    style: 'normal',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/timessquare/ts.jpg',
    description: 'High-density skyscraper canyon stretching from Times Square and Empire State to Central Park South with financial optical transceivers.',
    elevation: '10m ASL',
    population: '8,400,000',
    weather: '18°C · Moderate Breeze',
    cameraModes: [
      { name: 'Midtown High Oblique', alt: 880, pitch: -38, heading: 45 },
      { name: 'Financial District Nadir', alt: 3200, pitch: -89.0, heading: 180 },
      { name: 'Times Square Street', alt: 75, pitch: -4, heading: 30 }
    ]
  },
  {
    id: 'city-tokyo',
    name: 'Shibuya Crossing & Shinjuku Metropolis',
    city: 'Tokyo',
    country: 'Japan',
    tag: 'CYBER SENSOR METROPOLIS',
    lat: 35.6595,
    lon: 139.7004,
    alt: 720,
    heading: 15,
    pitch: -36,
    style: 'noir',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/tokyo/shibuya.jpg',
    description: 'World highest pedestrian density intersection, autonomous transit telemetry, and dense 5G/6G millimeter-wave mesh grid.',
    elevation: '40m ASL',
    population: '14,000,000',
    weather: '16°C · Overcast',
    cameraModes: [
      { name: 'Shibuya Scramble View', alt: 380, pitch: -30, heading: 15 },
      { name: 'Tokyo Tower Oblique', alt: 950, pitch: -28, heading: 240 },
      { name: 'Orthogonal City Grid', alt: 4500, pitch: -89.5, heading: 0 }
    ]
  },
  {
    id: 'city-london',
    name: 'City of London & River Thames',
    city: 'London',
    country: 'United Kingdom',
    tag: 'MARITIME ARTERY & FINANCIAL HUB',
    lat: 51.5055,
    lon: -0.0754,
    alt: 780,
    heading: 265,
    pitch: -34,
    style: 'normal',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/london/towerbridge.jpg',
    description: 'Tower Bridge, The Shard, and Bank financial district surveillance overlooking the River Thames maritime fairway.',
    elevation: '11m ASL',
    population: '8,900,000',
    weather: '12°C · Light Rain',
    cameraModes: [
      { name: 'Tower Bridge Approach', alt: 450, pitch: -26, heading: 265 },
      { name: 'Canary Wharf High Angle', alt: 1100, pitch: -42, heading: 90 },
      { name: 'Westminster Nadir', alt: 2800, pitch: -89.0, heading: 0 }
    ]
  },
  {
    id: 'city-paris',
    name: 'Eiffel Tower & Seine Basin',
    city: 'Paris',
    country: 'France',
    tag: 'CULTURAL & DIPLOMATIC CENTER',
    lat: 48.8584,
    lon: 2.2945,
    alt: 820,
    heading: 135,
    pitch: -35,
    style: 'normal',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/paris/eiffel.jpg',
    description: 'Champ de Mars, Eiffel Tower architectural landmark, and historic Haussmannian boulevard grid.',
    elevation: '35m ASL',
    population: '2,160,000',
    weather: '15°C · Clear',
    cameraModes: [
      { name: 'Eiffel Tower Oblique', alt: 620, pitch: -30, heading: 135 },
      { name: 'Arc de Triomphe Radiating Grid', alt: 1800, pitch: -88.0, heading: 90 },
      { name: 'La Défense Skyline', alt: 1200, pitch: -25, heading: 300 }
    ]
  },
  {
    id: 'city-singapore',
    name: 'Marina Bay & Singapore Straits',
    city: 'Singapore',
    country: 'Singapore',
    tag: 'GLOBAL MARITIME MEGA-CHOKEPOINT',
    lat: 1.2838,
    lon: 103.8591,
    alt: 690,
    heading: 215,
    pitch: -33,
    style: 'normal',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/singapore/marinabay.jpg',
    description: 'Marina Bay Sands skyline coupled with the busiest maritime transshipment anchorage and Malacca Straits approach in the world.',
    elevation: '15m ASL',
    population: '5,900,000',
    weather: '30°C · Tropical Humid',
    cameraModes: [
      { name: 'Marina Bay Basin', alt: 580, pitch: -32, heading: 215 },
      { name: 'Straits Shipping Anchorage', alt: 2200, pitch: -45, heading: 170 },
      { name: 'Port of Singapore Cranes', alt: 920, pitch: -28, heading: 250 }
    ]
  },
  {
    id: 'city-dubai',
    name: 'Burj Khalifa Downtown & Jebel Ali',
    city: 'Dubai',
    country: 'United Arab Emirates',
    tag: 'LOGISTICS & SUPERTALL ARCHITECTURE',
    lat: 25.1972,
    lon: 55.2744,
    alt: 1250,
    heading: 65,
    pitch: -42,
    style: 'surveillance',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/dubai/burj.jpg',
    description: 'World tallest structure (828m Burj Khalifa), Dubai Mall district, Sheikh Zayed super-highway and Persian Gulf approaches.',
    elevation: '5m ASL',
    population: '3,600,000',
    weather: '32°C · Sunny',
    cameraModes: [
      { name: 'Burj Khalifa Spire View', alt: 1250, pitch: -42, heading: 65 },
      { name: 'Palm Jumeirah Aerial', alt: 3500, pitch: -75, heading: 180 },
      { name: 'Jebel Ali Port Terminal', alt: 1600, pitch: -35, heading: 230 }
    ]
  },
  {
    id: 'city-sf',
    name: 'San Francisco & Silicon Valley Spine',
    city: 'San Francisco, California',
    country: 'United States',
    tag: 'AI & TECH CAPITOL',
    lat: 37.7937,
    lon: -122.3965,
    alt: 750,
    heading: 285,
    pitch: -30,
    style: 'normal',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/sanfrancisco/bay.jpg',
    description: 'Salesforce Tower, Bay Bridge approach, Embarcadero waterfront and the primary compute innovation corridor.',
    elevation: '16m ASL',
    population: '810,000',
    weather: '17°C · Coastal Fog',
    cameraModes: [
      { name: 'Embarcadero Skyline', alt: 750, pitch: -30, heading: 285 },
      { name: 'Golden Gate Strait', alt: 1100, pitch: -22, heading: 245 },
      { name: 'Silicon Valley South Bay Nadir', alt: 8500, pitch: -89.0, heading: 135 }
    ]
  },
  {
    id: 'city-hongkong',
    name: 'Victoria Harbour & Kowloon Peninsula',
    city: 'Hong Kong',
    country: 'China',
    tag: 'DEEP WATER MOUNTAIN METROPOLIS',
    lat: 22.2855,
    lon: 114.1577,
    alt: 940,
    heading: 345,
    pitch: -35,
    style: 'noir',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/hongkong/victoria.jpg',
    description: 'Victoria Peak panorama, International Finance Centre (IFC), Star Ferry transit routes and dense mountain-canyon high-rises.',
    elevation: '28m ASL',
    population: '7,400,000',
    weather: '26°C · Clear',
    cameraModes: [
      { name: 'Victoria Peak Overlook', alt: 940, pitch: -35, heading: 345 },
      { name: 'Kowloon Waterfront Oblique', alt: 680, pitch: -25, heading: 175 },
      { name: 'Kwai Chung Container Port', alt: 1900, pitch: -48, heading: 290 }
    ]
  },
  {
    id: 'city-sydney',
    name: 'Sydney Harbour & Opera House',
    city: 'Sydney',
    country: 'Australia',
    tag: 'PACIFIC GATEWAY',
    lat: -33.8568,
    lon: 151.2153,
    alt: 620,
    heading: 165,
    pitch: -32,
    style: 'normal',
    cctvUrl: 'https://images.earthcam.com/ec_netcam_cwp/sydney/harbour.jpg',
    description: 'Sydney Harbour Bridge, Bennelong Point Opera House shells, Circular Quay maritime ferry hub and Pacific ocean entrance.',
    elevation: '19m ASL',
    population: '5,300,000',
    weather: '21°C · Sunny',
    cameraModes: [
      { name: 'Harbour Bridge & Opera House', alt: 620, pitch: -32, heading: 165 },
      { name: 'Circular Quay Ferries', alt: 390, pitch: -28, heading: 210 },
      { name: 'Port Jackson Nadir', alt: 3400, pitch: -89.0, heading: 0 }
    ]
  }
];

export function flyToCityscape(cityId, modeIndex = 0) {
  const city = GLOBAL_CITYSCAPES.find(c => c.id === cityId);
  if (!city) return false;

  const mode = city.cameraModes[modeIndex] || city.cameraModes[0];
  const viewer = window.viewer;
  const Cesium = window.Cesium || window.cesium;

  if (viewer?.camera && Cesium) {
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, mode.alt),
      orientation: {
        heading: Cesium.Math.toRadians(mode.heading),
        pitch: Cesium.Math.toRadians(mode.pitch),
        roll: 0.0
      },
      duration: 2.2
    });
    return true;
  }
  return false;
}
