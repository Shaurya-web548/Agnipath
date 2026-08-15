"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ControlBar, { type PlayState } from "@/components/ControlBar";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import {
  TitleChip,
  StatsBar,
  WarningBanners,
  Legend,
} from "@/components/Overlays";
import {
  NavTabs,
  ShelterFinder,
  BriefingPanel,
  AboutModal,
  type AppMode,
} from "@/components/Navigator";
import type { MapFocus } from "@/components/FireMap";
import {
  scenarios,
  defaultScenario,
  shelterIsSafe,
  roadIsOpen,
} from "@/data/scenarios";
import { useLiveAdvisories } from "@/lib/useLiveAdvisories";

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
  const [scenario, setScenario] = useState(defaultScenario);
  const [mode, setMode] = useState<AppMode>("sim");
  const [focus, setFocus] = useState<MapFocus>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isWelcome, setIsWelcome] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const rafRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  // Welcome screen once per browser session ("what are you here for?")
  useEffect(() => {
    if (!sessionStorage.getItem("agnipath-welcomed")) {
      setIsWelcome(true);
      setAboutOpen(true);
      sessionStorage.setItem("agnipath-welcomed", "1");
    }
  }, []);

  const { advisories, isLive } = useLiveAdvisories(scenario, currentHour);

  const safeCount = useMemo(
    () =>
      scenario.shelters.filter((s) => shelterIsSafe(scenario, s, currentHour))
        .length,
    [scenario, currentHour]
  );
  const roadsOpen = useMemo(
    () =>
      scenario.roads.filter((r) => roadIsOpen(scenario, r, currentHour)).length,
    [scenario, currentHour]
  );

  // Warning banners for shelter flips and road closures, auto-dismissed.
  const [banners, setBanners] = useState<string[]>([]);
  const prevOkRef = useRef<Map<string, boolean>>(new Map());
  // Dismiss timers live in a ref: effect cleanup must NOT cancel them, because
  // this effect re-runs on every animation frame while playing.
  const bannerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const prev = prevOkRef.current;
    const newBanners: string[] = [];
    for (const s of scenario.shelters) {
      const safe = shelterIsSafe(scenario, s, currentHour);
      const key = `shelter:${s.name}`;
      if (prev.get(key) === true && !safe)
        newBanners.push(`⚠ ${s.name} is now inside the danger zone`);
      prev.set(key, safe);
    }
    for (const r of scenario.roads) {
      const open = roadIsOpen(scenario, r, currentHour);
      const key = `road:${r.name}`;
      if (prev.get(key) === true && !open)
        newBanners.push(`⛔ ${r.name} closed`);
      prev.set(key, open);
    }
    if (newBanners.length === 0) return;
    setBanners((old) => [...old, ...newBanners.filter((b) => !old.includes(b))]);
    bannerTimersRef.current.push(
      setTimeout(() => {
        setBanners((old) => old.filter((b) => !newBanners.includes(b)));
      }, BANNER_MS)
    );
  }, [scenario, currentHour]);
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

  const startPlay = useCallback(
    (fromHour: number) => {
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
    },
    [stopAnimation]
  );

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

  const handleScrub = useCallback(
    (hour: number) => {
      stopAnimation();
      setPlayState(hour >= MAX_HOUR ? "done" : "idle");
      setCurrentHour(hour);
    },
    [stopAnimation]
  );

  const handleScenarioChange = useCallback(
    (id: string) => {
      const next = scenarios.find((s) => s.id === id);
      if (!next) return;
      stopAnimation();
      setScenario(next);
      setCurrentHour(0);
      setPlayState("idle");
      setBanners([]);
      setFocus(null);
      prevOkRef.current = new Map();
    },
    [stopAnimation]
  );

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
    setAboutOpen(false);
    setCurrentHour(0);
    setPlayState("idle");
    const t = setTimeout(() => startPlay(0), 800);
    return () => clearTimeout(t);
  }, [recMode, startPlay]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0a0f]">
      {/* key remounts the map per scenario: clean intro fly-in + state reset */}
      <FireMap
        key={scenario.id}
        scenario={scenario}
        currentHour={currentHour}
        focus={focus}
      />

      {/* cinematic overlays (below UI, above map) */}
      <div className="vignette z-[900]" />
      <div className="film-grain z-[901]" />

      <TitleChip
        scenario={scenario}
        onScenarioChange={handleScenarioChange}
        onAbout={() => {
          setIsWelcome(false);
          setAboutOpen(true);
        }}
      />
      <WarningBanners banners={banners} />

      {!recMode && (
        <>
          <NavTabs mode={mode} onMode={setMode} />
          {mode !== "sim" && (
            <div className="absolute left-5 top-[132px] z-[1000]">
              {mode === "shelters" ? (
                <ShelterFinder
                  scenario={scenario}
                  currentHour={currentHour}
                  onLocate={setFocus}
                />
              ) : (
                <BriefingPanel scenario={scenario} currentHour={currentHour} />
              )}
            </div>
          )}
          <Legend />
        </>
      )}

      <div className="absolute right-5 top-5 z-[1000] flex flex-col items-end gap-3">
        {!recMode && (
          <>
            <StatsBar
              scenario={scenario}
              currentHour={currentHour}
              safeCount={safeCount}
              roadsOpen={roadsOpen}
            />
          </>
        )}
        <AdvisoryPanel
          currentHour={currentHour}
          advisories={advisories}
          liveDot={isLive}
        />
      </div>

      {!recMode && (
        <ControlBar
          currentHour={currentHour}
          playState={playState}
          onScrub={handleScrub}
          onPlay={handlePlay}
        />
      )}

      <AboutModal
        open={aboutOpen}
        welcome={isWelcome}
        onClose={() => setAboutOpen(false)}
        onPickMode={setMode}
      />
    </main>
  );
}
