/* Кейс из content/cases/<id>.json → объект, который ждёт js/main.js (поле в CASES_ALL).
   Один код на сборку (tools/build-cases.mjs) и на живой предпросмотр в конструкторе (admin/builder.html → admin/preview.html).
   Пустые поля выкидываются; кейс-серия (kind: series) разворачивается в обычный список blocks. */
(function (g) {
  const empty = v => v == null || v === '' || (Array.isArray(v) && v.length === 0);
  const clean = o => {
    if (Array.isArray(o)) return o.map(clean).filter(v => !empty(v));
    if (o && typeof o === 'object') {
      const r = {};
      for (const [k, v] of Object.entries(o)) { const c = clean(v); if (!empty(c) && c !== false) r[k] = c; }
      return r;
    }
    return typeof o === 'string' ? o.trim() : o;
  };
  function caseFromContent(raw, fileId) {
    const c = clean(raw);
    c.id = c.id || fileId;
    if (!c.name) throw new Error(`${fileId}: нет названия (name)`);
    if (!c.dir) c.dir = 'external';
    if (!Array.isArray(c.c) || c.c.length < 3) c.c = ['#555555', '#999999', '#111111']; // фон-заглушка, пока нет фото
    // заголовок по строкам: в CMS — [{text, outline}], на сайте — [[текст, 1 — контур / 0 — заливка]]
    if (c.ttl) c.ttl = c.ttl.map(l => [l.text, l.outline ? 1 : 0]);
    if (c.light) c.light = 1;
    // кейс-серия (ежегодный проект, роуд-шоу, сезоны): общая часть, затем проекты серии (баннер + свои блоки), блоки «после», итоги по проектам.
    // На сайт уходит обычным списком blocks — js/main.js про серии не знает
    if (c.kind === 'series') {
      const parts = c.parts || [];
      // якорь на первый блок каждого проекта + оглавление (блок toc в общей части): строки — проекты серии со ссылкой на якорь
      const pre = `${c.id}-p`;
      (c.blocks || []).forEach(b => { if (b.t === 'toc') b.rows = parts.map((p, i) => ({ n: String(i + 1).padStart(2, '0'), name: p.toc || p.out || p.y, text: (p.sub || p.y || '').replace(/^\d+\s*\/\s*\d+\s*·\s*/, ''), img: p.img, go: pre + (i + 1) })); });
      c.blocks = [...(c.blocks || []),
        ...parts.flatMap((p, i) => [...((p.img || p.vid) && p.out ? [{ t: 'banner', img: p.img, vid: p.vid, out: p.out, solid: p.solid, text: p.text, side: p.side, _pv: p._pv }] : []), ...(p.blocks || [])].map((b, k) => k ? b : { ...b, a: pre + (i + 1) })),
        ...(c.after || []),
        ...(parts.some(p => p.stats) ? [{ t: 'years', out: c.total_out || 'Итоги', solid: c.total, text: c.total_text, desc: c.desc ? 1 : 0, sum: c.sum, rows: parts.map(p => ({ y: p.y, sub: p.sub, items: p.stats || [] })) }] : [])
      ].map(clean);
      for (const k of ['parts', 'after', 'total', 'total_out', 'total_text', 'desc', 'sum']) delete c[k];
    }
    delete c.kind;
    // в блоке «pairs» слово может быть пустым — сайт ждёт строку
    (c.blocks || []).forEach(b => { if (b.t === 'pairs') (b.items || []).forEach(i => { if (i.word == null) i.word = ''; }); });
    return c;
  }
  g.caseFromContent = caseFromContent;
  if (typeof module !== 'undefined' && module.exports) module.exports = { caseFromContent };
})(typeof window !== 'undefined' ? window : globalThis);
