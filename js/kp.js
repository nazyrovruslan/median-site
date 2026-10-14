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
  // кнопка «Связаться» прячется у блока контактов
  var cta=document.querySelector('.kp-cta'),ct=document.querySelector('.kp-contact');
  if(cta&&ct)new IntersectionObserver(function(es){es.forEach(function(x){cta.classList.toggle('dim',x.isIntersecting)})}).observe(ct);
})();
