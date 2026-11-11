// Собирает js/cases.js из content/cases/*.json (их правит CMS в /admin).
// Порядок — по полю order (первые 5 — баннер). Пустые поля выкидываются, формат полей — тот, что ждёт js/main.js.
// Запуск: node tools/build-cases.mjs   (в деплое — автоматически, см. .github/workflows)
import fs from 'fs';
import { createRequire } from 'module';
// разбор кейса — общий с живым предпросмотром в конструкторе (admin/builder.html)
const { caseFromContent } = createRequire(import.meta.url)('../js/case-data.js');
const dir = 'content/cases';
const cases = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const raw = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  return caseFromContent(raw, f.replace(/\.json$/, ''));
}).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id.localeCompare(b.id));
const ids = new Set();
for (const c of cases) { if (ids.has(c.id)) throw new Error(`повтор id: ${c.id}`); ids.add(c.id); delete c.order; delete c.kp; if (c.hide) c.hide = 1; }
const out = '/* СГЕНЕРИРОВАНО tools/build-cases.mjs из content/cases/*.json — правки вносить там (или через /admin), не здесь.\n' +
  '   Поля: ttl — строки заголовка [текст, контур?], blocks — секции страницы кейса (cut | pairs | feature | text | stats | links | yt | eps | hub | sec | key | pics | photo | banner | carousel | split | marquee | accordion | bento | gallery | years); у кейсов-серий собраны из общей части, проектов и итогов\n' +
  '   hide — кейс скрыт с сайта (только для КП): его нет в CASES (списки, баннер, «Следующий проект»), но страница открывается по прямой ссылке через CASES_ALL */\n' +
  'const CASES_ALL=[\n' + cases.map(c => JSON.stringify(c)).join(',\n') + '\n];\nconst CASES=CASES_ALL.filter(c=>!c.hide);\n';
fs.writeFileSync('js/cases.js', out);
console.log(`js/cases.js: ${cases.length} кейсов, скрытых: ${cases.filter(c => c.hide).length}`);
