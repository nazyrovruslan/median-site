// admin/preview.html — копия index.html для живого предпросмотра в конструкторе кейсов (admin/builder.html):
// без счётчиков (Метрика, GA, South HUB), с <base href="../"> и js/preview.js, который принимает черновик кейса из конструктора.
// Файл собирается (в деплое — после простановки ?v= в index.html), в репозиторий не коммитится. Запуск: node tools/build-preview.mjs
import fs from 'fs';
let s = fs.readFileSync('index.html', 'utf8');
const cut = (re, what) => { if (!re.test(s)) throw new Error('build-preview: не нашёл в index.html ' + what); s = s.replace(re, ''); };
cut(/<!-- счётчики[\s\S]*?<\/noscript>\n?/, 'блок счётчиков');
cut(/<link rel="canonical"[^>]*>\n?/, 'canonical');
s = s.replace(/<head>\n/, '<head>\n<base href="../">\n<meta name="robots" content="noindex,nofollow">\n<style>.cookie{display:none!important}</style>\n<script>window.ym=function(){};window.gtag=function(){};window.MEDIAN_PREVIEW=1;</script>\n');
if (!/<script src="js\/main\.js/.test(s)) throw new Error('build-preview: нет js/main.js в index.html');
s = s.replace(/<script src="js\/main\.js/, '<script src="js/case-data.js?v=' + Date.now().toString(36) + '" defer></script>\n<script src="js/preview.js?v=' + Date.now().toString(36) + '" defer></script>\n$&');
fs.writeFileSync('admin/preview.html', s);
console.log('admin/preview.html: готово');
