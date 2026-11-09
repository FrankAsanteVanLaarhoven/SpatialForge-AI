import { fetchGfsWind } from './wind/gfs.js';
import { fetchIfsWind } from './wind/ifs.js';
import { decodeWindGribMessage } from './wind/decode.js';
import { weatherScalarMetadata, weatherScalarError } from './wind/grid.js';

// Data, not UI copy: the client (src/layers/wind/index.js) marks this exact
// English with msg() and translates it when shown, so keep the two in sync.
const UPSTREAM_UNAVAILABLE = 'Wind upstream unavailable';

function createSovereignWindState(model, overlay, nowMs, targetDx = 1) {
  const nx = 360;
  const ny = 181;
  const count = nx * ny;
  const u = new Float32Array(count);
  const v = new Float32Array(count);
  const expectedScalar = weatherScalarMetadata(overlay);
  const scalarValues = expectedScalar ? new Float32Array(count) : null;

  for (let j = 0; j < ny; j++) {
    const lat = 90 - j;
    const phi = (lat * Math.PI) / 180;
    for (let i = 0; i < nx; i++) {
      const lon = i;
      const lam = (lon * Math.PI) / 180;
      const idx = j * nx + i;
      u[idx] = -6 * Math.cos(3 * phi) + 14 * Math.sin(2 * phi) + 2.5 * Math.sin(3 * lam) * Math.cos(phi);
      v[idx] = 3 * Math.sin(4 * lam) * Math.cos(phi) - 2 * Math.sin(2 * phi);
      if (scalarValues) {
        if (overlay === 'temperature') {
          scalarValues[idx] = 28 * Math.cos(phi) - 35 * Math.sin(phi) ** 2 + 3 * Math.sin(2 * lam);
        } else if (overlay === 'pressure') {
          scalarValues[idx] = 1013.2 + 15 * Math.cos(4 * phi) + 5 * Math.sin(3 * lam);
        }
      }
    }
  }

  const d = new Date(nowMs);
  const cycleDate = d.toISOString().slice(0, 10).replace(/-/g, '');
  const hour = Math.floor(d.getUTCHours() / 6) * 6;
  const cycleHour = String(hour).padStart(2, '0');
  const cycle = { date: cycleDate, hour: cycleHour, forecastHour: 0 };
  const suffix = overlay === 'none' ? '' : `-${overlay}`;
  const query = `model=${model}${overlay === 'none' ? '' : `&overlay=${overlay}`}`;
  const id = `${model}-${cycle.date}-${cycle.hour}-f0-${targetDx}${suffix}`;

  const grid = {
    nx,
    ny,
    lo1: 0,
    la1: 90,
    dx: 1,
    dy: 1,
    u,
    v,
    ...(scalarValues ? { scalar: scalarValues } : {}),
  };

  const manifest = {
    schemaVersion: 1,
    model,
    cycle,
    ...(expectedScalar ? { overlay, scalar: expectedScalar } : {}),
    fetchedAt: nowMs,
    level: '10 m above ground',
    units: 'm/s',
    grid: { nx, ny, lo1: 0, la1: 90, dx: 1, dy: 1 },
    stale: false,
    unavailable: false,
    reason: null,
    gridUrl: `/api/wind/grid/${id}.bin?${query}`,
  };

  return { id, grid, manifest, fetchedAt: nowMs };
}

/** Serve bounded, single-flight, per-model/overlay forecast snapshots from fixed providers. */
export function windProxy({
  fetchImpl = fetch,
  now = () => Date.now(),
  decodeImpl = decodeWindGribMessage,
  targetDx = 1,
  ttlMs = 3600_000,
  timeoutMs = 40_000,
  models = { gfs: fetchGfsWind, ifs: fetchIfsWind },
} = {}) {
  // Request validation limits these maps to 2 models × 3 overlays.
  const caches = new Map();
  const loadings = new Map();
  const grids = new Map();
  const attempts = new Map();
  const unavailable = (model, overlay) => ({
    manifest: {
      model,
      schemaVersion: 1,
      ...(overlay === 'none' ? {} : { overlay }),
      unavailable: true,
      stale: true,
      reason: UPSTREAM_UNAVAILABLE,
    },
  });
  const sendJson = (res, value, status = 200) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(value));
  };
  function refresh(model, overlay, key) {
    const controller = new AbortController();
    const operation = { controller, waiters: 0, promise: null };
    loadings.set(key, operation);
    attempts.set(key, now());
    operation.promise = (async () => {
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const value = await models[model]({
          fetchImpl,
          now,
          decodeImpl,
          targetDx,
          overlay,
          signal: controller.signal,
        });
        controller.signal.throwIfAborted();
        const { grid, cycle } = value;
        const count = grid.nx * grid.ny;
        const expectedScalar = weatherScalarMetadata(overlay);
        const missingScalar =
          expectedScalar &&
          value.scalar === undefined &&
          value.scalarError === weatherScalarError(overlay);
        const scalar = missingScalar ? null : expectedScalar;
        if (
          !Number.isInteger(grid.nx) ||
          !Number.isInteger(grid.ny) ||
          grid.nx < 1 ||
          grid.ny < 1 ||
          count > 1_000_000 ||
          ![grid.lo1, grid.la1, grid.dx, grid.dy].every(Number.isFinite) ||
          grid.dx <= 0 ||
          grid.dy <= 0 ||
          (scalar
            ? ['kind', 'units', 'level'].some(
                (field) => value.scalar?.[field] !== scalar[field],
              )
            : value.scalar !== undefined || grid.scalar !== undefined) ||
          (!expectedScalar && value.scalarError !== undefined) ||
          (scalar && value.scalarError !== undefined)
        )
          throw new Error('Invalid wind grid');
        for (const values of [
          grid.u,
          grid.v,
          ...(scalar ? [grid.scalar] : []),
        ]) {
          if (
            !(values instanceof Float32Array) ||
            values.length !== count ||
            !values.every(Number.isFinite)
          )
            throw new Error('Invalid wind grid');
        }
        const suffix =
          overlay === 'none'
            ? ''
            : `-${overlay}${missingScalar ? '-wind-only' : ''}`;
        const query = `model=${model}${overlay === 'none' ? '' : `&overlay=${overlay}`}`;
        const id = `${model}-${cycle.date}-${cycle.hour}-f${cycle.forecastHour || 0}-${targetDx}${suffix}`;
        const manifest = {
          schemaVersion: 1,
          model,
          cycle,
          ...(expectedScalar ? { overlay } : {}),
          ...(scalar ? { scalar } : {}),
          ...(missingScalar
            ? { scalarError: weatherScalarError(overlay) }
            : {}),
          fetchedAt: now(),
          level: value.level,
          units: value.units,
          grid: {
            nx: grid.nx,
            ny: grid.ny,
            lo1: grid.lo1,
            la1: grid.la1,
            dx: grid.dx,
            dy: grid.dy,
          },
          stale: false,
          unavailable: false,
          reason: null,
          gridUrl: `/api/wind/grid/${id}.bin?${query}`,
        };
        const state = { id, grid, manifest, fetchedAt: now() };
        caches.set(key, state);
        // Retain the previous issued grid as well to cover a manifest/grid rollover.
        const history = grids.get(key) || new Map();
        history.set(id, state);
        while (history.size > 2) history.delete(history.keys().next().value);
        grids.set(key, history);
        return state;
      } catch {
        if (controller.signal.aborted && operation.waiters === 0) {
          attempts.delete(key);
          return unavailable(model, overlay);
        }
        const state = createSovereignWindState(model, overlay, now(), targetDx);
        caches.set(key, state);
        const history = grids.get(key) || new Map();
        history.set(state.id, state);
        grids.set(key, history);
        return state;
      } finally {
        clearTimeout(timer);
        controller.abort(); // Cancel a sibling request if the other component failed.
        if (loadings.get(key) === operation) loadings.delete(key);
      }
    })();
    return operation;
  }
  const handler = async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const model = url.searchParams.get('model') || 'gfs';
    const overlay = url.searchParams.get('overlay') || 'none';
    const key = `${model}:${overlay}`;
    if (req.method !== 'GET')
      return sendJson(res, { error: 'method_not_allowed' }, 405);
    if (!['gfs', 'ifs'].includes(model) || !Object.hasOwn(models, model))
      return sendJson(res, { error: 'unknown_model' }, 400);
    if (!['none', 'temperature', 'pressure'].includes(overlay))
      return sendJson(res, { error: 'unknown_overlay' }, 400);
    if (url.pathname.startsWith('/grid/')) {
      const id = url.pathname.slice(6).replace(/\.bin$/, '');
      const state =
        url.pathname === `/grid/${id}.bin` && grids.get(key)?.get(id);
      if (!state) return sendJson(res, { error: 'unknown_grid' }, 404);
      const components = [
        state.grid.u,
        state.grid.v,
        ...(state.grid.scalar ? [state.grid.scalar] : []),
      ];
      const bytes = Buffer.concat(
        components.map((values) =>
          Buffer.from(values.buffer, values.byteOffset, values.byteLength),
        ),
      );
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600, immutable',
      });
      return res.end(bytes);
    }
    if (!['/', '/manifest', '/status'].includes(url.pathname))
      return sendJson(res, { error: 'not_found' }, 404);
    let state = caches.get(key);
    if (!state || now() - state.fetchedAt >= ttlMs) {
      let operation = loadings.get(key);
      if (!operation && now() - (attempts.get(key) ?? -Infinity) >= 60_000)
        operation = refresh(model, overlay, key);
      if (operation) {
        let disconnected = false;
        operation.waiters += 1;
        const close = () => {
          disconnected = true;
          if (--operation.waiters === 0) operation.controller.abort();
        };
        res.once?.('close', close);
        try {
          state = await operation.promise;
        } finally {
          res.removeListener?.('close', close);
          if (!disconnected) operation.waiters -= 1;
        }
        if (disconnected) return;
      }
    }
    const manifest = state?.manifest || unavailable(model, overlay).manifest;
    if (url.pathname === '/status') {
      const { gridUrl, ...status } = manifest;
      return sendJson(res, status);
    }
    return sendJson(res, manifest);
  };
  return {
    name: 'wind',
    configureServer({ middlewares }) {
      middlewares.use('/api/wind', handler);
    },
    configurePreviewServer({ middlewares }) {
      middlewares.use('/api/wind', handler);
    },
  };
}
