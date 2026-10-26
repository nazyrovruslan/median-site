// Собирает js/vacancies.js из content/vacancies/*.json и content/settings/jobs.json (их правит CMS в /admin).
// Порядок — по полю order; выключенные («Показывать на сайте» = нет, on:false; старое поле draft:true) на сайт не попадают. Посмотреть их локально: JOBS_DRAFTS=1 node tools/build-vacancies.mjs
// Запуск: node tools/build-vacancies.mjs   (в деплое — автоматически, см. .github/workflows)
import fs from 'fs';
const dir = 'content/vacancies';
const drafts = !!process.env.JOBS_DRAFTS;
const empty = v => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const clean = o => {
  if (Array.isArray(o)) return o.map(clean).filter(v => !empty(v));
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) { const c = clean(v); if (!empty(c) && c !== false && !(typeof c === 'object' && !Array.isArray(c) && !Object.keys(c).length)) r[k] = c; }
    return r;
  }
  return typeof o === 'string' ? o.trim() : o;
};
const set = clean(JSON.parse(fs.readFileSync('content/settings/jobs.json', 'utf8')));
const caseIds = new Set(fs.readdirSync('content/cases').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`content/cases/${f}`, 'utf8')).id || f.replace(/\.json$/, '')));
const all = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const raw = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  const v = clean(raw);
  v.draft = raw.on === false || raw.draft === true; // false clean() выкидывает — смотрим в сырых данных
  delete v.on;
  v.id = v.id || f.replace(/\.json$/, '');
  if (!v.name) throw new Error(`${f}: нет названия (name)`);
  // заголовок по строкам: в CMS — [{text, outline}], на сайте — [[текст, 1 — контур / 0 — заливка]]
  if (v.ttl) v.ttl = v.ttl.map(l => [l.text, l.outline ? 1 : 0]);
  // кейсы: в CMS — [{id}], на сайте — [id]; несуществующие выкидываем
  v.cases = (v.cases || []).map(c => typeof c === 'string' ? c : c.id).filter(id => { if (!caseIds.has(id)) console.warn(`${f}: нет кейса ${id}`); return caseIds.has(id); });
  if (!v.cases.length) delete v.cases;
  return v;
}).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id.localeCompare(b.id)) : [];
const ids = new Set();
for (const v of all) { if (ids.has(v.id)) throw new Error(`повтор id вакансии: ${v.id}`); ids.add(v.id); }
const nDraft = all.filter(v => v.draft).length;
const list = all.filter(v => drafts || !v.draft).map(v => { delete v.order; delete v.draft; return v; });
const out = '/* СГЕНЕРИРОВАНО tools/build-vacancies.mjs из content/vacancies/*.json и content/settings/jobs.json — правки вносить там (или через /admin), не здесь.\n' +
  '   list — открытые вакансии (без черновиков): sections — разделы [{h, items}], cases — id кейсов, manager — руководитель (если пусто — из настроек) */\n' +
  'const JOBS=' + JSON.stringify({ ...set, list }, null, 1) + ';\n';
fs.writeFileSync('js/vacancies.js', out);
console.log(`js/vacancies.js: ${list.length} вакансий на сайте, скрытых: ${nDraft}${drafts ? ' (скрытые включены)' : ''}`);
