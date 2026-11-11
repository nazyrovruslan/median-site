/* Живой предпросмотр кейса для конструктора (admin/builder.html). Подключается только в admin/preview.html (tools/build-preview.mjs).
   Конструктор шлёт сюда черновик (JSON как в content/cases/<id>.json) через postMessage; кейс собирается тем же кодом, что и на сборке
   (js/case-data.js), подменяется в CASES_ALL и перерисовывается настоящим js/main.js — то есть ровно как будет на сайте.
   Каждому блоку ставится якорь pv-…, чтобы по клику в конструкторе прокрутить к нему. */
(function () {
  let booted = false, queue = null;
  const anchors = {};
  // пометить блоки путями из конструктора: b3 — blocks[3], p1 — parts[1] (баннер проекта), p1b2 — parts[1].blocks[2], a0 — after[0]
  function mark(raw) {
    const d = JSON.parse(JSON.stringify(raw || {}));
    (d.blocks || []).forEach((b, i) => b && typeof b === 'object' && (b._pv = 'b' + i));
    (d.parts || []).forEach((p, j) => { if (!p || typeof p !== 'object') return; p._pv = 'p' + j; (p.blocks || []).forEach((b, i) => b && typeof b === 'object' && (b._pv = 'p' + j + 'b' + i)); });
    (d.after || []).forEach((b, i) => b && typeof b === 'object' && (b._pv = 'a' + i));
    return d;
  }
  function note(text) {
    let n = document.getElementById('pvNote');
    if (!n) { n = document.createElement('div'); n.id = 'pvNote'; n.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#b3261e;color:#fff;font:500 14px/1.4 system-ui,sans-serif;padding:10px 14px;border-radius:10px;pointer-events:none'; document.body.appendChild(n); }
    n.textContent = text; n.hidden = !text;
  }
  function apply(msg) {
    const id = msg.id || (msg.data && msg.data.id);
    if (!id) return;
    let k;
    try { k = caseFromContent(mark(msg.data), id); } catch (e) { note('Предпросмотр: ' + e.message); return; }
    note('');
    for (const key in anchors) delete anchors[key];
    (k.blocks || []).forEach((b, i) => { if (b._pv) { b.a = b.a || 'pv-' + b._pv; anchors[b._pv] = b.a; delete b._pv; } });
    const put = arr => { const i = arr.findIndex(c => c.id === id); if (i >= 0) arr[i] = k; else arr.push(k); };
    put(CASES_ALL);
    if (k.hide) { const i = CASES.findIndex(c => c.id === id); if (i >= 0) CASES.splice(i, 1); } else put(CASES);
    const sheet = document.querySelector('#casePanel .sheet');
    try {
      const M = window.MEDIAN_CASE;
      if (M.openId() === id && document.getElementById('casePanel').classList.contains('on')) {
        const top = sheet ? sheet.scrollTop : 0;
        M.fill(id);
        if (sheet) sheet.scrollTop = top;
      } else M.open(id, null, true);
    } catch (e) { note('Предпросмотр: ' + e.message); return; }
    if (msg.focus) focus(msg.focus);
  }
  function focus(path) {
    const sheet = document.querySelector('#casePanel .sheet');
    // ближайший якорь: блок → его проект серии → верх страницы
    const a = anchors[path] || anchors[path.replace(/b\d+$/, '')];
    const el = a && document.getElementById(a);
    if (!sheet) return;
    if (!el) { if (path === 'top') sheet.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const y = el.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop - 24;
    sheet.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'median-draft') { if (booted) apply(e.data); else queue = e.data; }
    else if (e.data.type === 'median-focus' && booted) focus(e.data.path);
  });
  // после всех defer-скриптов (main.js уже отработал)
  document.addEventListener('DOMContentLoaded', () => {
    booted = true;
    if (queue) { apply(queue); queue = null; }
    if (parent !== window) parent.postMessage({ type: 'median-preview-ready' }, location.origin);
  });
})();
