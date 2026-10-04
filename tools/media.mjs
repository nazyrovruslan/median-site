// Досоздаёт производные файлы для медиа, загруженных через CMS (уже существующие не трогает):
//   видео-обложка X.mp4  → X.hevc.mp4 (легче для Safari), постер X.webp, превью media/thumb/X.webp (520 px)
//   фото обложки Y.*     → превью media/thumb/Y.webp (520 px)
//   ролик кейса R.mp4    → постер R.webp и беззвучный тизер R-teaser.mp4 (6 с, 854 px)
// Нужен ffmpeg. Запуск: node tools/media.mjs   (в деплое — автоматически)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const has = f => fs.existsSync(f);
const made = [];
const make = (out, fn) => { if (has(out)) return; try { fn(); made.push(out); } catch (e) { console.error(`не удалось: ${out}`, e.message); } };
const thumbOf = u => 'media/thumb/' + path.basename(u).replace(/\.\w+$/, '.webp');
const thumb = src => make(thumbOf(src), () => ff('-i', src, '-frames:v', '1', '-vf', "scale='min(520,iw)':-2", '-c:v', 'libwebp', '-quality', '72', thumbOf(src)));
fs.mkdirSync('media/thumb', { recursive: true });
for (const f of fs.readdirSync('content/cases').filter(f => f.endsWith('.json'))) {
  const c = JSON.parse(fs.readFileSync(`content/cases/${f}`, 'utf8'));
  if (c.img && has(c.img)) thumb(c.img);
  if (c.vid && has(c.vid)) {
    const b = c.vid.replace(/\.mp4$/, '');
    make(`${b}.webp`, () => ff('-i', c.vid, '-frames:v', '1', '-vf', "scale='min(1920,iw)':-2", '-c:v', 'libwebp', '-quality', '75', `${b}.webp`));
    if (has(`${b}.webp`)) thumb(`${b}.webp`);
    make(`${b}.hevc.mp4`, () => {
      ff('-i', c.vid, '-an', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx265', '-preset', 'medium', '-crf', '30', '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${b}.hevc.mp4`);
      if (fs.statSync(`${b}.hevc.mp4`).size >= fs.statSync(c.vid).size) fs.copyFileSync(c.vid, `${b}.hevc.mp4`); // HEVC не легче — отдаём тот же h.264
    });
  }
  if (c.reel && has(c.reel)) {
    const r = c.reel.replace(/\.mp4$/, '');
    make(`${r}.webp`, () => ff('-ss', '3', '-i', c.reel, '-frames:v', '1', '-vf', "scale='min(1920,iw)':-2", '-c:v', 'libwebp', '-quality', '75', `${r}.webp`));
    make(`${r}-teaser.mp4`, () => ff('-ss', '2', '-t', '6', '-i', c.reel, '-an', '-vf', "scale='min(854,iw)':-2", '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${r}-teaser.mp4`));
  }
}
console.log(made.length ? `создано:\n  ${made.join('\n  ')}` : 'медиа: всё на месте');
