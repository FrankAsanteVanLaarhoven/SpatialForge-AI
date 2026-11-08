/**
 * SpatialForge 3D // Precision Engineering Icons
 * Pure mathematical SVG vectors for enterprise aerospace and semiconductor HUDs.
 * Standardized on 24x24 viewBox with 1.5px or 2px crisp geometric strokes.
 * No AI artifacts, no casual emojis.
 */

export const SVG_ICONS = Object.freeze({
  // Integrated Circuit / Semiconductor Die
  chip: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6v6H9z" fill="currentColor" fill-opacity="0.2" />
      <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
    </svg>
  `,

  // Cleanroom / EUV Photolithography Chamber
  cleanroom: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M3 21h18M4 21V7l8-4 8 4v14" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v6M9 12h6" />
      <path d="M8 21v-4a4 4 0 0 1 8 0v4" />
    </svg>
  `,

  // 300mm Silicon Wafer with Die Array
  wafer: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-opacity="0.4" stroke-width="1.2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.25" />
    </svg>
  `,

  // 2.5D / 3D Advanced Packaging & Interposer
  package: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="m16.5 9.4 4.5-2.8L12 2 3 6.6l4.5 2.8" />
      <path d="M3 6.6v10.8L12 22l9-4.6V6.6" />
      <path d="m12 12 9-4.6M12 12v10M12 12 3 7.4" />
      <path d="m7.5 14.5 4.5 2.5 4.5-2.5" stroke-dasharray="2 2" />
    </svg>
  `,

  // Automated Test Equipment (ATE) / Oscilloscope Waveform
  test: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M4 12h3l2-5 4 10 3-7 2 2h2" />
    </svg>
  `,

  // Orbital Satellite Computer Node with Dual Solar Wings
  orbital: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <rect x="9" y="8" width="6" height="8" rx="1" fill="currentColor" fill-opacity="0.2" />
      <path d="M1 9h8v6H1zM15 9h8v6h-8z" />
      <path d="M5 9v6M19 9v6M12 3v5M12 16v5" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />
    </svg>
  `,

  // Coherent Optical Laser Intersatellite Link (ISL)
  laser: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="m13 2-2 10h5L11 22l2-10H8l5-10z" />
    </svg>
  `,

  // High-Voltage Electrical Power Grid / Transformer Substation
  power: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M12 2v20M5 7l7-5 7 5M4 14l8-4 8 4M2 21l10-4 10 4" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    </svg>
  `,

  // Steerable Phased Array Antenna / Dish
  antenna: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M4 17a9 9 0 0 1 16 0" />
      <path d="M7 17a6 6 0 0 1 10 0" />
      <path d="M10 17a3 3 0 0 1 4 0" />
      <path d="M12 17v5M8 22h8" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
    </svg>
  `,

  // Mechazilla Catch Tower Arms
  chopstick: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M4 22V2h3v20M4 7h16M4 14h16M7 4l12 6M7 11l12 6M17 7v4M17 14v4" />
    </svg>
  `,

  // Enterprise Headquarters / Facility
  business: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  `,

  // Maritime Ocean Vessel
  maritime: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M2 19c2 1 4 1 6 0s4-1 6 0 4 1 6 0M4 15l2-8h12l2 8H4z" />
      <path d="M12 7V3M9 5h6" />
    </svg>
  `,

  // Aviation Transonic Aircraft
  aviation: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.3-1.8 1.1l-.2.8 5 4.5-3 3-2.3-.5c-.4-.1-.8.1-1 .5l-.3.6 2.5 1.5 1.5 2.5.6-.3c.4-.2.6-.6.5-1l-.5-2.3 3-3 4.5 5 .8-.2c.8-.2 1.3-1 1.1-1.8z" />
    </svg>
  `,

  // Direct-to-Cell Cellular Mesh
  cellular: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" stroke-width="2.5" />
      <path d="M2 8a13 13 0 0 1 20 0M5 5a18 18 0 0 1 14 0" stroke-dasharray="2 2" />
    </svg>
  `,

  // Tactical Vector 45-degree Arrow
  vectorArrow: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  `,

  // Verified Engineering Checkmark
  check: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  `,

  // Tactical Alert Triangle
  alert: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" stroke-width="2.2" />
    </svg>
  `,

  // Tactical Cross / Close Button
  close: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  `,

  // Cinematic / Full View
  cinematic: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <rect x="2" y="2" width="20" height="20" rx="2.18" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
    </svg>
  `,

  // Metrics / Graph HUD
  metrics: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
    </svg>
  `,

  // Speed / Clock Waveform
  speed: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  `,

  // Loop / Re-Flight Turnaround
  loop: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="m21 7-4-4-4 4" />
      <path d="M3 11a9 9 0 0 1 14-6.5L21 7M3 17l4 4 4-4" />
      <path d="M21 13a9 9 0 0 1-14 6.5L3 17" />
    </svg>
  `,

  // Search / Fly-To
  search: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  `,

  // Live Camera / Optical Aperture
  camera: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="eng-icon">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  `
});

/**
 * Helper to render an SVG icon safely
 */
export function getEngIcon(name) {
  return SVG_ICONS[name] || SVG_ICONS.chip;
}

