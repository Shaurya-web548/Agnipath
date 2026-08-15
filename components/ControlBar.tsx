"use client";

export type PlayState = "idle" | "playing" | "done";

export default function ControlBar({
  currentHour,
  playState,
  whatIfOpen,
  onScrub,
  onPlay,
  onToggleWhatIf,
}: {
  currentHour: number;
  playState: PlayState;
  whatIfOpen: boolean;
  onScrub: (hour: number) => void;
  onPlay: () => void;
  onToggleWhatIf: () => void;
}) {
  return (
    <div className="absolute bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-5 rounded-2xl border border-white/10 bg-black/70 px-6 py-4 shadow-2xl backdrop-blur-md">
      <button
        onClick={onPlay}
        className="flex h-12 min-w-[7.5rem] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-base font-semibold tracking-wide text-white transition-colors hover:bg-orange-500 active:bg-orange-700"
      >
        {playState === "playing" ? (
          <>❚❚ PAUSE</>
        ) : playState === "done" ? (
          <>↺ REPLAY</>
        ) : (
          <>▶ PLAY</>
        )}
      </button>

      <input
        type="range"
        min={0}
        max={6}
        step={0.1}
        value={currentHour}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Simulation hour"
        className="h-2 w-72 cursor-pointer accent-orange-500"
      />

      <div className="w-24 text-right">
        <span className="font-mono text-3xl font-bold tabular-nums text-orange-400">
          H+{currentHour.toFixed(1)}
        </span>
      </div>

      <button
        onClick={onToggleWhatIf}
        className={`h-10 rounded-xl border px-3 text-xs font-semibold tracking-wide transition-colors ${
          whatIfOpen
            ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
            : "border-white/15 text-neutral-300 hover:bg-white/10"
        }`}
      >
        ⚗️ What-if
      </button>
    </div>
  );
}
