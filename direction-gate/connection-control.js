import {
  createDirectionState,
  observeDirectionEvent,
  buildDirectionCheckPayload,
} from "./observer.js";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeMovement(raw = {}) {
  return {
    kind: clean(raw.kind) || "work",
    target: clean(raw.target),
    resultDestination: clean(raw.resultDestination ?? raw.result_destination),
    continuationFrom: clean(raw.continuationFrom ?? raw.continuation_from),
    boundary: "NONE",
    timestamp: raw.timestamp || new Date().toISOString(),
  };
}

export function observeBoundaryConnection({
  placedDirection = "",
  recentMovement = [],
  boundaryEvent = {},
} = {}) {
  const placed = clean(placedDirection);
  if (!placed) {
    return {
      valid: false,
      reason: "PLACED_DIRECTION_REQUIRED",
      connectionRequired: false,
      state: null,
      observation: null,
      payload: null,
    };
  }

  let state = createDirectionState(placed);

  for (const movement of Array.isArray(recentMovement)
    ? recentMovement.slice(-8)
    : []) {
    state = observeDirectionEvent(state, normalizeMovement(movement)).state;
  }

  const event = {
    kind: clean(boundaryEvent.kind) || "external_action",
    target: clean(boundaryEvent.target),
    resultDestination: clean(
      boundaryEvent.resultDestination ?? boundaryEvent.result_destination
    ),
    continuationFrom: clean(
      boundaryEvent.continuationFrom ?? boundaryEvent.continuation_from
    ),
    boundary: clean(boundaryEvent.boundary) || "NONE",
    timestamp: boundaryEvent.timestamp || new Date().toISOString(),
  };

  const observation = observeDirectionEvent(state, event);
  const nextState = observation.state;
  const connectionRequired =
    observation.observation === "BOUNDARY_CHECK_REQUIRED";

  return {
    valid: true,
    reason: null,
    connectionRequired,
    state: nextState,
    observation,
    payload: connectionRequired
      ? buildDirectionCheckPayload(
          nextState,
          observation.reasons,
          {
            type: event.boundary,
            kind: event.kind,
            target: event.target,
          }
        )
      : null,
  };
}

export function combineBoundaryAndConnection(
  boundaryDecision,
  connectionState,
  connectionRequired
) {
  if (!connectionRequired) return boundaryDecision;
  if (connectionState === "CONNECTED") return boundaryDecision;

  if (connectionState === "OPEN_UNKNOWN") {
    return {
      gate: boundaryDecision.gate,
      decision: "UNKNOWN",
      reasons: [
        "CONNECTION_OPEN_UNKNOWN",
        ...(boundaryDecision.reasons || []),
      ],
    };
  }

  if (connectionState === "CONTINUING_ELSEWHERE") {
    return {
      gate: boundaryDecision.gate,
      decision: "HOLD",
      reasons: [
        "CONTINUING_ELSEWHERE",
        ...(boundaryDecision.reasons || []),
      ],
    };
  }

  return {
    gate: boundaryDecision.gate,
    decision: "UNKNOWN",
    reasons: [
      "CONNECTION_CHECK_FAILED",
      ...(boundaryDecision.reasons || []),
    ],
  };
}
