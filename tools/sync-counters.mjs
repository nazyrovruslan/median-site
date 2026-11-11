// Счётчики и пиксели — на всех страницах сайта одинаково (Руслан 11.11: «пусть всегда стоят все метрики и пиксели в хеде»).
// Источник — content/settings/counters.json (админка → Настройки → «Счётчики и пиксели сайта»): номер Метрики, ID потока GA, пиксель VK, свой код.
// Отсюда собирается блок «<!-- счётчики … -->…<!-- /счётчики -->» в <head> index.html, privacy.html, consent.html, 404.html
// (страницы кейсов, «О нас», вакансий — копии index.html; КП берут блок через siteCounters() в tools/build-kp.mjs).
// Запуск: node tools/sync-counters.mjs (в деплое — первым делом, до сборки КП и SEO-страниц)
import fs from 'fs';
import { fileURLToPath } from 'url';

// новый формат кончается «<!-- /счётчики -->», старый (до 11.11) — «</noscript>»
const NEW = /<!-- счётчики[\s\S]*?<!-- \/счётчики -->/, OLD = /<!-- счётчики[\s\S]*?<\/noscript>/;
const find = s => NEW.test(s) ? NEW : OLD.test(s) ? OLD : null;
export function settings() {
  try { return JSON.parse(fs.readFileSync('content/settings/counters.json', 'utf8')); } catch { return {}; }
}
export function buildBlock(c = settings()) {
  const ym = String(c.metrika || '').trim(), ga = String(c.ga || '').trim(), vk = String(c.vk || '').trim(), head = String(c.head || '').trim();
  const out = ['<!-- счётчики и пиксели: content/settings/counters.json (админка → Настройки → «Счётчики и пиксели сайта»), собирает tools/sync-counters.mjs — здесь не править -->'];
  const init = [];
  if (/^\d+$/.test(ym)) init.push(`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");\nym(${ym},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,trackHash:true});`);
  if (/^G-[A-Z0-9]+$/.test(ga)) init.push(`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`);
  if (init.length) out.push(`<script>${init.join('\n')}</script>`);
  if (/^G-[A-Z0-9]+$/.test(ga)) out.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>`);
  if (/^\d+$/.test(vk)) out.push(`<script>var _tmr=window._tmr||(window._tmr=[]);_tmr.push({id:"${vk}",type:"pageView",start:(new Date()).getTime()});(function(d,w,id){if(d.getElementById(id))return;var ts=d.createElement("script");ts.type="text/javascript";ts.async=true;ts.id=id;ts.src="https://top-fwz1.mail.ru/js/code.js";var f=function(){var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(ts,s);};if(w.opera=="[object Opera]"){d.addEventListener("DOMContentLoaded",f,false);}else{f();}})(document,window,"tmr-code");</script>`);
  if (head) out.push(head);
  if (/^\d+$/.test(ym)) out.push(`<noscript><div><img src="https://mc.yandex.ru/watch/${ym}" style="position:absolute;left:-9999px" alt=""></div></noscript>`);
  out.push('<!-- /счётчики -->');
  return out.join('\n');
}
// блок, который сейчас стоит в index.html (после sync — собранный из настроек)
export function siteCounters() {
  const s = fs.readFileSync('index.html', 'utf8'), re = find(s), m = re && s.match(re);
  if (!m) throw new Error('sync-counters: в index.html нет блока счётчиков');
  return m[0];
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const block = buildBlock();
  for (const f of ['index.html', 'privacy.html', 'consent.html', '404.html']) {
    const s = fs.readFileSync(f, 'utf8');
    const re = find(s), next = re ? s.replace(re, () => block) : s.replace('</head>', block + '\n</head>');
    if (next !== s) { fs.writeFileSync(f, next); console.log(f + ': счётчики обновлены'); }
  }
}
