// Загрузка файла по ссылке в media/ — для MCP (.github/workflows/media.yml, upload_media).
// node tools/fetch-media.mjs <url> <путь в репозитории>
// Публичные ссылки Яндекс Диска и Google Drive превращаются в прямые. Если путь кончается на .webp,
// а пришло фото (jpg, png, heic…), оно сжимается в webp до 2400 px, качество 82 — как при загрузке в /admin.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, dest] = process.argv.slice(2);
const fail = m => { console.error('Ошибка: ' + m); process.exit(1); };
if (!/^https:\/\//.test(url || '')) fail('нужна https-ссылка');
if (!/^media\/(cases|video|vacancies|team|icons)\/[a-z0-9][a-z0-9._-]*\.[a-z0-9]{2,5}$/.test(dest || '')) fail('путь вида media/cases/имя.webp');

let src = url;
if (/^https:\/\/(disk\.yandex\.[a-z]+|yadi\.sk)\//.test(src)) {
  const r = await fetch('https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + encodeURIComponent(src));
  if (!r.ok) fail(`Яндекс Диск: ${r.status} — нужна публичная ссылка на файл, а не на папку`);
  src = (await r.json()).href;
}
const g = src.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/);
if (g) src = `https://drive.usercontent.google.com/download?id=${g[1]}&export=download&confirm=t`;

const r = await fetch(src, { redirect: 'follow' });
if (!r.ok) fail(`скачивание: ${r.status}`);
const buf = Buffer.from(await r.arrayBuffer());
if (!buf.length) fail('пустой файл');
if (/^\s*<(!doctype html|html)/i.test(buf.subarray(0, 64).toString())) fail('по ссылке веб-страница, а не файл — нужна прямая ссылка или публичная ссылка на файл');

const tmp = path.join(os.tmpdir(), 'mcp-src-' + Date.now());
fs.writeFileSync(tmp, buf);
fs.mkdirSync(path.dirname(dest), { recursive: true });

const isImage = /^image\//.test(r.headers.get('content-type') || '') || /^(\xff\xd8|\x89PNG|RIFF)/.test(buf.subarray(0, 4).toString('latin1')) || buf.subarray(4, 12).toString('latin1').startsWith('ftyphei');
if (dest.endsWith('.webp') && isImage) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-frames:v', '1', '-vf', "scale='min(2400,iw)':'min(2400,ih)':force_original_aspect_ratio=decrease", '-c:v', 'libwebp', '-quality', '82', dest], { stdio: 'inherit' });
} else {
  fs.copyFileSync(tmp, dest);
}
fs.rmSync(tmp);
console.log(`${dest}: ${(fs.statSync(dest).size / 1024).toFixed(0)} КБ`);
