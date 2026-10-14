// Flow World shared tool: First Divergence v0 (deterministic comparison only)
(function(root){
  "use strict";
  function firstDivergence(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length===0||b.length===0){
      return {ok:false,error:"A and B must be non-empty arrays."};
    }
    const allValid=xs=>xs.every(x=>typeof x==="string");
    if(!allValid(a)||!allValid(b)){
      return {ok:false,error:"A and B must be arrays of strings."};
    }
    const n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){
      if(a[i]!==b[i]){
        return {
          ok:true,diverged:true,index_zero_based:i,
          a_present:i<a.length,b_present:i<b.length,
          a_value:i<a.length?a[i]:null,b_value:i<b.length?b[i]:null,
          boundary:"first observed difference only; cause unknown."
        };
      }
    }
    return {ok:true,diverged:false,compared_positions:n,boundary:"no difference in supplied positions; later unseen positions unknown."};
  }
  root.FlowTools=root.FlowTools||{};
  root.FlowTools.firstDivergence=firstDivergence;
  if(typeof module!=="undefined"&&module.exports)module.exports={firstDivergence};
})(typeof globalThis!=="undefined"?globalThis:this);
