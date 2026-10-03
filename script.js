const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.panel>*:not(.no),.loop>*:not(.no),.flow-copy>*:not(.no),.discoveries>*:not(.no),.end>*,.states-head>*,.state-labels>*,.play-copy>*').forEach(el=>{el.classList.add('reveal');io.observe(el)});

// Hero drift: tiny motion only, enough to make the world feel alive.
const hero=document.querySelector('.hero');
const heroImg=document.querySelector('.hero-bg');
if(hero&&heroImg){
  hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    heroImg.style.transform=`scale(1.035) translate(${x*-8}px,${y*-6}px)`;
  });
  hero.addEventListener('pointerleave',()=>heroImg.style.transform='scale(1.02)');
  heroImg.style.transform='scale(1.02)';
}

// The center of the loop is now a small state switch.
// Remember only the last observed selection in this browser.
const core=document.querySelector('.orb-core');
const stateWords=['observe','discover','expand'];
const FLOW_STATE_KEY='flow-world-loop-state-v1';
let stateIndex=0;
try{
  const saved=localStorage.getItem(FLOW_STATE_KEY);
  const found=stateWords.indexOf(saved);
  if(found>=0)stateIndex=found;
}catch(e){}
if(core){
  document.body.dataset.flowState=stateWords[stateIndex];
  core.textContent=stateIndex===0?'×':stateIndex===1?'✦':'◎';
  core.addEventListener('click',()=>{
    stateIndex=(stateIndex+1)%stateWords.length;
    const nextState=stateWords[stateIndex];
    document.body.dataset.flowState=nextState;
    core.textContent=stateIndex===0?'×':stateIndex===1?'✦':'◎';
    try{localStorage.setItem(FLOW_STATE_KEY,nextState);}catch(e){}
  });
}

// A tiny constellation sandbox. Remember only stars the visitor actually placed.
const field=document.querySelector('#constellation');
const CONSTELLATION_KEY='flow-world-constellation-v1';
let constellationTraces=[];
let previous=null;
if(field){
  try{
    const saved=JSON.parse(localStorage.getItem(CONSTELLATION_KEY)||'[]');
    if(Array.isArray(saved))constellationTraces=saved.slice(-26);
  }catch(e){constellationTraces=[];}

  const renderStar=(trace)=>{
    const r=field.getBoundingClientRect();
    const px=trace.x*r.width,py=trace.y*r.height;
    if(previous){
      const dx=px-previous.x,dy=py-previous.y;
      const line=document.createElement('i');
      line.className='star-line';
      line.style.left=previous.x+'px';
      line.style.top=previous.y+'px';
      line.style.width=Math.hypot(dx,dy)+'px';
      line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
      field.appendChild(line);
    }
    const star=document.createElement('i');
    star.className='star'+(trace.gold?' gold':'');
    star.style.left=px+'px';star.style.top=py+'px';
    field.appendChild(star);
    previous={x:px,y:py};
  };

  constellationTraces.forEach(renderStar);

  // Make persistence legible without assigning meaning to the trace.
  // We only report the stars this browser actually placed and restored.
  const note=field.querySelector('.constellation-note');
  if(note&&constellationTraces.length){
    note.textContent=`${constellationTraces.length} STAR${constellationTraces.length===1?'':'S'} RETURNED WITH YOU`;
    note.title='Observed from this browser\'s saved constellation.';
  }

  const addStar=(x,y)=>{
    const r=field.getBoundingClientRect();
    const px=x-r.left, py=y-r.top;
    if(px<0||py<0||px>r.width||py>r.height)return;
    const trace={x:px/r.width,y:py/r.height,gold:Math.random()>.72};
    constellationTraces.push(trace);
    if(constellationTraces.length>26)constellationTraces.shift();
    try{localStorage.setItem(CONSTELLATION_KEY,JSON.stringify(constellationTraces));}catch(e){}
    field.querySelectorAll('.star,.star-line').forEach(el=>el.remove());
    previous=null;
    constellationTraces.forEach(renderStar);
  };
  field.addEventListener('pointerdown',e=>addStar(e.clientX,e.clientY));
}

// Flow occasionally speaks. The button only changes the current line.
const signal=document.querySelector('.flow-signal');
const whisper=document.querySelector('.flow-whisper');
const lines=[
  'まだ決まっていないものは、そのままでいい。',
  '少し違う。それだけで、次に見る場所が生まれる。',
  '答えより先に、景色が変わることがある。',
  '見つけたものを、急いで名前にしなくてもいい。',
  'ここにはゴールがない。だから寄り道できる。',
  'ひとつ星を置くと、次の星の場所が少しだけ見える。',
  '今日はこの世界を、昨日と同じにしなくていい。'
];
const SIGNAL_COUNT_KEY='flow-world-signal-count-v1';
let lineIndex=0;
let signalCount=0;
try{
  const saved=Number(localStorage.getItem(SIGNAL_COUNT_KEY));
  if(Number.isInteger(saved)&&saved>=0)signalCount=saved;
}catch(e){}

const observedWhisper=()=>{
  let roomCount=0;
  let gardenCount=0;
  let lastObservedPlace='';
  let selectedLens='';
  let loopState='';
  try{
    const savedRoom=Number(localStorage.getItem('flow-world-room-door-count-v1'));
    if(Number.isInteger(savedRoom)&&savedRoom>=0)roomCount=savedRoom;
  }catch(e){}
  try{
    const savedGarden=JSON.parse(localStorage.getItem('flow-world-sky-garden-v1')||'[]');
    if(Array.isArray(savedGarden))gardenCount=savedGarden.length;
  }catch(e){}
  try{
    const savedPlace=localStorage.getItem('flow-world-last-place-v1');
    if(savedPlace&&document.getElementById(savedPlace))lastObservedPlace=savedPlace;
  }catch(e){}
  try{
    const savedLens=Number(localStorage.getItem('flow-world-desk-lens-v1'));
    const lenses=[...document.querySelectorAll('.desk-card')];
    if(Number.isInteger(savedLens)&&lenses[savedLens])selectedLens=lenses[savedLens].dataset.title||'';
  }catch(e){}
  try{
    const savedState=localStorage.getItem('flow-world-loop-state-v1');
    if(['observe','discover','expand'].includes(savedState))loopState=savedState;
  }catch(e){}
  const stateNote=loopState?` Loopに残っているstateは「${loopState}」。`:'';
  const placeNote=lastObservedPlace?` 最後に観測された場所は #${lastObservedPlace}。`:'';
  const lensNote=selectedLens?` Deskに残っているlensは「${selectedLens}」。`:'';
  return `このブラウザには、庭のtraceが${gardenCount}個、扉を開いた記録が${roomCount}回残っている。${stateNote}${placeNote}${lensNote}`;
};

if(signal&&whisper){
  signal.addEventListener('click',()=>{
    signalCount+=1;
    try{localStorage.setItem(SIGNAL_COUNT_KEY,String(signalCount));}catch(e){}
    lineIndex=(lineIndex+1)%lines.length;
    whisper.textContent=signalCount%4===0?observedWhisper():lines[lineIndex];
    whisper.classList.toggle('open');
    signal.setAttribute('aria-expanded',whisper.classList.contains('open'));
  });
}


// Flow's room has no goal. Each door only changes the mood a little.
const room=document.querySelector('.flow-room');
const roomButton=document.querySelector('.room-button');
const roomResponse=document.querySelector('.room-response');
const roomLines=[
  '扉の向こうは、まだ未定。',
  '今日は本棚の裏に、空がある。',
  '猫は何も説明しない。それでいい。',
  'ひとつ選ばなかったから、三つ残った。',
  'この部屋では、寄り道が正規ルート。',
  '窓の外の街は、見るたび少し違う。',
  '答えは置いてない。代わりに余白がある。'
];
const ROOM_VISITS_KEY='flow-world-room-door-count-v1';
let roomDoorCount=0;
try{
  const saved=Number(localStorage.getItem(ROOM_VISITS_KEY));
  if(Number.isInteger(saved)&&saved>=0)roomDoorCount=saved;
}catch(e){}
let roomIndex=roomDoorCount%roomLines.length;
if(room&&roomButton&&roomResponse){
  // Remember only an observed action: how many times this browser opened the door.
  // We do not infer preference, mood, or meaning from that count.
  if(roomDoorCount>0){
    roomResponse.textContent=roomLines[roomIndex];
    roomButton.title=`This browser has opened the small door ${roomDoorCount} time${roomDoorCount===1?'':'s'}.`;
  }
  roomButton.addEventListener('click',()=>{
    roomDoorCount+=1;
    try{localStorage.setItem(ROOM_VISITS_KEY,String(roomDoorCount));}catch(e){}
    roomIndex=roomDoorCount%roomLines.length;
    roomButton.title=`This browser has opened the small door ${roomDoorCount} time${roomDoorCount===1?'':'s'}.`;
    room.classList.toggle('dreaming',roomIndex%2===1);
    roomResponse.classList.add('swap');
    setTimeout(()=>{
      roomResponse.textContent=roomLines[roomIndex];
      roomResponse.classList.remove('swap');
    },180);

    for(let i=0;i<9;i++){
      const s=document.createElement('i');
      s.className='room-spark';
      s.style.left=(8+Math.random()*84)+'%';
      s.style.top=(38+Math.random()*48)+'%';
      s.style.animationDelay=(Math.random()*.7)+'s';
      room.appendChild(s);
      setTimeout(()=>s.remove(),5600);
    }
  });
}


// Sky Garden: traces persist in this browser via localStorage.
const garden=document.querySelector('#garden-field');
const gardenCount=document.querySelector('.garden-count');
const gardenSeed=document.querySelector('.garden-seed');
const gardenClear=document.querySelector('.garden-clear');
const GARDEN_KEY='flow-world-sky-garden-v1';
let gardenTraces=[];

const loadGarden=()=>{
  try{
    const saved=JSON.parse(localStorage.getItem(GARDEN_KEY)||'[]');
    if(Array.isArray(saved)) gardenTraces=saved.slice(-60);
  }catch(e){ gardenTraces=[]; }
};
const saveGarden=()=>{
  try{ localStorage.setItem(GARDEN_KEY,JSON.stringify(gardenTraces.slice(-60))); }catch(e){}
};
const updateGardenCount=()=>{
  if(gardenCount) gardenCount.textContent=`${gardenTraces.length} trace${gardenTraces.length===1?'':'s'} remain here.`;
};
const renderGardenTrace=(trace,animate=true)=>{
  if(!garden)return;
  const el=document.createElement('i');
  el.className=`garden-trace ${trace.type}`;
  el.style.left=(trace.x*100)+'%';
  el.style.top=(trace.y*100)+'%';
  if(!animate) el.style.animation='none';
  garden.appendChild(el);
};
const addGardenTrace=(x,y,type)=>{
  if(!garden)return;
  const r=garden.getBoundingClientRect();
  const nx=Math.min(1,Math.max(0,(x-r.left)/r.width));
  const ny=Math.min(1,Math.max(0,(y-r.top)/r.height));
  const t=type||(['light','flower','island'][Math.floor(Math.random()*3)]);
  const trace={x:nx,y:ny,type:t};
  gardenTraces.push(trace);
  if(gardenTraces.length>60) gardenTraces.shift();
  renderGardenTrace(trace,true);
  saveGarden();
  updateGardenCount();
};
if(garden){
  loadGarden();
  gardenTraces.forEach(t=>renderGardenTrace(t,false));
  updateGardenCount();

  garden.addEventListener('pointerdown',e=>addGardenTrace(e.clientX,e.clientY));

  if(gardenSeed){
    gardenSeed.addEventListener('click',()=>{
      const r=garden.getBoundingClientRect();
      const x=r.left+r.width*(.18+Math.random()*.64);
      const y=r.top+r.height*(.18+Math.random()*.62);
      addGardenTrace(x,y);
    });
  }

  if(gardenClear){
    gardenClear.addEventListener('click',()=>{
      gardenTraces=[];
      garden.querySelectorAll('.garden-trace').forEach(el=>el.remove());
      saveGarden();
      updateGardenCount();
    });
  }
}


// The Desk: principles are lenses, not commandments. The selected lens persists locally.
const deskCards=[...document.querySelectorAll('.desk-card')];
const deskTitle=document.querySelector('.desk-lens-title');
const deskCopy=document.querySelector('.desk-lens-copy');
const DESK_KEY='flow-world-desk-lens-v1';

const selectDeskLens=(index)=>{
  if(!deskCards.length||!deskTitle||!deskCopy)return;
  const safe=Math.max(0,Math.min(deskCards.length-1,index));
  deskCards.forEach((card,i)=>card.classList.toggle('active',i===safe));
  const card=deskCards[safe];
  deskTitle.textContent=card.dataset.title||'';
  deskCopy.textContent=card.dataset.copy||'';
  try{ localStorage.setItem(DESK_KEY,String(safe)); }catch(e){}
};
if(deskCards.length){
  let saved=0;
  try{
    const raw=Number(localStorage.getItem(DESK_KEY));
    if(Number.isInteger(raw))saved=raw;
  }catch(e){}
  selectDeskLens(saved);
  deskCards.forEach((card,i)=>{
    card.addEventListener('click',()=>selectDeskLens(i));
  });
}


// A tiny return trace: remember only where this browser last left the world.
// It does not infer intent or importance; it simply offers the observed coordinate back.
const LAST_PLACE_KEY='flow-world-last-place-v1';
const worldSections=[...document.querySelectorAll('main section[id]')];
let lastPlace=null;
try{lastPlace=localStorage.getItem(LAST_PLACE_KEY);}catch(e){}
if(lastPlace&&document.getElementById(lastPlace)){
  const returnMark=document.createElement('button');
  returnMark.type='button';
  returnMark.className='flow-return-mark';
  returnMark.textContent='↩ LAST PLACE';
  returnMark.title=`Return to #${lastPlace}`;
  returnMark.addEventListener('click',()=>{
    document.getElementById(lastPlace)?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.body.appendChild(returnMark);
}
if(worldSections.length&&'IntersectionObserver' in window){
  const placeObserver=new IntersectionObserver(entries=>{
    const visible=entries
      .filter(entry=>entry.isIntersecting)
      .sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    lastPlace=visible.target.id;
    try{localStorage.setItem(LAST_PLACE_KEY,lastPlace);}catch(e){}
  },{threshold:[.35,.55,.75]});
  worldSections.forEach(section=>placeObserver.observe(section));
}
