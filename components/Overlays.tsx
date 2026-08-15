"use client";

import { motion, AnimatePresence } from "framer-motion";
import { wind, coneReachKm, shelters } from "@/data/scenario";

export function TitleChip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 1.2 }}
      className="absolute left-5 top-5 z-[1000]"
    >
      <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 shadow-xl backdrop-blur-md">
        <div className="text-lg font-semibold tracking-wide">
          🔥 AgniPath — Uttarakhand scenario
        </div>
        <div className="mt-0.5 text-xs text-neutral-400">
          Simplified wind-cone model · snapshot data
        </div>
      </div>
    </motion.div>
  );
}

export function WindWidget() {
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
        {/* compass ring */}
        <div className="wind-compass absolute inset-0 rounded-full border border-sky-300/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          {/* arrow points along the wind bearing (toward NE) */}
          <div
            className="text-2xl text-sky-300"
            style={{ transform: `rotate(${wind.bearingDeg}deg)` }}
          >
            ↑
          </div>
        </div>
        <div className="wind-streak s1" />
        <div className="wind-streak s2" />
        <div className="wind-streak s3" />
      </div>
      <div className="mt-1 text-center font-mono text-xs text-sky-200">
        {wind.speedKmh} km/h NE
      </div>
    </motion.div>
  );
}

export function StatsBar({
  currentHour,
  safeCount,
}: {
  currentHour: number;
  safeCount: number;
}) {
  const reach = coneReachKm(currentHour);
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
          <span className="text-neutral-400">Cone reach</span>
          <span className="text-orange-300">{reach.toFixed(1)} km</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Shelters safe</span>
          <motion.span
            key={safeCount}
            initial={{ scale: 1.35, color: "#fca5a5" }}
            animate={{ scale: 1, color: safeCount === shelters.length ? "#86efac" : "#fcd34d" }}
            transition={{ duration: 0.45 }}
            className="inline-block"
          >
            {safeCount}/{shelters.length}
          </motion.span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-neutral-400">Wind</span>
          <span className="text-sky-200">{wind.speedKmh} km/h NE</span>
        </div>
      </div>
    </motion.div>
  );
}

export function WarningBanners({ banners }: { banners: string[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-6 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {banners.map((name) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="rounded-xl border border-red-500/40 bg-red-950/85 px-5 py-2.5 text-sm font-medium text-red-100 shadow-2xl backdrop-blur-md"
          >
            ⚠ {name} is now inside the danger zone
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
