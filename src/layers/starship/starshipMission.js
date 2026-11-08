/**
 * SpaceX Starship Super Heavy Full Mission Simulation Engine
 * 
 * Accurately models the complete flight profile of Starship Flight 5 & Flight 6:
 * - Pre-launch on the Orbital Launch Mount (OLM)
 * - 33 Raptor 3 ignition, water deluge, liftoff clearing Mechazilla
 * - Max Q supersonic ascent
 * - Hot staging separation
 * - Super Heavy Boostback burn & atmospheric entry with grid fins
 * - Landing burn & the historic Mechazilla Tower Chopsticks Catch!
 * - Starship orbital insertion & Starlink satellite Pez dispenser deployment
 */

export const STARBASE_LOCATION = Object.freeze({
  name: 'Starbase Boca Chica, Texas',
  pad: 'Orbital Launch Mount A (OLM-A)',
  latitude: 25.99722,
  longitude: -97.15611,
  elevationM: 3.0,
  towerLat: 25.99738,
  towerLon: -97.15645,
  towerHeightM: 146.0,
  catchAltitudeM: 76.0,
});

export const MISSION_PHASES = Object.freeze([
  { id: 'prelaunch', name: 'PRE-LAUNCH', timeStart: -30, timeEnd: 0, description: 'Cryogenic loading & deluge system armed on OLM' },
  { id: 'liftoff', name: 'LIFTOFF', timeStart: 0, timeEnd: 62, description: '33 Raptor 3 engines ignite; tower clearance' },
  { id: 'max_q', name: 'MAX Q', timeStart: 62, timeEnd: 160, description: 'Maximum dynamic pressure at Mach 1.5' },
  { id: 'hot_staging', name: 'HOT STAGING', timeStart: 160, timeEnd: 168, description: 'Ship engines ignite, stage separation' },
  { id: 'boostback', name: 'BOOSTBACK BURN', timeStart: 168, timeEnd: 220, description: '13 Raptors ignite; booster return to launch site' },
  { id: 'coasting', name: 'APOGEE COAST', timeStart: 220, timeEnd: 365, description: 'Booster reaches 112 km apogee; grid fins steer' },
  { id: 'entry_burn', name: 'ENTRY BURN', timeStart: 365, timeEnd: 405, description: 'Booster atmospheric braking' },
  { id: 'terminal_dive', name: 'AERODYNAMIC DIVE', timeStart: 405, timeEnd: 410, description: 'Grid fins steer booster towards Mechazilla' },
  { id: 'landing_burn', name: 'LANDING BURN', timeStart: 410, timeEnd: 415, description: '3 center Raptors ignite; landing flip maneuver' },
  { id: 'chopstick_catch', name: 'MECHAZILLA CATCH', timeStart: 415, timeEnd: 500, description: 'Booster catch: The arms close, pins rest on the arms · 1-hour re-flight in principle' },
  { id: 'seco', name: 'ORBITAL INSERTION', timeStart: 500, timeEnd: 540, description: 'Starship SECO at 175 km, 26,500 km/h · AI Computers in Orbit active' },
  { id: 'starlink_deploy', name: 'STARLINK 11K DEPLOY', timeStart: 540, timeEnd: 660, description: 'Pez dispenser deploys 11,000+ constellation satellites with 10 Tbps laser cross-links' },
]);

export const SHOWCASE_TOTAL_SECONDS = 36; // At least 30s cinematic showcase loop

/**
 * Maps a continuous 0..36 second showcase time into the complete 0..440 mission lifecycle.
 * Provides a continuous, dramatic sequence of Takeoff -> Ascent -> Staging -> Re-entry -> Mechazilla Catch.
 * @param {number} showcaseSec - 0 to 36
 * @returns {number} missionTimeS (-5 to 440)
 */
export function showcaseToMissionTime(showcaseSec) {
  const s = ((showcaseSec % SHOWCASE_TOTAL_SECONDS) + SHOWCASE_TOTAL_SECONDS) % SHOWCASE_TOTAL_SECONDS;
  // 0s..4s (4s): Pre-launch on OLM launch stand (-5s to 0s)
  if (s < 4) {
    return -5 + (s / 4) * 5;
  }
  // 4s..11s (7s): Liftoff to Max Q (0s to 120s)
  if (s < 11) {
    const p = (s - 4) / 7;
    return p * 120;
  }
  // 11s..17s (6s): Staging & Boostback Burn (120s to 220s)
  if (s < 17) {
    const p = (s - 11) / 6;
    return 120 + p * 100;
  }
  // 17s..23s (6s): Apogee Coast & Entry Burn (220s to 400s)
  if (s < 23) {
    const p = (s - 17) / 6;
    return 220 + p * 180;
  }
  // 23s..27s (4s): Aerodynamic Dive to Landing Burn (400s to 415s)
  if (s < 27) {
    const p = (s - 23) / 4;
    return 400 + p * 15;
  }
  // 27s..31s (4s): Mechazilla Hover & Chopstick Catch (415s to 425s)
  if (s < 31) {
    const p = (s - 27) / 4;
    return 415 + p * 10;
  }
  // 31s..36s (5s): Booster Captured Triumph on Stand & Starlink Orbit (425s to 440s)
  const p = (s - 31) / 5;
  return 425 + p * 15;
}

export function calculateStarshipTelemetry(missionTimeS) {
  const t = missionTimeS;
  const padLat = STARBASE_LOCATION.latitude;
  const padLon = STARBASE_LOCATION.longitude;
  
  // Phase determination
  let currentPhase = MISSION_PHASES[0];
  for (const phase of MISSION_PHASES) {
    if (t >= phase.timeStart && t <= phase.timeEnd) {
      currentPhase = phase;
      break;
    }
    if (t > MISSION_PHASES.at(-1).timeEnd) {
      currentPhase = MISSION_PHASES.at(-1);
    }
  }

  // Booster kinematics (Super Heavy)
  let boosterAltM = 0;
  let boosterSpeedKmh = 0;
  let boosterLat = padLat;
  let boosterLon = padLon;
  let boosterPitchDeg = 90;
  let boosterRollDeg = 0;
  let boosterRaptorThrottle = 0;
  let boosterRaptorCount = 33;
  let chopsticksArmAngleDeg = 45; // 45° open, 0° closed clamp
  let chopsticksCatchStatus = 'STANDBY';

  // Starship Upper Stage kinematics
  let shipAltM = 0;
  let shipSpeedKmh = 0;
  let shipLat = padLat;
  let shipLon = padLon;
  let shipPitchDeg = 90;
  let shipRaptorThrottle = 0;
  let shipRaptorCount = 6;
  let starlinkDispensedCount = 0;

  if (t < 0) {
    // Standing on the OLM
    boosterAltM = 0;
    shipAltM = 71; // Atop booster
    boosterPitchDeg = 90;
    shipPitchDeg = 90;
    chopsticksArmAngleDeg = 45;
    chopsticksCatchStatus = t > -5 ? 'ARMED' : 'STANDBY';
    boosterRaptorThrottle = t > -3 ? Math.min(100, (3 + t) * 33.3) : 0;
  } else if (t <= 62) {
    // Liftoff to Max Q
    const progress = t / 62;
    boosterAltM = Math.pow(progress, 1.8) * 12500;
    boosterSpeedKmh = progress * 1850;
    boosterPitchDeg = 90 - progress * 18; // Pitching east downrange
    boosterLat = padLat + progress * 0.04;
    boosterLon = padLon + progress * 0.12;
    boosterRaptorThrottle = 100;
    boosterRaptorCount = 33;
    chopsticksArmAngleDeg = 45;
    chopsticksCatchStatus = 'TRACKING';

    shipAltM = boosterAltM + 71;
    shipSpeedKmh = boosterSpeedKmh;
    shipLat = boosterLat;
    shipLon = boosterLon;
    shipPitchDeg = boosterPitchDeg;
  } else if (t <= 160) {
    // Ascent to Hot Staging
    const progress = (t - 62) / (160 - 62);
    boosterAltM = 12500 + progress * (68000 - 12500);
    boosterSpeedKmh = 1850 + progress * (5450 - 1850);
    boosterPitchDeg = 72 - progress * 24;
    boosterLat = padLat + 0.04 + progress * 0.16;
    boosterLon = padLon + 0.12 + progress * 0.48;
    boosterRaptorThrottle = 100;
    chopsticksCatchStatus = 'ARMED_FOR_RETURN';

    shipAltM = boosterAltM + 71;
    shipSpeedKmh = boosterSpeedKmh;
    shipLat = boosterLat;
    shipLon = boosterLon;
    shipPitchDeg = boosterPitchDeg;
  } else if (t <= 168) {
    // Hot Staging
    const progress = (t - 160) / 8;
    boosterAltM = 68000 + progress * 3000;
    boosterSpeedKmh = 5450;
    boosterPitchDeg = 48 + progress * 60; // Booster begins flip
    boosterRaptorThrottle = 40;
    boosterRaptorCount = 3;

    shipAltM = boosterAltM + 71 + progress * 800; // Separation gap
    shipSpeedKmh = 5450 + progress * 600;
    shipPitchDeg = 48 - progress * 6;
    shipRaptorThrottle = 100;
  } else if (t <= 220) {
    // Booster Boostback Burn (RTLS)
    const progress = (t - 168) / (220 - 168);
    boosterAltM = 71000 + progress * 24000;
    boosterSpeedKmh = 5450 - progress * 4200; // Decelerating forward velocity
    boosterPitchDeg = 108 + progress * 72; // Aiming back toward Starbase
    boosterLat = padLat + 0.20 * (1 - progress * 0.5);
    boosterLon = padLon + 0.60 * (1 - progress * 0.5);
    boosterRaptorThrottle = 100;
    boosterRaptorCount = 13;
    chopsticksCatchStatus = 'BOOSTBACK_IN_PROGRESS';

    // Ship continues into orbit
    const shipProgress = (t - 160) / 380;
    shipAltM = 68000 + shipProgress * 107000;
    shipSpeedKmh = 6050 + shipProgress * 20400;
    shipLat = padLat + shipProgress * 4.5;
    shipLon = padLon + shipProgress * 18.0;
    shipPitchDeg = Math.max(5, 42 - shipProgress * 37);
    shipRaptorThrottle = 100;
  } else if (t <= 365) {
    // Booster Apogee Coast (up to 112 km)
    const progress = (t - 220) / (365 - 220);
    const parabolic = Math.sin(progress * Math.PI);
    boosterAltM = 95000 + parabolic * 17000 - progress * 45000;
    boosterSpeedKmh = 1250 + progress * 2600;
    boosterPitchDeg = 180 + progress * 90; // Nose down entry attitude
    boosterLat = padLat + 0.10 * (1 - progress);
    boosterLon = padLon + 0.30 * (1 - progress);
    boosterRaptorThrottle = 0;
    boosterRaptorCount = 0;
    chopsticksCatchStatus = 'RADAR_ACQUIRED';
    chopsticksArmAngleDeg = 40;

    // Ship continues
    const shipProgress = (t - 160) / 380;
    shipAltM = 68000 + shipProgress * 107000;
    shipSpeedKmh = 6050 + shipProgress * 20400;
    shipLat = padLat + shipProgress * 4.5;
    shipLon = padLon + shipProgress * 18.0;
    shipPitchDeg = Math.max(2, 42 - shipProgress * 37);
    shipRaptorThrottle = 100;
  } else if (t <= 405) {
    // Entry Burn
    const progress = (t - 365) / 40;
    boosterAltM = 67000 - progress * 45000;
    boosterSpeedKmh = 3850 - progress * 2450;
    boosterPitchDeg = 270;
    boosterLat = padLat + 0.02 * (1 - progress);
    boosterLon = padLon + 0.05 * (1 - progress);
    boosterRaptorThrottle = 85;
    boosterRaptorCount = 13;
    chopsticksCatchStatus = 'CHOPSTICKS_FINAL_APPROACH';
    chopsticksArmAngleDeg = 35;

    const shipProgress = (t - 160) / 380;
    shipAltM = 68000 + shipProgress * 107000;
    shipSpeedKmh = 6050 + shipProgress * 20400;
    shipLat = padLat + shipProgress * 4.5;
    shipLon = padLon + shipProgress * 18.0;
    shipRaptorThrottle = 100;
  } else if (t <= 410) {
    // Aerodynamic Dive & Grid Fin Glide
    const progress = (t - 405) / 5;
    boosterAltM = 22000 - progress * 20800;
    boosterSpeedKmh = 1400 - progress * 950;
    boosterPitchDeg = 270 - progress * 80; // Starting landing flip
    boosterLat = padLat + 0.003 * (1 - progress);
    boosterLon = padLon + 0.005 * (1 - progress);
    boosterRaptorThrottle = 0;
    chopsticksCatchStatus = 'CATCH_GATES_OPEN';
    chopsticksArmAngleDeg = 25;

    const shipProgress = (t - 160) / 380;
    shipAltM = 68000 + shipProgress * 107000;
    shipSpeedKmh = 6050 + shipProgress * 20400;
    shipLat = padLat + shipProgress * 4.5;
    shipLon = padLon + shipProgress * 18.0;
  } else if (t <= 415) {
    // Landing Burn & Alignment with Mechazilla Tower
    const progress = (t - 410) / 5;
    boosterAltM = 1200 - progress * (1200 - STARBASE_LOCATION.catchAltitudeM);
    boosterSpeedKmh = 450 - progress * 440; // Decelerates to 10 km/h
    boosterPitchDeg = 90; // Upright
    boosterLat = STARBASE_LOCATION.towerLat + (1 - progress) * 0.0003;
    boosterLon = STARBASE_LOCATION.towerLon + (1 - progress) * 0.0005;
    boosterRaptorThrottle = 75;
    boosterRaptorCount = 3;
    chopsticksArmAngleDeg = 20 - progress * 15; // Moving in to catch position
    chopsticksCatchStatus = 'HOVER_IN_PIN_ZONE';

    const shipProgress = (t - 160) / 380;
    shipAltM = 68000 + shipProgress * 107000;
    shipSpeedKmh = 6050 + shipProgress * 20400;
    shipLat = padLat + shipProgress * 4.5;
    shipLon = padLon + shipProgress * 18.0;
  } else {
    // T >= 415: MECHAZILLA CATCH SECURED!
    boosterAltM = STARBASE_LOCATION.catchAltitudeM;
    boosterSpeedKmh = 0;
    boosterPitchDeg = 90;
    boosterLat = STARBASE_LOCATION.towerLat;
    boosterLon = STARBASE_LOCATION.towerLon;
    boosterRaptorThrottle = 0;
    boosterRaptorCount = 0;
    chopsticksArmAngleDeg = 0; // Completely clamped on lifting pins!
    chopsticksCatchStatus = 'CLAMP_LOCKED_BOOSTER_CAUGHT';

    // Ship in Orbit (SECO & Starlink Deploy)
    const orbitProgress = Math.min(1, (t - 415) / 125);
    shipAltM = 175000 + Math.sin(orbitProgress * 2) * 2000;
    shipSpeedKmh = 26469; // Orbital velocity
    shipLat = padLat + 4.5 + orbitProgress * 15.0;
    shipLon = padLon + 18.0 + orbitProgress * 60.0;
    shipPitchDeg = 0; // Horizontal orbital flight
    shipRaptorThrottle = t < 540 ? 100 : 0; // SECO at T+540
    starlinkDispensedCount = t > 540 ? Math.min(24, Math.floor((t - 540) / 4)) : 0;
  }

  return {
    missionTimeS: t,
    missionTimeString: formatMissionTime(t),
    phase: currentPhase,
    booster: {
      altitudeM: Math.max(0, boosterAltM),
      altitudeKm: (Math.max(0, boosterAltM) / 1000).toFixed(2),
      speedKmh: Math.max(0, boosterSpeedKmh).toFixed(0),
      speedMach: (Math.max(0, boosterSpeedKmh) / 1225).toFixed(1),
      latitude: boosterLat,
      longitude: boosterLon,
      pitchDeg: boosterPitchDeg,
      rollDeg: boosterRollDeg,
      throttlePct: Math.round(boosterRaptorThrottle),
      activeEngines: boosterRaptorCount,
      gForce: (1.0 + (boosterSpeedKmh / 3600) * 0.4).toFixed(1),
      caught: t >= 415,
    },
    mechazilla: {
      towerHeightM: STARBASE_LOCATION.towerHeightM,
      catchAltitudeM: STARBASE_LOCATION.catchAltitudeM,
      chopstickAngleDeg: chopsticksArmAngleDeg,
      status: chopsticksCatchStatus,
      pinContact: t >= 414.5,
      clampLocked: t >= 415,
      waterDelugeActive: t >= -3 && t <= 12,
    },
    ship: {
      altitudeM: shipAltM,
      altitudeKm: (shipAltM / 1000).toFixed(1),
      speedKmh: shipSpeedKmh.toFixed(0),
      speedMach: (shipSpeedKmh / 1225).toFixed(1),
      latitude: shipLat,
      longitude: shipLon,
      pitchDeg: shipPitchDeg,
      throttlePct: Math.round(shipRaptorThrottle),
      activeEngines: shipRaptorCount,
      starlinkDispenserOpen: t >= 540,
      starlinkDispensedCount,
      inOrbit: t >= 500,
    },
  };
}

export function formatMissionTime(seconds) {
  const abs = Math.abs(Math.round(seconds));
  const sign = seconds < 0 ? 'T- ' : 'T+ ';
  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = abs % 60;
  return `${sign}${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

