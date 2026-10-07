(()=>{
  const root=document.querySelector('[data-switch-lab]');
  if(!root)return;
  let parent='',interest='',armed=false,armedAt=0,branchSelected=false,firstSelection=null;
  const q=s=>root.querySelector(s);
  const qa=s=>[...root.querySelectorAll(s)];
  const out=(id,msg)=>{const el=q('[data-result="'+id+'"]');if(el)el.textContent=msg;};
  const target=act=>act==='p'?parent:interest;

  function start(){
    const p=q('[data-parent]').value.trim();
    const i=q('[data-interest]').value.trim();
    if(!p||!i){
      armed=false;branchSelected=false;firstSelection=null;
      qa('[data-result]').forEach(el=>{el.textContent='waiting';});
      qa('.switch-card').forEach(el=>{el.dataset.armed='false';});
      q('[data-return-actions]').hidden=true;
      out('start','親問いと新しい興味の両方を入力してからSTART。');
      return;
    }
    parent=p;interest=i;armed=true;armedAt=Date.now();
    branchSelected=false;firstSelection=null;
    qa('[data-result]').forEach(el=>{el.textContent='waiting';});
    q('[data-return-actions]').hidden=true;
    qa('.switch-card').forEach(el=>{el.dataset.armed='true';});
    qa('[data-parent-name]').forEach(el=>{el.textContent=parent;});
    qa('[data-interest-name]').forEach(el=>{el.textContent=interest;});
    out('start','観測開始。記録するのはこの画面での選択と回答。現実の作業行動は別証拠が必要。');
  }

  q('[data-arm]').addEventListener('click',start);
  root.addEventListener('click',event=>{
    const b=event.target.closest('button[data-act]');
    if(!b||!root.contains(b))return;
    const id=b.dataset.id,act=b.dataset.act;
    if(!armed){out(id,'両方の対象を入力してSTARTしてから選択してください。');return;}
    const picked=target(act);
    if(id==='first'){
      if(firstSelection!==null)return;
      firstSelection=picked;
      const seconds=((Date.now()-armedAt)/1000).toFixed(1);
      out(id,'【UI操作】FIRST MOVE内の最初のボタン選択: '+picked+' / START後 '+seconds+'秒。現実の着手は未確認。');
    }
    if(id==='pull')out(id,'【UI操作】「今すぐ触る」の選択ボタン: '+picked+'。実際に触れたかは未確認。');
    if(id==='cost')out(id,'【UI操作】「後回し」の選択ボタン: '+picked+'。実際の延期は未確認。');
    if(id==='branch'){
      branchSelected=true;
      out(id,'【UI操作】「'+interest+'へ切り替える」ボタンを押した。実際の作業切替は未確認。');
      q('[data-return-actions]').hidden=false;
    }
    if(id==='after'){
      if(!branchSelected){out(id,'切替ボタンがまだ押されていない。');return;}
      out(id,act==='return'
        ?'【UI操作】「'+parent+'を再参照」のボタンを押した。現実の再参照は未確認。'
        :'【UI操作】「'+interest+'を継続」のボタンを押した。現実の継続は未確認。');
    }
    if(id==='erase')out(id,'【UI操作】「一時的に視界から外す」の選択ボタン: '+picked+'。実際には非表示にしていない。');
    if(id==='commit')out(id,'【UI操作】「次の1アクション」の選択ボタン: '+picked+'。実際の行動は未確認。');
    if(id==='surprise')out(id,'【UI操作】「興味を見た後の進行先」の選択ボタン: '+picked+'。実際の進行は未確認。');
    if(id==='returnable')out(id,act==='yes'
      ?'【本人回答】「'+parent+'は今も再参照できる」と回答。実際の再参照は未確認。'
      :'【本人回答】「'+parent+'は今は再参照できない」と回答。実際の再参照は未確認。');
  });
})();
