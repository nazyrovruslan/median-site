/* Посадка «Переговорка — Совет директоров» (/peregovorka-live). Каждый блок сам по себе: сбой одного не мешает остальным. */
(()=>{
const $=s=>document.querySelector(s);
const safe=(n,f)=>{try{f()}catch(e){try{console.error('[peregovorka]',n,e)}catch(x){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const goal=(name,params)=>{try{window.ym&&ym(9380047,'reachGoal',name,params||{})}catch(e){}try{window.gtag&&gtag('event',name,params||{})}catch(e){}};

/* лайтбокс на первом экране поворачивается от прокрутки (макет «Лайтбокс кадры»: слева → анфас → справа); между кадрами — растворение */
safe('lightbox',()=>{
  const box=$('.lightbox'),cv=$('#lbCv');if(!box||!cv||reduce)return; // при «меньше движения» стоит анфас (картинка lb-still)
  // 37 кадров: ключевые 00 (слева), 12 (полуоборот), 24 (анфас), 36 (справа); между ними — перспективный морфинг надписи
  const N=37,FRONT=24,ctx=cv.getContext('2d'),fr=[];let cur=-1,shown=-1,raf=0;
  const small=innerWidth<=820; // на телефоне кадры вдвое меньше (660×300)
  if(small){cv.width=660;cv.height=300;}
  const src=i=>`media/peregovorka/lightbox/${small?'m/':''}${String(i).padStart(2,'0')}.webp`;
  // поворот растянут на весь путь лайтбокса: от верха страницы до момента, когда он уходит за верх окна; анфас — на середине пути
  const target=()=>{const b=box.getBoundingClientRect(),end=Math.max(1,b.bottom+scrollY),p=Math.min(1,Math.max(0,scrollY/end));
    const q=p*p*(3-2*p); // мягкий старт и финиш
    return Math.min(N-1,q<=.5?6+q/.5*(FRONT-6):FRONT+(q-.5)/.5*(N-1-FRONT));}; // на старте уже чуть развёрнут (кадр 6), не в профиль
  const ok=i=>fr[i]&&fr[i].complete&&fr[i].naturalWidth;
  const paint=f=>{let i=Math.floor(f),k=f-i;if(!ok(i)){ // кадр ещё не скачан — ближайший готовый
      let j=0;while(j<N&&!ok(i-j)&&!ok(i+j))j++;i=ok(i-j)?i-j:i+j;k=0;if(!ok(i))return false;}
    ctx.clearRect(0,0,cv.width,cv.height);ctx.globalAlpha=1;ctx.drawImage(fr[i],0,0,cv.width,cv.height);
    if(k>.01&&ok(i+1)){ctx.globalAlpha=k;ctx.drawImage(fr[i+1],0,0,cv.width,cv.height);ctx.globalAlpha=1;}return true;};
  // инерция: показанный кадр догоняет прокрутку плавно, поэтому шаги колеса мыши не дают рывков
  const loop=()=>{raf=0;const t=target();cur=cur<0?t:cur+(t-cur)*.14;
    if(Math.abs(cur-shown)>.003){if(paint(cur)){shown=cur;box.classList.add('live');}}
    if(Math.abs(t-cur)>.01)raf=requestAnimationFrame(loop);};
  const req=()=>{if(!raf)raf=requestAnimationFrame(loop);};
  const start=Math.round(target()),order=[...Array(N).keys()].sort((x,y)=>Math.abs(x-start)-Math.abs(y-start));
  order.forEach(i=>{const im=new Image();im.decoding='async';im.onload=()=>{shown=-1;req();};im.src=src(i);fr[i]=im;});
  addEventListener('scroll',req,{passive:true});addEventListener('resize',()=>{shown=-1;req();});
});

/* стекло на тач-экранах: наведения нет — растворяется, когда фото у середины экрана */
safe('glass',()=>{const g=$('.glass');if(!g||!matchMedia('(hover:none)').matches||!('IntersectionObserver' in window))return;
  new IntersectionObserver(es=>es.forEach(e=>g.classList.toggle('clear',e.isIntersecting)),{rootMargin:'-35% 0px -35% 0px'}).observe(g);});

/* суфлёр: текст продублирован, прокрутка на половину высоты — стык не виден (компонент «Суфлёр · прокрутка», 18 с) */
safe('roll',()=>{const r=$('#roll');r.innerHTML+=r.innerHTML.replace(/<p>/g,'<p aria-hidden="true">');});

/* шортсы подкаста: те же ролики, что в кейсе podcast (media/reels) */
safe('shorts',()=>{
  const R=[['pod-yandex-community','Внутреннее сообщество в Яндексе'],['pod-doubt','Если ты сомневаешься, значит это не твоё'],['pod-budget','Как защитить годовой бюджет'],['pod-interview-hr','Интервью'],['pod-cu','Я точно иду в ЦУ!'],
           ['pod-ozon','Путь от ресепшена в HRD, Ozon'],['pod-teachers','Как собеседуют международных преподавателей'],['pod-interview','Интервью'],['pod-x5','Бренд работодателя в X5'],['pod-devrel','DevRel в Городских сервисах Яндекса']];
  const tr=$('#shTrack'),dots=$('#shDots'),pl=$('#player'),pv=pl.querySelector('video');
  tr.innerHTML=R.map(([f,t],i)=>`<button class="sh" type="button" data-i="${i}" style="background-image:url(media/reels/${f}.webp)" aria-label="Смотреть: ${t}"><video data-src="media/reels/${f}-p.mp4" muted loop playsinline preload="none" aria-hidden="true"></video><span class="sh-pl" aria-hidden="true"></span><span class="sh-t">${t}</span></button>`).join('');
  const cards=[...tr.children];
  // превью крутятся, только пока карточка на экране
  if('IntersectionObserver' in window&&!reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target.querySelector('video');if(e.isIntersecting){if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{});}else v.pause();}),{threshold:.4});cards.forEach(c=>io.observe(c));}
  const step=()=>cards[0].offsetWidth+parseFloat(getComputedStyle(tr).columnGap||0);
  const pages=()=>Math.max(1,Math.round((tr.scrollWidth-tr.clientWidth)/step())+1);
  const drawDots=()=>{const n=pages(),k=Math.round(tr.scrollLeft/step());dots.innerHTML=Array.from({length:n},(_,i)=>`<i class="${i===Math.min(k,n-1)?'on':''}"></i>`).join('');};
  tr.addEventListener('scroll',()=>requestAnimationFrame(drawDots),{passive:true});addEventListener('resize',drawDots);drawDots();
  const go=d=>{const max=tr.scrollWidth-tr.clientWidth,x=tr.scrollLeft+d*step();tr.scrollTo({left:x>max+4?0:x<-4?max:x,behavior:reduce?'auto':'smooth'});}; // по кругу
  $('#shPrev').onclick=()=>go(-1);$('#shNext').onclick=()=>go(1);
  const close=()=>{pl.classList.remove('on');pl.setAttribute('aria-hidden','true');pv.pause();pv.removeAttribute('src');pv.load();};
  tr.addEventListener('click',e=>{const c=e.target.closest('.sh');if(!c)return;const [f,t]=R[+c.dataset.i];pv.src=`media/reels/${f}.mp4`;pv.poster=`media/reels/${f}.webp`;pl.classList.add('on');pl.setAttribute('aria-hidden','false');pv.play().catch(()=>{});goal('reel_open',{reel:f});});
  pl.querySelector('.pl-x').onclick=close;pl.addEventListener('click',e=>{if(e.target===pl)close();});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&pl.classList.contains('on'))close();});
});

/* видео о команде: тот же ролик, что на «О нас» (media/video/team.mp4), грузится по клику */
safe('team',()=>{const b=$('#teamVid');b.addEventListener('click',()=>{if(b.querySelector('video'))return;const v=document.createElement('video');v.src='media/video/team.mp4';v.poster='media/video/team.webp';v.controls=true;v.playsInline=true;b.appendChild(v);v.play().catch(()=>{});goal('reel_open',{reel:'team'});},{once:false});});

/* форма: заявка письмом на hello@ (Руслан 23.11: «все заявки со всех форм — на hello@median.agency») */
safe('form',()=>{const f=$('#regForm'),ok=$('#regOk');
  f.addEventListener('submit',e=>{e.preventDefault();const v=n=>(f[n].value||'').trim();
    const miss=['name','company','role','contact'].find(n=>!v(n));
    if(miss){ok.textContent='Заполните все поля со звёздочкой';f[miss].focus();return;}
    if(!f.agree.checked){ok.textContent='Нужно согласие на обработку персональных данных';f.agree.focus();return;}
    const body=[`Имя и фамилия: ${v('name')}`,`Компания: ${v('company')}`,`Должность: ${v('role')}`,`Telegram или телефон: ${v('contact')}`,'',`Страница: ${location.href}`].join('\n');
    goal('event_register',{event:'peregovorka-live'});
    location.href='mailto:hello@median.agency?subject='+encodeURIComponent('Переговорка 23 января — подтверждение участия: '+v('name'))+'&body='+encodeURIComponent(body);
    ok.textContent=`Спасибо, ${v('name')}! Открыли письмо с вашими данными — нажмите «Отправить» в почте. Если почта не открылась, напишите на hello@median.agency.`;});
});
})();
