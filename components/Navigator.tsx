"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  type Scenario,
  helplines,
  coneReachKm,
  smokeReachKm,
  shelterIsSafe,
  roadIsOpen,
  bearingToCompass,
} from "@/data/scenarios";
import type { MapFocus } from "@/components/FireMap";

export type AppMode = "sim" | "shelters" | "briefing";

const MODES: { id: AppMode; label: string }[] = [
  { id: "sim", label: "🎬 Simulation" },
  { id: "shelters", label: "🧭 Find shelter" },
  { id: "briefing", label: "📋 Briefing" },
];

export function NavTabs({
  mode,
  onMode,
}: {
  mode: AppMode;
  onMode: (m: AppMode) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 2 }}
      className="absolute left-5 top-[86px] z-[1000] flex overflow-hidden rounded-xl border border-white/10 bg-black/70 text-xs shadow-xl backdrop-blur-md"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onMode(m.id)}
          className={`px-3 py-2 transition-colors ${
            mode === m.id
              ? "bg-orange-600/80 text-white"
              : "text-neutral-300 hover:bg-white/10"
          }`}
        >
          {m.label}
        </button>
      ))}
    </motion.div>
  );
}

export function ShelterFinder({
  scenario,
  currentHour,
  onLocate,
}: {
  scenario: Scenario;
  currentHour: number;
  onLocate: (f: MapFocus) => void;
}) {
  const rows = scenario.shelters
    .map((s) => ({ ...s, safe: shelterIsSafe(scenario, s, currentHour) }))
    .sort((a, b) =>
      a.safe !== b.safe ? (a.safe ? -1 : 1) : a.distanceKm - b.distanceKm
    );
  const nearestSafe = rows.find((r) => r.safe);

  return (
    <div className="w-72 rounded-xl border border-white/10 bg-black/70 p-3.5 shadow-xl backdrop-blur-md">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Where should I go? · H+{Math.floor(currentHour)}
      </div>
      <div className="space-y-1.5">
        {rows.map((s) => (
          <div
            key={s.name}
            className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
              s.safe
                ? s.name === nearestSafe?.name
                  ? "border-green-400/50 bg-green-500/15"
                  : "border-white/10 bg-white/5"
                : "border-red-500/30 bg-red-950/40 opacity-70"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-neutral-100">
                {s.name}
                {s.name === nearestSafe?.name && (
                  <span className="ml-1.5 text-[10px] font-semibold text-green-300">
                    NEAREST SAFE
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400">
                {s.distanceKm} km {bearingToCompass(s.bearingDeg)} ·{" "}
                <span className={s.safe ? "text-green-400" : "text-red-400"}>
                  {s.safe ? "SAFE" : "UNSAFE"}
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                onLocate({ lat: s.lat, lng: s.lng, nonce: Date.now() })
              }
              className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/10"
            >
              Locate
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-red-300">
          Emergency helplines
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {helplines.map((h) => (
            <span key={h.number} className="text-neutral-300">
              <span className="font-mono font-bold text-red-300">
                {h.number}
              </span>{" "}
              {h.label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-neutral-500">
        Distances are straight-line from the fire point. Follow official routes
        on the ground.
      </p>
    </div>
  );
}

export function BriefingPanel({
  scenario,
  currentHour,
}: {
  scenario: Scenario;
  currentHour: number;
}) {
  const h = Math.floor(currentHour);
  const closedShelters = scenario.shelters.filter(
    (s) => !shelterIsSafe(scenario, s, currentHour)
  );
  const closedRoads = scenario.roads.filter(
    (r) => !roadIsOpen(scenario, r, currentHour)
  );
  const compass = bearingToCompass(scenario.wind.bearingDeg);

  return (
    <div className="w-72 rounded-xl border border-white/10 bg-black/70 p-3.5 shadow-xl backdrop-blur-md">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Situation briefing · H+{h}
      </div>
      <dl className="space-y-1.5 text-xs text-neutral-300">
        <div>
          <dt className="font-semibold text-neutral-100">Fire</dt>
          <dd>
            Detected {scenario.fire.detectedAt} near {scenario.region} (
            {scenario.fire.confidence} confidence).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-100">Spread</dt>
          <dd>
            Danger zone {coneReachKm(scenario, currentHour).toFixed(1)} km{" "}
            {compass}; smoke and low visibility to{" "}
            {smokeReachKm(scenario, currentHour).toFixed(1)} km. Wind{" "}
            {scenario.wind.speedKmh} km/h toward {compass}.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-100">Shelters closed</dt>
          <dd>
            {closedShelters.length
              ? closedShelters.map((s) => s.name).join(", ")
              : "None — all shelters open."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-100">Roads closed</dt>
          <dd>
            {closedRoads.length
              ? closedRoads.map((r) => r.name).join(", ")
              : "None — all monitored roads open."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-100">Priority</dt>
          <dd>
            {closedShelters.length
              ? "Clear the danger cone; route evacuees to the remaining safe shelters, keep downwind roads free for crews."
              : "Pre-position crews downwind; brief shelters on likely arrivals."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-100">Authority actions</dt>
          <dd>
            Broadcast this hour&apos;s advisory (panel on the right, EN/हिन्दी),
            update shelter and road status boards, staff the ⛔ checkpoints.
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function AboutModal({
  open,
  welcome,
  scenario,
  onClose,
  onPickMode,
}: {
  open: boolean;
  welcome: boolean;
  scenario: Scenario;
  onClose: () => void;
  onPickMode: (m: AppMode) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl"
          >
            <h1 className="text-xl font-semibold">
              🔥 AgniPath — Wildfire Evacuation Planner
            </h1>

            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-red-300">
                In a real emergency, call
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                {helplines.map((h) => (
                  <span key={h.number} className="text-neutral-200">
                    <span className="font-mono font-bold text-red-300">
                      {h.number}
                    </span>{" "}
                    <span className="text-xs text-neutral-400">{h.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(
                [
                  ["sim", "🎬 Watch the simulation", "Replay the 6-hour spread story with PLAY."],
                  ["shelters", "🧭 Find a safe shelter", "For residents: ranked shelters, nearest safe first, plus helplines."],
                  ["briefing", "📋 Situation briefing", "For authorities: closures at a glance, hourly EN/हिन्दी advisory drafts ready to broadcast."],
                ] as [AppMode, string, string][]
              ).map(([id, label, desc]) => (
                <button
                  key={id}
                  onClick={() => {
                    onPickMode(id);
                    onClose();
                  }}
                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left hover:border-orange-400/40 hover:bg-orange-500/10"
                >
                  <div className="text-sm font-medium text-neutral-100">
                    {label}
                  </div>
                  <div className="text-xs text-neutral-400">{desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Why {scenario.name.split(" — ")[0]}?
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-neutral-400">
                {scenario.whyHere}
              </p>
            </div>

            <p className="mt-3 text-[11px] leading-snug text-neutral-500">
              Simplified wind-cone model on snapshot data — a communication
              prototype, not a fire-behaviour model. Press R for recording mode.
            </p>
            {!welcome && (
              <button
                onClick={onClose}
                className="mt-3 w-full rounded-lg border border-white/15 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
              >
                Close
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
