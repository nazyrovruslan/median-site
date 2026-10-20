// Рисует обложки превью для КП: clients/<адрес>/og.html → og.png (1200×630) через headless Chrome/Chromium.
// В GitHub Actions Chrome уже установлен (google-chrome). Локально можно указать путь: CHROME=/путь/к/chrome node tools/og-kp.mjs
// og.png рисуется при каждом деплое и сохраняется в репозиторий вместе с КП; без браузера шаг просто пропускается.
// Снимок делается через DevTools-протокол: окно ровно 1200×630, ждём загрузки шрифтов (og.html ставит title «ready»).
// Если картинка вышла пустой (почти одноцветной), старая og.png остаётся — битая обложка на сайт не попадает.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const which = b => { try { return execFileSync('sh', ['-c', `command -v ${b}`]).toString().trim(); } catch { return ''; } };
const chrome = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean)
  || ['/opt/pw-browsers/chromium/chrome-linux/chrome'].find(f => fs.existsSync(f));
if (!chrome) { console.log('og-kp: браузер не найден — обложки превью не нарисованы'); process.exit(0); }
const dirs = fs.existsSync('clients') ? fs.readdirSync('clients').filter(d => fs.existsSync(`clients/${d}/og.html`)) : [];
if (!dirs.length) { console.log('og-kp: 0 обложек'); process.exit(0); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'og-kp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files',
  '--no-first-run', '--no-default-browser-check', '--force-color-profile=srgb', '--force-device-scale-factor=1',
  '--window-size=1200,630', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((ok, fail) => {
  let buf = '';
  const t = setTimeout(() => fail(new Error('Chrome не ответил')), 20000);
  proc.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } });
  proc.on('exit', c => fail(new Error(`Chrome завершился (${c})`)));
});

const ws = new WebSocket(wsUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
let id = 0;
const wait = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
  const n = ++id;
  wait.set(n, m => m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result));
  ws.send(JSON.stringify({ id: n, method, params, sessionId }));
});

// проверка снимка: уменьшаем до 16×16 — у нормальной обложки (фото или серый фон с заголовком) есть перепады яркости,
// у неудачного снимка (пустой или почти одноцветный кадр) их нет
const okShot = file => {
  const px = [...execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', 'scale=16:16', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'])];
  const avg = px.reduce((a, b) => a + b, 0) / px.length, sd = Math.sqrt(px.reduce((a, b) => a + (b - avg) ** 2, 0) / px.length);
  return { ok: px.length === 256 && sd > 6 && avg > 12, info: `яркость ${avg.toFixed(0)}, разброс ${sd.toFixed(1)}` };
};

let done = 0;
try {
  for (const d of dirs) {
    const html = path.resolve(`clients/${d}/og.html`), png = path.resolve(`clients/${d}/og.png`), tmp = png.replace(/\.png$/, '.new.png');
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    try {
      await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false }, sessionId);
      await send('Page.enable', {}, sessionId);
      await send('Page.navigate', { url: 'file://' + html }, sessionId);
      let ready = false;
      for (let i = 0; i < 100 && !ready; i++) {
        await sleep(100);
        const r = await send('Runtime.evaluate', { expression: 'document.readyState === "complete" && document.title === "ready"', returnByValue: true }, sessionId);
        ready = r.result.value === true;
      }
      await sleep(200);
      const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 }, captureBeyondViewport: false }, sessionId);
      fs.writeFileSync(tmp, Buffer.from(data, 'base64'));
      const chk = okShot(tmp);
      if (ready && chk.ok) { fs.renameSync(tmp, png); done++; }
      else { fs.rmSync(tmp); console.log(`og-kp: ${d} — снимок не удался (ready=${ready}, ${chk.info}), оставлена прежняя обложка`); }
    } finally {
      await send('Target.closeTarget', { targetId }).catch(() => {});
    }
  }
} finally {
  ws.close();
  proc.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
console.log(`og-kp: ${done} из ${dirs.length} обложек`);
