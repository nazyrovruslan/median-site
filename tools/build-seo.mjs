// SEO: отдельные HTML-страницы кейсов, «О нас», вакансий + sitemap.xml и robots.txt.
// Сайт одностраничный: кейс открывается панелью поверх главной. Раньше прямой адрес кейса (/southhub) отдавал 404.html с кодом 404
// и перенаправлял на главную — поисковики такие адреса не индексируют. Теперь для каждого адреса кладём <id>.html — копию index.html
// со своими title, description, canonical, Open Graph и schema.org. GitHub Pages отдаёт /southhub из southhub.html с кодом 200,
// main.js видит адрес и сразу открывает кейс (страница остаётся на одном уровне с index.html — относительные пути не ломаются).
// Данные — из js/cases.js и js/vacancies.js (их собирают build-cases и build-vacancies из content/), так что мета обновляется сама при каждом деплое.
// Адрес сайта: файл CNAME (свой домен) → https://<домен>/, иначе SITE_URL, иначе GitHub Pages.
// Сгенерированные файлы (<id>.html, about.html, jobs.html, vacancy-*.html, sitemap.xml, robots.txt) в репозиторий не коммитятся: в деплое они остаются в рабочей папке и уходят на Pages.
// Запуск: node tools/build-seo.mjs   (в деплое — после build-cases/build-vacancies и после простановки ?v= в index.html)
import fs from 'fs';
import vm from 'vm';
import { execFileSync } from 'child_process';

const GH = 'https://nazyrovruslan.github.io/median-site/';
const cname = fs.existsSync('CNAME') ? fs.readFileSync('CNAME', 'utf8').trim() : '';
// с 11.11.2026 сайт живёт на median.agency: canonical и sitemap всегда ведут туда, копия на GitHub Pages считается зеркалом
const DOMAIN = 'https://median.agency/';
const SITE = (cname ? `https://${cname}/` : process.env.SITE_URL || DOMAIN).replace(/\/?$/, '/');

const load = (file, name) => { const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8') + `\n;globalThis.__=${name};`, ctx); return ctx.__; };
const CASES_ALL = load('js/cases.js', 'CASES_ALL');
const JOBS = fs.existsSync('js/vacancies.js') ? load('js/vacancies.js', 'JOBS') : { list: [] };

const attr = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// описание до ~160 знаков по границе слова
const clip = (s, n = 160) => { s = plain(s); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n - 30)).replace(/[\s,.;:—–-]+$/, '') + '…'; };
const abs = u => !u ? '' : /^https?:/.test(u) ? u : SITE + u.replace(/^\.?\//, '');
const sentence = s => { s = plain(s); return s && !/[.!?…»]$/.test(s) ? s + '.' : s; };

// даты последней правки — из истории git (в деплое checkout с полной историей коммитов без файлов: filter blob:none)
const gitDate = (path, first) => {
  try {
    const out = execFileSync('git', ['log', ...(first ? ['--diff-filter=A'] : ['-1']), '--format=%cs', '--', path], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return first ? out[out.length - 1] || '' : out[0] || '';
  } catch { return ''; }
};
const caseFile = id => fs.readdirSync('content/cases').map(f => `content/cases/${f}`).find(f => { try { return (JSON.parse(fs.readFileSync(f, 'utf8')).id || f.replace(/^.*\/|\.json$/g, '')) === id; } catch { return false; } });

const index = fs.readFileSync('index.html', 'utf8').split(GH).join(SITE); // старые адреса github.io в разметке → адрес сайта
const HOME_TITLE = (index.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Median';

const ORG = {
  '@type': 'Organization', '@id': SITE + '#org', name: 'Median Agency', alternateName: ['Median', 'median.agency', 'Медиан'],
  url: SITE, logo: SITE + 'media/icon-512.png', email: 'hello@median.agency', telephone: '+7 (862) 291-25-52',
  address: { '@type': 'PostalAddress', addressLocality: 'Сочи', addressCountry: 'RU' }, areaServed: { '@type': 'Country', name: 'Россия' },
  sameAs: ['https://t.me/medianagency', 'https://www.instagram.com/median.agency/', 'https://www.facebook.com/median.agency/', 'https://youtube.com/@median.agency']
};

// заменить содержимое мета-тега / добавить, если его нет
function setMeta(html, sel, value) {
  const [k, v] = sel.split('=');
  const re = new RegExp(`<meta ${k}="${v}" content="[^"]*">`);
  const tag = `<meta ${k}="${v}" content="${attr(value)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', tag + '\n</head>');
}
function page({ path, title, desc, image, imageAlt, type = 'website', robots, ld }) {
  const url = SITE + path;
  let h = index;
  h = h.replace(/<html lang="ru"/, `<html lang="ru" data-home-title="${attr(HOME_TITLE)}"`);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${text(title)}</title>`);
  h = setMeta(h, 'name=description', desc);
  h = setMeta(h, 'property=og:title', title);
  h = setMeta(h, 'property=og:description', desc);
  h = setMeta(h, 'property=og:type', type);
  h = setMeta(h, 'property=og:url', url);
  h = h.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${attr(url)}">`);
  if (image) {
    for (const p of ['property=og:image', 'property=og:image:secure_url', 'name=twitter:image']) h = setMeta(h, p, image);
    h = setMeta(h, 'property=og:image:alt', imageAlt || title);
    h = h.replace(/<meta property="og:image:(type|width|height)" content="[^"]*">\n?/g, ''); // размеры и тип обложки кейса заранее не знаем
  }
  if (robots) h = h.replace('<meta name="viewport"', `<meta name="robots" content="${robots}">\n<meta name="viewport"`);
  // schema.org главной меняем на схему страницы
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [ORG, ...ld] }).replace(/</g, '\\u003c')}</script>`);
  fs.writeFileSync(path + '.html', h);
}
const crumbs = (...items) => ({ '@type': 'BreadcrumbList', itemListElement: [['Главная', SITE], ...items].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });

const sitemap = [{ loc: SITE, lastmod: [gitDate('index.html'), gitDate('content/cases')].sort().pop() }];
let n = 0;

// кейсы
const reserved = new Set(['index', '404', 'privacy', 'consent', 'about', 'jobs']);
for (const k of CASES_ALL) {
  if (!/^[a-z0-9-]+$/.test(k.id) || reserved.has(k.id) || k.id.startsWith('vacancy-')) { console.warn(`seo: пропускаю кейс с адресом «${k.id}»`); continue; }
  const name = plain(k.name);
  const sub = plain(k.sub);
  // подзаголовок в title — если короткий и не повторяет название, иначе формат; в CMS можно задать свои (поле seo)
  const first = s => plain(s).split(/[\s—–-]+/)[0].toLowerCase();
  const tail = [sub, plain(k.format)].find(s => s && s.length <= 70 && first(s) !== first(name)) || '';
  const lc = s => /^[A-ZА-ЯЁ][a-zа-яё]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
  const seo = k.seo || {};
  const title = `${plain(seo.title) || name + (tail ? ' — ' + lc(tail).replace(/[.!]$/, '') : '')} | кейс Median`;
  const details = [k.format, k.city, k.year].map(plain).filter(Boolean).join(' · ');
  const desc = plain(seo.description) || clip([sentence(sub || k.lead), details && sentence(details), 'Кейс event-агентства Median.'].filter(Boolean).join(' '));
  const image = abs(k.img || (k.vid ? k.vid.replace(/\.mp4$/, '.webp') : ''));
  const file = caseFile(k.id);
  const work = { '@type': 'CreativeWork', '@id': SITE + k.id + '#case', name, headline: title.replace(/ \| кейс Median$/, ''), description: desc, url: SITE + k.id, inLanguage: 'ru', creator: { '@id': SITE + '#org' }, ...(image ? { image } : {}), ...(k.city ? { locationCreated: { '@type': 'Place', name: plain(k.city) } } : {}), ...(file && gitDate(file) ? { dateModified: gitDate(file) } : {}) };
  page({ path: k.id, title, desc, image, imageAlt: name, type: 'article', robots: k.hide ? 'noindex' : '', ld: [work, crumbs(['Проекты', SITE + '#directions'], [name, SITE + k.id])] });
  if (!k.hide) sitemap.push({ loc: SITE + k.id, lastmod: file ? gitDate(file) : '' });
  n++;
}

// «О нас»
page({
  path: 'about', title: 'О нас — коммуникационное event-агентство Median',
  desc: 'Median — коммуникационное event-агентство полного цикла: конференции, кэмпы, фестивали бренда работодателя и спецпроекты для IT и банков по всей России. Команда, принципы работы, история, клиенты и награды.',
  ld: [{ '@type': 'AboutPage', name: 'О нас', url: SITE + 'about', about: { '@id': SITE + '#org' } }, crumbs(['О нас', SITE + 'about'])]
});
sitemap.push({ loc: SITE + 'about', lastmod: gitDate('index.html') });
n++;

// вакансии: список и страницы с JobPosting (Google Вакансии)
const jobs = JOBS.list || [];
page({
  path: 'jobs', title: 'Вакансии — работа в event-агентстве Median',
  desc: clip(`Открытые вакансии Median${jobs.length ? ': ' + jobs.map(v => plain(v.name)).join(', ') : ''}. ${plain(JOBS.intro)}`),
  ld: [crumbs(['О нас', SITE + 'about'], ['Вакансии', SITE + 'jobs'])]
});
sitemap.push({ loc: SITE + 'jobs', lastmod: gitDate('content/vacancies') });
n++;
for (const v of jobs) {
  const name = plain(v.name);
  const file = `content/vacancies/${v.id}.json`;
  const title = `Вакансия: ${name}${v.city ? ', ' + plain(v.city) : ''} — Median`;
  const desc = clip(`${name} в event-агентство Median. ${[v.city, v.employment, v.experience && 'опыт ' + v.experience, v.salary].map(plain).filter(Boolean).join(', ')}. ${plain(v.lead)}`);
  const body = [v.lead, ...(v.sections || []).map(s => `<h3>${text(s.h)}</h3><ul>${(s.items || []).map(i => `<li>${text(i)}</li>`).join('')}</ul>`)].filter(Boolean).map(s => s.startsWith('<') ? s : `<p>${text(s).replace(/\n+/g, '</p><p>')}</p>`).join('');
  const posted = gitDate(fs.existsSync(file) ? file : 'content/vacancies', true);
  const sal = String(v.salary || '').replace(/\s/g, '').match(/(\d{4,})/);
  const job = {
    '@type': 'JobPosting', title: name, description: body, url: SITE + 'vacancy-' + v.id, ...(posted ? { datePosted: posted } : {}),
    hiringOrganization: { '@type': 'Organization', name: 'Median Agency', sameAs: SITE, logo: SITE + 'media/icon-512.png' },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: plain(v.city) || 'Сочи', addressCountry: 'RU' } },
    employmentType: /частич/i.test(v.employment) ? 'PART_TIME' : /проект|договор/i.test(v.employment) ? 'CONTRACTOR' : 'FULL_TIME',
    ...(sal ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'RUB', value: { '@type': 'QuantitativeValue', [/^до/i.test(String(v.salary).trim()) ? 'maxValue' : 'minValue']: +sal[1], unitText: 'MONTH' } } } : {})
  };
  page({ path: 'vacancy-' + v.id, title, desc, ld: [job, crumbs(['Вакансии', SITE + 'jobs'], [name, SITE + 'vacancy-' + v.id])] });
  sitemap.push({ loc: SITE + 'vacancy-' + v.id, lastmod: fs.existsSync(file) ? gitDate(file) : '' });
  n++;
}

// главная: адрес сайта в canonical/og, если он не GitHub Pages
fs.writeFileSync('index.html', index);

// sitemap.xml и robots.txt. На GitHub Pages без своего домена robots.txt поисковики ищут в корне nazyrovruslan.github.io, а не в /median-site/ —
// поэтому sitemap там нужно добавить вручную в Яндекс Вебмастере и Google Search Console; со своим доменом всё подхватится само.
fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemap.map(u => `  <url><loc>${text(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n');
// /clients/ (КП) не закрываем в robots.txt: там стоит noindex, а запрет обхода не дал бы поисковику его увидеть (и раскрыл бы раздел)
fs.writeFileSync('robots.txt', `User-agent: *\nDisallow: /admin/\n\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`seo: ${n} страниц, sitemap ${sitemap.length} адресов, сайт ${SITE}`);
