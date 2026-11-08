/**
 * Starship Super Heavy & Mechazilla 3D Cesium Scene Renderer
 * 
 * Renders:
 * - Mechazilla 146m Tower & articulated Chopstick Catch Arms at Starbase (25.9972° N, 97.1561° W)
 * - Super Heavy Booster with 33 Raptor engines, exhaust plumes, grid fins
 * - Starship Upper Stage with heat shield, flaps, Starlink dispenser
 * - Multi-Camera Cinematic Director (Tower, RocketCam, EarthCam, Chopsticks, Drone, Orbit)
 * - Trajectory ribbon paths & Starlink satellite constellation mesh
 */

import * as Cesium from 'cesium';
import { STARBASE_LOCATION } from './starshipMission.js';

export function createStarshipScene(viewer) {
  if (!viewer || !viewer.scene) {
    throw new Error('Cesium Viewer is required for Starship scene');
  }

  const C = Cesium;
  const dataSource = new C.CustomDataSource('spacex-starship-mission');
  viewer.dataSources.add(dataSource);

  const padPos = C.Cartesian3.fromDegrees(
    STARBASE_LOCATION.longitude,
    STARBASE_LOCATION.latitude,
    STARBASE_LOCATION.elevationM
  );

  const towerPos = C.Cartesian3.fromDegrees(
    STARBASE_LOCATION.towerLon,
    STARBASE_LOCATION.towerLat,
    STARBASE_LOCATION.elevationM
  );

  // 1. MECHAZILLA LAUNCH & CATCH TOWER (146m)
  const towerEntity = dataSource.entities.add({
    name: 'Mechazilla Launch & Catch Tower',
    position: C.Cartesian3.fromDegrees(
      STARBASE_LOCATION.towerLon,
      STARBASE_LOCATION.towerLat,
      STARBASE_LOCATION.towerHeightM / 2
    ),
    cylinder: {
      length: STARBASE_LOCATION.towerHeightM,
      topRadius: 9.0,
      bottomRadius: 11.0,
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#475569')),
      numberOfVerticalLines: 12,
      outline: true,
      outlineColor: C.Color.fromCssColorString('#00ffff'),
    },
  });

  // 2. ORBITAL LAUNCH MOUNT (OLM)
  const olmEntity = dataSource.entities.add({
    name: 'Orbital Launch Mount A (OLM)',
    position: padPos,
    cylinder: {
      length: 18.0,
      topRadius: 10.0,
      bottomRadius: 14.0,
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#334155')),
      outline: true,
      outlineColor: C.Color.fromCssColorString('#e2e8f0'),
    },
  });

  // 3. MECHAZILLA CHOPSTICK CATCH ARMS (Dual articulated arms)
  const leftChopstick = dataSource.entities.add({
    name: 'Mechazilla Left Chopstick Arm',
    position: C.Cartesian3.fromDegrees(
      STARBASE_LOCATION.towerLon + 0.0001,
      STARBASE_LOCATION.towerLat,
      STARBASE_LOCATION.catchAltitudeM
    ),
    box: {
      dimensions: new C.Cartesian3(4.0, 38.0, 3.5),
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#1e293b')),
      outline: true,
      outlineColor: C.Color.fromCssColorString('#38bdf8'),
    },
  });

  const rightChopstick = dataSource.entities.add({
    name: 'Mechazilla Right Chopstick Arm',
    position: C.Cartesian3.fromDegrees(
      STARBASE_LOCATION.towerLon - 0.0001,
      STARBASE_LOCATION.towerLat,
      STARBASE_LOCATION.catchAltitudeM
    ),
    box: {
      dimensions: new C.Cartesian3(4.0, 38.0, 3.5),
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#1e293b')),
      outline: true,
      outlineColor: C.Color.fromCssColorString('#38bdf8'),
    },
  });

  // 4. SUPER HEAVY BOOSTER (71m tall, 9m diameter)
  const boosterEntity = dataSource.entities.add({
    name: 'Super Heavy Booster 12',
    position: padPos,
    cylinder: {
      length: 71.0,
      topRadius: 4.5,
      bottomRadius: 4.5,
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#f8fafc')), // Stainless steel 304L
      outline: true,
      outlineColor: C.Color.fromCssColorString('#94a3b8'),
    },
    billboard: {
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="%2338bdf8" stroke-width="2"><path d="m12 2 3 7h5l-4 4 2 7-6-4-6 4 2-7-4-4h5z"/></svg>',
      scale: 0.8,
      heightReference: C.HeightReference.NONE,
      eyeOffset: new C.Cartesian3(0, 0, -20),
    },
  });

  // 5. RAPTOR EXHAUST FLAME PLUME (Dynamic particle glow)
  const boosterPlume = dataSource.entities.add({
    name: '33 Raptor 3 Exhaust Plume',
    position: padPos,
    cylinder: {
      length: 45.0,
      topRadius: 4.0,
      bottomRadius: 18.0,
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#ff6b00').withAlpha(0.85)),
    },
    show: false,
  });

  // 6. STARSHIP UPPER STAGE (50m tall, 9m diameter)
  const shipEntity = dataSource.entities.add({
    name: 'Starship 31 Upper Stage',
    position: C.Cartesian3.fromDegrees(
      STARBASE_LOCATION.longitude,
      STARBASE_LOCATION.latitude,
      STARBASE_LOCATION.elevationM + 71.0
    ),
    cylinder: {
      length: 50.0,
      topRadius: 1.0, // Pointed nosecone
      bottomRadius: 4.5,
      material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#0f172a')), // Black heat shield tiles & steel
      outline: true,
      outlineColor: C.Color.fromCssColorString('#38bdf8'),
    },
  });

  // 7. STARLINK SATELLITES TRAIL (Deployed in LEO)
  const starlinkEntities = [];
  for (let i = 0; i < 24; i++) {
    const sat = dataSource.entities.add({
      name: `Starlink V2 Mini #${i + 1}`,
      position: padPos,
      point: {
        pixelSize: 8,
        color: C.Color.fromCssColorString('#00ffff'),
        outlineColor: C.Color.WHITE,
        outlineWidth: 2,
      },
      show: false,
    });
    starlinkEntities.push(sat);
  }

  // 8. TEXAS SEMICONDUCTOR CORRIDOR & SOVEREIGN FABRIC NODES
  const austinFabPos = C.Cartesian3.fromDegrees(-97.6171, 30.2223, 160.0);
  const grimesFabPos = C.Cartesian3.fromDegrees(-95.9800, 30.5500, 95.0);
  const bocaChicaPos = C.Cartesian3.fromDegrees(STARBASE_LOCATION.longitude, STARBASE_LOCATION.latitude, 10.0);

  // Austin Research Fab [L2/L3] 3D Beacon
  dataSource.entities.add({
    name: 'Austin Research Fab (L2/L3)',
    position: austinFabPos,
    point: {
      pixelSize: 10,
      color: C.Color.fromCssColorString('#00f0ff'),
      outlineColor: C.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: 'AUSTIN RESEARCH FAB [L2/L3]\n120 MW · DESIGN • MAKE • TEST',
      font: '10px monospace',
      style: C.LabelStyle.FILL_AND_OUTLINE,
      fillColor: C.Color.fromCssColorString('#00f0ff'),
      outlineColor: C.Color.BLACK,
      outlineWidth: 2,
      verticalOrigin: C.VerticalOrigin.BOTTOM,
      pixelOffset: new C.Cartesian2(0, -12),
      distanceDisplayCondition: new C.DistanceDisplayCondition(0, 5000000),
    },
  });

  // Grimes County MacroFab [L1/L3] 3D Beacon
  dataSource.entities.add({
    name: 'Grimes County MacroFab (L1/L3)',
    position: grimesFabPos,
    point: {
      pixelSize: 10,
      color: C.Color.fromCssColorString('#a855f7'),
      outlineColor: C.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: 'GRIMES COUNTY MACROFAB [L1/L3]\n450 MW · GIGAWATT FOUNDRY',
      font: '10px monospace',
      style: C.LabelStyle.FILL_AND_OUTLINE,
      fillColor: C.Color.fromCssColorString('#c084fc'),
      outlineColor: C.Color.BLACK,
      outlineWidth: 2,
      verticalOrigin: C.VerticalOrigin.BOTTOM,
      pixelOffset: new C.Cartesian2(0, -12),
      distanceDisplayCondition: new C.DistanceDisplayCondition(0, 5000000),
    },
  });

  // Silicon Corridor Terrestrial & Space Optical Backbone
  dataSource.entities.add({
    name: 'Texas Silicon Corridor Laser Bus',
    polyline: {
      positions: [austinFabPos, grimesFabPos, bocaChicaPos],
      width: 2.5,
      material: new C.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: C.Color.fromCssColorString('#00f0ff'),
      }),
    },
  });

  // Trajectory history polyline
  const boosterTrailPositions = [];
  const shipTrailPositions = [];

  const boosterPathEntity = dataSource.entities.add({
    name: 'Super Heavy Trajectory Path',
    polyline: {
      positions: new C.CallbackProperty(() => boosterTrailPositions, false),
      width: 3.5,
      material: new C.PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: C.Color.fromCssColorString('#f59e0b'), // Amber boostback trail
      }),
    },
  });

  const shipPathEntity = dataSource.entities.add({
    name: 'Starship Orbital Trajectory Path',
    polyline: {
      positions: new C.CallbackProperty(() => shipTrailPositions, false),
      width: 4.0,
      material: new C.PolylineGlowMaterialProperty({
        glowPower: 0.35,
        color: C.Color.fromCssColorString('#00ffff'), // Cyan orbital arc
      }),
    },
  });

  let activeCameraMode = 'AUTO_DIRECTOR';

  function update(telemetry) {
    const { booster, ship, mechazilla, missionTimeS } = telemetry;

    // Update Booster 3D Position
    const boosterCartesian = C.Cartesian3.fromDegrees(
      booster.longitude,
      booster.latitude,
      booster.altitudeM + 35.5 // center of 71m cylinder
    );
    boosterEntity.position = boosterCartesian;

    // Update Plume
    if (booster.activeEngines > 0 && booster.throttlePct > 0) {
      boosterPlume.show = true;
      const plumeLen = Math.max(15, (booster.throttlePct / 100) * 55);
      boosterPlume.cylinder.length = plumeLen;
      boosterPlume.cylinder.bottomRadius = Math.max(6, (booster.altitudeM / 8000) * 12 + 6);
      boosterPlume.position = C.Cartesian3.fromDegrees(
        booster.longitude,
        booster.latitude,
        Math.max(0, booster.altitudeM - plumeLen / 2)
      );
    } else {
      boosterPlume.show = false;
    }

    // Update Ship 3D Position
    const shipCartesian = C.Cartesian3.fromDegrees(
      ship.longitude,
      ship.latitude,
      ship.altitudeM + 25.0 // center of 50m cylinder
    );
    shipEntity.position = shipCartesian;

    // Update Chopsticks Clamp Animation
    const armAngle = mechazilla.chopstickAngleDeg;
    // Rotate / translate chopsticks inwards as angle decreases to 0 (catch clamp)
    const clampOffset = (armAngle / 45) * 0.00015;
    leftChopstick.position = C.Cartesian3.fromDegrees(
      STARBASE_LOCATION.towerLon + 0.00008 + clampOffset,
      STARBASE_LOCATION.towerLat,
      STARBASE_LOCATION.catchAltitudeM
    );
    rightChopstick.position = C.Cartesian3.fromDegrees(
      STARBASE_LOCATION.towerLon - 0.00008 - clampOffset,
      STARBASE_LOCATION.towerLat,
      STARBASE_LOCATION.catchAltitudeM
    );

    if (mechazilla.clampLocked) {
      leftChopstick.box.outlineColor = C.Color.fromCssColorString('#22c55e'); // Green locked
      rightChopstick.box.outlineColor = C.Color.fromCssColorString('#22c55e');
    } else if (mechazilla.pinContact) {
      leftChopstick.box.outlineColor = C.Color.fromCssColorString('#eab308'); // Yellow contact
      rightChopstick.box.outlineColor = C.Color.fromCssColorString('#eab308');
    } else {
      leftChopstick.box.outlineColor = C.Color.fromCssColorString('#38bdf8');
      rightChopstick.box.outlineColor = C.Color.fromCssColorString('#38bdf8');
    }

    // Update Starlink Satellites
    if (ship.starlinkDispensedCount > 0) {
      for (let i = 0; i < starlinkEntities.length; i++) {
        if (i < ship.starlinkDispensedCount) {
          starlinkEntities[i].show = true;
          // Satellites spread in orbital plane behind the ship
          const separationOffset = (ship.starlinkDispensedCount - i) * 0.08;
          starlinkEntities[i].position = C.Cartesian3.fromDegrees(
            ship.longitude - separationOffset,
            ship.latitude - separationOffset * 0.3,
            ship.altitudeM - i * 120
          );
        } else {
          starlinkEntities[i].show = false;
        }
      }
    }

    // Record trail positions (capped to 600 points)
    if (boosterTrailPositions.length < 600) {
      boosterTrailPositions.push(boosterCartesian);
    }
    if (shipTrailPositions.length < 600) {
      shipTrailPositions.push(shipCartesian);
    }

    // Camera Director Automation
    applyCameraMode(activeCameraMode, boosterCartesian, shipCartesian, telemetry);
  }

  function applyCameraMode(mode, boosterPos, shipPos, telemetry) {
    const cam = viewer.camera;
    if (mode === 'FREE_ORBIT') {
      // Free globe camera control
      return;
    }

    if (mode === 'AUTO_DIRECTOR') {
      const t = telemetry ? telemetry.missionTimeS : 0;
      if (t < 15) {
        // 1. Liftoff clearance looking across Mechazilla and ocean
        cam.lookAt(
          padPos,
          new C.HeadingPitchRange(
            C.Math.toRadians(35),
            C.Math.toRadians(18),
            680.0
          )
        );
      } else if (t < 160) {
        // 2. Transonic ascent tracking rocket with curved Earth backdrop
        cam.lookAt(
          boosterPos,
          new C.HeadingPitchRange(
            C.Math.toRadians(75),
            C.Math.toRadians(-22),
            Math.min(18000, 1200 + t * 90)
          )
        );
      } else if (t < 220) {
        // 3. Staging and boostback burn in upper atmosphere/space with blue globe curvature
        cam.lookAt(
          boosterPos,
          new C.HeadingPitchRange(
            C.Math.toRadians(240),
            C.Math.toRadians(-40),
            35000.0
          )
        );
      } else if (t < 405) {
        // 4. Supersonic re-entry descending toward Texas coast
        cam.lookAt(
          boosterPos,
          new C.HeadingPitchRange(
            C.Math.toRadians(190),
            C.Math.toRadians(-30),
            8500.0
          )
        );
      } else if (t < 415) {
        // 5. Landing burn deceleration flip
        cam.lookAt(
          boosterPos,
          new C.HeadingPitchRange(
            C.Math.toRadians(160),
            C.Math.toRadians(15),
            750.0
          )
        );
      } else {
        // 6. Mechazilla Chopsticks Catch secured on the stand!
        const towerCatchPos = C.Cartesian3.fromDegrees(
          STARBASE_LOCATION.towerLon,
          STARBASE_LOCATION.towerLat,
          STARBASE_LOCATION.catchAltitudeM
        );
        cam.lookAt(
          towerCatchPos,
          new C.HeadingPitchRange(
            C.Math.toRadians(65),
            C.Math.toRadians(32),
            190.0
          )
        );
      }
      return;
    }

    if (mode === 'TOWER_CAM') {
      // Look from ground pad viewing tower & booster
      cam.lookAt(
        padPos,
        new C.HeadingPitchRange(
          C.Math.toRadians(15),
          C.Math.toRadians(25),
          580.0
        )
      );
    } else if (mode === 'BOOSTER_ROCKETCAM') {
      // Attached to booster looking downward
      cam.lookAt(
        boosterPos,
        new C.HeadingPitchRange(
          C.Math.toRadians(180),
          C.Math.toRadians(-75),
          140.0
        )
      );
    } else if (mode === 'SHIP_EARTHCAM') {
      // Attached to Starship in orbit looking at Earth horizon curvature
      cam.lookAt(
        shipPos,
        new C.HeadingPitchRange(
          C.Math.toRadians(210),
          C.Math.toRadians(-35),
          320.0
        )
      );
    } else if (mode === 'CHOPSTICK_CAM') {
      // Mounted on Mechazilla chopsticks looking directly up at incoming booster
      const towerCatchPos = C.Cartesian3.fromDegrees(
        STARBASE_LOCATION.towerLon,
        STARBASE_LOCATION.towerLat,
        STARBASE_LOCATION.catchAltitudeM
      );
      cam.lookAt(
        towerCatchPos,
        new C.HeadingPitchRange(
          C.Math.toRadians(65),
          C.Math.toRadians(45),
          120.0
        )
      );
    } else if (mode === 'CHASE_DRONE_CAM') {
      // Aerial drone watching booster descent & catch
      const dronePos = C.Cartesian3.fromDegrees(
        STARBASE_LOCATION.longitude + 0.004,
        STARBASE_LOCATION.latitude + 0.003,
        280.0
      );
      cam.lookAt(
        boosterPos,
        new C.HeadingPitchRange(
          C.Math.toRadians(225),
          C.Math.toRadians(-20),
          650.0
        )
      );
    } else if (mode === 'ORBIT_VIEW') {
      // Global Earth orbital view
      cam.lookAt(
        shipPos,
        new C.HeadingPitchRange(
          C.Math.toRadians(0),
          C.Math.toRadians(-50),
          1800000.0 // 1,800 km orbital zoom
        )
      );
    }
  }

  function setCameraMode(mode) {
    activeCameraMode = mode;
    // Release any previous lock
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  }

  function destroy() {
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
    viewer.dataSources.remove(dataSource, true);
  }

  return {
    dataSource,
    update,
    setCameraMode,
    getCameraMode: () => activeCameraMode,
    destroy,
  };
}

