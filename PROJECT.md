# 🔥 AgniPath — Wildfire Evacuation Planner

*Hackathon project write-up*

## Problem

When a forest fire starts in the Himalayan foothills, the information people
need most — *what is happening, where should I go, what closes next?* — is
scattered, slow, and usually English-only. Residents don't know which shelter
is still safe; district authorities have to write and broadcast advisories by
hand while the situation changes hour by hour.

Uttarakhand's April–May 2024 fire season made this concrete: over a thousand
forest fires were recorded in the state, including major fires in the Nainital
hills around Bhowali and Jeolikote — the exact geography our default scenario
represents.

## Solution

AgniPath is a single dark, cinematic map that replays a wind-driven fire-spread
forecast from a saved FIRMS-style satellite snapshot and turns it into
role-specific guidance:

| Role | What they get |
|---|---|
| 🧑 Resident | Ranked shelter list (nearest safe first), evacuation routes on the map, emergency helplines (112 · 101 · 108 · 1070) |
| 🛡️ Authority | **Command Mode**: force-close/reopen shelters and road checkpoints (overrides propagate instantly to the resident view), broadcast console with hourly EN/हिन्दी advisory drafts and an ops log |
| 🎬 Anyone | A one-take 6-hour simulation: the spread cone grows, shelters flip unsafe with warnings, stats tick, the advisory rewrites every hour |

## Key features

- **Time-scrubbed simulation** — slider + PLAY animates hours 0→6 (~8 s, eased)
- **Hazard layers** — flame cone, wider smoke/low-visibility plume, road
  checkpoints that close as the cone reaches them
- **Two regions** — Uttarakhand (Bhowali forest) and Himachal (Shimla forest
  belt), each with its own fire, wind, shelters, and checkpoints
- **Bilingual advisories** — typewriter-revealed official messages in English
  and Hindi with ADVISORY / WARNING / EVACUATE urgency levels
- **Optional live AI** — Gemini rewrites each hour's advisory from the exact
  simulation numbers; any error or 4 s timeout falls back silently to canned
  text (green/grey dot shows which is active)
- **REC mode** — press R: hides all controls and auto-plays for clean video
  capture

## How it works

- **Spread model (deliberately simple):** a sector polygon with apex at the
  fire, central bearing = wind bearing, radius = 1.8 km/h × hours downwind,
  30° half-angle. Smoke = same sector, wider and 1.6× longer.
- **Safety logic:** ray-casting point-in-polygon over shelter/checkpoint
  coordinates, which are defined by bearing + distance from the fire and
  converted with a spherical destination-point helper — so the demo's story
  beats happen on schedule (Bhowali flips ~H+2.3, Jeolikote ~H+4.5).
- **Authority overrides** beat the model: effective status = manual override
  if present, else model prediction — computed centrally and consumed by the
  map, stats, banners, and resident panels alike.
- **Reliability first:** every dataset is hardcoded; the only network
  dependencies are map tiles (browser-cached after one online run) and the
  optional AI call, which can never surface an error on screen.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Leaflet 1.9 /
react-leaflet 5 (CartoDB dark tiles) · framer-motion · optional Gemini API.
No heavy geo libraries — all geometry is ~60 lines in `lib/geo.ts`.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional live AI: copy `.env.example` to `.env.local`, set `GEMINI_API_KEY`,
restart.

## Demo script (one take, ~90 seconds)

1. Load → map flies from an India-wide view into the Bhowali fire point.
2. Welcome screen: pick **🎬 simulation** → press **PLAY**.
3. Watch: cone grows NE, Bhowali School flips red (shockwave + banner),
   road checkpoints close, Jeolikote flips, advisory re-types every hour.
4. Switch role to **🛡️ authority** (? button): amber Command Mode appears.
   Force-close Nainital Community Hall → it flips red on the map instantly.
5. Open **🧭 Find shelter**: the resident view already shows it UNSAFE and
   has re-ranked the nearest safe shelter. Broadcast the advisory → ops log.
6. Toggle **हिन्दी**, point at the honesty chip, done.

## Honest limitations

- The wind-cone is a communication model, not fire-behaviour physics
  (no fuel, slope, or humidity) — stated on-screen at all times.
- Snapshot data, not a live FIRMS feed; shelters and checkpoints are
  representative, not surveyed locations.
- Broadcasts are simulated; no real messages are sent.
