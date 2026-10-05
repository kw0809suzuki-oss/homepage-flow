let jobs=[];let clusters=[];let filter="all";let selectedId=null;
function money(n){if(n==null)return "—";return "¥"+Number(n).toLocaleString("ja-JP")}
function metric(label,value,note){return '<div class="metric"><div class="metric-label">'+label+'</div><div class="metric-value">'+value+'</div><div class="metric-note">'+note+'</div></div>'}
function median(arr){const a=[...arr].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function renderMetrics(){
  const apps=jobs.map(x=>x.applicants);
  const budgets=jobs.map(x=>x.budget_mid).filter(x=>x!=null);
  const totalContracts=jobs.reduce((s,x)=>s+x.contracts,0);
  document.querySelector("#metrics").innerHTML=
    metric("実案件",jobs.length,"CrowdWorks sample")+
    metric("応募数中央値",median(apps),"競争密度の粗い目安")+
    metric("予算中央値",money(median(budgets)),"表示レンジの中点")+
    metric("契約総数",totalContracts,"公開ページ記載");
}
function renderRows(){
  const root=document.querySelector("#rows");root.innerHTML="";
  jobs.filter(x=>filter==="all"||x.cluster===filter).forEach(x=>{
    const el=document.createElement("article");el.className="row"+(x.id===selectedId?" selected":"");
    el.innerHTML='<div><div class="row-title">'+x.title+'</div><div class="row-desc">'+x.summary+'</div><div class="facts"><span class="fact">'+x.budget_label+'</span><span class="fact">契約 '+x.contracts+'</span><span class="fact">募集 '+x.slots+'</span></div><div class="tags">'+x.tags.map(t=>'<span class="tag">'+t+'</span>').join("")+'</div></div><div class="applicants"><strong>'+x.applicants+'</strong><small>applicants</small></div>';
    el.onclick=()=>{selectedId=x.id;renderRows();renderDetail(x)};root.appendChild(el);
  });
}
function renderDetail(x){
  const density=(x.applicants/x.slots).toFixed(1);
  document.querySelector("#detail").innerHTML='<div class="panel-head"><h2>'+x.cluster_label+'</h2><span>'+x.posted+'</span></div><h3>'+x.title+'</h3><p>'+x.summary+'</p><div class="detail-grid"><div class="detail-box"><span>予算</span><b>'+x.budget_label+'</b></div><div class="detail-box"><span>応募</span><b>'+x.applicants+'</b></div><div class="detail-box"><span>契約</span><b>'+x.contracts+'</b></div><div class="detail-box"><span>応募 / 募集枠</span><b>'+density+'</b></div></div><div class="insight"><b>観測</b><br>'+x.observation+'<br><br><b>Boundary</b><br>'+x.boundary+'</div><a class="source-link" href="'+x.url+'" target="_blank" rel="noreferrer">元案件を開く ↗</a>';
}
function renderClusters(){
  const root=document.querySelector("#clusters");root.innerHTML="";
  clusters.forEach(c=>{const el=document.createElement("div");el.className="cluster";el.innerHTML='<h3>'+c.label+'</h3><div class="big">'+c.jobs+'件</div><p>応募中央値 '+c.median_applicants+' / 予算中央値 '+c.median_budget_label+'</p><p>'+c.observation+'</p>';root.appendChild(el)});
}
document.querySelectorAll("[data-filter]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-filter]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");filter=btn.dataset.filter;renderRows()});
fetch("./data/opportunities.json").then(r=>r.json()).then(data=>{jobs=data.jobs||[];clusters=data.clusters||[];renderMetrics();renderClusters();if(jobs.length){selectedId=jobs[0].id;renderRows();renderDetail(jobs[0])}}).catch(err=>{document.querySelector("#rows").innerHTML='<p class="muted">data load error: '+err.message+'</p>'});