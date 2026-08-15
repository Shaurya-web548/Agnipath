import { NextResponse } from "next/server";

// Live layer for the Command Mode assistant. Always answers 200; {ok:false}
// tells the client to use its offline rule-based answer instead.

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!apiKey) return NextResponse.json({ ok: false });

  let body: { question?: string; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ ok: false });
  }

  const prompt = `You are the operations assistant inside a wildfire evacuation command console. Answer the officer's question in at most 60 words of plain, calm, official English. Ground every statement ONLY in this situation snapshot (JSON); invent nothing beyond it:

${JSON.stringify(body.context)}

Question: ${body.question}

Answer with plain text only — no markdown, no preamble.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return NextResponse.json({ ok: false });
    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string" || !text.trim())
      return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, answer: text.trim() });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
