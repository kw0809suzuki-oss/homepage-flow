import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html');
const workshop=read('workshop/index.html');
const links=s=>[...s.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(x=>x[1]);
const h=links(home),w=links(workshop);
const resolve=(from,url)=>{
 const [p,hash]=url.split('#');
 const dest=path.resolve(root,path.dirname(from),p||path.basename(from));
 return {dest,hash:hash||null};
};
const rootFiles=[
 ['index.html','workshop/','workshop/index.html'],
 ['index.html','ai-tools.json','ai-tools.json'],
 ['index.html','FLOW_WORLD_STATE.json','FLOW_WORLD_STATE.json'],
 ['index.html','legacy/','legacy/index.html'],
 ['workshop/index.html','../ai-tools.json','ai-tools.json'],
 ['workshop/index.html','../tools/ab-compare.js','tools/ab-compare.js'],
 ['workshop/index.html','../tools/first-divergence.js','tools/first-divergence.js']
];
for(const [source,link,expected] of rootFiles){
 const ls=source==='index.html'?h:w;
 assert(ls.includes(link),source+' missing direct external-AI link '+link);
 let {dest}=resolve(source,link);
 if(link.endsWith('/')) dest=path.join(dest,'index.html');
 assert.equal(dest,path.join(root,expected),source+' wrong destination: '+link);
 assert(fs.existsSync(dest),'missing target: '+expected);
}
const ids=s=>new Set([...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
const workIds=ids(workshop);
assert(workIds.has('ab-comparator')&&workIds.has('first-divergence'),'workshop anchors missing');
const old=read('legacy/index.html');
const oldIds=ids(old);
for(const anchor of ['workbench','switch-lab','core18','desk','drift']){
 assert(oldIds.has(anchor),'legacy lacks '+anchor);
 assert(w.some(v=>v.endsWith('legacy/#'+anchor))||w.some(v=>v.endsWith('#'+anchor)&&v.includes('legacy')),'workshop not linking to legacy '+anchor);
}
const defs=JSON.parse(read('ai-tools.json'));
for(const id of ['ab-comparator','first-divergence']){
 const def=defs.tools.find(x=>x.id===id);
 assert(def && def.compatibility.read_only_ai.includes('supported'),'read-only contract missing '+id);
 assert(fs.existsSync(path.join(root,def.implementation)),'implementation missing '+id);
 assert(workIds.has(id),'workshop not linking tool definition '+id);
}
const source=read('ai.txt');
assert(source.includes('index.html')&&source.includes('workshop/'),'static AI entry does not recognize public HTML');
assert(w.includes('../reference/return-to-purpose.md'),'workshop lacks optional goal-return reference');
const reference=read('reference/return-to-purpose.md');
assert(reference.includes('Local observation') || reference.includes('A local observation'),'goal-return reference not found');
assert(reference.includes('remaining unknown') || reference.includes('Remaining unknown'),'reference must distinguish missing evidence');
const sitemap=read('sitemap.xml');
assert(sitemap.includes('/homepage-flow/workshop/'),'workshop missing from sitemap');
assert(home.includes('rel="canonical"')&&workshop.includes('rel="canonical"'),'canonical URLs absent');
console.log('PASS: uninformed HTML entry → workshop → machine contracts → implementation');
