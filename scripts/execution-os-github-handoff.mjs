import { execFileSync } from "node:child_process";
import {
  collectExecutionFact,
  appendExecutionFact
} from "../direction-gate/execution-facts.js";
import { detectBoundary } from "../direction-gate/boundary-detector.js";
import { routeDetectedFact } from "../direction-gate/execution-os.js";
import { reobserveGithubExecutionFact } from "../direction-gate/reality-reobserve.js";

const before = String(process.env.GITHUB_BEFORE || "").trim();
const after = String(process.env.GITHUB_SHA || "").trim();
const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
const ref = String(process.env.GITHUB_REF || "").trim();
const token = String(process.env.GITHUB_TOKEN || "").trim();

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

async function refetchGithubCommit() {
  if (!repository || !after || !token) {
    return {
      unavailable: true,
      commitExists: null,
      commitSha: null,
      files: [],
      source: "github-rest-refetch",
      reason: "REALITY_READ_INPUT_MISSING",
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/commits/${after}`,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "execution-os-v0",
        },
      }
    );

    if (response.status === 404) {
      return {
        unavailable: false,
        commitExists: false,
        commitSha: after,
        files: [],
        source: "github-rest-refetch",
      };
    }

    if (!response.ok) {
      return {
        unavailable: true,
        commitExists: null,
        commitSha: null,
        files: [],
        source: "github-rest-refetch",
        githubStatus: response.status,
      };
    }

    const data = await response.json();
    return {
      unavailable: false,
      commitExists: true,
      commitSha: String(data?.sha || ""),
      files: Array.isArray(data?.files)
        ? data.files.map((file) => ({
            filename: file?.filename || "",
            status: file?.status || "",
          }))
        : [],
      source: "github-rest-refetch",
    };
  } catch {
    return {
      unavailable: true,
      commitExists: null,
      commitSha: null,
      files: [],
      source: "github-rest-refetch",
      reason: "REALITY_READ_FAILED",
    };
  }
}

let factLog = [];

const rows = changedFiles().map(({ status, path }) => {
  const fact = collectExecutionFact({
    kind: kindFromStatus(status),
    phase: "POST_EXECUTION",
    source: "github-actions-push",
    sourceEventId: after,
    target: path,
    timestamp: new Date().toISOString(),
    evidence: {
      repository: repository || null,
      ref: ref || null,
      before: before || null,
      after: after || null,
      git_status: status || null,
    },
  });

  const record = appendExecutionFact(factLog, fact);
  factLog = record.log;
  const detection = detectBoundary(fact);

  return {
    record_status: record.status,
    record_errors: record.errors,
    fact,
    detection,
    route: routeDetectedFact(fact, detection),
  };
});

const reality = await refetchGithubCommit();

const items = rows.map((row) => ({
  ...row,
  reobserve:
    row.route === "REALITY_REOBSERVE"
      ? reobserveGithubExecutionFact(row.fact, reality)
      : null,
}));

const result = {
  handoff: "AUTOMATIC",
  runtime: "github-actions",
  repository: repository || null,
  ref: ref || null,
  before: before || null,
  after: after || null,
  fact_count: factLog.length,
  reality_source: reality.source,
  items,
};

console.log("EXECUTION_OS_HANDOFF_BEGIN");
console.log(JSON.stringify(result, null, 2));
console.log("EXECUTION_OS_HANDOFF_END");
