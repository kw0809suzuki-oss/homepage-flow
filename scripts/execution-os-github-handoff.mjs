import { execFileSync } from "node:child_process";
import {
  collectExecutionFact,
  appendExecutionFact
} from "../direction-gate/execution-facts.js";
import { detectBoundary } from "../direction-gate/boundary-detector.js";

const before = String(process.env.GITHUB_BEFORE || "").trim();
const after = String(process.env.GITHUB_SHA || "").trim();

function changedFiles() {
  const zeros = /^0+$/.test(before);
  const args = zeros
    ? ["show", "--format=", "--name-status", after]
    : ["diff", "--name-status", before, after];

  const out = execFileSync("git", args, { encoding: "utf8" });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const status = parts[0] || "";
      const path = parts[parts.length - 1] || "";
      return { status, path };
    });
}

function kindFromStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s.startsWith("D")) return "delete";
  if (s.startsWith("A") || s.startsWith("M") || s.startsWith("R") || s.startsWith("C")) {
    return "file_write";
  }
  return "unknown";
}

let factLog = [];

const rows = changedFiles().map(({ status, path }) => {
  const fact = collectExecutionFact({
    kind: kindFromStatus(status),
    source: "github-actions-push",
    sourceEventId: after,
    target: path,
    timestamp: new Date().toISOString(),
    evidence: {
      repository: process.env.GITHUB_REPOSITORY || null,
      ref: process.env.GITHUB_REF || null,
      before: before || null,
      after: after || null,
      git_status: status || null,
    },
  });

  const record = appendExecutionFact(factLog, fact);
  factLog = record.log;

  return {
    record_status: record.status,
    record_errors: record.errors,
    fact,
    detection: detectBoundary(fact),
  };
});

const result = {
  handoff: "AUTOMATIC",
  runtime: "github-actions",
  repository: process.env.GITHUB_REPOSITORY || null,
  ref: process.env.GITHUB_REF || null,
  before: before || null,
  after: after || null,
  fact_count: factLog.length,
  items: rows,
};

console.log("EXECUTION_OS_HANDOFF_BEGIN");
console.log(JSON.stringify(result, null, 2));
console.log("EXECUTION_OS_HANDOFF_END");
