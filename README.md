# 🔥 AgniPath — Wildfire Evacuation Planner

**The goal:** when a wildfire starts, the hardest questions are human ones —
*what is happening, where should I go, and what closes next?* AgniPath answers
all three from one screen. It replays a wind-driven spread forecast from a
**saved satellite-data snapshot** (FIRMS-style, representative of recent
Himalayan fire seasons) and layers every danger it implies — the flame cone,
the wider smoke/low-visibility plume, shelters flipping unsafe, road
checkpoints closing — while an advisory panel rewrites the official evacuation
message every hour in English and Hindi.

Three ways in (welcome screen or the tabs, top-left):

- **🎬 Simulation** — the cinematic 6-hour replay (the demo money moment)
- **🧭 Find shelter** — ranked shelter list, nearest safe first, with Locate
- **📋 Briefing** — one-glance responder summary of every current hazard

Two regions ship in the scenario picker: **Uttarakhand — Bhowali forest** and
**Himachal — Shimla forest belt**; each has its own fire, wind, shelters and
road checkpoints, and the advisory text follows whichever is active.

**Nothing on screen depends on a live network** except one optional AI call
that has a canned fallback (and map tiles — see *Offline behaviour*).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## The demo (one take)

1. Page loads → map flies from a wide India view to the fire point.
2. Press **PLAY ▶** → the 6-hour story runs in ~8 seconds:
   - the wind cone grows smoothly toward the northeast,
   - **Bhowali School Shelter** flips red around H+2.3 (shockwave + banner),
   - **Jeolikote Panchayat Bhawan** flips around H+4.5,
   - evacuation arrows to unsafe shelters disappear,
   - stats tick and the advisory panel re-types at every whole hour.
3. **EN / हिन्दी** toggles the advisory language.
4. Press **R** for REC mode: hides all controls (map + title + advisory stay)
   and auto-plays — used to record the backup demo video cleanly.

## Live AI (optional)

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`
(and optionally `GEMINI_MODEL`), then restart. The dot in the advisory panel
turns green when an hour's advisory was written live by Gemini; on any error
or a 4-second timeout the canned advisory is used silently. The API route
always answers HTTP 200, so a missing key never even logs a console error.

## Offline behaviour

Everything runs from hardcoded data in `data/` — simulation, shelters,
advisories. The only wifi dependencies:

- **Map tiles** (CartoDB dark). The browser caches tiles it has already
  displayed, so do one full zoom-in + PLAY run while online before demoing;
  with wifi off afterwards the cached tiles keep rendering. Untouched areas
  or zoom levels would show dark blanks.
- **Live AI dot** — silently grey when offline. Nothing else changes.

## Honesty

The chip under the title — *"Simplified wind-cone model · snapshot data"* —
stays visible in every state, including REC mode. The spread model is a plain
sector: radius = 1.8 km/h × hours downwind, 30° half-angle around the wind
bearing. It is a communication prototype, not a fire-behaviour model.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · react-leaflet 5 /
Leaflet 1.9 (CartoDB dark tiles) · framer-motion. Geometry is two small
helpers in `lib/geo.ts` (spherical destination point, ray-casting
point-in-polygon) — no heavy geo libraries.
