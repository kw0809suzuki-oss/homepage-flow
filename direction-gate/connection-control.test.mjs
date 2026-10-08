import test from "node:test";
import assert from "node:assert/strict";
import {
  observeBoundaryConnection,
  combineBoundaryAndConnection,
} from "./connection-control.js";

test("normal connected movement reaches boundary without Connection Gate", () => {
  const result = observeBoundaryConnection({
    placedDirection: "A",
    recentMovement: [
      { kind: "search", target: "A" },
      { kind: "draft_edit", target: "A", continuationFrom: "A" },
    ],
    boundaryEvent: {
      kind: "external_action",
      target: "A",
      boundary: "ACTION",
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.connectionRequired, false);
  assert.equal(result.payload, null);
});

test("accumulated foreign movement triggers Connection Gate at boundary", () => {
  const result = observeBoundaryConnection({
    placedDirection: "A",
    recentMovement: [
      { kind: "search", target: "B" },
      { kind: "draft_edit", target: "B", continuationFrom: "B" },
    ],
    boundaryEvent: {
      kind: "external_action",
      target: "B",
      continuationFrom: "B",
      boundary: "ACTION",
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.connectionRequired, true);
  assert.equal(result.observation.observation, "BOUNDARY_CHECK_REQUIRED");
  assert.ok(result.payload.trigger_reasons.includes("TARGET_SHIFT"));
  assert.ok(result.payload.trigger_reasons.includes("ACCUMULATION_SHIFT"));
});

test("connection result can hold or preserve an otherwise allowed boundary", () => {
  const allow = { gate: "ACTION", decision: "ALLOW", reasons: [] };

  assert.deepEqual(
    combineBoundaryAndConnection(allow, "CONNECTED", true),
    allow
  );
  assert.equal(
    combineBoundaryAndConnection(allow, "OPEN_UNKNOWN", true).decision,
    "UNKNOWN"
  );
  assert.equal(
    combineBoundaryAndConnection(allow, "CONTINUING_ELSEWHERE", true).decision,
    "HOLD"
  );
});
