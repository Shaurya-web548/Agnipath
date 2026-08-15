"use client";

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
  return (
    <main className="fixed inset-0 bg-[#0a0a0f]">
      <FireMap />
    </main>
  );
}
