// FIRMS-style snapshot, representative of the 2024 Uttarakhand fire season.
// All data hardcoded — the demo never depends on a live feed.

import { destinationPoint, pointInPolygon, type LatLng } from "@/lib/geo";

export const fire = {
  lat: 29.38,
  lng: 79.46,
  detectedAt: "05:40 IST",
  confidence: "high" as const,
};

export const wind = {
  speedKmh: 18,
  bearingDeg: 45, // blowing toward the northeast
};

export const spreadRateKmhDownwind = 1.8; // cone radius = rate × hour
export const coneHalfAngleDeg = 30;

export type Shelter = {
  name: string;
  bearingDeg: number;
  distanceKm: number;
  lat: number;
  lng: number;
};

const shelterDefs: Array<Pick<Shelter, "name" | "bearingDeg" | "distanceKm">> =
  [
    { name: "Bhowali School Shelter", bearingDeg: 45, distanceKm: 4 }, // enters cone ~hour 2
    { name: "Jeolikote Panchayat Bhawan", bearingDeg: 30, distanceKm: 8 }, // enters cone ~hour 4-5
    { name: "Nainital Community Hall", bearingDeg: 200, distanceKm: 5 }, // always safe
    { name: "Haldwani Relief Camp", bearingDeg: 160, distanceKm: 9 }, // always safe
    { name: "Ramgarh Health Centre", bearingDeg: 300, distanceKm: 6 }, // always safe
  ];

export const shelters: Shelter[] = shelterDefs.map((s) => ({
  ...s,
  ...destinationPoint(fire.lat, fire.lng, s.bearingDeg, s.distanceKm),
}));

export const coneReachKm = (hour: number) =>
  Math.max(0, hour) * spreadRateKmhDownwind;

/**
 * Sector polygon: apex at the fire, central bearing = wind bearing,
 * arc points every 5°. Empty until the cone has any reach.
 */
export function conePolygon(hour: number): LatLng[] {
  const radius = coneReachKm(hour);
  if (!(radius > 0)) return []; // also rejects NaN
  const points: LatLng[] = [{ lat: fire.lat, lng: fire.lng }];
  const from = wind.bearingDeg - coneHalfAngleDeg;
  const to = wind.bearingDeg + coneHalfAngleDeg;
  for (let b = from; b <= to; b += 5) {
    points.push(destinationPoint(fire.lat, fire.lng, b, radius));
  }
  return points;
}

export function shelterIsSafe(shelter: Shelter, hour: number): boolean {
  return !pointInPolygon(shelter, conePolygon(hour));
}
