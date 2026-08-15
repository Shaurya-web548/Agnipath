// All data hardcoded — FIRMS-style snapshots, representative of recent
// Himalayan fire seasons. The demo never depends on a live feed.

import { destinationPoint, pointInPolygon, type LatLng } from "@/lib/geo";

export type PointFeature = {
  name: string;
  bearingDeg: number;
  distanceKm: number;
  lat: number;
  lng: number;
};

export type Scenario = {
  id: string;
  name: string; // shown in the scenario picker
  region: string; // used in advisories
  fire: {
    lat: number;
    lng: number;
    detectedAt: string;
    confidence: "high" | "nominal";
  };
  wind: { speedKmh: number; bearingDeg: number };
  spreadRateKmhDownwind: number; // cone radius = rate × hour
  coneHalfAngleDeg: number;
  smokeExtraHalfAngleDeg: number; // smoke plume = wider, longer cone
  smokeRadiusFactor: number;
  shelters: PointFeature[];
  roads: PointFeature[]; // road checkpoints that close when the cone reaches them
};

function place(
  fire: { lat: number; lng: number },
  defs: { name: string; bearingDeg: number; distanceKm: number }[]
): PointFeature[] {
  return defs.map((d) => ({
    ...d,
    ...destinationPoint(fire.lat, fire.lng, d.bearingDeg, d.distanceKm),
  }));
}

const uttarakhandFire = {
  lat: 29.38,
  lng: 79.46,
  detectedAt: "05:40 IST",
  confidence: "high" as const,
};

const himachalFire = {
  lat: 31.1,
  lng: 77.2,
  detectedAt: "06:15 IST",
  confidence: "high" as const,
};

export const scenarios: Scenario[] = [
  {
    id: "uttarakhand",
    name: "Uttarakhand — Bhowali forest",
    region: "Bhowali forest, Uttarakhand",
    fire: uttarakhandFire,
    wind: { speedKmh: 18, bearingDeg: 45 }, // blowing toward the northeast
    spreadRateKmhDownwind: 1.8,
    coneHalfAngleDeg: 30,
    smokeExtraHalfAngleDeg: 18,
    smokeRadiusFactor: 1.6,
    shelters: place(uttarakhandFire, [
      { name: "Bhowali School Shelter", bearingDeg: 45, distanceKm: 4 }, // ~H+2
      { name: "Jeolikote Panchayat Bhawan", bearingDeg: 30, distanceKm: 8 }, // ~H+4.5
      { name: "Nainital Community Hall", bearingDeg: 200, distanceKm: 5 },
      { name: "Haldwani Relief Camp", bearingDeg: 160, distanceKm: 9 },
      { name: "Ramgarh Health Centre", bearingDeg: 300, distanceKm: 6 },
    ]),
    roads: place(uttarakhandFire, [
      { name: "Bhowali road checkpoint", bearingDeg: 50, distanceKm: 2.5 }, // ~H+1.4
      { name: "Jeolikote bypass", bearingDeg: 25, distanceKm: 6 }, // ~H+3.3
    ]),
  },
  {
    id: "himachal",
    name: "Himachal — Shimla forest belt",
    region: "Shimla forest belt, Himachal Pradesh",
    fire: himachalFire,
    wind: { speedKmh: 14, bearingDeg: 135 }, // blowing toward the southeast
    spreadRateKmhDownwind: 1.5,
    coneHalfAngleDeg: 35,
    smokeExtraHalfAngleDeg: 15,
    smokeRadiusFactor: 1.5,
    shelters: place(himachalFire, [
      { name: "Mashobra Relief Point", bearingDeg: 135, distanceKm: 3.5 }, // ~H+2.3
      { name: "Kufri Community Centre", bearingDeg: 120, distanceKm: 7 }, // ~H+4.7
      { name: "Shimla Ridge Camp", bearingDeg: 250, distanceKm: 5 },
      { name: "Solan District Camp", bearingDeg: 185, distanceKm: 10 },
      { name: "Naldehra Health Post", bearingDeg: 40, distanceKm: 6 },
    ]),
    roads: place(himachalFire, [
      { name: "Kufri road checkpoint", bearingDeg: 130, distanceKm: 3 }, // ~H+2
      { name: "Fagu bend checkpoint", bearingDeg: 150, distanceKm: 6 }, // ~H+4
    ]),
  },
];

export const defaultScenario = scenarios[0];

export const coneReachKm = (s: Scenario, hour: number) =>
  Math.max(0, hour) * s.spreadRateKmhDownwind;

export const smokeReachKm = (s: Scenario, hour: number) =>
  coneReachKm(s, hour) * s.smokeRadiusFactor;

function sectorPolygon(
  s: Scenario,
  radiusKm: number,
  halfAngleDeg: number
): LatLng[] {
  if (!(radiusKm > 0)) return []; // also rejects NaN
  const points: LatLng[] = [{ lat: s.fire.lat, lng: s.fire.lng }];
  for (
    let b = s.wind.bearingDeg - halfAngleDeg;
    b <= s.wind.bearingDeg + halfAngleDeg;
    b += 5
  ) {
    points.push(destinationPoint(s.fire.lat, s.fire.lng, b, radiusKm));
  }
  return points;
}

export const conePolygon = (s: Scenario, hour: number) =>
  sectorPolygon(s, coneReachKm(s, hour), s.coneHalfAngleDeg);

export const smokePolygon = (s: Scenario, hour: number) =>
  sectorPolygon(
    s,
    smokeReachKm(s, hour),
    s.coneHalfAngleDeg + s.smokeExtraHalfAngleDeg
  );

export const insideCone = (s: Scenario, p: LatLng, hour: number) =>
  pointInPolygon(p, conePolygon(s, hour));

export const shelterIsSafe = (s: Scenario, shelter: PointFeature, hour: number) =>
  !insideCone(s, shelter, hour);

export const roadIsOpen = (s: Scenario, road: PointFeature, hour: number) =>
  !insideCone(s, road, hour);

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export const bearingToCompass = (deg: number) =>
  COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
