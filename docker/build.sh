#!/usr/bin/env bash
# Выполняется внутри контейнера сборки. Повторяет шаги деплоя с GitHub Pages.
set -euo pipefail
cd /site

echo "==> Генерация js/cases.js, js/icons.js, js/vacancies.js"
node tools/build-cases.mjs
node tools/build-icons.mjs
node tools/build-vacancies.mjs

echo "==> Производные медиа (досоздаются только недостающие)"
node tools/media.mjs || echo "WARN: tools/media.mjs завершился с ошибкой"

echo "==> Страницы КП (clients/)"
node tools/build-kp.mjs || echo "WARN: tools/build-kp.mjs завершился с ошибкой"

echo "==> Сборка dist/"
mkdir -p dist
cp index.html 404.html consent.html privacy.html dist/
cp -r css js fonts media admin dist/
[ -d clients ] && cp -r clients dist/ || true
# Исходники (content/, tools/), заметки и .git в образ не попадают

echo "==> Готово: $(find dist -type f | wc -l) файлов, $(du -sh dist | cut -f1)"
