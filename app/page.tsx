"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ControlBar, { type PlayState } from "@/components/ControlBar";

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

// Gentle ease-in-out so the cone starts and settles smoothly.
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function Home() {
  const [currentHour, setCurrentHour] = useState(0);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const rafRef = useRef<number | null>(null);
  // Progress (0..1 of eased timeline) already covered when play was paused/scrubbed.
  const startProgressRef = useRef(0);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => stopAnimation, [stopAnimation]);

  const handlePlay = useCallback(() => {
    if (playState === "playing") {
      // PAUSE: remember how far along the (linear) timeline we are.
      stopAnimation();
      setPlayState("idle");
      return;
    }

    // REPLAY restarts from zero; PLAY resumes from the current hour.
    const fromHour = playState === "done" ? 0 : currentHour >= MAX_HOUR ? 0 : currentHour;
    startProgressRef.current = fromHour / MAX_HOUR;
    setPlayState("playing");

    let startTs: number | null = null;
    const remaining = (1 - startProgressRef.current) * PLAY_DURATION_MS;

    const frame = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = remaining === 0 ? 1 : Math.min(1, (ts - startTs) / remaining);
      // Ease only the remaining segment so resume doesn't jump.
      const linear =
        startProgressRef.current + (1 - startProgressRef.current) * t;
      const eased =
        startProgressRef.current === 0
          ? easeInOutCubic(linear)
          : linear; // resuming mid-way: keep it linear to avoid a visible snap
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
  }, [playState, currentHour, stopAnimation]);

  const handleScrub = useCallback(
    (hour: number) => {
      stopAnimation();
      setPlayState(hour >= MAX_HOUR ? "done" : "idle");
      setCurrentHour(hour);
    },
    [stopAnimation]
  );

  return (
    <main className="fixed inset-0 bg-[#0a0a0f]">
      <FireMap currentHour={currentHour} />
      <ControlBar
        currentHour={currentHour}
        playState={playState}
        onScrub={handleScrub}
        onPlay={handlePlay}
      />
    </main>
  );
}
