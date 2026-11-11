// Заводит цели сайта в Яндекс Метрике по списку content/metrika-goals.json (тип «JavaScript-событие»).
// Повторный запуск безопасен: цели, которые уже есть (по идентификатору), пропускаются.
// Нужен OAuth-токен Метрики с правом записи в переменной METRIKA_TOKEN (секрет репозитория).
// Запуск: METRIKA_TOKEN=… node tools/metrika-goals.mjs   (в GitHub — Actions → «Metrika goals» → Run workflow)
import fs from 'node:fs';
const { counter, goals } = JSON.parse(fs.readFileSync('content/metrika-goals.json', 'utf8'));
const token = process.env.METRIKA_TOKEN;
if (!token) { console.log('METRIKA_TOKEN не задан — пропускаю (см. NOTES.md, «Счётчики и цели»)'); process.exit(0); }
const api = `https://api-metrika.yandex.net/management/v1/counter/${counter}/goals`;
const H = { Authorization: `OAuth ${token}`, 'Content-Type': 'application/json' };
const r = await fetch(api, { headers: H });
if (!r.ok) { console.error('Метрика не отдала список целей:', r.status, await r.text()); process.exit(1); }
const have = new Set((await r.json()).goals.flatMap(g => (g.conditions || []).map(c => c.url)));
let made = 0;
for (const g of goals) {
  if (have.has(g.id)) { console.log('есть:', g.id); continue; }
  const res = await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ goal: { name: g.name, type: 'action', conditions: [{ type: 'exact', url: g.id }] } }) });
  if (!res.ok) { console.error('не создалась:', g.id, res.status, await res.text()); process.exitCode = 1; continue; }
  console.log('создана:', g.id); made++;
}
console.log(`готово: новых целей ${made}, всего в списке ${goals.length}`);
