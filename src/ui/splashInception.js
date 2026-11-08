/**
 * Inception-style Cinematic Splash Screen for SpatialForge 3D
 * Features a dynamic, rotating planetary motion character backdrop,
 * Inception-inspired gravitational graticule curvature, and a
 * high-velocity SpaceX-style rocket launch and orbital flyoff.
 */

export function initInceptionSplash() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;

  // Keep splash open until operator finishes watching the Starship takeoff & catch emulation
  loadingScreen.dataset.keepSplash = 'true';

  // Enhance container styling
  loadingScreen.style.position = 'fixed';
  loadingScreen.style.inset = '0';
  loadingScreen.style.zIndex = '1000';
  loadingScreen.style.background = '#04070d';
  loadingScreen.style.overflow = 'hidden';

  // Create full-screen motion canvas
  let canvas = document.getElementById('splash-inception-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'splash-inception-canvas';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1';
    canvas.style.pointerEvents = 'none';
    loadingScreen.insertBefore(canvas, loadingScreen.firstChild);
  }

  // Adjust content overlay position and styling
  const content = loadingScreen.querySelector('.loader-content');
  if (content) {
    content.style.position = 'relative';
    content.style.zIndex = '10';
    content.style.textShadow = '0 0 20px rgba(0, 246, 255, 0.6), 0 4px 12px rgba(0,0,0,0.9)';
  }

  // Add telemetry ticker and launch button if not already present
  let telemetryBar = document.getElementById('splash-telemetry-bar');
  if (!telemetryBar && content) {
    telemetryBar = document.createElement('div');
    telemetryBar.id = 'splash-telemetry-bar';
    telemetryBar.style.marginTop = '24px';
    telemetryBar.style.fontFamily = '"JetBrains Mono", monospace';
    telemetryBar.style.fontSize = '12px';
    telemetryBar.style.letterSpacing = '0.15em';
    telemetryBar.style.color = '#38bdf8';
    telemetryBar.style.textTransform = 'uppercase';
    telemetryBar.innerHTML = `
      <div id="splash-telemetry-readout" style="margin-bottom: 12px; color: #00f6ff; opacity: 0.95; font-weight: 600; text-shadow: 0 0 10px rgba(0, 246, 255, 0.5);">
        TRAJECTORY: PRE-LAUNCH · STANDING ON OLM · 33 RAPTORS ARMED · DELUGE ACTIVE
      </div>
      <button id="splash-skip-btn" style="
        background: rgba(14, 165, 233, 0.18);
        border: 1px solid #00f6ff;
        color: #f8fafc;
        padding: 9px 28px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        box-shadow: 0 0 20px rgba(0, 246, 255, 0.3);
      ">ENGAGE SYSTEM ↗</button>
    `;
    content.appendChild(telemetryBar);

    const skipBtn = document.getElementById('splash-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('mouseenter', () => {
        skipBtn.style.background = '#0284c7';
        skipBtn.style.boxShadow = '0 0 28px rgba(0, 246, 255, 0.7)';
      });
      skipBtn.addEventListener('mouseleave', () => {
        skipBtn.style.background = 'rgba(14, 165, 233, 0.18)';
        skipBtn.style.boxShadow = '0 0 20px rgba(0, 246, 255, 0.3)';
      });
      skipBtn.addEventListener('click', () => {
        delete loadingScreen.dataset.keepSplash;
        loadingScreen.dispatchEvent(new CustomEvent('gev:dismiss-splash'));
        loadingScreen.classList.add('hidden');
      });
    }
  }

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const onResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  // Starfield generation
  const STARS_COUNT = 240;
  const stars = Array.from({ length: STARS_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.8 + 0.4,
    opacity: Math.random() * 0.7 + 0.3,
    twinkleSpeed: Math.random() * 0.03 + 0.01,
  }));

  // SpaceX Rocket State & Exhaust Particles
  const particles = [];
  let t = 0; // Flight timeline seconds
  const STARSHIP_CYCLE_SECONDS = 36; // Full take off and catch emulation cycle (>30s)

  // Starship takeoff and Mechazilla catch trajectory
  const getStarshipState = (time) => {
    const tCycle = (time % STARSHIP_CYCLE_SECONDS);
    const padX = width * 0.14;
    const padY = height * 0.76;

    let x = padX;
    let y = padY - 26;
    let angle = -Math.PI / 2; // Upright vertical
    let scale = 1.0;
    let throttle = 0;
    let engines = 33;
    let flameLen = 0;
    let statusText = '';
    let stageSeparated = false;
    let caught = false;
    let chopstickAngle = 40; // degrees

    if (tCycle < 4) {
      // Phase 1: Pre-Launch on OLM launch mount (0s - 4s)
      x = padX;
      y = padY - 26;
      angle = -Math.PI / 2;
      scale = 0.95;
      throttle = tCycle > 2 ? (tCycle - 2) * 50 : 0;
      flameLen = tCycle > 2 ? (tCycle - 2) * 16 : 0;
      statusText = 'PRE-LAUNCH · 33 RAPTORS ARMED · DELUGE ARMED · OLM BOCA CHICA';
      chopstickAngle = 40;
    } else if (tCycle < 12) {
      // Phase 2: Liftoff & Tower Clearance (4s - 12s)
      const p = (tCycle - 4) / 8;
      x = padX + Math.pow(p, 1.4) * (width * 0.32);
      y = (padY - 26) - Math.pow(p, 1.15) * (height * 0.50);
      angle = -Math.PI / 2 + p * (Math.PI / 3.2); // Pitching downrange over globe
      scale = 0.95 + p * 0.2;
      throttle = 100;
      flameLen = 45 + Math.sin(time * 30) * 8;
      statusText = `LIFTOFF · CLEARING MECHAZILLA TOWER · THRUST: 74.3 MN (100%) · ALT: ${(p * 35).toFixed(1)} KM`;
      chopstickAngle = 45;
    } else if (tCycle < 18) {
      // Phase 3: Max Q Transonic & Hot Staging (12s - 18s)
      const p = (tCycle - 12) / 6;
      x = padX + width * 0.32 + p * (width * 0.28);
      y = (padY - 26 - height * 0.50) - Math.sin(p * Math.PI * 0.5) * (height * 0.22);
      angle = -Math.PI / 2 + Math.PI / 3.2 + p * (Math.PI / 4);
      scale = 1.1;
      throttle = p < 0.6 ? 100 : 40;
      flameLen = p < 0.6 ? 48 : 18;
      stageSeparated = p > 0.5;
      statusText = `MAX Q TRANSONIC · HOT STAGING SEPARATION · MACH ${(3.8 + p * 3.2).toFixed(1)} · ALT: ${(35 + p * 42).toFixed(0)} KM`;
      chopstickAngle = 45;
    } else if (tCycle < 24) {
      // Phase 4: Boostback Burn (RTLS Reversal towards Starbase) (18s - 24s)
      const p = (tCycle - 18) / 6;
      x = padX + width * 0.60 - p * (width * 0.26);
      y = (padY - height * 0.72) + p * (height * 0.20);
      angle = Math.PI * 0.88; // Pointing back toward Starbase
      scale = 1.05;
      throttle = 90;
      flameLen = 42 + Math.sin(time * 35) * 6;
      stageSeparated = true;
      statusText = `BOOSTBACK BURN · RTLS REVERSAL · 13 RAPTORS FIRING · TARGET: BOCA CHICA`;
      chopstickAngle = 45;
    } else if (tCycle < 29) {
      // Phase 5: Supersonic Atmospheric Entry & Grid Fin Steering (24s - 29s)
      const p = (tCycle - 24) / 5;
      x = padX + width * 0.34 - p * (width * 0.31);
      y = (padY - height * 0.52) + p * (height * 0.38);
      angle = Math.PI * 0.60; // Nose up / engines first entry attitude
      scale = 1.0;
      throttle = 0;
      flameLen = 0;
      stageSeparated = true;
      statusText = `SUPERSONIC ENTRY · GRID FINS STEERING · VELOCITY: ${(2800 - p * 2200).toFixed(0)} KM/H`;
      chopstickAngle = 40 - p * 15; // Chopsticks open and tracking
    } else if (tCycle < 33) {
      // Phase 6: Terminal Landing Burn & Alignment (29s - 33s)
      const p = (tCycle - 29) / 4;
      x = padX + (1 - p) * 18;
      y = (padY - 80) + p * 54;
      angle = -Math.PI / 2; // Upright landing flip!
      scale = 1.0;
      throttle = 80 * (1 - p * 0.4);
      flameLen = 30 * (1 - p * 0.5);
      stageSeparated = true;
      statusText = `TERMINAL LANDING BURN · DECELERATION FLIP · ENTERING PIN ZONE HOVER`;
      chopstickAngle = 25 - p * 20; // Arms closing in
    } else if (tCycle < 35.5) {
      // Phase 7: Mechazilla Chopsticks Catch Secured on Stand! (33s - 35.5s)
      x = padX;
      y = padY - 26;
      angle = -Math.PI / 2;
      scale = 1.0;
      throttle = 0;
      flameLen = 0;
      stageSeparated = true;
      caught = true;
      chopstickAngle = 0; // Arms clamped shut!
      statusText = '[CATCH LOCKED] MECHAZILLA CHOPSTICKS CATCH CONFIRMED · SUPER HEAVY CAPTURED ON STAND';
    } else {
      // Phase 8: Triumph Hold & Seamless Cycle (35.5s - 36s)
      x = padX;
      y = padY - 26;
      angle = -Math.PI / 2;
      scale = 1.0;
      throttle = 0;
      flameLen = 0;
      stageSeparated = true;
      caught = true;
      chopstickAngle = 0;
      statusText = 'SPACEX FLIGHT 5/6 CATCH REPLAY COMPLETE · CYCLING EMULATION...';
    }

    return {
      x,
      y,
      angle,
      scale,
      throttle,
      flameLen,
      statusText,
      stageSeparated,
      caught,
      chopstickAngle,
      tCycle,
    };
  };

  let animationId = 0;
  let planetRotation = 0;

  const renderFrame = () => {
    if (loadingScreen.classList.contains('hidden') || loadingScreen.style.opacity === '0') {
      return; // Stop animation loop once dismissed
    }

    ctx.clearRect(0, 0, width, height);
    t += 0.016;
    planetRotation += 0.0015;

    // ── 1. Starfield Backdrop ───────────────────────────────────────────
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const alpha = s.opacity + Math.sin(t * 10 * s.twinkleSpeed) * 0.25;
      ctx.fillStyle = `rgba(240, 249, 255, ${Math.max(0.1, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 2. Inception Planetary Motion Character Backdrop ────────────────
    // Huge Earth curvature dominating the lower half of screen
    const globeCenterX = width * 0.5;
    const globeCenterY = height * 1.45;
    const globeRadius = Math.max(width * 0.75, height * 0.95);

    // Deep space atmospheric rim gradient
    const atmoGradient = ctx.createRadialGradient(
      globeCenterX,
      globeCenterY,
      globeRadius * 0.92,
      globeCenterX,
      globeCenterY,
      globeRadius * 1.18,
    );
    atmoGradient.addColorStop(0, '#0f172a');
    atmoGradient.addColorStop(0.3, '#0369a1');
    atmoGradient.addColorStop(0.55, '#00f6ff');
    atmoGradient.addColorStop(0.85, 'rgba(0, 246, 255, 0.15)');
    atmoGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = atmoGradient;
    ctx.beginPath();
    ctx.arc(globeCenterX, globeCenterY, globeRadius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    // Solid Earth sphere
    const earthGradient = ctx.createRadialGradient(
      globeCenterX,
      globeCenterY - globeRadius * 0.3,
      globeRadius * 0.1,
      globeCenterX,
      globeCenterY,
      globeRadius,
    );
    earthGradient.addColorStop(0, '#0c1b33');
    earthGradient.addColorStop(0.7, '#071120');
    earthGradient.addColorStop(1, '#020617');

    ctx.save();
    ctx.beginPath();
    ctx.arc(globeCenterX, globeCenterY, globeRadius, 0, Math.PI * 2);
    ctx.fillStyle = earthGradient;
    ctx.fill();
    ctx.clip(); // Clip planet surface features inside sphere

    // Inception Curvature Graticule: Rotating Latitude/Longitude Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1.5;
    for (let lat = -60; lat <= 60; lat += 20) {
      const latY = globeCenterY - Math.sin((lat * Math.PI) / 180) * globeRadius * 0.9;
      const latRx = Math.cos((lat * Math.PI) / 180) * globeRadius * 0.95;
      ctx.beginPath();
      ctx.ellipse(globeCenterX, latY, latRx, latRx * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const currentLon = lon + planetRotation * 50;
      const lonX = globeCenterX + Math.sin((currentLon * Math.PI) / 180) * globeRadius * 0.85;
      ctx.beginPath();
      ctx.ellipse(lonX, globeCenterY - globeRadius * 0.2, globeRadius * 0.25, globeRadius * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing city light clusters & continents rotating on night side
    for (let c = 0; c < 28; c++) {
      const angle = (c * 13 + planetRotation * 40) % 360;
      const rad = (angle * Math.PI) / 180;
      const cx = globeCenterX + Math.cos(rad) * (globeRadius * 0.78);
      const cy = globeCenterY - Math.abs(Math.sin(rad)) * (globeRadius * 0.72) + 30;

      if (cx > 0 && cx < width && cy > 0 && cy < height) {
        ctx.fillStyle = c % 2 === 0 ? 'rgba(0, 246, 255, 0.5)' : 'rgba(251, 191, 36, 0.65)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 + (c % 3), 0, Math.PI * 2);
        ctx.fill();

        // Radiating fiber links between nodes
        if (c > 0 && c % 3 === 0) {
          ctx.strokeStyle = 'rgba(0, 246, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx - 60, cy + 20);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // ── 3. Atmospheric Limb Halo & Horizon Flare ────────────────────────
    ctx.strokeStyle = '#00f6ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f6ff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(globeCenterX, globeCenterY, globeRadius, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset blur

    // ── 4. Starship Takeoff & Mechazilla Catch Emulation ─────────────────
    const rocket = getStarshipState(t);
    const padX = width * 0.14;
    const padY = height * 0.76;
    const towerX = padX + 26;
    const towerTopY = padY - 125;
    const catchLevelY = padY - 32;

    // Mechazilla Launch & Catch Tower Structure
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(towerX - 8, padY);
    ctx.lineTo(towerX - 6, towerTopY);
    ctx.lineTo(towerX + 6, towerTopY);
    ctx.lineTo(towerX + 8, padY);
    ctx.stroke();

    // Tower Cross-braces
    for (let ty = padY; ty > towerTopY; ty -= 14) {
      ctx.beginPath();
      ctx.moveTo(towerX - 7, ty);
      ctx.lineTo(towerX + 7, ty - 10);
      ctx.moveTo(towerX + 7, ty);
      ctx.lineTo(towerX - 7, ty - 10);
      ctx.stroke();
    }

    // Aviation Red Warning Beacon on Tower Apex
    const beaconBlink = Math.sin(t * 8) > 0;
    ctx.fillStyle = beaconBlink ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.arc(towerX, towerTopY - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Orbital Launch Mount (OLM)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#00f6ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(padX - 16, padY - 8, 32, 12, 3);
    ctx.fill();
    ctx.stroke();

    // Dual Articulated Mechazilla Chopstick Catch Arms
    const armSpread = (rocket.chopstickAngle / 45) * 20;
    ctx.strokeStyle = rocket.caught ? '#22c55e' : '#38bdf8';
    ctx.fillStyle = rocket.caught ? 'rgba(34, 197, 94, 0.35)' : 'rgba(14, 165, 233, 0.25)';
    ctx.lineWidth = 2.5;

    // Left Chopstick Arm
    ctx.beginPath();
    ctx.moveTo(towerX - 6, catchLevelY);
    ctx.lineTo(padX - armSpread, catchLevelY);
    ctx.lineTo(padX - armSpread, catchLevelY + 4);
    ctx.lineTo(towerX - 6, catchLevelY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Chopstick Arm
    ctx.beginPath();
    ctx.moveTo(towerX - 6, catchLevelY);
    ctx.lineTo(padX + armSpread, catchLevelY);
    ctx.lineTo(padX + armSpread, catchLevelY + 4);
    ctx.lineTo(towerX - 6, catchLevelY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Catch Confirmation Halo
    if (rocket.caught) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(padX, catchLevelY + 2, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Spawn exhaust flame & particle smoke when throttle > 0
    if (rocket.throttle > 0) {
      const exhaustX = rocket.x - Math.cos(rocket.angle) * (26 * rocket.scale);
      const exhaustY = rocket.y - Math.sin(rocket.angle) * (26 * rocket.scale);

      for (let p = 0; p < 4; p++) {
        const spread = (Math.random() - 0.5) * 0.35;
        const pSpeed = (Math.random() * 5 + 4) * rocket.scale;
        particles.push({
          x: exhaustX,
          y: exhaustY,
          vx: -Math.cos(rocket.angle + spread) * pSpeed,
          vy: -Math.sin(rocket.angle + spread) * pSpeed,
          life: 1.0,
          decay: Math.random() * 0.02 + 0.015,
          size: (Math.random() * 8 + 4) * rocket.scale,
          color: Math.random() > 0.4 ? '#00f6ff' : '#f97316',
        });
      }
    }

    // Update & draw rocket exhaust particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.size += 0.4;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color === '#00f6ff'
        ? `rgba(0, 246, 255, ${p.life * 0.8})`
        : `rgba(249, 115, 22, ${p.life * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Rocket Body & Aerodynamic Control Surfaces
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(rocket.angle);
    ctx.scale(rocket.scale, rocket.scale);

    // Supersonic Exhaust Plume (Raptor fire)
    if (rocket.flameLen > 0) {
      const flameGrad = ctx.createLinearGradient(-rocket.flameLen, 0, 0, 0);
      flameGrad.addColorStop(0, 'rgba(0, 246, 255, 0)');
      flameGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.85)');
      flameGrad.addColorStop(0.8, '#fbbf24');
      flameGrad.addColorStop(1, '#ffffff');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-rocket.flameLen, 0);
      ctx.lineTo(-18, -6);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fill();
    }

    // Rocket Hull (Super Heavy Stainless Steel 304L)
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = rocket.caught ? '#22c55e' : '#00f6ff';
    ctx.lineWidth = 1.5;

    // Main fuselage cylinder
    ctx.beginPath();
    ctx.moveTo(22, 0); // Nose apex
    ctx.lineTo(12, -6);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-18, 6);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thermal protection heat shield (Black dorsal tiles)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-16, -6, 26, 3);

    // Forward Grid Fins
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(4, -13);
    ctx.lineTo(0, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.lineTo(4, 13);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Aft Body Flaps
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-18, -16);
    ctx.lineTo(-18, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.lineTo(-18, 16);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // If stage separated, draw Starship Upper Stage continuing in orbit
    if (rocket.stageSeparated && !rocket.caught) {
      const shipX = width * 0.78 + Math.sin(t * 2) * 15;
      const shipY = height * 0.18 + Math.cos(t * 1.5) * 8;
      ctx.save();
      ctx.translate(shipX, shipY);
      ctx.rotate(Math.PI * 0.15);
      ctx.scale(0.85, 0.85);

      // Vacuum Raptor Cyan Flare
      const vFlame = ctx.createLinearGradient(-24, 0, 0, 0);
      vFlame.addColorStop(0, 'transparent');
      vFlame.addColorStop(1, '#00ffff');
      ctx.fillStyle = vFlame;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(-8, -4);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();

      // Ship body
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(4, -4);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-10, 4);
      ctx.lineTo(4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ship label
      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('STARSHIP 31 (LEO)', -10, -10);
      ctx.restore();
    }

    // ── 5. Real-Time Telemetry Readout Update ──────────────────────────
    const readout = document.getElementById('splash-telemetry-readout');
    if (readout) {
      readout.textContent = rocket.statusText;
    }

    animationId = requestAnimationFrame(renderFrame);
  };

  animationId = requestAnimationFrame(renderFrame);

  // Return cleanup hook
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    canvas?.remove();
  };
}

