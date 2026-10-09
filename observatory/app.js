import {
  MAX_HEALTH_AGE_MS,
  communicationFailure,
  deriveHealth,
  formatAge,
  shortSha,
  summarizePublicState
} from "./model.js";

const REPO = "kw0809suzuki-oss/homepage-flow";
const API = "https://api.github.com/repos/" + REPO;

const el = id => document.getElementById(id);
let lastSnapshot = null;
let expiryTimer = null;

function setText(id, value){
  const node = el(id);
  if (node) node.textContent = value;
}

function renderHealth(result){
  const panel = el("health-panel");
  panel.dataset.tone = result.tone;
  setText("health-badge", result.label);
  setText("health-sha", shortSha(result.headSha));
  setText("health-run", result.runId ? "#" + result.runId : "—");
  setText("health-age", Number.isFinite(result.ageMs) ? formatAge(result.ageMs) : "—");

  const map = {
    "same-commit-success":["Integrity Check 確認済み","mainの現在commitと同じ実行が成功しています。"],
    "same-commit-failure":["Integrity Check 失敗","mainの現在commitに対する実行が失敗しています。"],
    "stale-success":["再確認が必要","同じcommitの成功結果はありますが、5分を超えています。"],
    "not-run-for-head":["未実行","mainの現在commitに一致するIntegrity Checkが見つかりません。"],
    "run-not-completed":["実行中 / 未完了","同じcommitの実行はありますが、完了していません。"],
    "non-evidentiary-conclusion":["未確認","キャンセル等は成功・失敗の根拠にしません。"],
    "head-unavailable":["未確認","mainの現在commitを取得できていません。"],
    "communication-failure":["通信失敗 / 未確認","取得に失敗したため、以前の成功表示は破棄しました。"]
  };
  const copy = map[result.reason] || ["未確認","確認できる根拠がありません。"];
  setText("health-title", copy[0]);
  setText("health-detail", copy[1]);

  const overall = el("overall-status");
  overall.dataset.tone = result.tone;
  overall.textContent =
    result.tone === "confirmed" ? "WORLD / HEALTH CONFIRMED" :
    result.tone === "failure" ? "WORLD / BREAK OBSERVED" :
    "WORLD / 未確認";

  if (expiryTimer) clearTimeout(expiryTimer);
  if (result.tone === "confirmed" && Number.isFinite(result.ageMs)){
    const remaining = Math.max(0, MAX_HEALTH_AGE_MS - result.ageMs + 50);
    expiryTimer = setTimeout(() => {
      if (!lastSnapshot) return;
      renderHealth(deriveHealth({
        headSha:lastSnapshot.headSha,
        runs:lastSnapshot.runs,
        now:Date.now()
      }));
    }, remaining);
  }
}

function renderCurrent(world){
  const position = world?.POSITION || {};
  setText("current-status", position.status || "未確認");
  setText("current-summary", position.summary || "公開現在地の要約はありません。");
  setText("current-coordinate", position.working_coordinate || "—");
}

function renderMotion(commits){
  const list = el("motion-list");
  list.innerHTML = "";
  const rows = commits.slice(0,3);
  setText("motion-count", rows.length + " observed");
  if (!rows.length){
    const li=document.createElement("li");
    li.textContent="mainの更新を確認できませんでした。";
    list.appendChild(li);
    return;
  }
  rows.forEach(item => {
    const li=document.createElement("li");
    const time=document.createElement("time");
    const message=document.createElement("b");
    const date=item.commit?.committer?.date || item.commit?.author?.date;
    time.textContent = date ? new Date(date).toLocaleString("ja-JP",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";
    message.textContent=(item.commit?.message || "").split("\n")[0] || "(no message)";
    li.append(time,message);
    list.appendChild(li);
  });
}

function renderCounts(aiState){
  const summary=summarizePublicState(aiState);
  setText("evidence-count",String(summary.evidenceCount));
  setText("unknown-count",String(summary.unknownCount));
  setText("recent-count",String(summary.recentCount));
}

async function fetchJson(url){
  const response=await fetch(url,{
    cache:"no-store",
    headers:{Accept:"application/vnd.github+json"}
  });
  if (!response.ok) throw new Error("HTTP "+response.status+" "+url);
  return response.json();
}

async function refresh(){
  el("refresh").disabled=true;
  setText("last-check","LAST CHECK / observing…");

  // Critical: clear any prior green before a new network observation.
  renderHealth(communicationFailure());

  try{
    const [world,aiState,head,runsPayload,commits]=await Promise.all([
      fetchJson("../FLOW_WORLD_STATE.json"),
      fetchJson("../ai-state.json"),
      fetchJson(API+"/commits/main"),
      fetchJson(API+"/actions/runs?branch=main&per_page=30"),
      fetchJson(API+"/commits?sha=main&per_page=3")
    ]);

    renderCurrent(world);
    renderCounts(aiState);
    renderMotion(Array.isArray(commits) ? commits : []);

    const runs=Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs : [];
    lastSnapshot={headSha:head.sha,runs};
    renderHealth(deriveHealth({headSha:head.sha,runs,now:Date.now()}));
    setText("last-check","LAST CHECK / "+new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
  }catch(error){
    lastSnapshot=null;
    renderHealth(communicationFailure());
    setText("last-check","LAST CHECK / communication failed");
    console.warn("Flow Observatory observation failed:",error);
  }finally{
    el("refresh").disabled=false;
  }
}

el("refresh").addEventListener("click",refresh);
refresh();
