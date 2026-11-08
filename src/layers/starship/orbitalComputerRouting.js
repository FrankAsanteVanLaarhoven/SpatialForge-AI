/**
 * SpatialForge 3D // Orbital-Terrestrial Co-Compute & Optical Laser Routing Engine (OT-OCRA)
 * 
 * Implements unprecedented aerospace & telecommunications capabilities:
 * 1. 10 Terabits/s Intersatellite Optical Laser Mesh Routing (Speed-of-light in vacuum vs subsea fiber)
 * 2. Orbital Computer (Space-Edge Tensor Core AI Inference in LEO)
 * 3. Dynamic RF Spectrum & Channel Allocation (Direct-to-Cell spectrum rights & carrier bonding)
 * 4. Closed-loop terrestrial cross-links (Chip Factories TSMC/Intel, Nuclear/Hydro Power Plants)
 */

export const VACUUM_LIGHT_SPEED_KMS = 299792;
export const FIBER_GLASS_SPEED_KMS = 204000;

export const ORBITAL_COMPUTER_SPEC = Object.freeze({
  name: 'Starlink Gen-3 AI Orbital Computer',
  cores: 6, // 6 Radiation-Tolerant Tensor Processing Units
  architecture: 'Edge Space-GPU Array (G-Series)',
  totalTflops: 1420,
  powerSource: 'Deployable Dual Triple-Junction Solar Wings (12.4 kW)',
  cooling: 'Space Vacuum Heat Pipe Radiator Fin Bank',
  memoryGb: 192,
  spaceHardening: 'Triple Modular Redundancy (TMR) Radiation-Hardened',
  activeInferenceJobs: [
    { id: 'job-ais', name: 'AIS Dark Fleet Spoofing Detection', latencyMs: 4.2, status: 'RUNNING' },
    { id: 'job-cv', name: 'Maritime SAR Optical Bounding Box Gen', latencyMs: 8.6, status: 'RUNNING' },
    { id: 'job-grid', name: '110kV Substation Outage Predictive Bypass', latencyMs: 2.1, status: 'STANDBY' },
    { id: 'job-mesh', name: '10 Tbps Laser Route Hop Arbitration', latencyMs: 1.4, status: 'OPTIMAL' },
  ]
});

export const SPECTRUM_ALLOCATION_BANDS = Object.freeze([
  { id: 'ch-1', freqMhz: '1910 - 1915', label: 'T-Mobile US Direct-to-Cell (Band 25)', active: true, owner: 'SpaceX / T-Mobile', bandwidth: '5 MHz' },
  { id: 'ch-2', freqMhz: '1915 - 1920', label: 'SpaceX Primary Orbital Access (FCC Approved)', active: true, owner: 'SpaceX Starlink', bandwidth: '5 MHz' },
  { id: 'ch-3', freqMhz: '1920 - 1925', label: 'Kyivstar Ukraine Resiliency Band', active: true, owner: 'Kyivstar / SpaceX', bandwidth: '5 MHz' },
  { id: 'ch-4', freqMhz: '1925 - 1930', label: 'STC Saudi Maritime Red Sea Corridor', active: true, owner: 'STC / Starlink', bandwidth: '5 MHz' },
  { id: 'ch-5', freqMhz: '1930 - 1935', label: 'Commercial Cellular Terrestrial Legacy', active: false, owner: 'Terrestrial Telco', bandwidth: '5 MHz' },
  { id: 'ch-6', freqMhz: '1935 - 1940', label: 'Next-Gen Supplemental Channel (Pending FCC)', active: true, owner: 'More channels for SpaceX', bandwidth: '5 MHz' },
  { id: 'ch-7', freqMhz: '1940 - 1945', label: 'Next-Gen Supplemental Channel (Pending ITU)', active: true, owner: 'More channels for SpaceX', bandwidth: '5 MHz' },
  { id: 'ch-8', freqMhz: '1945 - 1950', label: 'Defense Direct Uplink Channel', active: true, owner: 'Sovereign Defense', bandwidth: '5 MHz' },
]);

/**
 * Calculates real-time multi-hop optical laser routing between a maritime ship and ground destination.
 */
export function calculateLaserRoute(sourceVessel = 'Emma Maersk (Red Sea)', destFacility = 'TSMC Fab 21 (Phoenix, AZ)') {
  // Distance around the globe for this path: ~13,200 km
  const pathDistanceKm = 13200;

  // 1. Orbital Vacuum Laser Path (4 Intersatellite Hops)
  // Distance in vacuum: 550km altitude + hops
  const orbitalHops = [
    { hop: 1, sat: 'STARLINK-4102', role: 'Uplink Catch (Ship at Sea)', altKm: 550, rangeKm: 780 },
    { hop: 2, sat: 'STARLINK-4103', role: 'Laser Link: Sat to Sat', altKm: 550, rangeKm: 3400 },
    { hop: 3, sat: 'STARLINK-4104', role: 'Laser Link: Sat to Sat', altKm: 550, rangeKm: 3800 },
    { hop: 4, sat: 'STARLINK-4105', role: 'Laser Link: Sat to Sat', altKm: 550, rangeKm: 3900 },
    { hop: 5, sat: 'GATEWAY-BOCACHICA', role: 'Route Down to Land', altKm: 0, rangeKm: 850 },
  ];

  const totalOrbitalDistanceKm = orbitalHops.reduce((sum, h) => sum + h.rangeKm, 0);
  const vacuumTimeSec = totalOrbitalDistanceKm / VACUUM_LIGHT_SPEED_KMS;
  const vacuumPingMs = Math.round(vacuumTimeSec * 1000 * 2); // Round trip

  // 2. Equivalent Terrestrial Undersea Fiber Path
  // Glass fiber refraction index n ≈ 1.47 -> speed ≈ 204,000 km/s + 20% routing serpentine + repeaters
  const terrestrialFiberDistanceKm = pathDistanceKm * 1.25;
  const fiberTimeSec = terrestrialFiberDistanceKm / FIBER_GLASS_SPEED_KMS;
  const fiberPingMs = Math.round(fiberTimeSec * 1000 * 2 + 18); // +18ms router/EDFA hops

  const latencyAdvantagePct = Math.round(((fiberPingMs - vacuumPingMs) / fiberPingMs) * 100);

  return {
    source: sourceVessel,
    destination: destFacility,
    laserThroughputTodayGbps: 100,
    laserThroughputNextGenTbps: 10,
    laserThroughputMultiplier: 100,
    orbitalHops,
    vacuumPingMs,
    fiberPingMs,
    latencyAdvantagePct,
    speedComparison: {
      vacuumSpeedKms: VACUUM_LIGHT_SPEED_KMS,
      fiberSpeedKms: FIBER_GLASS_SPEED_KMS,
      advantage: `${latencyAdvantagePct}% lower latency via Space Laser Mesh than Subsea Fiber Cables`,
    },
    orbitalComputer: ORBITAL_COMPUTER_SPEC,
    spectrumChannels: SPECTRUM_ALLOCATION_BANDS,
  };
}

