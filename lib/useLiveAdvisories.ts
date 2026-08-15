"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Advisory } from "@/data/fallbackAdvisories";
import { advisoriesFor } from "@/data/advisories";
import {
  type Scenario,
  shelterIsSafe,
  roadIsOpen,
  coneReachKm,
} from "@/data/scenarios";

const CLIENT_TIMEOUT_MS = 4000;
const VALID_URGENCY = new Set(["ADVISORY", "WARNING", "EVACUATE"]);

/**
 * Optional live-AI advisories. Tries /api/advise once per scenario+hour with
 * a 4s timeout and an in-memory cache; on ANY failure the canned/generated
 * advisory is used silently. Returns the advisory list (overridden where live
 * results exist) and whether the current hour is live.
 */
export function useLiveAdvisories(scenario: Scenario, currentHour: number) {
  const baseAdvisories = advisoriesFor(scenario);
  const hourIdx = Math.min(
    baseAdvisories.length - 1,
    Math.max(0, Math.floor(currentHour))
  );
  const cacheKey = `${scenario.id}:${hourIdx}`;
  const [live, setLive] = useState<Map<string, Advisory>>(() => new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const failedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const key = cacheKey;
    const hour = hourIdx;
    if (live.has(key) || inFlightRef.current.has(key) || failedRef.current.has(key))
      return;
    inFlightRef.current.add(key);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    fetch("/api/advise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hour,
        region: scenario.region,
        coneReachKm: coneReachKm(scenario, hour),
        shelterStatuses: scenario.shelters.map((s) => ({
          name: s.name,
          safe: shelterIsSafe(scenario, s, hour),
        })),
        roadStatuses: scenario.roads.map((r) => ({
          name: r.name,
          open: roadIsOpen(scenario, r, hour),
        })),
        windKmh: scenario.wind.speedKmh,
        bearingDeg: scenario.wind.bearingDeg,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const a = await res.json();
        if (
          a.ok !== true ||
          typeof a.headline !== "string" ||
          typeof a.advisory_en !== "string" ||
          typeof a.advisory_hi !== "string" ||
          !VALID_URGENCY.has(a.urgency)
        )
          throw new Error("shape");
        setLive((old) => new Map(old).set(key, a as Advisory));
      })
      .catch(() => {
        // Silent: the fallback advisory simply stays in place.
        failedRef.current.add(key);
      })
      .finally(() => {
        clearTimeout(timeout);
        inFlightRef.current.delete(key);
      });
    // NOTE: no cleanup abort — a request outliving its hour is still cacheable.
  }, [cacheKey, hourIdx, live, scenario]);

  const advisories = useMemo(
    () => baseAdvisories.map((fb, i) => live.get(`${scenario.id}:${i}`) ?? fb),
    [baseAdvisories, live, scenario.id]
  );

  return { advisories, isLive: live.has(cacheKey) };
}
