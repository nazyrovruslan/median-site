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

  // курсор как на главной: точка + кольцо, над кнопками кольцо растёт и показывает подсказку (data-c / data-label)
  if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    var c=document.getElementById('cur'),r=document.getElementById('ring'),lab=r&&r.querySelector('.t');
    if(c&&r){
      document.body.classList.add('has-cursor');
      var mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,state='',seen=false;
      addEventListener('pointermove',function(e){mx=e.clientX;my=e.clientY;c.style.transform='translate('+mx+'px,'+my+'px)';if(!seen){seen=true;rx=mx;ry=my;document.body.classList.add('cur-on')}},{passive:true});
      document.documentElement.addEventListener('pointerleave',function(){document.body.classList.remove('cur-on');seen=false});
      // подсказка у маленьких кнопок не закрывает саму кнопку: круг уходит под курсор (у нижнего края экрана — над ним)
      var oy=0;
      (function loop(){var to=state==='hint'?(my<innerHeight*.6?78:-78):0;oy+=(to-oy)*.22;rx+=(mx-rx)*.22;ry+=(my-ry)*.22;r.style.transform='translate('+rx+'px,'+(ry+oy)+'px)';requestAnimationFrame(loop)})();
      document.addEventListener('pointerover',function(e){
        var t=e.target.closest('[data-c]'),s=t?t.getAttribute('data-c'):'';
        if(s!==state){if(state)document.body.classList.remove('c-'+state);state=s;if(s)document.body.classList.add('c-'+s)}
        lab.textContent=t&&t.getAttribute('data-label')||'';
      });
      // магнит у круглых кнопок, как на сайте
      [].forEach.call(document.querySelectorAll('.kp-rb,.kp-logo,.kp-more'),function(el){
        var k=.3;
        el.addEventListener('pointermove',function(e){var b=el.getBoundingClientRect();el.style.translate=((e.clientX-b.left-b.width/2)*k).toFixed(1)+'px '+((e.clientY-b.top-b.height/2)*k).toFixed(1)+'px'});
        el.addEventListener('pointerleave',function(){el.style.translate=''});
      });
    }
  }

  if(!('IntersectionObserver' in window))return;
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
  var cta=document.querySelector('.kp-cta'),ct=document.querySelector('.kp-end');
  if(cta&&ct)new IntersectionObserver(function(es){es.forEach(function(x){cta.classList.toggle('dim',x.isIntersecting)})}).observe(ct);
})();
