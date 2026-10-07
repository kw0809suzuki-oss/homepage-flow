const EXPECTED_REPO = "kw0809suzuki-oss/homepage-flow";
const EXPECTED_REF = "refs/heads/direction-gate-v0";

function isSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function classifyFile(file = {}) {
  const status = String(file.status || "").toLowerCase();
  const filename = String(file.filename || "").trim();

  if (!filename) {
    return {
      fact: null,
      detection: {
        classification: "UNKNOWN",
        signal: null,
        reason: "FILENAME_MISSING",
      },
    };
  }

  if (status === "removed") {
    return {
      fact: {
        factType: "delete",
        source: "github-push",
        target: filename,
      },
      detection: {
        classification: "ACTION",
        signal: "delete",
        reason: "KNOWN_ACTION_SIGNAL",
      },
    };
  }

  if (["added", "modified", "renamed", "changed", "copied"].includes(status)) {
    return {
      fact: {
        factType: "file_write",
        source: "github-push",
        target: filename,
      },
      detection: {
        classification: "COMMIT",
        signal: "file_write",
        reason: "KNOWN_COMMIT_SIGNAL",
      },
    };
  }

  return {
    fact: {
      factType: status || "unknown",
      source: "github-push",
      target: filename,
    },
    detection: {
      classification: "UNKNOWN",
      signal: status || null,
      reason: "UNRECOGNIZED_FILE_STATUS",
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const repository = String(req.body?.repository || "").trim();
  const ref = String(req.body?.ref || "").trim();
  const sha = String(req.body?.sha || "").trim();

  if (repository !== EXPECTED_REPO || ref !== EXPECTED_REF || !isSha(sha)) {
    return res.status(400).json({
      handoff: "REJECTED",
      reason: "SOURCE_SCOPE_MISMATCH",
    });
  }

  let response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${EXPECTED_REPO}/commits/${sha}`,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "User-Agent": "execution-os-v0",
        },
      }
    );
  } catch {
    return res.status(503).json({
      handoff: "UNKNOWN",
      reason: "GITHUB_REALITY_UNAVAILABLE",
    });
  }

  if (!response.ok) {
    return res.status(response.status === 404 ? 409 : 503).json({
      handoff: response.status === 404 ? "REJECTED" : "UNKNOWN",
      reason:
        response.status === 404
          ? "COMMIT_NOT_FOUND_IN_GITHUB"
          : "GITHUB_REALITY_UNAVAILABLE",
      github_status: response.status,
    });
  }

  const commit = await response.json();

  if (String(commit?.sha || "") !== sha) {
    return res.status(409).json({
      handoff: "REJECTED",
      reason: "COMMIT_SHA_MISMATCH",
    });
  }

  const files = Array.isArray(commit?.files) ? commit.files : [];
  const items = files.map((file) => {
    const classified = classifyFile(file);
    const fact = classified.fact
      ? {
          ...classified.fact,
          sourceEventId: sha,
          timestamp: commit?.commit?.committer?.date || new Date().toISOString(),
          evidence: {
            repository: EXPECTED_REPO,
            ref: EXPECTED_REF,
            commit_sha: sha,
            file_status: file.status || null,
          },
        }
      : null;

    return {
      fact,
      detection: classified.detection,
    };
  });

  return res.status(200).json({
    handoff: "ACCEPTED",
    source: "github-push",
    reality_checked: true,
    repository: EXPECTED_REPO,
    ref: EXPECTED_REF,
    sha,
    fact_count: items.length,
    items,
  });
};
