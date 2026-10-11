export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export type FundNarrative = { scheme_code: number; summary: string };
export type Narrative = { market_summary: string; funds: FundNarrative[]; portfolio_reason: string };

const SYSTEM = `You write Meera's Saturday-morning mutual fund report. Meera is not a finance professional: no jargon, no acronyms without explanation, warm and calm tone, Indian context (use ₹/% naturally).
Rules:
- Use ONLY the numbers and headlines provided. Never invent figures, events or causes. If no headline plausibly explains a move, say the cause is unclear rather than guessing.
- For each fund write EXACTLY three sentences: (1) how it performed over the week and month, (2) how that compares to its benchmark index and similar funds (say "no benchmark available" if null), (3) what market events from the headlines explain the gap, or whether it simply moved with the market.
- "status" and "assessment" are already decided by rules; explain them, never contradict them. Never give buy/sell advice; at most suggest she may want to look at the fund more closely.
- portfolio_reason: 1-2 sentences justifying the given assessment, naming specific funds and figures.
- market_summary: 2 sentences on how the Nifty indices moved this week and the main macro theme.
Return JSON only.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    market_summary: { type: "STRING" },
    portfolio_reason: { type: "STRING" },
    funds: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { scheme_code: { type: "INTEGER" }, summary: { type: "STRING" } },
        required: ["scheme_code", "summary"],
      },
    },
  },
  required: ["market_summary", "portfolio_reason", "funds"],
};

export async function writeNarrative(payload: unknown): Promise<Narrative> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text) as Narrative;
}
