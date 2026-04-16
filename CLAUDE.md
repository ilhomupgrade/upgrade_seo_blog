# Upgrade SEO Blog

SEO-блог AI-агентства Upgrade для индексации в Яндексе и Google.

## Стек

- **Фреймворк:** Astro 5.x (НЕ Astro 4 - другой API)
- **CMS:** Keystatic (git-based, headless)
- **Хостинг:** Vercel
- **Пакетный менеджер:** pnpm (с shamefully-hoist)
- **Стили:** Чистый CSS (графитовый стиль, без фреймворков)
- **API:** Perplexity (генерация и анализ статей)

## URLs

- **Продакшен:** https://upgrade-seo-blog.vercel.app/
- **Админка:** https://upgrade-seo-blog.vercel.app/keystatic/
- **GitHub:** https://github.com/ilhomupgrade/upgrade_seo_blog.git

## Структура

```
src/
  content.config.ts        # Astro 5 коллекция с glob loader
  data/blog/               # Статьи (.md и .mdoc)
  components/              # SeoHead, JsonLd, Header, Footer, PostCard, Breadcrumbs
  layouts/                 # BaseLayout, PostLayout
  pages/
    index.astro            # Главная
    blog/                  # Лента, статьи, теги
    api/                   # generate.ts, analyze.ts (Perplexity)
    rss.xml.ts             # RSS фид
  integrations/
    keystatic-custom.mjs   # Кастомная интеграция Keystatic (OAuth fix для Vercel)
  keystatic-api-override.js # API handler с credentials и URL fix
keystatic.config.tsx       # Конфиг Keystatic CMS
```

## Важные особенности Astro 5

- Конфиг коллекций: `src/content.config.ts` (не `src/content/config.ts`)
- Loader: `glob()` из `astro/loaders`
- Zod: `z` из `astro/zod`
- ID записи: `post.id` (не `post.slug`)
- Нет `output: 'hybrid'` - используется `prerender = false` на отдельных роутах

## Keystatic

- **Локально:** `storage: { kind: 'local' }` - работает без GitHub
- **Продакшен:** `storage: { kind: 'github' }` - OAuth через GitHub App
- **GitHub App:** `upgrade-seo-blog-keystatic` (App ID: 3398851)
- **Кастомная интеграция:** Стандартный `@keystatic/astro` плагин не передает OAuth credentials в API handler. Используется кастомная интеграция `src/integrations/keystatic-custom.mjs`
- **URL fix:** На Vercel `req.url` показывает `localhost` как origin. Override в `src/keystatic-api-override.js` берет хост из `x-forwarded-host` заголовка

## Env переменные (Vercel)

- `KEYSTATIC_GITHUB_CLIENT_ID` - Client ID GitHub App
- `KEYSTATIC_GITHUB_CLIENT_SECRET` - Client Secret GitHub App
- `KEYSTATIC_SECRET` - Рандомный секрет для сессий
- `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` - Slug приложения (`upgrade-seo-blog-keystatic`)
- `PERPLEXITY_API_KEY` - Ключ Perplexity API (пока не добавлен)

## Команды

```bash
pnpm dev          # Локальный сервер (localhost:4321)
pnpm build        # Сборка
pnpm preview      # Превью билда
```

## SEO

- `<html lang="ru">` на всех страницах
- JSON-LD: Article, Organization, BreadcrumbList
- Open Graph, Twitter Card
- Canonical URL
- Yandex-verification placeholder
- trailingSlash: 'always'
- Sitemap: /sitemap-index.xml
- RSS: /rss.xml
- robots.txt с директивами для Yandex

## Контент

- Статьи в `src/data/blog/` (.md или .mdoc)
- Без буквы "е" - использовать "е"
- Без длинных тире (-) - использовать короткие (-)
- Без эмодзи
- CTA в конце каждой статьи
- Перелинковка между статьями

## TODO

- [ ] Выбрать и подключить домен (обновить site в astro.config.mjs и robots.txt)
- [ ] Добавить PERPLEXITY_API_KEY в Vercel env
