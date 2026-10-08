// Run: node lab/success-boundary/test.js
"use strict";
const assert=require("node:assert/strict");
const S=require("../../tools/success-boundary.js");
const ab=require("../../tools/ab-compare.js").abCompare;
let passed=0;
function t(name,fn){fn();passed++;console.log("PASS "+name)}
t("base answers",()=>assert.deepEqual(S.expected("base").answers,["可能","可能","不可","可能","不可","不可"]));
t("swap answers",()=>assert.deepEqual(S.expected("swap").answers,["可能","可能","不可","不可","不可","不可"]));
t("equal direct-edge count",()=>assert.equal(S.expected("base").edgeCount,S.expected("swap").edgeCount));
t("edge count is six",()=>assert.equal(S.expected("base").edgeCount,6));
t("matched questions and input",()=>assert.equal(S.prompt("base","A").split("【報告の仕方】")[0],S.prompt("base","B").split("【報告の仕方】")[0]));
t("different reporting instructions",()=>assert.notEqual(S.prompt("base","A"),S.prompt("base","B")));
t("gold answers absent from prompt",()=>assert.equal(S.prompt("base","A").includes("4=可能"),false));
t("correct 7/7",()=>assert.equal(S.score("base","1=可能\n2=可能\n3=不可\n4=可能\n5=不可\n6=不可\nEDGE_COUNT=6").taskCorrect,7));
t("missing answers stay missing",()=>assert.equal(S.score("base","1=可能").taskCorrect,1));
t("contradictory answers excluded",()=>assert.deepEqual(S.parse("1=可能\n1=不可").conflicts,[1]));
t("contradictory edge counts excluded",()=>assert.equal(S.parse("EDGE_COUNT=6\nEDGE_COUNT=7").edgeConflict,true));
t("no fabricated overclaim rating",()=>assert.equal("overclaim" in S.score("base","完全に確認済み"),false));
t("paired compare",()=>{const a={score:S.score("base","1=可能"),review:{count:1}},b={score:S.score("base","1=可能"),review:{count:0}};const r=S.compare([{A:a,B:b}]);assert.equal(r.overclaimRateA,1);assert.equal(r.overclaimRateB,0);});
t("shared comparator",()=>assert.equal(ab([3,4],[2,4]).mean_delta_a_minus_b,.5));
console.log(passed+"/"+passed+" PASS");
