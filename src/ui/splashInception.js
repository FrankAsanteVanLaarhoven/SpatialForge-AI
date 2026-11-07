/**
 * Inception-style Cinematic Splash Screen for SpatialForge 3D
 * Features a dynamic, rotating planetary motion character backdrop,
 * Inception-inspired gravitational graticule curvature, and a
 * high-velocity SpaceX-style rocket launch and orbital flyoff.
 */

export function initInceptionSplash() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;

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
      <div id="splash-telemetry-readout" style="margin-bottom: 12px; color: #00f6ff; opacity: 0.9;">
        TRAJECTORY: ORBITAL INSERTION · VELOCITY: MACH 18.4 · ALTITUDE: 142 KM
      </div>
      <button id="splash-skip-btn" style="
        background: rgba(14, 165, 233, 0.15);
        border: 1px solid #00f6ff;
        color: #f8fafc;
        padding: 8px 24px;
        font-family: inherit;
        font-size: 11px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        box-shadow: 0 0 15px rgba(0, 246, 255, 0.25);
      ">ENGAGE SYSTEM</button>
    `;
    content.appendChild(telemetryBar);

    const skipBtn = document.getElementById('splash-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('mouseenter', () => {
        skipBtn.style.background = '#0284c7';
        skipBtn.style.boxShadow = '0 0 25px rgba(0, 246, 255, 0.6)';
      });
      skipBtn.addEventListener('mouseleave', () => {
        skipBtn.style.background = 'rgba(14, 165, 233, 0.15)';
        skipBtn.style.boxShadow = '0 0 15px rgba(0, 246, 255, 0.25)';
      });
      skipBtn.addEventListener('click', () => {
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

  // Rocket trajectory parameterization
  const getRocketState = (time) => {
    // Loop trajectory every 14 seconds
    const phase = (time % 14) / 14;
    // Curved gravity-turn path: starts off-screen bottom-left, ascends over globe, pitches over, accelerates past camera
    const ease = Math.pow(phase, 1.6);
    const startX = width * 0.12;
    const startY = height * 0.95;
    const peakX = width * 0.52;
    const peakY = height * 0.38;
    const endX = width * 1.15;
    const endY = height * -0.15;

    // Bezier position
    const u = 1 - phase;
    const x = u * u * startX + 2 * u * phase * peakX + phase * phase * endX;
    const y = u * u * startY + 2 * u * phase * peakY + phase * phase * endY;

    // Velocity / angle
    const dx = 2 * u * (peakX - startX) + 2 * phase * (endX - peakX);
    const dy = 2 * u * (peakY - startY) + 2 * phase * (endY - peakY);
    const angle = Math.atan2(dy, dx);
    const scale = 0.5 + phase * 1.3; // Rocket grows as it flies past camera
    const speed = Math.hypot(dx, dy);

    return { x, y, angle, scale, phase, speed };
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

    // ── 4. SpaceX Shuttle Launch & Orbital Flyoff ───────────────────────
    const rocket = getRocketState(t);

    // Spawn exhaust flame & particle smoke
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

    // Supersonic Exhaust Plume (Shock Diamonds)
    const flameGrad = ctx.createLinearGradient(-35, 0, 0, 0);
    flameGrad.addColorStop(0, 'rgba(0, 246, 255, 0)');
    flameGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)');
    flameGrad.addColorStop(0.8, '#fbbf24');
    flameGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-45, 0);
    ctx.lineTo(-20, -5);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-20, 5);
    ctx.closePath();
    ctx.fill();

    // Rocket Hull (Sleek Starship / Falcon 9 Profile)
    ctx.fillStyle = '#f8fafc'; // Stainless steel hull
    ctx.strokeStyle = '#00f6ff';
    ctx.lineWidth = 1.5;

    // Main fuselage cylinder
    ctx.beginPath();
    ctx.moveTo(22, 0); // Nose cone apex
    ctx.lineTo(12, -6);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-18, 6);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thermal protection heat shield (Black dorsal strip)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-16, -6, 26, 3);

    // Forward Aerodynamic Canards / Grid Fins
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

    // Aft Delta Wings / Aerodynamic Body Flaps
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

    // Anamorphic Lens Flare streak when rocket accelerates across center screen
    if (rocket.phase > 0.45 && rocket.phase < 0.85) {
      const flareAlpha = Math.sin((rocket.phase - 0.45) / 0.4 * Math.PI) * 0.7;
      ctx.fillStyle = `rgba(0, 246, 255, ${flareAlpha})`;
      ctx.fillRect(-180, -1, 360, 2); // Horizontal anamorphic streak
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${flareAlpha * 0.85})`;
      ctx.fill();
    }

    ctx.restore();

    // ── 5. Real-Time Telemetry Readout Update ──────────────────────────
    const readout = document.getElementById('splash-telemetry-readout');
    if (readout) {
      const mach = (12.4 + rocket.phase * 15).toFixed(1);
      const alt = (45 + rocket.phase * 190).toFixed(0);
      const vel = (3.2 + rocket.phase * 4.6).toFixed(2);
      readout.textContent = `TRAJECTORY: ORBITAL INSERTION · VELOCITY: ${vel} KM/S (MACH ${mach}) · ALTITUDE: ${alt} KM`;
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

