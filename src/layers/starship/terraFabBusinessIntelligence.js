/**
 * SpatialForge 3D // Sovereign Semiconductor & Orbital Compute Fabric
 * 
 * Provides:
 * 1. Global Starlink commercial availability, capacity density, plans & cost calculator
 * 2. Financial arbitrage & latency ROI calculator (speed of light in vacuum vs terrestrial fiber)
 * 3. Sovereign Semiconductor & Orbital AWS Cloud Architecture (Austin Research Fab -> Grimes MegaFab -> Boca Chica -> LEO)
 * 4. 2026–2030 Planetary Future Outlook simulation model
 * 5. Re-engineered 6-Layer Closed-Loop Coordination Engine (L1-L6)
 */

import { sovereignFabEngine, LAYER_DEFINITIONS, SOVEREIGN_CHIP_FAMILIES } from './sovereignFabCoordinationEngine.js';

export { sovereignFabEngine, LAYER_DEFINITIONS, SOVEREIGN_CHIP_FAMILIES };

export const STARLINK_BUSINESS_PLANS = Object.freeze([
  {
    id: 'plan_business_priority',
    name: 'Business Priority Terminal',
    target: 'Enterprises, Remote Offices, Critical Utilities',
    hardwareCost: 599,
    monthlyCost: 250,
    downlinkMbps: '40 - 220 Mbps',
    uplinkMbps: '10 - 25 Mbps',
    latencyMs: '20 - 35 ms',
    availabilityGlobalPct: 99.4,
    features: ['Public IPv4', 'Priority Network Routing', '24/7 SLA Support', 'Direct-to-Cell Standby'],
    iconType: 'business'
  },
  {
    id: 'plan_maritime_priority',
    name: 'Global Maritime Priority',
    target: 'Commercial Fleets, Container Ships, Offshore Rigs',
    hardwareCost: 2500,
    monthlyCost: 1000,
    downlinkMbps: '100 - 300 Mbps',
    uplinkMbps: '20 - 40 Mbps',
    latencyMs: '22 - 38 ms',
    availabilityGlobalPct: 99.9,
    features: ['10 Tbps Optical Laser Mesh Routing', 'Zero Shore-Station Dependence', 'Coverage Across All Oceans', 'AIS Transponder Integration'],
    iconType: 'maritime'
  },
  {
    id: 'plan_aviation',
    name: 'Aviation Transonic Link',
    target: 'Commercial Airlines, Business Jets, Military Transports',
    hardwareCost: 15000,
    monthlyCost: 10000,
    downlinkMbps: '220 - 350 Mbps per plane',
    uplinkMbps: '30 - 50 Mbps',
    latencyMs: '20 - 30 ms',
    availabilityGlobalPct: 99.8,
    features: ['Aerodynamic Phased Array Antenna', 'Mach 0.9+ Flight Vector Tracking', 'Gate-to-Gate Continuous Stream', 'Direct In-Flight Voice/Data'],
    iconType: 'aviation'
  },
  {
    id: 'plan_d2c_enterprise',
    name: 'Direct-to-Cell Mesh',
    target: 'Telcos (T-Mobile, Vodafone, Kyivstar), Logistics, FirstNet',
    hardwareCost: 0,
    monthlyCost: 45,
    downlinkMbps: '2 - 8 Mbps per phone',
    uplinkMbps: '1 - 4 Mbps',
    latencyMs: '24 - 40 ms',
    availabilityGlobalPct: 99.95,
    features: ['Standard 4G/5G Handset Compatible', '1910-1950 MHz RF Spectrum Bonding', 'Hurricane & Blackout Autonomous Handover', 'Global Emergency SOS'],
    iconType: 'cellular'
  },
  {
    id: 'plan_terrafab_orbital_cloud',
    name: 'Sovereign TerraFab & Orbital AWS Cloud',
    target: 'Autonomous Robotics, Hyperscale AI Labs, Sovereign Defense',
    hardwareCost: 0,
    monthlyCost: 25000,
    downlinkMbps: '10 Terabits/s Space Laser Backbone',
    uplinkMbps: '10 Terabits/s',
    latencyMs: '12 - 20 ms (Vacuum Laser)',
    availabilityGlobalPct: 99.999,
    features: ['On-Orbit Tensor Processing Units (TPUs)', 'Austin Research Fab Custom Silicon', 'Grimes County MacroFab Compute', '60% Cheaper than AWS/Azure'],
    iconType: 'orbital'
  }
]);

export const TERRAFAB_NETWORK_NODES = Object.freeze([
  {
    id: 'node-austin-research',
    name: 'Austin Research Fab (L2/L3)',
    role: 'Design • Make • Test Cleanroom Under One Roof',
    location: 'Austin, Texas',
    coords: [30.2223, -97.6171],
    powerCapacityMw: 120,
    turnaroundTime: 'Days per silicon revision (vs 18 months traditional TSMC tape-out)',
    status: 'ACTIVE_PROTOTYPING',
    focus: 'Radiation-hardened space TPUs, high-density AI accelerators, and RF transceivers.'
  },
  {
    id: 'node-grimes-macrofab',
    name: 'Grimes County MacroFab (L1/L3)',
    role: 'Gigawatt-Scale Silicon Mass Production',
    location: 'Grimes County, Texas',
    coords: [30.5500, -95.9800],
    powerCapacityMw: 450,
    turnaroundTime: 'Mass high-yield wafer volume',
    status: 'PLANNED_CONSTRUCTION',
    focus: 'High-volume production of orbital computer modules and terrestrial xAI mega-clusters.'
  },
  {
    id: 'node-boca-chica',
    name: 'Starbase Boca Chica Catch Tower (L6 Launch)',
    role: 'Mechazilla Rapid Re-Flight & Orbital Delivery Hub',
    location: 'Boca Chica, Texas',
    coords: [25.9972, -97.1561],
    powerCapacityMw: 25,
    turnaroundTime: '1-Hour booster catch turnaround in principle',
    status: 'OPERATIONAL',
    focus: 'Launching 100-150 tonnes of orbital computers per flight at $10-$50/kg on Starship.'
  },
  {
    id: 'node-orbital-cloud-leo',
    name: 'Gen-3 Orbital Compute Mesh (LEO 550km)',
    role: 'Space-Edge Serverless Compute & GPU Inference',
    location: 'Low Earth Orbit (550 km Sun-Synchronous)',
    coords: [0.0, 0.0],
    powerCapacityMw: 12,
    turnaroundTime: 'Real-time in-situ execution',
    status: 'Q3 2027 TEST TARGET',
    focus: 'Zero terrestrial grid load, continuous 1,361 W/m² solar power, and 3K deep space cooling.'
  }
]);

export const FUTURE_OUTLOOK_PHASES = Object.freeze([
  {
    year: '2026',
    title: 'Phase 1: Constellation Expansion & Research Fab',
    satellitesInOrbit: 11000,
    opticalLaserSpeed: '100 Gbps Today',
    annualRunRate: '> $100 Billion Annual Pace (Dec 2026)',
    powerDemandGw: '50 - 100 GW',
    summary: '11,000 active satellites in orbit; Austin Research Fab achieves rapid under-one-roof silicon prototyping; Direct-to-Cell cellular spectrum sharing goes live.',
    starlinkDominanceIndex: 68
  },
  {
    year: '2027',
    title: 'Phase 2: Orbital Computer Testing & Grimes MacroFab',
    satellitesInOrbit: 15000,
    opticalLaserSpeed: '1 Terabit/s Next-Gen',
    annualRunRate: '> $500 Billion Annual Recurring (Dec 2027 Musk Goal)',
    powerDemandGw: '200 GW (40% of entire US grid)',
    summary: 'Q3 2027 Orbital Computer in-orbit test verifies power drawn, useful work, and heat released in space; Grimes County MacroFab begins high-volume wafer production; Mechazilla hourly re-flight validated.',
    starlinkDominanceIndex: 84
  },
  {
    year: '2028-2030',
    title: 'Phase 3: The 1-Terawatt Space AI & TerraFab Cloud Dominance',
    satellitesInOrbit: 42000,
    opticalLaserSpeed: '10 Terabits/s Optical Laser Mesh',
    annualRunRate: '> $1 Trillion Global Ecosystem',
    powerDemandGw: '1 Terawatt (1,000 Gigawatts = 2× entire US grid)',
    summary: 'SpaceX TerraFab operates the world largest sovereign AI cloud in orbit, bypassing land grid constraints; 10 Tbps laser mesh replaces subsea cables as the primary global economic spine.',
    starlinkDominanceIndex: 96
  }
]);

/**
 * Calculates financial arbitrage and latency savings for businesses.
 */
export function calculateBusinessArbitrage(scenario = 'HFT_FINANCE', monthlyGbVolume = 50000, currentMonthlySpendUsd = 120000) {
  let latencySavedMs = 14.5;
  let riskMitigationValueUsd = 250000;
  let starlinkCostUsd = 15000;

  if (scenario === 'HFT_FINANCE') {
    latencySavedMs = 14.8;
    riskMitigationValueUsd = 850000;
    starlinkCostUsd = 25000;
  } else if (scenario === 'MARITIME_CONTAINER') {
    latencySavedMs = 65.0;
    riskMitigationValueUsd = 420000;
    starlinkCostUsd = 35000;
  } else if (scenario === 'DATA_CENTER_FAILOVER') {
    latencySavedMs = 22.0;
    riskMitigationValueUsd = 1200000;
    starlinkCostUsd = 18000;
  }

  const netMonthlyBenefitUsd = (currentMonthlySpendUsd - starlinkCostUsd) + riskMitigationValueUsd;
  const annualRoiPct = Math.round((netMonthlyBenefitUsd / starlinkCostUsd) * 100);

  return {
    scenario,
    latencySavedMs,
    riskMitigationValueUsd,
    starlinkCostUsd,
    currentMonthlySpendUsd,
    netMonthlyBenefitUsd,
    annualRoiPct,
    vacuumSpeedVsGlassAdvantage: '37% faster packet travel (300,000 km/s vacuum vs 204,000 km/s silica glass)'
  };
}
