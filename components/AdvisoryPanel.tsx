"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDefaultCollapsedOnMobile } from "@/lib/useCollapsed";
import {
  fallbackAdvisories,
  type Advisory,
  type Urgency,
} from "@/data/fallbackAdvisories";

const TYPE_MS_PER_CHAR = 20;

const urgencyStyles: Record<Urgency, string> = {
  ADVISORY: "bg-sky-500/20 text-sky-300 border-sky-400/40",
  WARNING: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  EVACUATE: "bg-red-500/25 text-red-300 border-red-400/50",
};

function useTypewriter(text: string) {
  const [shown, setShown] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    setShown("");
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length && timerRef.current) clearInterval(timerRef.current);
    }, TYPE_MS_PER_CHAR);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);
  return shown;
}

export default function AdvisoryPanel({
  currentHour,
  advisories = fallbackAdvisories,
  liveDot,
}: {
  currentHour: number;
  /** Per-hour advisories; live-AI results can override entries in Stage 6. */
  advisories?: Advisory[];
  liveDot?: boolean;
}) {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [open, toggle] = useDefaultCollapsedOnMobile();
  const hourIdx = Math.min(
    advisories.length - 1,
    Math.max(0, Math.floor(currentHour))
  );
  const advisory = advisories[hourIdx];
  const body =
    lang === "en" ? advisory.advisory_en : advisory.advisory_hi;
  const typed = useTypewriter(body);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 2.8 }}
      className={`${
        open ? "w-72" : "w-auto"
      } max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-black/70 p-3 shadow-xl backdrop-blur-md sm:w-80 sm:p-4`}
    >
      <div className="flex items-center justify-between gap-2 sm:mb-2">
        <button className="flex items-center gap-2" onClick={toggle}>
          <span
            className={`h-2 w-2 rounded-full ${
              liveDot ? "bg-green-400" : "bg-neutral-600"
            }`}
            title={liveDot ? "live AI" : "offline advisory"}
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            📢 Advisory · H+{hourIdx} {open ? "▾" : "▸"}
          </span>
        </button>
        <div className="flex items-center gap-1.5">
        {open && (
          <button
            onClick={toggle}
            aria-label="Collapse advisory"
            className="rounded px-1 text-xs text-neutral-500 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        )}
        <div className="flex overflow-hidden rounded-md border border-white/15 text-[11px]">
          <button
            onClick={() => setLang("en")}
            className={`px-2 py-0.5 ${
              lang === "en"
                ? "bg-white/15 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("hi")}
            className={`px-2 py-0.5 ${
              lang === "hi"
                ? "bg-white/15 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            हिन्दी
          </button>
        </div>
        </div>
      </div>

      <div className={open ? "block" : "hidden"}>
        <span
          className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider ${urgencyStyles[advisory.urgency]}`}
        >
          {advisory.urgency}
        </span>

        <h2 className="mt-2 text-sm font-semibold leading-snug text-neutral-100">
          {advisory.headline}
        </h2>

        <p className="mt-1.5 min-h-[7.5rem] text-[13px] leading-relaxed text-neutral-300">
          {typed}
          {typed.length < body.length && (
            <span className="animate-pulse text-orange-400">▍</span>
          )}
        </p>
      </div>
      {!open && (
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${urgencyStyles[advisory.urgency]}`}
          >
            {advisory.urgency}
          </span>
          <span className="max-w-[38vw] truncate text-xs text-neutral-300 sm:max-w-none">
            {advisory.headline}
          </span>
        </div>
      )}
    </motion.div>
  );
}
