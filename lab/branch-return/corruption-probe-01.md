# Corruption Probe 01 — 行列検算を通過する意味の改変

Status: AI-executed, deterministic enumeration (2026-10-08).
Parent purpose: discover and test effective AI-oriented information representations. This probe tests error detection, NOT independent AI decoding performance.

## Authority and first view
Entry: `FLOW_WORLD_STATE.json` → `ai-entry.txt` → existing Branch Return Lab / A-B comparison definitions.
No FlowMemory or private state used.

## Base graph
Ordered vertices: ABCDE; row bit positions: ABCDE.
```
A:01100
B:00010
C:00001
D:01000
E:00100
```
Row degrees = 2,1,1,1,1; column degrees = 0,2,2,1,1; total = 6.

## Exhaustive corruption checks
- Flip one of 25 adjacency bits: 25 cases. Total-count check 25; row check 25; column check 25; row OR column 25 detected.
- Remove one present edge and add one absent edge: 6×19 = 114 cases. Total-count check 0; row check 92; column check 94; row OR column 114 detected.
- Two-for-two directed 2×2 swaps with row and column sums unchanged: 10 distinct valid swaps under enumeration ordered by two distinct source rows, including 6 without self loops. All evade the row, column and total checks.

## Counterexample (no self-loops)
Remove A→B and C→E. Add A→E and C→B.

Before:
```
A 01100
B 00010
C 00001
D 01000
E 00100
```
After:
```
A 00101
B 00010
C 01000
D 01000
E 00100
```
Checks: row counts identical; column counts identical; total edges = 6 both; the new graph has no self loops. But query 4 (C→E) changes from reachable to not reachable.

## Reproduction (JavaScript)
```js
const M=["01100","00010","00001","01000","00100"].map(s=>[...s].map(Number));
const N=5;
const degrees=m=>({
 row:m.map(r=>r.reduce((a,b)=>a+b,0)),
 col:Array.from({length:N},(_,j)=>m.reduce((s,r)=>s+r[j],0))
});
const base=degrees(M);
const check=m=>{
 const d=degrees(m);
 const row=d.row.some((x,i)=>x!==base.row[i]);
 const col=d.col.some((x,i)=>x!==base.col[i]);
 const total=d.row.reduce((s,x)=>s+x,0)!==6;
 return {row,col,total,either:row||col};
};
const stats=()=>({total:0,row:0,col:0,either:0,cases:0});
let flip=stats(), move=stats();
const accumulate=(stats,d)=>{stats.cases++;for(const k of ["total","row","col","either"])stats[k]+=Number(d[k]);};
for(let i=0;i<N;i++)for(let j=0;j<N;j++){
 let m=M.map(r=>r.slice());m[i][j]^=1;accumulate(flip,check(m));
}
for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(M[i][j]){
 for(let k=0;k<N;k++)for(let l=0;l<N;l++)if(!M[k][l]){
  let m=M.map(r=>r.slice());m[i][j]=0;m[k][l]=1;accumulate(move,check(m));
 }
}
console.log({flip,move});
```

## Boundary
These are enumeration results for a fixed 5-vertex graph. Row-plus-column does NOT detect arbitrary multi-edge alterations. A fingerprint, exact edge comparison, or semantic questions may catch more; none is guaranteed to improve receiver-AI task performance. Independent AI receiver tests, token cost comparisons, and generalization remain unperformed.

## Next high-information trial
Supply separate receiver AIs with the intact and row/column-preserving corrupted encoding (without answers). Check whether they notice the corruption, answer reachability, and report uncertainty; crucially, row/column checks alone cannot determine which encoding is original without an authenticated reference.
