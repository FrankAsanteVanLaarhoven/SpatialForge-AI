/**
 * SpatialForge 3D // Global Flight & Maritime Intelligence Tracker
 * 
 * Provides Skyscanner & MarineTraffic style live intelligence:
 * 1. Commercial Flights:
 *    - Origin Takeoff times (scheduled & actual)
 *    - Destination Arrival times (scheduled & estimated)
 *    - Total Duration (elapsed & remaining, % progress)
 *    - Operators / Airlines (Delta, United, Lufthansa, Emirates, Singapore Airlines, British Airways, etc.)
 *    - Flight numbers, aircraft type, 3D kinematics (lat, lon, alt, speed, heading), 3D fly-to vector camera
 * 2. Maritime Vessels:
 *    - Origin Departure Port
 *    - Destination Arrival Port & ETA
 *    - Voyage Duration (days/hours elapsed vs remaining, % progress)
 *    - Operators / Shipping Lines (Maersk, MSC, CMA CGM, COSCO, Hapag-Lloyd, Evergreen, Euronav)
 *    - Vessel name, MMSI, IMO, vessel type, draught, speed over ground, 3D fly-to vector camera
 */

// Helper to format minutes to "Xh Ym"
export function formatDurationHoursMins(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

// Helper to format days to "Xd Yh"
export function formatDurationDaysHours(totalHours) {
  const d = Math.floor(totalHours / 24);
  const h = Math.floor(totalHours % 24);
  return `${d}d ${h < 10 ? '0' : ''}${h}h`;
}

export const GLOBAL_FLIGHT_FLEET = [
  {
    id: 'flt-dal189',
    flightNumber: 'DL189',
    callsign: 'DAL189',
    airline: 'Delta Air Lines',
    airlineCode: 'DAL',
    airlineIata: 'DL',
    alliance: 'SkyTeam',
    aircraft: 'Airbus A350-941',
    registration: 'N504DN',
    squawk: '4217',
    origin: {
      code: 'JFK',
      name: 'John F. Kennedy Intl',
      city: 'New York',
      country: 'United States',
      terminal: '4',
      gate: 'B26',
      scheduledTakeoff: '18:30 UTC',
      actualTakeoff: '18:42 UTC',
      lat: 40.6413,
      lon: -73.7781
    },
    destination: {
      code: 'LHR',
      name: 'London Heathrow',
      city: 'London',
      country: 'United Kingdom',
      terminal: '3',
      gate: '31',
      scheduledArrival: '06:45 UTC',
      estimatedArrival: '06:38 UTC',
      lat: 51.4700,
      lon: -0.4543
    },
    scheduledDurationMins: 435, // 7h 15m
    elapsedDurationMins: 295,   // 4h 55m
    status: 'EN ROUTE',
    phase: 'CRUISE',
    latitude: 53.421,
    longitude: -28.914,
    altitudeFt: 39000,
    groundSpeedKts: 512,
    verticalSpeedFpm: 0,
    headingDeg: 84,
  },
  {
    id: 'flt-ual857',
    flightNumber: 'UA857',
    callsign: 'UAL857',
    airline: 'United Airlines',
    airlineCode: 'UAL',
    airlineIata: 'UA',
    alliance: 'Star Alliance',
    aircraft: 'Boeing 777-300ER',
    registration: 'N2250U',
    squawk: '6104',
    origin: {
      code: 'SFO',
      name: 'San Francisco Intl',
      city: 'San Francisco',
      country: 'United States',
      terminal: 'I',
      gate: 'G98',
      scheduledTakeoff: '10:50 UTC',
      actualTakeoff: '11:05 UTC',
      lat: 37.6213,
      lon: -122.3790
    },
    destination: {
      code: 'PVG',
      name: 'Shanghai Pudong Intl',
      city: 'Shanghai',
      country: 'China',
      terminal: '2',
      gate: 'D80',
      scheduledArrival: '02:45 UTC',
      estimatedArrival: '02:35 UTC',
      lat: 31.1443,
      lon: 121.8083
    },
    scheduledDurationMins: 895, // 14h 55m
    elapsedDurationMins: 580,   // 9h 40m
    status: 'EN ROUTE',
    phase: 'CRUISE',
    latitude: 49.125,
    longitude: 168.421,
    altitudeFt: 36000,
    groundSpeedKts: 488,
    verticalSpeedFpm: 0,
    headingDeg: 272,
  },
  {
    id: 'flt-baw117',
    flightNumber: 'BA117',
    callsign: 'BAW117',
    airline: 'British Airways',
    airlineCode: 'BAW',
    airlineIata: 'BA',
    alliance: 'oneworld',
    aircraft: 'Boeing 787-9 Dreamliner',
    registration: 'G-ZBKA',
    squawk: '2142',
    origin: {
      code: 'LHR',
      name: 'London Heathrow',
      city: 'London',
      country: 'United Kingdom',
      terminal: '5',
      gate: 'B34',
      scheduledTakeoff: '08:45 UTC',
      actualTakeoff: '08:58 UTC',
      lat: 51.4700,
      lon: -0.4543
    },
    destination: {
      code: 'JFK',
      name: 'John F. Kennedy Intl',
      city: 'New York',
      country: 'United States',
      terminal: '7',
      gate: '4',
      scheduledArrival: '16:55 UTC',
      estimatedArrival: '16:48 UTC',
      lat: 40.6413,
      lon: -73.7781
    },
    scheduledDurationMins: 490, // 8h 10m
    elapsedDurationMins: 380,   // 6h 20m
    status: 'EN ROUTE',
    phase: 'DESCENDING',
    latitude: 42.150,
    longitude: -68.450,
    altitudeFt: 24000,
    groundSpeedKts: 440,
    verticalSpeedFpm: -1800,
    headingDeg: 245,
  },
  {
    id: 'flt-dlh400',
    flightNumber: 'LH400',
    callsign: 'DLH400',
    airline: 'Lufthansa',
    airlineCode: 'DLH',
    airlineIata: 'LH',
    alliance: 'Star Alliance',
    aircraft: 'Boeing 747-8 Intercontinental',
    registration: 'D-ABYM',
    squawk: '5231',
    origin: {
      code: 'FRA',
      name: 'Frankfurt Airport',
      city: 'Frankfurt',
      country: 'Germany',
      terminal: '1',
      gate: 'Z15',
      scheduledTakeoff: '10:15 UTC',
      actualTakeoff: '10:28 UTC',
      lat: 50.0379,
      lon: 8.5622
    },
    destination: {
      code: 'JFK',
      name: 'John F. Kennedy Intl',
      city: 'New York',
      country: 'United States',
      terminal: '1',
      gate: '5',
      scheduledArrival: '19:10 UTC',
      estimatedArrival: '19:02 UTC',
      lat: 40.6413,
      lon: -73.7781
    },
    scheduledDurationMins: 535, // 8h 55m
    elapsedDurationMins: 245,   // 4h 05m
    status: 'EN ROUTE',
    phase: 'CRUISE',
    latitude: 56.120,
    longitude: -32.840,
    altitudeFt: 38000,
    groundSpeedKts: 476,
    verticalSpeedFpm: 0,
    headingDeg: 260,
  },
  {
    id: 'flt-uae201',
    flightNumber: 'EK201',
    callsign: 'UAE201',
    airline: 'Emirates',
    airlineCode: 'UAE',
    airlineIata: 'EK',
    alliance: 'Independent',
    aircraft: 'Airbus A380-861',
    registration: 'A6-EVS',
    squawk: '7302',
    origin: {
      code: 'DXB',
      name: 'Dubai International',
      city: 'Dubai',
      country: 'United Arab Emirates',
      terminal: '3',
      gate: 'A1',
      scheduledTakeoff: '08:30 UTC',
      actualTakeoff: '08:44 UTC',
      lat: 25.2532,
      lon: 55.3657
    },
    destination: {
      code: 'JFK',
      name: 'John F. Kennedy Intl',
      city: 'New York',
      country: 'United States',
      terminal: '4',
      gate: 'A6',
      scheduledArrival: '22:50 UTC',
      estimatedArrival: '22:40 UTC',
      lat: 40.6413,
      lon: -73.7781
    },
    scheduledDurationMins: 860, // 14h 20m
    elapsedDurationMins: 610,   // 10h 10m
    status: 'EN ROUTE',
    phase: 'CRUISE',
    latitude: 62.840,
    longitude: -45.120,
    altitudeFt: 41000,
    groundSpeedKts: 495,
    verticalSpeedFpm: 0,
    headingDeg: 250,
  },
  {
    id: 'flt-sia22',
    flightNumber: 'SQ22',
    callsign: 'SIA22',
    airline: 'Singapore Airlines',
    airlineCode: 'SIA',
    airlineIata: 'SQ',
    alliance: 'Star Alliance',
    aircraft: 'Airbus A350-900ULR',
    registration: '9V-SGA',
    squawk: '3341',
    origin: {
      code: 'SIN',
      name: 'Singapore Changi',
      city: 'Singapore',
      country: 'Singapore',
      terminal: '3',
      gate: 'B2',
      scheduledTakeoff: '23:35 UTC',
      actualTakeoff: '23:48 UTC',
      lat: 1.3644,
      lon: 103.9915
    },
    destination: {
      code: 'EWR',
      name: 'Newark Liberty Intl',
      city: 'Newark / New York',
      country: 'United States',
      terminal: 'B',
      gate: 'B61',
      scheduledArrival: '18:15 UTC',
      estimatedArrival: '18:05 UTC',
      lat: 40.6895,
      lon: -74.1745
    },
    scheduledDurationMins: 1120, // 18h 40m (World's Longest Flight)
    elapsedDurationMins: 820,    // 13h 40m
    status: 'EN ROUTE',
    phase: 'CRUISE',
    latitude: 76.500,
    longitude: -85.200,
    altitudeFt: 43000,
    groundSpeedKts: 472,
    verticalSpeedFpm: 0,
    headingDeg: 195,
  },
  {
    id: 'flt-fdx12',
    flightNumber: 'FX12',
    callsign: 'FDX12',
    airline: 'FedEx Express',
    airlineCode: 'FDX',
    airlineIata: 'FX',
    alliance: 'Cargo Sky',
    aircraft: 'Boeing 777-FS2 (Cargo)',
    registration: 'N892FD',
    squawk: '1502',
    origin: {
      code: 'MEM',
      name: 'Memphis SuperHub',
      city: 'Memphis',
      country: 'United States',
      terminal: 'Cargo-N',
      gate: 'Pad 4',
      scheduledTakeoff: '03:15 UTC',
      actualTakeoff: '03:22 UTC',
      lat: 35.0424,
      lon: -89.9767
    },
    destination: {
      code: 'FRA',
      name: 'Frankfurt CargoCity',
      city: 'Frankfurt',
      country: 'Germany',
      terminal: 'Cargo-S',
      gate: 'Bay 12',
      scheduledArrival: '13:00 UTC',
      estimatedArrival: '12:50 UTC',
      lat: 50.0379,
      lon: 8.5622
    },
    scheduledDurationMins: 585, // 9h 45m
    elapsedDurationMins: 430,   // 7h 10m
    status: 'EN ROUTE',
    phase: 'CRUISE',
    latitude: 52.880,
    longitude: -12.440,
    altitudeFt: 37000,
    groundSpeedKts: 520,
    verticalSpeedFpm: 0,
    headingDeg: 96,
  }
];

export const GLOBAL_MARITIME_FLEET = [
  {
    id: 'ves-maersk-mckinney',
    vesselName: 'Mærsk Mc-Kinney Møller',
    mmsi: '219018271',
    imo: '9619907',
    callsign: 'OWJD2',
    operator: 'A.P. Møller - Mærsk',
    operatorCode: 'MAEU',
    vesselType: 'Ultra Large Container Ship (ULCS)',
    capacity: '18,270 TEU',
    dwt: 196000,
    draughtM: 15.2,
    flag: 'Denmark',
    originPort: {
      code: 'CNNGB',
      name: 'Port of Ningbo-Zhoushan',
      city: 'Ningbo',
      country: 'China',
      departureDate: '2026-10-24 06:00 UTC',
      lat: 29.8683,
      lon: 121.5440
    },
    destPort: {
      code: 'NLRTM',
      name: 'Port of Rotterdam (Maasvlakte 2)',
      city: 'Rotterdam',
      country: 'Netherlands',
      eta: '2026-11-12 14:00 UTC',
      lat: 51.9540,
      lon: 4.0200
    },
    scheduledDurationHours: 464, // 19d 08h
    elapsedDurationHours: 360,   // 15d 00h
    status: 'UNDERWAY USING ENGINE',
    latitude: 27.840,
    longitude: 34.210, // Red Sea / Gulf of Suez approach
    speedKts: 19.4,
    courseDeg: 332,
    starlinkBackboneActive: true,
  },
  {
    id: 'ves-msc-oscar',
    vesselName: 'MSC Oscar',
    mmsi: '355906000',
    imo: '9703291',
    callsign: '3FDA6',
    operator: 'Mediterranean Shipping Company (MSC)',
    operatorCode: 'MSCU',
    vesselType: 'Container Ship',
    capacity: '19,224 TEU',
    dwt: 197362,
    draughtM: 16.0,
    flag: 'Panama',
    originPort: {
      code: 'CNSHA',
      name: 'Port of Shanghai (Yangshan Deep-Water)',
      city: 'Shanghai',
      country: 'China',
      departureDate: '2026-10-22 18:30 UTC',
      lat: 30.6270,
      lon: 122.0640
    },
    destPort: {
      code: 'BEANR',
      name: 'Port of Antwerp-Bruges',
      city: 'Antwerp',
      country: 'Belgium',
      eta: '2026-11-15 09:00 UTC',
      lat: 51.2750,
      lon: 4.3180
    },
    scheduledDurationHours: 566, // 23d 14h
    elapsedDurationHours: 400,   // 16d 16h
    status: 'UNDERWAY USING ENGINE',
    latitude: 12.150,
    longitude: 44.820, // Bab-el-Mandeb Strait
    speedKts: 18.2,
    courseDeg: 315,
    starlinkBackboneActive: true,
  },
  {
    id: 'ves-cma-cgm-antoine',
    vesselName: 'CMA CGM Antoine de Saint Exupéry',
    mmsi: '228341600',
    imo: '9776418',
    callsign: 'FMCX',
    operator: 'CMA CGM Group',
    operatorCode: 'CMAU',
    vesselType: 'Ultra Large Container Vessel',
    capacity: '20,600 TEU',
    dwt: 217672,
    draughtM: 15.8,
    flag: 'France',
    originPort: {
      code: 'SGSIN',
      name: 'Port of Singapore',
      city: 'Singapore',
      country: 'Singapore',
      departureDate: '2026-10-28 04:00 UTC',
      lat: 1.2644,
      lon: 103.8200
    },
    destPort: {
      code: 'FRLEH',
      name: 'Port of Le Havre',
      city: 'Le Havre',
      country: 'France',
      eta: '2026-11-16 18:00 UTC',
      lat: 49.4944,
      lon: 0.1079
    },
    scheduledDurationHours: 470, // 19d 14h
    elapsedDurationHours: 250,   // 10d 10h
    status: 'UNDERWAY USING ENGINE',
    latitude: -18.420,
    longitude: 58.120, // Indian Ocean Cape Route
    speedKts: 20.1,
    courseDeg: 242,
    starlinkBackboneActive: true,
  },
  {
    id: 'ves-ever-given',
    vesselName: 'Ever Given',
    mmsi: '353136000',
    imo: '9811000',
    callsign: 'H3RC',
    operator: 'Evergreen Marine Corp',
    operatorCode: 'EGLV',
    vesselType: 'Golden-class Container Ship',
    capacity: '20,124 TEU',
    dwt: 199629,
    draughtM: 15.7,
    flag: 'Panama',
    originPort: {
      code: 'TWKHH',
      name: 'Port of Kaohsiung',
      city: 'Kaohsiung',
      country: 'Taiwan',
      departureDate: '2026-10-25 12:00 UTC',
      lat: 22.6163,
      lon: 120.2800
    },
    destPort: {
      code: 'DEHAM',
      name: 'Port of Hamburg',
      city: 'Hamburg',
      country: 'Germany',
      eta: '2026-11-18 20:00 UTC',
      lat: 53.5320,
      lon: 9.9700
    },
    scheduledDurationHours: 584, // 24d 08h
    elapsedDurationHours: 320,   // 13d 08h
    status: 'UNDERWAY USING ENGINE',
    latitude: 5.820,
    longitude: 80.450, // South of Sri Lanka
    speedKts: 17.8,
    courseDeg: 268,
    starlinkBackboneActive: true,
  },
  {
    id: 'ves-ti-europe',
    vesselName: 'TI Europe (Ultra Large Crude Carrier)',
    mmsi: '205423000',
    imo: '9235268',
    callsign: 'ONFB',
    operator: 'Euronav NV',
    operatorCode: 'EURN',
    vesselType: 'TI-class Supertanker (ULCC)',
    capacity: '3.16 Million Barrels Crude',
    dwt: 441585,
    draughtM: 24.5,
    flag: 'Belgium',
    originPort: {
      code: 'SABRI',
      name: 'Ras Tanura Terminal',
      city: 'Ras Tanura',
      country: 'Saudi Arabia',
      departureDate: '2026-10-20 02:00 UTC',
      lat: 26.6380,
      lon: 50.1600
    },
    destPort: {
      code: 'USCRP',
      name: 'Port of Corpus Christi',
      city: 'Corpus Christi, Texas',
      country: 'United States',
      eta: '2026-11-24 16:00 UTC',
      lat: 27.8100,
      lon: -97.3900
    },
    scheduledDurationHours: 854, // 35d 14h
    elapsedDurationHours: 450,   // 18d 18h
    status: 'UNDERWAY USING ENGINE',
    latitude: -34.820,
    longitude: 18.520, // Rounding Cape of Good Hope
    speedKts: 15.6,
    courseDeg: 285,
    starlinkBackboneActive: true,
  },
  {
    id: 'ves-qmax-mozah',
    vesselName: 'Q-Max Mozah (LNG Carrier)',
    mmsi: '538003262',
    imo: '9337755',
    callsign: 'V7NZ2',
    operator: 'Qatar Gas Transport Co (Nakilat)',
    operatorCode: 'NAKI',
    vesselType: 'Q-Max Liquefied Natural Gas Carrier',
    capacity: '266,000 m³ LNG',
    dwt: 128900,
    draughtM: 12.0,
    flag: 'Marshall Islands',
    originPort: {
      code: 'QARLF',
      name: 'Ras Laffan Port',
      city: 'Ras Laffan',
      country: 'Qatar',
      departureDate: '2026-10-29 08:00 UTC',
      lat: 25.9200,
      lon: 51.5800
    },
    destPort: {
      code: 'GBMIL',
      name: 'South Hook LNG Terminal (Milford Haven)',
      city: 'Milford Haven, Wales',
      country: 'United Kingdom',
      eta: '2026-11-14 06:00 UTC',
      lat: 51.7100,
      lon: -5.0500
    },
    scheduledDurationHours: 382, // 15d 22h
    elapsedDurationHours: 230,   // 9d 14h
    status: 'UNDERWAY USING ENGINE',
    latitude: 22.140,
    longitude: 38.450, // Central Red Sea
    speedKts: 18.8,
    courseDeg: 326,
    starlinkBackboneActive: true,
  }
];

export class FlightMaritimeTrackerService {
  constructor() {
    this.flights = [...GLOBAL_FLIGHT_FLEET];
    this.vessels = [...GLOBAL_MARITIME_FLEET];
    this.activeSimTimer = null;
    this.listeners = new Set();
    this.startSimulation();
  }

  startSimulation() {
    if (this.activeSimTimer) return;
    this.activeSimTimer = setInterval(() => {
      this.tick();
    }, 2000);
  }

  stopSimulation() {
    if (this.activeSimTimer) {
      clearInterval(this.activeSimTimer);
      this.activeSimTimer = null;
    }
  }

  tick() {
    // Advance progress slightly for realism
    for (const flight of this.flights) {
      if (flight.elapsedDurationMins < flight.scheduledDurationMins) {
        flight.elapsedDurationMins += 0.05; // 3 seconds real time
      }
      // calculate progress
      flight.progressPct = Math.min(
        100,
        Math.round((flight.elapsedDurationMins / flight.scheduledDurationMins) * 100)
      );
      flight.remainingDurationMins = Math.max(
        0,
        Math.round(flight.scheduledDurationMins - flight.elapsedDurationMins)
      );
    }

    for (const vessel of this.vessels) {
      if (vessel.elapsedDurationHours < vessel.scheduledDurationHours) {
        vessel.elapsedDurationHours += 0.02;
      }
      vessel.progressPct = Math.min(
        100,
        Math.round((vessel.elapsedDurationHours / vessel.scheduledDurationHours) * 100)
      );
      vessel.remainingDurationHours = Math.max(
        0,
        Math.round(vessel.scheduledDurationHours - vessel.elapsedDurationHours)
      );
    }

    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback({
      flights: this.getAllFlights(),
      vessels: this.getAllVessels(),
    });
    return () => this.listeners.delete(callback);
  }

  notify() {
    const data = {
      flights: this.getAllFlights(),
      vessels: this.getAllVessels(),
    };
    for (const cb of this.listeners) {
      try {
        cb(data);
      } catch (e) {
        console.error('Tracker listener error:', e);
      }
    }
  }

  getAllFlights() {
    return this.flights.map((f) => {
      const progress = Math.min(
        100,
        Math.round((f.elapsedDurationMins / f.scheduledDurationMins) * 100)
      );
      const remaining = Math.max(0, Math.round(f.scheduledDurationMins - f.elapsedDurationMins));
      return {
        ...f,
        progressPct: progress,
        remainingDurationMins: remaining,
        elapsedFormatted: formatDurationHoursMins(f.elapsedDurationMins),
        remainingFormatted: formatDurationHoursMins(remaining),
        totalFormatted: formatDurationHoursMins(f.scheduledDurationMins),
      };
    });
  }

  getAllVessels() {
    return this.vessels.map((v) => {
      const progress = Math.min(
        100,
        Math.round((v.elapsedDurationHours / v.scheduledDurationHours) * 100)
      );
      const remaining = Math.max(0, Math.round(v.scheduledDurationHours - v.elapsedDurationHours));
      return {
        ...v,
        progressPct: progress,
        remainingDurationHours: remaining,
        elapsedFormatted: formatDurationDaysHours(v.elapsedDurationHours),
        remainingFormatted: formatDurationDaysHours(remaining),
        totalFormatted: formatDurationDaysHours(v.scheduledDurationHours),
      };
    });
  }

  searchFlights(query) {
    if (!query) return this.getAllFlights();
    const q = query.toLowerCase().trim();
    return this.getAllFlights().filter(
      (f) =>
        f.flightNumber.toLowerCase().includes(q) ||
        f.callsign.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        f.origin.code.toLowerCase().includes(q) ||
        f.origin.city.toLowerCase().includes(q) ||
        f.destination.code.toLowerCase().includes(q) ||
        f.destination.city.toLowerCase().includes(q)
    );
  }

  searchVessels(query) {
    if (!query) return this.getAllVessels();
    const q = query.toLowerCase().trim();
    return this.getAllVessels().filter(
      (v) =>
        v.vesselName.toLowerCase().includes(q) ||
        v.mmsi.includes(q) ||
        v.imo.includes(q) ||
        v.operator.toLowerCase().includes(q) ||
        v.originPort.name.toLowerCase().includes(q) ||
        v.destPort.name.toLowerCase().includes(q) ||
        v.originPort.code.toLowerCase().includes(q) ||
        v.destPort.code.toLowerCase().includes(q)
    );
  }
}

export const globalTracker = new FlightMaritimeTrackerService();

