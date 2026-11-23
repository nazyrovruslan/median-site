/* Посадка «Переговорка — Совет директоров» (/peregovorka-live). Каждый блок сам по себе: сбой одного не мешает остальным. */
(()=>{
const $=s=>document.querySelector(s);
const safe=(n,f)=>{try{f()}catch(e){try{console.error('[peregovorka]',n,e)}catch(x){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const goal=(name,params)=>{try{window.ym&&ym(9380047,'reachGoal',name,params||{})}catch(e){}try{window.gtag&&gtag('event',name,params||{})}catch(e){}};

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
