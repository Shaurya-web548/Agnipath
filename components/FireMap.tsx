"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  type Scenario,
  type PointFeature,
  conePolygon,
  smokePolygon,
  shelterIsSafe,
  roadIsOpen,
} from "@/data/scenarios";

const INDIA_CENTER: [number, number] = [21.5, 78.5];

export type MapFocus = { lat: number; lng: number; nonce: number } | null;

const fireIcon = L.divIcon({
  className: "",
  html: `<div class="fire-wrap">
    <div class="fire-ring"></div>
    <div class="fire-ring fire-ring2"></div>
    <div class="fire-core"></div>
    <div class="ember e1"></div><div class="ember e2"></div><div class="ember e3"></div>
    <div class="ember e4"></div><div class="ember e5"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function shelterIcon(safe: boolean, justFlipped: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="shelter-dot ${safe ? "safe" : "unsafe"}${
      justFlipped ? " just-flipped" : ""
    }">${justFlipped ? '<div class="shockwave"></div>' : ""}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function roadIcon(open: boolean) {
  return L.divIcon({
    className: "",
    html: open
      ? '<div class="road-dot open"></div>'
      : '<div class="road-dot closed">⛔</div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/**
 * Curved path from just outside the fire to just short of the shelter:
 * quadratic bezier bowed perpendicular to the straight line.
 */
function evacCurve(
  fire: { lat: number; lng: number },
  to: PointFeature
): { points: [number, number][]; headBearing: number } {
  const cosLat = Math.cos((fire.lat * Math.PI) / 180);
  const ax = fire.lng * cosLat;
  const ay = fire.lat;
  const bx = to.lng * cosLat;
  const by = to.lat;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const cx = mx - dy * 0.35;
  const cy = my + dx * 0.35;

  const points: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = 0.14 + (0.92 - 0.14) * (i / 24);
    const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx;
    const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by;
    points.push([y, x / cosLat]);
  }
  const [pLat, pLng] = points[points.length - 2];
  const [qLat, qLng] = points[points.length - 1];
  const headBearing =
    (Math.atan2((qLng - pLng) * cosLat, qLat - pLat) * 180) / Math.PI;
  return { points, headBearing };
}

function arrowheadIcon(bearingDeg: number) {
  return L.divIcon({
    className: "",
    html: `<div class="evac-arrowhead" style="transform: rotate(${bearingDeg.toFixed(
      1
    )}deg)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 7],
  });
}

/** Cinematic intro: wide India view, then fly to the fire. */
function IntroFly({ target }: { target: [number, number] }) {
  const map = useMap();
  const flown = useRef(false);
  useEffect(() => {
    if (flown.current) return;
    flown.current = true;
    const t = setTimeout(() => {
      map.flyTo(target, 11, { duration: 2.5 });
    }, 500);
    return () => clearTimeout(t);
  }, [map, target]);
  return null;
}

/** Pans to a user-requested feature (shelter finder "Locate" buttons). */
function FocusFly({ focus }: { focus: MapFocus }) {
  const map = useMap();
  const lastNonce = useRef(0);
  useEffect(() => {
    if (!focus || focus.nonce === lastNonce.current) return;
    lastNonce.current = focus.nonce;
    map.flyTo([focus.lat, focus.lng], 12.5, { duration: 1.2 });
  }, [map, focus]);
  return null;
}

export default function FireMap({
  scenario,
  currentHour,
  focus = null,
}: {
  scenario: Scenario;
  currentHour: number;
  focus?: MapFocus;
}) {
  const fireCenter: [number, number] = [scenario.fire.lat, scenario.fire.lng];

  const cone = useMemo(
    () =>
      conePolygon(scenario, currentHour).map(
        (p) => [p.lat, p.lng] as [number, number]
      ),
    [scenario, currentHour]
  );

  const smoke = useMemo(
    () =>
      smokePolygon(scenario, currentHour).map(
        (p) => [p.lat, p.lng] as [number, number]
      ),
    [scenario, currentHour]
  );

  const safeByName = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const s of scenario.shelters)
      m.set(s.name, shelterIsSafe(scenario, s, currentHour));
    return m;
  }, [scenario, currentHour]);

  // One-shot flip animation bookkeeping
  const prevSafeRef = useRef<Map<string, boolean>>(new Map());
  const [justFlipped, setJustFlipped] = useState<Set<string>>(new Set());
  const flipTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const prev = prevSafeRef.current;
    const nowFlipped: string[] = [];
    for (const [name, safe] of safeByName) {
      if (prev.get(name) === true && !safe) nowFlipped.push(name);
    }
    prevSafeRef.current = new Map(safeByName);
    if (nowFlipped.length === 0) return;
    setJustFlipped((old) => new Set([...old, ...nowFlipped]));
    // Timer must survive effect re-runs (this effect fires every frame while playing).
    flipTimersRef.current.push(
      setTimeout(() => {
        setJustFlipped((old) => {
          const next = new Set(old);
          for (const n of nowFlipped) next.delete(n);
          return next;
        });
      }, 1200)
    );
  }, [safeByName]);
  useEffect(() => {
    const timers = flipTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const curves = useMemo(
    () =>
      new Map(
        scenario.shelters.map((s) => [s.name, evacCurve(scenario.fire, s)])
      ),
    [scenario]
  );

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={5}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full"
      style={{ background: "#0a0a0f" }}
    >
      <IntroFly target={fireCenter} />
      <FocusFly focus={focus} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Smoke plume: wider + longer than the flame cone, drawn beneath it */}
      {smoke.length >= 3 && (
        <Polygon
          positions={smoke}
          pathOptions={{
            color: "#94a3b8",
            weight: 1,
            opacity: 0.35,
            dashArray: "3 6",
            fillColor: "#94a3b8",
            fillOpacity: 0.12,
          }}
        >
          <Tooltip sticky>Smoke / low-visibility zone</Tooltip>
        </Polygon>
      )}

      {cone.length >= 3 && (
        <Polygon
          positions={cone}
          pathOptions={{
            color: "#ff8c42",
            weight: 2,
            dashArray: "10 8",
            fillColor: "#ff5a1f",
            fillOpacity: 0.25,
            className: "cone-path",
          }}
        >
          <Tooltip sticky>Projected fire-spread zone</Tooltip>
        </Polygon>
      )}

      {/* Curved evacuation arrows — only toward currently-safe shelters */}
      {scenario.shelters.map((s) => {
        if (!safeByName.get(s.name)) return null;
        const { points, headBearing } = curves.get(s.name)!;
        return (
          <Fragment key={`evac-${s.name}`}>
            <Polyline
              positions={points}
              pathOptions={{
                color: "#22c55e",
                weight: 2.5,
                opacity: 0.65,
                dashArray: "6 10",
                className: "evac-arrow",
              }}
            />
            <Marker
              position={points[points.length - 1]}
              icon={arrowheadIcon(headBearing)}
              interactive={false}
            />
          </Fragment>
        );
      })}

      <Marker position={fireCenter} icon={fireIcon} zIndexOffset={1000}>
        <Tooltip direction="top" offset={[0, -12]}>
          Fire detected {scenario.fire.detectedAt} · confidence{" "}
          {scenario.fire.confidence}
        </Tooltip>
      </Marker>

      {scenario.roads.map((r) => {
        const open = roadIsOpen(scenario, r, currentHour);
        return (
          <Marker
            key={r.name}
            position={[r.lat, r.lng]}
            icon={roadIcon(open)}
            zIndexOffset={400}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {r.name} — {open ? "OPEN" : "CLOSED"}
            </Tooltip>
          </Marker>
        );
      })}

      {scenario.shelters.map((s) => {
        const safe = safeByName.get(s.name)!;
        return (
          <Marker
            key={s.name}
            position={[s.lat, s.lng]}
            icon={shelterIcon(safe, justFlipped.has(s.name))}
            zIndexOffset={500}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {s.name} — {safe ? "SAFE" : "UNSAFE"}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
