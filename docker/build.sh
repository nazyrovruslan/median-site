#!/usr/bin/env bash
# Выполняется внутри контейнера сборки.
set -euo pipefail
cd /site

# Обязательные генераторы
required=(build-cases build-icons build-vacancies)
done_list=" "
for n in "${required[@]}"; do
  echo "==> $n"
  node "tools/$n.mjs"
  done_list+="$n "
done

# Производные медиа
[ -f tools/media.mjs ] && { echo "==> media"; node tools/media.mjs || echo "WARN: media.mjs упал"; }

# Остальные tools/build-*.mjs (КП, sitemap и т.п.) подхватываются сами
for f in tools/build-*.mjs; do
  n="$(basename "$f" .mjs)"
  case "$done_list" in *" $n "*) continue ;; esac
  echo "==> $n"
  if [ "$n" = "build-kp" ]; then node "$f" || echo "WARN: build-kp упал"; else node "$f"; fi
done

# Выкладка: всё, кроме исходников и служебного
echo "==> Сборка dist/"
rm -rf dist && mkdir -p dist
rsync -a \
  --exclude='/.git' --exclude='/.github' --exclude='/node_modules' --exclude='/dist' \
  --exclude='/content' --exclude='/tools' --exclude='/docker' --exclude='/deploy' \
  --exclude='/*.md' --exclude='/.gitignore' --exclude='/.nojekyll' --exclude='/.env*' \
  --exclude='/Dockerfile' --exclude='/docker-compose.yml' --exclude='/Caddyfile' \
  --exclude='/deploy.sh' --exclude='/.dockerignore' \
  ./ dist/

echo "==> Готово: $(find dist -type f | wc -l) файлов, $(du -sh dist | cut -f1)"