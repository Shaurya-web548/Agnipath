"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type Scenario,
  type SimParams,
  helplines,
  coneReachKm,
  smokeReachKm,
  bearingToCompass,
  timeToThreatMin,
  formatEta,
  zonePriorities,
} from "@/data/scenarios";
import { resourceRecommendations, answerLocally } from "@/lib/assistant";
import type { MapFocus } from "@/components/FireMap";

export type AppMode = "sim" | "shelters" | "briefing";
export type Role = "resident" | "authority" | "viewer";

/** Effective (model + authority overrides) statuses, keyed by feature name. */
export type StatusMap = Record<string, boolean>;

export function NavTabs({
  mode,
  role,
  onMode,
}: {
  mode: AppMode;
  role: Role | null;
  onMode: (m: AppMode) => void;
}) {
  const MODES: { id: AppMode; label: string }[] = [
    { id: "sim", label: "🎬 Simulation" },
    { id: "shelters", label: "🧭 Find shelter" },
    { id: "briefing", label: role === "authority" ? "🛡️ Command" : "📋 Briefing" },
  ];
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
  params,
  shelterStatus,
  onLocate,
}: {
  scenario: Scenario;
  currentHour: number;
  params: SimParams;
  shelterStatus: StatusMap;
  onLocate: (f: MapFocus) => void;
}) {
  const rows = scenario.shelters
    .map((s) => {
      const eta = timeToThreatMin(scenario, s, currentHour, params);
      // Best Shelter = distance + capacity headroom + fire risk (soon-threatened)
      const score =
        s.distanceKm +
        (s.occupancyPct / 100) * 4 +
        (eta !== null && eta <= 90 ? 6 : 0);
      return { ...s, safe: shelterStatus[s.name], eta, score };
    })
    .sort((a, b) => (a.safe !== b.safe ? (a.safe ? -1 : 1) : a.score - b.score));
  const recommended = rows.find((r) => r.safe);

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
                ? s.name === recommended?.name
                  ? "border-green-400/50 bg-green-500/15"
                  : "border-white/10 bg-white/5"
                : "border-red-500/30 bg-red-950/40 opacity-70"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-neutral-100">
                {s.name}
                {s.name === recommended?.name && (
                  <span className="ml-1.5 text-[10px] font-semibold text-green-300">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400">
                {s.distanceKm} km {bearingToCompass(s.bearingDeg)} ·{" "}
                <span className={s.safe ? "text-green-400" : "text-red-400"}>
                  {s.safe ? "SAFE" : "UNSAFE"}
                </span>
                {s.safe && s.eta !== null && s.eta > 0 && (
                  <span className="text-amber-300"> · {formatEta(s.eta)}</span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="h-1 w-20 overflow-hidden rounded bg-white/10">
                  <div
                    className={`h-full ${s.occupancyPct > 80 ? "bg-red-400" : s.occupancyPct > 55 ? "bg-amber-400" : "bg-green-400"}`}
                    style={{ width: `${s.occupancyPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500">
                  {s.occupancyPct}% of {s.capacity}
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
  params,
  shelterStatus,
  roadStatus,
}: {
  scenario: Scenario;
  currentHour: number;
  params: SimParams;
  shelterStatus: StatusMap;
  roadStatus: StatusMap;
}) {
  const h = Math.floor(currentHour);
  const closedShelters = scenario.shelters.filter((s) => !shelterStatus[s.name]);
  const closedRoads = scenario.roads.filter((r) => !roadStatus[r.name]);
  const compass = bearingToCompass(params.windBearingDeg);

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
            Danger zone {coneReachKm(scenario, currentHour, params).toFixed(1)}{" "}
            km {compass}; smoke and low visibility to{" "}
            {smokeReachKm(scenario, currentHour, params).toFixed(1)} km. Wind{" "}
            {params.windSpeedKmh} km/h toward {compass}.
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
      </dl>
    </div>
  );
}

export type BroadcastEntry = { id: number; hour: number; text: string };

/**
 * Authority-only command console: manual shelter/road overrides that the whole
 * app (map, resident view, stats) reflects immediately, plus an advisory
 * broadcast console with an ops log.
 */
export function CommandPanel({
  scenario,
  currentHour,
  params,
  shelterStatus,
  roadStatus,
  advisoryText,
  broadcasts,
  onOverride,
  onBroadcast,
}: {
  scenario: Scenario;
  currentHour: number;
  params: SimParams;
  shelterStatus: StatusMap;
  roadStatus: StatusMap;
  advisoryText: string;
  broadcasts: BroadcastEntry[];
  onOverride: (kind: "shelter" | "road", name: string, open: boolean) => void;
  onBroadcast: (text: string) => void;
}) {
  const [draft, setDraft] = useState(advisoryText);
  useEffect(() => setDraft(advisoryText), [advisoryText]);

  // Assistant chat (live Gemini with silent offline fallback)
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string; live: boolean }[]>([]);
  const [asking, setAsking] = useState(false);
  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion("");
    const ctx = {
      scenario,
      hour: Math.floor(currentHour),
      params,
      shelterStatus,
      roadStatus,
    };
    const local = answerLocally(q, ctx);
    let answer = local;
    let live = false;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          context: {
            region: scenario.region,
            hour: Math.floor(currentHour),
            coneReachKm: +coneReachKm(scenario, currentHour, params).toFixed(1),
            windKmh: params.windSpeedKmh,
            windToward: bearingToCompass(params.windBearingDeg),
            shelters: scenario.shelters.map((s) => ({
              name: s.name,
              safe: shelterStatus[s.name],
              etaMin: timeToThreatMin(scenario, s, currentHour, params),
              capacity: s.capacity,
              occupancyPct: s.occupancyPct,
            })),
            roads: scenario.roads.map((r) => ({
              name: r.name,
              open: roadStatus[r.name],
              etaMin: timeToThreatMin(scenario, r, currentHour, params),
            })),
            zones: zonePriorities(scenario, currentHour, params).map((z) => ({
              name: z.zone.name,
              population: z.zone.population,
              riskPct: z.riskPct,
              priority: z.label,
            })),
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.ok === true && typeof data.answer === "string") {
          answer = data.answer;
          live = true;
        }
      }
    } catch {
      // silent — local answer stands
    }
    setChat((old) => [...old.slice(-2), { q, a: answer, live }]);
    setAsking(false);
  };

  const row = (
    kind: "shelter" | "road",
    name: string,
    open: boolean,
    openLabel: string,
    closedLabel: string
  ) => (
    <div
      key={`${kind}:${name}`}
      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-neutral-100">
          {name}
        </div>
        <div
          className={`text-[10px] font-semibold ${open ? "text-green-400" : "text-red-400"}`}
        >
          {open ? openLabel : closedLabel}
        </div>
      </div>
      <button
        onClick={() => onOverride(kind, name, !open)}
        className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${
          open
            ? "border-red-400/40 text-red-300 hover:bg-red-500/15"
            : "border-green-400/40 text-green-300 hover:bg-green-500/15"
        }`}
      >
        {open ? "FORCE CLOSE" : "REOPEN"}
      </button>
    </div>
  );

  return (
    <div className="max-h-[calc(100vh-200px)] w-80 overflow-y-auto rounded-xl border border-amber-400/30 bg-black/75 p-3.5 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          🛡️ Command console · H+{Math.floor(currentHour)}
        </span>
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Shelters — manual override
      </div>
      <div className="mt-1 space-y-1">
        {scenario.shelters.map((s) =>
          row("shelter", s.name, shelterStatus[s.name], "OPEN · SAFE", "CLOSED")
        )}
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Road checkpoints — manual override
      </div>
      <div className="mt-1 space-y-1">
        {scenario.roads.map((r) =>
          row("road", r.name, roadStatus[r.name], "OPEN", "CLOSED")
        )}
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Broadcast advisory
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-black/50 p-2 text-[11px] leading-snug text-neutral-200 outline-none focus:border-amber-400/50"
      />
      <button
        onClick={() => onBroadcast(draft)}
        className="mt-1.5 w-full rounded-lg bg-amber-500 py-1.5 text-xs font-bold tracking-wide text-black hover:bg-amber-400"
      >
        📡 BROADCAST TO DISTRICT CHANNELS
      </button>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Evacuation priority (risk × population)
      </div>
      <div className="mt-1 space-y-1">
        {zonePriorities(scenario, currentHour, params).map((z) => (
          <div
            key={z.zone.name}
            className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
          >
            <span className="text-neutral-200">
              {z.zone.name}{" "}
              <span className="text-neutral-500">
                · {z.zone.population.toLocaleString("en-IN")} · {z.riskPct}%
              </span>
            </span>
            <span
              className={`font-bold ${
                z.label === "IMMEDIATE"
                  ? "text-red-400"
                  : z.label === "HIGH"
                    ? "text-orange-400"
                    : z.label === "MONITOR"
                      ? "text-yellow-400"
                      : "text-green-400"
              }`}
            >
              {z.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Resource recommendations
      </div>
      <div className="mt-1 space-y-1">
        {resourceRecommendations(
          scenario,
          currentHour,
          shelterStatus,
          roadStatus,
          params
        ).map((rec) => (
          <div
            key={rec}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-neutral-300"
          >
            {rec}
          </div>
        ))}
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Ask the ops assistant
      </div>
      <div className="mt-1 flex gap-1.5">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Which areas should we evacuate first?"
          className="w-full rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-[11px] text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
        />
        <button
          onClick={ask}
          disabled={asking}
          className="shrink-0 rounded-lg border border-amber-400/40 px-2.5 text-xs text-amber-300 hover:bg-amber-500/15 disabled:opacity-50"
        >
          {asking ? "…" : "Ask"}
        </button>
      </div>
      {chat.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {chat.map((c, i) => (
            <div key={i} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[10px] font-semibold text-neutral-400">
                {c.q}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-neutral-200">
                <span
                  className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${c.live ? "bg-green-400" : "bg-neutral-600"}`}
                />
                {c.a}
              </div>
            </div>
          ))}
        </div>
      )}

      {broadcasts.length > 0 && (
        <>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Ops log
          </div>
          <div className="mt-1 space-y-1">
            {broadcasts
              .slice(-4)
              .reverse()
              .map((b) => (
                <div
                  key={b.id}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-400"
                >
                  <span className="font-mono text-amber-300">H+{b.hour}</span>{" "}
                  broadcast · {b.text.slice(0, 60)}
                  {b.text.length > 60 ? "…" : ""}
                </div>
              ))}
          </div>
        </>
      )}

      <p className="mt-2 text-[10px] leading-snug text-neutral-500">
        Overrides apply instantly to the map and the resident view. Simulated
        broadcast — no real messages are sent.
      </p>
    </div>
  );
}

// Demo credential — documented in the README, deliberately not shown on screen.
const AUTHORITY_ACCESS_CODE = "AGNI-1070";

/**
 * Gate in front of Authority Command Mode. Demo-grade authentication:
 * a client-side access-code check, enough to keep casual users out and to
 * demonstrate the restricted flow. A real deployment would use the district
 * SSO / OTP instead.
 */
export function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [officerId, setOfficerId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!officerId.trim()) {
      setError("Enter your officer ID.");
      return;
    }
    if (code.trim().toUpperCase() !== AUTHORITY_ACCESS_CODE) {
      setError("Invalid access code. Contact the district control room.");
      return;
    }
    setError(null);
    setOfficerId("");
    setCode("");
    onSuccess();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 w-full max-w-sm rounded-2xl border border-amber-400/30 bg-neutral-950/95 p-6 shadow-2xl"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              🛡️ Restricted — authorities only
            </div>
            <h2 className="mt-1 text-lg font-semibold">
              District authority sign-in
            </h2>
            <p className="mt-1 text-xs leading-snug text-neutral-400">
              Command Mode can close shelters and broadcast advisories. Access
              is limited to authorised district officers.
            </p>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Officer ID
            </label>
            <input
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              placeholder="e.g. DDMA-NTL-042"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
            />

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Access code
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs font-medium text-red-400"
              >
                {error}
              </motion.p>
            )}

            <button
              onClick={submit}
              className="mt-4 w-full rounded-lg bg-amber-500 py-2 text-sm font-bold tracking-wide text-black hover:bg-amber-400"
            >
              SIGN IN
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-lg border border-white/15 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <p className="mt-3 text-[10px] leading-snug text-neutral-600">
              Demo authentication — a real deployment would use district SSO /
              OTP. No credentials are stored or transmitted.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AboutModal({
  open,
  welcome,
  onClose,
  onPickRole,
}: {
  open: boolean;
  welcome: boolean;
  onClose: () => void;
  onPickRole: (role: Role, mode: AppMode) => void;
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

            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Who are you?
            </div>
            <div className="mt-2 space-y-2">
              {(
                [
                  ["resident", "shelters", "🧑 I'm a resident", "Find the nearest safe shelter, evacuation routes and emergency helplines."],
                  ["authority", "briefing", "🛡️ I'm an authority / responder", "Command console: force-close or reopen shelters and roads, broadcast hourly EN/हिन्दी advisories."],
                  ["viewer", "sim", "🎬 Just show me the simulation", "Replay the full 6-hour spread story with PLAY."],
                ] as [Role, AppMode, string, string][]
              ).map(([role, mode, label, desc]) => (
                <button
                  key={role}
                  onClick={() => {
                    onPickRole(role, mode);
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
