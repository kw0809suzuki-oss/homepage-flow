import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const problems=[];
function check(ok,message){if(!ok)problems.push(message);}
const pages=['index.html','workshop/index.html'];
for(const p of pages){
  const source=read(p);
  check(source.includes('<main>'), p+': missing main');
  check(source.includes('<h1>'), p+': missing h1');
  check(!/<script\b/i.test(source), p+': entry unexpectedly requires JavaScript');
  const nav=source.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i)?.[1]??'';
  const navLinks=[...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(x=>x[1]);
  check(navLinks.length===2,p+': expected 2 nav links, found '+navLinks.length);
  const ids=new Set([...source.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  for(const [,href] of source.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^(https?:|mailto:|data:)/.test(href))continue;
    if(href.startsWith('#')){check(ids.has(href.slice(1)),p+': missing anchor '+href);continue;}
    const [raw]=href.split('#');const clean=raw.split('?')[0];
    if(!clean)continue;
    const target=path.resolve(root,path.dirname(p),clean,clean.endsWith('/')?'index.html':'.');
    check(target.startsWith(root+path.sep),p+': escaped repository root '+href);
    check(fs.existsSync(target),p+': missing '+href+' -> '+path.relative(root,target));
  }
}
const defs=JSON.parse(read('ai-tools.json'));
const known=new Set(defs.tools.map(x=>x.id));
check(known.has('ab-comparator')&&known.has('first-divergence'),'missing deterministic contracts');
check(defs.tools.length===4,'expected four machine contracts');
const state=JSON.parse(read('FLOW_WORLD_STATE.json'));
check(state.PUBLIC_ENTRY?.ordinary_html==='index.html','public entry not declared');
check(state.VISIBILITY?.deployment_verified===false,'unverified deployment may not be labeled verified');
for(const p of ['ai.txt','ai-entry.txt','ai-state.json','FLOW_WORLD_STATE.json','legacy/index.html','assets/flow-world-hero.svg']){
 check(fs.existsSync(path.join(root,p)), 'missing preserved '+p);
}
for(const [filename,exportName,test] of [
 ['tools/ab-compare.js','abCompare', fn=>{const r=fn([10,12,9],[8,13,7]);check(r.ok&&r.mean_delta_a_minus_b===1,'A/B output mismatch');}],
 ['tools/first-divergence.js','firstDivergence',fn=>{
  const r=fn(['plant','water','sell'],['plant','wait','sell']);
  check(r.ok&&r.diverged&&r.index_zero_based===1&&r.a_value==='water'&&r.b_value==='wait','first divergence sample mismatch');
  const same=fn(['a'],['a']);check(same.ok&&!same.diverged,'equal sequence false positive');
  const suffix=fn(['a'],['a','b']);check(suffix.ok&&suffix.diverged&&suffix.index_zero_based===1&&!suffix.a_present,'suffix handling mismatch');
 }]
]){
 const module={exports:{}};vm.runInNewContext(read(filename),{module},{filename,timeout:2000});
 const fn=module.exports[exportName];check(typeof fn==='function',filename+': export absent');
 if(typeof fn==='function')test(fn);
}
if(problems.length){console.error('AI-first checks failed:');problems.forEach(x=>console.error('- '+x));process.exit(1);}
console.log('AI-first static path, contracts and executable examples: PASS');
