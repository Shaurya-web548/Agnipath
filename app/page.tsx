"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ControlBar, { type PlayState } from "@/components/ControlBar";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import {
  TitleChip,
  WindWidget,
  StatsBar,
  WarningBanners,
} from "@/components/Overlays";
import { shelters, shelterIsSafe } from "@/data/scenario";

// Leaflet touches `window` at module scope — it must never run during SSR.
const FireMap = dynamic(() => import("@/components/FireMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0f] text-neutral-500">
      Loading map…
    </div>
  ),
});

const PLAY_DURATION_MS = 8000;
const MAX_HOUR = 6;
const BANNER_MS = 4000;

// Gentle ease-in-out so the cone starts and settles smoothly.
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function Home() {
  const [currentHour, setCurrentHour] = useState(0);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const rafRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  const safeCount = useMemo(
    () => shelters.filter((s) => shelterIsSafe(s, currentHour)).length,
    [currentHour]
  );

  // Warning banners: appear when a shelter flips safe -> unsafe, auto-dismiss.
  const [banners, setBanners] = useState<string[]>([]);
  const prevSafeRef = useRef<Map<string, boolean>>(
    new Map(shelters.map((s) => [s.name, true]))
  );
  // Dismiss timers live in a ref: effect cleanup must NOT cancel them, because
  // this effect re-runs on every animation frame while playing.
  const bannerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const prev = prevSafeRef.current;
    const flipped: string[] = [];
    for (const s of shelters) {
      const safe = shelterIsSafe(s, currentHour);
      if (prev.get(s.name) === true && !safe) flipped.push(s.name);
      prev.set(s.name, safe);
    }
    if (flipped.length === 0) return;
    setBanners((old) => [...old, ...flipped.filter((f) => !old.includes(f))]);
    bannerTimersRef.current.push(
      setTimeout(() => {
        setBanners((old) => old.filter((b) => !flipped.includes(b)));
      }, BANNER_MS)
    );
  }, [currentHour]);
  useEffect(() => {
    const timers = bannerTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => stopAnimation, [stopAnimation]);

  const startPlay = useCallback((fromHour: number) => {
    stopAnimation();
    startProgressRef.current = fromHour / MAX_HOUR;
    setPlayState("playing");

    let startTs: number | null = null;
    const remaining = (1 - startProgressRef.current) * PLAY_DURATION_MS;

    const frame = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = remaining === 0 ? 1 : Math.min(1, (ts - startTs) / remaining);
      const linear =
        startProgressRef.current + (1 - startProgressRef.current) * t;
      const eased =
        startProgressRef.current === 0 ? easeInOutCubic(linear) : linear;
      setCurrentHour(Math.min(MAX_HOUR, eased * MAX_HOUR));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        setCurrentHour(MAX_HOUR);
        setPlayState("done");
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [stopAnimation]);

  const handlePlay = useCallback(() => {
    if (playState === "playing") {
      stopAnimation();
      setPlayState("idle");
      return;
    }
    // REPLAY restarts from zero; PLAY resumes from the current hour.
    const fromHour =
      playState === "done" || currentHour >= MAX_HOUR ? 0 : currentHour;
    startPlay(fromHour);
  }, [playState, currentHour, stopAnimation, startPlay]);

  // REC mode: press R — hide controls, keep map + title + advisory, auto-play.
  const [recMode, setRecMode] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return;
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      setRecMode((on) => !on);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!recMode) return;
    setCurrentHour(0);
    setPlayState("idle");
    const t = setTimeout(() => startPlay(0), 800);
    return () => clearTimeout(t);
  }, [recMode, startPlay]);

  const handleScrub = useCallback(
    (hour: number) => {
      stopAnimation();
      setPlayState(hour >= MAX_HOUR ? "done" : "idle");
      setCurrentHour(hour);
    },
    [stopAnimation]
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0a0f]">
      <FireMap currentHour={currentHour} />

      {/* cinematic overlays (below UI, above map) */}
      <div className="vignette z-[900]" />
      <div className="film-grain z-[901]" />

      <TitleChip />
      <WarningBanners banners={banners} />

      <div className="absolute right-5 top-5 z-[1000] flex flex-col items-end gap-3">
        {!recMode && (
          <>
            <WindWidget />
            <StatsBar currentHour={currentHour} safeCount={safeCount} />
          </>
        )}
        <AdvisoryPanel currentHour={currentHour} />
      </div>

      {!recMode && (
        <ControlBar
          currentHour={currentHour}
          playState={playState}
          onScrub={handleScrub}
          onPlay={handlePlay}
        />
      )}
    </main>
  );
}
