export const DEFAULTS = Object.freeze({
  continuationThreshold: 2,
  accumulationThreshold: 2,
  returnMissingThreshold: 3,
  recentLimit: 8,
});

export function createDirectionState(placedDirection = "", config = {}) {
  return {
    placedDirection: String(placedDirection || "").trim(),
    connectionState: "UNOBSERVED",
    recentEvents: [],
    lastReturnIndex: null,
    triggerCount: 0,
    eventCount: 0,
    config: { ...DEFAULTS, ...config },
  };
}

function sameNonEmpty(a, b) {
  return Boolean(a && b && String(a).trim() === String(b).trim());
}

export function observeDirectionEvent(state, rawEvent) {
  const event = {
    kind: String(rawEvent?.kind || "work"),
    target: String(rawEvent?.target || "").trim(),
    resultDestination: String(rawEvent?.resultDestination || "").trim(),
    continuationFrom: String(rawEvent?.continuationFrom || "").trim(),
    timestamp: rawEvent?.timestamp || new Date().toISOString(),
  };

  const next = {
    ...state,
    eventCount: state.eventCount + 1,
    recentEvents: [...state.recentEvents, event].slice(-state.config.recentLimit),
  };

  if (
    sameNonEmpty(event.resultDestination, state.placedDirection) ||
    sameNonEmpty(event.target, state.placedDirection)
  ) {
    next.lastReturnIndex = next.eventCount;
  }

  const recent = next.recentEvents;
  const last = recent[recent.length - 1];
  const previous = recent[recent.length - 2];

  const targetShift =
    recent.length >= 2 &&
    !sameNonEmpty(last.target, state.placedDirection) &&
    sameNonEmpty(last.target, previous?.target);

  const continuationShift =
    Boolean(last.continuationFrom) &&
    !sameNonEmpty(last.continuationFrom, state.placedDirection) &&
    sameNonEmpty(last.continuationFrom, last.target);

  const foreignTargetCounts = recent.reduce((acc, e) => {
    if (e.target && !sameNonEmpty(e.target, state.placedDirection)) {
      acc[e.target] = (acc[e.target] || 0) + 1;
    }
    return acc;
  }, {});
  const accumulationShift = Object.values(foreignTargetCounts).some(
    (count) => count >= state.config.accumulationThreshold
  );

  const sinceReturn =
    next.lastReturnIndex == null
      ? next.eventCount
      : next.eventCount - next.lastReturnIndex;
  const returnMissing =
    next.eventCount >= state.config.returnMissingThreshold &&
    sinceReturn >= state.config.returnMissingThreshold;

  const reasons = [];
  if (targetShift) reasons.push("TARGET_SHIFT");
  if (continuationShift) reasons.push("CONTINUATION_SHIFT");
  if (accumulationShift) reasons.push("ACCUMULATION_SHIFT");
  if (returnMissing) reasons.push("RETURN_MISSING");

  const trigger = reasons.length > 0;
  if (trigger) next.triggerCount += 1;

  return {
    state: next,
    observation: trigger ? "CHECK_WORTHY_CHANGE" : "NO_TRIGGER",
    reasons,
  };
}

export function buildDirectionCheckPayload(state, reasons = []) {
  return {
    placed_direction: state.placedDirection,
    recent_movement: state.recentEvents.map((e) => ({
      kind: e.kind,
      target: e.target,
      result_destination: e.resultDestination || null,
      continuation_from: e.continuationFrom || null,
      timestamp: e.timestamp,
    })),
    last_observed_return_event:
      state.lastReturnIndex == null ? null : state.lastReturnIndex,
    trigger_reasons: reasons,
  };
}
