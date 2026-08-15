// All data hardcoded — FIRMS-style snapshots, representative of recent
// Himalayan fire seasons. The demo never depends on a live feed.

import {
  destinationPoint,
  distanceKm,
  bearingBetween,
  angleDiff,
  type LatLng,
} from "@/lib/geo";

export type PointFeature = {
  name: string;
  bearingDeg: number;
  distanceKm: number;
  lat: number;
  lng: number;
};

export type ShelterFeature = PointFeature & {
  capacity: number;
  occupancyPct: number; // snapshot occupancy at hour 0
};

export type InfraFeature = PointFeature & { icon: string; kind: string };

export type ZoneFeature = PointFeature & {
  radiusKm: number;
  population: number;
};

export type ResourceUnit = { id: string; name: string; base: string };

export type Scenario = {
  id: string;
  name: string;
  region: string;
  fire: {
    lat: number;
    lng: number;
    detectedAt: string;
    confidence: "high" | "nominal";
  };
  wind: { speedKmh: number; bearingDeg: number };
  spreadRateKmhDownwind: number;
  coneHalfAngleDeg: number;
  smokeExtraHalfAngleDeg: number;
  smokeRadiusFactor: number;
  shelters: ShelterFeature[];
  roads: PointFeature[];
  infrastructure: InfraFeature[];
  zones: ZoneFeature[];
  resources: ResourceUnit[];
  whyHere: string;
};

// What-if parameters — default to the scenario snapshot; judges can tweak.
export type SimParams = {
  windSpeedKmh: number;
  windBearingDeg: number;
  tempC: number;
  humidityPct: number;
};

export const defaultParams = (s: Scenario): SimParams => ({
  windSpeedKmh: s.wind.speedKmh,
  windBearingDeg: s.wind.bearingDeg,
  tempC: 32,
  humidityPct: 40,
});

// Real, well-known Indian emergency numbers — shown to residents.
export const helplines = [
  { number: "112", label: "All emergencies" },
  { number: "101", label: "Fire" },
  { number: "108", label: "Ambulance" },
  { number: "1070", label: "State disaster control room" },
];

function place<T extends { bearingDeg: number; distanceKm: number }>(
  fire: { lat: number; lng: number },
  defs: T[]
): (T & LatLng)[] {
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
    wind: { speedKmh: 18, bearingDeg: 45 },
    spreadRateKmhDownwind: 1.8,
    coneHalfAngleDeg: 30,
    smokeExtraHalfAngleDeg: 18,
    smokeRadiusFactor: 1.6,
    shelters: place(uttarakhandFire, [
      { name: "Bhowali School Shelter", bearingDeg: 45, distanceKm: 4, capacity: 350, occupancyPct: 38 },
      { name: "Jeolikote Panchayat Bhawan", bearingDeg: 30, distanceKm: 8, capacity: 200, occupancyPct: 22 },
      { name: "Nainital Community Hall", bearingDeg: 200, distanceKm: 5, capacity: 600, occupancyPct: 47 },
      { name: "Haldwani Relief Camp", bearingDeg: 160, distanceKm: 9, capacity: 1200, occupancyPct: 31 },
      { name: "Ramgarh Health Centre", bearingDeg: 300, distanceKm: 6, capacity: 150, occupancyPct: 68 },
    ]),
    roads: place(uttarakhandFire, [
      { name: "Bhowali road checkpoint", bearingDeg: 50, distanceKm: 2.5 },
      { name: "Jeolikote bypass", bearingDeg: 25, distanceKm: 6 },
    ]),
    infrastructure: place(uttarakhandFire, [
      { name: "Bhowali power substation", bearingDeg: 55, distanceKm: 3, icon: "⚡", kind: "power" },
      { name: "Jeolikote telecom tower", bearingDeg: 28, distanceKm: 7, icon: "📶", kind: "telecom" },
      { name: "Nainital district hospital", bearingDeg: 195, distanceKm: 4.5, icon: "🏥", kind: "health" },
      { name: "Bhimtal water works", bearingDeg: 100, distanceKm: 6, icon: "💧", kind: "water" },
    ]),
    zones: place(uttarakhandFire, [
      { name: "Bhowali town", bearingDeg: 45, distanceKm: 3.5, radiusKm: 1.2, population: 6200 },
      { name: "Jeolikote village", bearingDeg: 30, distanceKm: 7.5, radiusKm: 1.0, population: 2100 },
      { name: "Nainital town", bearingDeg: 200, distanceKm: 5.5, radiusKm: 1.6, population: 41000 },
      { name: "Ramgarh belt", bearingDeg: 300, distanceKm: 6, radiusKm: 1.2, population: 3400 },
    ]),
    resources: [
      { id: "F1", name: "Fire Unit NTL-1", base: "Nainital" },
      { id: "F2", name: "Fire Unit HLD-2", base: "Haldwani" },
      { id: "A1", name: "Ambulance 108/1", base: "Bhowali PHC" },
      { id: "A2", name: "Ambulance 108/2", base: "Haldwani" },
      { id: "W1", name: "Water tanker WT-3", base: "Bhimtal" },
    ],
    whyHere:
      "Uttarakhand's chir-pine belts are among India's most fire-prone forests. In the April–May 2024 season, over a thousand forest fires were recorded in the state, including major fires in the Nainital hills around Bhowali and Jeolikote — the exact geography this snapshot represents.",
  },
  {
    id: "himachal",
    name: "Himachal — Shimla forest belt",
    region: "Shimla forest belt, Himachal Pradesh",
    fire: himachalFire,
    wind: { speedKmh: 14, bearingDeg: 135 },
    spreadRateKmhDownwind: 1.5,
    coneHalfAngleDeg: 35,
    smokeExtraHalfAngleDeg: 15,
    smokeRadiusFactor: 1.5,
    shelters: place(himachalFire, [
      { name: "Mashobra Relief Point", bearingDeg: 135, distanceKm: 3.5, capacity: 250, occupancyPct: 30 },
      { name: "Kufri Community Centre", bearingDeg: 120, distanceKm: 7, capacity: 300, occupancyPct: 25 },
      { name: "Shimla Ridge Camp", bearingDeg: 250, distanceKm: 5, capacity: 900, occupancyPct: 52 },
      { name: "Solan District Camp", bearingDeg: 185, distanceKm: 10, capacity: 800, occupancyPct: 18 },
      { name: "Naldehra Health Post", bearingDeg: 40, distanceKm: 6, capacity: 120, occupancyPct: 61 },
    ]),
    roads: place(himachalFire, [
      { name: "Kufri road checkpoint", bearingDeg: 130, distanceKm: 3 },
      { name: "Fagu bend checkpoint", bearingDeg: 150, distanceKm: 6 },
    ]),
    infrastructure: place(himachalFire, [
      { name: "Shimla power substation", bearingDeg: 245, distanceKm: 4, icon: "⚡", kind: "power" },
      { name: "Kufri telecom tower", bearingDeg: 125, distanceKm: 5.5, icon: "📶", kind: "telecom" },
      { name: "IGMC hospital", bearingDeg: 255, distanceKm: 5.5, icon: "🏥", kind: "health" },
      { name: "Mashobra water works", bearingDeg: 110, distanceKm: 4, icon: "💧", kind: "water" },
    ]),
    zones: place(himachalFire, [
      { name: "Mashobra", bearingDeg: 135, distanceKm: 3, radiusKm: 1.0, population: 4800 },
      { name: "Kufri", bearingDeg: 122, distanceKm: 6.5, radiusKm: 1.1, population: 3200 },
      { name: "Shimla city fringe", bearingDeg: 250, distanceKm: 5, radiusKm: 1.8, population: 62000 },
    ]),
    resources: [
      { id: "F1", name: "Fire Unit SML-1", base: "Shimla" },
      { id: "F2", name: "Fire Unit SML-4", base: "Dhalli" },
      { id: "A1", name: "Ambulance 108/7", base: "Sanjauli" },
      { id: "W1", name: "Water tanker WT-1", base: "Mashobra" },
    ],
    whyHere:
      "Himachal's Shimla forest belt shares the same chir-pine fire ecology and reported hundreds of forest fires in recent dry summers, with tourist towns like Kufri and Mashobra sitting directly against forest edges.",
  },
];

export const defaultScenario = scenarios[0];

// ── Parameterized spread model ──────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Wind, temperature and humidity scale the base downwind spread rate. */
export function effectiveRateKmh(s: Scenario, p?: SimParams): number {
  const pp = p ?? defaultParams(s);
  const windFactor = pp.windSpeedKmh / s.wind.speedKmh;
  const tempFactor = 1 + (pp.tempC - 32) * 0.02;
  const humidityFactor = 1 - (pp.humidityPct - 40) * 0.008;
  return clamp(
    s.spreadRateKmhDownwind * windFactor * tempFactor * humidityFactor,
    0.2,
    6
  );
}

export const effectiveBearing = (s: Scenario, p?: SimParams) =>
  p?.windBearingDeg ?? s.wind.bearingDeg;

export const coneReachKm = (s: Scenario, hour: number, p?: SimParams) =>
  Math.max(0, hour) * effectiveRateKmh(s, p);

export const smokeReachKm = (s: Scenario, hour: number, p?: SimParams) =>
  coneReachKm(s, hour, p) * s.smokeRadiusFactor;

function sectorPolygon(
  s: Scenario,
  radiusKm: number,
  halfAngleDeg: number,
  centralBearing: number
): LatLng[] {
  if (!(radiusKm > 0)) return []; // also rejects NaN
  const points: LatLng[] = [{ lat: s.fire.lat, lng: s.fire.lng }];
  for (
    let b = centralBearing - halfAngleDeg;
    b <= centralBearing + halfAngleDeg;
    b += 5
  ) {
    points.push(destinationPoint(s.fire.lat, s.fire.lng, b, radiusKm));
  }
  return points;
}

/**
 * Probability bands for the spread forecast (inner = highest likelihood).
 * Honest labelling: model bands, not ML output.
 */
export const SPREAD_BANDS = [
  { label: "≥70%", radiusScale: 1, extraHalfAngle: 0, fillOpacity: 0.25 },
  { label: "~40%", radiusScale: 1.25, extraHalfAngle: 8, fillOpacity: 0.12 },
  { label: "~15%", radiusScale: 1.55, extraHalfAngle: 16, fillOpacity: 0.06 },
] as const;

export const conePolygon = (
  s: Scenario,
  hour: number,
  p?: SimParams,
  radiusScale = 1,
  extraHalfAngle = 0
) =>
  sectorPolygon(
    s,
    coneReachKm(s, hour, p) * radiusScale,
    s.coneHalfAngleDeg + extraHalfAngle,
    effectiveBearing(s, p)
  );

export const smokePolygon = (s: Scenario, hour: number, p?: SimParams) =>
  sectorPolygon(
    s,
    smokeReachKm(s, hour, p),
    s.coneHalfAngleDeg + s.smokeExtraHalfAngleDeg,
    effectiveBearing(s, p)
  );

// ── Threat analysis (analytic — consistent with the drawn inner cone) ───

/** Is a bearing/distance feature inside the (inner) danger cone now? */
export function featureInCone(
  s: Scenario,
  f: { bearingDeg: number; distanceKm: number },
  hour: number,
  p?: SimParams
): boolean {
  const delta = angleDiff(f.bearingDeg, effectiveBearing(s, p));
  return delta <= s.coneHalfAngleDeg && coneReachKm(s, hour, p) >= f.distanceKm;
}

export const shelterIsSafe = (
  s: Scenario,
  f: { bearingDeg: number; distanceKm: number },
  hour: number,
  p?: SimParams
) => !featureInCone(s, f, hour, p);

export const roadIsOpen = shelterIsSafe;

/**
 * Simulation-minutes until the danger cone reaches the feature.
 * 0 = inside now; null = not in the projected path under current wind.
 */
export function timeToThreatMin(
  s: Scenario,
  f: { bearingDeg: number; distanceKm: number },
  hour: number,
  p?: SimParams
): number | null {
  const delta = angleDiff(f.bearingDeg, effectiveBearing(s, p));
  if (delta > s.coneHalfAngleDeg) return null;
  const remain = (f.distanceKm / effectiveRateKmh(s, p) - hour) * 60;
  return Math.max(0, Math.round(remain));
}

export const formatEta = (etaMin: number | null): string =>
  etaMin === null
    ? "not in projected path"
    : etaMin === 0
      ? "inside danger zone"
      : etaMin >= 90
        ? `~${(etaMin / 60).toFixed(1)} h to threat`
        : `~${etaMin} min to threat`;

// ── Risk scoring (explainable) ──────────────────────────────────────────

export type RiskFactor = { label: string; points: number };
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type RiskResult = {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  etaMin: number | null;
  distanceKm: number;
  action: string;
};

export function riskAt(
  s: Scenario,
  point: LatLng,
  hour: number,
  p?: SimParams
): RiskResult {
  const fire = { lat: s.fire.lat, lng: s.fire.lng };
  const d = distanceKm(fire, point);
  const b = bearingBetween(fire, point);
  const feature = { bearingDeg: b, distanceKm: d };
  const etaMin = timeToThreatMin(s, feature, hour, p);
  const delta = angleDiff(b, effectiveBearing(s, p));
  const factors: RiskFactor[] = [];
  let score: number;

  if (featureInCone(s, feature, hour, p)) {
    score = Math.min(100, Math.round(92 + (coneReachKm(s, hour, p) - d) * 2));
    factors.push({ label: "Inside projected fire zone", points: score });
  } else {
    const proximity = Math.round(clamp(35 - d * 3.5, 0, 35));
    if (proximity > 0)
      factors.push({ label: `${d.toFixed(1)} km from fire`, points: proximity });
    const alignment =
      delta <= s.coneHalfAngleDeg
        ? Math.round(30 * (1 - (delta / s.coneHalfAngleDeg) * 0.5))
        : delta <= s.coneHalfAngleDeg + 15
          ? 12
          : 0;
    if (alignment > 0)
      factors.push({
        label:
          delta <= s.coneHalfAngleDeg
            ? "Directly in wind path"
            : "Near edge of wind path",
        points: alignment,
      });
    const urgency =
      etaMin === null ? 0 : Math.round(clamp(35 - etaMin / 6, 0, 35));
    if (urgency > 0)
      factors.push({ label: `Fire ~${etaMin} min away`, points: urgency });
    score = Math.min(100, proximity + alignment + urgency);
  }

  const level: RiskLevel =
    score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MODERATE" : "LOW";
  const action =
    level === "CRITICAL"
      ? "Evacuate immediately via a southern route."
      : level === "HIGH"
        ? "Evacuate within the hour; keep helplines handy."
        : level === "MODERATE"
          ? "Prepare to leave; monitor advisories."
          : "No action needed; stay informed.";

  return { score, level, factors, etaMin, distanceKm: d, action };
}

// ── Zone prioritization ─────────────────────────────────────────────────

export type ZonePriority = {
  zone: ZoneFeature;
  riskPct: number;
  priority: number;
  label: "IMMEDIATE" | "HIGH" | "MONITOR" | "LOW";
};

export function zonePriorities(
  s: Scenario,
  hour: number,
  p?: SimParams
): ZonePriority[] {
  const rows = s.zones.map((zone) => {
    const eta = timeToThreatMin(s, zone, hour, p);
    const inside = featureInCone(s, zone, hour, p);
    const riskPct = inside
      ? 92
      : eta === null
        ? 8
        : Math.round(clamp(85 - eta / 4, 15, 85));
    return { zone, riskPct, priority: riskPct * zone.population };
  });
  rows.sort((a, b) => b.priority - a.priority);
  return rows.map((r, i) => ({
    ...r,
    label:
      r.riskPct >= 85
        ? "IMMEDIATE"
        : r.riskPct >= 50
          ? "HIGH"
          : r.riskPct >= 20 && i < 3
            ? "MONITOR"
            : "LOW",
  }));
}

// ── Confidence (decays with forecast horizon; honest, not ML) ───────────

export const spreadConfidencePct = (hour: number) =>
  Math.max(62, 88 - 3 * Math.floor(hour));

export const routeConfidencePct = () => 91;

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export const bearingToCompass = (deg: number) =>
  COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
