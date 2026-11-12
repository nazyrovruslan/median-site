#!/usr/bin/env bash
# Проверка Caddyfile в настоящем Caddy (как на сервере: caddy:2-alpine) до выкладки.
# Неверный конфиг = 502 на всём сайте, поэтому деплой на сервер идёт только если проверка прошла.
set -euo pipefail
SRV=${1:-dist}
docker run --rm -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
# смоук: поднять Caddy на собранном сайте и проверить ключевые адреса
docker rm -f caddy-check >/dev/null 2>&1 || true
docker run -d --name caddy-check -p 18080:80 -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" -v "$PWD/$SRV:/srv:ro" caddy:2-alpine >/dev/null
for i in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:18080/ && break; sleep 1; done
fail=0
chk(){ got=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "http://127.0.0.1:18080$1"); case "$got" in $2*) echo "ok   $1 → $got";; *) echo "FAIL $1 → $got (ждали $2)"; fail=1;; esac; }
chk / "200"
chk /about "200"
chk /southhub "200"
chk /sitemap.xml "200"
chk /tag/psd/ "301 http://127.0.0.1:18080/"
chk /portfolio/southhub/ "301 http://127.0.0.1:18080/southhub"
while read -r path want; do [ -n "$path" ] && chk "$path" "$want"; done < <(grep -v '^#' tools/caddy-check.txt 2>/dev/null || true)
docker logs caddy-check 2>&1 | tail -5
docker rm -f caddy-check >/dev/null
exit $fail
