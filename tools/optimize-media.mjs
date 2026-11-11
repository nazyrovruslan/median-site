// Сжимает исходники, загруженные через /admin или MCP, до того как сборка сделает из них превью.
// Трогает только файлы, на которые ссылается content/**/*.json, и только если они «тяжелее нормы» —
// уже оптимизированные пропускает, поэтому повторный запуск ничего не пережимает.
//   видео (.mov, .m4v, .webm, .avi, .mkv, .mp4) → mp4 h.264 yuv420p, faststart:
//     ролики со звуком (поле reel, папка media/reels) — до 1920 px (рилсы до 720×1280), до 5 Мбит/с, звук aac 128k;
//     беззвучные (видео-обложки, петли в галереях, обложки КП и вакансий) — до 1280 px, до 3 Мбит/с, звуковая дорожка убирается;
//   фото (.jpg, .png, .heic, .tif, .bmp) → webp до 2400 px, качество 82 (как в /admin); webp больше 2400 px уменьшается.
// Если меняется расширение, путь переписывается во всех JSON в content/, а исходник удаляется.
// Нужны ffmpeg и ffprobe. Запуск: node tools/optimize-media.mjs [--dry]   (в деплое — автоматически, перед media.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VIDEO = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;
const PHOTO = /\.(jpe?g|png|heic|heif|tiff?|bmp|webp)$/i;
const LIMITS = {
  sound: { w: 1920, h: 1920, kbps: 5000, audio: true },
  reels: { w: 720, h: 1280, kbps: 5000, audio: true },
  silent: { w: 1280, h: 1280, kbps: 3000, audio: false },
};
const PHOTO_MAX = 2400;

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const ff = (...a) => run('ffmpeg', ['-v', 'error', '-y', ...a]);

export function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=bit_rate,format_name:stream=codec_type,codec_name,width,height,pix_fmt,color_transfer', '-of', 'json', file]));
  const v = j.streams.find(s => s.codec_type === 'video') || {};
  return {
    codec: v.codec_name, w: v.width || 0, h: v.height || 0, pix: v.pix_fmt,
    hdr: /arib-std-b67|smpte2084/.test(v.color_transfer || ''),
    audio: j.streams.some(s => s.codec_type === 'audio'),
    kbps: Number(j.format.bit_rate || 0) / 1000,
    format: j.format.format_name || '',
  };
}

// moov в начале файла — видео начинает играть до полной загрузки
const fastStart = file => {
  const b = Buffer.alloc(64 * 1024);
  const fd = fs.openSync(file, 'r');
  const n = fs.readSync(fd, b, 0, b.length, 0);
  fs.closeSync(fd);
  return b.subarray(0, n).includes('moov');
};

// что не так с видео (пустой список — всё в норме)
export function videoIssues(file, lim) {
  const p = probe(file);
  const out = [];
  if (!/\.mp4$/i.test(file)) out.push('не mp4');
  if (p.codec !== 'h264') out.push(`кодек ${p.codec}`);
  if (p.pix !== 'yuv420p') out.push(`цвет ${p.pix}`);
  if (p.hdr) out.push('HDR');
  if (p.w > lim.w || p.h > lim.h) out.push(`${p.w}×${p.h}`);
  if (p.kbps > lim.kbps * 1.1) out.push(`${Math.round(p.kbps)} кбит/с`);
  if (p.audio && !lim.audio) out.push('лишний звук');
  if (!out.length && !fastStart(file)) out.push('без faststart');
  return { p, out };
}

export function encodeVideo(src, dest, lim, p = probe(src)) {
  const tmp = dest + '.tmp.mp4';
  const reencode = p.hdr || p.codec !== 'h264' || p.pix !== 'yuv420p' || p.w > lim.w || p.h > lim.h || p.kbps > lim.kbps * 1.1;
  if (!reencode) {
    // картинка в норме — без перекодирования убираем звук и/или переносим moov в начало
    ff('-i', src, '-map', '0:v:0', ...(lim.audio ? ['-map', '0:a:0?'] : ['-an']), '-c', 'copy', '-movflags', '+faststart', tmp);
  } else {
    const scale = `scale='min(${lim.w},iw)':'min(${lim.h},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
    ff('-i', src, '-map', '0:v:0', ...(lim.audio ? ['-map', '0:a:0?', '-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : ['-an']),
      // HDR с iPhone (HLG/PQ) — в обычный SDR, иначе цвета на сайте выйдут блёклыми
      '-vf', `${p.hdr ? 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,' : ''}${scale},fps='min(source_fps,30)'`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
      '-maxrate', `${Math.round(lim.kbps * 0.9)}k`, '-bufsize', `${lim.kbps * 2}k`,
      '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', tmp);
  }
  fs.renameSync(tmp, dest);
}

export function encodePhoto(src, dest) {
  const tmp = dest + '.tmp.webp';
  ff('-i', src, '-frames:v', '1', '-vf', `scale='min(${PHOTO_MAX},iw)':'min(${PHOTO_MAX},ih)':force_original_aspect_ratio=decrease`, '-c:v', 'libwebp', '-quality', '82', tmp);
  fs.renameSync(tmp, dest);
}

// для MCP-загрузки (tools/fetch-media.mjs): роль по папке
export const limitsFor = dest => (/^media\/reels\//.test(dest) ? LIMITS.reels : LIMITS.sound);

function main() {
  const dry = process.argv.includes('--dry');
  const jsonFiles = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (f.endsWith('.json')) jsonFiles.push(f); } };
  walk('content');

  // все ссылки на медиа и их роль: звук нужен полю reel и рилсам
  const refs = new Map();
  const visit = (v, key) => {
    if (Array.isArray(v)) return v.forEach(x => visit(x, key));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => visit(x, k));
    if (typeof v !== 'string') return;
    const m = v.match(/^\/?(media\/[^?#]+)$/);
    if (!m || !fs.existsSync(m[1])) return;
    const f = m[1];
    const role = /^media\/reels\//.test(f) ? 'reels' : key === 'reel' ? 'sound' : 'silent';
    const prev = refs.get(f);
    refs.set(f, prev === 'reels' || prev === 'sound' ? prev : role);
  };
  for (const f of jsonFiles) visit(JSON.parse(fs.readFileSync(f, 'utf8')));

  const renamed = [];
  const done = [];
  for (const [file, role] of refs) {
    try {
      if (VIDEO.test(file)) {
        const lim = LIMITS[role];
        const { p, out } = videoIssues(file, lim);
        if (!out.length) continue;
        const dest = file.replace(VIDEO, '.mp4');
        if (dest !== file && fs.existsSync(dest)) { console.error(`пропуск ${file}: ${dest} уже есть`); continue; }
        const before = fs.statSync(file).size;
        if (dry) { done.push(`${file}: ${out.join(', ')}`); continue; }
        encodeVideo(file, dest, lim, p);
        if (dest !== file) { fs.rmSync(file); renamed.push([file, dest]); }
        done.push(`${dest}: ${out.join(', ')} — ${(before / 1048576).toFixed(1)} → ${(fs.statSync(dest).size / 1048576).toFixed(1)} МБ`);
      } else if (PHOTO.test(file)) {
        const isWebp = /\.webp$/i.test(file);
        if (isWebp && fs.statSync(file).size < 600 * 1024) continue; // лёгкий webp — заведомо в норме
        let p;
        try { p = probe(file); } catch { continue; }
        if (isWebp && p.w <= PHOTO_MAX && p.h <= PHOTO_MAX) continue;
        const dest = file.replace(PHOTO, '.webp');
        if (dest !== file && fs.existsSync(dest)) { console.error(`пропуск ${file}: ${dest} уже есть`); continue; }
        const before = fs.statSync(file).size;
        if (dry) { done.push(`${file}: ${isWebp ? `${p.w}×${p.h}` : 'не webp'}`); continue; }
        encodePhoto(file, dest);
        if (dest !== file) { fs.rmSync(file); renamed.push([file, dest]); }
        done.push(`${dest}: ${(before / 1024).toFixed(0)} → ${(fs.statSync(dest).size / 1024).toFixed(0)} КБ`);
      }
    } catch (e) {
      console.error(`не удалось сжать ${file}:`, (e.stderr || e.message || '').toString().trim().split('\n').pop());
      for (const t of [file + '.tmp.mp4', file.replace(VIDEO, '.mp4') + '.tmp.mp4', file.replace(PHOTO, '.webp') + '.tmp.webp']) fs.rmSync(t, { force: true });
    }
  }

  // новые пути — в JSON (текстовой заменой, чтобы не менять форматирование файлов CMS)
  if (renamed.length) for (const f of jsonFiles) {
    const src = fs.readFileSync(f, 'utf8');
    let t = src;
    for (const [a, b] of renamed) t = t.split(JSON.stringify(a)).join(JSON.stringify(b)).split(JSON.stringify('/' + a)).join(JSON.stringify('/' + b));
    if (t !== src) fs.writeFileSync(f, t);
  }
  console.log(done.length ? `${dry ? 'сжал бы' : 'сжато'}:\n  ${done.join('\n  ')}` : 'исходники медиа: всё в норме');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
