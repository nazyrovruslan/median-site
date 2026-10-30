// Собирает js/icons.js из content/settings/icons.json (CMS → Настройки → Пиктограммы к цифрам).
// Порядок важен: цифре без своей пиктограммы достаётся первая, у которой слово из «Слов для подбора» начинает какое-то слово подписи.
// Запуск: node tools/build-icons.mjs   (в деплое — автоматически, см. .github/workflows)
import fs from 'fs';
const src = JSON.parse(fs.readFileSync('content/settings/icons.json', 'utf8'));
const ids = new Set();
const list = (src.items || []).filter(i => i && i.id && i.img).map(i => {
  if (ids.has(i.id)) throw new Error(`повтор id пиктограммы: ${i.id}`);
  ids.add(i.id);
  if (!fs.existsSync(i.img.replace(/^\//, ''))) console.warn(`пиктограмма ${i.id}: нет файла ${i.img}`);
  return { id: i.id, img: i.img.replace(/^\//, ''), w: String(i.words || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean) };
});
fs.writeFileSync('js/icons.js', '/* СГЕНЕРИРОВАНО tools/build-icons.mjs из content/settings/icons.json — правки вносить там (или через /admin), не здесь.\n' +
  '   id — для поля «Пиктограмма» у цифры, img — svg-файл (на сайте перекрашивается маской), w — слова для подбора по подписи */\n' +
  'const ICONS=' + JSON.stringify(list, null, 1) + ';\n');
console.log(`пиктограмм: ${list.length}`);
