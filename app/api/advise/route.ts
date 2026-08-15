import { NextResponse } from "next/server";

// Optional live-AI layer. Every failure returns 200 {ok:false} — never an
// error status — so the demo browser console stays free of network errors;
// the client silently falls back to the canned advisories.

const VALID_URGENCY = new Set(["ADVISORY", "WARNING", "EVACUATE"]);

type AdvisePayload = {
  hour: number;
  region?: string;
  coneReachKm: number;
  shelterStatuses: { name: string; safe: boolean }[];
  roadStatuses?: { name: string; open: boolean }[];
  windKmh: number;
  bearingDeg: number;
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!apiKey) {
    return NextResponse.json({ ok: false });
  }

  let payload: AdvisePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false });
  }

  const safe = payload.shelterStatuses.filter((s) => s.safe).map((s) => s.name);
  const unsafe = payload.shelterStatuses
    .filter((s) => !s.safe)
    .map((s) => s.name);

  const closedRoads = (payload.roadStatuses ?? [])
    .filter((r) => !r.open)
    .map((r) => r.name);

  const prompt = `You write official public evacuation advisories for a district disaster-management office in ${payload.region || "Uttarakhand, India"}.

Situation snapshot (hour ${payload.hour} of a wildfire event):
- Projected fire-spread cone reach: ${payload.coneReachKm.toFixed(1)} km downwind
- Wind: ${payload.windKmh} km/h blowing toward bearing ${payload.bearingDeg}°
- Shelters currently SAFE: ${safe.length ? safe.join(", ") : "none"}
- Shelters currently INSIDE the danger zone (closed): ${unsafe.length ? unsafe.join(", ") : "none"}
- Road checkpoints CLOSED: ${closedRoads.length ? closedRoads.join(", ") : "none"}

Write ONE advisory for this exact hour. Rules:
- Plain, calm, official language. No dramatization, no exclamation marks.
- Ground every statement ONLY in the numbers and shelter lists above. Invent nothing: no road names, place names, casualty figures, or timings that are not given.
- Direct people only toward shelters in the SAFE list; tell them to avoid closed shelters by name.
- advisory_hi must be a faithful Hindi rendering of advisory_en.
- urgency: "ADVISORY" if no shelter is closed and reach < 3 km, "WARNING" if the zone is approaching a shelter, "EVACUATE" if any shelter is closed.

Respond with ONLY this JSON object, no markdown fences:
{"headline": "...", "advisory_en": "...", "advisory_hi": "...", "urgency": "ADVISORY|WARNING|EVACUATE"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ ok: false });
    }
    const data = await res.json();
    const text: unknown =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      return NextResponse.json({ ok: false });
    }
    const parsed = JSON.parse(text.replace(/^```json\s*|```\s*$/g, ""));
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.advisory_en !== "string" ||
      typeof parsed.advisory_hi !== "string" ||
      !VALID_URGENCY.has(parsed.urgency)
    ) {
      return NextResponse.json({ ok: false });
    }
    return NextResponse.json({
      ok: true,
      headline: parsed.headline,
      advisory_en: parsed.advisory_en,
      advisory_hi: parsed.advisory_hi,
      urgency: parsed.urgency,
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
