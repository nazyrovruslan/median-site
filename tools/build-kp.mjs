// Собирает скрытый раздел с коммерческими предложениями: content/kp/<адрес>.json → clients/<адрес>/index.html + смета.xlsx.
// Общие настройки (счётчики, контакты, «Формат работы» по умолчанию) — content/settings/kp.json. Всё правится в /admin.
// Раздел нигде не упоминается на сайте, страницы закрыты от поисковиков (noindex); ссылку получает только клиент.
// Запуск: node tools/build-kp.mjs   (в деплое — автоматически, см. .github/workflows)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { xlsx } from './xlsx.mjs';

const SRC = 'content/kp', OUT = 'clients', SITE = 'https://nazyrovruslan.github.io/median-site/';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const S = fs.existsSync('content/settings/kp.json') ? read('content/settings/kp.json') : {};
const CASES = Object.fromEntries(fs.readdirSync('content/cases').filter(f => f.endsWith('.json')).map(f => { const c = read(`content/cases/${f}`); return [c.id || f.slice(0, -5), c]; }));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = s => esc(String(s ?? '').trim()).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
const para = s => s && String(s).trim() ? `<p>${txt(s)}</p>` : '';
const num = v => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const money = n => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0|\u202f/g, ' ');
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
const days = n => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const date = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const long = (d, year = true) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? ' ' + d.getUTCFullYear() : ''}`;
const short = d => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
const iso = d => d.toISOString().slice(0, 10);
const tgUrl = s => !s ? '' : /^https?:/.test(s) ? s : 'https://t.me/' + String(s).replace(/^@|^t\.me\//, '');
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
  rows.push([{ v: `${k.client ? k.client + ' · ' : ''}${long(k.dateD)} · актуально до ${short(k.validD)}`, s: 'muted' }]);
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

function page(k) {
  const scope = k.scope.length ? `<ul class="kp-scope">${k.scope.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
  const dl = (href, label, goal, cls = '') => href ? `<a class="kp-btn ${cls}" href="${esc(href)}" download data-goal="${goal}" target="_blank" rel="noopener">${label}</a>` : '';
  const stages = k.stages.map((st, i) => `
  <section class="kp-row kp-stage">
    <h2 class="kp-h">${String(i + 1).padStart(2, '0')} этап</h2>
    <div class="kp-body">
      <h3 class="kp-st">${esc(st.title)}</h3>
      ${st.description ? `<div class="kp-pair"><span class="kp-l">Описание</span><div class="kp-t">${para(st.description)}</div></div>` : ''}
      ${st.result ? `<div class="kp-pair"><span class="kp-l">Результат работ</span><div class="kp-t">${para(st.result)}</div></div>` : ''}
      ${st.items.length ? `<table class="kp-items"><thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена, ₽</th><th>Сумма, ₽</th></tr></thead><tbody>${st.items.map(it => `<tr><td>${esc(it.name)}</td><td>${esc(it.qty)}${it.unit ? ' ' + esc(it.unit) : ''}</td><td>${money(it.price)}</td><td>${money(it.qty * it.price)}</td></tr>`).join('')}</tbody></table>` : ''}
      <div class="kp-pair kp-sum"><span class="kp-l">Срок<br>Стоимость, руб.</span><span class="kp-days">${st.days ? days(st.days) : '—'}</span><span class="kp-amt">${money(st.amount)}</span></div>
    </div>
  </section>`).join('');

  // график: этапы идут подряд от даты старта
  let gantt = '';
  if (k.days && k.startD) {
    let acc = 0;
    gantt = `
  <section class="kp-row kp-plan">
    <h2 class="kp-h">График работ</h2>
    <div class="kp-body">${para(k.scheduleNote || `Ориентировочный график при старте ${long(k.startD)} года. Паузы на согласования и ожидание материалов учитываются отдельно.`)}</div>
    <div class="kp-gantt">${k.stages.filter(s => s.days).map((st, i) => {
      const a = addDays(k.startD, acc), b = addDays(k.startD, acc + st.days - 1);
      const l = acc / k.days * 100, w = st.days / k.days * 100; acc += st.days;
      return `<div class="kp-g"><div class="kp-gl"><span>Этап ${i + 1}. ${esc(st.title)}</span><span>${days(st.days)} (${long(a, false)} — ${long(b, false)})</span></div><div class="kp-gb"><i style="left:${l.toFixed(3)}%;width:${w.toFixed(3)}%"></i></div></div>`;
    }).join('')}
      <div class="kp-gl kp-ge"><span>Старт ${long(k.startD)}</span><span>Окончание ${long(addDays(k.startD, k.days - 1))}</span></div>
    </div>
  </section>`;
  }

  const cases = k.cases.length ? `
  <section class="kp-row kp-cases">
    <h2 class="kp-h">Релевантный опыт</h2>
    <div class="kp-body">${k.cases.map(c => `
      <a class="kp-case" href="../../${esc(c.id)}" target="_blank" rel="noopener" data-goal="kp_case">
        ${c.img ? `<span class="kp-ci" style="background-image:url('${esc(c.img)}')"></span>` : '<span class="kp-ci"></span>'}
        <span class="kp-cn">${esc(c.name)}${c.year ? ` <small>${esc(c.year)}</small>` : ''}</span>
        <span class="kp-t">${para(c.text || c.sub)}</span>
        <span class="kp-more">Смотреть кейс ↗</span>
      </a>`).join('')}
    </div>
  </section>` : '';

  const format = k.format.length ? `
  <section class="kp-row">
    <h2 class="kp-h">Формат работы</h2>
    <div class="kp-body">${k.format.map(f => `<div class="kp-pair"><span class="kp-l">${esc(f.title)}</span><div class="kp-t">${para(f.text)}</div></div>`).join('')}</div>
  </section>` : '';

  const m = k.manager, contact = k.contactUrl;
  const data = { slug: k.slug, client: k.client || '', total: k.total, link: k.track_url || '', metrika: /^\d+$/.test(String(S.metrika || '')) ? +S.metrika : 0 };

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(k.titleText)} | Median Agency</title>
<meta property="og:title" content="${esc(k.titleText)}">
<meta property="og:site_name" content="Median Agency">
<meta property="og:image" content="${SITE}media/og.jpg">
<link rel="icon" href="../../media/favicon.svg" type="image/svg+xml">
<link rel="icon" href="../../media/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="../../media/apple-touch-icon.png">
<link rel="stylesheet" href="../../css/fonts.css">
<link rel="stylesheet" href="../../css/kp.css?v=${k.v}">
${counters(k)}
</head>
<body>
<header class="kp-bar">
  <a class="kp-pill" href="../../" target="_blank" rel="noopener" aria-label="median.agency">${MARK}<span>КП · Median</span></a>
  <nav class="kp-acts">
    <button class="kp-btn kp-ic" type="button" id="kpCopy" aria-label="Скопировать ссылку" title="Скопировать ссылку"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg></button>
    ${dl(k.pdf, 'PDF', 'kp_pdf', 'kp-ic')}
    ${dl(k.xlsx, 'XLS', 'kp_xlsx', 'kp-ic')}
  </nav>
</header>

<main class="kp">
  <section class="kp-hero">
    <div class="kp-mark">${MARK}</div>
    <div class="kp-head">
      <h1 class="kp-title">${k.titleLines.map(l => `<span>${esc(l)}</span>`).join('')}</h1>
      <div class="kp-date">${long(k.dateD)}${k.client ? ` · ${esc(k.client)}` : ''}</div>
    </div>
    <div class="kp-scope-w">${scope}</div>
    <div class="kp-files">
      <span class="kp-l">Материалы</span>
      <div class="kp-fl">${dl(k.pdf, 'Презентация', 'kp_pdf', 'kp-wide')}${dl(k.xlsx, 'Смета в Excel', 'kp_xlsx', 'kp-wide')}</div>
    </div>
  </section>

  <div class="kp-facts">
    <span><span class="kp-l">Актуально до</span>${short(k.validD)}</span>
    ${k.days ? `<span>${days(k.days)}</span>` : ''}
    <span>${k.stages.length} ${plural(k.stages.length, 'этап', 'этапа', 'этапов')}</span>
    <span class="kp-fsum">${money(k.total)} ₽</span>
  </div>

  ${k.task || k.sequence ? `
  <section class="kp-row">
    <h2 class="kp-h">Задача</h2>
    <div class="kp-body">
      ${k.task ? `<div class="kp-pair"><span class="kp-l">Описание</span><div class="kp-t kp-big">${para(k.task)}</div></div>` : ''}
      ${k.sequence ? `<div class="kp-pair"><span class="kp-l">Последовательность</span><div class="kp-t kp-big">${para(k.sequence)}</div></div>` : ''}
    </div>
  </section>` : ''}
  ${stages}

  <section class="kp-total" id="kpTotal">
    <h2 class="kp-h">Итоговый срок<br>и стоимость проекта</h2>
    <span class="kp-days">${k.days ? days(k.days) : ''}</span>
    <span class="kp-amt">${money(k.total)}</span>
    <p class="kp-note">${[k.priceNote, `Расчёт актуален до ${long(k.validD)} года`].filter(Boolean).map(esc).join('<br>')}</p>
  </section>
  ${gantt}${cases}${format}

  <section class="kp-row kp-contact">
    <h2 class="kp-h">Контакты</h2>
    <div class="kp-body">
      ${m.name ? `<div class="kp-mn">${esc(m.name)}${m.role ? `<span class="kp-l">${esc(m.role)}</span>` : ''}</div>` : ''}
      <div class="kp-cl">
        ${m.tg ? `<a href="${esc(tgUrl(m.tg))}" target="_blank" rel="noopener" data-goal="kp_contact">Telegram ${esc('@' + String(m.tg).replace(/^@|^https?:\/\/t\.me\//, ''))}</a>` : ''}
        ${m.phone ? `<a href="tel:${esc(String(m.phone).replace(/[^\d+]/g, ''))}" data-goal="kp_contact">${esc(m.phone)}</a>` : ''}
        ${m.email ? `<a href="mailto:${esc(m.email)}" data-goal="kp_contact">${esc(m.email)}</a>` : ''}
      </div>
    </div>
  </section>
</main>

<footer class="kp-foot"><span>© Median Agency</span><span>Предложение подготовлено лично для вас. Пожалуйста, не публикуйте ссылку.</span></footer>
${contact ? `<a class="kp-cta" href="${esc(contact)}" target="_blank" rel="noopener" data-goal="kp_contact">Связаться</a>` : ''}
<div class="kp-toast" id="kpToast" role="status" aria-live="polite"></div>
<script type="application/json" id="kpData">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="../../js/kp.js?v=${k.v}"></script>
${S.body || ''}
</body>
</html>
`;
}

// ---- сборка ----
// версия css/js в ссылках = хэш их содержимого (сбрасывает кэш только когда они меняются)
const ver = crypto.createHash('md5').update(fs.readFileSync('css/kp.css')).update(fs.readFileSync('js/kp.js')).digest('hex').slice(0, 7);
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
  k.cases = (raw.cases || []).map(c => {
    const cs = CASES[c.id]; if (!cs) { console.warn(`${f}: нет кейса ${c.id}`); return null; }
    const cover = cs.img || (cs.vid ? cs.vid.replace(/\.mp4$/, '.webp') : '');
    const th = cover && 'media/thumb/' + path.basename(cover).replace(/\.\w+$/, '.webp');
    return { id: c.id, name: cs.name, year: cs.year, sub: cs.sub, text: c.text, img: th && fs.existsSync(th) ? '../../' + th : cover ? '../../' + cover : '' };
  }).filter(Boolean);
  const mg = Object.fromEntries(Object.entries(raw.manager || {}).filter(([, v]) => v));
  k.manager = { ...(S.contact || {}), ...mg };
  k.contactUrl = k.manager.tg ? tgUrl(k.manager.tg) : k.manager.email ? `mailto:${k.manager.email}` : '';
  k.pdf = fileUrl(raw.pdf);
  const dir = `${OUT}/${slug}`;
  fs.mkdirSync(dir, { recursive: true });
  // смета: загруженный файл из CMS или собранная из этапов
  for (const old of fs.readdirSync(dir)) if (old.endsWith('.xlsx')) fs.rmSync(`${dir}/${old}`);
  if (raw.xlsx) k.xlsx = fileUrl(raw.xlsx);
  else if (k.stages.length) {
    const name = `smeta-median-${slug}.xlsx`;
    estimate(k, `${dir}/${name}`);
    k.xlsx = name;
  }
  fs.writeFileSync(`${dir}/index.html`, page(k));
  built.add(slug);
}
// удалённые и черновые КП — убрать со страниц
if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) if (!built.has(d)) fs.rmSync(`${OUT}/${d}`, { recursive: true, force: true });
console.log(`clients/: ${built.size} КП`);
