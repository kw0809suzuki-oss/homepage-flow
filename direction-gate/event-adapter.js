function clean(value) {
  return value == null ? "" : String(value).trim();
}

function upper(value, fallback = "") {
  const v = clean(value).toUpperCase();
  return v || fallback;
}

function normalizeExplicit(raw) {
  return {
    kind: clean(raw.kind) || "unknown",
    phase: upper(raw.phase, "UNSPECIFIED"),
    target: clean(raw.target),
    resultDestination: clean(raw.result_destination ?? raw.resultDestination),
    continuationFrom: clean(raw.continuation_from ?? raw.continuationFrom),
    timestamp: raw.timestamp || new Date().toISOString(),
    source: clean(raw.source) || "explicit",
    sourceEventId: clean(raw.source_event_id ?? raw.sourceEventId) || null,
    evidence: raw.evidence ?? null,
  };
}

function normalizeOpenAIResponse(raw) {
  const type = clean(raw.type);
  const data = raw.data || {};
  const responseId = clean(data.id || raw.response_id);

  if (!type.startsWith("response.")) return null;

  return {
    kind: type,
    phase: upper(raw.phase, "UNSPECIFIED"),
    target: clean(raw.target),
    resultDestination: clean(raw.result_destination),
    continuationFrom: clean(raw.continuation_from),
    timestamp: raw.timestamp || new Date().toISOString(),
    source: "openai-response",
    sourceEventId: clean(raw.id) || responseId || null,
    evidence: {
      response_id: responseId || null,
      event_type: type,
    },
  };
}

function normalizeOpenAIAgentSession(raw) {
  const type = clean(raw.type);
  const data = raw.data || {};
  if (!type.startsWith("agent.session.")) return null;

  const requiredAction = data.required_action || null;
  const actionType = clean(requiredAction?.type);

  return {
    kind: type,
    phase:
      type === "agent.session.action_required"
        ? "PRE_EXECUTION"
        : upper(raw.phase, "UNSPECIFIED"),
    target: clean(raw.target || actionType),
    resultDestination: clean(raw.result_destination),
    continuationFrom: clean(raw.continuation_from),
    timestamp: raw.timestamp || new Date().toISOString(),
    source: "openai-agent-session",
    sourceEventId: clean(raw.id || data.id) || null,
    evidence: {
      session_id: clean(data.id) || null,
      event_type: type,
      required_action_type: actionType || null,
    },
  };
}

export function normalizeEvent(raw = {}) {
  const source = upper(raw.source_type ?? raw.sourceType ?? raw.source);

  if (source === "OPENAI_RESPONSE" || clean(raw.type).startsWith("response.")) {
    return normalizeOpenAIResponse(raw);
  }

  if (
    source === "OPENAI_AGENT_SESSION" ||
    clean(raw.type).startsWith("agent.session.")
  ) {
    return normalizeOpenAIAgentSession(raw);
  }

  return normalizeExplicit(raw);
}

export function validateNormalizedEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object") errors.push("EVENT_REQUIRED");
  if (!clean(event?.kind)) errors.push("KIND_REQUIRED");
  if (!clean(event?.source)) errors.push("SOURCE_REQUIRED");

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function adaptEvent(raw = {}) {
  const event = normalizeEvent(raw);
  const validation = validateNormalizedEvent(event);

  return {
    status: validation.valid ? "ADAPTED" : "REJECTED",
    event,
    errors: validation.errors,
  };
}
