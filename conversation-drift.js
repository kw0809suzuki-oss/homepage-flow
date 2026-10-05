(() => {
  const source = document.querySelector('#drift-source');
  const output = document.querySelector('[data-drift-output]');
  const run = document.querySelector('[data-drift="run"]');
  const clear = document.querySelector('[data-drift="clear"]');
  const copy = document.querySelector('[data-drift="copy"]');
  const copyStatus = document.querySelector('[data-drift-status]');
  let lastObservation = '';
  if (!source || !output || !run) return;

  const correctionWords = ['違う','ちがう','そうじゃない','戻れ','戻って','勝手に','忘れ','前に','さっき','ではなく','じゃなく','やめて','バカ'];
  const stop = new Set('これ それ あれ ここ そこ ため よう こと もの する した して いる ある ない なる から まで です ます そして でも ので with this that have from your about into just what when where user assistant'.split(/\s+/));

  function chunks(text){
    return text.split(/\n{2,}|(?=User:|Assistant:|ユーザー:|アシスタント:)/i).map(s=>s.trim()).filter(Boolean);
  }
  function terms(text){
    const m=text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}|[一-龠々ぁ-んァ-ヶー]{2,}/g)||[];
    const counts=new Map();
    m.forEach(w=>{ if(!stop.has(w)) counts.set(w,(counts.get(w)||0)+1); });
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function topSet(text,n=12){ return new Set(terms(text).slice(0,n).map(x=>x[0])); }
  function overlap(a,b){ if(!a.size&&!b.size)return 1; let n=0;a.forEach(x=>{if(b.has(x))n++});return n/Math.max(1,Math.min(a.size,b.size)); }

  function analyze(text){
    const parts=chunks(text);
    const lines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
    const corrections=[];
    lines.forEach((line,i)=>{ const hit=correctionWords.find(w=>line.includes(w)); if(hit) corrections.push({line:i+1,word:hit,text:line.slice(0,90)}); });

    const questions=[];
    lines.forEach((line,i)=>{ if(/[?？]$/.test(line)||/(どう|なぜ|何|どこ|いつ|できる|調べ|確認)/.test(line)) questions.push({line:i+1,text:line.slice(0,90)}); });

    const third=Math.max(1,Math.floor(parts.length/3));
    const early=topSet(parts.slice(0,third).join(' '));
    const late=topSet(parts.slice(-third).join(' '));
    const continuity=overlap(early,late);
    const disappeared=[...early].filter(x=>!late.has(x)).slice(0,8);
    const appeared=[...late].filter(x=>!early.has(x)).slice(0,8);

    const windows=[];
    if(parts.length>=6){
      const size=Math.max(3,Math.floor(parts.length/5));
      let prev=topSet(parts.slice(0,size).join(' '));
      for(let i=size;i<parts.length;i+=size){
        const cur=topSet(parts.slice(i,Math.min(parts.length,i+size)).join(' '));
        const ov=overlap(prev,cur);
        if(ov<0.25) windows.push({from:Math.max(1,i-size+1),to:Math.min(parts.length,i+size),overlap:ov});
        prev=cur;
      }
    }

    const out=[];
    out.push('CONVERSATION OBSERVATION');
    out.push('------------------------');
    out.push('segments: '+parts.length);
    out.push('lines: '+lines.length);
    out.push('correction signals: '+corrections.length);
    out.push('question-like lines: '+questions.length);
    out.push('early/late keyword continuity: '+Math.round(continuity*100)+'%');
    out.push('');
    out.push('DRIFT CANDIDATES');
    if(!windows.length && continuity>=0.25) out.push('- no strong lexical shift detected');
    windows.slice(0,3).forEach(w=>out.push('- segment '+w.from+' → '+w.to+': keyword overlap '+Math.round(w.overlap*100)+'%'));
    if(disappeared.length) out.push('- early terms absent late: '+disappeared.slice(0,5).join(', '));
    if(appeared.length) out.push('- late terms absent early: '+appeared.slice(0,5).join(', '));
    out.push('');
    out.push('CORRECTION SIGNALS');
    if(!corrections.length) out.push('- none detected');
    corrections.slice(0,4).forEach(x=>out.push('- L'+x.line+' ['+x.word+'] '+x.text));
    out.push('');
    out.push('BOUNDARY');
    out.push('- lexical/structural signals only');
    out.push('- no semantic judgment');
    out.push('- no claim that a flagged shift is an error');
    return out.join('\n');
  }

  run.addEventListener('click',()=>{
    const text=source.value.trim();
    lastObservation=text ? analyze(text) : '';
    output.textContent=lastObservation || 'Paste a conversation first.';
    if(copy){ copy.disabled=false; copy.removeAttribute('disabled'); }
    if(copyStatus) copyStatus.textContent='Ready to copy.';
  });
  if(copy) copy.addEventListener('click',async()=>{
    const observation=lastObservation || (output.textContent && output.textContent !== 'waiting' ? output.textContent.trim() : '');
    if(!observation){if(copyStatus)copyStatus.textContent='Run OBSERVE first.';return;}
    const packet=['この会話を継続します。以下は外部の非AIツールによる会話構造の観測です。','',observation,'','RE-ENTRY','- 上記は意味判断ではなく、語彙・構造上の候補です。','- 観測をEvidence以上に昇格させないでください。','- 元の会話の親目的を確認し、変更せずに現在地から続けてください。','- Unknownを推測で埋めないでください。'].join('\n');
    try{await navigator.clipboard.writeText(packet);if(copyStatus)copyStatus.textContent='Copied. Paste this back into your AI.';}
    catch(e){if(copyStatus)copyStatus.textContent='Copy failed. Browser permission may be blocked.';}
  });
  if(clear) clear.addEventListener('click',()=>{source.value='';output.textContent='waiting';lastObservation='';if(copy)copy.disabled=true;if(copyStatus)copyStatus.textContent='';source.focus();});
})();