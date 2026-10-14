// Рисует обложки превью для КП: clients/<адрес>/og.html → og.png (1200×630) через headless Chrome/Chromium.
// В GitHub Actions Chrome уже установлен (google-chrome). Локально можно указать путь: CHROME=/путь/к/chrome node tools/og-kp.mjs
// og.png рисуется при каждом деплое и сохраняется в репозиторий вместе с КП; без браузера шаг просто пропускается.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const which = b => { try { return execFileSync('sh', ['-c', `command -v ${b}`]).toString().trim(); } catch { return ''; } };
const chrome = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean)
  || ['/opt/pw-browsers/chromium/chrome-linux/chrome'].find(f => fs.existsSync(f));
if (!chrome) { console.log('og-kp: браузер не найден — обложки превью не нарисованы'); process.exit(0); }
const dirs = fs.existsSync('clients') ? fs.readdirSync('clients').filter(d => fs.existsSync(`clients/${d}/og.html`)) : [];
for (const d of dirs) {
  const html = path.resolve(`clients/${d}/og.html`), png = path.resolve(`clients/${d}/og.png`);
  // окно с запасом по высоте (headless отнимает часть окна под интерфейс), потом обрезаем до 1200×630 через ffmpeg
  const tmp = png.replace(/\.png$/, '.full.png');
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', '--window-size=1200,900', '--virtual-time-budget=5000', `--screenshot=${tmp}`, 'file://' + html], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'crop=1200:630:0:0', png]);
  fs.rmSync(tmp);
}
console.log(`og-kp: ${dirs.length} обложек`);
