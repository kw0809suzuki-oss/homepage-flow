(() => {
  const root=document.querySelector('#astra');
  if(!root)return;

  const beacon=root.querySelector('.astra-beacon');
  const worldStatus=root.querySelector('.astra-world-status');
  const runBtn=root.querySelector('[data-astra="run"]');
  const resultStable=root.querySelector('[data-astra="stable"]');
  const resultOsc=root.querySelector('[data-astra="oscillating"]');
  const reenterBtn=root.querySelector('[data-astra="reenter"]');
  const resetBtn=root.querySelector('[data-astra="reset"]');
  const observedEl=root.querySelector('[data-field="observed"]');
  const unknownEl=root.querySelector('[data-field="unknown"]');
  const candidateEl=root.querySelector('[data-field="candidate"]');
  const probeEl=root.querySelector('[data-field="probe"]');
  const reasonEl=root.querySelector('[data-field="reason"]');
  const positionEl=root.querySelector('[data-field="position"]');
  const historyEl=root.querySelector('.astra-history ol');
  const turnEl=root.querySelector('.astra-history-head b');

  const initial=()=>({
    turn:0,
    phase:'ready',
    position:'STATE 0 / BEFORE PROBE',
    observed:['Beacon = unstable','Relay = reachable','Fallback = intact'],
    unknown:['Relay response to a low reversible pulse'],
    candidate:'Send one low pulse to the relay',
    probe:'LOW PULSE / RELAY',
    reason:'Goalに関係するUnknownへ届く・実行可能・元に戻せる',
    pending:null,
    history:[]
  });

  // This is a browser-local trace of lab choices, not evidence of an external result.
  const STORAGE_KEY='flow-world-astra-loop-v1';
  const safeText=x=>typeof x==='string'&&x.length<=240;
  const safeList=(x,max)=>Array.isArray(x)&&x.length<=max&&x.every(safeText);
  const validSaved=s=>s&&typeof s==='object'
    &&Number.isSafeInteger(s.turn)&&s.turn>=0&&s.turn<=999
    &&['ready','await-result','result-ready'].includes(s.phase)
    &&(s.pending===null||['stable','oscillating'].includes(s.pending))
    &&(s.phase==='result-ready')===(s.pending!==null)
    &&['position','candidate','probe','reason'].every(k=>safeText(s[k]))
    &&safeList(s.observed,10)&&safeList(s.unknown,10)&&safeList(s.history,1000)
    &&s.history.length===s.turn+(s.phase==='result-ready'?1:0);

  let state=initial();
  let restored=false;
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved&&saved.version===1&&validSaved(saved.state)){
      state=saved.state;
      restored=true;
    }
  }catch(e){} // Storage may be disabled, corrupt, or unavailable.

  const save=()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,state}));}catch(e){}
  };
  const showList=(target,tag,items)=>{
    target.replaceChildren(...items.map(value=>{
      const node=document.createElement(tag);
      node.textContent=value;
      return node;
    }));
  };

  const render=(persist=true)=>{
    positionEl.textContent=state.position;
    showList(observedEl,'p',state.observed);
    showList(unknownEl,'p',state.unknown);
    candidateEl.textContent=state.candidate;
    probeEl.textContent=state.probe;
    reasonEl.textContent=state.reason;
    showList(historyEl,'li',state.history.length?state.history:['No result observed yet.']);
    turnEl.textContent='TURN '+state.turn;

    runBtn.disabled=state.phase!=='ready';
    resultStable.disabled=state.phase!=='await-result';
    resultOsc.disabled=state.phase!=='await-result';
    reenterBtn.disabled=state.phase!=='result-ready';

    beacon.className='astra-beacon';
    if(state.phase==='await-result')beacon.classList.add('pulsing');
    if(state.pending==='stable')beacon.classList.add('stable');
    if(state.pending==='oscillating')beacon.classList.add('oscillating');

    if(state.phase==='ready'){
      worldStatus.textContent=state.turn===0
        ? 'World is waiting. Run the first probe.'
        : 'Re-entry complete. The next probe now depends on the observed result.';
    }
    if(state.phase==='await-result')worldStatus.textContent='Probe executed. The world must return one concrete result.';
    if(state.phase==='result-ready')worldStatus.textContent='Result observed. It is not a global rule yet. Re-enter to update the current position.';
    if(restored){
      worldStatus.textContent+=' / このブラウザの試行履歴から再開しました。';
      restored=false;
    }
    if(persist)save();
  };

  runBtn.addEventListener('click',()=>{
    if(state.phase!=='ready')return;
    state.phase='await-result';
    state.pending=null;
    render();
  });

  const observeResult=(kind)=>{
    if(state.phase!=='await-result')return;
    state.pending=kind;
    state.phase='result-ready';
    const label=kind==='stable'
      ? 'Context S'+state.turn+': LOW PULSE / RELAY → observed: response stabilized'
      : 'Context S'+state.turn+': LOW PULSE / RELAY → observed: response oscillated';
    state.history.push(label);
    render();
  };

  resultStable.addEventListener('click',()=>observeResult('stable'));
  resultOsc.addEventListener('click',()=>observeResult('oscillating'));

  reenterBtn.addEventListener('click',()=>{
    if(state.phase!=='result-ready')return;
    state.turn+=1;

    if(state.pending==='stable'){
      state.position='STATE '+state.turn+' / STABLE RESPONSE OBSERVED';
      state.observed=['Beacon = unstable','Relay = reachable','Low pulse response = stable','Fallback = intact'];
      state.unknown=['Whether fallback remains intact after relay use'];
      state.candidate='Test fallback briefly, then return';
      state.probe='VERIFY FALLBACK / REVERSIBLE';
      state.reason='新しいStateでGoalに残ったUnknownへ直接届き、元に戻せる';
    }else{
      state.position='STATE '+state.turn+' / OSCILLATION OBSERVED';
      state.observed=['Beacon = unstable','Relay = reachable','Low pulse response = oscillating','Fallback = intact'];
      state.unknown=['Where the lower safe pulse threshold begins'];
      state.candidate='Reduce pulse strength and test the threshold';
      state.probe='LOWER PULSE / THRESHOLD';
      state.reason='直前Resultで生まれたUnknownへ届き、同じ強さを繰り返さない';
    }

    state.pending=null;
    state.phase='ready';
    render();
  });

  resetBtn.addEventListener('click',()=>{
    state=initial();
    try{localStorage.removeItem(STORAGE_KEY);}catch(e){}
    render(false);
  });

  render(false);
})();
