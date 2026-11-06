# syntax=docker/dockerfile:1

# ---------- Стадия 1: сборка ----------
FROM node:20-alpine AS build
RUN apk add --no-cache bash ffmpeg imagemagick zip
WORKDIR /site
COPY . .
RUN bash docker/build.sh

# ---------- Стадия 2: раздача (Caddy, сам получает HTTPS-сертификат) ----------
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /site/dist /srv
