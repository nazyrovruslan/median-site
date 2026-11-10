// Кадрирование по заданиям из content/crops/*.json (их пишет страница /admin/crop.html или MCP crop_media).
// Задание: { "src": "media/…", "x": 0.1, "y": 0, "w": 0.8, "h": 1, "t0": 2.5, "t1": 9 }
//   x, y, w, h — рамка в долях кадра (0…1), t0/t1 — начало и конец видео в секундах (необязательно).
// Файл заменяется на месте (пути в content/ не меняются), прежняя версия остаётся в истории git.
// Производные (превью media/thumb, постер, HEVC, тизеры) удаляются — tools/media.mjs сделает их заново.
// Выполненное задание удаляется. Нужен ffmpeg. Запуск: node tools/crop-media.mjs   (в деплое — автоматически)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = 'content/crops';
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const hasAudio = f => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim() !== '';
const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

export function cropFile(job) {
  const src = String(job.src || '').replace(/^\//, '');
  if (!/^media\/[^]+\.(webp|jpe?g|png|mp4)$/i.test(src) || src.includes('..')) throw new Error(`неподходящий файл: ${src}`);
  if (!fs.existsSync(src)) throw new Error(`нет файла ${src}`);
  let x = num(job.x, 0, 1) ?? 0, y = num(job.y, 0, 1) ?? 0, w = num(job.w, 0.01, 1) ?? 1, h = num(job.h, 0.01, 1) ?? 1;
  w = Math.min(w, 1 - x); h = Math.min(h, 1 - y);
  // в пикселях считает сам ffmpeg — уже после поворота кадра (вертикальные видео с телефона), с чётными размерами для h.264
  const crop = (w < 0.9999 || h < 0.9999) ? `crop=w='trunc(iw*${w}/2)*2':h='trunc(ih*${h}/2)*2':x='trunc(iw*${x})':y='trunc(ih*${y})'` : '';
  const ext = path.extname(src).toLowerCase();
  const tmp = src + '.crop' + ext;
  if (ext === '.mp4') {
    const t0 = num(job.t0, 0, 1e5), t1 = num(job.t1, 0, 1e5);
    const trim = [...(t0 ? ['-ss', String(t0)] : []), ...(t1 && t1 > (t0 || 0) ? ['-to', String(t1)] : [])];
    if (!crop && !trim.length) throw new Error('пустое задание: ни рамки, ни обрезки по времени');
    const audio = hasAudio(src);
    ff(...trim, '-i', src, '-map', '0:v:0', ...(audio ? ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '128k'] : ['-an']),
      ...(crop ? ['-vf', crop] : []), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp);
    // -ss перед -i: ffmpeg начинает с ближайшего кадра и пересчитывает -to от него — длина выходит t1 − t0
  } else {
    if (!crop) throw new Error('пустое задание: рамка во весь кадр');
    const enc = ext === '.webp' ? ['-c:v', 'libwebp', '-quality', '86'] : ext === '.png' ? [] : ['-q:v', '2'];
    ff('-i', src, '-frames:v', '1', '-vf', crop, ...enc, tmp);
  }
  fs.renameSync(tmp, src);
  // производные — пересоздаст tools/media.mjs
  const base = src.replace(/\.\w+$/, '');
  const stale = [`media/thumb/${path.basename(base)}.webp`];
  if (ext === '.mp4') stale.push(`${base}.webp`, `${base}.hevc.mp4`, `${base}-teaser.mp4`, `${base}-p.mp4`, `media/thumb/${path.basename(base)}.webp`);
  for (const f of stale) fs.rmSync(f, { force: true });
  return src;
}

if (fs.existsSync(DIR)) {
  const jobs = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
  for (const f of jobs) {
    const file = path.join(DIR, f);
    try {
      const job = JSON.parse(fs.readFileSync(file, 'utf8'));
      const before = fs.statSync(String(job.src).replace(/^\//, '')).size;
      const src = cropFile(job);
      console.log(`кадрировано: ${src} (${(before / 1048576).toFixed(1)} → ${(fs.statSync(src).size / 1048576).toFixed(1)} МБ)`);
    } catch (e) {
      console.error(`не удалось кадрировать по ${file}:`, (e.stderr || e.message || '').toString().trim().split('\n').pop());
    }
    fs.rmSync(file); // и неудачное задание убираем, чтобы оно не повторялось на каждом деплое
  }
  if (!jobs.length) console.log('кадрирование: заданий нет');
}
