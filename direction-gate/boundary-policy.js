export const BOUNDARY_TYPES = Object.freeze({
  NONE: "NONE",
  COMMIT: "COMMIT",
  ACTION: "ACTION",
});

const EPISTEMIC_STATES = new Set(["OBSERVED", "INFERRED", "UNKNOWN", "CONFLICT"]);
const IMPACT_LEVELS = new Set(["LOW", "MEDIUM", "HIGH"]);
const REVERSIBILITY = new Set(["REVERSIBLE", "COMPENSATABLE", "IRREVERSIBLE"]);

function asBool(value) {
  if (value === true || value === false) return value;
  return null;
}

export function normalizeBoundaryType(value) {
  const upper = String(value || "NONE").trim().toUpperCase();
  return Object.values(BOUNDARY_TYPES).includes(upper) ? upper : BOUNDARY_TYPES.NONE;
}

export function evaluateCommitGate(raw = {}) {
  const epistemicState = String(raw.epistemicState || "").trim().toUpperCase();
  const provenance = asBool(raw.provenance);
  const authority = asBool(raw.authority);
  const freshness = asBool(raw.freshness);

  const missing = [];
  if (!EPISTEMIC_STATES.has(epistemicState)) missing.push("epistemicState");
  if (provenance == null) missing.push("provenance");
  if (authority == null) missing.push("authority");
  if (freshness == null) missing.push("freshness");

  if (missing.length) {
    return { gate: "COMMIT", decision: "UNKNOWN", reasons: missing.map((x) => `MISSING_${x.toUpperCase()}`) };
  }
  if (epistemicState === "UNKNOWN") {
    return { gate: "COMMIT", decision: "UNKNOWN", reasons: ["EPISTEMIC_UNKNOWN"] };
  }
  if (epistemicState === "CONFLICT") {
    return { gate: "COMMIT", decision: "HOLD", reasons: ["CONFLICTING_EVIDENCE"] };
  }

  const reasons = [];
  if (!provenance) reasons.push("PROVENANCE_NOT_CONFIRMED");
  if (!authority) reasons.push("AUTHORITY_NOT_CONFIRMED");
  if (!freshness) reasons.push("FRESHNESS_NOT_CONFIRMED");

  return reasons.length
    ? { gate: "COMMIT", decision: "HOLD", reasons }
    : { gate: "COMMIT", decision: "ALLOW", reasons: [] };
}

export function evaluateActionGate(raw = {}) {
  const permission = asBool(raw.permission);
  const target = String(raw.target || "").trim();
  const scope = String(raw.scope || "").trim();
  const impact = String(raw.impact || "").trim().toUpperCase();
  const reversibility = String(raw.reversibility || "").trim().toUpperCase();

  const missing = [];
  if (permission == null) missing.push("permission");
  if (!target) missing.push("target");
  if (!scope) missing.push("scope");
  if (!IMPACT_LEVELS.has(impact)) missing.push("impact");
  if (!REVERSIBILITY.has(reversibility)) missing.push("reversibility");

  if (missing.length) {
    return { gate: "ACTION", decision: "UNKNOWN", reasons: missing.map((x) => `MISSING_${x.toUpperCase()}`) };
  }
  if (!permission) {
    return { gate: "ACTION", decision: "HOLD", reasons: ["PERMISSION_NOT_CONFIRMED"] };
  }
  if (impact === "HIGH" || reversibility === "IRREVERSIBLE") {
    return { gate: "ACTION", decision: "ESCALATE", reasons: ["HIGH_IMPACT_OR_IRREVERSIBLE"] };
  }

  return { gate: "ACTION", decision: "ALLOW", reasons: [] };
}

export function evaluateBoundaryPolicy(rawEvent = {}) {
  const boundary = normalizeBoundaryType(rawEvent.boundary);
  if (boundary === BOUNDARY_TYPES.NONE) {
    return { gate: "NONE", decision: "FREE", reasons: [] };
  }
  if (boundary === BOUNDARY_TYPES.COMMIT) {
    return evaluateCommitGate(rawEvent.commit || {});
  }
  return evaluateActionGate(rawEvent.action || {});
}

export function evaluateReobserve(raw = {}) {
  const status = String(raw.status || "").trim().toUpperCase();
  if (["VERIFIED", "CONFLICT", "UNKNOWN"].includes(status)) {
    return { status };
  }
  return { status: "UNKNOWN" };
}
