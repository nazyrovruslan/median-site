// MCP-сервер контента median.agency (Cloudflare Worker).
// Даёт Claude те же права, что у админки /admin: создать и править кейсы (проект и серия),
// вакансии, настройки (пиктограммы цифр, страница вакансий), загрузить фото и видео.
// КП сюда сознательно не входят — их правят в /admin или в чате с Claude.
// Каждое изменение — коммит в main через GitHub API, дальше сайт собирается как после /admin.
//
// Протокол: MCP Streamable HTTP без сессий (POST JSON-RPC → JSON). Адрес: https://<воркер>/mcp/<MCP_SECRET>
// Секреты воркера: GH_TOKEN (fine-grained токен GitHub на этот репозиторий: Contents и Actions — read and write), MCP_SECRET.
// Настройка и деплой — mcp/README.md.

const REPO = 'nazyrovruslan/median-site';
const BRANCH = 'main';
const SITE = 'https://nazyrovruslan.github.io/median-site/';
const PROTOCOL = '2025-06-18';

// коллекции, как в admin/config.yml
const COLLECTIONS = {
  cases: { dir: 'content/cases', label: 'кейс' },
  vacancies: { dir: 'content/vacancies', label: 'вакансия' },
};
const SETTINGS = {
  icons: 'content/settings/icons.json', // пиктограммы к цифрам
  jobs: 'content/settings/jobs.json', // страница вакансий: почта, вступление, руководитель
};
const MEDIA = { cases: 'media/cases', video: 'media/video', vacancies: 'media/vacancies', team: 'media/team', icons: 'media/icons' };
const ID_RE = /^[a-z0-9-]+$/;

const INSTRUCTIONS = `Контент сайта median.agency (${SITE}). Источник правды — JSON в репозитории ${REPO}, ветка ${BRANCH}; каждое сохранение — коммит, сайт пересобирается сам за 2–4 минуты (проверить — site_status).
Кейсы двух видов в одной папке: kind "project" — один проект, kind "series" — ежегодный проект, роуд-шоу, сезоны (несколько проектов на одной странице).
Прежде чем создавать или менять запись: посмотри схему полей (get_schema) и похожий существующий кейс или вакансию (get_item) и повторяй их структуру и тон. Страница кейса собирается из blocks: [{t: тип, ...}] — типы и поля блоков в схеме.
Порядок (order): меньше — выше, шаг 10; первые 5 кейсов — баннер на главной. Новый кейс без явной просьбы ставь в конец списка или с hide: true, если пользователь не сказал публиковать.
Фото и видео сначала загрузи (upload_media), потом впиши возвращённый путь в поле. Фото сжимаются в webp, видео в mp4 h.264, upload_media сразу возвращает итоговый путь.
Удаление необратимо для сайта — переспроси пользователя перед delete_item.`;

const TOOLS = [
  {
    name: 'list_items',
    description: 'Список кейсов или вакансий: id, порядок, название, вид кейса (project/series), скрыт ли. Отсортирован по order.',
    inputSchema: { type: 'object', properties: { collection: { type: 'string', enum: Object.keys(COLLECTIONS) } }, required: ['collection'] },
  },
  {
    name: 'get_item',
    description: 'Полный JSON кейса или вакансии по id.',
    inputSchema: { type: 'object', properties: { collection: { type: 'string', enum: Object.keys(COLLECTIONS) }, id: { type: 'string' } }, required: ['collection', 'id'] },
  },
  {
    name: 'get_schema',
    description: 'Описание полей из настроек админки (admin/config.yml): названия, подсказки, варианты значений, типы блоков страницы кейса. cases — проект, series — серия проектов.',
    inputSchema: { type: 'object', properties: { collection: { type: 'string', enum: ['cases', 'series', 'vacancies', 'settings'] } }, required: ['collection'] },
  },
  {
    name: 'create_item',
    description: 'Создать кейс или вакансию. data — JSON записи как в существующих файлах; id в data проставится сам. Для кейса укажи kind: "project" или "series". Ошибка, если такой id уже есть.',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: Object.keys(COLLECTIONS) },
        id: { type: 'string', description: 'латиница в нижнем регистре, цифры, дефис; станет адресом страницы' },
        data: { type: 'object' },
      },
      required: ['collection', 'id', 'data'],
    },
  },
  {
    name: 'update_item',
    description: 'Изменить кейс или вакансию. По умолчанию patch сливается с записью: вложенные объекты сливаются, массивы (blocks, tags, sections…) заменяются целиком, null удаляет поле. replace: true — заменить запись целиком.',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: Object.keys(COLLECTIONS) },
        id: { type: 'string' },
        patch: { type: 'object' },
        replace: { type: 'boolean', default: false },
      },
      required: ['collection', 'id', 'patch'],
    },
  },
  {
    name: 'delete_item',
    description: 'Удалить кейс или вакансию (файл уйдёт из репозитория, страница — с сайта). Вакансию лучше скрыть: update_item с on: false; кейс — hide: true. Требует confirm_id, равный id.',
    inputSchema: {
      type: 'object',
      properties: { collection: { type: 'string', enum: Object.keys(COLLECTIONS) }, id: { type: 'string' }, confirm_id: { type: 'string' } },
      required: ['collection', 'id', 'confirm_id'],
    },
  },
  {
    name: 'get_settings',
    description: 'Настройки: icons — пиктограммы к цифрам кейсов, jobs — страница вакансий (почта, вступление, руководитель по умолчанию).',
    inputSchema: { type: 'object', properties: { name: { type: 'string', enum: Object.keys(SETTINGS) } }, required: ['name'] },
  },
  {
    name: 'update_settings',
    description: 'Изменить настройки icons или jobs. patch сливается так же, как в update_item; replace: true — заменить целиком.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', enum: Object.keys(SETTINGS) }, patch: { type: 'object' }, replace: { type: 'boolean', default: false } },
      required: ['name', 'patch'],
    },
  },
  {
    name: 'upload_media',
    description: 'Загрузить файл в репозиторий и получить путь для JSON. Источник — url (прямая ссылка; публичные ссылки на файл в Яндекс Диске и Google Drive тоже подходят) или base64 до 1 МБ (svg пиктограмм). Фото для cases/vacancies/team сжимаются в webp до 2400 px — вернётся путь уже с .webp. Видео (папка video) пережимаются в mp4 h.264 до 1920 px — можно давать исходник mov/4K, вернётся путь с .mp4; беззвучные обложки сборка дожмёт до 1280 px и уберёт звук. Папки: cases — фото кейсов, video — видео (обложки без звука 6–10 с, ролики), vacancies — обложки вакансий, team — портреты, icons — svg пиктограмм. Постеры и превью видео сделаются при деплое.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', enum: Object.keys(MEDIA) },
        filename: { type: 'string', description: 'латиница, например southhub-2026-1.jpg' },
        url: { type: 'string' },
        base64: { type: 'string' },
        overwrite: { type: 'boolean', default: false },
      },
      required: ['folder', 'filename'],
    },
  },
  {
    name: 'list_media',
    description: 'Файлы в папке медиа (имя и размер), можно отфильтровать по началу имени.',
    inputSchema: { type: 'object', properties: { folder: { type: 'string', enum: Object.keys(MEDIA) }, prefix: { type: 'string' } }, required: ['folder'] },
  },
  {
    name: 'site_status',
    description: 'Последние коммиты в main и статус сборки сайта: дошли ли правки до сайта.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ---------- HTTP ----------

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
    if (url.pathname === '/' || url.pathname === '/health') return text('median MCP: ok');
    if (!authorized(url, req, env)) return text('not found', 404);
    if (req.method === 'GET') return text('MCP: POST JSON-RPC here', 405, { Allow: 'POST' });
    if (req.method === 'DELETE') return new Response(null, { status: 204, headers: cors() });
    if (req.method !== 'POST') return text('method not allowed', 405);

    let body;
    try { body = await req.json(); } catch { return json(rpcError(null, -32700, 'Parse error'), 400); }
    const ctx = { env, gh: github(env) };
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map(m => handle(m, ctx)))).filter(Boolean);
      return out.length ? json(out) : new Response(null, { status: 202, headers: cors() });
    }
    const res = await handle(body, ctx);
    return res ? json(res) : new Response(null, { status: 202, headers: cors() });
  },
};

function authorized(url, req, env) {
  if (!env.MCP_SECRET) return false;
  const m = url.pathname.match(/^\/mcp\/([^/]+)\/?$/);
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const given = m ? decodeURIComponent(m[1]) : url.pathname.replace(/\/$/, '') === '/mcp' ? bearer || url.searchParams.get('key') || '' : '';
  return safeEqual(given, env.MCP_SECRET);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const cors = () => ({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS' });
const text = (s, status = 200, h = {}) => new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...cors(), ...h } });
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...cors() } });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

// ---------- JSON-RPC ----------

export async function handle(msg, ctx) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(msg?.id ?? null, -32600, 'Invalid Request');
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined;
  try {
    let result;
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: params.protocolVersion || PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'median-site', title: 'Сайт median.agency', version: '1.0.0' },
          instructions: INSTRUCTIONS,
        };
        break;
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      case 'tools/call':
        result = await callTool(params.name, params.arguments || {}, ctx);
        break;
      default:
        if (method.startsWith('notifications/')) return null;
        return isNotification ? null : rpcError(id, -32601, `Method not found: ${method}`);
    }
    return isNotification ? null : { jsonrpc: '2.0', id, result };
  } catch (e) {
    return isNotification ? null : rpcError(id, -32603, String(e?.message || e));
  }
}

async function callTool(name, args, ctx) {
  const fn = HANDLERS[name];
  if (!fn) throw new Error(`Нет инструмента ${name}`);
  try {
    const out = await fn(args, ctx);
    return { content: [{ type: 'text', text: typeof out === 'string' ? out : JSON.stringify(out, null, 2) }] };
  } catch (e) {
    // ошибки инструмента возвращаем модели как результат, чтобы она могла поправиться
    return { isError: true, content: [{ type: 'text', text: String(e?.message || e) }] };
  }
}

// ---------- инструменты ----------

const HANDLERS = {
  async list_items({ collection }, { gh }) {
    const c = coll(collection);
    const files = await gh.readDir(c.dir);
    return files
      .map(f => {
        const d = safeParse(f.text) || {};
        const row = { id: d.id || f.name.replace(/\.json$/, ''), order: d.order, name: d.name };
        if (collection === 'cases') Object.assign(row, { kind: d.kind || 'project', sub: d.sub, year: d.year, hide: !!d.hide, url: SITE + row.id });
        else Object.assign(row, { on: d.on !== false, url: SITE + 'vacancy-' + row.id });
        return row;
      })
      .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  },

  async get_item({ collection, id }, { gh }) {
    const f = await gh.getFile(itemPath(collection, id));
    if (!f) throw new Error(`Не найдено: ${collection}/${id}`);
    return f.text;
  },

  async get_schema({ collection }, { gh }) {
    const f = await gh.getFile('admin/config.yml');
    const cfg = f.text;
    if (collection === 'settings') return yamlSection(cfg, 'settings').replace(/\n {6}- name: kp\n[\s\S]*$/, '\n') + '\n# настройки КП в MCP не правятся';
    const parts = collection === 'series' ? ['series', 'cases'] : [collection];
    const head = collection === 'series' ? '# Серия проектов. Поля с *cf_… описаны якорями &cf_… в секции cases (ниже).\n' : '';
    return head + parts.map(p => yamlSection(cfg, p)).join('\n');
  },

  async create_item({ collection, id, data }, { gh }) {
    const path = itemPath(collection, id);
    if (await gh.getFile(path)) throw new Error(`${collection}/${id} уже есть — используйте update_item или другой id`);
    const rec = normalize(collection, id, { ...data });
    await gh.putText(path, serialize(rec), `MCP: создан ${collection} ${id}`);
    return { ok: true, path, url: pageUrl(collection, id), note: 'Сайт обновится через 2–4 минуты (site_status).' };
  },

  async update_item({ collection, id, patch, replace = false }, { gh }) {
    const path = itemPath(collection, id);
    const f = await gh.getFile(path);
    if (!f) throw new Error(`Не найдено: ${collection}/${id}`);
    const cur = JSON.parse(f.text);
    const next = normalize(collection, id, replace ? { ...patch } : merge(cur, patch));
    const out = serialize(next);
    if (out === f.text) return { ok: true, unchanged: true };
    await gh.putText(path, out, `MCP: правка — ${collection} ${id}`, f.sha);
    return { ok: true, path, url: pageUrl(collection, id), changed: changedKeys(cur, next) };
  },

  async delete_item({ collection, id, confirm_id }, { gh }) {
    if (confirm_id !== id) throw new Error('confirm_id должен совпадать с id');
    const path = itemPath(collection, id);
    const f = await gh.getFile(path);
    if (!f) throw new Error(`Не найдено: ${collection}/${id}`);
    await gh.del(path, `MCP: удалён ${collection} ${id}`, f.sha);
    return { ok: true, deleted: path };
  },

  async get_settings({ name }, { gh }) {
    const f = await gh.getFile(settingsPath(name));
    return f ? f.text : '{}';
  },

  async update_settings({ name, patch, replace = false }, { gh }) {
    const path = settingsPath(name);
    const f = await gh.getFile(path);
    const cur = f ? JSON.parse(f.text) : {};
    const out = serialize(replace ? patch : merge(cur, patch));
    if (f && out === f.text) return { ok: true, unchanged: true };
    await gh.putText(path, out, `MCP: правка — settings ${name}`, f?.sha);
    return { ok: true, path };
  },

  async upload_media({ folder, filename, url, base64, overwrite = false }, { gh }) {
    const dir = MEDIA[folder];
    if (!dir) throw new Error(`Папка: ${Object.keys(MEDIA).join(', ')}`);
    let name = cleanName(filename);
    // фото кейсов, обложки вакансий и портреты на сайте — webp до 2400 px (как в /admin)
    const toWebp = /\.(jpe?g|png|webp|heic|heif)$/i.test(name) && ['cases', 'vacancies', 'team'].includes(folder);
    if (toWebp) name = name.replace(/\.\w+$/, '.webp');
    // видео (mov, hevc с iPhone, 4K…) пережимаются в mp4 h.264 в GitHub Actions — путь сразу с .mp4
    const toMp4 = /\.(mov|m4v|webm|avi|mkv|mp4)$/i.test(name) && folder === 'video';
    if (toMp4) name = name.replace(/\.\w+$/, '.mp4');
    const path = `${dir}/${name}`;
    const old = await gh.meta(path);
    if (old && !overwrite) throw new Error(`${path} уже есть — другое имя или overwrite: true`);
    if (base64) {
      // небольшие файлы (svg, маленькие картинки) — сразу коммитом
      const bytes = b64ToBytes(base64.replace(/^data:[^,]+,/, ''));
      if (bytes.length > 1024 * 1024) throw new Error('base64 больше 1 МБ — дайте ссылку (url)');
      if (toWebp || toMp4) throw new Error('Фото и видео через base64 не сжимаются — дайте ссылку (url) или загрузите в /admin');
      await gh.putBytes(path, bytes, `MCP: загружен файл ${path}`, old?.sha);
      return { ok: true, path, size: bytes.length };
    }
    if (!/^https:\/\//.test(url || '')) throw new Error('Нужен url (https) или base64');
    // скачивание, сжатие и коммит — в GitHub Actions (.github/workflows/media.yml): там нет лимитов воркера и есть ffmpeg
    await gh.dispatch('media.yml', { url, path });
    return {
      ok: true,
      path,
      queued: true,
      note: 'Файл скачивается и сжимается в GitHub Actions, в репозитории появится через ~1 минуту, после чего сайт пересоберётся сам. Путь можно сразу вписывать в JSON. Если не появился — site_status покажет ошибку загрузки.',
    };
  },

  async list_media({ folder, prefix = '' }, { gh }) {
    const dir = MEDIA[folder];
    if (!dir) throw new Error(`Папка: ${Object.keys(MEDIA).join(', ')}`);
    const list = await gh.api(`/contents/${dir}?ref=${BRANCH}`);
    return list.filter(f => f.type === 'file' && f.name.startsWith(prefix)).map(f => ({ path: f.path, size: f.size }));
  },

  async site_status(_, { gh }) {
    const commits = await gh.api(`/commits?sha=${BRANCH}&per_page=6`);
    const runs = async wf => {
      try {
        const r = await gh.api(`/actions/workflows/${wf}/runs?per_page=4`);
        return r.workflow_runs.map(w => ({ status: w.status, result: w.conclusion, title: w.display_title, started: w.created_at, url: w.html_url }));
      } catch (e) {
        return [{ note: 'Нет доступа к Actions у токена (нужно Actions: read and write)' }];
      }
    };
    return {
      site: SITE,
      commits: commits.map(c => ({ sha: c.sha.slice(0, 7), date: c.commit.author.date, message: c.commit.message.split('\n')[0] })),
      builds: await runs('pages.yml'),
      uploads: await runs('media.yml'),
      hint: 'Сборка с [skip ci] — это бот сохранил сгенерированные файлы. Правка на сайте, когда сборка её коммита completed/success.',
    };
  },
};

// ---------- данные ----------

function coll(collection) {
  const c = COLLECTIONS[collection];
  if (!c) throw new Error(`Коллекция: ${Object.keys(COLLECTIONS).join(', ')} (КП через MCP не правятся)`);
  return c;
}

function itemPath(collection, id) {
  const c = coll(collection);
  if (!ID_RE.test(id || '')) throw new Error('id: только латиница в нижнем регистре, цифры и дефис');
  return `${c.dir}/${id}.json`;
}

const settingsPath = name => SETTINGS[name] || (() => { throw new Error(`Настройки: ${Object.keys(SETTINGS).join(', ')}`); })();
const pageUrl = (collection, id) => SITE + (collection === 'vacancies' ? 'vacancy-' : '') + id;

function normalize(collection, id, d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('data должен быть объектом');
  if (d.id && d.id !== id) throw new Error(`id в data (${d.id}) не совпадает с ${id}; переименование — создать новый и удалить старый`);
  if (!d.name) throw new Error('Нужно поле name');
  if (d.order !== undefined && typeof d.order !== 'number') d.order = Number(d.order);
  if (d.order !== undefined && !Number.isFinite(d.order)) throw new Error('order — число');
  // id и kind — в начале, как пишет админка
  const head = { order: d.order, id };
  if (collection === 'cases') {
    const kind = d.kind || 'project';
    if (!['project', 'series'].includes(kind)) throw new Error('kind: project или series');
    head.kind = kind;
  }
  const out = { ...head, ...d, id };
  if (out.order === undefined) delete out.order;
  if (collection === 'cases') out.kind = head.kind;
  return out;
}

function merge(a, b) {
  if (!isObj(a) || !isObj(b)) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === null) delete out[k];
    else out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  }
  return out;
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const serialize = o => JSON.stringify(o, null, 2) + '\n';
const safeParse = s => { try { return JSON.parse(s); } catch { return null; } };
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

// секция коллекции из admin/config.yml: от «  - name: X» до следующей коллекции
export function yamlSection(cfg, name) {
  const lines = cfg.split('\n');
  const start = lines.findIndex(l => l === `  - name: ${name}`);
  if (start < 0) return '';
  let end = lines.findIndex((l, i) => i > start && /^ {2}- name: /.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join('\n');
}

function cleanName(s) {
  const n = String(s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
  if (!/^[a-z0-9][a-z0-9._-]*\.[a-z0-9]{2,5}$/.test(n)) throw new Error('filename: латиница, цифры, дефис и расширение, например southhub-2026-1.jpg');
  return n;
}

// ---------- GitHub ----------

function github(env) {
  const base = `https://api.github.com/repos/${REPO}`;
  const headers = {
    authorization: `Bearer ${env.GH_TOKEN}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'median-mcp',
  };
  const api = async (p, init = {}) => {
    const r = await fetch(p.startsWith('http') ? p : base + p, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    if (r.status === 404) return null;
    const body = await r.text();
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${body.slice(0, 300)}`);
    return body ? JSON.parse(body) : {};
  };
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  const meta = async path => {
    const m = await api(`/contents/${enc(path)}?ref=${BRANCH}`);
    return m && !Array.isArray(m) ? m : null;
  };
  const getFile = async path => {
    const m = await meta(path);
    if (!m) return null;
    // больше 1 МБ contents API отдаёт без содержимого — тогда через blob
    const b64 = m.content || (await api(`/git/blobs/${m.sha}`)).content;
    return { sha: m.sha, text: new TextDecoder().decode(b64ToBytes(b64)) };
  };
  const put = async (path, b64, message, sha) =>
    api(`/contents/${enc(path)}`, { method: 'PUT', body: JSON.stringify({ message, content: b64, branch: BRANCH, ...(sha ? { sha } : {}) }) });
  return {
    api: async p => {
      const r = await api(p);
      if (r === null) throw new Error('GitHub 404: ' + p);
      return r;
    },
    meta,
    getFile,
    putText: (path, s, message, sha) => put(path, bytesToB64(new TextEncoder().encode(s)), message, sha),
    putBytes: (path, bytes, message, sha) => put(path, bytesToB64(bytes), message, sha),
    dispatch: (wf, inputs) => api(`/actions/workflows/${wf}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: BRANCH, inputs }) }),
    del: (path, message, sha) => api(`/contents/${enc(path)}`, { method: 'DELETE', body: JSON.stringify({ message, sha, branch: BRANCH }) }),
    // вся папка одним запросом (GraphQL), чтобы не упереться в лимит подзапросов воркера
    readDir: async dir => {
      const [owner, name] = REPO.split('/');
      const query = `query($o:String!,$n:String!,$e:String!){repository(owner:$o,name:$n){object(expression:$e){...on Tree{entries{name type object{...on Blob{text}}}}}}}`;
      const r = await api('https://api.github.com/graphql', { method: 'POST', body: JSON.stringify({ query, variables: { o: owner, n: name, e: `${BRANCH}:${dir}` } }) });
      if (r?.errors) throw new Error('GitHub GraphQL: ' + JSON.stringify(r.errors).slice(0, 300));
      const entries = r?.data?.repository?.object?.entries || [];
      return entries.filter(e => e.type === 'blob' && e.name.endsWith('.json')).map(e => ({ name: e.name, text: e.object?.text || '' }));
    },
  };
}

function b64ToBytes(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
