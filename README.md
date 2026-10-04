# median.agency — новый сайт

Статический сайт без сборки: `index.html` + `css/` + `js/` + `fonts/` + `media/`.

- Деплой: GitHub Pages, автоматически при пуше в `main` (`.github/workflows/pages.yml`).
- Локально: открыть `index.html` в браузере или `python3 -m http.server` в корне.
- Кейсы: массив `CASES` в начале `js/main.js` (имя, подзаголовок, направление, год, цвета обложки).
- Медиа складываем в `media/` (webp для фото, mp4 h.264 для видео), пути прописываем в `CASES`.
- Шрифты: Druk Wide Cyr (заголовки), Euclid Circular A (текст) — `css/fonts.css`.
