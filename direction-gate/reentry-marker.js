const STANCE_ORDER = Object.freeze({
  observed: 0,
  inferred: 1,
  unknown: 2,
});

function cloneReferences(references) {
  return (references || []).map((item) => ({ ...item }));
}

export function markReturnPoint(packet, references = []) {
  if (packet?.return_point?.status === "active") {
    return { ...packet };
  }

  return {
    ...packet,
    return_point: {
      status: "active",
      current_position: String(packet?.current_position || ""),
      references: cloneReferences(references),
    },
  };
}

export function completeReturn(packet, nextPosition) {
  if (packet?.return_point?.status !== "active") {
    return { ...packet };
  }

  const resolvedPosition = String(nextPosition || "").trim();
  if (!resolvedPosition) {
    return { ...packet };
  }

  return {
    ...packet,
    current_position: resolvedPosition,
    return_point: null,
  };
}

export function composeStance(stances = []) {
  if (!stances.length) return "unknown";

  let weakest = "observed";
  for (const stance of stances) {
    if (!(stance in STANCE_ORDER)) return "unknown";
    if (STANCE_ORDER[stance] > STANCE_ORDER[weakest]) weakest = stance;
  }
  return weakest;
}


export function promoteBranch(packet, nextPosition = "") {
  const promotedPosition = String(nextPosition || packet?.current_position || "").trim();

  return {
    ...packet,
    current_position: promotedPosition,
    return_point: null,
  };
}
