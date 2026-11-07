/**
 * SpatialForge AI — Sovereign Draggable Dashboard Layout Engine
 * Provides multi-touch & pointer drag-and-drop repositioning, viewport boundary clamping,
 * and persistent layout serialization in localStorage.
 */

const STORAGE_KEY = 'spatialforge_dashboard_layout_v2';

/**
 * Retrieves saved dashboard positions from localStorage.
 * @returns {Record<string, { x: number, y: number }>}
 */
export function loadDashboardLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[DashboardLayout] Failed to read stored layout:', err);
    return {};
  }
}

/**
 * Saves current panel positions to localStorage.
 * @param {Record<string, { x: number, y: number }>} layout
 */
export function saveDashboardLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (err) {
    console.warn('[DashboardLayout] Failed to save layout:', err);
  }
}

/**
 * Resets all panel positions to canonical default layout and clears stored positions.
 */
export function resetDashboardLayout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('gev:dashboard-layout-reset'));
  } catch (err) {
    console.warn('[DashboardLayout] Failed to reset layout:', err);
  }
}

/**
 * Initializes drag-and-drop functionality on a target panel DOM element.
 * 
 * @param {HTMLElement} panelEl - The root panel element to reposition.
 * @param {HTMLElement} handleEl - The drag handle element (e.g. title bar or grip).
 * @param {string} panelId - Unique identifier for persistence.
 * @param {{ x: number, y: number }} [defaultPos] - Optional default initial coordinates.
 * @returns {() => void} Teardown cleanup function.
 */
export function makeDraggable(panelEl, handleEl, panelId, defaultPos = { x: 20, y: 80 }) {
  if (!panelEl || !handleEl) return () => {};

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentX = defaultPos.x;
  let currentY = defaultPos.y;

  // Restore saved coordinates if present
  const saved = loadDashboardLayout();
  if (saved[panelId] && typeof saved[panelId].x === 'number') {
    currentX = saved[panelId].x;
    currentY = saved[panelId].y;
  }

  // Apply styling
  panelEl.style.position = 'fixed';
  panelEl.style.left = `${currentX}px`;
  panelEl.style.top = `${currentY}px`;
  panelEl.style.margin = '0';
  panelEl.style.zIndex = '1500';
  handleEl.style.cursor = 'grab';
  handleEl.setAttribute('title', 'Click and drag to customize dashboard position');

  function clampToViewport(x, y) {
    const rect = panelEl.getBoundingClientRect();
    const minX = 10;
    const minY = 50;
    const maxX = Math.max(minX, window.innerWidth - (rect.width || 340) - 10);
    const maxY = Math.max(minY, window.innerHeight - 60);

    return {
      x: Math.min(Math.max(minX, x), maxX),
      y: Math.min(Math.max(minY, y), maxY)
    };
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const rawX = e.clientX - startX;
    const rawY = e.clientY - startY;
    const clamped = clampToViewport(rawX, rawY);

    currentX = clamped.x;
    currentY = clamped.y;

    panelEl.style.left = `${currentX}px`;
    panelEl.style.top = `${currentY}px`;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    try {
      if (e.pointerId !== undefined && handleEl.hasPointerCapture?.(e.pointerId)) {
        handleEl.releasePointerCapture(e.pointerId);
      }
    } catch {}

    handleEl.style.cursor = 'grab';
    panelEl.classList.remove('panel-dragging');
    panelEl.style.zIndex = '1500';

    // Persist new coordinates
    const layout = loadDashboardLayout();
    layout[panelId] = { x: currentX, y: currentY };
    saveDashboardLayout(layout);

    window.dispatchEvent(new CustomEvent('gev:dashboard-panel-moved', {
      detail: { panelId, x: currentX, y: currentY }
    }));
  }

  function onPointerDown(e) {
    // Only drag with primary mouse button or touch
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    // Don't drag if clicking buttons, inputs or links inside handle
    if (e.target?.closest?.('button, input, select, a, .no-drag')) return;

    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;

    try {
      if (e.pointerId !== undefined && handleEl.setPointerCapture) {
        handleEl.setPointerCapture(e.pointerId);
      }
    } catch {}

    handleEl.style.cursor = 'grabbing';
    panelEl.classList.add('panel-dragging');
    panelEl.style.zIndex = '2100';

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    e.preventDefault?.();
  }

  function onLayoutReset() {
    currentX = defaultPos.x;
    currentY = defaultPos.y;
    panelEl.style.left = `${currentX}px`;
    panelEl.style.top = `${currentY}px`;
  }

  handleEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('gev:dashboard-layout-reset', onLayoutReset);

  return () => {
    handleEl.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('gev:dashboard-layout-reset', onLayoutReset);
  };
}
