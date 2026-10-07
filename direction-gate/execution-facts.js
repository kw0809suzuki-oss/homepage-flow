function clean(value) {
  return value == null ? "" : String(value).trim();
}

function canonicalFactType(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function collectExecutionFact(normalizedEvent = {}) {
  const fact = {
    factType: canonicalFactType(normalizedEvent.kind),
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
