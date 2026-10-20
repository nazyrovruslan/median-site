/* Страница КП (/clients/<адрес>/): цели для сквозной аналитики, копирование ссылки, анимация графика.
   Цели уходят в Яндекс Метрику (reachGoal), dataLayer (GTM и др.), Roistat и событием «kp:goal» на window — его можно ловить своим кодом из CMS. */
(function(){
  var D={};try{D=JSON.parse(document.getElementById('kpData').textContent)}catch(e){}
  var P={kp:D.slug,client:D.client,total:D.total}, sent={};
  function goal(name,once){
    if(once&&sent[name])return;sent[name]=1;
    try{if(D.metrika&&window.ym)ym(D.metrika,'reachGoal',name,P)}catch(e){}
    try{(window.dataLayer=window.dataLayer||[]).push({event:name,kp:D.slug,client:D.client,value:D.total})}catch(e){}
    try{if(window.roistat&&roistat.event&&roistat.event.send)roistat.event.send(name,P)}catch(e){}
    try{window.dispatchEvent(new CustomEvent('kp:goal',{detail:{goal:name,kp:D.slug,client:D.client,total:D.total}}))}catch(e){}
  }
  window.kpGoal=goal;
  // «Срок» до мероприятия считаем по сегодняшней дате посетителя: страница статичная и собирается не каждый день
  [].forEach.call(document.querySelectorAll('[data-until]'),function(el){
    var m=/^(\d{4})-(\d\d)-(\d\d)/.exec(el.getAttribute('data-until'));if(!m)return;
    var t=new Date(),n=Math.round((Date.UTC(+m[1],m[2]-1,+m[3])-Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()))/864e5),a=n%100,b=n%10;
    el.textContent=n>0?'осталось '+n+' '+(a>10&&a<20?'дней':b===1?'день':b>1&&b<5?'дня':'дней'):n===0?'сегодня':'прошло';
  });
  // крупный текст не вылезает за колонку: неразрывный кусок (сумма, длинное слово) шире колонки — уменьшаем шрифт (метка data-fit)
  function fit(){[].forEach.call(document.querySelectorAll('[data-fit]'),function(e){e.style.fontSize='';var w=e.clientWidth,s=e.scrollWidth;if(w&&s>w)e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*w/s*.98)+'px'})}
  fit();addEventListener('resize',fit);if(document.fonts)document.fonts.ready.then(fit);
  goal('kp_open',1);
  // 30 секунд на странице — КП читают, а не закрыли сразу
  setTimeout(function(){if(!document.hidden)goal('kp_read_30s',1)},30000);

  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-goal]');if(a)goal(a.getAttribute('data-goal'));
  });

  // копировать ссылку: адрес из сервиса сквозной аналитики, если задан в CMS, иначе адрес страницы
  var toast=document.getElementById('kpToast'),tt;
  function say(t){toast.textContent=t;toast.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('on')},1800)}
  var cp=document.getElementById('kpCopy');
  if(cp)cp.addEventListener('click',function(){
    var u=D.link||location.href.split('#')[0];
    goal('kp_copy');
    function fb(){var i=document.createElement('textarea');i.value=u;i.style.position='fixed';i.style.opacity='0';document.body.appendChild(i);i.select();try{document.execCommand('copy');say('Ссылка скопирована')}catch(e){prompt('Ссылка на предложение',u)}i.remove()}
    if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){say('Ссылка скопирована')},fb);else fb();
  });

  // курсор как на главной: точка + кольцо, над кнопками кольцо растёт и показывает подсказку в центре (data-c / data-label)
  if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    var c=document.getElementById('cur'),r=document.getElementById('ring'),lab=r&&r.querySelector('.t');
    if(c&&r){
      document.body.classList.add('has-cursor');
      var mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,state='',seen=false;
      addEventListener('pointermove',function(e){mx=e.clientX;my=e.clientY;c.style.transform='translate('+mx+'px,'+my+'px)';if(!seen){seen=true;rx=mx;ry=my;document.body.classList.add('cur-on')}},{passive:true});
      document.documentElement.addEventListener('pointerleave',function(){document.body.classList.remove('cur-on');seen=false});
      // подсказка (data-c="hint") — как «Следующий проект» на сайте: кольцо становится контурным кругом, текст из data-label в центре
      // над круглой кнопкой шапки кольцо встаёт по центру кнопки (на её заливку), в остальных случаях — за курсором
      var hel=null,stk=null;
      // «Start a project» в подвале: копия надписи с перевёрнутыми контур/заливка, видна только внутри круга курсора на плюсе
      [].forEach.call(document.querySelectorAll('.start .d'),function(sd){var inv=document.createElement('span');inv.className='d-inv';inv.setAttribute('aria-hidden','true');inv.innerHTML=sd.innerHTML;
        [].forEach.call(inv.querySelectorAll('.line>span'),function(x){x.classList.toggle('o')});sd.appendChild(inv);sd.classList.add('inv')});
      var sd=null,invOn=false;
      var footSz=function(){return Math.round(Math.max.apply(null,[].map.call(document.querySelectorAll('.foot-bar .links a'),function(a){return a.getBoundingClientRect().width}).concat([0]))+12)};
      (function loop(){var gx=mx,gy=my;if(hel&&hel.isConnected){var b=hel.getBoundingClientRect();gx=b.left+b.width/2;gy=b.top+b.height/2}
        // над плюсом кольцо прилипает к его центру и тянется за курсором наполовину, как на сайте
        else if(stk){var to=stk.getAttribute('data-stick-to'),p=(to&&stk.querySelector(to)||stk).getBoundingClientRect(),cx=p.left+p.width/2,cy=p.top+p.height/2,k=state==='plus'?.5:.15;gx=cx+(mx-cx)*k;gy=cy+(my-cy)*k;
          // контакты и соцсети: белый круг по центру ссылки (в подвале у всех один размер — по самой длинной соцссылке), текст под ним инвертируется
          if(state==='plus')r.style.width=r.style.height='';else{var ss=stk.getAttribute('data-stick-size'),fs=ss==='foot'&&footSz(),sz=fs>40?fs:Math.min(180,Math.max(p.width,p.height)+12);r.style.width=r.style.height=sz+'px'}}
        rx+=(gx-rx)*.22;ry+=(gy-ry)*.22;r.style.transform='translate('+rx+'px,'+ry+'px)';
        if(state==='plus'&&stk){var s2=stk.closest('.start').querySelector('.d');if(s2!==sd){if(sd)sd.style.setProperty('--r','0px');sd=s2}}
        if(sd&&(state==='plus'||invOn)){invOn=state==='plus';
          // маска считается для каждого блока отдельно: у второй строки своя система отсчёта
          [sd].concat([].slice.call(sd.querySelectorAll(':scope>.line'))).forEach(function(el){var b=el.getBoundingClientRect();el.style.setProperty('--cx',(rx-b.left)+'px');el.style.setProperty('--cy',(ry-b.top)+'px')});
          sd.style.setProperty('--r',invOn?(r.offsetWidth/2)+'px':'0px')}
        requestAnimationFrame(loop)})();
      document.addEventListener('pointerover',function(e){
        var t=e.target.closest('[data-c]'),s=t?t.getAttribute('data-c'):'';
        if(s!==state){if(state)document.body.classList.remove('c-'+state);state=s;if(s)document.body.classList.add('c-'+s)}
        lab.textContent=(s==='row'||s==='hint')&&t.getAttribute('data-label')||'';
        hel=s==='hint'&&t.matches('.kp-rb')?t:null;
        var st=e.target.closest('[data-stick]');if(st!==stk){stk=st;document.body.classList.toggle('c-stick',!!st);if(!st)r.style.width=r.style.height=''}
      });
      // магнит, как на сайте: элементы с data-magnet (сила — значение атрибута) плавно тянутся за курсором
      var mags=[].map.call(document.querySelectorAll('[data-magnet]'),function(el){return{el:el,k:parseFloat(el.getAttribute('data-magnet'))||.2,tx:0,ty:0,x:0,y:0,on:false}});
      mags.forEach(function(m){
        m.el.addEventListener('pointermove',function(e){var b=m.el.getBoundingClientRect();m.on=true;m.tx=(e.clientX-b.left-b.width/2)*m.k;m.ty=(e.clientY-b.top-b.height/2)*m.k});
        m.el.addEventListener('pointerleave',function(){m.on=false;m.tx=m.ty=0});
      });
      (function magLoop(){mags.forEach(function(m){m.x+=(m.tx-m.x)*.12;m.y+=(m.ty-m.y)*.12;
        if(Math.abs(m.x)+Math.abs(m.y)<.05&&!m.on){if(m.el.style.translate)m.el.style.translate='';return}
        m.el.style.translate=m.x.toFixed(2)+'px '+m.y.toFixed(2)+'px'});requestAnimationFrame(magLoop)})();
    }
  }

  // превью кейса при наведении на строку — как на главной: стоит у правого края строки, по её центру; если у кейса видео-обложка — играет она
  var peek=document.getElementById('peek'),pel=null;
  function peekAt(el){pel=el;var b=el.getBoundingClientRect(),w=peek.offsetWidth,x=Math.min(innerWidth-24,b.right)-w/2,y=b.top+b.height/2;
    if(!peek.classList.contains('on'))peek.style.transition='none';peek.style.transform='translate('+x+'px,'+y+'px)';peek.offsetWidth;peek.style.transition=''}
  // видео-обложки кейсов: как на главной — один элемент на кейс, HEVC там, где поддерживается, грузятся заранее после загрузки страницы; пока видео не пошло, видна картинка
  var HEVC=false;try{HEVC=document.createElement('video').canPlayType('video/mp4; codecs="hvc1"')!==''}catch(e){}
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,VS=[];
  function pv(r){if(r._v!==undefined)return r._v;var u=r.getAttribute('data-vid');if(!u||reduce)return r._v=null;
    var v=document.createElement('video');v.className='cv';v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.preload='none';
    v.src=HEVC?u.replace(/\.mp4$/,'.hevc.mp4'):u;v.addEventListener('playing',function(){v.classList.add('on')});VS.push(v);return r._v=v}
  if(peek&&matchMedia('(hover:hover)').matches){
    var rows=document.querySelectorAll('.row');
    addEventListener('load',function(){[].forEach.call(rows,function(r){var v=pv(r);if(v){v.preload='auto';v.load()}})});
    [].forEach.call(rows,function(r){
      r.addEventListener('mouseenter',function(){var im=r.getAttribute('data-img'),v=pv(r);
        peek.style.backgroundImage=im?'url("'+im+'")':'';peek.replaceChildren?peek.replaceChildren.apply(peek,v?[v]:[]):(peek.innerHTML='',v&&peek.appendChild(v));
        if(v){v.preload='auto';v.play().catch(function(){})}peekAt(r);peek.classList.add('on')});
      r.addEventListener('mouseleave',function(){peek.classList.remove('on');var v=peek.querySelector('video');if(v)v.pause()});
    });
  }
  addEventListener('scroll',function(){if(pel&&peek.classList.contains('on'))peekAt(pel)},{passive:true});

  // Follow us в подвале: раскрывается при наведении, на тач — по тапу
  [].forEach.call(document.querySelectorAll('.follow'),function(f){var b=f.querySelector('.follow-btn');
    b.addEventListener('click',function(e){e.stopPropagation();var o=!f.classList.contains('open');f.classList.toggle('open',o);b.setAttribute('aria-expanded',o)});
    document.addEventListener('click',function(e){if(e.target.closest('.follow')!==f){f.classList.remove('open');b.setAttribute('aria-expanded','false')}})});

  var ft=document.querySelector('.foot');
  if(!('IntersectionObserver' in window)){if(ft)ft.classList.add('in');return}
  // подвал: плюс и «Start a project» выезжают, когда подвал показался, как на сайте
  if(ft)new IntersectionObserver(function(es,o){es.forEach(function(x){if(x.isIntersecting){ft.classList.add('in');o.disconnect()}})},{threshold:.25}).observe(ft);
  // клиент долистал до итоговой стоимости
  var tot=document.getElementById('kpTotal');
  if(tot)new IntersectionObserver(function(es,o){es.forEach(function(x){if(x.isIntersecting){goal('kp_total_seen',1);o.disconnect()}})},{threshold:.5}).observe(tot);
  // график: полосы вырастают, когда блок появляется на экране
  var g=document.querySelector('.kp-gantt');
  if(g&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    g.classList.add('pre');
    new IntersectionObserver(function(es,o){es.forEach(function(x){if(x.isIntersecting){g.classList.remove('pre');o.disconnect()}})},{threshold:.3}).observe(g);
  }
  // кнопка «Связаться» прячется у финального блока с контактами
  // «Связаться» инвертируется, когда под ней чёрный блок
  var ctaEl=document.querySelector('.kp-cta'),ctaT=0;
  function ctaInv(){ctaT=0;if(!ctaEl)return;var b=ctaEl.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;
    var dark=document.elementsFromPoint(x,y).some(function(e){return e!==ctaEl&&!ctaEl.contains(e)&&e.closest&&e.closest('.grey,.foot,.kp-hero-cover')});
    ctaEl.classList.toggle('inv',dark)}
  if(ctaEl){addEventListener('scroll',function(){if(!ctaT)ctaT=requestAnimationFrame(ctaInv)},{passive:true});addEventListener('resize',ctaInv);ctaInv()}
  // кнопка «Связаться» прячется у подвала и на обложке шапки (там она тёмная на тёмном)
  var cta=document.querySelector('.kp-cta'),hid={};
  function dim(k,v){hid[k]=v;if(cta)cta.classList.toggle('dim',!!(hid.end||hid.hero))}
  [['end',document.querySelector('.kp-end')],['hero',document.querySelector('.kp-hero-cover')]].forEach(function(p){
    if(cta&&p[1])new IntersectionObserver(function(es){es.forEach(function(x){dim(p[0],x.isIntersecting)})},{threshold:p[0]==='hero'?.35:0}).observe(p[1])});
})();

/* обложка шапки: если видео не загрузилось или не играет — убираем его, остаётся фото (или первый кадр видео) */
(function(){
  var v=document.querySelector('.kp-cv video');if(!v)return;
  function off(){if(v.parentNode)v.parentNode.removeChild(v)}
  v.addEventListener('error',off);if(v.error)off();
  var p=v.play&&v.play();if(p&&p.catch)p.catch(function(){if(v.readyState<2)off()});
})();
