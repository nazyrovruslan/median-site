(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(pointer: fine)').matches;

const DIRS={external:'Внешние',internal:'Внутренние',outlist:'Out of the list',own:'Свой проект'};
const CASES=[
 {id:'alfa-dvizh',name:'Альфа Движ',out:'Альфа',solid:'Движ',sub:'Серия событий: Москва, Новосибирск, Екатеринбург, Санкт-Петербург',dir:'internal',year:null,c:['#ef3124','#5a0b07','#120404']},
 {id:'southhub',name:'South HUB',out:'South',solid:'HUB',sub:'Ежегодный кэмп для C-level в IT',dir:'own',year:null,c:['#1db9a8','#0b4a5c','#04151b']},
 {id:'alfa-battle',name:'Alfa Battle',out:'Alfa',solid:'Battle',sub:'BEMA! Лучшее деловое корпоративное событие 2021',dir:'internal',year:2021,c:['#ff5a3c','#7a0f1d','#0d0507']},
 {id:'megafon',name:'MegaFon Bistro 4G',out:'MegaFon',solid:'Bistro 4G',sub:'Корнер МегаФон на Flacon 1170',dir:'external',year:null,c:['#8a4dff','#2fd27a','#140a2e']},
 {id:'vtb',name:'VTB F1',out:'ВТБ',solid:'F1 Sochi',sub:'Интеграция ВТБ в Гран-при Формулы 1 в Сочи',dir:'external',year:2018,c:['#1a46d6','#00a8ff','#030a24']},
 {id:'kaspersky',name:'Kaspersky Lab',out:'Kaspersky',solid:'Interactive',sub:'Интерактивная зона на «Нефоруме блогеров 2017»',dir:'outlist',year:2017,c:['#00a88e','#7fe3c9','#04201b']},
 {id:'wg',name:'WG Awards',out:'WG',solid:'Awards',sub:'Ежегодная церемония вручения премии',dir:'external',year:null,c:['#d9b45a','#3b2a0c','#0c0904']},
 {id:'gridgirls',name:'Grid Girls F1 GP',out:'Grid Girls',solid:'F1 GP',sub:'Grid Girls на Гран-при России Formula 1 2017',dir:'external',year:2017,c:['#e2244f','#9c1a6b','#14040d']}
];
const HERO=CASES.slice(0,5);
const art=(c,seed=0)=>`radial-gradient(120% 90% at ${30+seed*13%50}% ${70-seed*7%40}%, ${c[0]} 0%, transparent 55%), radial-gradient(90% 80% at ${80-seed*11%40}% ${20+seed*9%40}%, ${c[1]} 0%, transparent 60%), ${c[2]}`;

/* ---------- hero ---------- */
const bgs=$('#bgs'), stage=$('#stage'), bars=$('#bars');
HERO.forEach((k,i)=>{
  const b=document.createElement('div');b.className='slide-bg';b.style.background=art(k.c,i);bgs.appendChild(b);
  const t=document.createElement('div');t.className='slide-title';t.setAttribute('aria-hidden','true');
  t.innerHTML=`<div class="d"><span class="line"><span class="o on-dark">${k.out}</span></span><span class="line"><span>${k.solid}</span></span></div><div class="sub small">${k.year?`<b>${k.year}</b>`:''}<span>${k.sub}</span></div>`;
  stage.appendChild(t);
  const bt=document.createElement('button');bt.setAttribute('aria-label',`Кейс ${i+1}: ${k.name}`);bt.dataset.c='link';bt.onclick=()=>go(i);bars.appendChild(bt);
});
$('#tot').textContent=String(HERO.length).padStart(2,'0');
let cur=-1, tmr, zTop=0; const DUR=6500;
let busy=false, moveRaf=0;
const T_MOVE=1300;
const easeMove=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; // плавный разгон и торможение
function go(i,instant){
  if(busy&&!instant)return; busy=!instant;
  cur=(i+HERO.length)%HERO.length;
  const slides=$$('.slide-bg'), nxt=$('#next'), nxt2=$('#next2'), n1=(cur+1)%HERO.length, lab=$('#nxtLabel');
  const land=()=>{ // блок прибыл: обложка под ним становится текущей, плашка мгновенно возвращается с новым превью
    cancelAnimationFrame(moveRaf);
    slides.forEach((e,j)=>{e.classList.toggle('on',j===cur);e.style.zIndex=j===cur?1:0;});
    nxt.classList.remove('moving'); nxt.style.cssText='';
    $('#nextPrev').style.background=art(HERO[n1].c,n1);
    nxt2.classList.remove('in'); nxt2.style.cssText='';
    lab.classList.remove('hide');lab.classList.add('on');
    $$('.slide-title').forEach((e,j)=>{if(j===cur){e.classList.remove('out');e.classList.add('on');}else if(e.classList.contains('on')){e.classList.remove('on');e.classList.add('out');setTimeout(()=>e.classList.remove('out'),800);}});
    [...bars.children].forEach((e,j)=>{e.classList.remove('run');e.classList.toggle('done',j<cur);if(j===cur){void e.offsetWidth;e.style.setProperty('--dur',DUR+'ms');if(!reduce)e.classList.add('run');}});
    $('#cnt').textContent=String(cur+1).padStart(2,'0');
    $('#hit').setAttribute('aria-label','Открыть кейс '+HERO[cur].name);
    busy=false; clearTimeout(tmr); if(!reduce&&!instant) tmr=setTimeout(()=>go(cur+1),DUR);
  };
  if(instant||reduce){land();return;}
  lab.classList.add('hide');lab.classList.remove('on'); // подпись уходит под маску, вернётся с новой плашкой
  const H=$('#hero').getBoundingClientRect(), N=nxt.getBoundingClientRect(), P=$('.hero-panel').getBoundingClientRect();
  const from={t:N.top-H.top,l:N.left-H.left,r:0,b:0}, to={t:0,l:P.left-H.left,r:0,b:H.bottom-P.bottom};
  nxt.classList.add('moving');
  $('#next2Prev').style.background=art(HERO[n1].c,n1); nxt2.classList.add('in');
  $$('.slide-title').forEach((e,j)=>{ // старый заголовок уходит вверх, новый заходит снизу
    if(j===cur){e.classList.remove('out');e.classList.add('on');}
    else if(e.classList.contains('on')){e.classList.remove('on');e.classList.add('out');setTimeout(()=>e.classList.remove('out'),800);}
  });
  // обе плашки двигаются из одного покадрового цикла — одинаково во всех браузерах
  const t0=performance.now();
  const step=now=>{
    const k=easeMove(Math.min(1,(now-t0)/T_MOVE));
    nxt.style.top=(from.t+(to.t-from.t)*k)+'px'; nxt.style.left=(from.l+(to.l-from.l)*k)+'px';
    nxt.style.right='0px'; nxt.style.bottom=(from.b+(to.b-from.b)*k)+'px';
    nxt2.style.width=(N.width*k)+'px'; nxt2.style.height=(N.height*k)+'px';
    if(k<1) moveRaf=requestAnimationFrame(step); else land();
  };
  step(t0);
}
$('#next').onclick=()=>go(cur+1);$('#nxtLabel .narr-w').addEventListener('click',()=>go(cur+1));
go(0,true);if(!reduce)tmr=setTimeout(()=>go(cur+1),DUR);
let tx=null;$('#hero').addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});
$('#hero').addEventListener('touchend',e=>{if(tx==null)return;const dx=e.changedTouches[0].clientX-tx;if(dx<-50)go(cur+1);tx=null;}); // только справа налево: обратный свайп в iOS занят системным «назад»

/* ---------- скраббер: ведём пальцем по полоскам — кейс следует за пальцем ---------- */
(()=>{const el=bars;let active=false,lastIdx=-1;
  const idxAt=x=>{const kids=[...el.children];let best=0,bd=1e9;kids.forEach((k,i)=>{const r=k.getBoundingClientRect(),c=r.left+r.width/2,d=Math.abs(x-c);if(d<bd){bd=d;best=i;}});return best;};
  const start=e=>{active=true;lastIdx=-1;clearTimeout(tmr);move(e);};
  const move=e=>{if(!active)return;const x=(e.touches?e.touches[0]:e).clientX,i=idxAt(x);if(i!==lastIdx){lastIdx=i;go(i,true);clearTimeout(tmr);}if(e.cancelable)e.preventDefault();};
  const end=()=>{if(!active)return;active=false;clearTimeout(tmr);if(!reduce)tmr=setTimeout(()=>go(cur+1),DUR);};
  el.addEventListener('touchstart',start,{passive:false});el.addEventListener('touchmove',move,{passive:false});
  el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);
  el.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;start(e);el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;move(e);});
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
})();

/* ---------- marquee ---------- */
const unit='<span class="o on-dark">Live</span><span>Communications</span>';
$('#mq').innerHTML=(unit).repeat(6); // две одинаковые половины по 3 повтора
// бегущая строка на JS: сдвиг в пикселях по модулю половины ленты — без швов и пустот в любом браузере
(()=>{const tr=$('#mq'),mq=$('.marquee');let x=0,half=0,speed=60,target=60,last=performance.now();
  const measure=()=>{half=tr.scrollWidth/2;};measure();addEventListener('resize',measure);document.fonts&&document.fonts.ready.then(measure);
  mq.addEventListener('mouseenter',()=>target=160);mq.addEventListener('mouseleave',()=>target=60);
  const tick=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(window.__mqTarget!=null)target=window.__mqTarget;speed+=(target-speed)*.08;
    if(half>0){x=(x+speed*dt)%half;tr.style.transform='translate3d('+(-x).toFixed(2)+'px,0,0)';}
    if(!reduce)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);})();

/* ---------- waves: контуры с визитки ---------- */
const CARD=['M 628.328125 478.664062 C 705.382812 447.140625 586.253906 413.808594 646.550781 207.910156 C 652.214844 185.421875 652.273438 172.125 651.652344 167.800781 C 645.320312 116.78125 589.738281 139.289062 541.253906 187.773438 C 487.855469 244.839844 429.296875 180.117188 429.296875 180.117188 C 418.101562 169.789062 402.0625 146.300781 388.574219 155.394531 C 376.777344 164.847656 386.027344 188.894531 395.449219 209.453125 C 418.773438 258.582031 357.53125 263.367188 357.53125 263.367188 C 349.125 264.34375 282.074219 268.617188 300.121094 314.082031 C 316.667969 359.148438 368.652344 315.089844 371.886719 312.167969 C 483.554688 218.460938 596.75 335.132812 592.925781 458.570312 C 591.96875 493.972656 628.328125 478.664062 628.328125 478.664062 Z M 628.328125 478.664062','M 679.0625 521.851562 C 796.210938 473.929688 599.863281 482.332031 705.246094 160.515625 C 720.589844 106.585938 667.402344 29.875 559.390625 137.886719 C 478.214844 224.640625 406.949219 118.261719 406.949219 118.261719 C 406.949219 118.261719 377.707031 77.679688 349.304688 94.722656 C 331.367188 109.09375 339.070312 147.746094 353.394531 179.003906 C 380.671875 237.28125 323.9375 242.828125 323.9375 242.828125 C 287.519531 247.59375 213.039062 256.351562 240.476562 325.472656 C 261.75 382.75 320.121094 425.480469 347.667969 392.566406 C 452.679688 265.921875 544.324219 297.832031 550.1875 494.851562 C 550.1875 570.949219 679.0625 521.851562 679.0625 521.851562 Z M 679.0625 521.851562','M 735.050781 561.597656 C 854.472656 512.742188 678.59375 479.769531 703.140625 289.035156 C 707.726562 244.234375 728.746094 190.671875 749.839844 126.261719 C 774.328125 62.457031 678.027344 -36.550781 558.308594 98.664062 C 459.308594 204.464844 409.386719 84.550781 409.386719 84.550781 C 392.203125 50.183594 357.015625 6 315.757812 46.023438 C 293.191406 69.003906 292.90625 120.078125 310.375 158.195312 C 319.324219 180.183594 330.964844 193.761719 327.148438 203.609375 C 320.605469 220.792969 284.824219 220.382812 284.824219 220.382812 C 231.824219 220.382812 149.582031 243.136719 183.039062 327.429688 C 208.984375 397.28125 302.191406 485.5 339.015625 443.765625 C 475.664062 289.933594 505.566406 341.160156 514.121094 544.414062 C 514.121094 637.214844 735.050781 561.597656 735.050781 561.597656 Z M 735.050781 561.597656','M 811.011719 593.621094 C 968.351562 529.253906 696.457031 506.886719 736.140625 278.183594 C 742.183594 219.15625 763.144531 176.71875 795.058594 107.574219 C 827.003906 45.796875 696.046875 -109.671875 574.125 44.976562 C 469.390625 188.171875 437.476562 69.527344 413.746094 35.160156 C 379.980469 -18.847656 330.765625 -45.710938 282.007812 3.246094 C 252.277344 33.523438 243.03125 71.46875 266.050781 121.691406 C 277.84375 150.664062 290.71875 167.019531 285.691406 179.992188 C 277.066406 202.632812 218.183594 198.402344 218.183594 198.402344 C 148.351562 198.402344 62.410156 227.269531 106.492188 338.324219 C 140.675781 430.355469 301.644531 566.617188 344.605469 506.476562 C 458.753906 344.460938 475.9375 389.875 459.980469 583.800781 C 459.980469 722.496094 811.011719 593.621094 811.011719 593.621094 Z M 811.011719 593.621094'];
const W=$('#waves'), M=240, paths=[], rings=[];
// снимаем точки с исходных кривых (PDF-координаты, ось Y перевёрнута)
const tmp=document.createElementNS('http://www.w3.org/2000/svg','path');W.appendChild(tmp);
CARD.forEach(d=>{tmp.setAttribute('d',d);const L=tmp.getTotalLength(),pts=[];for(let k=0;k<M;k++){const q=tmp.getPointAtLength(L*k/M);pts.push([q.x,637-q.y]);}rings.push(pts);});
W.removeChild(tmp);
// центр и масштаб — по внешнему контуру, чтобы всё влезло в viewBox 520
const outer=rings[rings.length-1];
const bx=[Math.min(...outer.map(p=>p[0])),Math.max(...outer.map(p=>p[0]))],by=[Math.min(...outer.map(p=>p[1])),Math.max(...outer.map(p=>p[1]))];
const cx=(bx[0]+bx[1])/2, cy=(by[0]+by[1])/2, sc=470/Math.max(bx[1]-bx[0],by[1]-by[0]);
const R=rings.map(pts=>pts.map(([x,y])=>{const X=(x-cx)*sc,Y=(y-cy)*sc;return{X,Y,r:Math.hypot(X,Y),a:Math.atan2(Y,X)}}));
const meanR=R.map(pts=>pts.reduce((s,p)=>s+p.r,0)/pts.length);
// цель для морфа: идеальная окружность, точки по порядку вдоль контура
R.forEach((pts,i)=>{
  let area=0;for(let k=0;k<M;k++){const q=pts[k],n=pts[(k+1)%M];area+=q.X*n.Y-n.X*q.Y;}
  const sgn=area>0?1:-1, rc=meanR[i];
  // подбираем стартовый угол так, чтобы суммарный путь точек был минимальным
  let best=null;
  for(let t=0;t<48;t++){const a0=t/48*2*Math.PI;let cost=0;
    for(let k=0;k<M;k+=4){const ta=a0+sgn*2*Math.PI*k/M;cost+=Math.hypot(pts[k].X-rc*Math.cos(ta),pts[k].Y-rc*Math.sin(ta));}
    if(!best||cost<best.cost)best={cost,a0};}
  pts.forEach((p,k)=>{const ta=best.a0+sgn*2*Math.PI*k/M;p.tx=rc*Math.cos(ta);p.ty=rc*Math.sin(ta);
    // нормаль к контуру — по ней гуляют края в покое
    const q=pts[(k-1+M)%M],n=pts[(k+1)%M];let nx=n.Y-q.Y,ny=-(n.X-q.X);const l=Math.hypot(nx,ny)||1;p.nx=nx/l*sgn;p.ny=ny/l*sgn;});
});
R.forEach(()=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');W.appendChild(p);paths.push(p);});
let wt=0, wspeed=.004, wtarget=.004, morph=0, morphT=0;
W.addEventListener('mouseenter',()=>{wtarget=.012;morphT=1});W.addEventListener('mouseleave',()=>{wtarget=.004;morphT=0});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function drawWaves(){
  if(window.__morphTarget!=null){morphT=window.__morphTarget;wtarget=.004+.008*morphT;}
  wspeed+=(wtarget-wspeed)*.05; morph+=(morphT-morph)*(window.__morphTarget!=null?.2:.035); wt+=wspeed;
  const m=ease(Math.min(1,Math.max(0,morph)));
  const bd=$('#wavesBadge'); if(bd) bd.style.opacity=(m>=.985?1:0);
  const t=(performance.now()/7000)%1, n=R.length, step=.1, w=.28;
  const ss=(a,x)=>{x=Math.min(1,Math.max(0,(x-a)/w));return x*x*(3-2*x)};
  R.forEach((pts,i)=>{
    const up=ss((n-1-i)*step,t), down=ss(.5+i*step,t);   // внешний первым растёт, внутренний первым возвращается
    const grow=1+.045*up*(1-down)*(1-m);
    const d=pts.map(p=>{
      // в покое — волна: контуры по очереди чуть расширяются снаружи внутрь, потом возвращаются изнутри наружу
      const x0=p.X*grow, y0=p.Y*grow;
      return (x0+(p.tx-x0)*m).toFixed(1)+','+(y0+(p.ty-y0)*m).toFixed(1);
    });
    paths[i].setAttribute('d','M'+d.join('L')+'Z');
  });
  if(!reduce) requestAnimationFrame(drawWaves);
}
drawWaves();

/* ---------- тач-устройства: курсор-кольцо «стоит» в центре экрана ---------- */
if(!fine){
  const ringC=$('#ring circle');
  // бегущая строка: скорость от прокрутки
  let lastY=scrollY,lastT=performance.now(),boost=0;
  addEventListener('scroll',()=>{const now=performance.now(),dy=Math.abs(scrollY-lastY),dt=Math.max(1,now-lastT);boost=Math.min(1,dy/dt/2);lastY=scrollY;lastT=now;},{passive:true});
  (function mqBoost(){boost*=.92;window.__mqTarget=60+300*boost;requestAnimationFrame(mqBoost)})();
  // что сейчас «под курсором» в центре экрана
  const mq=$('#reelLink'), wl=$('#wavesLink');
  const centerHit=()=>{
    const mb=mq.getBoundingClientRect(), mc=mb.top+mb.height/2; mq.classList.toggle('reel',Math.abs(mc-innerHeight/2)<innerHeight*.22);
    { const cy=innerHeight/2, rows=$$('.row'); const row=rows.find(x=>!x.hidden&&(b=>b.top<=cy&&b.bottom>=cy)(x.getBoundingClientRect())); rows.forEach(x=>x.classList.toggle('hover',x===row)); }
    const b=wl.getBoundingClientRect(), c=b.top+b.height/2, vh=innerHeight;
    // прогресс метаморфозы: 0 — центр фигуры у нижнего края экрана, 1 — в середине; выше середины держим 1
    window.__morphTarget=b.bottom<=0?0:Math.min(1,Math.max(0,(vh-c)/(vh/2)));
  };
  addEventListener('scroll',centerHit,{passive:true});addEventListener('resize',centerHit);setTimeout(centerHit,300);
  // тап по волнам, когда они собраны в круг → «О нас»
  wl.addEventListener('click',e=>{e.preventDefault();document.querySelector('.live-copy').scrollIntoView({behavior:'smooth',block:'center'});});
  // направления: лёгкий зум у центра
  const arts=$$('.dir .vis .art');
  addEventListener('scroll',()=>{arts.forEach(a=>{const rr=a.parentElement.getBoundingClientRect(),cc=rr.top+rr.height/2,d=Math.min(1,Math.abs(cc-innerHeight/2)/innerHeight);a.style.transform=`scale(${1.06-.06*d})`;});},{passive:true});
}
/* ---------- directions ---------- */
const DIRCASE={external:'vtb',internal:'alfa-battle',outlist:'kaspersky'};
$$('.dir').forEach((s,i)=>{
  const d=s.dataset.dir, list=CASES.filter(c=>c.dir===d), k=CASES.find(c=>c.id===DIRCASE[d]);
  s.querySelector('.art').style.background=art(k.c,i+3);
  s.querySelector('.cap').textContent=k.name;
  s.querySelector('.vlink').textContent=k.name+(k.year?' '+k.year:'');
});
function syncClones(){$$('.dir').forEach(s=>{const t=s.querySelector('.ttl'),v=s.querySelector('.vis');let c=v.querySelector('.ttl-clone');if(!c){c=t.cloneNode(true);c.className='ttl-clone';c.setAttribute('aria-hidden','true');v.appendChild(c);}const a=t.getBoundingClientRect(),b=v.getBoundingClientRect(),art=v.querySelector('.art').getBoundingClientRect();c.style.left=(a.left-b.left)+'px';c.style.top=(a.top-b.top)+'px';c.style.width=a.width+'px';});}
syncClones();addEventListener('resize',syncClones);document.fonts&&document.fonts.ready.then(syncClones);
$('#art-southhub').style.background=art(CASES[1].c,4);
$('#art-air').style.background=art(['#b9d66b','#2f6b4f','#0d1a12'],6);
$$('[data-filter]').forEach(a=>a.addEventListener('click',()=>setFilter(a.dataset.filter)));

/* ---------- cases index ---------- */
const rows=$('#rows');
CASES.forEach((k,i)=>{
  const r=document.createElement('button');r.className='row';r.dataset.dir=k.dir;r.dataset.c='view';r.dataset.label='Смотреть кейс';
  r.innerHTML=`<span class="n">${String(i+1).padStart(2,'0')}</span><span class="nm">${k.name}</span><span class="sb">${k.sub}</span><span class="tg">${DIRS[k.dir]}${k.year?' · '+k.year:''}</span><span class="rp" style="background:${art(k.c,i)}"></span>`;
  r.onclick=()=>openCase(k.id,peek.classList.contains('on')?peek:r);
  r.addEventListener('mouseenter',()=>{peek.style.background=art(k.c,i);peek.classList.add('on')});
  r.addEventListener('mouseleave',()=>peek.classList.remove('on'));
  rows.appendChild(r);
});
const peek=$('#peek');
function setFilter(f){
  $$('#filters button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===f));
  $$('.row').forEach(r=>r.hidden=!(f==='all'||r.dataset.dir===f));
}
$$('#filters button').forEach(b=>b.onclick=()=>setFilter(b.dataset.f));

/* ---------- panels ---------- */
let lastFocus=null;
let lockY=0;
function lockScroll(){lockY=scrollY;document.documentElement.style.overflow='hidden';document.body.style.position='fixed';document.body.style.top=(-lockY)+'px';document.body.style.left='0';document.body.style.right='0';document.body.style.width='100%';}
function unlockScroll(){const h=document.documentElement;h.style.overflow='';document.body.style.position='';document.body.style.top='';document.body.style.left='';document.body.style.right='';document.body.style.width='';h.style.scrollBehavior='auto';scrollTo({top:lockY,left:0,behavior:'instant'});requestAnimationFrame(()=>{h.style.scrollBehavior='';});}
function openPanel(p){lastFocus=document.activeElement;lockScroll();p.classList.add('on');p.setAttribute('aria-hidden','false');setTimeout(()=>p.querySelector('.x').focus({preventScroll:true}),50);}
function closePanel(p){p.classList.remove('on');p.setAttribute('aria-hidden','true');if(!$$('.panel.on').length)unlockScroll();lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true});}
$$('.panel').forEach(p=>p.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closePanel(p)}));
addEventListener('keydown',e=>{if(e.key==='Escape'){$$('.panel.on').forEach(closePanel);if(document.body.classList.contains('menu-open'))toggleMenu(false);}});
let openId=null;
function fillCase(id){
  const i=CASES.findIndex(c=>c.id===id), k=CASES[i], n=CASES[(i+1)%CASES.length]; openId=id;
  $('#cHero').style.background=art(k.c,i);
  $('#cTitle').innerHTML=`<span class="o on-dark">${k.out}</span><br>${k.solid}`;
  $('#cSub').textContent=k.sub; $('#cDir').textContent=DIRS[k.dir]; $('#cYear').textContent=k.year||'';
  $('#cClient').textContent=k.name.split(' ')[0]; $('#cFormat').textContent=DIRS[k.dir]; $('#cCity').textContent=k.sub.includes('Сочи')?'Сочи':'Москва';
  $('#cGallery').innerHTML=[0,1,2,3,4].map(j=>`<div style="background:${art(k.c,i+j+1)}"></div>`).join('');
  $('#cNextName').textContent=n.name; $('#cNextCover').style.background=art(n.c,(i+1)%CASES.length);
  $('#casePanel .sheet').scrollTop=0;
}
// бесшовный переход: обложка (баннер или строка списка) разворачивается в обложку страницы кейса
function openCase(id,fromEl){
  fillCase(id);
  const panel=$('#casePanel');
  if(panel.classList.contains('on')||!fromEl||reduce){ if(!panel.classList.contains('on')) openPanel(panel); return; }
  const i=CASES.findIndex(c=>c.id===id), from=fromEl.getBoundingClientRect(), fly=$('#flyCover');
  fly.style.background=art(CASES[i].c,i);
  fly.style.left=from.left+'px';fly.style.top=from.top+'px';fly.style.width=from.width+'px';fly.style.height=from.height+'px';
  fly.classList.add('on');
  // панель открываем сразу, без своей анимации, и прячем её hero — его роль играет летящая обложка
  panel.classList.add('instant'); openPanel(panel); $('#cHero').classList.add('ghost');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const to=$('#cHero').getBoundingClientRect();
    const T=900, ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, t0=performance.now();
    const step=now=>{const k=ease(Math.min(1,(now-t0)/T));
      fly.style.left=(from.left+(to.left-from.left)*k)+'px';fly.style.top=(from.top+(to.top-from.top)*k)+'px';
      fly.style.width=(from.width+(to.width-from.width)*k)+'px';fly.style.height=(from.height+(to.height-from.height)*k)+'px';
      if(k<1)requestAnimationFrame(step);else{$('#cHero').classList.remove('ghost');fly.classList.remove('on');panel.classList.remove('instant');}};
    requestAnimationFrame(step);
  }));
}
// бесшовный переход к следующему кейсу: тизер снизу становится новой обложкой
let handing=false;
function handoffNext(){
  if(handing)return; handing=true;
  const sheet=$('#casePanel .sheet'), nc=$('#cNext'), i=CASES.findIndex(c=>c.id===openId), n=CASES[(i+1)%CASES.length];
  const from=nc.querySelector('.nc-sticky').getBoundingClientRect(), fly=$('#flyCover');
  fly.style.background=art(n.c,(i+1)%CASES.length);
  fly.style.left=from.left+'px';fly.style.top=from.top+'px';fly.style.width=from.width+'px';fly.style.height=from.height+'px';
  fly.classList.add('on');
  const T=700, ease=t=>1-Math.pow(1-t,3), t0=performance.now(), vw=innerWidth, vh=innerHeight;
  const step=now=>{const k=ease(Math.min(1,(now-t0)/T));
    fly.style.left=(from.left*(1-k))+'px';fly.style.top=(from.top*(1-k))+'px';fly.style.width=(from.width+(vw-from.width)*k)+'px';fly.style.height=(from.height+(vh-from.height)*k)+'px';
    if(k<1)requestAnimationFrame(step);
    else{ // под летящей обложкой подменяем контент и мгновенно показываем новый hero
      fillCase(n.id); sheet.scrollTop=0; $('#cNextRing').style.strokeDashoffset='144.5'; nc.querySelector('.nc-sticky').style.transform='';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{fly.classList.remove('on');handing=false;}));
    }};
  requestAnimationFrame(step);
}
$('#cNext').onclick=handoffNext;
$('#casePanel .case-hero .case-down').addEventListener('click',()=>{const sh=$('#casePanel .sheet');sh.scrollTo({top:sh.clientHeight,behavior:'smooth'});});
// параллакс тизера и автопереход, когда тизер занял экран целиком
$('#casePanel .sheet').addEventListener('scroll',()=>{
  const nc=$('#cNext'), st=nc.querySelector('.nc-sticky'), r=nc.getBoundingClientRect(), vh=innerHeight;
  if(r.top>vh||r.bottom<0)return;
  // сцена «приклеена» к верху экрана, пока тизер проходит мимо (без position:sticky — iOS режет его внутри overflow)
  const pin=Math.min(Math.max(0,-r.top),r.height-vh);
  st.style.transform=`translateY(${pin}px)`;
  // прогресс: 0 — тизер появился снизу, 1 — его низ дошёл до низа экрана
  const k=Math.min(1,Math.max(0,(vh-r.top)/r.height));
  $('#cNextCover').style.transform=`scale(${1.08-.08*k})`; $('#cNextCover').style.filter=`brightness(${.7+.3*k})`; $('#cNextRing').style.strokeDashoffset=(144.5*(1-k)).toFixed(1);
  if(k>=.995&&!handing)handoffNext();
},{passive:true});
$('[data-case="southhub"]').addEventListener('click',e=>{e.preventDefault();openCase('southhub',e.currentTarget.querySelector('.vis'))});
$('[data-case="air"]').addEventListener('click',e=>{e.preventDefault();toast('Страница проекта появится после наполнения')});
$('#start').onclick=()=>openPanel($('#briefPanel'));
$('#brief').addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  if(!f.name.value.trim()||!f.contact.value.trim()){toast('Заполните имя и контакт');(f.name.value.trim()?f.contact:f.name).focus();return;}
  const ok=$('#ok');ok.hidden=false;
  ok.textContent=`Спасибо, ${f.name.value.trim()}. Заявка собрана: «${f.kind.value}». В прототипе она никуда не уходит; на рабочем сайте её получит Telegram-бот агентства и CRM.`;
});

/* ---------- hero hold-to-open ---------- */
const hit=$('#hit'), HOLD=900; let holdStart=0, holdRaf=0, lastPointer='mouse';
const showreel=()=>toast('Здесь откроется шоурил агентства (видео подставим из архива)');
const ringC=$('#ring circle');
function holdTick(){const p=Math.min(1,(performance.now()-holdStart)/HOLD);ringC.style.strokeDashoffset=302*(1-p);if(p>=1){endHold();openCase(HERO[cur].id,$('.hero-panel'));return;}holdRaf=requestAnimationFrame(holdTick);}
function endHold(){cancelAnimationFrame(holdRaf);holdStart=0;ringC.style.strokeDashoffset=302;}
function restartTimer(){clearTimeout(tmr);if(!reduce)tmr=setTimeout(()=>go(cur+1),DUR);}
hit.addEventListener('pointerdown',e=>{lastPointer=e.pointerType;clearTimeout(tmr);if(e.pointerType!=='mouse')return;holdStart=performance.now();holdTick();});
hit.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'){restartTimer();return;}if(holdStart&&performance.now()-holdStart<HOLD){endHold();restartTimer();}});
hit.addEventListener('pointercancel',()=>{endHold();restartTimer();});
hit.addEventListener('pointerleave',()=>{if(holdStart){endHold();restartTimer();}});
// тач и клавиатура: обычный тап/Enter открывает кейс (на мыши — удержание с кольцом)
hit.addEventListener('click',()=>{if(lastPointer==='mouse')return;openCase(HERO[cur].id,$('.hero-panel'));});
hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCase(HERO[cur].id,$('.hero-panel'));}});


/* ---------- кольцо «Все проекты»: трекинг подгоняется под длину окружности ---------- */
function fitRing(){const t=$('#ringText'),tp=t.firstElementChild,ws=[...tp.querySelectorAll('tspan')];t.style.letterSpacing='.12em';
  ws.forEach(w=>w.removeAttribute('dx'));
  const C=2*Math.PI*58,L=tp.getComputedTextLength(),gap=Math.max(2,(C-L)/4);
  ws.forEach(w=>w.setAttribute('dx',gap.toFixed(2)));}  // остаток окружности — поровну в 4 промежутка (dx работает и в Safari)
fitRing();document.fonts&&document.fonts.ready.then(fitRing);

/* ---------- logo swap ---------- */
new IntersectionObserver(([e])=>document.body.classList.toggle('scrolled',!e.isIntersecting),{rootMargin:'-120px 0px 0px 0px',threshold:0}).observe($('#hero'));

/* ---------- шоурил и «О нас» (заглушки до появления контента) ---------- */
$('#reelLink').addEventListener('click',e=>{e.preventDefault();showreel();});
if(fine){const mq=$('#reelLink');mq.addEventListener('mouseenter',()=>mq.classList.add('reel'));mq.addEventListener('mouseleave',()=>mq.classList.remove('reel'));}
$('#wavesLink').addEventListener('click',e=>{e.preventDefault();document.querySelector('.live-copy').scrollIntoView({behavior:'smooth',block:'center'});});

/* ---------- footer: follow us toggle on tap ---------- */
$('#follow .follow-btn').addEventListener('click',e=>{e.stopPropagation();const f=$('#follow'),o=!f.classList.contains('open');f.classList.toggle('open',o);$('#follow .follow-btn').setAttribute('aria-expanded',o);});
document.addEventListener('click',e=>{if(!e.target.closest('#follow')){$('#follow').classList.remove('open');$('#follow .follow-btn').setAttribute('aria-expanded','false');}});

/* ---------- footer reveal + curtain ---------- */
if('IntersectionObserver' in window){
  new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){$('#contact').classList.add('in');}}),{threshold:.35}).observe($('#contact'));
}else document.documentElement.classList.add('no-io');
function stickyOwn(){const own=$('#own');own.style.top=Math.min(0,innerHeight-own.offsetHeight)+'px';}
stickyOwn();addEventListener('resize',stickyOwn);document.fonts&&document.fonts.ready.then(stickyOwn);

/* ---------- menu ---------- */
function toggleMenu(open){document.body.classList.toggle('menu-open',open);$('#burger').setAttribute('aria-expanded',open);$('#menu').setAttribute('aria-hidden',!open);$('#burger').setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');}
$('#burger').onclick=()=>toggleMenu(!document.body.classList.contains('menu-open'));
$$('#menu a').forEach(a=>a.addEventListener('click',()=>toggleMenu(false)));

/* ---------- mail copy ---------- */
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2200);}

/* ---------- cursor ---------- */
if(fine&&!reduce){
  document.body.classList.add('has-cursor');
  const c=$('#cur'), r=$('#ring'), lab=r.querySelector('.t');
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,state='',stick=null;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;c.style.transform=`translate(${mx}px,${my}px)`;peek.style.transform=`translate(${mx+150}px,${my}px)`;},{passive:true});
  (function loop(){
    let tx=mx,ty=my;
    if(stick){ // кольцо прилипает к центру элемента и чуть тянется за курсором
      const b=stick.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
      tx=cx+(mx-cx)*.15;ty=cy+(my-cy)*.15;
      const round=stick.dataset.stickShape==='circle'||stick.classList.contains('plus');
      if(round){const sz=Math.max(b.width,b.height)+12;r.style.width=r.style.height=sz+'px';r.style.borderRadius='';}
      else{r.style.width=(b.width+10)+'px';r.style.height=(b.height+10)+'px';r.style.borderRadius=getComputedStyle(stick).borderRadius;}
    }
    rx+=(tx-rx)*.22;ry+=(ty-ry)*.22;r.style.transform=`translate(${rx}px,${ry}px)`;requestAnimationFrame(loop)})();
  document.addEventListener('pointerover',e=>{
    const t=e.target.closest('[data-c]'); const s=t?t.dataset.c:'';
    if(s!==state){document.body.classList.remove('c-'+state);state=s;if(s)document.body.classList.add('c-'+s);}
    lab.textContent=t&&t.dataset.label?t.dataset.label:'';
    const st=e.target.closest('[data-stick]');
    if(st!==stick){stick=st;document.body.classList.toggle('c-stick',!!st);if(!st){r.style.width=r.style.height=r.style.borderRadius='';}}
  });
  // магнит: цель задаётся курсором, элемент догоняет её плавно в общем цикле
  const mags=$$('[data-magnet]').map(el=>({el,tx:0,ty:0,x:0,y:0,on:false}));
  mags.forEach(m=>{
    m.el.addEventListener('pointermove',e=>{const b=m.el.getBoundingClientRect();m.on=true;m.tx=(e.clientX-b.left-b.width/2)*.2;m.ty=(e.clientY-b.top-b.height/2)*.2;});
    m.el.addEventListener('pointerleave',()=>{m.on=false;m.tx=m.ty=0;});
  });
  (function magLoop(){
    mags.forEach(m=>{m.x+=(m.tx-m.x)*.12;m.y+=(m.ty-m.y)*.12;
      if(Math.abs(m.x)+Math.abs(m.y)<.05&&!m.on){if(m.el.style.transform){m.el.style.transform='';}return;}
      m.el.style.transform=`translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px)`;});
    requestAnimationFrame(magLoop);
  })();
}
})();
