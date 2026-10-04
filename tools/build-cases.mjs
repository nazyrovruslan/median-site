// Собирает js/cases.js из content/cases/*.json (их правит CMS в /admin).
// Порядок — по полю order (первые 5 — баннер). Пустые поля выкидываются, формат полей — тот, что ждёт js/main.js.
// Запуск: node tools/build-cases.mjs   (в деплое — автоматически, см. .github/workflows)
import fs from 'fs';
const dir = 'content/cases';
const empty = v => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const clean = o => {
  if (Array.isArray(o)) return o.map(clean).filter(v => !empty(v));
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) { const c = clean(v); if (!empty(c) && c !== false) r[k] = c; }
    return r;
  }
  return typeof o === 'string' ? o.trim() : o;
};
const cases = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const raw = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  const c = clean(raw);
  c.id = c.id || f.replace(/\.json$/, '');
  if (!c.name) throw new Error(`${f}: нет названия (name)`);
  if (!c.dir) c.dir = 'external';
  if (!Array.isArray(c.c) || c.c.length < 3) c.c = ['#555555', '#999999', '#111111']; // фон-заглушка, пока нет фото
  // заголовок по строкам: в CMS — [{text, outline}], на сайте — [[текст, 1 — контур / 0 — заливка]]
  if (c.ttl) c.ttl = c.ttl.map(l => [l.text, l.outline ? 1 : 0]);
  if (c.light) c.light = 1;
  // в блоке «pairs» слово может быть пустым — сайт ждёт строку
  (c.blocks || []).forEach(b => { if (b.t === 'pairs') (b.items || []).forEach(i => { if (i.word == null) i.word = ''; }); });
  return c;
}).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id.localeCompare(b.id));
const ids = new Set();
for (const c of cases) { if (ids.has(c.id)) throw new Error(`повтор id: ${c.id}`); ids.add(c.id); delete c.order; }
const out = '/* СГЕНЕРИРОВАНО tools/build-cases.mjs из content/cases/*.json — правки вносить там (или через /admin), не здесь.\n' +
  '   Поля: ttl — строки заголовка [текст, контур?], blocks — секции страницы кейса (cut | pairs | feature | text | stats | links | yt | eps) */\n' +
  'const CASES=[\n' + cases.map(c => JSON.stringify(c)).join(',\n') + '\n];\n';
fs.writeFileSync('js/cases.js', out);
console.log(`js/cases.js: ${cases.length} кейсов`);
