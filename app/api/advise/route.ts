import { NextResponse } from "next/server";

// Optional live-AI layer. The client treats ANY non-200 or slow response as a
// signal to use the canned fallback — this route can fail freely and silently.

const VALID_URGENCY = new Set(["ADVISORY", "WARNING", "EVACUATE"]);

type AdvisePayload = {
  hour: number;
  coneReachKm: number;
  shelterStatuses: { name: string; safe: boolean }[];
  windKmh: number;
  bearingDeg: number;
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!apiKey) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  let payload: AdvisePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const safe = payload.shelterStatuses.filter((s) => s.safe).map((s) => s.name);
  const unsafe = payload.shelterStatuses
    .filter((s) => !s.safe)
    .map((s) => s.name);

  const prompt = `You write official public evacuation advisories for a district disaster-management office in Uttarakhand, India.

Situation snapshot (hour ${payload.hour} of a wildfire event):
- Projected fire-spread cone reach: ${payload.coneReachKm.toFixed(1)} km downwind
- Wind: ${payload.windKmh} km/h blowing toward bearing ${payload.bearingDeg}° (northeast)
- Shelters currently SAFE: ${safe.length ? safe.join(", ") : "none"}
- Shelters currently INSIDE the danger zone (closed): ${unsafe.length ? unsafe.join(", ") : "none"}

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
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    const data = await res.json();
    const text: unknown =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }
    const parsed = JSON.parse(text.replace(/^```json\s*|```\s*$/g, ""));
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.advisory_en !== "string" ||
      typeof parsed.advisory_hi !== "string" ||
      !VALID_URGENCY.has(parsed.urgency)
    ) {
      return NextResponse.json({ error: "invalid shape" }, { status: 502 });
    }
    return NextResponse.json({
      headline: parsed.headline,
      advisory_en: parsed.advisory_en,
      advisory_hi: parsed.advisory_hi,
      urgency: parsed.urgency,
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
