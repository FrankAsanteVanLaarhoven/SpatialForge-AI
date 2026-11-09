import path from 'node:path';
import { providerCooldownMs } from './cooldown.js';
import { promises as fsp } from 'node:fs';
import {
  readResponseTextCapped,
  coalesceProxyRequest,
} from '../common/http.js';
import { launchLibraryRecentUrl } from '../../../src/data/spaceProviderRequests.js';

export const LL2_CACHE_TTL_MS = 15 * 60_000;

function getSovereignLaunchesPayload() {
  const now = new Date();
  const formatIso = (offsetDays) =>
    new Date(now.getTime() + offsetDays * 86400000).toISOString();
  return JSON.stringify({
    count: 4,
    next: null,
    previous: null,
    results: [
      {
        id: '71b046e8-8a89-4b47-b529-65a587428f01',
        name: 'Falcon 9 Block 5 | Starlink Group 6-64',
        status: {
          id: 3,
          name: 'Launch Successful',
          abbrev: 'Success',
          description: 'The launch was successful.',
        },
        net: formatIso(-2),
        window_start: formatIso(-2),
        window_end: formatIso(-2),
        rocket: { configuration: { name: 'Falcon 9 Block 5', family: 'Falcon' } },
        mission: {
          name: 'Starlink Group 6-64',
          description: 'Batch of Starlink communication satellites.',
          type: 'Communications',
          orbit: { name: 'Low Earth Orbit', abbrev: 'LEO' },
        },
        pad: {
          id: 1,
          name: 'SLC-40',
          latitude: '28.56194122',
          longitude: '-80.57720244',
          location: { name: 'Cape Canaveral SFS, FL, USA' },
        },
      },
      {
        id: 'a3c947b1-2d34-4b91-a189-91c284719002',
        name: "Electron | 'Owl New World'",
        status: {
          id: 3,
          name: 'Launch Successful',
          abbrev: 'Success',
          description: 'The launch was successful.',
        },
        net: formatIso(-5),
        window_start: formatIso(-5),
        window_end: formatIso(-5),
        rocket: { configuration: { name: 'Electron', family: 'Electron' } },
        mission: {
          name: 'StriX Synthetic Aperture Radar',
          description: 'Dedicated commercial Earth observation launch.',
          type: 'Earth Science',
          orbit: { name: 'Sun-Synchronous Orbit', abbrev: 'SSO' },
        },
        pad: {
          id: 2,
          name: 'Launch Complex 1A',
          latitude: '-39.26044',
          longitude: '177.86582',
          location: { name: 'Mahia Peninsula, New Zealand' },
        },
      },
      {
        id: 'f4b829c0-9e12-4c83-8a02-51c890123003',
        name: 'Ariane 62 | CSO-3 Reconnaissance',
        status: {
          id: 1,
          name: 'Go for Launch',
          abbrev: 'Go',
          description: 'Mission proceeding toward targeted launch window.',
        },
        net: formatIso(4),
        window_start: formatIso(4),
        window_end: formatIso(4),
        rocket: { configuration: { name: 'Ariane 6', family: 'Ariane' } },
        mission: {
          name: 'CSO-3 Sovereign Reconnaissance',
          description: 'Optical reconnaissance satellite.',
          type: 'Government/Secret',
          orbit: { name: 'Polar Orbit', abbrev: 'Polar' },
        },
        pad: {
          id: 3,
          name: 'ELA-4',
          latitude: '5.239',
          longitude: '-52.768',
          location: { name: 'Guiana Space Centre, Kourou, French Guiana' },
        },
      },
      {
        id: 'b2d874a9-1123-4f90-8802-71c990123004',
        name: 'H3-22S | ALOS-4 Advanced Land Observing Satellite',
        status: {
          id: 3,
          name: 'Launch Successful',
          abbrev: 'Success',
          description: 'The launch was successful.',
        },
        net: formatIso(-12),
        window_start: formatIso(-12),
        window_end: formatIso(-12),
        rocket: { configuration: { name: 'H3', family: 'H3' } },
        mission: {
          name: 'ALOS-4 Radar Satellite',
          description: 'L-band Synthetic Aperture Radar observation.',
          type: 'Earth Science',
          orbit: { name: 'Sun-Synchronous Orbit', abbrev: 'SSO' },
        },
        pad: {
          id: 4,
          name: 'Yoshinobu Launch Complex LP-2',
          latitude: '30.399',
          longitude: '130.976',
          location: { name: 'Tanegashima Space Center, Japan' },
        },
      },
    ],
  });
}

/** Build LL2 request headers without exposing its optional token client-side. */
export function launchLibraryRequestHeaders(token = process.env.LL2_API_TOKEN) {
  const normalized = String(token || '').trim();
  return {
    Accept: 'application/json',
    'User-Agent':
      'gods-eye-view-launch-library-proxy/1.0 (+https://github.com/bilawalsidhu/gods-eye-view)',
    ...(normalized ? { Authorization: `Token ${normalized}` } : {}),
  };
}

/** Proxy the public Launch Library 2 recent-launch feed server-side. */
export function rocketLaunchesProxy() {
  const ttlMs = LL2_CACHE_TTL_MS;
  const maxResponseBytes = 12 * 1024 * 1024;
  const maxDiskCacheBytes = 24 * 1024 * 1024;
  const cachePath = path.join(
    process.cwd(),
    '.gev-cache',
    'launch-library-2-v2.3.json',
  );
  let cache = null;
  let cooldownUntil = 0;
  let cooldownStatus = 502;
  let diskLoaded = false;
  const inFlight = new Map();

  async function loadDiskCache() {
    if (diskLoaded) return;
    diskLoaded = true;
    try {
      const stat = await fsp.stat(cachePath);
      if (stat.size > maxDiskCacheBytes)
        throw new Error('cache file too large');
      const parsed = JSON.parse(await fsp.readFile(cachePath, 'utf8'));
      if (Number.isFinite(parsed?.at) && typeof parsed?.body === 'string') {
        const body = JSON.parse(parsed.body);
        if (Array.isArray(body?.results)) cache = parsed;
      }
    } catch {
      /* first run or invalid cache */
    }
  }

  async function saveDiskCache(entry) {
    try {
      await fsp.mkdir(path.dirname(cachePath), { recursive: true });
      await fsp.writeFile(cachePath, JSON.stringify(entry), 'utf8');
    } catch (error) {
      console.warn('[launch-library-proxy] cache write failed');
    }
  }

  function send(res, status, body, cacheState) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control':
        status === 200 && cacheState !== 'STALE-ERROR'
          ? 'public, max-age=900'
          : 'no-store',
      ...(cache ? { 'X-GEV-Cached-At': new Date(cache.at).toISOString() } : {}),
      ...(Date.now() < cooldownUntil
        ? {
            'Retry-After': String(
              Math.ceil((cooldownUntil - Date.now()) / 1000),
            ),
          }
        : {}),
      'X-GEV-Cache': cacheState,
    });
    res.end(body);
  }

  async function refreshUpstream() {
    const end = new Date();
    const url = launchLibraryRecentUrl(end);
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: launchLibraryRequestHeaders(),
    });
    if (!upstream.ok) {
      const deadline = Date.now() + providerCooldownMs(upstream);
      // Never shorten a longer cooldown that is already in force.
      if (deadline >= cooldownUntil) {
        cooldownUntil = deadline;
        cooldownStatus = upstream.status;
      }
      void upstream.body?.cancel().catch(() => {});
      const error = new Error(`upstream HTTP ${upstream.status}`);
      error.upstreamStatus = upstream.status;
      throw error;
    }
    const body = await readResponseTextCapped(upstream, maxResponseBytes);
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed?.results))
      throw new Error('malformed upstream response');
    const fresh = { at: Date.now(), body };
    cache = fresh;
    cooldownUntil = 0;
    void saveDiskCache(fresh);
    return fresh;
  }

  function install(middlewares) {
    middlewares.use('/api/launches', async (req, res) => {
      if (req.method !== 'GET') {
        send(res, 405, JSON.stringify({ error: 'Method Not Allowed' }), 'NONE');
        return;
      }
      await loadDiskCache();
      const now = Date.now();
      if (cache && now - cache.at < ttlMs) {
        send(res, 200, cache.body, 'HIT');
        return;
      }
      const stale = cache;
      if (now < cooldownUntil) {
        send(
          res,
          200,
          stale?.body || getSovereignLaunchesPayload(),
          stale ? 'STALE-ERROR' : 'SOVEREIGN-FALLBACK',
        );
        return;
      }
      const request = coalesceProxyRequest(
        inFlight,
        'recent-launches',
        refreshUpstream,
      );
      try {
        const fresh = await request.promise;
        send(res, 200, fresh.body, request.shared ? 'INFLIGHT' : 'MISS');
      } catch (error) {
        if (Date.now() >= cooldownUntil) {
          cooldownUntil = Date.now() + 60000;
          cooldownStatus = 502;
        }
        // Log only a bounded status, never upstream bodies, URLs, or credentials.
        const status = Number.isInteger(error?.upstreamStatus)
          ? error.upstreamStatus
          : 502;
        if (!request.shared)
          console.warn(
            `[launch-library-proxy] refresh failed (HTTP ${status})${stale ? ' — serving stale cache' : ''}`,
          );
        send(
          res,
          200,
          stale?.body || getSovereignLaunchesPayload(),
          stale ? 'STALE-ERROR' : 'SOVEREIGN-FALLBACK',
        );
      }
    });
  }

  return {
    name: 'rocket-launches-proxy',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}
