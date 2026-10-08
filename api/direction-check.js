const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_STORE_KEY = "__directionCheckRateLimitStore";

function getRateLimitStore() {
  if (!globalThis[RATE_LIMIT_STORE_KEY]) {
    globalThis[RATE_LIMIT_STORE_KEY] = new Map();
  }
  return globalThis[RATE_LIMIT_STORE_KEY];
}

function getClientKey(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(",")[0].trim() || "unknown";
  }
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers?.["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function consumeRateLimit(req) {
  const now = Date.now();
  const store = getRateLimitStore();
  const key = getClientKey(req);
  const current = store.get(key);

  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    store.set(key, next);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: next.resetAt,
    };
  }

  current.count += 1;

  if (store.size > 5000) {
    for (const [storedKey, value] of store) {
      if (now >= value.resetAt) store.delete(storedKey);
    }
  }

  return {
    allowed: current.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count),
    resetAt: current.resetAt,
  };
}

function applyRateLimitHeaders(res, result) {
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
}

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
  const parsed = JSON.parse(String(text || "").trim());
  const allowed = ["CONNECTED", "OPEN_UNKNOWN", "CONTINUING_ELSEWHERE"];
  if (!allowed.includes(parsed.state)) throw new Error("invalid state");
  return {
    state: parsed.state,
    evidence: String(parsed.evidence || "").slice(0, 280),
  };
}

async function runConnectionGate(
  body = {},
  {
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_DIRECTION_MODEL || "gpt-6-luna",
    fetchImpl = fetch,
  } = {}
) {
  if (!apiKey) {
    return {
      statusCode: 503,
      body: {
        error: "OPENAI_API_KEY is not configured",
        boundary: "No API call was made.",
      },
    };
  }

  const placed = String(body.placed_direction || "").trim();
  const movement = Array.isArray(body.recent_movement)
    ? body.recent_movement.slice(-8)
    : [];
  const boundaryEvent = body.boundary_event || null;

  if (!placed || movement.length === 0) {
    return {
      statusCode: 400,
      body: {
        error: "placed_direction and recent_movement are required",
      },
    };
  }

  const prompt = [
    "You are Connection Gate, not a goal-inference or authorization system.",
    "A boundary event is about to occur.",
    "Judge only whether recent movement is still connected to the human-placed direction.",
    "Do not decide whether the commit/action itself is permitted.",
    "Do not invent a replacement goal.",
    "Do not call exploration a mistake.",
    "Use OPEN_UNKNOWN when the connection cannot be established.",
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

  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: "none" },
        input: prompt,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "connection_gate_result",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                state: {
                  type: "string",
                  enum: ["CONNECTED", "OPEN_UNKNOWN", "CONTINUING_ELSEWHERE"],
                },
                evidence: {
                  type: "string",
                  description: "Brief evidence for the connection state.",
                },
              },
              required: ["state", "evidence"],
            },
          },
        },
        max_output_tokens: 200,
        store: false,
      }),
    });
  } catch {
    return {
      statusCode: 503,
      body: {
        error: "Connection Gate runtime unavailable",
      },
    };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    return {
      statusCode: 502,
      body: {
        error: "Connection Gate returned invalid JSON",
        openai_status: response.status,
      },
    };
  }

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: {
        error: "OpenAI request failed",
        detail: data?.error?.message || "unknown error",
      },
    };
  }

  if (data?.status === "incomplete") {
    return {
      statusCode: 502,
      body: {
        error: "Connection Gate response incomplete",
        incomplete_reason: data?.incomplete_details?.reason || "unknown",
        usage: data?.usage || null,
      },
    };
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    return {
      statusCode: 502,
      body: {
        error: "Connection Gate returned no visible output",
        response_status: data?.status || null,
        output_types: Array.isArray(data?.output)
          ? data.output.map((item) => item?.type || "unknown")
          : [],
        usage: data?.usage || null,
      },
    };
  }

  try {
    const result = parseGateJson(outputText);
    return {
      statusCode: 200,
      body: {
        ...result,
        model: data.model || model,
        usage: data.usage || null,
      },
    };
  } catch {
    return {
      statusCode: 502,
      body: {
        error: "Connection Gate returned unparsable structured output",
        raw: outputText.slice(0, 500),
        response_status: data?.status || null,
        usage: data?.usage || null,
      },
    };
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const rateLimit = consumeRateLimit(req);
  applyRateLimitHeaders(res, rateLimit);

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    );
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: "Too many requests",
      boundary: "No OpenAI API call was made.",
      retry_after_seconds: retryAfterSeconds,
    });
  }

  const result = await runConnectionGate(req.body || {});
  return res.status(result.statusCode).json(result.body);
}

module.exports = handler;
module.exports.runConnectionGate = runConnectionGate;
