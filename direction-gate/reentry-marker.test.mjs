import test from "node:test";
import assert from "node:assert/strict";
import * as marker from "./reentry-marker.js";

const {
  markReturnPoint,
  completeReturn,
  composeStance,
} = marker;

test("marks the current position and keeps concrete references", () => {
  const packet = { current_position: "A", return_point: null };
  const next = markReturnPoint(packet, [
    { kind: "repository", ref: "branch:direction-gate-v0", stance: "observed" },
  ]);

  assert.equal(next.return_point.current_position, "A");
  assert.deepEqual(next.return_point.references, [
    { kind: "repository", ref: "branch:direction-gate-v0", stance: "observed" },
  ]);
});

test("does not overwrite an active return point during a branch", () => {
  const first = markReturnPoint({ current_position: "A", return_point: null }, []);
  const branched = { ...first, current_position: "B" };
  const second = markReturnPoint(branched, [
    { kind: "file", ref: "B.txt", stance: "observed" },
  ]);

  assert.equal(second.return_point.current_position, "A");
  assert.deepEqual(second.return_point.references, []);
});

test("consumes the return point after successful return and moves to A-prime", () => {
  const marked = markReturnPoint({ current_position: "A", return_point: null }, []);
  const returned = completeReturn({ ...marked, current_position: "B" }, "A-prime");

  assert.equal(returned.current_position, "A-prime");
  assert.equal(returned.return_point, null);
});

test("does not consume the return point when return has not succeeded", () => {
  const marked = markReturnPoint({ current_position: "A", return_point: null }, []);
  const stillBranched = completeReturn({ ...marked, current_position: "B" }, "");

  assert.equal(stillBranched.current_position, "B");
  assert.equal(stillBranched.return_point.current_position, "A");
});

test("composes stance conservatively", () => {
  assert.equal(composeStance(["observed", "observed"]), "observed");
  assert.equal(composeStance(["observed", "inferred"]), "inferred");
  assert.equal(composeStance(["observed", "unknown"]), "unknown");
  assert.equal(composeStance(["inferred", "unknown"]), "unknown");
});


test("explicitly promoting B to the main line discards the old return point", () => {
  assert.equal(typeof marker.promoteBranch, "function");

  const marked = markReturnPoint({ current_position: "A", return_point: null }, [
    { kind: "repository", ref: "branch:direction-gate-v0", stance: "observed" },
  ]);
  const branched = { ...marked, current_position: "B" };
  const promoted = marker.promoteBranch(branched);

  assert.equal(promoted.current_position, "B");
  assert.equal(promoted.return_point, null);
});
