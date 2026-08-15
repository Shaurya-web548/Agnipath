// Rule-based intelligence for Command Mode: resource recommendations and a
// local (offline) question answerer. The live Gemini layer sits on top and
// falls back to these silently.

import {
  type Scenario,
  type SimParams,
  timeToThreatMin,
  coneReachKm,
  effectiveRateKmh,
  effectiveBearing,
  bearingToCompass,
  zonePriorities,
} from "@/data/scenarios";

export type StatusMap = Record<string, boolean>;

export function resourceRecommendations(
  s: Scenario,
  hour: number,
  shelterStatus: StatusMap,
  roadStatus: StatusMap,
  p?: SimParams
): string[] {
  const recs: string[] = [];
  const compass = bearingToCompass(effectiveBearing(s, p));
  const fireUnits = s.resources.filter((r) => r.id.startsWith("F"));
  const ambulances = s.resources.filter((r) => r.id.startsWith("A"));
  const safeShelters = s.shelters.filter((x) => shelterStatus[x.name]);

  // Shelters about to fall inside the cone: evacuate pre-emptively.
  for (const sh of s.shelters) {
    if (!shelterStatus[sh.name]) continue;
    const eta = timeToThreatMin(s, sh, hour, p);
    if (eta !== null && eta > 0 && eta <= 60) {
      recs.push(
        `Begin clearing ${sh.name} — projected inside the danger zone in ~${eta} min.`
      );
      if (ambulances[0])
        recs.push(
          `Move ${ambulances[0].name} (${ambulances[0].base}) to ${sh.name} for transfers.`
        );
    }
  }

  // Closed shelters: redirect arrivals.
  const closed = s.shelters.filter((x) => !shelterStatus[x.name]);
  if (closed.length && safeShelters.length) {
    const nearest = [...safeShelters].sort(
      (a, b) => a.distanceKm - b.distanceKm
    )[0];
    recs.push(
      `Redirect arrivals from ${closed.map((c) => c.name).join(" and ")} to ${nearest.name}.`
    );
  }

  // Closed roads: staff the checkpoints.
  for (const rd of s.roads) {
    if (!roadStatus[rd.name])
      recs.push(`Staff ⛔ ${rd.name}; divert traffic away from the ${compass} corridor.`);
  }

  // Always: pre-position a fire unit downwind.
  if (fireUnits.length)
    recs.push(
      `Pre-position ${fireUnits[0].name} (${fireUnits[0].base}) on the ${compass} flank, beyond the projected front.`
    );

  return recs.slice(0, 5);
}

export type AssistantContext = {
  scenario: Scenario;
  hour: number;
  params: SimParams;
  shelterStatus: StatusMap;
  roadStatus: StatusMap;
};

/** Offline question answerer — grounded in the same simulation numbers. */
export function answerLocally(question: string, ctx: AssistantContext): string {
  const q = question.toLowerCase();
  const { scenario: s, hour, params: p } = ctx;
  const closedShelters = s.shelters.filter((x) => !ctx.shelterStatus[x.name]);
  const safeShelters = s.shelters.filter((x) => ctx.shelterStatus[x.name]);
  const closedRoads = s.roads.filter((x) => !ctx.roadStatus[x.name]);
  const reach = coneReachKm(s, hour, p);
  const compass = bearingToCompass(effectiveBearing(s, p));

  if (/(evacuate|priorit)/.test(q) && /(first|area|zone|which|order)/.test(q)) {
    const zp = zonePriorities(s, hour, p).slice(0, 3);
    return zp
      .map(
        (z) =>
          `${z.zone.name} (${z.zone.population.toLocaleString("en-IN")} people, risk ${z.riskPct}%) — ${z.label}`
      )
      .join("; ") + ". Priority = risk × population.";
  }

  if (/wind/.test(q) && /(increase|change|stronger|faster|what if|\+)/.test(q)) {
    const boosted = { ...p, windSpeedKmh: p.windSpeedKmh + 20 };
    const rate = effectiveRateKmh(s, boosted);
    const first = [...s.shelters].sort((a, b) => a.distanceKm - b.distanceKm)
      .find((sh) => timeToThreatMin(s, sh, 0, boosted) !== null);
    const eta = first ? timeToThreatMin(s, first, hour, boosted) : null;
    return `At +20 km/h wind the spread rate rises to ~${rate.toFixed(1)} km/h${
      first && eta !== null
        ? `; ${first.name} would be threatened in ~${eta} min`
        : ""
    }. Use the What-if sliders to see the cone change live.`;
  }

  if (/shelter/.test(q)) {
    return `${closedShelters.length ? `Closed: ${closedShelters.map((x) => x.name).join(", ")}. ` : "All shelters are open. "}Safe: ${safeShelters.map((x) => x.name).join(", ")}.`;
  }

  if (/road|checkpoint|route/.test(q)) {
    return closedRoads.length
      ? `Closed roads: ${closedRoads.map((x) => x.name).join(", ")}. Keep the ${compass} corridor clear for crews.`
      : "All monitored road checkpoints are open.";
  }

  // Default: situation summary.
  return `H+${Math.floor(hour)}: danger zone ~${reach.toFixed(1)} km toward ${compass}, wind ${p.windSpeedKmh} km/h. ${closedShelters.length} shelter(s) and ${closedRoads.length} road(s) closed. ${safeShelters.length} shelters remain safe.`;
}
