import assert from "node:assert/strict";
import {
  MAX_HEALTH_AGE_MS,
  communicationFailure,
  deriveHealth,
  shortSha,
  summarizePublicState
} from "./model.js";

const NOW=Date.parse("2026-10-09T15:40:00Z");
const HEAD="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const fresh=new Date(NOW-60_000).toISOString();
const stale=new Date(NOW-MAX_HEALTH_AGE_MS-1).toISOString();

function run(overrides={}){
  return {
    id:101,
    name:"Flow World Integrity Check",
    path:".github/workflows/flow-world-integrity.yml",
    head_branch:"main",
    head_sha:HEAD,
    status:"completed",
    conclusion:"success",
    updated_at:fresh,
    html_url:"https://example.test/run/101",
    ...overrides
  };
}

const tests=[
  ["fresh success on same commit is confirmed",()=>{
    assert.equal(deriveHealth({headSha:HEAD,runs:[run()],now:NOW}).tone,"confirmed");
  }],
  ["success on another commit is unconfirmed",()=>{
    assert.equal(deriveHealth({headSha:HEAD,runs:[run({head_sha:"bbbb"})],now:NOW}).reason,"not-run-for-head");
  }],
  ["success on another branch is unconfirmed",()=>{
    assert.equal(deriveHealth({headSha:HEAD,runs:[run({head_branch:"feature"})],now:NOW}).reason,"not-run-for-head");
  }],
  ["stale success is unconfirmed",()=>{
    const result=deriveHealth({headSha:HEAD,runs:[run({updated_at:stale})],now:NOW});
    assert.equal(result.reason,"stale-success");
    assert.equal(result.tone,"unknown");
  }],
  ["running same-commit check is unconfirmed",()=>{
    assert.equal(deriveHealth({headSha:HEAD,runs:[run({status:"in_progress",conclusion:null})],now:NOW}).reason,"run-not-completed");
  }],
  ["cancelled same-commit check is unconfirmed",()=>{
    const result=deriveHealth({headSha:HEAD,runs:[run({conclusion:"cancelled"})],now:NOW});
    assert.equal(result.tone,"unknown");
  }],
  ["failed same-commit check is failure",()=>{
    const result=deriveHealth({headSha:HEAD,runs:[run({conclusion:"failure"})],now:NOW});
    assert.equal(result.tone,"failure");
  }],
  ["timed out same-commit check is failure",()=>{
    assert.equal(deriveHealth({headSha:HEAD,runs:[run({conclusion:"timed_out"})],now:NOW}).tone,"failure");
  }],
  ["no run for head is unconfirmed",()=>{
    assert.equal(deriveHealth({headSha:HEAD,runs:[],now:NOW}).reason,"not-run-for-head");
  }],
  ["newest matching run is authoritative",()=>{
    const newer=run({id:202,conclusion:"cancelled",updated_at:new Date(NOW-10_000).toISOString()});
    const older=run({id:201,conclusion:"success",updated_at:new Date(NOW-20_000).toISOString()});
    assert.equal(deriveHealth({headSha:HEAD,runs:[older,newer],now:NOW}).tone,"unknown");
  }],
  ["communication failure never preserves previous green",()=>{
    const previous=deriveHealth({headSha:HEAD,runs:[run()],now:NOW});
    assert.equal(previous.tone,"confirmed");
    assert.equal(communicationFailure(previous).tone,"unknown");
  }],
  ["public-state counts stay separate from tests",()=>{
    assert.deepEqual(
      summarizePublicState({confirmed:["a","b"],unknowns:["x"],recent_changes:["1","2","3"]}),
      {evidenceCount:2,unknownCount:1,recentCount:3}
    );
    assert.equal(shortSha(HEAD),"aaaaaaa");
  }]
];

let passed=0;
for(const [name,fn] of tests){
  fn();
  passed+=1;
  console.log("ok",passed,"-",name);
}
console.log("\n"+passed+"/"+tests.length+" Flow Observatory tests passed.");
