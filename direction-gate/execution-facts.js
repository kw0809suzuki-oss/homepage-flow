export const EXECUTION_PHASES = Object.freeze({
  PRE_EXECUTION: "PRE_EXECUTION",
  POST_EXECUTION: "POST_EXECUTION",
  UNSPECIFIED: "UNSPECIFIED",
});

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function canonicalFactType(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeExecutionPhase(value) {
  const upper = clean(value).toUpperCase();
  return Object.values(EXECUTION_PHASES).includes(upper)
    ? upper
    : EXECUTION_PHASES.UNSPECIFIED;
}

export function collectExecutionFact(normalizedEvent = {}) {
  const fact = {
    factType: canonicalFactType(normalizedEvent.kind),
    phase: normalizeExecutionPhase(normalizedEvent.phase),
    source: clean(normalizedEvent.source) || "unknown",
    sourceEventId: clean(normalizedEvent.sourceEventId) || null,
    target: clean(normalizedEvent.target) || null,
    resultDestination: clean(normalizedEvent.resultDestination) || null,
    continuationFrom: clean(normalizedEvent.continuationFrom) || null,
    timestamp: normalizedEvent.timestamp || new Date().toISOString(),
    evidence: normalizedEvent.evidence ?? null,
  };

  return Object.freeze(fact);
}

export function validateExecutionFact(fact) {
  const errors = [];
  if (!fact || typeof fact !== "object") errors.push("FACT_REQUIRED");
  if (!clean(fact?.factType)) errors.push("FACT_TYPE_REQUIRED");
  if (!clean(fact?.source)) errors.push("SOURCE_REQUIRED");
  if (!fact?.timestamp) errors.push("TIMESTAMP_REQUIRED");
  if (!Object.values(EXECUTION_PHASES).includes(fact?.phase)) {
    errors.push("INVALID_PHASE");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function appendExecutionFact(log = [], fact, limit = 50) {
  const validation = validateExecutionFact(fact);
  if (!validation.valid) {
    return {
      status: "REJECTED",
      errors: validation.errors,
      log: [...log],
    };
  }

  return {
    status: "RECORDED",
    errors: [],
    log: [...log, fact].slice(-Math.max(1, limit)),
  };
}
