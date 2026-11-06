#!/usr/bin/env bash
# Запускается на сервере: подтягивает ветку deploy и пересобирает контейнер.
set -euo pipefail
cd "$(dirname "$0")"

git fetch origin deploy
git reset --hard origin/deploy

docker compose up -d --build --remove-orphans
docker image prune -f
echo "Деплой завершён: $(git rev-parse --short HEAD)"
