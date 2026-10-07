import { adaptEvent } from "./event-adapter.js";
import {
  collectExecutionFact,
  appendExecutionFact,
  EXECUTION_PHASES,
} from "./execution-facts.js";
import { detectBoundary } from "./boundary-detector.js";
import { observeDirectionEvent } from "./observer.js";

export function createExecutionOSState(directionState) {
  return {
    directionState,
    factLog: [],
  };
}

export function routeDetectedFact(fact, detection) {
  if (detection.classification === "FREE") return "FREE";
  if (detection.classification === "UNKNOWN") return "HOLD_UNKNOWN_BOUNDARY";
  if (fact.phase === EXECUTION_PHASES.PRE_EXECUTION) return "POLICY_GATE";
  if (fact.phase === EXECUTION_PHASES.POST_EXECUTION) return "REALITY_REOBSERVE";
  return "HOLD_UNKNOWN_PHASE";
}

export function processExecutionFact(osState, rawEvent) {
  const adapted = adaptEvent(rawEvent);
  if (adapted.status !== "ADAPTED") {
    return {
      osState,
      adapted,
      fact: null,
      detection: null,
      route: null,
      observation: null,
    };
  }

  const fact = collectExecutionFact(adapted.event);
  const recorded = appendExecutionFact(osState.factLog, fact);
  if (recorded.status !== "RECORDED") {
    return {
      osState,
      adapted,
      fact,
      detection: null,
      route: null,
      observation: null,
      factRecord: recorded,
    };
  }

  const detection = detectBoundary(fact);
  const route = routeDetectedFact(fact, detection);

  const observedEvent = {
    ...adapted.event,
    boundary:
      route === "POLICY_GATE" &&
      (detection.classification === "COMMIT" || detection.classification === "ACTION")
        ? detection.classification
        : "NONE",
  };
  const observation = observeDirectionEvent(osState.directionState, observedEvent);

  return {
    osState: {
      directionState: observation.state,
      factLog: recorded.log,
    },
    adapted,
    fact,
    detection,
    route,
    observation,
    factRecord: recorded,
  };
}
