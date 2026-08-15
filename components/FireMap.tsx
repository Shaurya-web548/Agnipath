"use client";

import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fire, shelters, conePolygon, shelterIsSafe } from "@/data/scenario";

const FIRE_CENTER: [number, number] = [fire.lat, fire.lng];

const fireIcon = L.divIcon({
  className: "",
  html: `<div class="fire-marker"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function FireMap({ currentHour }: { currentHour: number }) {
  const cone = useMemo(
    () => conePolygon(currentHour).map((p) => [p.lat, p.lng] as [number, number]),
    [currentHour]
  );

  return (
    <MapContainer
      center={FIRE_CENTER}
      zoom={11}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full"
      style={{ background: "#0a0a0f" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {cone.length >= 3 && (
        <Polygon
          positions={cone}
          pathOptions={{
            color: "#ff8c42",
            weight: 2,
            fillColor: "#ff5a1f",
            fillOpacity: 0.25,
          }}
        />
      )}

      <Marker position={FIRE_CENTER} icon={fireIcon} zIndexOffset={1000}>
        <Tooltip direction="top" offset={[0, -12]}>
          Fire detected {fire.detectedAt} · confidence {fire.confidence}
        </Tooltip>
      </Marker>

      {shelters.map((s) => {
        const safe = shelterIsSafe(s, currentHour);
        return (
          <CircleMarker
            key={s.name}
            center={[s.lat, s.lng]}
            radius={8}
            pathOptions={{
              color: safe ? "#22c55e" : "#ef4444",
              weight: 2,
              fillColor: safe ? "#16a34a" : "#dc2626",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {s.name} — {safe ? "SAFE" : "UNSAFE"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
