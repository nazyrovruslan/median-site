// Собирает скрытый раздел с коммерческими предложениями: content/kp/<адрес>.json → clients/<адрес>/index.html + смета.xlsx.
// Общие настройки (счётчики, контакты, «Формат работы» по умолчанию) — content/settings/kp.json. Всё правится в /admin.
// Раздел нигде не упоминается на сайте, страницы закрыты от поисковиков (noindex); ссылку получает только клиент.
// Запуск: node tools/build-kp.mjs   (в деплое — автоматически, см. .github/workflows)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { xlsx, zip } from './xlsx.mjs';

const SRC = 'content/kp', OUT = 'clients', SITE = 'https://nazyrovruslan.github.io/median-site/';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const S = fs.existsSync('content/settings/kp.json') ? read('content/settings/kp.json') : {};
const CASES = Object.fromEntries(fs.readdirSync('content/cases').filter(f => f.endsWith('.json')).map(f => { const c = read(`content/cases/${f}`); return [c.id || f.slice(0, -5), c]; }));
// категории предложений — те же, что в /admin (кейс → «Категории для КП», КП → «Категория предложения»)
const CATS = { stands: 'Стенды и зоны', conf: 'Конференции и форумы', camp: 'Выездные мероприятия и кэмпы', fest: 'Фестивали и road show', hack: 'Хакатоны и IT-соревнования', corp: 'Корпоративы и церемонии', special: 'Спецпроекты и digital' };
const ORDERED = Object.values(CASES).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.id).localeCompare(String(b.id)));
// кейсы категории по умолчанию: первые N в порядке списка кейсов (N — «Сколько кейсов подставлять» в настройках КП)
const byCat = cat => ORDERED.filter(c => (c.kp || []).includes(cat)).slice(0, num(S.cases_default) || 4);
// обложка кейса для строк списка: превью из media/thumb, если оно уже есть
const caseCover = cs => { const cover = cs.img || (cs.vid ? cs.vid.replace(/\.mp4$/, '.webp') : ''); const th = cover && 'media/thumb/' + path.basename(cover).replace(/\.\w+$/, '.webp'); return th && fs.existsSync(th) ? th : cover; };

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = s => esc(String(s ?? '').trim()).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
const para = s => s && String(s).trim() ? `<p>${txt(s)}</p>` : '';
const num = v => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const money = n => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0|\u202f/g, ' ');
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
const days = n => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
// в вёрстке число с единицей не переносим: «1 250 000 ₽», «45 дней» — одним куском
const nw = s => `<span class="nw">${s}</span>`;
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const date = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const long = (d, year = true) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? ' ' + d.getUTCFullYear() : ''}`;
// сколько дней осталось до мероприятия; на странице js/kp.js пересчитывает это по дате у посетителя
const iso = d => d.toISOString().slice(0, 10);
const left = d => { const n = Math.round((d - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5); return n > 0 ? `осталось ${days(n)}` : n === 0 ? 'сегодня' : 'прошло'; };
const short = d => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
const tgUrl = s => !s ? '' : /^https?:/.test(s) ? s : 'https://t.me/' + String(s).replace(/^@|^t\.me\//, '');
const has = p => p && (p.name || p.tg || p.phone || p.email);
const fileUrl = s => !s ? '' : /^https?:/.test(s) ? s : '../../' + String(s).replace(/^\//, '');

const MARK = fs.readFileSync('media/mark.svg', 'utf8').replace(' xmlns="http://www.w3.org/2000/svg"', '').trim(); // знак median, красится через currentColor

// счётчики: Метрика и VK по номеру + произвольный код из настроек и из самого КП
function counters(k) {
  const out = [];
  const ym = String(S.metrika || '').trim();
  if (/^\d+$/.test(ym)) out.push(`<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${ym},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,params:{kp:${JSON.stringify(k.slug)},client:${JSON.stringify(k.client || '')}}});</script><noscript><div><img src="https://mc.yandex.ru/watch/${ym}" style="position:absolute;left:-9999px" alt=""></div></noscript>`);
  const vk = String(S.vk || '').trim();
  if (vk) out.push(`<script>!function(){var t=document.createElement("script");t.type="text/javascript",t.async=!0,t.src="https://vk.com/js/api/openapi.js?169",t.onload=function(){VK.Retargeting.Init(${JSON.stringify(vk)}),VK.Retargeting.Hit()},document.head.appendChild(t)}();</script><noscript><img src="https://vk.com/rtrg?p=${esc(vk)}" style="position:fixed;left:-999px" alt=""></noscript>`);
  if (S.head) out.push(String(S.head));
  if (k.code) out.push(String(k.code));
  return out.join('\n');
}

function estimate(k, file) {
  const rows = [], merges = [];
  const head = (v, s = 'b') => rows.push([{ v, s }]);
  rows.push([{ v: 'Median Agency', s: 'h' }]);
  head(k.titleText);
  rows.push([{ v: `${k.client ? k.client + ' · ' : ''}${long(k.dateD)}${k.eventD ? ` · мероприятие ${short(k.eventD)}` : ''} · актуально до ${short(k.validD)}`, s: 'muted' }]);
  rows.push([]);
  rows.push(['№', 'Наименование', 'Кол-во', 'Ед.', 'Цена, ₽', 'Сумма, ₽'].map(v => ({ v, s: 'b' })));
  const totals = [];
  k.stages.forEach((st, i) => {
    rows.push([{ v: `${i + 1}`, s: 'b' }, { v: `${st.title}${st.days ? ` · ${days(st.days)}` : ''}`, s: 'bwrap' }]);
    const first = rows.length + 1;
    if (st.items.length) {
      st.items.forEach((it, j) => {
        const r = rows.length + 1;
        rows.push([`${i + 1}.${j + 1}`, { v: it.name, s: 'wrap' }, it.qty, it.unit || '', { v: it.price, s: 'money' }, { f: `C${r}*E${r}`, v: it.qty * it.price, s: 'money' }]);
      });
      const r = rows.length + 1;
      rows.push(['', { v: `Итого по этапу ${i + 1}`, s: 'b' }, '', '', '', { f: `SUM(F${first}:F${r - 1})`, v: st.amount, s: 'bmoney' }]);
      totals.push(`F${r}`);
    } else {
      const r = rows.length + 1;
      rows.push(['', { v: [st.description, st.result && 'Результат: ' + st.result].filter(Boolean).join('\n'), s: 'wrap' }, 1, 'этап', { v: st.amount, s: 'money' }, { f: `C${r}*E${r}`, v: st.amount, s: 'bmoney' }]);
      totals.push(`F${r}`);
    }
    rows.push([]);
  });
  rows.push(['', { v: 'ИТОГО', s: 'b' }, '', '', '', { f: totals.join('+') || '0', v: k.total, s: 'bmoney' }]);
  if (k.days) rows.push(['', { v: `Срок: ${days(k.days)}`, s: 'muted' }]);
  if (k.priceNote) rows.push(['', { v: k.priceNote, s: 'muted' }]);
  fs.writeFileSync(file, xlsx(rows, { title: k.titleText, widths: [6, 60, 9, 8, 14, 16], merges }));
}

// обложка для превью ссылки (Telegram, WhatsApp и т.п.): og.html → og.png 1200×630 рисует tools/og-kp.mjs через headless Chrome
const OG_REV = '3'; // поменять, чтобы Telegram и др. скачали обложки заново (часть адреса og.png?v=)
// если у КП есть обложка шапки (фото или кадр видео) — превью как шапка КП: фото во весь кадр, белый заголовок поверх
function ogHtml(k) {
  const cv = k.coverImg;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="../../css/fonts.css"><style>
*{box-sizing:border-box;margin:0}html,body{width:1200px;height:630px;overflow:hidden;background:#c9c9c6;color:#0b0b0c}
body{background-image:linear-gradient(90deg,rgba(255,255,255,.55) 1px,transparent 1px);background-size:211.2px 100%;background-position:72px 0;background-repeat:repeat-x}
body{position:relative;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;font-family:"Basis Grotesque Pro",Arial,sans-serif}
.top{display:flex;justify-content:space-between;align-items:center}.top svg{width:64px;height:auto;color:#0b0b0c}
.l{font-weight:500;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#55554f}
h1{font-family:"Druk Wide Cyr",Arial Black,sans-serif;font-weight:700;text-transform:uppercase;line-height:.95;letter-spacing:-.01em;font-size:var(--fs,64px)}
h1 span{display:block}h1 .o{color:transparent;-webkit-text-stroke:1.6px #0b0b0c}
.bot{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.c{font-family:"Druk Wide Cyr",Arial Black,sans-serif;font-weight:700;text-transform:uppercase;font-size:26px}
body.cv{background:#0b0b0c center/cover no-repeat;color:#f3f3f1}
body.cv::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.15) 50%,rgba(0,0,0,.7) 100%)}
body.cv{isolation:isolate}body.cv .top svg{color:#f3f3f1}body.cv .l{color:rgba(243,243,241,.8)}body.cv h1 .o{-webkit-text-stroke-color:#f3f3f1}
</style></head><body${cv ? ` class="cv" style="background-image:url('${esc(cv)}')"` : ''}>
<div class="top">${MARK}<span class="l">Коммерческое предложение</span></div>
<h1 id="t">${k.titleLines.map((l, i) => `<span${i === 0 ? ' class="o"' : ''}>${esc(l)}</span>`).join('')}</h1>
<div class="bot"><span class="c">${esc(k.client || 'Median Agency')}</span><span class="l">${long(k.dateD)}</span></div>
<script>/* заголовок ужимается, чтобы влезть в обложку */var t=document.getElementById('t'),f=72;var im=new Image();im.onload=im.onerror=go;im.src=${JSON.stringify(cv || 'data:,')};function go(){document.fonts.ready.then(function(){while(f>30&&(t.scrollWidth>1056||t.offsetHeight>330)){f-=2;t.style.setProperty('--fs',f+'px')}document.title='ready'})}</script>
</body></html>`;
}

function page(k) {
  const ARR = '<svg class="ar" viewBox="0 0 40 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6H38"/><path d="M32 1l6 5-6 5"/></svg>';
  const DL = '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0v14"/><path d="M1.5 9.5 6 14l4.5-4.5"/></svg>';
  // data-c — состояние курсора-кольца (как на главной): hint — круг с подписью, link — белый круг, row — круг с подписью над строкой
  const dl = (href, label, goal, cls, c = 'link') => href ? `<a class="${cls}" href="${esc(href)}" download data-goal="${goal}" target="_blank" rel="noopener" data-c="${c}"${c === 'mag' ? ' data-magnet' : cls === 'kp-rb' ? ' data-magnet=".3"' : ''}>${label}</a>` : '';
  const dd = (t, v) => v ? `<dt>${t}</dt><dd>${v}</dd>` : '';
  const pad2 = i => String(i + 1).padStart(2, '0');

  const stages = k.stages.map((st, i) => `
    <article class="kp-stage g5" id="stage-${i + 1}">
      <div class="kp-num d o" aria-hidden="true">${pad2(i)}</div>
      <div class="kp-sc">
        <span class="label">Этап ${i + 1}</span>
        <h3 class="d kp-st">${esc(st.title)}</h3>
        <dl class="kp-dl">${dd('Описание', txt(st.description))}${dd('Результат', txt(st.result))}</dl>
        ${st.items.length ? `<table class="kp-items"><thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена, ₽</th><th>Сумма, ₽</th></tr></thead><tbody>${st.items.map(it => `<tr><td>${esc(it.name)}</td><td>${esc(it.qty)}${it.unit ? ' ' + esc(it.unit) : ''}</td><td>${money(it.price)}</td><td>${money(it.qty * it.price)}</td></tr>`).join('')}</tbody></table>` : ''}
        <div class="kp-sum"><span class="label">${st.days ? days(st.days) : ''}</span><span class="d" data-fit>${money(st.amount)} ₽</span></div>
      </div>
    </article>`).join('');

  // график: этапы идут подряд от даты старта
  let gantt = '';
  if (k.days && k.startD) {
    let acc = 0;
    gantt = `
  <section class="kp-sec wrap">
    <div class="g5 kp-sh"><h2 class="d kp-h2" data-fit><span class="ln o">График</span><span class="ln">работ</span></h2><div class="kp-lead">${para(k.scheduleNote || `Ориентировочный график при старте ${long(k.startD)} года. Паузы на согласования и ожидание материалов учитываются отдельно.`)}</div></div>
    <div class="kp-gantt">${k.stages.map((st, i) => {
      if (!st.days) return '';
      const a = addDays(k.startD, acc), b = addDays(k.startD, acc + st.days - 1);
      const l = acc / k.days * 100, w = st.days / k.days * 100; acc += st.days;
      // строка графика ведёт к своему этапу в смете
      return `<a class="kp-g" href="#stage-${i + 1}" data-c="row" data-label="К этапу ${i + 1}"><div class="kp-gl"><span>${pad2(i)} · ${esc(st.title)}</span><span>${nw(days(st.days))} · ${nw(long(a, false))} — ${nw(long(b, false))}</span></div><div class="kp-gb"><i style="left:${l.toFixed(3)}%;width:${w.toFixed(3)}%"></i></div></a>`;
    }).join('')}
      <div class="kp-gl kp-ge"><span>Старт ${long(k.startD)}</span><span>Окончание ${long(addDays(k.startD, k.days - 1))}</span></div>
    </div>
  </section>`;
  }

  // «Релевантный опыт» — как список «Все проекты» на главной: номер, название, подпись; обложка кейса всплывает справа у строки
  const cases = k.cases.length ? `
  <section class="kp-sec kp-cases wrap">
    <h2 class="d kp-ch" data-fit><span class="o">Релевантный</span> опыт</h2>
    <div class="rows">${k.cases.map((c, i) => `
      <a class="row" href="../../${esc(c.id)}" target="_blank" rel="noopener" data-goal="kp_case" data-c="row" data-label="Смотреть кейс" data-img="${esc(c.img)}"${c.vid ? ` data-vid="${esc(c.vid)}"` : ''}>
        <span class="n">${pad2(i)}</span><span class="nm">${esc(c.name)}</span><span class="sb">${txt(c.text || c.sub)}</span>
        <span class="rp"${c.img ? ` style="background-image:url('${esc(c.img)}')"` : ''}></span>
      </a>`).join('')}
    </div>
  </section>` : '';

  const format = k.format.length ? `
  <section class="kp-sec wrap">
    <div class="g5 kp-sh"><h2 class="d kp-h2" data-fit><span class="ln o">Формат</span><span class="ln">работы</span></h2></div>
    <div class="g5"><dl class="kp-dl kp-dl-l">${k.format.map(f => dd(esc(f.title), txt(f.text))).join('')}</dl></div>
  </section>` : '';

  const m = k.main, contact = k.contactUrl;
  // подвал — общие контакты агентства, как на главной (персональные — в команде и в кнопке «Связаться»)
  const F = { email: 'info@median.agency', tg: 'medianprojects', ...Object.fromEntries(Object.entries(S.footer || {}).filter(([, v]) => v)) };
  F.tg = String(F.tg).replace(/^.*t\.me\//, '').replace(/^@/, '');
  const nick = p => '@' + String(p.tg).replace(/^@|^https?:\/\/t\.me\//, '');
  const links = p => [
    p.tg ? `<a href="${esc(tgUrl(p.tg))}" target="_blank" rel="noopener" data-goal="kp_contact" data-c="link" data-stick data-stick-size="text" data-magnet>${esc(nick(p))}</a>` : '',
    p.phone ? `<a href="tel:${esc(String(p.phone).replace(/[^\d+]/g, ''))}" data-goal="kp_contact" data-c="link" data-stick data-stick-size="text" data-magnet>${esc(p.phone)}</a>` : '',
    p.email ? `<a href="mailto:${esc(p.email)}" data-goal="kp_contact" data-c="link" data-stick data-stick-size="text" data-magnet>${esc(p.email)}</a>` : ''].filter(Boolean).join('');
  const person = (p, kind, cls = '') => `
      <div class="kp-person ${cls}">
        ${p.photo ? `<span class="kp-ph" style="background-image:url('${esc(fileUrl(p.photo))}')"></span>` : ''}
        <span class="label">${esc(kind)}</span>
        ${p.name ? `<span class="d kp-pn">${esc(p.name)}</span>` : ''}
        ${p.role ? `<span class="kp-pr">${esc(p.role)}</span>` : ''}
        <span class="kp-pl">${links(p)}</span>
      </div>`;
  const team = k.team.filter(([p]) => has(p));
  const teamSec = team.length ? `
  <section class="kp-sec wrap">
    <div class="g5 kp-sh"><h2 class="d kp-h2" data-fit><span class="ln o">Команда</span><span class="ln">проекта</span></h2></div>
    <div class="kp-team">${team.map(([p, kind]) => person(p, kind)).join('')}</div>
  </section>` : '';
  // клиент и его контакт — в шапке КП, под заголовком
  const cc = k.clientContact;
  const client = k.client || k.clientLogo || has(cc) ? `
    <div class="kp-hc">
      <span class="label">Клиент</span>
      ${k.clientLogo ? `<img class="kp-clogo" src="${esc(k.clientLogo)}" alt="${esc(k.client)}">` : `<span class="d kp-hcn">${esc(k.client)}</span>`}
      ${cc.name || cc.role ? `<span class="kp-hcp">${cc.name ? `<b>${esc(cc.name)}</b>` : ''}${cc.role ? `<span>${esc(cc.role)}</span>` : ''}</span>` : ''}
      ${has(cc) && (cc.tg || cc.phone || cc.email) ? `<span class="kp-pl">${links(cc)}</span>` : ''}
    </div>` : '';
  const data = { slug: k.slug, client: k.client || '', total: k.total, link: k.track_url || '', metrika: /^\d+$/.test(String(S.metrika || '')) ? +S.metrika : 0 };

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#c9c9c6">
<title>${esc(k.titleText)} | Median Agency</title>
<meta property="og:title" content="${esc(k.titleText)}">
<meta property="og:site_name" content="Median Agency">
<meta property="og:description" content="${esc(['Median Agency', k.client, long(k.dateD)].filter(Boolean).join(' · '))}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:url" content="${SITE}clients/${k.slug}/">
<meta property="og:image" content="${SITE}clients/${k.slug}/og.png?v=${k.ogv}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}clients/${k.slug}/og.png?v=${k.ogv}">
<link rel="icon" href="../../media/favicon.svg" type="image/svg+xml">
<link rel="icon" href="../../media/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="../../media/apple-touch-icon.png">
<link rel="preload" href="../../fonts/druk-wide-cyr-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../../css/fonts.css">
<link rel="stylesheet" href="../../css/kp.css?v=${k.v}">
${counters(k)}
</head>
<body>
<header class="kp-bar">
  <a class="kp-logo" href="../../" target="_blank" rel="noopener" aria-label="median.agency" data-c="mag" data-magnet=".3">${MARK}</a>
  <nav class="kp-acts">
    <button class="kp-rb" data-magnet=".3" type="button" id="kpCopy" aria-label="Скопировать ссылку" data-c="hint" data-label="Скопировать ссылку"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg></button>
    ${dl(k.pdf, 'PDF', 'kp_pdf', 'kp-rb', 'hint" data-label="Скачать презентацию')}
    ${dl(k.xlsx, 'XLS', 'kp_xlsx', 'kp-rb', 'hint" data-label="Скачать смету')}
    ${dl(k.zip, 'ZIP', 'kp_zip', 'kp-rb', 'hint" data-label="Скачать всё архивом')}
  </nav>
</header>

<main>
  <section class="kp-hero wrap${k.coverImg || k.coverVid ? ' kp-hero-cover' : ''}" id="kpHero">${k.coverImg || k.coverVid ? `
    <div class="kp-cv"${k.coverImg ? ` style="background-image:url('${esc(k.coverImg)}')"` : ''}>${k.coverVid ? `<video src="${esc(k.coverVid)}"${k.coverImg ? ` poster="${esc(k.coverImg)}"` : ''} muted loop playsinline autoplay preload="auto"></video>` : ''}</div>` : ''}
    <span class="label">Коммерческое предложение · ${long(k.dateD)}</span>
    <h1 class="d kp-title" data-fit>${k.titleLines.map((l, i) => `<span class="ln${i === 0 ? ' o' : ''}">${esc(l)}</span>`).join('')}</h1>${client}${k.coverImg || k.coverVid ? `
    <a class="kp-down" href="#kpFacts" data-c="mag" data-magnet aria-label="Листать вниз"><svg viewBox="0 0 24 60" aria-hidden="true"><path d="M12 2v54M4 48l8 8 8-8"/></svg></a>` : ''}
  </section>

  <section class="kp-facts wrap g5" id="kpFacts">
    <div class="kp-fl">
      ${has(k.pm) ? person(k.pm, 'Менеджер проекта', 'kp-main') : ''}
      <div class="kp-files">
      ${dl(k.pdf, `<span>Презентация</span>${DL}`, 'kp_pdf', 'kp-file', 'mag')}
      ${dl(k.xlsx, `<span>Смета в Excel</span>${DL}`, 'kp_xlsx', 'kp-file', 'mag')}
      ${dl(k.zip, `<span>Скачать всё архивом</span>${DL}`, 'kp_zip', 'kp-file kp-file-all', 'mag')}
      </div>
    </div>
    <dl class="kp-dl kp-dl-l">
      ${k.eventD ? `${dd('Мероприятие', short(k.eventD))}
      ${dd('Срок', `<span data-until="${iso(k.eventD)}">${left(k.eventD)}</span>`)}` : `${dd('Актуально до', short(k.validD))}
      ${dd('Срок', k.days ? nw(days(k.days)) : '')}`}
      ${dd('Этапы', k.stages.length ? `${k.stages.length} ${plural(k.stages.length, 'этап', 'этапа', 'этапов')}` : '')}
      ${dd('Стоимость', nw(`${money(k.total)} ₽`))}
      ${k.scope.length ? dd('Что входит', `<ul class="kp-scope">${k.scope.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`) : ''}
    </dl>
  </section>

  ${k.task || k.sequence ? `
  <section class="kp-sec wrap">
    <div class="g5 kp-sh"><h2 class="d kp-h2" data-fit>Задача</h2><div class="kp-lead">${para(k.task)}</div></div>
    ${k.sequence ? `<div class="g5"><dl class="kp-dl">${dd('Последовательность', txt(k.sequence))}</dl></div>` : ''}
  </section>` : ''}

  ${k.stages.length ? `
  <section class="kp-sec wrap">
    <div class="g5 kp-sh"><h2 class="d kp-h2" data-fit><span class="ln o">Этапы</span><span class="ln">и смета</span></h2></div>
    ${stages}
  </section>` : ''}

  <section class="kp-total grey wrap" id="kpTotal">
    <div class="g5">
      <span class="label kp-tl">Итоговый срок<br>и стоимость проекта</span>
      <div class="d kp-tv" data-fit>${k.days ? `<span class="ln o">${days(k.days)}</span>` : ''}<span class="ln">${money(k.total)} ₽</span></div>
      <p class="label kp-note">${[k.priceNote, `Расчёт актуален до ${long(k.validD)} года`].filter(Boolean).map(esc).join('<br>')}</p>
    </div>
  </section>
  ${gantt}${cases}${format}${teamSec}

  <!-- подвал — как на основном сайте (index.html footer.foot): «Start a project» с плюсом и строка контактов; ведёт к основному контакту КП -->
  <footer class="foot wrap kp-end">
    <a class="start" href="${esc(tgUrl(F.tg))}" target="_blank" rel="noopener" data-goal="kp_contact" data-c="link">
      <span class="plus" aria-hidden="true" data-c="plus" data-stick data-magnet=".55"><svg viewBox="0 0 58 92" preserveAspectRatio="none"><line x1="29" y1="18" x2="29" y2="74"/><line x1="1" y1="46" x2="57" y2="46"/></svg></span>
      <span class="d"><span class="line"><span class="o">Start a</span></span><span class="line"><span>project</span></span></span>
    </a>
    <div class="foot-bar">
      <a class="mail" data-stick data-stick-to="svg" data-stick-size="text" data-magnet href="mailto:${esc(F.email)}" data-goal="kp_contact" data-c="link"><svg viewBox="0 0 40 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6H38"/><path d="M32 1l6 5-6 5"/></svg><span>${esc(F.email)}</span></a>
      <a class="tel" data-stick data-stick-size="text" data-magnet href="${esc(tgUrl(F.tg))}" target="_blank" rel="noopener" data-goal="kp_contact" data-c="link">@${esc(F.tg)}</a>
      <div class="follow"><button class="follow-btn" data-stick data-stick-to=".ic" data-stick-size="text" data-magnet type="button" aria-expanded="false" aria-controls="kpFollow" data-c="link"><svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><circle cx="9.5" cy="2.5" r="1.6"/><circle cx="2.5" cy="6" r="1.6"/><circle cx="9.5" cy="9.5" r="1.6"/><path d="M4 5.2l4-2M4 6.8l4 2"/></svg><span>Follow us</span></button><div class="links" id="kpFollow"><a href="https://t.me/medianagency" target="_blank" rel="noopener" data-c="link" data-stick data-stick-size="text" data-magnet>Telegram</a><a href="https://www.instagram.com/median.agency/" target="_blank" rel="noopener" data-c="link" data-stick data-stick-size="text" data-magnet>Instagram</a><a href="https://youtube.com/@median.agency" target="_blank" rel="noopener" data-c="link" data-stick data-stick-size="text" data-magnet>YouTube</a><a href="https://www.facebook.com/median.agency/" target="_blank" rel="noopener" data-c="link" data-stick data-stick-size="text" data-magnet>Facebook</a></div></div>
      <a class="pol" data-stick data-stick-size="text" data-magnet href="../../privacy.html" data-c="link">Политика конфиденциальности</a><span class="copy"><span class="cp-l">Copyright</span><span class="cp-t"><span class="cp-a">${k.dateD.getUTCFullYear()} © median agency.</span> <span class="cp-b">Design by <a href="../../" data-c="link">median</a>.</span></span></span>
    </div>
  </footer>
</main>

${contact ? `<a class="kp-cta" href="${esc(contact)}" target="_blank" rel="noopener" data-goal="kp_contact" data-magnet=".25" data-c="hint" data-label="${m.tg ? 'Написать в Telegram' : 'Написать письмо'}">Связаться</a>` : ''}
<div id="peek" aria-hidden="true"></div><div id="cur" aria-hidden="true"></div><div id="ring" aria-hidden="true"><span class="t"></span></div>
<div class="kp-toast" id="kpToast" role="status" aria-live="polite"></div>
<script type="application/json" id="kpData">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="../../js/kp.js?v=${k.v}"></script>
${S.body || ''}
</body>
</html>
`;
}

// страница закрытого каталога: фильтр по категориям, строки как «Релевантный опыт» в КП
function catalogPage(list) {
  const counts = Object.fromEntries(Object.keys(CATS).map(id => [id, list.filter(c => c.categories.includes(id)).length]));
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="theme-color" content="#c9c9c6">
<title>Каталог кейсов | Median Agency</title>
<link rel="icon" href="../../media/favicon.svg" type="image/svg+xml">
<link rel="preload" href="../../fonts/druk-wide-cyr-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../../css/fonts.css">
<link rel="stylesheet" href="../../css/kp.css?v=${ver}">
</head>
<body>
<header class="kp-bar">
  <a class="kp-logo" href="../../" target="_blank" rel="noopener" aria-label="median.agency" data-c="mag" data-magnet=".3">${MARK}</a>
</header>
<main>
  <section class="kp-hero kp-cat-hero wrap">
    <span class="label">Закрытый каталог · ${list.length} ${plural(list.length, 'кейс', 'кейса', 'кейсов')} · ${list.filter(c => !c.on_site).length} скрыто с сайта</span>
    <h1 class="d kp-title" data-fit><span class="ln o">Все</span><span class="ln">кейсы</span></h1>
    <div class="kp-chips" role="group" aria-label="Категории">
      <button class="kp-chip on" type="button" data-cat="" data-c="mag" data-magnet=".3">Все <i>${list.length}</i></button>${Object.entries(CATS).map(([id, name]) => `
      <button class="kp-chip" type="button" data-cat="${id}" data-c="mag" data-magnet=".3">${esc(name)} <i>${counts[id]}</i></button>`).join('')}
    </div>
  </section>
  <section class="kp-sec kp-cases wrap">
    <div class="rows">${list.map((c, i) => `
      <a class="row" href="../../${esc(c.id)}" target="_blank" rel="noopener" data-c="row" data-label="Смотреть кейс" data-cats="${c.categories.join(' ')}"${c.cover ? ` data-img="${esc(c.cover.replace(SITE, '../../'))}"` : ''}>
        <span class="n">${String(i + 1).padStart(2, '0')}</span><span class="nm">${esc(c.name)}</span><span class="sb">${esc([c.client, c.year].filter(Boolean).join(' · ') || c.sub)}<span class="kp-tags">${c.categories.map(id => `<em>${esc(CATS[id] || id)}</em>`).join('')}${c.on_site ? '' : '<em class="off">Скрыт с сайта</em>'}</span></span>
        <span class="rp"${c.cover ? ` style="background-image:url('${esc(c.cover.replace(SITE, '../../'))}')"` : ''}></span>
      </a>`).join('')}
    </div>
  </section>
</main>
<div id="peek" aria-hidden="true"></div><div id="cur" aria-hidden="true"></div><div id="ring" aria-hidden="true"><span class="t"></span></div>
<script src="../../js/kp.js?v=${ver}"></script>
<script>
// фильтр по категории; номера строк пересчитываются под видимые
(function(){var b=document.querySelectorAll('.kp-chip'),r=document.querySelectorAll('.row');
[].forEach.call(b,function(x){x.addEventListener('click',function(){var c=x.getAttribute('data-cat'),n=0;
[].forEach.call(b,function(y){y.classList.toggle('on',y===x)});
[].forEach.call(r,function(w){var on=!c||(' '+w.getAttribute('data-cats')+' ').indexOf(' '+c+' ')>=0;w.hidden=!on;if(on)w.querySelector('.n').textContent=String(++n).padStart(2,'0')})})})})();
</script>
</body>
</html>
`;
}

// ---- сборка ----
// версия css/js в ссылках = хэш их содержимого (сбрасывает кэш только когда они меняются)
const ver = crypto.createHash('md5').update(fs.readFileSync('css/kp.css')).update(fs.readFileSync('js/kp.js')).digest('hex').slice(0, 7);
// Битрикс24: менеджер проекта = ответственный по сделке (crm.deal.get → user.get).
// Вебхук — секрет BITRIX_WEBHOOK в настройках репозитория на GitHub (в репозиторий и CMS не пишется); без него или без номера сделки — контакт из CMS/настроек.
const HOOK = (process.env.BITRIX_WEBHOOK || '').trim().replace(/\/?$/, '/');
const bx = async (method, params) => {
  const r = await fetch(`${HOOK}${method}.json?${new URLSearchParams(params)}`), j = await r.json();
  if (j.error) throw new Error(j.error_description || j.error);
  return j.result;
};
const dealId = v => (String(v || '').match(/deal\/details\/(\d+)/) || String(v || '').match(/^\s*(\d+)\s*$/) || [])[1];
async function bitrixPm(deal, f) {
  const id = dealId(deal);
  if (!process.env.BITRIX_WEBHOOK || !id) return null;
  try {
    const d = await bx('crm.deal.get', { id });
    const [u] = await bx('user.get', { ID: d.ASSIGNED_BY_ID });
    if (!u) return null;
    const tg = String(u.UF_USR_TELEGRAM || u.UF_TELEGRAM || '').replace(/^.*t\.me\//, '').replace(/^@/, '');
    return { name: [u.NAME, u.LAST_NAME].filter(Boolean).join(' '), role: u.WORK_POSITION || '', email: u.EMAIL || '', phone: u.PERSONAL_MOBILE || u.WORK_PHONE || '', tg };
  } catch (e) { console.warn(`${f}: Битрикс24, сделка ${id} — ${e.message}`); return null; }
}

const list = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => f.endsWith('.json')) : [];
const built = new Set();
for (const f of list) {
  const raw = read(`${SRC}/${f}`);
  const slug = f.replace(/\.json$/, '');
  if (!/^[a-z0-9-]+$/i.test(slug)) throw new Error(`${f}: адрес КП — только латиница, цифры и дефис`);
  if (raw.draft) continue;
  const k = { ...raw, slug, v: ver };
  k.titleText = String(raw.title || 'Коммерческое предложение').replace(/\s*\n\s*/g, ' ').trim();
  k.titleLines = String(raw.title || 'Коммерческое предложение').split('\n').map(s => s.trim()).filter(Boolean);
  k.dateD = date(raw.date) || new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  k.startD = date(raw.start) || k.dateD;
  k.eventD = date(raw.event_date);
  k.validD = date(raw.valid_until) || addDays(k.dateD, num(S.valid_days) || 30);
  k.scope = (raw.scope || []).map(s => typeof s === 'object' ? s.text : s).filter(Boolean);
  k.stages = (raw.stages || []).map(st => {
    const items = (st.items || []).filter(i => i && i.name).map(i => ({ name: i.name, unit: i.unit || '', qty: num(i.qty) || 1, price: num(i.price) }));
    const sum = items.reduce((a, i) => a + i.qty * i.price, 0);
    return { title: st.title || '', description: st.description || '', result: st.result || '', days: Math.round(num(st.days)), items, amount: num(st.amount) || sum };
  });
  k.total = k.stages.reduce((a, s) => a + s.amount, 0);
  k.days = k.stages.reduce((a, s) => a + s.days, 0);
  k.priceNote = raw.price_note ?? S.price_note ?? '';
  k.scheduleNote = raw.schedule_note || '';
  k.format = (raw.format && raw.format.length ? raw.format : S.format || []).filter(f => f && f.title);
  // «Релевантный опыт»: список из КП, а если он пуст — кейсы категории предложения
  k.catName = CATS[raw.category] || '';
  const picked = (raw.cases || []).filter(c => c && c.id);
  k.cases = (picked.length ? picked : raw.category ? byCat(raw.category).map(c => ({ id: c.id })) : []).map(c => {
    const cs = CASES[c.id]; if (!cs) { console.warn(`${f}: нет кейса ${c.id}`); return null; }
    const img = caseCover(cs);
    return { id: c.id, name: cs.name, year: cs.year, sub: cs.sub, text: c.text, vid: cs.vid ? '../../' + cs.vid : '', img: img ? '../../' + img : '' };
  }).filter(Boolean);
  // контакты: основной (наверху и в кнопке «Связаться»), менеджер проекта, руководитель; пустые поля КП берутся из настроек
  const filled = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v));
  const SC = S.contacts || { main: S.contact };
  const C = raw.contacts || { main: raw.manager };
  const pick = r => { const own = filled(C[r]); return has(own) ? { ...filled(SC[r]), ...own } : filled(SC[r]); };
  k.main = pick('main');
  // основной контакт — только наверху и в «Связаться», в команде его нет
  // менеджер проекта: из CMS для этого КП → ответственный по сделке в Битрикс24 → настройки
  const bxPm = has(filled(C.pm)) ? null : await bitrixPm(raw.bitrix_deal, f);
  k.pm = bxPm && has(filled(bxPm)) ? filled(bxPm) : pick('pm');
  k.team = [[k.pm, 'Менеджер проекта'], [pick('head'), 'Account director']];
  k.clientLogo = raw.client_logo ? fileUrl(raw.client_logo) : '';
  // шапка КП как у кейса на сайте: фото и/или видео во весь экран (видео играет поверх фото, фото — его постер)
  k.coverImg = fileUrl(raw.cover);
  k.coverVid = fileUrl(raw.cover_video);
  k.clientContact = filled(raw.client_contact);
  k.contactUrl = k.main.tg ? tgUrl(k.main.tg) : k.main.email ? `mailto:${k.main.email}` : '';
  k.pdf = fileUrl(raw.pdf);
  const dir = `${OUT}/${slug}`;
  fs.mkdirSync(dir, { recursive: true });
  // только видео без фото: фото = первый кадр видео (заставка, пока видео грузится или если не сыграло, и обложка превью ссылки)
  if (fs.existsSync(`${dir}/cover.jpg`) && (raw.cover || !raw.cover_video)) fs.rmSync(`${dir}/cover.jpg`);
  if (!raw.cover && raw.cover_video && !/^https?:/.test(raw.cover_video)) {
    const src = String(raw.cover_video).replace(/^\//, ''), frame = `${dir}/cover.jpg`;
    try {
      if (!fs.existsSync(frame) || fs.statSync(frame).mtimeMs < fs.statSync(src).mtimeMs)
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-vf', "scale='min(1920,iw)':-2", '-q:v', '3', frame]);
      k.coverImg = 'cover.jpg';
    } catch { console.log(`clients/${slug}/: не удалось взять кадр из видео обложки (нужен ffmpeg)`); }
  }
  // смета: загруженный файл из CMS или собранная из этапов
  for (const old of fs.readdirSync(dir)) if (old.endsWith('.xlsx')) fs.rmSync(`${dir}/${old}`);
  if (raw.xlsx) k.xlsx = fileUrl(raw.xlsx);
  else if (k.stages.length) {
    const name = `smeta-median-${slug}.xlsx`;
    estimate(k, `${dir}/${name}`);
    k.xlsx = name;
  }
  // «Скачать всё»: презентация и смета одним zip. Внешние ссылки (облако) в архив не попадают.
  // Архив не коммитится (.gitignore) — он собирается при каждом деплое, чтобы не раздувать репозиторий копиями PDF.
  for (const old of fs.readdirSync(dir)) if (old.endsWith('.zip')) fs.rmSync(`${dir}/${old}`);
  const local = (u, own) => !u || /^https?:/.test(u) ? null : own ? `${dir}/${u}` : u.replace(/^(\.\.\/)+/, '');
  const pack = [[local(k.pdf), `median-${slug}-presentation`], [local(k.xlsx, !raw.xlsx), `median-${slug}-smeta`]]
    .filter(([f]) => f && fs.existsSync(f)).map(([f, n]) => [n + path.extname(f), fs.readFileSync(f)]);
  if (pack.length > 1) { k.zip = `median-kp-${slug}.zip`; fs.writeFileSync(`${dir}/${k.zip}`, zip(pack)); }
  const og = ogHtml(k);
  k.ogv = crypto.createHash('md5').update(og + OG_REV).digest('hex').slice(0, 7);
  fs.writeFileSync(`${dir}/og.html`, og);
  fs.writeFileSync(`${dir}/index.html`, page(k));
  built.add(slug);
}
const kpCount = built.size;
// закрытый каталог всех кейсов (и скрытых с сайта): clients/<адрес из настроек>/ — страница для менеджеров и cases.json для Битрикс24
if (S.catalog && /^[a-z0-9-]+$/.test(S.catalog)) {
  const dir = `${OUT}/${S.catalog}`;
  fs.mkdirSync(dir, { recursive: true });
  const list = ORDERED.map(c => ({ id: c.id, name: c.name, client: c.client || '', year: c.year || '', sub: c.sub || '', categories: c.kp || [], on_site: !c.hide, url: SITE + c.id, cover: caseCover(c) ? SITE + caseCover(c) : '' }));
  const json = { updated: new Date().toISOString(), default_count: num(S.cases_default) || 4, categories: Object.entries(CATS).map(([id, name]) => ({ id, name, default: byCat(id).map(c => c.id) })), cases: list };
  fs.writeFileSync(`${dir}/cases.json`, JSON.stringify(json, null, 2));
  fs.writeFileSync(`${dir}/index.html`, catalogPage(list));
  built.add(S.catalog);
  console.log(`clients/${S.catalog}/: каталог, ${list.length} ${plural(list.length, "кейс", "кейса", "кейсов")}`);
}
// удалённые и черновые КП — убрать со страниц
if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) if (!built.has(d)) fs.rmSync(`${OUT}/${d}`, { recursive: true, force: true });
console.log(`clients/: ${kpCount} КП`);
