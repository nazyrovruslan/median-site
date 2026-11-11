// Счётчики и пиксели — на всех страницах сайта одинаково (Руслан 11.11: «пусть всегда стоят все метрики и пиксели в хеде»).
// Источник — блок «<!-- счётчики … </noscript>» в <head> index.html; отсюда он копируется в privacy.html, consent.html, 404.html
// (страницы кейсов, «О нас», вакансий — копии index.html, у них он и так есть; КП берут его в tools/build-kp.mjs через siteCounters()).
// Запуск: node tools/sync-counters.mjs (в деплое — первым делом, до сборки КП и SEO-страниц)
import fs from 'fs';
import { fileURLToPath } from 'url';
export function siteCounters() {
  const m = fs.readFileSync('index.html', 'utf8').match(/<!-- счётчики[\s\S]*?<\/noscript>/);
  if (!m) throw new Error('sync-counters: в index.html нет блока «<!-- счётчики … </noscript>»');
  return m[0];
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const block = siteCounters();
  for (const f of ['privacy.html', 'consent.html', '404.html']) {
    let s = fs.readFileSync(f, 'utf8');
    const next = /<!-- счётчики[\s\S]*?<\/noscript>/.test(s) ? s.replace(/<!-- счётчики[\s\S]*?<\/noscript>/, () => block) : s.replace('</head>', block + '\n</head>');
    if (next !== s) { fs.writeFileSync(f, next); console.log(f + ': счётчики обновлены'); }
  }
}
