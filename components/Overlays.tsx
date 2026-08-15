"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  type Scenario,
  scenarios,
  coneReachKm,
  smokeReachKm,
  bearingToCompass,
} from "@/data/scenarios";

export function TitleChip({
  scenario,
  onScenarioChange,
  onAbout,
}: {
  scenario: Scenario;
  onScenarioChange: (id: string) => void;
  onAbout: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 1.2 }}
      className="absolute left-5 top-5 z-[1000]"
    >
      <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-semibold tracking-wide">
            🔥 AgniPath
          </span>
          <select
            value={scenario.id}
            onChange={(e) => onScenarioChange(e.target.value)}
            aria-label="Scenario region"
            className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-xs text-neutral-200 outline-none hover:border-white/30"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={onAbout}
            aria-label="About AgniPath"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs text-neutral-300 hover:bg-white/10"
          >
            ?
          </button>
        </div>
        <div className="mt-0.5 text-xs text-neutral-400">
          Simplified wind-cone model · snapshot data
        </div>
      </div>
    </motion.div>
  );
}

export function WindWidget({ scenario }: { scenario: Scenario }) {
  const compass = bearingToCompass(scenario.wind.bearingDeg);
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 2.2 }}
      className="rounded-xl border border-white/10 bg-black/70 p-3 shadow-xl backdrop-blur-md"
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Wind
      </div>
      <div className="relative h-16 w-16 overflow-hidden">
        <div className="wind-compass absolute inset-0 rounded-full border border-sky-300/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-2xl text-sky-300"
            style={{ transform: `rotate(${scenario.wind.bearingDeg}deg)` }}
          >
            ↑
          </div>
        </div>
        <div className="wind-streak s1" />
        <div className="wind-streak s2" />
        <div className="wind-streak s3" />
      </div>
      <div className="mt-1 text-center font-mono text-xs text-sky-200">
        {scenario.wind.speedKmh} km/h {compass}
      </div>
    </motion.div>
  );
}

export function StatsBar({
  scenario,
  currentHour,
  safeCount,
  roadsOpen,
}: {
  scenario: Scenario;
  currentHour: number;
  safeCount: number;
  roadsOpen: number;
}) {
  const reach = coneReachKm(scenario, currentHour);
  const smoke = smokeReachKm(scenario, currentHour);
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 2.5 }}
      className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 shadow-xl backdrop-blur-md"
    >
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Situation
      </div>
      <div className="space-y-1 font-mono text-sm tabular-nums">
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Fire reach</span>
          <span className="text-orange-300">{reach.toFixed(1)} km</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Smoke reach</span>
          <span className="text-slate-300">{smoke.toFixed(1)} km</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Shelters safe</span>
          <motion.span
            key={safeCount}
            initial={{ scale: 1.35, color: "#fca5a5" }}
            animate={{
              scale: 1,
              color:
                safeCount === scenario.shelters.length ? "#86efac" : "#fcd34d",
            }}
            transition={{ duration: 0.45 }}
            className="inline-block"
          >
            {safeCount}/{scenario.shelters.length}
          </motion.span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Roads open</span>
          <motion.span
            key={roadsOpen}
            initial={{ scale: 1.35, color: "#fca5a5" }}
            animate={{
              scale: 1,
              color:
                roadsOpen === scenario.roads.length ? "#86efac" : "#fcd34d",
            }}
            transition={{ duration: 0.45 }}
            className="inline-block"
          >
            {roadsOpen}/{scenario.roads.length}
          </motion.span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Wind</span>
          <span className="text-sky-200">
            {scenario.wind.speedKmh} km/h{" "}
            {bearingToCompass(scenario.wind.bearingDeg)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function WarningBanners({ banners }: { banners: string[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-6 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {banners.map((text) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="rounded-xl border border-red-500/40 bg-red-950/85 px-5 py-2.5 text-sm font-medium text-red-100 shadow-2xl backdrop-blur-md"
          >
            {text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Legend() {
  const rows: [string, string][] = [
    ["🔥", "Active fire"],
    ["🟧", "Projected fire spread"],
    ["▒", "Smoke / low visibility"],
    ["🟢", "Shelter — safe"],
    ["🔴", "Shelter — unsafe"],
    ["⤳", "Evacuation route"],
    ["⛔", "Road closed"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 3 }}
      className="absolute bottom-5 right-5 z-[1000] rounded-xl border border-white/10 bg-black/70 px-3.5 py-2.5 shadow-xl backdrop-blur-md"
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Legend
      </div>
      <div className="space-y-0.5 text-[11px] text-neutral-300">
        {rows.map(([icon, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-4 text-center">{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
