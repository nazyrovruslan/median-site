// Загрузка файла по ссылке в media/ — для MCP (.github/workflows/media.yml, upload_media).
// node tools/fetch-media.mjs <url> <путь в репозитории>
// Публичные ссылки Яндекс Диска и Google Drive превращаются в прямые. Если путь кончается на .webp,
// а пришло фото (jpg, png, heic…), оно сжимается в webp до 2400 px, качество 82 — как при загрузке в /admin.
// Если путь кончается на .mp4, а пришло видео (mov, hevc, 4K…), оно пережимается в h.264 до 1920 px и 5 Мбит/с
// (tools/optimize-media.mjs) — в репозиторий не попадает многосотмегабайтный исходник.
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { videoIssues, encodeVideo, limitsFor } from './optimize-media.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, dest] = process.argv.slice(2);
const fail = m => { console.error('Ошибка: ' + m); process.exit(1); };
if (!/^https:\/\//.test(url || '')) fail('нужна https-ссылка');
if (!/^media\/(cases|video|vacancies|team|icons|home|about|founders|awards|clients|southhub|reels)\/[a-z0-9][a-z0-9._-]*\.[a-z0-9]{2,5}$/.test(dest || '')) fail('путь вида media/cases/имя.webp');

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
// на диск потоком: видео бывают по сотне мегабайт и больше
const tmp = path.join(os.tmpdir(), 'mcp-src-' + Date.now());
await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(tmp));
if (!fs.statSync(tmp).size) fail('пустой файл');
const buf = Buffer.alloc(64);
{ const fd = fs.openSync(tmp, 'r'); fs.readSync(fd, buf, 0, 64, 0); fs.closeSync(fd); }
if (/^\s*<(!doctype html|html)/i.test(buf.toString())) fail('по ссылке веб-страница, а не файл — нужна прямая ссылка или публичная ссылка на файл');
fs.mkdirSync(path.dirname(dest), { recursive: true });

const isImage = /^image\//.test(r.headers.get('content-type') || '') || /^(\xff\xd8|\x89PNG|RIFF)/.test(buf.subarray(0, 4).toString('latin1')) || buf.subarray(4, 12).toString('latin1').startsWith('ftyphei');
if (dest.endsWith('.webp') && isImage) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-frames:v', '1', '-vf', "scale='min(2400,iw)':'min(2400,ih)':force_original_aspect_ratio=decrease", '-c:v', 'libwebp', '-quality', '82', dest], { stdio: 'inherit' });
} else if (dest.endsWith('.mp4') && (/^video\//.test(r.headers.get('content-type') || '') || buf.subarray(4, 8).toString('latin1') === 'ftyp' || buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))) {
  const v = tmp + '.mp4'; // videoIssues смотрит и на расширение — исходник любого контейнера проверяем как mp4
  fs.renameSync(tmp, v);
  const lim = limitsFor(dest);
  const { p, out } = videoIssues(v, lim);
  if (out.length) { console.log(`видео: ${out.join(', ')} — пережимаю`); encodeVideo(v, dest, lim, p); }
  else fs.copyFileSync(v, dest);
  fs.renameSync(v, tmp);
} else {
  fs.copyFileSync(tmp, dest);
}
fs.rmSync(tmp);
console.log(`${dest}: ${(fs.statSync(dest).size / 1024).toFixed(0)} КБ`);
