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
const core=document.querySelector('.orb-core');
const stateWords=['observe','discover','expand'];
let stateIndex=0;
if(core){
  core.addEventListener('click',()=>{
    stateIndex=(stateIndex+1)%stateWords.length;
    document.body.dataset.flowState=stateWords[stateIndex];
    core.textContent=stateIndex===0?'×':stateIndex===1?'✦':'◎';
  });
}

// A tiny constellation sandbox. Nothing to achieve: touches simply remain as traces.
const field=document.querySelector('#constellation');
let previous=null;
if(field){
  const addStar=(x,y)=>{
    const r=field.getBoundingClientRect();
    const px=x-r.left, py=y-r.top;
    if(px<0||py<0||px>r.width||py>r.height)return;
    if(previous){
      const dx=px-previous.x,dy=py-previous.y;
      const d=Math.hypot(dx,dy);
      const line=document.createElement('i');
      line.className='star-line';
      line.style.left=previous.x+'px';
      line.style.top=previous.y+'px';
      line.style.width=d+'px';
      line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
      field.appendChild(line);
    }
    const star=document.createElement('i');
    star.className='star'+(Math.random()>.72?' gold':'');
    star.style.left=px+'px';star.style.top=py+'px';
    field.appendChild(star);
    previous={x:px,y:py};
    const all=field.querySelectorAll('.star,.star-line');
    if(all.length>52){all[0].remove();if(all[1])all[1].remove();}
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
let lineIndex=0;
if(signal&&whisper){
  signal.addEventListener('click',()=>{
    lineIndex=(lineIndex+1)%lines.length;
    whisper.textContent=lines[lineIndex];
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
let roomIndex=0;
if(room&&roomButton&&roomResponse){
  roomButton.addEventListener('click',()=>{
    roomIndex=(roomIndex+1)%roomLines.length;
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
