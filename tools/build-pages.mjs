// Главная и «О нас» из админки: content/pages/home.json и content/pages/about.json (CMS → «Страницы»; MCP — read_file/edit_files).
// В index.html правятся только куски между <!-- cms:<имя> --> и <!-- /cms:<имя> -->; вёрстка (классы, анимации, курсор) — здесь, тексты и медиа — в JSON.
// Запуск: node tools/build-pages.mjs (в деплое — до build-seo, страницы кейсов и about.html копируют index.html; index.html коммитит бот).
import fs from 'fs';

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// неразрывный пробел после коротких слов (в, к, на, и…) и перед тире — как в вёрстке главной
const typo = s => esc(String(s ?? '').trim()).replace(/(^|[\s(«])([А-Яа-яЁёA-Za-z]{1,2}) (?=\S)/g, '$1$2 ').replace(/(^|[\s(«])([А-Яа-яЁёA-Za-z]{1,2}) (?=\S)/g, '$1$2 ').replace(/ — /g, ' — ').replace(/ /g, '&nbsp;');
const paras = s => String(s ?? '').split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);
const lines = s => String(s ?? '').split('\n').map(l => l.trim()).filter(Boolean);
const pad = i => String(i + 1).padStart(2, '0');
const flat = s => lines(s).join(' ');

// пропорции логотипа (ширина / высота) из файла: svg (viewBox или width/height), webp, png
function ratio(src, digits) {
  try {
    const f = String(src).replace(/^\//, '').replace(/\?.*$/, ''), b = fs.readFileSync(f);
    let w, h;
    if (/\.svg$/i.test(f)) {
      const t = b.toString('utf8'), vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(t);
      if (vb) [w, h] = [+vb[1], +vb[2]]; else { w = parseFloat((/\swidth="([\d.]+)/.exec(t) || [])[1]); h = parseFloat((/\sheight="([\d.]+)/.exec(t) || [])[1]); }
    } else [w, h] = size(b);
    return w && h ? (w / h).toFixed(digits) : '';
  } catch { return ''; }
}
function size(b) {
  if (b.toString('ascii', 0, 4) === 'RIFF') {
    const k = b.toString('ascii', 12, 16);
    if (k === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (k === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (k === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  }
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length;) {
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  return [];
}
const imgSize = src => { try { return size(fs.readFileSync(String(src).replace(/^\//, '').replace(/\?.*$/, ''))); } catch { return []; } };
const media = s => esc(String(s ?? '').replace(/^\//, ''));
const head3 = (h, dark = true) => `<h3 class="d"><span class="o${dark ? ' on-dark' : ''}">${esc(h?.out)}</span>${h?.solid ? ' ' + esc(h.solid) : ''}</h3>`;
const rows = (list, cls, k1, k2) => `<div class="rows ${cls}">\n${(list || []).map((r, i) => `        <div class="row rv"><span class="n">${pad(i)}</span><span class="nm">${esc(r[k1])}</span><span class="sb">${typo(r[k2])}</span></div>`).join('\n')}\n      </div>`;
const logo = (l, digits) => { const ar = l.ar || ratio(l.logo, digits) || '1'; const u = media(l.logo); return `-webkit-mask-image:url(${u});mask-image:url(${u});--c:${esc(l.color || '#f3f3f1')};${l.color_logo ? `--hc:url(${media(l.color_logo)});` : ''}--ar:${ar};--s:${Number(l.scale ?? 1).toFixed(2)}`; };

function dirSection(c, i, pod) {
  const id = esc(c.case), t = esc(c.title), img = media(c.img);
  const art = pod
    ? `<div class="art" style="background:url(${img}) center/contain no-repeat ${esc(c.bg || '#1147f2')}"></div>`
    : `<div class="art" style="background:url(${img}) center/cover no-repeat">${c.vid ? `<video class="cv" src="${media(c.vid)}" poster="${img}" autoplay muted loop playsinline preload="metadata" onplaying="this.classList.add('on')" aria-hidden="true"></video>` : ''}</div>`;
  const ind = pod ? '  ' : '    ';
  return `${ind}<section class="grey wrap dir${pod ? ' pod' : ''}" data-dir="${pod || i % 2 ? 'internal' : 'external'}"${pod ? ' id="pod"' : ''}>
${ind}  <div class="ttl"><h2 class="d"><span class="o">${esc(c.out)}</span><br><span class="solid">${esc(c.solid)}</span></h2></div>
${ind}  <a href="${id}" class="vlink" data-c="link" data-case="${id}">${t}</a>
${ind}  <a href="${id}" class="vis" data-c="view" data-label="${pod ? 'Смотреть подкаст' : 'Смотреть проект'}" data-magnet=".06" aria-label="${esc(c.name || c.title)}" data-case="${id}">${art}<span class="cap label">${t}</span></a>
${ind}  <div class="card"><span class="label">${t}</span>${typo(flat(c.text))}</div>
${ind}</section>`;
}

const R = {
  'home-h1': h => `<h1>${esc(flat(h.h1))}</h1>`,
  'home-about': h => `<h2 class="d">${typo(flat(h.about.title))}</h2>\n${paras(h.about.text).map(p => `        <p class="meta">${typo(p)}</p>`).join('\n')}`,
  'home-goal': h => `<h2 class="d goal" data-fit><span class="o on-dark">${esc(h.goal.out)}</span> ${typo(flat(h.goal.text)).replace(/(^|\s|;)([^\s&;<>]+-[^\s&;<>]+)/g, '$1<span class="nw">$2</span>')}</h2>`,
  'home-showcase': h => h.showcase.map((c, i) => dirSection(c, i, false)).join('\n'),
  'home-podcast': h => dirSection(h.podcast, 0, true),
  'about-intro': a => { const l = lines(a.intro.title), full = esc(l.join(' ')); return `<section class="ab-intro wrap" aria-label="${full}">
      <div class="ai-mark ld-mark rv" id="aiMark" aria-hidden="true"></div>
      <h2 class="d ai-ttl rv" aria-label="${full}">${l.map((x, i) => `<span${i ? '' : ' class="o on-dark"'}>${esc(x)}</span>`).join('')}</h2>
      <p class="ai-sub rv">${typo(flat(a.intro.sub))}</p>
    </section>`; },
  'about-who': a => { const w = a.who; return `<figure class="ab-photo rv"><img data-src="${media(w.photo)}" alt="${esc(w.photo_alt)}" loading="lazy"></figure>
        <h2 class="d ab-ttl rv" id="aTitle">${lines(w.title).map((x, i) => `<span class="ln${i ? '' : ' o on-dark'}">${esc(x)}</span>`).join('')}</h2>
${paras(w.left).map(p => `        <p class="ab-txt rv">${typo(p)}</p>`).join('\n')}
      </div>
      <div class="ab-r">
        <p class="ab-cap rv">${lines(w.caption).map(esc).join('<br>')}</p>
${paras(w.right).map(p => `        <p class="ab-txt rv">${typo(p)}</p>`).join('\n')}`; },
  'about-values': a => `${head3(a.values, false)}\n      <p class="cb-txt ab-sub">${typo(flat(a.values.sub))}</p>\n      ${rows(a.values.rows, 'ab-rows', 'name', 'text')}`,
  'about-founders': a => `${head3(a.founders)}\n${(a.founders.people || []).map(p => {
    const [w, h] = imgSize(p.photo), n = String(p.name || '').trim(), tg = String(p.tg || '').replace(/^@|^https?:\/\/t\.me\//, '').trim();
    return `      <div class="fd"><figure class="fd-ph"><i></i><img src="${media(p.photo)}" alt="${esc(n)}" loading="lazy"${w ? ` width="${w}" height="${h}"` : ''}></figure><h4 class="d">${esc(n).replace(' ', '<br>')}</h4><span class="label">${esc(p.role)}</span><p>${typo(flat(p.text))}</p>${tg ? `<a href="https://t.me/${esc(tg)}" aria-label="Telegram @${esc(tg)}" target="_blank" rel="noopener" data-c="link" data-stick data-stick-size="text" data-magnet>@${esc(tg)} <span aria-hidden="true">→</span></a>` : ''}</div>`;
  }).join('\n')}`,
  'about-history': a => `${head3(a.history)}\n      <p class="ab-sub ah-lead">${typo(flat(a.history.lead))}</p>\n      ${rows(a.history.rows, 'ah-rows', 'year', 'text')}`,
  'about-clients': a => { const li = (l, hid) => `<li><span class="lg"${hid ? '' : ` role="img" aria-label="${esc(l.name)}"`} style="${logo(l, 3)}"></span></li>`, L = a.clients.logos || [];
    return `<div class="wrap cl-head"><div class="cf-logo d">${esc(a.clients.title)}</div><p>${esc(flat(a.clients.sub))}</p></div>
      <!-- бегущая строка логотипов, список повторён дважды для бесшовной прокрутки -->
      <div class="cl-mq"><div class="cl-track"><ul>${L.map(l => li(l)).join('')}</ul><ul aria-hidden="true">${L.map(l => li(l, true)).join('')}</ul></div></div>`; },
  'about-awards': a => `<div class="cf-logo d">${esc(a.awards.title)}</div>
      <div class="aw-list">${(a.awards.groups || []).map(g => `<div class="aw-g"><h4><span class="lg" role="img" aria-label="${esc(g.name)}" style="${logo(g, 2)}"></span></h4><ul>${(g.items || []).map(i => `<li><b>${esc(i.place)}</b><span>${esc(i.title)}</span></li>`).join('')}</ul></div>`).join('')}</div>`,
};

export function renderPages(html, data) {
  for (const [name, fn] of Object.entries(R)) {
    const src = data[name.split('-')[0]];
    if (!src) continue;
    const re = new RegExp(`(<!-- cms:${name} -->\\n)[\\s\\S]*?(\\n([ \\t]*)<!-- /cms:${name} -->)`);
    const m = re.exec(html);
    if (!m) { console.warn(`build-pages: нет метки cms:${name} в index.html`); continue; }
    let out;
    try { out = fn(src); } catch (e) { console.warn(`build-pages: ${name} пропущен — ${e.message}`); continue; }
    html = html.replace(re, (_, a, b, ind) => a + (/^\s/.test(out) ? '' : ind) + out + b);
  }
  return html;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const data = {};
  for (const k of ['home', 'about']) { try { data[k] = read(`content/pages/${k}.json`); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  const s = fs.readFileSync('index.html', 'utf8'), next = renderPages(s, data);
  if (next !== s) { fs.writeFileSync('index.html', next); console.log('index.html: главная и «О нас» собраны из content/pages'); }
  else console.log('index.html: без изменений');
}
