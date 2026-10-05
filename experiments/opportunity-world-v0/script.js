let jobs=[];let clusters=[];let filter="all";let selectedId=null;
const isMobile=()=>window.matchMedia("(max-width:900px)").matches;
function money(n){if(n==null)return "—";return "¥"+Number(n).toLocaleString("ja-JP")}
function metric(label,value,note){return '<div class="metric"><div class="metric-label">'+label+'</div><div class="metric-value">'+value+'</div><div class="metric-note">'+note+'</div></div>'}
function median(arr){const a=[...arr].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function density(x){return x.slots?x.applicants/x.slots:x.applicants}
function tagCounts(){
  const counts={};
  jobs.forEach(j=>(j.tags||[]).forEach(t=>counts[t]=(counts[t]||0)+1));
  return counts;
}
function recurrentTags(x){
  const counts=tagCounts();
  return (x.tags||[]).filter(t=>(counts[t]||0)>1).map(t=>({tag:t,count:counts[t]}));
}
function renderMetrics(){
  const budgets=jobs.map(x=>x.budget_mid).filter(x=>x!=null);
  const densities=jobs.map(density);
  const repeatMotifs=Object.values(tagCounts()).filter(v=>v>1).length;
  document.querySelector("#metrics").innerHTML=
    metric("実案件",jobs.length,"CrowdWorks sample")+
    metric("応募密度中央値",median(densities).toFixed(1),"応募数 ÷ 募集人数")+
    metric("予算中央値",money(median(budgets)),"表示レンジの中点")+
    metric("再出現モチーフ",repeatMotifs,"2案件以上に出るタグ");
}
function renderRows(){
  const root=document.querySelector("#rows");root.innerHTML="";
  jobs.filter(x=>filter==="all"||x.cluster===filter).forEach(x=>{
    const el=document.createElement("article");el.className="row"+(x.id===selectedId?" selected":"");
    el.innerHTML='<div><div class="row-title">'+x.title+'</div><div class="row-desc">'+x.summary+'</div><div class="facts"><span class="fact">'+x.budget_label+'</span><span class="fact">契約 '+x.contracts+'</span><span class="fact">募集 '+x.slots+'</span></div><div class="density-pill">応募密度 '+density(x).toFixed(1)+'×</div><div class="tags">'+x.tags.map(t=>'<span class="tag">'+t+'</span>').join("")+'</div></div><div class="applicants"><strong>'+x.applicants+'</strong><small>applicants</small></div>';
    el.onclick=()=>{selectedId=x.id;renderRows();renderDetail(x);if(isMobile())openDetail()};root.appendChild(el);
  });
}
function renderDetail(x){
  const repeats=recurrentTags(x);
  const repeatHtml=repeats.length
    ? '<div class="recurrence"><strong>再出現</strong><div class="recurrence-list">'+repeats.map(r=>'<span class="recurrence-tag">'+r.tag+' × '+r.count+'案件</span>').join("")+'</div></div>'
    : '<div class="recurrence"><strong>再出現</strong><span class="muted">この8件内では同タグの再出現なし</span></div>';
  document.querySelector("#detail").innerHTML='<button id="detailClose" class="detail-close" aria-label="詳細を閉じる">×</button><div class="panel-head"><h2>'+x.cluster_label+'</h2><span>'+x.posted+'</span></div><h3>'+x.title+'</h3><p>'+x.summary+'</p><div class="detail-grid"><div class="detail-box"><span>予算</span><b>'+x.budget_label+'</b></div><div class="detail-box"><span>応募</span><b>'+x.applicants+'</b></div><div class="detail-box"><span>契約</span><b>'+x.contracts+'</b></div><div class="detail-box"><span>応募密度</span><b>'+density(x).toFixed(1)+'×</b></div></div>'+repeatHtml+'<div class="insight"><b>観測</b><br>'+x.observation+'<br><br><b>Boundary</b><br>'+x.boundary+'</div><a class="source-link" href="'+x.url+'" target="_blank" rel="noreferrer">元案件を開く ↗</a>';
  document.querySelector("#detailClose").onclick=closeDetail;
}
function openDetail(){
  document.querySelector("#detail").classList.add("open");
  document.querySelector("#detailBackdrop").classList.add("open");
  document.body.classList.add("detail-open");
}
function closeDetail(){
  document.querySelector("#detail").classList.remove("open");
  document.querySelector("#detailBackdrop").classList.remove("open");
  document.body.classList.remove("detail-open");
}
function renderClusters(){
  const root=document.querySelector("#clusters");root.innerHTML="";
  clusters.forEach(c=>{const el=document.createElement("div");el.className="cluster";el.innerHTML='<h3>'+c.label+'</h3><div class="big">'+c.jobs+'件</div><p>応募中央値 '+c.median_applicants+' / 予算中央値 '+c.median_budget_label+'</p><p>'+c.observation+'</p>';root.appendChild(el)});
}
document.querySelector("#detailBackdrop").onclick=closeDetail;
document.querySelectorAll("[data-filter]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-filter]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");filter=btn.dataset.filter;renderRows()});
fetch("./data/opportunities.json").then(r=>r.json()).then(data=>{jobs=data.jobs||[];clusters=data.clusters||[];renderMetrics();renderClusters();if(jobs.length){selectedId=jobs[0].id;renderRows();renderDetail(jobs[0])}}).catch(err=>{document.querySelector("#rows").innerHTML='<p class="muted">data load error: '+err.message+'</p>'});