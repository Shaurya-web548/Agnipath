"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fallbackAdvisories,
  type Advisory,
} from "@/data/fallbackAdvisories";
import { shelters, shelterIsSafe, coneReachKm, wind } from "@/data/scenario";

const CLIENT_TIMEOUT_MS = 4000;
const VALID_URGENCY = new Set(["ADVISORY", "WARNING", "EVACUATE"]);

/**
 * Optional live-AI advisories. Tries /api/advise once per whole hour with a
 * 4s timeout and an in-memory cache; on ANY failure the canned fallback is
 * used silently. Returns the advisory list (fallback overridden where live
 * results exist) and whether the current hour is live.
 */
export function useLiveAdvisories(currentHour: number) {
  const hourIdx = Math.min(
    fallbackAdvisories.length - 1,
    Math.max(0, Math.floor(currentHour))
  );
  const [liveByHour, setLiveByHour] = useState<Map<number, Advisory>>(
    () => new Map()
  );
  const inFlightRef = useRef<Set<number>>(new Set());
  const failedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const hour = hourIdx;
    if (
      liveByHour.has(hour) ||
      inFlightRef.current.has(hour) ||
      failedRef.current.has(hour)
    )
      return;
    inFlightRef.current.add(hour);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    fetch("/api/advise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hour,
        coneReachKm: coneReachKm(hour),
        shelterStatuses: shelters.map((s) => ({
          name: s.name,
          safe: shelterIsSafe(s, hour),
        })),
        windKmh: wind.speedKmh,
        bearingDeg: wind.bearingDeg,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const a = await res.json();
        if (
          typeof a.headline !== "string" ||
          typeof a.advisory_en !== "string" ||
          typeof a.advisory_hi !== "string" ||
          !VALID_URGENCY.has(a.urgency)
        )
          throw new Error("shape");
        setLiveByHour((old) => new Map(old).set(hour, a as Advisory));
      })
      .catch(() => {
        // Silent: the fallback advisory simply stays in place.
        failedRef.current.add(hour);
      })
      .finally(() => {
        clearTimeout(timeout);
        inFlightRef.current.delete(hour);
      });
    // NOTE: no cleanup abort — a request outliving its hour is still cacheable.
  }, [hourIdx, liveByHour]);

  const advisories = useMemo(
    () =>
      fallbackAdvisories.map((fb, i) => liveByHour.get(i) ?? fb),
    [liveByHour]
  );

  return { advisories, isLive: liveByHour.has(hourIdx) };
}
