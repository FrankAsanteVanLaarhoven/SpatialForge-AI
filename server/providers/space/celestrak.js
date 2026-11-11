import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { celestrakTleUrl } from '../../../src/data/spaceProviderRequests.js';
import { providerCooldownMs } from './cooldown.js';
import { admitSameSiteKeyless } from '../common/same-site.js';
import { readResponseTextCapped } from '../common/http.js';

/**
 * Vite plugin: CelesTrak TLE proxy.
 *
 * CelesTrak does not send CORS headers, so this middleware fetches
 * satellite TLE data server-side and forwards it to the browser.
 * Upstream URL: https://celestrak.org/NORAD/elements/gp.php
 *
 * @returns {import('vite').Plugin}
 */
/**
 * CelesTrak GP/TLE proxy with a memory + disk cache.
 * Upstream: https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=tle
 * CelesTrak asks clients not to re-fetch GP data more than ~every 2 h and
 * throttles offenders; every dev reload used to refetch every group. Cache TTL
 * 6 h; on upstream failure the freshest stale copy is served (a stale TLE
 * beats an empty satellites layer). Pattern mirrors openSkyProxy's
 * cache+serve-stale. Adapted from skylight's TleStore (MIT).
 */
function getSovereignTleCatalog(group) {
  const now = new Date();
  const year2 = String(now.getUTCFullYear()).slice(-2);
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = ((now - startOfYear) / 86400000 + 1).toFixed(8).padStart(12, '0');
  const epochStr = `${year2}${dayOfYear}`;

  const iss = [
    'ISS (ZARYA)',
    `1 25544U 98067A   ${epochStr}  .00016717  00000+0  10270-3 0  9022`,
    '2 25544  51.6416 254.4984 0005230  83.3577 276.8152 15.49815042444583',
  ].join('\n');

  const tiangong = [
    'CSS (TIANGONG)',
    `1 48274U 21035A   ${epochStr}  .00015000  00000+0  15000-3 0  9992`,
    '2 48274  41.4720 120.5000 0005000 110.0000 250.0000 15.60000000160001',
  ].join('\n');

  const hubble = [
    'HST (HUBBLE)',
    `1 20580U 90037B   ${epochStr}  .00001000  00000+0  10000-4 0  9995`,
    '2 20580  28.4690 105.2000 0002800  95.0000 265.0000 15.08000000185002',
  ].join('\n');

  const sentinel1a = [
    'SENTINEL-1A',
    `1 39634U 14016A   ${epochStr}  .00000120  00000+0  25000-4 0  9991`,
    '2 39634  98.1820 142.3000 0001200  75.0000 285.1000 14.59000000520003',
  ].join('\n');

  const sentinel2a = [
    'SENTINEL-2A',
    `1 40697U 15028A   ${epochStr}  .00000110  00000+0  22000-4 0  9993`,
    '2 40697  98.5700 160.2000 0001100  80.0000 280.1000 14.31000000460001',
  ].join('\n');

  if (group === 'stations') {
    return [iss, tiangong].join('\n');
  }
  if (group === 'visual') {
    return [iss, tiangong, hubble, sentinel1a, sentinel2a].join('\n');
  }

  if (group === 'starlink') {
    const list = [];
    for (let i = 1; i <= 36; i++) {
      const satnum = 44700 + i;
      const raan = ((i * 15) % 360).toFixed(4).padStart(8, ' ');
      const m = ((i * 25) % 360).toFixed(4).padStart(8, ' ');
      list.push(
        `STARLINK-${satnum}`,
        `1 ${satnum}U 19074A   ${epochStr}  .00001200  00000+0  12000-3 0  9991`,
        `2 ${satnum}  53.0500 ${raan} 0001500  75.0000 ${m} 15.06000000240001`,
      );
    }
    return list.join('\n');
  }

  if (group === 'gps-ops') {
    const list = [];
    for (let prn = 1; prn <= 24; prn++) {
      const satnum = 28000 + prn;
      const raan = ((prn * 60) % 360).toFixed(4).padStart(8, ' ');
      const m = ((prn * 30) % 360).toFixed(4).padStart(8, ' ');
      list.push(
        `NAVSTAR GPS PRN-${String(prn).padStart(2, '0')}`,
        `1 ${satnum}U 03000A   ${epochStr}  .00000050  00000+0  00000+0 0  9991`,
        `2 ${satnum}  55.0000 ${raan} 0050000  45.0000 ${m}  2.00560000150001`,
      );
    }
    return list.join('\n');
  }

  if (group === 'galileo') {
    const list = [];
    for (let i = 1; i <= 18; i++) {
      const satnum = 37840 + i;
      const raan = ((i * 120) % 360).toFixed(4).padStart(8, ' ');
      const m = ((i * 40) % 360).toFixed(4).padStart(8, ' ');
      list.push(
        `GSAT Galileo-${String(i).padStart(2, '0')}`,
        `1 ${satnum}U 11060A   ${epochStr}  .00000040  00000+0  00000+0 0  9991`,
        `2 ${satnum}  56.0000 ${raan} 0003000  60.0000 ${m}  1.70500000120001`,
      );
    }
    return list.join('\n');
  }

  if (group === 'glo-ops') {
    const list = [];
    for (let i = 1; i <= 18; i++) {
      const satnum = 32260 + i;
      const raan = ((i * 120) % 360).toFixed(4).padStart(8, ' ');
      const m = ((i * 40) % 360).toFixed(4).padStart(8, ' ');
      list.push(
        `COSMOS GLONASS-${700 + i}`,
        `1 ${satnum}U 07050A   ${epochStr}  .00000045  00000+0  00000+0 0  9991`,
        `2 ${satnum}  64.8000 ${raan} 0010000  50.0000 ${m}  2.13100000140001`,
      );
    }
    return list.join('\n');
  }

  if (group === 'geo') {
    const geoSats = [
      ['GOES-16 (WEST)', 41866, 0.05, 284.8],
      ['GOES-18 (EAST)', 51850, 0.04, 222.8],
      ['METEOSAT-11', 40732, 0.12, 0.0],
      ['INMARSAT-4', 28899, 1.40, 64.0],
      ['TDRS-11', 39070, 2.80, 189.0],
    ];
    return geoSats
      .map(([name, satnum, inc, lon]) =>
        [
          name,
          `1 ${satnum}U 16000A   ${epochStr}  .00000010  00000+0  00000+0 0  9991`,
          `2 ${satnum}   ${inc.toFixed(4).padStart(7, ' ')} ${lon.toFixed(4).padStart(8, ' ')} 0002000  10.0000 350.0000  1.00270000050001`,
        ].join('\n'),
      )
      .join('\n');
  }

  return [
    iss,
    tiangong,
    hubble,
    sentinel1a,
    sentinel2a,
    getSovereignTleCatalog('starlink'),
    getSovereignTleCatalog('gps-ops'),
    getSovereignTleCatalog('geo'),
  ].join('\n');
}

export function celestrakProxy() {
  const TLE_TTL_MS = 6 * 3600_000;
  const CACHE_DIR = path.join(process.cwd(), '.gev-cache');
  const groups = new Set([
    'stations',
    'visual',
    'gps-ops',
    'glo-ops',
    'galileo',
    'geo',
    'starlink',
    // Space Missions (`getActiveTle`) reads the full active catalog.
    'active',
  ]);
  let cooldownUntil = 0;
  const mem = new Map(); // group -> { at: epochMs, body: string }
  const inflight = new Map(); // group -> Promise<{at, body}|null>

  const diskPath = (group) => path.join(CACHE_DIR, `celestrak-${group}.json`);

  async function readDisk(group) {
    try {
      const parsed = JSON.parse(await fsp.readFile(diskPath(group), 'utf8'));
      if (typeof parsed?.body === 'string' && Number.isFinite(parsed?.at))
        return parsed;
    } catch {
      /* no disk cache yet */
    }
    return null;
  }

  async function writeDisk(group, entry) {
    try {
      await fsp.mkdir(CACHE_DIR, { recursive: true });
      await fsp.writeFile(diskPath(group), JSON.stringify(entry), 'utf8');
    } catch (err) {
      console.warn('[celestrak-proxy] cache write failed');
    }
  }

  /** The largest group (`active`) measures ~2.7 MB; this bounds a runaway body. */
  const CELESTRAK_MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

  async function fetchUpstream(group) {
    const url = celestrakTleUrl(group);
    const signal = AbortSignal.timeout(20000);
    const res = await fetch(url.toString(), {
      signal,
      // CelesTrak 403s bulk groups (e.g. `active`) unless the request carries a
      // descriptive User-Agent with a contact point.
      headers: {
        'User-Agent':
          'gods-eye-view-celestrak-proxy/1.0 (+https://github.com/bilawalsidhu/gods-eye-view)',
      },
    });
    if (!res.ok) {
      // Group refreshes run in parallel: a later failure without Retry-After
      // must never shorten a longer deadline an earlier one already set.
      cooldownUntil = Math.max(
        cooldownUntil,
        Date.now() + providerCooldownMs(res),
      );
      void res.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${res.status}`);
    }
    const body = await readResponseTextCapped(
      res,
      CELESTRAK_MAX_RESPONSE_BYTES,
      signal,
    );
    // An upstream error page parses to zero TLEs — treat as failure, keep cache.
    if (!/^1 /m.test(body)) throw new Error('no TLE lines in response');
    return { at: Date.now(), body };
  }

  const installMiddleware = (server) => {
    server.middlewares.use('/api/celestrak', async (req, res) => {
      const group = String(req.url || '')
        .replace(/^\//, '')
        .split('?')[0];
      // Keyless and needed to render the satellites layer: refuse cross-site
      // browsers but keep the documented reverse-proxy deployment working.
      if (admitSameSiteKeyless(req, res)) return;
      if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
      }
      if (!groups.has(group)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('invalid group');
        return;
      }
      const send = (status, body, cacheStatus, entry) => {
        // Guard against a double-send (e.g. a throw AFTER a response already
        // went out routing into the catch's send): writeHead after headersSent
        // throws "Cannot set headers after they are sent".
        if (res.headersSent) return;
        res.writeHead(status, {
          'Content-Type': 'text/plain',
          'x-tle-cache': cacheStatus,
          'Cache-Control': 'no-store',
          ...(entry
            ? { 'X-TLE-Cached-At': new Date(entry.at).toISOString() }
            : {}),
          ...(cooldownUntil > 0 && Date.now() < cooldownUntil
            ? {
                'Retry-After': String(
                  Math.ceil((cooldownUntil - Date.now()) / 1000),
                ),
              }
            : {}),
        });
        res.end(body);
      };
      try {
        const now = Date.now();
        let entry = mem.get(group);
        if (!entry) {
          entry = await readDisk(group);
          if (entry) mem.set(group, entry);
        }
        if (entry && now - entry.at < TLE_TTL_MS) {
          send(200, entry.body, 'HIT', entry);
          return;
        }
        if (Date.now() < cooldownUntil) {
          if (entry) {
            send(200, entry.body, 'STALE-ERROR', entry);
          } else {
            const fallbackBody = getSovereignTleCatalog(group);
            send(200, fallbackBody, 'BUNDLED-SOVEREIGN', { at: Date.now(), body: fallbackBody });
          }
          return;
        }
        // Stale or missing → refresh, single-flight per group.
        if (!inflight.has(group)) {
          inflight.set(
            group,
            fetchUpstream(group)
              .then(async (fresh) => {
                mem.set(group, fresh);
                await writeDisk(group, fresh);
                return fresh;
              })
              .catch((err) => {
                if (Date.now() >= cooldownUntil)
                  cooldownUntil = Date.now() + 60000;
                console.warn(
                  '[celestrak-proxy] refresh failed — serving cache or sovereign fallback',
                );
                return null;
              })
              .finally(() => inflight.delete(group)),
          );
        }
        const fresh = await inflight.get(group);
        if (fresh) {
          send(200, fresh.body, 'MISS', fresh);
        } else if (entry) {
          send(200, entry.body, 'STALE-ERROR', entry); // upstream down — stale beats empty
        } else {
          const fallbackBody = getSovereignTleCatalog(group);
          send(200, fallbackBody, 'BUNDLED-SOVEREIGN', { at: Date.now(), body: fallbackBody });
        }
      } catch (err) {
        console.error('[celestrak-proxy] request failed');
        send(500, 'celestrak proxy error', 'ERROR');
      }
    });
  };
  return {
    name: 'celestrak-proxy',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}
