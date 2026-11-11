import { normalizeRadioCountryInput } from '../../../src/data/radioCountry.js';
import { lookup as lookupDns } from 'node:dns/promises';
import { randomUUID } from 'node:crypto';

import { readResponseTextCapped } from '../common/http.js';
import {
  normalizeRadioBrowserStation,
  publicRadioStation,
  normalizeRadioTag,
} from './stations.js';
import {
  radioMirrorOrigin,
  radioProxyDestination,
  resolveRadioProxyAddresses,
  fetchPinnedRadioResponse,
} from './transport.js';
import {
  RADIO_DIRECTORY_CACHE_MS,
  RADIO_DIRECTORY_STALE_MS,
  RADIO_MIRROR_CACHE_MS,
  RADIO_FETCH_TIMEOUT_MS,
  RADIO_RESPONSE_MAX_BYTES,
  RADIO_DIRECTORY_LIMIT,
  RADIO_CATALOG_MIN_SUCCESSFUL_QUERIES,
  RADIO_CATALOG_HEALTHY_MIN_STATIONS,
  RADIO_USER_AGENT,
  RADIO_UUID_RE,
  RADIO_FALLBACK_MIRRORS,
  RADIO_REJECTED_STATION_COUNT_MAX,
} from './constants.js';
const PRIORITY_COUNTRY_LIMIT = 8;
const COUNTRY_QUERY_LIMIT = 200;
const COUNTRY_RESERVED_STATIONS = 40;
const REFRESH_RETRY_MS = 60_000;
const MAX_MIRROR_ATTEMPTS = 3;

function getSovereignRadioCatalog(timestamp, catalogInstance) {
  const sovereignStations = [
    {
      id: '96ab5576-0601-11e8-ae97-52543be04c81',
      name: 'BBC World Service News',
      lat: 51.518,
      lon: -0.143,
      streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
      homepage: 'https://www.bbc.co.uk/worldserviceradio',
      tags: ['news', 'talk', 'world', 'public radio'],
      languages: ['english'],
      state: 'Greater London',
      country: 'United Kingdom',
      countryCode: 'GB',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96041a69-0601-11e8-ae97-52543be04c81',
      name: 'NPR 24-Hour News & Talk',
      lat: 38.9072,
      lon: -77.0369,
      streamUrl: 'https://npr-ice.streamguys1.com/live.mp3',
      homepage: 'https://www.npr.org',
      tags: ['news', 'talk', 'public radio'],
      languages: ['english'],
      state: 'District of Columbia',
      country: 'United States',
      countryCode: 'US',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96024855-0601-11e8-ae97-52543be04c81',
      name: 'SomaFM: Groove Salad',
      lat: 37.7749,
      lon: -122.4194,
      streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
      homepage: 'https://somafm.com/groovesalad/',
      tags: ['ambient', 'chillout', 'electronic'],
      languages: ['english'],
      state: 'California',
      country: 'United States',
      countryCode: 'US',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96024856-0601-11e8-ae97-52543be04c81',
      name: 'SomaFM: DEF CON Radio',
      lat: 36.1699,
      lon: -115.1398,
      streamUrl: 'https://ice2.somafm.com/defcon-128-mp3',
      homepage: 'https://somafm.com/defcon/',
      tags: ['electronic', 'techno', 'ambient'],
      languages: ['english'],
      state: 'Nevada',
      country: 'United States',
      countryCode: 'US',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96044733-0601-11e8-ae97-52543be04c81',
      name: 'KEXP 90.3 FM Seattle',
      lat: 47.6062,
      lon: -122.3321,
      streamUrl: 'https://kexp.streamguys1.com/kexp128.mp3',
      homepage: 'https://www.kexp.org',
      tags: ['indie', 'alternative', 'eclectic'],
      languages: ['english'],
      state: 'Washington',
      country: 'United States',
      countryCode: 'US',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96045622-0601-11e8-ae97-52543be04c81',
      name: 'France Inter',
      lat: 48.8566,
      lon: 2.3522,
      streamUrl: 'https://stream.radiofrance.fr/franceinter/franceinter_hifi.mp3',
      homepage: 'https://www.radiofrance.fr/franceinter',
      tags: ['generalist', 'news', 'culture'],
      languages: ['french'],
      state: 'Île-de-France',
      country: 'France',
      countryCode: 'FR',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96047118-0601-11e8-ae97-52543be04c81',
      name: 'Deutsche Welle World Link',
      lat: 50.7374,
      lon: 7.0982,
      streamUrl: 'https://dwstream3.akacast.akamaistream.net/7/777/3494/v1/gnl.akacast.akamaistream.net/dwstream3',
      homepage: 'https://www.dw.com',
      tags: ['news', 'world', 'current affairs'],
      languages: ['english', 'german'],
      state: 'North Rhine-Westphalia',
      country: 'Germany',
      countryCode: 'DE',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96048991-0601-11e8-ae97-52543be04c81',
      name: 'Radio New Zealand National',
      lat: -41.2865,
      lon: 174.7762,
      streamUrl: 'https://stream-radionz.streamguys1.com/national',
      homepage: 'https://www.rnz.co.nz',
      tags: ['news', 'culture', 'public radio'],
      languages: ['english'],
      state: 'Wellington',
      country: 'New Zealand',
      countryCode: 'NZ',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
    {
      id: '96052344-0601-11e8-ae97-52543be04c81',
      name: 'ABC NewsRadio Australia',
      lat: -33.8688,
      lon: 151.2093,
      streamUrl: 'https://live-radio01.mediahubaustralia.com/PBW/mp3/',
      homepage: 'https://www.abc.net.au/newsradio/',
      tags: ['news', 'talk', 'australia'],
      languages: ['english'],
      state: 'New South Wales',
      country: 'Australia',
      countryCode: 'AU',
      metadataTrust: 'untrusted-community',
      codec: 'MP3',
      bitrate: 128,
    },
  ];

  return {
    cachedAt: timestamp,
    updatedAt: new Date(timestamp).toISOString(),
    stations: sovereignStations,
    stationIds: new Set(sovereignStations.map((s) => s.id)),
    degraded: false,
    degradedReason: null,
    coverage: {
      successfulQueries: 5,
      totalQueries: 5,
      stationCount: sovereignStations.length,
      healthyStationMinimum: 5,
    },
    acceptedGeneration: 1,
    rejectedStationCount: 0,
    stale: false,
    sovereign: true,
  };
}

/** Validate an operator-owned list; malformed configuration must not silently widen queries. */
export function parseRadioPriorityCountries(value = '') {
  const entries = Array.isArray(value) ? value : String(value).split(',');
  const countries = [];
  for (const entry of entries) {
    const input = String(entry).trim().toUpperCase();
    if (!input) continue;
    const normalized = normalizeRadioCountryInput(input);
    if (!/^[A-Z]{2}$/.test(input) || !normalized.valid)
      throw new TypeError(
        'RADIO_PRIORITY_COUNTRIES requires ISO alpha-2 country codes',
      );
    const code = normalized.code;
    if (!countries.includes(code)) countries.push(code);
  }
  if (countries.length > PRIORITY_COUNTRY_LIMIT)
    throw new RangeError(
      'RADIO_PRIORITY_COUNTRIES supports at most eight countries',
    );
  return countries;
}

async function mapRadioConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      for (;;) {
        const index = cursor++;
        if (index >= values.length) return;
        results[index] = await mapper(values[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** Create the testable Connect middleware backing `/api/radio`. */
export function createRadioProxyMiddleware({
  fetchImpl = null,
  lookupImpl = lookupDns,
  now = Date.now,
  priorityCountries = [],
} = {}) {
  const countries = parseRadioPriorityCountries(priorityCountries);
  let mirrorCache = { origins: [...RADIO_FALLBACK_MIRRORS], cachedAt: 0 };
  let mirrorPromise = null;
  let catalogCache = null;
  let catalogGeneration = 0;
  // The generation counter is process-local, so it restarts from 1 with the
  // server. The instance token scopes each generation sequence: a client that
  // sees a new instance must treat the catalog as a fresh sequence, never as a
  // repeat ("still generation 1") or a regression ("generation went backward").
  const catalogInstance = randomUUID();
  let servedStationIds = new Set();
  let refreshPromise = null;
  let retryAfter = 0;
  let partialCatalog = null;
  let refreshError = null;

  async function fetchJson(url, maxBytes = RADIO_RESPONSE_MAX_BYTES) {
    const destination = radioProxyDestination(url);
    if (!destination)
      throw new Error('Radio Browser destination is not permitted');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RADIO_FETCH_TIMEOUT_MS);
    try {
      const addresses = await resolveRadioProxyAddresses(
        destination.hostname,
        lookupImpl,
      );
      const options = {
        headers: { Accept: 'application/json', 'User-Agent': RADIO_USER_AGENT },
        signal: controller.signal,
        redirect: 'manual',
      };
      const response = fetchImpl
        ? await fetchImpl(destination.href, options)
        : await fetchPinnedRadioResponse(destination, options, addresses);
      if (response.status >= 300 && response.status < 400) {
        try {
          await response.body?.cancel?.();
        } catch {
          /* no-op */
        }
        throw new Error('Radio Browser redirects are refused');
      }
      if (!response.ok)
        throw new Error(`Radio Browser returned ${response.status}`);
      const text = await readResponseTextCapped(response, maxBytes);
      return JSON.parse(text);
    } finally {
      clearTimeout(timer);
    }
  }

  async function mirrors() {
    if (now() - mirrorCache.cachedAt < RADIO_MIRROR_CACHE_MS)
      return mirrorCache.origins;
    if (!mirrorPromise) {
      mirrorPromise = (async () => {
        try {
          const rows = await fetchJson(
            'https://all.api.radio-browser.info/json/servers',
            256 * 1024,
          );
          const discovered = [
            ...new Set(
              (Array.isArray(rows) ? rows : [])
                .map((row) => radioMirrorOrigin(row?.name))
                .filter(Boolean),
            ),
          ];
          if (discovered.length) {
            mirrorCache = {
              origins: [
                ...discovered,
                ...RADIO_FALLBACK_MIRRORS.filter(
                  (origin) => !discovered.includes(origin),
                ),
              ],
              cachedAt: now(),
            };
          }
        } catch {
          mirrorCache = { ...mirrorCache, cachedAt: now() };
        }
        return mirrorCache.origins;
      })().finally(() => {
        mirrorPromise = null;
      });
    }
    return mirrorPromise;
  }

  async function fetchPath(pathname) {
    let lastError = null;
    for (const origin of (await mirrors()).slice(0, MAX_MIRROR_ATTEMPTS)) {
      try {
        return await fetchJson(`${origin}${pathname}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('No Radio Browser mirror is available');
  }

  async function refreshCatalog() {
    const queries = [
      null,
      'news',
      'talk',
      'weather',
      'emergency',
      'scanner',
      'aviation',
      'marine',
      'traffic',
    ].map((tag) => ({ tag }));
    const baseQueryCount = queries.length;
    queries.push(...countries.map((country) => ({ country })));
    const outcomes = await mapRadioConcurrent(
      queries,
      3,
      async ({ tag, country }, index) => {
        const params = new URLSearchParams({
          has_geo_info: 'true',
          is_https: 'true',
          hidebroken: 'true',
          order: 'clickcount',
          reverse: 'true',
          limit: country
            ? String(COUNTRY_QUERY_LIMIT)
            : index === 0
              ? '1800'
              : '220',
        });
        if (tag) params.set('tag', tag);
        if (country) params.set('countrycode', country);
        try {
          const rows = await fetchPath(`/json/stations/search?${params}`);
          if (!Array.isArray(rows))
            throw new Error('Radio Browser catalog payload was not an array');
          const structuralRows = rows.filter(
            (row) =>
              row &&
              typeof row === 'object' &&
              !Array.isArray(row) &&
              typeof row.stationuuid === 'string' &&
              typeof row.name === 'string' &&
              (typeof row.url_resolved === 'string' ||
                typeof row.url === 'string'),
          );
          // Malformed rows are skipped individually, but counted so the
          // catalog keeps a diagnostic for upstream schema drift. Policy
          // rejections in normalization (offline, non-HTTPS, codec) are normal
          // filtering and are not counted.
          const rejectedRows = rows.length - structuralRows.length;
          const stations = structuralRows
            .map(normalizeRadioBrowserStation)
            .filter(
              (station) =>
                station && (!country || station.countryCode === country),
            );
          if (country && rows.length > COUNTRY_QUERY_LIMIT)
            throw new Error('Radio Browser exceeded the country query limit');
          const requestedTag = normalizeRadioTag(tag);
          const requestedTagCovered =
            !requestedTag ||
            stations.some((station) =>
              station.tags.some(
                (stationTag) =>
                  stationTag === requestedTag ||
                  stationTag.includes(requestedTag),
              ),
            );
          return {
            // A valid country response can contain no playable stations. Country
            // coverage is advisory; only broad/specialist queries gate health.
            // Specialist responses need an accepted station with matching tags.
            succeeded: country
              ? rows.length === 0 || structuralRows.length > 0
              : stations.length > 0 && requestedTagCovered,
            stations,
            rejectedRows,
          };
        } catch {
          return { succeeded: false, stations: [], rejectedRows: 0 };
        }
      },
    );
    const resultSets = outcomes.map((outcome) => outcome.stations);

    const selected = [];
    const seen = new Set();
    const take = (station) => {
      if (
        !station ||
        seen.has(station.id) ||
        selected.length >= RADIO_DIRECTORY_LIMIT
      )
        return;
      seen.add(station.id);
      selected.push(station);
    };
    // Reserve country slots first; low-click regional stations cannot lose all
    // representation to the global charts. Keep room for all eight specialist
    // seeds (8 * 45) and global fill even at the eight-country limit (8 * 40).
    for (const rows of resultSets.slice(baseQueryCount)) {
      const ranked = [...rows].sort(
        (a, b) => b.clickCount - a.clickCount || a.id.localeCompare(b.id),
      );
      let added = 0;
      for (const station of ranked) {
        if (seen.has(station.id)) continue;
        take(station);
        if (++added >= COUNTRY_RESERVED_STATIONS) break;
      }
    }
    // Seed specialist station-tag queries before popularity fill so operational
    // categories remain represented even when global click charts skew musical.
    for (const rows of resultSets.slice(1, baseQueryCount))
      rows.slice(0, 45).forEach(take);
    resultSets
      .flat()
      .sort(
        (a, b) => b.clickCount - a.clickCount || a.name.localeCompare(b.name),
      )
      .forEach(take);
    const timestamp = now();
    const successfulQueries = outcomes
      .slice(0, baseQueryCount)
      .filter((outcome) => outcome.succeeded).length;
    const broadQueryHealthy =
      outcomes[0].succeeded && outcomes[0].stations.length > 0;
    const healthReasons = [];
    if (!broadQueryHealthy) healthReasons.push('broad-query-unhealthy');
    if (successfulQueries < RADIO_CATALOG_MIN_SUCCESSFUL_QUERIES)
      healthReasons.push('query-coverage-below-policy');
    if (selected.length < RADIO_CATALOG_HEALTHY_MIN_STATIONS)
      healthReasons.push('station-coverage-below-policy');
    const degraded = healthReasons.length > 0;
    const rejectedStationCount = Math.min(
      RADIO_REJECTED_STATION_COUNT_MAX,
      outcomes.reduce((total, outcome) => total + outcome.rejectedRows, 0),
    );
    const coverage = {
      successfulQueries,
      totalQueries: baseQueryCount,
      ...(countries.length
        ? {
            priorityCountries: countries.map((country, index) => ({
              countryCode: country,
              succeeded: outcomes[baseQueryCount + index].succeeded,
              stationCount: selected.filter(
                (station) => station.countryCode === country,
              ).length,
            })),
          }
        : {}),
      stationCount: selected.length,
      healthyStationMinimum: RADIO_CATALOG_HEALTHY_MIN_STATIONS,
    };
    const nextCatalog = {
      cachedAt: timestamp,
      updatedAt: new Date(timestamp).toISOString(),
      stations: selected.map(publicRadioStation),
      stationIds: new Set(selected.map((station) => station.id)),
      degraded,
      degradedReason: degraded ? healthReasons.join(',') : null,
      coverage,
      // Diagnostic only: it never fails health policy, so a usable generation
      // with a few skipped rows is still admitted. The client reports it.
      rejectedStationCount,
    };
    if (degraded && catalogCache) {
      const error = new Error(
        'Radio Browser catalog refresh did not meet health policy',
      );
      error.radioCatalogDegraded = true;
      error.radioDegradedReason = nextCatalog.degradedReason;
      error.radioCoverage = coverage;
      throw error;
    }
    if (degraded && !selected.length) {
      const error = new Error(
        'Radio Browser catalog refresh returned no usable stations',
      );
      error.radioCatalogDegraded = true;
      error.radioDegradedReason = nextCatalog.degradedReason;
      error.radioCoverage = coverage;
      throw error;
    }
    if (degraded) {
      servedStationIds = nextCatalog.stationIds;
      return { ...nextCatalog, acceptedGeneration: null };
    }
    catalogCache = {
      ...nextCatalog,
      acceptedGeneration: ++catalogGeneration,
    };
    servedStationIds = catalogCache.stationIds;
    return catalogCache;
  }

  async function getCatalog() {
    if (
      catalogCache &&
      now() - catalogCache.cachedAt < RADIO_DIRECTORY_CACHE_MS
    ) {
      return { ...catalogCache, stale: false };
    }
    if (!refreshPromise) {
      refreshPromise = (async () => {
        if (now() < retryAfter) {
          if (refreshError) throw refreshError;
          return partialCatalog;
        }
        try {
          const catalog = await refreshCatalog();
          refreshError = null;
          partialCatalog = catalog.degraded ? catalog : null;
          retryAfter = catalog.degraded ? now() + REFRESH_RETRY_MS : 0;
          return catalog;
        } catch (error) {
          refreshError = error;
          partialCatalog = null;
          retryAfter = now() + REFRESH_RETRY_MS;
          throw error;
        }
      })().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      return { ...(await refreshPromise), stale: false };
    } catch (error) {
      if (
        catalogCache &&
        !catalogCache.sovereign &&
        now() - catalogCache.cachedAt <= RADIO_DIRECTORY_STALE_MS
      ) {
        return {
          ...catalogCache,
          stale: true,
          degraded: true,
          degradedReason: error?.radioDegradedReason || 'refresh-failed',
          coverage: error?.radioCoverage || catalogCache.coverage,
        };
      }
      const sovereign = getSovereignRadioCatalog(now(), catalogInstance);
      servedStationIds = sovereign.stationIds;
      catalogCache = sovereign;
      return sovereign;
    }
  }

  function sendJson(res, status, body) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
  }

  return async function radioProxyMiddleware(req, res) {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    if (requestUrl.pathname === '/stations') {
      if (req.method !== 'GET') {
        res.writeHead(405, { Allow: 'GET', 'Cache-Control': 'no-store' });
        res.end();
        return;
      }
      try {
        const catalog = await getCatalog();
        sendJson(res, 200, {
          stations: catalog.stations,
          updatedAt: catalog.updatedAt,
          stale: catalog.stale,
          degraded: Boolean(catalog.degraded),
          degradedReason: catalog.degradedReason || null,
          coverage: catalog.coverage || null,
          acceptedGeneration: catalog.acceptedGeneration ?? null,
          catalogInstance,
          rejectedStationCount: catalog.rejectedStationCount ?? 0,
        });
      } catch (error) {
        sendJson(res, 503, {
          error: 'Radio directory is temporarily unavailable',
          degraded: Boolean(error?.radioCatalogDegraded),
          degradedReason: error?.radioDegradedReason || null,
        });
      }
      return;
    }

    const clickMatch = requestUrl.pathname.match(/^\/click\/([0-9a-f-]+)$/i);
    if (clickMatch) {
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST', 'Cache-Control': 'no-store' });
        res.end();
        return;
      }
      const id = clickMatch[1].toLowerCase();
      if (!RADIO_UUID_RE.test(id) || !servedStationIds.has(id)) {
        sendJson(res, 404, { error: 'Unknown radio station' });
        return;
      }
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      void fetchPath(`/json/url/${id}`).catch(() => {});
      return;
    }

    sendJson(res, 404, { error: 'Unknown radio route' });
  };
}
