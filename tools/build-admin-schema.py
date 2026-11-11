# admin/schema.json — поля кейсов из admin/config.yml (Sveltia) для конструктора кейсов admin/builder.html:
# одна схема на обе админки, новые блоки и поля добавляются только в config.yml. Запуск: python3 tools/build-admin-schema.py
import json, yaml
cfg = yaml.safe_load(open('admin/config.yml', encoding='utf-8'))
cols = {c['name']: c for c in cfg['collections']}
out = {
    'media_folder': cfg.get('media_folder'),
    'collections': {n: {k: cols[n].get(k) for k in ('name', 'label', 'label_singular', 'description', 'folder', 'filter', 'fields')} for n in ('cases', 'series')},
    # пиктограммы к цифрам (relation на settings/icons) — список из content/settings/icons.json конструктор читает сам
    'icons_file': next((f['file'] for f in cols['settings']['files'] if f['name'] == 'icons'), None),
}
json.dump(out, open('admin/schema.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('admin/schema.json:', sum(len(c['fields']) for c in out['collections'].values()), 'полей верхнего уровня')
