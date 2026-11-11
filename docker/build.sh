#!/usr/bin/env bash
# Выполняется внутри контейнера сборки (Dockerfile на ветке deploy). Повторяет шаги деплоя с GitHub Pages (.github/workflows/pages.yml).
# Ветку deploy после каждой сборки main обновляет pages.yml (шаг «Сервер median.agency: ветка deploy»), он же запускает deploy.sh на сервере.
set -euo pipefail
cd /site

echo "==> Счётчики, главная и «О нас» из content/ (уже собраны ботом в main — повтор безвреден)"
node tools/sync-counters.mjs
node tools/build-pages.mjs

echo "==> Генерация js/cases.js, js/icons.js, js/vacancies.js"
node tools/build-cases.mjs
node tools/build-icons.mjs
node tools/build-vacancies.mjs

echo "==> Производные медиа (досоздаются только недостающие)"
node tools/media.mjs || echo "WARN: tools/media.mjs завершился с ошибкой"

echo "==> Страницы КП (clients/)"
node tools/build-kp.mjs || echo "WARN: tools/build-kp.mjs завершился с ошибкой"

echo "==> SEO: страницы кейсов, about.html, jobs.html, вакансии, sitemap.xml, robots.txt"
node tools/build-seo.mjs || echo "WARN: tools/build-seo.mjs завершился с ошибкой"
node tools/build-preview.mjs || echo "WARN: tools/build-preview.mjs завершился с ошибкой"

echo "==> Сборка dist/"
mkdir -p dist
cp ./*.html dist/
cp sitemap.xml robots.txt dist/ 2>/dev/null || true
cp -r css js fonts media admin dist/
[ -d clients ] && cp -r clients dist/ || true
# Исходники (content/, tools/, mcp/), заметки и .git в образ не попадают

echo "==> Готово: $(find dist -type f | wc -l) файлов, $(du -sh dist | cut -f1)"
