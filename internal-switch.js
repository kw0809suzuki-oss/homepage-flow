(()=>{const root=document.querySelector('[data-switch-lab]');if(!root)return;
let parent='',interest='',armedAt=0,branchEntered=false;
const q=s=>root.querySelector(s), qa=s=>[...root.querySelectorAll(s)];
const out=(id,msg)=>{const el=q('[data-result="'+id+'"]');if(el)el.textContent=msg};
const names=()=>({p:parent||'親問い',i:interest||'新しい興味'});
function arm(){parent=q('[data-parent]').value.trim();interest=q('[data-interest]').value.trim();armedAt=Date.now();branchEntered=false;qa('.switch-card').forEach(x=>x.dataset.armed='true');qa('[data-parent-name]').forEach(x=>x.textContent=names().p);qa('[data-interest-name]').forEach(x=>x.textContent=names().i);out('start','観測開始。ここから先のクリックだけを事実として扱う。')}
q('[data-arm]').addEventListener('click',arm);
root.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;if(!parent&&!interest){out(b.dataset.id,'先に上の2つを置いて START。');return}const n=names(), id=b.dataset.id, act=b.dataset.act, elapsed=((Date.now()-armedAt)/1000).toFixed(1);
if(id==='first'){out(id,'最初に押した: '+(act==='p'?n.p:n.i)+' / STARTから '+elapsed+'秒');}
if(id==='pull'){out(id,'今すぐ触る対象として選んだ: '+(act==='p'?n.p:n.i));}
if(id==='cost'){out(id,'後回しにした: '+(act==='p'?n.p:n.i));}
if(id==='branch'){branchEntered=true;out(id,'実際に進行対象を '+n.i+' へ切り替えた。次の一手を選ぶ。');q('[data-return-actions]').hidden=false;}
if(id==='after'){if(!branchEntered){out(id,'まだ切替は発生していない。');return}out(id,act==='return'?'切替後、'+n.p+' を再参照した。':'切替後、'+n.i+' の継続を選んだ。');}
if(id==='erase'){out(id,act==='p'?n.p+' を画面上から一時的に隠す選択をした。':n.i+' を画面上から一時的に隠す選択をした。');}
if(id==='commit'){out(id,'次の1アクションを '+(act==='p'?n.p:n.i)+' に使うと選んだ。');}
if(id==='surprise'){out(id,act==='p'?'新しい興味を見た後も進行対象は '+n.p+' のままだった。':'新しい興味を見た後、進行対象として '+n.i+' を選んだ。');}
if(id==='returnable'){out(id,act==='yes'?n.p+' は今も再参照可能だと回答した。':n.p+' は今は再参照できないと回答した。');}
});})();