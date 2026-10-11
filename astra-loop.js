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
    &&['ready','await-result','result-ready','review','history-checked'].includes(s.phase)
    &&(!['review','history-checked'].includes(s.phase)||s.turn>=2)
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

    // The choice labels follow the current probe, not the first probe forever.
    const fallback=state.probe==='VERIFY FALLBACK / REVERSIBLE';
    const lowerPulse=state.probe==='LOWER PULSE / THRESHOLD';
    resultStable.textContent=fallback?'RESULT A / FALLBACK INTACT'
      :lowerPulse?'RESULT A / LOWER PULSE STABLE':'RESULT A / STABILIZED';
    resultOsc.textContent=fallback?'RESULT B / FALLBACK DISRUPTED'
      :lowerPulse?'RESULT B / LOWER PULSE OSCILLATED':'RESULT B / OSCILLATED';

    runBtn.disabled=state.phase!=='ready';
    resultStable.disabled=state.phase!=='await-result';
    resultOsc.disabled=state.phase!=='await-result';
    reenterBtn.disabled=!['result-ready','review'].includes(state.phase);
    reenterBtn.textContent=state.phase==='review'?'READ SAVED TRACE':'RE-ENTER STATE';

    beacon.className='astra-beacon';
    if(state.phase==='await-result')beacon.classList.add('pulsing');
    if(state.pending==='stable')beacon.classList.add('stable');
    if(state.pending==='oscillating')beacon.classList.add('oscillating');

    if(state.phase==='ready'){
      worldStatus.textContent=state.turn===0
        ? 'World is waiting. Run the first probe.'
        : 'Re-entry complete. The next probe now depends on the observed result.';
    }
    if(state.phase==='await-result')worldStatus.textContent='Current lab probe: '+state.probe+'. Choose a result; no external measurement is performed.';
    if(state.phase==='result-ready')worldStatus.textContent='Lab result selected for '+state.probe+'. Re-enter to update the current position.';
    if(state.phase==='review')worldStatus.textContent='Two lab choices saved. Read the last trace to select one external check; no measurement has been made.';
    if(state.phase==='history-checked')worldStatus.textContent='Saved trace consulted. The proposed check has not been performed in the real world.';
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
    const choice=kind==='stable'?resultStable.textContent:resultOsc.textContent;
    const label='Context S'+state.turn+': '+state.probe+' → '+choice+' (selected in lab)';
    state.history.push(label);
    render();
  };

  resultStable.addEventListener('click',()=>observeResult('stable'));
  resultOsc.addEventListener('click',()=>observeResult('oscillating'));

  reenterBtn.addEventListener('click',()=>{
    if(state.phase==='review'){
      // The current decision surface is shared across both routes.
      // Only the browser-local lab trace distinguishes the next check.
      const last=state.history[state.history.length-1]||'';
      const fallback=last.startsWith('Context S1: VERIFY FALLBACK / REVERSIBLE → ');
      const threshold=last.startsWith('Context S1: LOWER PULSE / THRESHOLD → ');
      if(fallback!==threshold){
        state.candidate=fallback
          ?'Check actual fallback integrity'
          :'Check actual lower-pulse threshold';
        state.probe=fallback
          ?'EXTERNAL CHECK / FALLBACK'
          :'EXTERNAL CHECK / PULSE THRESHOLD';
        state.reason='直近のブラウザ内操作履歴を参照して選択。実世界の結果は未観測。';
      }else{
        state.candidate='No reliable lab trace to select a check';
        state.probe='UNDECIDED / TRACE NOT RECOGNIZED';
        state.reason='履歴を参照したが識別できないため、次の確認先は未決定。';
      }
      state.phase='history-checked';
      render();
      return;
    }
    if(state.phase!=='result-ready')return;
    const completedProbe=state.probe;
    const outcome=state.pending;
    state.turn+=1;

    if(completedProbe==='LOW PULSE / RELAY'){
      if(outcome==='stable'){
        state.position='STATE '+state.turn+' / STABLE RESPONSE SELECTED';
        state.observed=['Beacon = unstable','Relay = reachable','Lab-selected low pulse response = stable','Fallback = intact'];
        state.unknown=['Whether fallback remains intact after relay use'];
        state.candidate='Test fallback briefly, then return';
        state.probe='VERIFY FALLBACK / REVERSIBLE';
        state.reason='新しいStateでGoalに残ったUnknownへ直接届き、元に戻せる';
      }else{
        state.position='STATE '+state.turn+' / OSCILLATION SELECTED';
        state.observed=['Beacon = unstable','Relay = reachable','Lab-selected low pulse response = oscillating','Fallback = intact'];
        state.unknown=['Where the lower safe pulse threshold begins'];
        state.candidate='Reduce pulse strength and test the threshold';
        state.probe='LOWER PULSE / THRESHOLD';
        state.reason='直前Resultで生まれたUnknownへ届き、同じ強さを繰り返さない';
      }
      state.phase='ready';
    }else{
      // Second-turn outcomes are recorded against their actual probe.
      // No third-step rule has been evidenced: stop rather than invent one.
      state.position='STATE '+state.turn+' / TWO-TURN REVIEW';
      state.observed=['Two lab choices are stored in local history','No real-world measurement has been recorded'];
      state.unknown=['Which real-world condition should be checked next?'];
      state.candidate='Read the last saved lab probe before choosing a check';
      state.probe='UNDECIDED / CHECK SAVED TRACE';
      state.reason='過去の選択を現在地に混ぜず、必要な時だけ履歴を参照する';
      state.phase='review';
    }

    state.pending=null;
    render();
  });

  resetBtn.addEventListener('click',()=>{
    state=initial();
    try{localStorage.removeItem(STORAGE_KEY);}catch(e){}
    render(false);
  });

  render(false);
})();
