"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  type Scenario,
  type SimParams,
  type RiskResult,
  defaultParams,
  effectiveRateKmh,
  bearingToCompass,
} from "@/data/scenarios";

const LEVEL_STYLES: Record<string, string> = {
  LOW: "bg-green-500/20 text-green-300 border-green-400/40",
  MODERATE: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  CRITICAL: "bg-red-500/25 text-red-300 border-red-400/50",
};

export function WhatIfPanel({
  open,
  scenario,
  params,
  onChange,
  onReset,
  onClose,
}: {
  open: boolean;
  scenario: Scenario;
  params: SimParams;
  onChange: (p: SimParams) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const base = defaultParams(scenario);
  const changed = JSON.stringify(params) !== JSON.stringify(base);
  const rate = effectiveRateKmh(scenario, params);

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    set: (v: number) => void
  ) => (
    <div>
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        <span>{label}</span>
        <span className="font-mono text-sky-200">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-0.5 h-1.5 w-full cursor-pointer accent-sky-400"
      />
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-20 left-1/2 z-[1000] w-[21rem] max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-xl border border-sky-400/25 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur-md sm:bottom-28"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">
              ⚗️ What-if simulation
            </span>
            <span className="flex items-center gap-1.5">
              {changed && (
                <button
                  onClick={onReset}
                  className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-white/10"
                >
                  Reset to snapshot
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close what-if panel"
                className="rounded px-1.5 text-xs text-neutral-500 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </span>
          </div>
          <div className="space-y-2">
            {slider("Wind speed", params.windSpeedKmh, 5, 45, 1, " km/h", (v) =>
              onChange({ ...params, windSpeedKmh: v })
            )}
            {slider(
              `Wind direction (${bearingToCompass(params.windBearingDeg)})`,
              params.windBearingDeg,
              0,
              355,
              5,
              "°",
              (v) => onChange({ ...params, windBearingDeg: v })
            )}
            {slider("Temperature", params.tempC, 20, 45, 1, "°C", (v) =>
              onChange({ ...params, tempC: v })
            )}
            {slider("Humidity", params.humidityPct, 10, 90, 1, "%", (v) =>
              onChange({ ...params, humidityPct: v })
            )}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
            <span>
              Effective spread:{" "}
              <span className="font-mono text-orange-300">
                {rate.toFixed(1)} km/h
              </span>
            </span>
            {changed && <span className="text-sky-300">what-if active</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RiskCard({
  risk,
  nearestSafe,
  onLocate,
  onClose,
}: {
  risk: RiskResult;
  nearestSafe: { name: string; lat: number; lng: number } | null;
  onLocate: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-20 left-3 z-[1000] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-black/75 p-3.5 shadow-xl backdrop-blur-md sm:bottom-5 sm:left-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          📍 Risk at this point
        </span>
        <button
          onClick={onClose}
          className="rounded px-1.5 text-xs text-neutral-500 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        <span className="font-mono text-3xl font-bold tabular-nums text-neutral-100">
          {risk.score}
          <span className="text-sm text-neutral-500">/100</span>
        </span>
        <span
          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider ${LEVEL_STYLES[risk.level]}`}
        >
          {risk.level}
        </span>
      </div>

      <div className="mt-2 space-y-0.5">
        {risk.factors.map((f) => (
          <div
            key={f.label}
            className="flex justify-between text-[11px] text-neutral-400"
          >
            <span>{f.label}</span>
            <span className="font-mono text-neutral-300">+{f.points}</span>
          </div>
        ))}
        {risk.etaMin === null && (
          <div className="text-[11px] text-neutral-500">
            Not in the projected fire path under current wind.
          </div>
        )}
      </div>

      <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200">
        {risk.action}
      </div>

      {nearestSafe && (
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">
            Nearest safe: <span className="text-green-300">{nearestSafe.name}</span>
          </span>
          <button
            onClick={onLocate}
            className="rounded-md border border-white/15 px-2 py-0.5 text-neutral-300 hover:bg-white/10"
          >
            Locate
          </button>
        </div>
      )}
    </motion.div>
  );
}
