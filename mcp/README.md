# MCP-сервер контента сайта

Подключается к Claude (claude.ai, приложение на телефоне, Claude Desktop) как коннектор и даёт править сайт словами:
«создай кейс по South HUB 2027», «добавь в Snow BASE фото по ссылке», «скрой вакансию дизайнера», «подними X5 Picnic в баннер».
Права — как у админки `/admin`: кейсы (проект и серия), вакансии, настройки пиктограмм и страницы вакансий, загрузка фото и видео.
КП в MCP нет — их правят в `/admin` или в чате с Claude.

Каждое изменение — коммит в `main` с сообщением `MCP: …`, дальше сайт собирается обычным деплоем (2–4 минуты).

## Инструменты

| Инструмент | Что делает |
|---|---|
| `list_items` | список кейсов или вакансий: id, порядок, название, вид, скрыт ли |
| `get_item` | JSON кейса или вакансии |
| `get_schema` | поля из `admin/config.yml` с подсказками и типами блоков |
| `create_item` | новый кейс (`kind: project` или `series`) или вакансия |
| `update_item` | правка: слияние полей (массивы заменяются, `null` удаляет поле) или замена целиком |
| `delete_item` | удаление, с подтверждением `confirm_id` |
| `get_settings`, `update_settings` | `icons` — пиктограммы цифр, `jobs` — страница вакансий |
| `upload_media` | файл по ссылке (прямой, Яндекс Диск, Google Drive) или маленький base64 (svg) |
| `list_media` | файлы в папке медиа |
| `site_status` | последние коммиты и статус сборки сайта и загрузок |

Загрузка по ссылке идёт через GitHub Actions (`.github/workflows/media.yml` → `tools/fetch-media.mjs`): там файл скачивается,
фото для `cases`, `vacancies`, `team` сжимаются в webp до 2400 px (как в `/admin`), коммит, запуск сборки сайта.
Воркер сразу возвращает итоговый путь — его можно писать в JSON, файл появится примерно через минуту.

## Как устроено

`mcp/worker.js` — Cloudflare Worker без зависимостей, MCP по Streamable HTTP без сессий (POST JSON-RPC → JSON).
Ходит в GitHub API токеном `GH_TOKEN`. Доступ — по секрету в адресе: `https://median-mcp.<поддомен>.workers.dev/mcp/<MCP_SECRET>`
(или `/mcp` с заголовком `Authorization: Bearer <MCP_SECRET>`). Без секрета сервер отвечает 404.

Деплой — `.github/workflows/mcp.yml` при пуше в `mcp/` или вручную (Actions → Deploy MCP server → Run workflow).
Пока секретов Cloudflare нет, workflow пропускается.

## Настройка (один раз)

1. **Токен GitHub.** github.com → Settings → Developer settings → Fine-grained tokens → Generate:
   доступ только к `median-site`, права Contents — Read and write, Actions — Read and write. Срок — до года.
2. **Cloudflare** (бесплатный план). Зарегистрироваться на dash.cloudflare.com, открыть Workers & Pages
   (там же выбрать поддомен `*.workers.dev`). Account ID — справа на странице Workers & Pages.
   My Profile → API Tokens → Create Token → шаблон «Edit Cloudflare Workers».
3. **Секрет MCP** — длинная случайная строка (например, из менеджера паролей, 32+ символа, латиница и цифры).
4. **Секреты в GitHub:** репозиторий → Settings → Secrets and variables → Actions → New repository secret:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MCP_GITHUB_TOKEN` (из п. 1), `MCP_SECRET` (из п. 3).
5. **Деплой:** Actions → Deploy MCP server → Run workflow. В логе шага wrangler — адрес воркера.
6. **Подключение:** claude.ai → Settings → Connectors → Add custom connector, адрес
   `https://median-mcp.<поддомен>.workers.dev/mcp/<MCP_SECRET>`. Коннектор появится и в приложении на телефоне.

Если адрес утёк — поменять `MCP_SECRET` в GitHub, перезапустить деплой и обновить адрес коннектора.

## Проверка руками

```sh
curl -s https://median-mcp.<поддомен>.workers.dev/mcp/<MCP_SECRET> -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_items","arguments":{"collection":"cases"}}}'
```
