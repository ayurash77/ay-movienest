# OpenAI из России: прокси через Cloudflare Worker

OpenAI блокирует API-запросы с российских IP (ошибка 403
`unsupported_country_region_territory`). Серверы Timeweb Cloud стоят в РФ,
поэтому продакшен-приложению нужен прокси. Самый простой бесплатный вариант —
Cloudflare Worker: домен `*.workers.dev` доступен и из РФ, и воркер ходит
в OpenAI уже с IP Cloudflare.

Ключ OpenAI через воркер **не проходит транзитом в открытом виде никуда,
кроме OpenAI**: приложение шлёт его в заголовке Authorization, воркер просто
пересылает запрос как есть.

## Шаги

1. Зарегистрируйтесь на [dash.cloudflare.com](https://dash.cloudflare.com) (бесплатный план).
2. Workers & Pages → Create → Worker, имя например `openai-proxy`.
3. Замените код воркера на:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'api.openai.com';
    url.protocol = 'https:';
    url.port = '';
    return fetch(new Request(url, request));
  },
};
```

4. Deploy. Получите URL вида `https://openai-proxy.<account>.workers.dev`.
5. В переменных приложения на Timeweb добавьте:

```
OPENAI_BASE_URL=https://openai-proxy.<account>.workers.dev/v1
```

6. Передеплойте приложение.

`/v1` в конце обязателен — SDK добавляет к base URL только пути методов
(`/responses`, `/chat/completions`).

## Заметки

- URL воркера лучше никому не показывать: сам по себе он ключей не содержит
  (ключ остаётся в переменных приложения), но открытый прокси могут найти и
  гонять через него свой трафик. При желании можно добавить в воркер проверку
  собственного секретного заголовка.
- Локальная разработка прокси не требует — `OPENAI_BASE_URL` в `.env`
  не задавайте, если из вашей сети OpenAI доступен напрямую.
- Альтернатива без Cloudflare: платные OpenAI-совместимые шлюзы
  (например proxyapi.ru) — тогда в `OPENAI_BASE_URL` ставится их endpoint,
  а в `OPENAI_API_KEY` — их ключ.
