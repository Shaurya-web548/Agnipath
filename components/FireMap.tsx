"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const FIRE_CENTER: [number, number] = [29.38, 79.46];

export default function FireMap() {
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
    </MapContainer>
  );
}
