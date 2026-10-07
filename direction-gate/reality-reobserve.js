function clean(value) {
  return value == null ? "" : String(value);
}

export function reobserveGithubFile(expected = {}, observed = {}) {
  const expectedRepo = clean(expected.repo).trim();
  const expectedBranch = clean(expected.branch).trim();
  const expectedPath = clean(expected.path).trim();
  const expectedContent = clean(expected.content);
  const expectedCommitSha = clean(expected.commitSha).trim();

  if (!expectedRepo || !expectedBranch || !expectedPath) {
    return {
      status: "UNKNOWN",
      reasons: ["EXPECTED_TARGET_INCOMPLETE"],
    };
  }

  if (observed.unavailable === true) {
    return {
      status: "UNKNOWN",
      reasons: ["REALITY_UNAVAILABLE"],
    };
  }

  if (observed.exists === false) {
    return {
      status: "CONFLICT",
      reasons: ["TARGET_NOT_FOUND"],
    };
  }

  const reasons = [];

  if (clean(observed.repo).trim() !== expectedRepo) {
    reasons.push("REPO_MISMATCH");
  }
  if (clean(observed.branch).trim() !== expectedBranch) {
    reasons.push("BRANCH_MISMATCH");
  }
  if (clean(observed.path).trim() !== expectedPath) {
    reasons.push("PATH_MISMATCH");
  }
  if (clean(observed.content) !== expectedContent) {
    reasons.push("CONTENT_MISMATCH");
  }

  if (expectedCommitSha) {
    if (observed.commitExists === false) {
      reasons.push("COMMIT_NOT_FOUND");
    } else if (
      clean(observed.commitSha).trim() &&
      clean(observed.commitSha).trim() !== expectedCommitSha
    ) {
      reasons.push("COMMIT_MISMATCH");
    } else if (observed.commitExists !== true) {
      return {
        status: "UNKNOWN",
        reasons: ["COMMIT_NOT_OBSERVED"],
      };
    }
  }

  return reasons.length
    ? { status: "CONFLICT", reasons }
    : { status: "VERIFIED", reasons: [] };
}

export function normalizeGithubRealityObservation(raw = {}) {
  return {
    repo: clean(raw.repo).trim(),
    branch: clean(raw.branch).trim(),
    path: clean(raw.path).trim(),
    exists: raw.exists === true ? true : raw.exists === false ? false : null,
    content: raw.content == null ? null : String(raw.content),
    commitExists:
      raw.commitExists === true ? true : raw.commitExists === false ? false : null,
    commitSha: clean(raw.commitSha).trim() || null,
    unavailable: raw.unavailable === true,
    observedAt: raw.observedAt || new Date().toISOString(),
    source: clean(raw.source).trim() || "github-reality-read",
  };
}
