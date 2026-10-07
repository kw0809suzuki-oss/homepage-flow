function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        return part.text;
      }
    }
  }
  return "";
}

function parseGateJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const allowed = ["CONNECTED", "OPEN_UNKNOWN", "CONTINUING_ELSEWHERE"];
  if (!allowed.includes(parsed.state)) throw new Error("invalid state");
  return {
    state: parsed.state,
    evidence: String(parsed.evidence || "").slice(0, 280),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "OPENAI_API_KEY is not configured",
      boundary: "No API call was made.",
    });
  }

  const body = req.body || {};
  const placed = String(body.placed_direction || "").trim();
  const movement = Array.isArray(body.recent_movement)
    ? body.recent_movement.slice(-8)
    : [];
  const boundaryEvent = body.boundary_event || null;

  if (!placed || movement.length === 0) {
    return res.status(400).json({ error: "placed_direction and recent_movement are required" });
  }

  const prompt = [
    "You are Connection Gate, not a goal-inference or authorization system.",
    "A boundary event is about to occur. Judge only whether recent movement is still connected to the human-placed direction.",
    "Do not decide whether the commit/action itself is permitted. Do not invent a replacement goal.",
    "Do not call exploration a mistake. Use OPEN_UNKNOWN when the connection cannot be established.",
    "Return JSON only with exactly: state, evidence.",
    'state must be one of: "CONNECTED", "OPEN_UNKNOWN", "CONTINUING_ELSEWHERE".',
    "Keep evidence under 40 words.",
    "",
    "PLACED DIRECTION:",
    placed,
    "",
    "RECENT MOVEMENT:",
    JSON.stringify(movement),
    "",
    "PENDING CHANGE REASONS:",
    JSON.stringify(body.trigger_reasons || []),
    "",
    "BOUNDARY EVENT:",
    JSON.stringify(boundaryEvent),
    "",
    "LAST OBSERVED RETURN EVENT:",
    JSON.stringify(body.last_observed_return_event ?? null),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_DIRECTION_MODEL || "gpt-6-luna",
      input: prompt,
      max_output_tokens: 120,
      store: false,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({
      error: "OpenAI request failed",
      detail: data?.error?.message || "unknown error",
    });
  }

  try {
    const result = parseGateJson(extractOutputText(data));
    return res.status(200).json({
      ...result,
      model: data.model || process.env.OPENAI_DIRECTION_MODEL || "gpt-6-luna",
      usage: data.usage || null,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Connection Gate returned unparsable output",
      raw: extractOutputText(data).slice(0, 500),
    });
  }
};
