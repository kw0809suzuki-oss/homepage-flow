const FREE_SIGNALS = new Set([
  "search",
  "read",
  "inspect",
  "compare",
  "generate",
  "draft",
  "draft_edit",
  "response.completed",
  "response.in_progress",
  "response.created",
]);

const COMMIT_SIGNALS = new Set([
  "commit",
  "file_write",
  "memory_write",
  "record_write",
  "state_write",
]);

const ACTION_SIGNALS = new Set([
  "send",
  "publish",
  "permission_change",
  "external_action",
  "purchase",
  "delete",
  "agent.session.action_required",
]);

function normalizeSignal(value) {
  const raw = value == null ? "" : String(value).trim().toLowerCase();
  if (raw.includes(".")) return raw;
  return raw.replace(/[\s-]+/g, "_");
}

export function detectBoundary(fact = {}) {
  const signal = normalizeSignal(fact.factType);

  if (!signal) {
    return {
      classification: "UNKNOWN",
      signal: null,
      reason: "FACT_TYPE_MISSING",
    };
  }

  if (FREE_SIGNALS.has(signal)) {
    return {
      classification: "FREE",
      signal,
      reason: "KNOWN_FREE_SIGNAL",
    };
  }

  if (COMMIT_SIGNALS.has(signal)) {
    return {
      classification: "COMMIT",
      signal,
      reason: "KNOWN_COMMIT_SIGNAL",
    };
  }

  if (ACTION_SIGNALS.has(signal)) {
    return {
      classification: "ACTION",
      signal,
      reason: "KNOWN_ACTION_SIGNAL",
    };
  }

  return {
    classification: "UNKNOWN",
    signal,
    reason: "UNRECOGNIZED_SIGNAL",
  };
}

export const DETECTOR_RULES = Object.freeze({
  FREE: [...FREE_SIGNALS],
  COMMIT: [...COMMIT_SIGNALS],
  ACTION: [...ACTION_SIGNALS],
  fallback: "UNKNOWN",
});
