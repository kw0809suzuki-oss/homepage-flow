export const MAX_HEALTH_AGE_MS = 5 * 60 * 1000;

const FAILURE_CONCLUSIONS = new Set([
  "failure",
  "timed_out",
  "action_required",
  "startup_failure"
]);

export function shortSha(value){
  return typeof value === "string" && value ? value.slice(0, 7) : "—";
}

export function ageMs(timestamp, now = Date.now()){
  const value = Date.parse(timestamp || "");
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - value);
}

export function formatAge(ms){
  if (!Number.isFinite(ms)) return "不明";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}秒`;
  return `${Math.floor(ms / 60_000)}分`;
}

export function unconfirmed(reason, extra = {}){
  return {
    tone:"unknown",
    label:"未確認",
    reason,
    ...extra
  };
}

export function communicationFailure(){
  return unconfirmed("communication-failure");
}

export function deriveHealth({ headSha, runs = [], now = Date.now() } = {}){
  if (!headSha) return unconfirmed("head-unavailable");

  const relevant = runs
    .filter(run => run && run.head_branch === "main")
    .filter(run => run.name === "Flow World Integrity Check" || run.path === ".github/workflows/flow-world-integrity.yml")
    .filter(run => run.head_sha === headSha)
    .sort((a,b) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0));

  if (!relevant.length) return unconfirmed("not-run-for-head", { headSha });

  const run = relevant[0];
  const age = ageMs(run.updated_at || run.created_at, now);
  const base = {
    headSha,
    runId:run.id ?? null,
    runUrl:run.html_url ?? null,
    conclusion:run.conclusion ?? null,
    status:run.status ?? null,
    ageMs:age,
    updatedAt:run.updated_at || run.created_at || null
  };

  if (run.status !== "completed") return unconfirmed("run-not-completed", base);

  if (run.conclusion === "success"){
    if (age > MAX_HEALTH_AGE_MS) return unconfirmed("stale-success", base);
    return { tone:"confirmed", label:"確認済み", reason:"same-commit-success", ...base };
  }

  if (FAILURE_CONCLUSIONS.has(run.conclusion)){
    return { tone:"failure", label:"失敗", reason:"same-commit-failure", ...base };
  }

  return unconfirmed("non-evidentiary-conclusion", base);
}

export function summarizePublicState(aiState = {}){
  return {
    evidenceCount:Array.isArray(aiState.confirmed) ? aiState.confirmed.length : 0,
    unknownCount:Array.isArray(aiState.unknowns) ? aiState.unknowns.length : 0,
    recentCount:Array.isArray(aiState.recent_changes) ? aiState.recent_changes.length : 0
  };
}
