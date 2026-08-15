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
  CommandPanel,
  AboutModal,
  AuthModal,
  type AppMode,
  type Role,
  type BroadcastEntry,
} from "@/components/Navigator";
import type { MapFocus } from "@/components/FireMap";
import { WhatIfPanel, RiskCard } from "@/components/Panels";
import {
  scenarios,
  defaultScenario,
  defaultParams,
  shelterIsSafe,
  roadIsOpen,
  riskAt,
  type SimParams,
} from "@/data/scenarios";
import { distanceKm, type LatLng } from "@/lib/geo";
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
  const [role, setRole] = useState<Role | null>(null);
  // Authority overrides: "shelter:Name" / "road:Name" -> forced open/closed
  const [overrides, setOverrides] = useState<Record<string, "open" | "closed">>(
    {}
  );
  const [broadcasts, setBroadcasts] = useState<BroadcastEntry[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [focus, setFocus] = useState<MapFocus>(null);
  // What-if simulation parameters (default = scenario snapshot)
  const [params, setParams] = useState<SimParams>(() =>
    defaultParams(defaultScenario)
  );
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  // Click-anywhere risk probe
  const [riskPoint, setRiskPoint] = useState<LatLng | null>(null);
  const [showInfra, setShowInfra] = useState(false);
  const [showZones, setShowZones] = useState(false);
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

  // Effective statuses = model prediction (with what-if params), unless an
  // authority override exists.
  const shelterStatus = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const s of scenario.shelters) {
      const ov = overrides[`shelter:${s.name}`];
      m[s.name] = ov
        ? ov === "open"
        : shelterIsSafe(scenario, s, currentHour, params);
    }
    return m;
  }, [scenario, currentHour, overrides, params]);
  const roadStatus = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of scenario.roads) {
      const ov = overrides[`road:${r.name}`];
      m[r.name] = ov
        ? ov === "open"
        : roadIsOpen(scenario, r, currentHour, params);
    }
    return m;
  }, [scenario, currentHour, overrides, params]);

  // Risk at the clicked point (recomputed live as the hour advances)
  const risk = useMemo(
    () => (riskPoint ? riskAt(scenario, riskPoint, currentHour, params) : null),
    [riskPoint, scenario, currentHour, params]
  );
  const nearestSafeToRisk = useMemo(() => {
    if (!riskPoint) return null;
    const safe = scenario.shelters.filter((s) => shelterStatus[s.name]);
    if (!safe.length) return null;
    return [...safe].sort(
      (a, b) => distanceKm(riskPoint, a) - distanceKm(riskPoint, b)
    )[0];
  }, [riskPoint, scenario, shelterStatus]);

  const safeCount = useMemo(
    () => Object.values(shelterStatus).filter(Boolean).length,
    [shelterStatus]
  );
  const roadsOpen = useMemo(
    () => Object.values(roadStatus).filter(Boolean).length,
    [roadStatus]
  );

  // Warning banners for shelter flips and road closures, auto-dismissed.
  const [banners, setBanners] = useState<string[]>([]);
  const prevOkRef = useRef<Map<string, boolean>>(new Map());
  // Dismiss timers live in a ref: effect cleanup must NOT cancel them, because
  // this effect re-runs on every animation frame while playing.
  const bannerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pushBanners = useCallback((texts: string[]) => {
    if (texts.length === 0) return;
    setBanners((old) => [...old, ...texts.filter((b) => !old.includes(b))]);
    bannerTimersRef.current.push(
      setTimeout(() => {
        setBanners((old) => old.filter((b) => !texts.includes(b)));
      }, BANNER_MS)
    );
  }, []);
  useEffect(() => {
    const prev = prevOkRef.current;
    const newBanners: string[] = [];
    let shelterFlipped = false;
    for (const [name, safe] of Object.entries(shelterStatus)) {
      const key = `shelter:${name}`;
      if (prev.get(key) === true && !safe) {
        newBanners.push(`⚠ ${name} is now inside the danger zone`);
        shelterFlipped = true;
      }
      prev.set(key, safe);
    }
    for (const [name, open] of Object.entries(roadStatus)) {
      const key = `road:${name}`;
      if (prev.get(key) === true && !open)
        newBanners.push(`⛔ ${name} closed`);
      prev.set(key, open);
    }
    // Route recalculation moment: point evacuees at the new best shelter.
    if (shelterFlipped) {
      const stillSafe = scenario.shelters
        .filter((s) => shelterStatus[s.name])
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];
      if (stillSafe)
        newBanners.push(
          `🧭 Route changed — nearest safe shelter is now ${stillSafe.name}`
        );
    }
    pushBanners(newBanners);
  }, [shelterStatus, roadStatus, scenario, pushBanners]);
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
      setOverrides({});
      setBroadcasts([]);
      setParams(defaultParams(next));
      setRiskPoint(null);
      prevOkRef.current = new Map();
    },
    [stopAnimation]
  );

  // Authority actions ---------------------------------------------------
  const handleOverride = useCallback(
    (kind: "shelter" | "road", name: string, open: boolean) => {
      setOverrides((old) => ({
        ...old,
        [`${kind}:${name}`]: open ? "open" : "closed",
      }));
      // Pre-set the banner-diff baseline so the model-flip banner doesn't
      // also fire; the override gets its own message.
      prevOkRef.current.set(`${kind}:${name}`, open);
      pushBanners([
        open
          ? `🛡️ ${name} manually reopened by authority`
          : `🛡️ ${name} manually closed by authority`,
      ]);
    },
    [pushBanners]
  );

  const handleBroadcast = useCallback(
    (text: string) => {
      const hour = Math.floor(currentHour);
      setBroadcasts((old) => [
        ...old,
        { id: (old.at(-1)?.id ?? 0) + 1, hour, text },
      ]);
      pushBanners([`📡 Advisory broadcast to district channels — H+${hour}`]);
    },
    [currentHour, pushBanners]
  );

  // Enter authority mode: authenticate once per browser session.
  const enterAuthority = useCallback(() => {
    if (sessionStorage.getItem("agnipath-authority") === "1") {
      setRole("authority");
      setMode("briefing");
    } else {
      setAuthOpen(true);
    }
  }, []);

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
        params={params}
        shelterStatus={shelterStatus}
        roadStatus={roadStatus}
        showInfra={showInfra}
        showZones={showZones}
        riskPoint={riskPoint}
        onMapClick={setRiskPoint}
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

      {role === "authority" && !recMode && (
        <>
          <div className="authority-frame z-[950]" />
          <div className="absolute left-1/2 top-0 z-[1050] flex -translate-x-1/2 items-center gap-3 rounded-b-lg border border-t-0 border-amber-400/40 bg-amber-950/80 px-4 py-1 text-[11px] font-bold tracking-widest text-amber-300 backdrop-blur-md">
            🛡️ AUTHORITY COMMAND MODE
            <button
              onClick={() => {
                sessionStorage.removeItem("agnipath-authority");
                setRole("viewer");
                setMode("sim");
              }}
              className="rounded border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-amber-200 hover:bg-amber-500/20"
            >
              SIGN OUT
            </button>
          </div>
        </>
      )}

      {!recMode && (
        <>
          <NavTabs
            mode={mode}
            role={role}
            onMode={setMode}
            onSwitchRole={() => {
              setIsWelcome(false);
              setAboutOpen(true);
            }}
          />
          {mode !== "sim" && (
            <div className="absolute left-5 top-[132px] z-[1000]">
              {mode === "shelters" ? (
                <ShelterFinder
                  scenario={scenario}
                  currentHour={currentHour}
                  params={params}
                  shelterStatus={shelterStatus}
                  onLocate={setFocus}
                />
              ) : role === "authority" ? (
                <CommandPanel
                  scenario={scenario}
                  currentHour={currentHour}
                  params={params}
                  shelterStatus={shelterStatus}
                  roadStatus={roadStatus}
                  advisoryText={
                    advisories[
                      Math.min(advisories.length - 1, Math.floor(currentHour))
                    ].advisory_en
                  }
                  broadcasts={broadcasts}
                  onOverride={handleOverride}
                  onBroadcast={handleBroadcast}
                />
              ) : (
                <BriefingPanel
                  scenario={scenario}
                  currentHour={currentHour}
                  params={params}
                  shelterStatus={shelterStatus}
                  roadStatus={roadStatus}
                  onAuthorityLogin={enterAuthority}
                />
              )}
            </div>
          )}
          <Legend
            showInfra={showInfra}
            showZones={showZones}
            onToggleInfra={() => setShowInfra((v) => !v)}
            onToggleZones={() => setShowZones((v) => !v)}
          />
          {risk && riskPoint && (
            <RiskCard
              risk={risk}
              nearestSafe={nearestSafeToRisk}
              onLocate={() =>
                nearestSafeToRisk &&
                setFocus({
                  lat: nearestSafeToRisk.lat,
                  lng: nearestSafeToRisk.lng,
                  nonce: Date.now(),
                })
              }
              onClose={() => setRiskPoint(null)}
            />
          )}
          <WhatIfPanel
            open={whatIfOpen}
            scenario={scenario}
            params={params}
            onChange={setParams}
            onReset={() => setParams(defaultParams(scenario))}
          />
        </>
      )}

      <div className="absolute right-5 top-5 z-[1000] flex flex-col items-end gap-3">
        {!recMode && (
          <>
            <StatsBar
              scenario={scenario}
              currentHour={currentHour}
              params={params}
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
          whatIfOpen={whatIfOpen}
          onScrub={handleScrub}
          onPlay={handlePlay}
          onToggleWhatIf={() => setWhatIfOpen((v) => !v)}
        />
      )}

      <AboutModal
        open={aboutOpen}
        welcome={isWelcome}
        onClose={() => setAboutOpen(false)}
        onPickRole={(r, m) => {
          if (r === "authority") {
            enterAuthority();
            return;
          }
          setRole(r);
          setMode(m);
        }}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          sessionStorage.setItem("agnipath-authority", "1");
          setAuthOpen(false);
          setRole("authority");
          setMode("briefing");
        }}
      />
    </main>
  );
}
