(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(pointer: fine)').matches;

const DIRS={external:'Внешние',internal:'Внутренние',outlist:'Out of the list',own:'Свой проект'};
const HERO=CASES.slice(0,5);
const art=(c,seed=0)=>`radial-gradient(120% 90% at ${30+seed*13%50}% ${70-seed*7%40}%, ${c[0]} 0%, transparent 55%), radial-gradient(90% 80% at ${80-seed*11%40}% ${20+seed*9%40}%, ${c[1]} 0%, transparent 60%), ${c[2]}`;
const cover=(k,seed=0)=>k.vid?`url(${k.vid.replace('.mp4','.webp')}) center/cover no-repeat, ${k.c[2]}`:k.img?`url(${k.img}) center/cover no-repeat, ${k.c[2]}`:art(k.c,seed); // фото кейса, пока его нет — градиент
// видео-обложка поверх фото: играет только видимая, при «уменьшении движения» и в режиме энергосбережения остаётся фото
const BLOB={}; let ready=false;
const HEVC=(()=>{try{return document.createElement('video').canPlayType('video/mp4; codecs="hvc1"')!==''}catch(e){return false}})(); // HEVC легче на ~30% при том же качестве; где не поддерживается — H.264
const vurl=u=>HEVC?u.replace('.mp4','.hevc.mp4'):u; // видео скачиваются целиком при загрузке страницы и играют из памяти
const vid=k=>k.vid&&!reduce?`<video class="cv" src="${BLOB[k.vid]||vurl(k.vid)}" poster="${k.vid.replace('.mp4','.webp')}" muted loop playsinline preload="metadata" aria-hidden="true"></video>`:'';
const playIn=(el,on)=>{const v=el&&el.querySelector('video.cv');if(!v)return;if(on){if(!ready)return;v.preload='auto';v.play().catch(()=>{});}else v.pause();};

/* ---------- hero ---------- */
const bgs=$('#bgs'), stage=$('#stage'), bars=$('#bars');
HERO.forEach((k,i)=>{
  const b=document.createElement('div');b.className='slide-bg';b.style.background=cover(k,i);b.innerHTML=vid(k);bgs.appendChild(b);
  const t=document.createElement('div');t.className='slide-title';t.setAttribute('aria-hidden','true');
  t.innerHTML=`<div class="d"><span class="line"><span class="o on-dark">${k.out}</span></span><span class="line"><span>${k.solid}</span></span></div><div class="sub small"><span>${k.sub}</span></div>`;
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
    slides.forEach((e,j)=>{e.classList.toggle('on',j===cur);e.style.zIndex=j===cur?1:0;playIn(e,j===cur&&heroSeen&&!$$('.panel.on').length);});
    nxt.classList.remove('moving'); nxt.style.cssText='';
    $('#nextPrev').style.background=cover(HERO[n1],n1);
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
  $('#next2Prev').style.background=cover(HERO[n1],n1); nxt2.classList.add('in');
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
let heroSeen=true; // баннер ушёл с экрана — видео на паузе
if('IntersectionObserver' in window)new IntersectionObserver(([e])=>{heroSeen=e.isIntersecting;$$('.slide-bg').forEach((b,j)=>playIn(b,heroSeen&&j===cur&&!$$('.panel.on').length));}).observe($('#hero'));
go(0,true);
/* ---------- загрузка: заставка держится, пока не скачаются все видео-обложки (не дольше 15 с) ---------- */
(()=>{const ld=$('#loader'),urls=[...new Set(CASES.filter(k=>k.vid).map(k=>k.vid))];
  const got=urls.map(()=>0),tot=urls.map(()=>0);let shown=0;
  const swap=()=>$$('video.cv').forEach(v=>{const u=Object.keys(BLOB).find(u=>v.getAttribute('src')===vurl(u));if(u&&v.paused){v.src=BLOB[u];}});
  const finish=()=>{if(ready)return;ready=true;swap();ld.classList.add('done');document.documentElement.classList.remove('loading');
    go(cur,true);if(!reduce)tmr=setTimeout(()=>go(cur+1),DUR);if($('#casePanel').classList.contains('on'))playIn($('#cVis'),true);else coverVis.forEach(a=>playIn(a,true));};
  const upd=()=>{const p=urls.reduce((a,u,i)=>a+(tot[i]?Math.min(1,got[i]/tot[i]):0),0)/urls.length;
    if(p>shown){shown=p;ld.style.setProperty('--p',p);}};
  if(reduce||!urls.length||!window.fetch||!window.ReadableStream){finish();return;}
  setTimeout(finish,15000);
  Promise.all(urls.map(async(u,i)=>{try{const r=await fetch(vurl(u));if(!r.ok)return;tot[i]=+r.headers.get('content-length')||0;
    const rd=r.body.getReader(),parts=[];for(;;){const{done,value}=await rd.read();if(done)break;parts.push(value);got[i]+=value.length;if(!tot[i])tot[i]=got[i];upd();}
    BLOB[u]=URL.createObjectURL(new Blob(parts,{type:'video/mp4'}));}catch(e){}})).then(()=>{ld.style.setProperty('--p',1);swap();setTimeout(finish,250);});
})();
// «Смотреть дальше»: на первом экране стрелка в видимой верхней половине кольца, при прокрутке съезжает в центр
{const dn=$('.down');const f=()=>dn.style.setProperty('--dk',Math.min(1,scrollY/(dn.offsetHeight/2||1)).toFixed(3));addEventListener('scroll',f,{passive:true});f();}
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
let wt=0, wspeed=.004, wtarget=.004, morph=0, morphT=0, col=0;
W.addEventListener('mouseenter',()=>{wtarget=.012;morphT=1});W.addEventListener('mouseleave',()=>{wtarget=.004;morphT=0});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function drawWaves(){
  if(window.__morphTarget!=null){morphT=window.__morphTarget;wtarget=.004+.008*morphT;}
  // второй этап: когда контуры стали кругами, все круги сходятся в центральный; обратно — сначала расходятся, потом снова волны
  const colT=morphT>=.999&&morph>.95?1:0;
  col+=(colT-col)*.045; if(Math.abs(colT-col)<.001)col=colT;
  wspeed+=(wtarget-wspeed)*.05; if(!(morphT<morph&&col>.03))morph+=(morphT-morph)*(window.__morphTarget!=null?.2:.035); wt+=wspeed;
  const m=ease(Math.min(1,Math.max(0,morph)));
  const bd=$('#wavesBadge'); if(bd) bd.style.opacity=(col>=.97?1:0);
  const t=(performance.now()/7000)%1, n=R.length, step=.1, w=.28;
  const ss=(a,x)=>{x=Math.min(1,Math.max(0,(x-a)/w));return x*x*(3-2*x)};
  R.forEach((pts,i)=>{
    const ci=ease(Math.min(1,Math.max(0,(col-(n-1-i)*.1)/.7))), f=1+(meanR[0]/meanR[i]-1)*ci;   // внешний круг начинает сходиться первым
    const up=ss((n-1-i)*step,t), down=ss(.5+i*step,t);   // внешний первым растёт, внутренний первым возвращается
    const grow=1+.045*up*(1-down)*(1-m);
    const d=pts.map(p=>{
      // в покое — волна: контуры по очереди чуть расширяются снаружи внутрь, потом возвращаются изнутри наружу
      const x0=p.X*grow, y0=p.Y*grow;
      return (x0+(p.tx*f-x0)*m).toFixed(1)+','+(y0+(p.ty*f-y0)*m).toFixed(1);
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
  // направления: лёгкий зум у центра
  const arts=$$('.dir .vis .art');
  addEventListener('scroll',()=>{arts.forEach(a=>{const rr=a.parentElement.getBoundingClientRect(),cc=rr.top+rr.height/2,d=Math.min(1,Math.abs(cc-innerHeight/2)/innerHeight);a.style.transform=`scale(${1.06-.06*d})`;});},{passive:true});
}
/* ---------- directions ---------- */
const DIRCASE={external:'vtb',internal:'alfa-battle',outlist:'kaspersky'};
$$('.dir').forEach((s,i)=>{
  const d=s.dataset.dir, list=CASES.filter(c=>c.dir===d), k=CASES.find(c=>c.id===DIRCASE[d]);
  s.querySelector('.art').style.background=cover(k,i+3);s.querySelector('.art').innerHTML=vid(k);
  s.querySelector('.cap').textContent=k.name;
  s.querySelector('.vlink').textContent=k.name+(k.year?' '+k.year:'');
});
function syncClones(){$$('.dir').forEach(s=>{const t=s.querySelector('.ttl'),v=s.querySelector('.vis');let c=v.querySelector('.ttl-clone');if(!c){c=t.cloneNode(true);c.className='ttl-clone';c.setAttribute('aria-hidden','true');v.appendChild(c);}const tr=v.style.translate;v.style.translate='';const a=t.getBoundingClientRect(),b=v.getBoundingClientRect();v.style.translate=tr;c.style.left=(a.left-b.left)+'px';c.style.top=(a.top-b.top)+'px';c.style.width=a.width+'px';});}
syncClones();addEventListener('resize',syncClones);document.fonts&&document.fonts.ready.then(syncClones);
/* параллакс направлений: заголовок стоит, фото, вертикальная подпись и карточка мероприятий едут вместе и заезжают под заголовок; на десктопе обложка ещё и магнитится к курсору */
if(!reduce){
  const px=$$('.dir').map(d=>({d,els:['.vis','.vlink','.card'].map(q=>d.querySelector(q)),v:d.querySelector('.vis')}));let pxQ=0;
  const own=$('#own'),projs=$$('#own .proj');
  const pxRun=()=>{pxQ=0;const vh=innerHeight,amp=Math.min(260,vh*.24);px.forEach(({d,els,v})=>{const b=d.getBoundingClientRect();if(b.bottom<-100||b.top>vh+100)return;
    const p=Math.max(-1,Math.min(1,((b.top+b.height/2)-vh/2)/(vh/2+b.height/2))),sh=(p*amp).toFixed(1);
    els.forEach(e=>e.style.translate=`0 ${sh}px`);const c=v.querySelector('.ttl-clone');if(c)c.style.translate=`0 ${-sh}px`;});
    // собственные проекты: заголовок стоит, карточки едут с разной скоростью (вторая быстрее)
    const ob=own.getBoundingClientRect();if(ob.bottom>-100&&ob.top<vh+100){const p=Math.max(-1,Math.min(1,((ob.top+ob.height/2)-vh/2)/(vh/2+ob.height/2)));projs.forEach((e,j)=>e.style.translate=`0 ${(p*amp*[.4,.75,.55][j]).toFixed(1)}px`);}};
  addEventListener('scroll',()=>{if(!pxQ)pxQ=requestAnimationFrame(pxRun)},{passive:true});addEventListener('resize',pxRun);pxRun();
}
$('#art-southhub').style.background=cover(CASES[1],4);$('#art-southhub').innerHTML=vid(CASES[1]);
// видео-обложки направлений и собственных проектов играют, только пока видны на экране
const coverVis=new Set();
{const es=CASES.find(c=>c.id==='es');$('#art-es').style.background=cover(es,6);$('#art-es').innerHTML=vid({vid:'media/video/es-v.mp4'});} // вертикальная версия ролика под узкую карточку; вставляем до IntersectionObserver, иначе видео не запускается
if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)coverVis.add(e.target);else coverVis.delete(e.target);playIn(e.target,e.isIntersecting&&!$$('.panel.on').length);}),{rootMargin:'100px 0px'});$$('.vis .art').forEach(a=>a.querySelector('video.cv')&&io.observe(a));}
$('#art-podcast').style.background=cover(CASES.find(c=>c.id==='podcast'),2);
$$('[data-filter]').forEach(a=>a.addEventListener('click',()=>setFilter(a.dataset.filter)));

/* ---------- cases index ---------- */
const rows=$('#rows');
CASES.forEach((k,i)=>{
  const r=document.createElement('button');r.className='row';r.dataset.dir=k.dir;r.dataset.c='row';r.dataset.label='Смотреть кейс';
  r.innerHTML=`<span class="n">${String(i+1).padStart(2,'0')}</span><span class="nm">${k.name}</span><span class="sb">${k.sub}</span><span class="tg">${DIRS[k.dir]}</span><span class="rp" style="background:${cover(k,i)}"></span>`;
  r.onclick=()=>openCase(k.id,peek.classList.contains('on')?peek:r);
  r.addEventListener('mouseenter',()=>{peek.replaceChildren();peek.style.background=cover(k,i);peekAt(r);peek.classList.add('on')});
  r.addEventListener('mouseleave',()=>peek.classList.remove('on'));
  rows.appendChild(r);
});
const peek=$('#peek');
// превью при наведении стоит на месте, а не едет за курсором: у правого края строки, по её центру
let peekEl=null;
function peekAt(el){peekEl=el;const b=el.getBoundingClientRect(),w=peek.offsetWidth,m=24;
  const x=Math.min(innerWidth-m,b.right)-w/2,y=b.top+b.height/2;
  if(!peek.classList.contains('on'))peek.style.transition='none';
  peek.style.transform=`translate(${x}px,${y}px)`;peek.offsetWidth;peek.style.transition='';}
addEventListener('scroll',()=>{if(peekEl&&peek.classList.contains('on'))peekAt(peekEl);},{passive:true,capture:true});
function setFilter(f){
  $$('#filters button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===f));
  $$('.row').forEach(r=>r.hidden=!(f==='all'||r.dataset.dir===f));
}
$$('#filters button').forEach(b=>b.onclick=()=>setFilter(b.dataset.f));

/* ---------- panels ---------- */
addEventListener('keydown',e=>{if(e.key==='Tab')document.documentElement.classList.add('kbd');});
addEventListener('pointerdown',()=>document.documentElement.classList.remove('kbd'),{passive:true});
let lastFocus=null;
let lockY=0;
function lockScroll(){lockY=scrollY;document.documentElement.style.overflow='hidden';document.body.style.position='fixed';document.body.style.top=(-lockY)+'px';document.body.style.left='0';document.body.style.right='0';document.body.style.width='100%';}
function unlockScroll(){const h=document.documentElement;h.style.overflow='';document.body.style.position='';document.body.style.top='';document.body.style.left='';document.body.style.right='';document.body.style.width='';h.style.scrollBehavior='auto';scrollTo({top:lockY,left:0,behavior:'instant'});requestAnimationFrame(()=>{h.style.scrollBehavior='';});}
function openPanel(p){playIn(p.querySelector('#cVis'),true);$$('.slide-bg video,.vis .art video').forEach(v=>v.pause());lastFocus=document.activeElement;lockScroll();p.classList.add('on');p.setAttribute('aria-hidden','false');setTimeout(()=>p.querySelector('.x').focus({preventScroll:true}),50);}
function closePanel(p){p.querySelectorAll('video').forEach(v=>v.pause());setTimeout(()=>{if(!$$('.panel.on').length){$$('.slide-bg').forEach((b,j)=>playIn(b,heroSeen&&j===cur));coverVis.forEach(a=>playIn(a,true));}});if(p.id==='aboutPanel')setTimeout(()=>{if(!p.classList.contains('on'))$('#aReel').innerHTML=aReelHtml;},500);if(p.id==='reelPanel')setTimeout(()=>{if(!p.classList.contains('on'))p.querySelector('.reel-frame').innerHTML='';},500);p.classList.remove('on');p.setAttribute('aria-hidden','true');if(!$$('.panel.on').length)unlockScroll();lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true});}
const closeAny=p=>p.id==='casePanel'?closeCase():p.id==='aboutPanel'?closeAbout():closePanel(p);
$$('.panel').forEach(p=>p.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeAny(p)}));
addEventListener('keydown',e=>{if(e.key==='Escape'){$$('.panel.on').forEach(closeAny);if(document.body.classList.contains('menu-open'))toggleMenu(false);}});
let openId=null;
/* у каждого кейса свой адрес: /<id> (например /median-site/southhub). Открытие и переход к следующему кейсу добавляют запись в историю, «назад» возвращает к предыдущему кейсу или на главную */
const baseTitle=document.title; let caseDepth=0;
const ROOT=location.pathname.replace(/[^/]*$/,'');
const caseUrl=id=>ROOT+encodeURIComponent(id);
const caseFromPath=p=>decodeURIComponent(p.slice(ROOT.length).replace(/\/$/,''));
function setCaseUrl(id,push){const st={case:id};if(push){history.pushState(st,'',caseUrl(id));caseDepth++;}else history.replaceState(st,'',caseUrl(id));}
function closeCase(){if(caseDepth>0){history.go(-caseDepth);return;}history.replaceState(null,'',ROOT);document.title=baseTitle;closePanel($('#casePanel'));}
addEventListener('popstate',()=>{const id=caseFromPath(location.pathname),k=CASES.find(c=>c.id===id),panel=$('#casePanel');
  if(id==='about'){openAbout(false);return;}
  if(aboutP.classList.contains('on')){aboutPushed=false;document.title=baseTitle;closePanel(aboutP);}
  if(k){caseDepth=Math.max(0,caseDepth-1);if(id!==openId)fillCase(id);document.title=k.name+' — Median';if(!panel.classList.contains('on'))openPanel(panel);}
  else{caseDepth=0;document.title=baseTitle;if(panel.classList.contains('on'))closePanel(panel);}});
/* страница кейса по макету: обложка (фото слева, заголовок справа) → факты → серые секции → следующий проект */
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const P=a=>(a||[]).map(t=>`<p>${esc(t)}</p>`).join('');
const ttlOf=k=>k.ttl||[[k.out,1],[k.solid,0]].filter(l=>l[0]);
const ttlHtml=(ls,dark)=>ls.map(([t,o])=>`<span class="ln${o?' o'+(dark?' on-dark':''):''}">${esc(t)}</span>`).join('');
// строки заголовка не вылезают за свою колонку: длинные названия ужимаем
function fitTitle(el){el.style.fontSize='';const w=el.clientWidth;if(!w)return;let m=0;el.querySelectorAll('.ln').forEach(l=>m=Math.max(m,l.scrollWidth));if(m>w)el.style.fontSize=(parseFloat(getComputedStyle(el).fontSize)*w/m*.98)+'px';}
const BLOCK={
  cut:b=>`<section class="grey cb cb-cut"><img src="${b.img}" alt="" loading="lazy"><div class="cb-txt">${P(b.text)}</div></section>`,
  pairs:b=>`<section class="grey cb cb-pairs">${b.items.map((it,j)=>`<figure class="pf pf${j%3}"><img src="${it.img}" alt="" loading="lazy"><span class="d o pw">${esc(it.word)}</span></figure>${it.text?`<div class="cb-txt pt${j%3}">${P(it.text)}</div>`:''}`).join('')}</section>`,
  feature:b=>`<section class="grey cb cb-feat"><h3 class="d"><span class="o">${esc(b.out)}</span> ${esc(b.solid)}</h3><figure><img src="${b.img}" alt="" loading="lazy"><figcaption>${P(b.text)}</figcaption></figure></section>`,
  text:(b,j)=>{const w=b.h.split(' ');return `<section class="grey cb cb-text"><h3 class="d">${w.length>1?`<span class="o">${esc(w[0])}</span> ${esc(w.slice(1).join(' '))}`:`<span class="${j%2?'':'o'}">${esc(b.h)}</span>`}</h3><div class="cb-txt">${P(b.text)}</div></section>`;},
  yt:b=>`<section class="cb cb-yt"><div class="yt-frame"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${b.list}&rel=0" title="Плейлист" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></section>`,
  // список выпусков подкаста: номер, тема, гость; ссылка открывает выпуск на YouTube
  eps:b=>`<section class="grey cb cb-eps"><h3 class="d"><span class="o">${esc(b.h)}</span></h3><ol>${b.items.map((e,j)=>`<li><a href="https://www.youtube.com/watch?v=${e.id}&list=${b.list}" target="_blank" rel="noopener" data-c="row" data-label="Смотреть" data-yt="${e.id}"><span class="n">${String(b.items.length-j).padStart(2,'0')}</span><b>${esc(e.title)}</b><span class="g">${esc(e.guest||'')}</span><span class="ar">↗</span><span class="rp" style="background-image:url(https://i.ytimg.com/vi/${e.id}/mqdefault.jpg)"></span></a></li>`).join('')}</ol></section>`,
  // список выпусков со ссылками на их страницы (Event Surfing)
  links:b=>`<section class="grey cb cb-eps"><h3 class="d"><span class="o">${esc(b.h)}</span></h3><ol>${b.items.map((e,j)=>`<li><a href="${e.url}" target="_blank" rel="noopener" data-c="link"><span class="n">${String(b.items.length-j).padStart(2,'0')}</span><b>${esc(e.title)}</b><span class="g">${esc(e.sub||'')}</span><span class="ar">↗</span></a></li>`).join('')}</ol></section>`,
  stats:b=>`<section class="cb cb-stats wrap">${b.items.map(m=>`<div><b class="d">${esc(m.v)}</b><span>${esc(m.l)}</span></div>`).join('')}</section>`
};
function fillCase(id){
  const i=CASES.findIndex(c=>c.id===id), k=CASES[i], n=CASES[(i+1)%CASES.length]; openId=id;
  document.title=k.name+' — Median';
  $('#cVis').style.background=cover(k,i);$('#cVis').innerHTML=vid(k);playIn($('#cVis'),true);
  $('#cTitle').innerHTML=ttlHtml(ttlOf(k),true);
  $('#cSub').textContent=k.sub||''; $('#cDir').textContent=DIRS[k.dir]; $('#cYear').textContent=k.year||'';
  const host=(u)=>u.replace(/^https?:\/\//,'').replace(/\/$/,'');
  const facts=[['Категория',k.cat||({external:'Внешние коммуникации',internal:'Внутренние коммуникации'})[k.dir]||DIRS[k.dir]],['Клиент',k.client],['Локация',k.city],['Год',k.year],['Формат',k.format],['Услуги',k.services]].filter(f=>f[1]);
  const links=(k.links||[]).map(u=>`<a href="${u}" target="_blank" rel="noopener" data-c="link">${esc(host(u))} ↗</a>`).join('<br>');
  if(links)facts.push(['Сайт',links]);
  let tc=0;
  $('#cBody').innerHTML=`<section class="cb cb-facts wrap"><div class="cf-logo d">${esc(k.client||k.name)}</div><dl>${facts.map(([a,b])=>`<dt>${a}</dt><dd>${a==='Сайт'?b:esc(b)}</dd>`).join('')}</dl>${k.lead?`<p class="cf-lead">${esc(k.lead)}</p>`:''}</section>`+
    (k.blocks||[]).map(b=>BLOCK[b.t](b,b.t==='text'?tc++:0)).join('')+
    (k.blocks?'':`<section class="grey cb cb-text"><h3 class="d"><span class="o">Скоро</span></h3><div class="cb-txt"><p>Материалы по этому проекту готовим к публикации.</p></div></section>`);
  $('#cNextName').innerHTML=ttlHtml(ttlOf(n),!n.light); $('#cNextName').classList.toggle('dark',!!n.light); $('#cNextCover').style.background=cover(n,(i+1)%CASES.length);
  $('#cNextCover').setAttribute('aria-label','Следующий проект: '+n.name);
  $('#casePanel .sheet').scrollTop=0;
  requestAnimationFrame(()=>{fitTitle($('#cTitle'));fitTitle($('#cNextName'));});
}
addEventListener('resize',()=>{if(openId){fitTitle($('#cTitle'));fitTitle($('#cNextName'));}});
// бесшовный переход: обложка (баннер или строка списка) превращается в фото на обложке кейса
function flyTo(fly,from,to,T,ease,done){const t0=performance.now();
  const step=now=>{const k=ease(Math.min(1,(now-t0)/T));
    fly.style.left=(from.left+(to.left-from.left)*k)+'px';fly.style.top=(from.top+(to.top-from.top)*k)+'px';
    fly.style.width=(from.width+(to.width-from.width)*k)+'px';fly.style.height=(from.height+(to.height-from.height)*k)+'px';
    if(k<1)requestAnimationFrame(step);else done();};
  requestAnimationFrame(step);}
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function openCase(id,fromEl,noPush){
  fillCase(id);
  if(!noPush)setCaseUrl(id,true);
  const panel=$('#casePanel');
  if(panel.classList.contains('on')||!fromEl||reduce){ if(!panel.classList.contains('on')) openPanel(panel); return; }
  const i=CASES.findIndex(c=>c.id===id), from=fromEl.getBoundingClientRect(), fly=$('#flyCover');
  fly.style.background=cover(CASES[i],i);
  fly.style.left=from.left+'px';fly.style.top=from.top+'px';fly.style.width=from.width+'px';fly.style.height=from.height+'px';
  fly.classList.add('on');
  // панель открываем сразу, без своей анимации, и прячем её фото — его роль играет летящая обложка
  panel.classList.add('instant'); openPanel(panel); $('#cHero').classList.add('ghost');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    flyTo(fly,from,$('#cVis').getBoundingClientRect(),900,easeIO,()=>{$('#cHero').classList.remove('ghost');fly.classList.remove('on');panel.classList.remove('instant');});
  }));
}
// бесшовный переход к следующему кейсу: фото из блока «Следующий проект» встаёт на место фото обложки
let handing=false;
function handoffNext(){
  if(handing)return; handing=true;
  const sheet=$('#casePanel .sheet'), nc=$('#cNext'), i=CASES.findIndex(c=>c.id===openId), n=CASES[(i+1)%CASES.length];
  const from=$('#cNextFrame').getBoundingClientRect(), fly=$('#flyCover'), v=$('#cVis');
  fly.style.background=cover(n,(i+1)%CASES.length);
  fly.style.left=from.left+'px';fly.style.top=from.top+'px';fly.style.width=from.width+'px';fly.style.height=from.height+'px';
  fly.classList.add('on'); nc.classList.add('leaving');
  flyTo(fly,from,{left:0,top:0,width:v.offsetWidth,height:v.offsetHeight},800,easeIO,()=>{
    // под летящим фото подменяем контент и мгновенно показываем новую обложку
    fillCase(n.id); setCaseUrl(n.id,true); sheet.scrollTop=0; nc.classList.remove('leaving'); nc.querySelector('.nc-sticky').style.transform='';nc.querySelector('.nc-sticky').style.setProperty('--k',0); $('#cNextLine').style.transform='';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{fly.classList.remove('on');handing=false;}));
  });
}
$('#cNextCover').onclick=handoffNext;
$('#casePanel .case-hero .case-down').addEventListener('click',()=>{const sh=$('#casePanel .sheet');sh.scrollTo({top:$('#cHero').offsetHeight,behavior:'smooth'});});
// «Следующий проект» приклеен к экрану, линия под фото заполняется, на полном заполнении — переход
// touch: обложка выпуска в строке у центра экрана, как в списке кейсов
if(!fine){const sh=$('#casePanel .sheet');sh.addEventListener('scroll',()=>{const cy=innerHeight/2,ls=[...sh.querySelectorAll('.cb-eps li')];const h=ls.find(x=>(b=>b.top<=cy&&b.bottom>=cy)(x.getBoundingClientRect()));ls.forEach(x=>x.classList.toggle('hover',x===h));},{passive:true});}
const CLIP=CSS.supports('overflow','clip');
$('#casePanel .sheet').addEventListener('scroll',()=>{
  const sh=$('#casePanel .sheet'), nc=$('#cNext'), st=nc.querySelector('.nc-sticky'), r=nc.getBoundingClientRect(), vh=sh.clientHeight;
  if(r.top>vh||r.bottom<0)return;
  // прилипание — position:sticky; вручную только в старых браузерах без overflow:clip
  if(!CLIP)st.style.transform=`translateY(${Math.min(Math.max(0,-r.top),r.height-vh)}px)`;
  // считаем от высоты самой панели (в Safari innerHeight меняется с панелями); у самого низа — ровно 1
  const atEnd=sh.scrollTop>=sh.scrollHeight-vh-2;
  const k=atEnd?1:Math.min(1,Math.max(0,-r.top/(r.height-vh)));
  $('#cNextLine').style.transform=`scaleX(${k.toFixed(3)})`;
  st.style.setProperty('--k',(k*k*(3-2*k)).toFixed(4)); // фото следующего кейса растёт вместе с прокруткой
  if(k>=.98&&!handing)handoffNext();
},{passive:true});
$('[data-case="southhub"]').addEventListener('click',e=>{e.preventDefault();openCase('southhub',e.currentTarget.querySelector('.vis'))});
$('[data-case="es"]').addEventListener('click',e=>{e.preventDefault();openCase('es',e.currentTarget.querySelector('.vis'))});
$('[data-case="podcast"]').addEventListener('click',e=>{e.preventDefault();openCase('podcast',e.currentTarget.querySelector('.vis'))});
const openBrief=()=>{const b=$('#briefPanel');if(!b.classList.contains('on'))openPanel(b);};
$('#start').onclick=openBrief;
// iOS Safari иногда съедает первый тап по кнопке (считает его наведением) — на таче открываем по отпусканию пальца, без синтетического клика
let st0=null;$('#start').addEventListener('touchstart',e=>{const t=e.touches[0];st0=[t.clientX,t.clientY];},{passive:true});
$('#start').addEventListener('touchend',e=>{if(!st0)return;const t=e.changedTouches[0],moved=Math.hypot(t.clientX-st0[0],t.clientY-st0[1])>10;st0=null;
  if(moved||!e.cancelable)return;e.preventDefault();openBrief();});
$('#brief').addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  if(!f.name.value.trim()||!f.contact.value.trim()){toast('Заполните имя и контакт');(f.name.value.trim()?f.contact:f.name).focus();return;}
  const ok=$('#ok');ok.hidden=false;
  ok.textContent=`Спасибо, ${f.name.value.trim()}. Заявка собрана: «${f.kind.value}». В прототипе она никуда не уходит; на рабочем сайте её получит Telegram-бот агентства и CRM.`;
});

/* ---------- hero hold-to-open ---------- */
const hit=$('#hit'), HOLD=900; let holdStart=0, holdRaf=0, lastPointer='mouse';
const REEL='media/video/showreel.mp4'; // Showreel 2022 со старого median.agency (MEDIAN-REEL-LANDING), свой файл вместо YouTube
const showreel=()=>{const p=$('#reelPanel');$('#reelPanel .reel-frame').innerHTML=`<video src="${vurl(REEL)}" poster="media/video/showreel.webp" controls autoplay playsinline preload="auto"></video>`;openPanel(p);const v=$('#reelPanel video');v.play().catch(()=>{});};
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
function fitRing(t=$('#ringText')){const tp=t.firstElementChild,ws=[...tp.querySelectorAll('tspan')];
  // разрядку задаём через dx у каждой буквы, а не letter-spacing: Safari не учитывает letter-spacing в getComputedTextLength, и слово обрезалось
  t.style.letterSpacing='0';ws.forEach(w=>w.removeAttribute('dx'));
  const C=2*Math.PI*58,L=tp.getComputedTextLength(),n=ws.reduce((a,w)=>a+w.textContent.length-1,0);
  let ls=17*.12,gap=(C-L-ls*n)/4; if(gap<ls*3){ls=Math.max(0,(C-L)/(n+12));gap=(C-L-ls*n)/4;}
  ws.forEach(w=>w.setAttribute('dx',[gap,...Array(w.textContent.length-1).fill(ls)].map(v=>v.toFixed(2)).join(' ')));}  // остаток окружности — поровну в 4 промежутка
const fitRings=()=>{fitRing();fitRing($('#ringTextA'));fitRing($('#ringTextD'));};
fitRings();document.fonts&&document.fonts.ready.then(fitRings);

/* ---------- logo swap ---------- */
new IntersectionObserver(([e])=>document.body.classList.toggle('scrolled',!e.isIntersecting),{rootMargin:'-120px 0px 0px 0px',threshold:0}).observe($('#hero'));

/* ---------- шоурил и «О нас» (заглушки до появления контента) ---------- */
// шоурил: по клику на бегущую строку открывается превью (короткая версия) у точки клика, на нём кнопка «На весь экран»
const rp=$('#reelPrev'),rpV=rp.querySelector('video');let rpY=0;
function openPrev(x,y){if(!rpV.getAttribute('src'))rpV.src=vurl('media/video/showreel-teaser.mp4');
  const w=rp.offsetWidth,h=rp.offsetHeight,m=16;rp.style.left=Math.max(m,Math.min(innerWidth-w-m,x-w/2))+'px';rp.style.top=Math.max(m,Math.min(innerHeight-h-m,y-h/2))+'px';
  rp.classList.add('on');rp.setAttribute('aria-hidden','false');rpV.currentTime=0;rpV.play().catch(()=>{});rpY=scrollY;}
function closePrev(){if(!rp.classList.contains('on'))return;rp.classList.remove('on');rp.setAttribute('aria-hidden','true');rpV.pause();}
$('#reelLink').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPrev(e.clientX,e.clientY);});
rp.querySelector('.rp-full').addEventListener('click',()=>{closePrev();showreel();});
rp.querySelector('.rp-x').addEventListener('click',closePrev);
document.addEventListener('click',e=>{if(!rp.contains(e.target))closePrev();});
addEventListener('scroll',()=>{if(Math.abs(scrollY-rpY)>innerHeight*.4)closePrev();},{passive:true});
addEventListener('keydown',e=>{if(e.key==='Escape')closePrev();});

/* ---------- «О нас»: своя страница /about, открывается как кейс ---------- */
const aboutP=$('#aboutPanel'); let aboutPushed=false;
// видео о команде: свой файл (с YouTube из облака не скачать); на обложке — короткое превью без звука, по клику — полное видео
function openAbout(push){if(aboutP.classList.contains('on'))return;
  if(push){history.pushState({about:1},'',ROOT+'about');aboutPushed=true;}
  document.title='О нас — Median';aboutP.querySelector('.sheet').scrollTop=0;openPanel(aboutP);const tz=aboutP.querySelector('.ab-tz');if(tz&&!reduce)tz.play().catch(()=>{});}
function closeAbout(){if(aboutPushed){aboutPushed=false;history.back();return;}history.replaceState(null,'',ROOT);document.title=baseTitle;closePanel(aboutP);}
$$('#wavesLink,[data-about]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openAbout(true);}));
$('#aRing').addEventListener('click',e=>{e.preventDefault();$('#values').scrollIntoView({behavior:reduce?'auto':'smooth'});});
// видео о команде: плеер YouTube подгружаем только по клику
$('#aReel').addEventListener('click',e=>{if(!e.target.closest('.ab-play'))return;$('#aReel').innerHTML=`<video src="media/video/team.mp4" poster="media/video/team.webp" controls autoplay playsinline preload="auto" title="Team median.agency"></video>`;$('#aReel video').play().catch(()=>{});document.body.className=document.body.className.replace(/\bc-\S+/g,'');});
const aReelHtml=$('#aReel').innerHTML;
new IntersectionObserver(([e])=>$('.ab-end').classList.toggle('in',e.isIntersecting),{threshold:.25}).observe($('.ab-end'));
/* короткая версия видео при наведении (десктоп): у шоурила — в превью рядом с курсором, у блоков с видео — прямо в блоке */
if(fine&&!reduce)$$('[data-teaser]').forEach(el=>{const inPeek=el.dataset.teaserIn==='peek';let v=null;
  const mk=()=>{if(!v){v=document.createElement('video');v.className='tz';v.src=vurl(el.dataset.teaser);v.muted=true;v.loop=true;v.playsInline=true;v.preload='auto';v.setAttribute('aria-hidden','true');}return v;};
  el.addEventListener('mouseenter',()=>{const t=mk();if(inPeek){peek.style.background='#000';peek.replaceChildren(t);peek.classList.add('wide');peekAt(el);peek.classList.add('on');}else if(!t.parentNode)el.prepend(t);t.play().catch(()=>{});el.classList.add('tz-on');});
  el.addEventListener('mouseleave',()=>{if(inPeek)peek.classList.remove('on','wide');if(v)v.pause();el.classList.remove('tz-on');});});
// выпуски подкаста: при наведении рядом с курсором всплывает обложка выпуска (как у строк кейсов)
if(fine)$('#cBody').addEventListener('mouseover',e=>{const a=e.target.closest('.cb-eps li a[data-yt]');if(!a||a.contains(e.relatedTarget))return;peek.replaceChildren();peek.style.background=`url(https://i.ytimg.com/vi/${a.dataset.yt}/mqdefault.jpg) center/cover no-repeat, #000`;peek.classList.add('wide');peekAt(a);peek.classList.add('on');});
if(fine)$('#cBody').addEventListener('mouseout',e=>{const a=e.target.closest('.cb-eps li a[data-yt]');if(!a||a.contains(e.relatedTarget))return;peek.classList.remove('on','wide');});
// «Start a project» внизу страницы: сначала закрываем «О нас», потом открываем бриф, чтобы не сбить блокировку прокрутки
$('#aBrief').addEventListener('click',()=>{closeAbout();setTimeout(openBrief,350);});

/* ---------- follow us (баннер и футер): ссылки раскрываются при наведении, на тач — по тапу ---------- */
$$('.follow').forEach(f=>{const b=f.querySelector('.follow-btn');
  b.addEventListener('click',e=>{e.stopPropagation();const o=!f.classList.contains('open');f.classList.toggle('open',o);b.setAttribute('aria-expanded',o);});
  document.addEventListener('click',e=>{if(e.target.closest('.follow')!==f){f.classList.remove('open');b.setAttribute('aria-expanded','false');}});});

/* ---------- footer reveal + curtain ---------- */
if('IntersectionObserver' in window){
  // на телефоне футер лежит под разделом «Собственные проекты»: видимая часть — ниже его нижнего края
  const foot=$('#contact'),own=$('#own');
  const footIn=()=>{if(foot.classList.contains('in'))return;const f=foot.getBoundingClientRect(),under=getComputedStyle(foot).position==='sticky';
    const top=Math.max(0,f.top,under?own.getBoundingClientRect().bottom:0),seen=Math.min(innerHeight,f.bottom)-top;
    if(seen>innerHeight*.35){foot.classList.add('in');removeEventListener('scroll',footIn);}};
  new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){addEventListener('scroll',footIn,{passive:true});footIn();}else removeEventListener('scroll',footIn);}),{threshold:0}).observe(foot);
}else document.documentElement.classList.add('no-io');
function stickyOwn(){const own=$('#own');own.style.top=Math.min(0,innerHeight-own.offsetHeight)+'px';}
let ownW=innerWidth;stickyOwn();addEventListener('resize',()=>{if(matchMedia('(hover:none)').matches&&innerWidth===ownW)return;ownW=innerWidth;stickyOwn();});document.fonts&&document.fonts.ready.then(stickyOwn);

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
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;c.style.transform=`translate(${mx}px,${my}px)`;},{passive:true});
  // «Start a project»: копия надписи с перевёрнутыми контур/заливка, видна только внутри круга курсора
  // (в подвале и в финале страницы «О нас»)
  $$('.start .d').forEach(sd=>{const inv=document.createElement('span');inv.className='d-inv';inv.setAttribute('aria-hidden','true');inv.innerHTML=sd.innerHTML;inv.querySelectorAll('.line>span').forEach(x=>x.classList.toggle('o'));sd.appendChild(inv);sd.classList.add('inv');});
  let sd=null,invOn=false;
  (function loop(){
    let tx=mx,ty=my;
    if(stick){ // кольцо прилипает к центру элемента и чуть тянется за курсором
      const b=(stick.dataset.stickTo&&stick.querySelector(stick.dataset.stickTo)||stick).getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
      const pull=state==='plus'?.5:+(stick.dataset.stickPull||.15);tx=cx+(mx-cx)*pull;ty=cy+(my-cy)*pull; // плюс «Start a project» тянется за курсором заметно дальше
      // курсор всегда круглый: при прилипании — круг по большей стороне элемента
      if(state==='plus'){r.style.width=r.style.height=r.style.borderRadius='';} // размер круга задаёт CSS (как на баннере)
      else{const sz=+stick.dataset.stickSize||Math.min(180,Math.max(b.width,b.height)+12);r.style.width=r.style.height=sz+'px';r.style.borderRadius='';}
    }
    rx+=(tx-rx)*.22;ry+=(ty-ry)*.22;r.style.transform=`translate(${rx}px,${ry}px)`;
    if(state==='plus'&&stick){const s2=stick.closest('.start').querySelector('.d');if(s2!==sd){if(sd)sd.style.setProperty('--r','0px');sd=s2;}}
    if(sd&&(state==='plus'||invOn)){invOn=state==='plus';
      // координаты маски считаем для каждого блока отдельно: у второй строки своя система отсчёта, иначе её вырез смещался и появлялся «второй круг»
      [sd,...sd.querySelectorAll(':scope>.line')].forEach(el=>{const b=el.getBoundingClientRect();el.style.setProperty('--cx',(rx-b.left)+'px');el.style.setProperty('--cy',(ry-b.top)+'px');});
      sd.style.setProperty('--r',invOn?(r.offsetWidth/2)+'px':'0px');}
    requestAnimationFrame(loop)})();
  document.addEventListener('pointerover',e=>{
    const t=e.target.closest('[data-c]'); const s=t?t.dataset.c:'';
    if(s!==state){document.body.classList.remove('c-'+state);state=s;if(s)document.body.classList.add('c-'+s);}
    lab.textContent=t&&t.dataset.label?t.dataset.label:'';
    const st=e.target.closest('[data-stick]');
    if(st!==stick){stick=st;document.body.classList.toggle('c-stick',!!st);if(!st){r.style.width=r.style.height=r.style.borderRadius='';}}
  });
  // магнит: цель задаётся курсором, элемент догоняет её плавно в общем цикле
  const mags=$$('[data-magnet]').map(el=>({el,tx:0,ty:0,x:0,y:0,on:false,fol:el.classList.contains('vis')?el.closest('.dir').querySelector('.vlink'):null}));
  mags.forEach(m=>{
    const k=parseFloat(m.el.dataset.magnet)||.2; // большим блокам (обложки направлений) — слабее
    m.el.addEventListener('pointermove',e=>{const b=m.el.getBoundingClientRect();m.on=true;m.tx=(e.clientX-b.left-b.width/2)*k;m.ty=(e.clientY-b.top-b.height/2)*k;});
    m.el.addEventListener('pointerleave',()=>{m.on=false;m.tx=m.ty=0;});
  });
  (function magLoop(){
    mags.forEach(m=>{m.x+=(m.tx-m.x)*.12;m.y+=(m.ty-m.y)*.12;
      // обложка направления тянет за собой вертикальную подпись, чтобы не наезжать на неё; заголовок стоит, его белая часть внутри обложки сдвигается обратно
      const f=m.fol,c=f&&m.el.querySelector('.ttl-clone');
      if(Math.abs(m.x)+Math.abs(m.y)<.05&&!m.on){if(m.el.style.transform){m.el.style.transform='';if(f)f.style.transform='';if(c)c.style.transform='';}return;}
      m.el.style.transform=`translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px)`;if(f)f.style.transform=m.el.style.transform;if(c)c.style.transform=`translate(${(-m.x).toFixed(2)}px,${(-m.y).toFixed(2)}px)`;});
    requestAnimationFrame(magLoop);
  })();
}

/* прямой заход по адресу кейса */
/* прямая ссылка: 404.html кладёт путь в sessionStorage и отправляет на главную; старые ссылки ?case= тоже открываются */
{let r=null;try{r=sessionStorage.getItem('route');sessionStorage.removeItem('route');}catch(e){}
 const id=r?caseFromPath(r):new URLSearchParams(location.search).get('case');if(r||location.search)history.replaceState(null,'',ROOT+location.hash);if(id==='about'){history.replaceState({about:1},'',ROOT+'about');openAbout(false);}
 else if(id&&CASES.some(c=>c.id===id)){openCase(id,null,true);setCaseUrl(id,false);}}
})();
