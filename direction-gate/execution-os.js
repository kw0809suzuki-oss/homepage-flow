import { adaptEvent } from "./event-adapter.js";
import { collectExecutionFact, appendExecutionFact } from "./execution-facts.js";
import { detectBoundary } from "./boundary-detector.js";
import { observeDirectionEvent } from "./observer.js";

export function createExecutionOSState(directionState) {
  return {
    directionState,
    factLog: [],
  };
}

export function processExecutionFact(osState, rawEvent) {
  const adapted = adaptEvent(rawEvent);
  if (adapted.status !== "ADAPTED") {
    return {
      osState,
      adapted,
      fact: null,
      detection: null,
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
      observation: null,
      factRecord: recorded,
    };
  }

  const detection = detectBoundary(fact);
  const observedEvent = {
    ...adapted.event,
    boundary:
      detection.classification === "COMMIT" || detection.classification === "ACTION"
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
    observation,
    factRecord: recorded,
  };
}
