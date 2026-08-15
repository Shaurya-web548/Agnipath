"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Leaflet touches `window` at module scope — it must never run during SSR.
const FireMap = dynamic(() => import("@/components/FireMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0f] text-neutral-500">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const [currentHour, setCurrentHour] = useState(0);

  return (
    <main className="fixed inset-0 bg-[#0a0a0f]">
      <FireMap currentHour={currentHour} />

      {/* Temporary control for testing — replaced by the full control bar in Stage 3 */}
      <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-4 rounded-xl bg-black/70 px-5 py-3 backdrop-blur">
        <input
          type="range"
          min={0}
          max={6}
          step={0.1}
          value={currentHour}
          onChange={(e) => setCurrentHour(Number(e.target.value))}
          className="w-64 accent-orange-500"
        />
        <span className="w-16 font-mono text-lg text-orange-400">
          H+{currentHour.toFixed(1)}
        </span>
      </div>
    </main>
  );
}
