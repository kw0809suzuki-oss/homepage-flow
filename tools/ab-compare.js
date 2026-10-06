// Flow World shared tool: A/B Comparator v0
// Pure observation utility. Reports numeric differences only; no causal claim.
(function(root){
  const mean=(xs)=>xs.reduce((s,v)=>s+v,0)/xs.length;

  function abCompare(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||!a.length||a.length!==b.length){
      return {ok:false,error:"A/B must be non-empty numeric lists with the same length."};
    }
    if(a.some(v=>!Number.isFinite(v))||b.some(v=>!Number.isFinite(v))){
      return {ok:false,error:"A/B must contain finite numbers only."};
    }
    const point_deltas=a.map((v,i)=>v-b[i]);
    return {
      ok:true,
      n:a.length,
      mean_a:mean(a),
      mean_b:mean(b),
      mean_delta_a_minus_b:mean(point_deltas),
      point_deltas,
      boundary:"difference only; no causal claim."
    };
  }

  root.FlowTools=root.FlowTools||{};
  root.FlowTools.abCompare=abCompare;

  if(typeof module!=="undefined"&&module.exports){
    module.exports={abCompare};
  }
})(typeof globalThis!=="undefined"?globalThis:this);
