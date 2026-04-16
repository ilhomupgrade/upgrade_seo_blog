Да. Ниже даю тебе **готовый каркас Astro-блога под SEO**, который можно взять как основу и сразу собирать.

Astro content collections — хороший способ хранить статьи в Markdown с типизацией и валидируемым frontmatter, а для sitemap важно указать `site` в `astro.config.mjs`. Официальный sitemap-плагин и `public/robots.txt` у Astro поддерживаются штатно. ([docs.astro.build][1])

---

# 1) Структура проекта

```bash
my-blog/
├─ public/
│  ├─ favicon.svg
│  ├─ robots.txt
│  └─ og-default.jpg
├─ src/
│  ├─ content/
│  │  ├─ config.ts
│  │  └─ blog/
│  │     ├─ kak-vnedrit-ii-v-biznes.md
│  │     └─ kak-pisat-prompty.md
│  ├─ layouts/
│  │  ├─ BaseLayout.astro
│  │  └─ PostLayout.astro
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ blog/
│  │  │  ├─ index.astro
│  │  │  ├─ [slug].astro
│  │  │  └─ tag/
│  │  │     └─ [tag].astro
│  │  ├─ rss.xml.ts
│  │  └─ 404.astro
│  ├─ components/
│  │  ├─ SeoHead.astro
│  │  ├─ Header.astro
│  │  ├─ Footer.astro
│  │  ├─ PostCard.astro
│  │  └─ Breadcrumbs.astro
│  └─ styles/
│     └─ global.css
├─ astro.config.mjs
├─ package.json
└─ tsconfig.json
```

---

# 2) Что установить

```bash
npm create astro@latest
npm install @astrojs/sitemap zod
npm install @astrojs/rss
```

`@astrojs/sitemap` — для sitemap, `@astrojs/rss` — для RSS, `zod` — для схемы frontmatter. ([docs.astro.build][2])

---

# 3) `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.ru',
  integrations: [sitemap()],
});
```

Заменишь `https://example.ru` на свой домен. Это важно для canonical URL и sitemap. ([docs.astro.build][2])

---

# 4) `src/content/config.ts`

```ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    author: z.string().default('Ильхом Султанов'),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    canonical: z.string().url().optional(),
  }),
});

export const collections = {
  blog,
};
```

---

# 5) Пример статьи `src/content/blog/kak-vnedrit-ii-v-biznes.md`

```md
---
title: "Как внедрить ИИ в бизнес без хаоса"
description: "Практический разбор: с чего начать внедрение ИИ в компании, чтобы получить результат, а не шум."
pubDate: 2026-04-16
updatedDate: 2026-04-16
draft: false
author: "Ильхом Султанов"
tags: ["ИИ", "бизнес", "автоматизация"]
cover: "/og-default.jpg"
canonical: "https://example.ru/blog/kak-vnedrit-ii-v-biznes/"
---

# Как внедрить ИИ в бизнес без хаоса

Большая ошибка — внедрять ИИ ради самого ИИ.

## С чего начать

1. Найти 3 повторяющиеся задачи
2. Оценить, где теряется время
3. Запустить маленький MVP

## Что внедрять первым

- ответы клиентам
- подготовку КП
- обработку документов
```

---

# 6) `src/components/SeoHead.astro`

```astro
---
interface Props {
  title: string;
  description: string;
  image?: string;
  canonical?: string;
  noindex?: boolean;
}

const {
  title,
  description,
  image = '/og-default.jpg',
  canonical,
  noindex = false
} = Astro.props;

const url = new URL(Astro.url.pathname, Astro.site);
const canonicalUrl = canonical ?? url.toString();
const imageUrl = new URL(image, Astro.site).toString();
---

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalUrl} />

<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="article" />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:image" content={imageUrl} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={imageUrl} />

{noindex && <meta name="robots" content="noindex, nofollow" />}
<link rel="sitemap" href="/sitemap-index.xml" />
```

---

# 7) `src/layouts/BaseLayout.astro`

```astro
---
import SeoHead from '../components/SeoHead.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  image?: string;
  canonical?: string;
  noindex?: boolean;
}

const { title, description, image, canonical, noindex } = Astro.props;
---

<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#ffffff" />
    <SeoHead
      title={title}
      description={description}
      image={image}
      canonical={canonical}
      noindex={noindex}
    />
  </head>
  <body>
    <slot />
  </body>
</html>
```

---

# 8) `src/layouts/PostLayout.astro`

```astro
---
import BaseLayout from './BaseLayout.astro';

const { post } = Astro.props;
---

<BaseLayout
  title={post.data.title}
  description={post.data.description}
  image={post.data.cover}
  canonical={post.data.canonical}
>
  <main class="container">
    <article>
      <p>{post.data.pubDate.toLocaleDateString('ru-RU')}</p>
      <h1>{post.data.title}</h1>
      <p>{post.data.description}</p>

      {post.data.tags.length > 0 && (
        <ul>
          {post.data.tags.map((tag: string) => (
            <li><a href={`/blog/tag/${tag.toLowerCase()}/`}>{tag}</a></li>
          ))}
        </ul>
      )}

      <slot />
    </article>
  </main>
</BaseLayout>
```

---

# 9) Главная `src/pages/index.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
  .slice(0, 6);
---

<BaseLayout
  title="Блог об ИИ и бизнесе"
  description="Практические статьи про ИИ, автоматизацию, контент и рост бизнеса."
>
  <main class="container">
    <h1>Блог</h1>
    <p>Практические материалы про ИИ для бизнеса и карьеры.</p>

    <section>
      {posts.map((post) => (
        <article>
          <h2><a href={`/blog/${post.slug}/`}>{post.data.title}</a></h2>
          <p>{post.data.description}</p>
        </article>
      ))}
    </section>
  </main>
</BaseLayout>
```

---

# 10) Страница списка статей `src/pages/blog/index.astro`

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
---

<BaseLayout
  title="Все статьи"
  description="Все статьи блога про ИИ, автоматизацию и бизнес."
>
  <main class="container">
    <h1>Все статьи</h1>

    {posts.map((post) => (
      <article>
        <h2><a href={`/blog/${post.slug}/`}>{post.data.title}</a></h2>
        <p>{post.data.description}</p>
      </article>
    ))}
  </main>
</BaseLayout>
```

---

# 11) Динамическая статья `src/pages/blog/[slug].astro`

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<PostLayout post={post}>
  <Content />
</PostLayout>
```

`getCollection()` — штатный способ получать записи из content collections. ([docs.astro.build][3])

---

# 12) Теги `src/pages/blog/tag/[tag].astro`

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const tags = [...new Set(posts.flatMap((post) => post.data.tags))];

  return tags.map((tag) => ({
    params: { tag: tag.toLowerCase() },
    props: { tag },
  }));
}

const { tag } = Astro.props;

const posts = (await getCollection('blog', ({ data }) =>
  !data.draft && data.tags.some((t) => t.toLowerCase() === tag)
)).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
---

<BaseLayout
  title={`Статьи по теме: ${tag}`}
  description={`Подборка статей по теме: ${tag}`}
>
  <main class="container">
    <h1>Тег: {tag}</h1>

    {posts.map((post) => (
      <article>
        <h2><a href={`/blog/${post.slug}/`}>{post.data.title}</a></h2>
        <p>{post.data.description}</p>
      </article>
    ))}
  </main>
</BaseLayout>
```

---

# 13) RSS `src/pages/rss.xml.ts`

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'Блог об ИИ и бизнесе',
    description: 'Практические статьи про ИИ, автоматизацию и рост бизнеса',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
  });
}
```

Astro поддерживает RSS отдельным официальным пакетом. ([docs.astro.build][4])

---

# 14) `public/robots.txt`

```txt
User-agent: *
Allow: /

Sitemap: https://example.ru/sitemap-index.xml
```

`robots.txt` в Astro обычно кладётся в `public/robots.txt`. ([docs.astro.build][5])

---

# 15) `src/styles/global.css`

```css
:root {
  --text: #111;
  --bg: #fff;
  --muted: #666;
  --line: #eaeaea;
  --max: 760px;
}

* {
  box-sizing: border-box;
}

html {
  font-family: Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

body {
  margin: 0;
  line-height: 1.65;
}

.container {
  max-width: var(--max);
  margin: 0 auto;
  padding: 24px 16px 64px;
}

a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h1, h2, h3 {
  line-height: 1.2;
}

article {
  margin-bottom: 40px;
}

img {
  max-width: 100%;
  height: auto;
}
```

---

# 16) Что важно для SEO сразу

Вот это я бы заложил с первого дня:

* человекопонятные URL
  `/blog/kak-vnedrit-ii-v-biznes/`
* один `h1` на страницу
* уникальные `title` и `description`
* `canonical`
* `sitemap.xml`
* `robots.txt`
* теги и страницы тегов
* внутренняя перелинковка между статьями
* дата публикации и обновления
* OG image для шаринга
* без мусорных дублей страниц

---

# 17) Как писать статьи, чтобы индексировались лучше

Frontmatter для каждой статьи должен быть одинаковым и аккуратным.
Минимум:

```md
---
title: "..."
description: "..."
pubDate: 2026-04-16
updatedDate: 2026-04-16
draft: false
tags: ["ИИ", "бизнес"]
canonical: "https://example.ru/blog/..."
---
```

А внутри статьи:

* нормальный заголовок
* подзаголовки `##`
* абзацы
* списки
* внутренние ссылки на другие статьи
* CTA в конце

---

# 18) Какой маршрут я бы посоветовал тебе

Не усложняй.

Сразу делай:

1. главная
2. блог-лента
3. шаблон статьи
4. теги
5. robots
6. sitemap
7. RSS
8. 5–10 статей в Markdown

Этого уже хватает, чтобы запустить нормальный SEO-блог.

---

# 19) Мой совет именно под тебя

Я бы сделал 3 контентных кластера:

* **ИИ для бизнеса**
* **ИИ для карьеры**
* **Автоматизация / агенты / инструменты**

И под каждый кластер:

* 1 главная обзорная статья
* 5–10 узких статей
* перелинковка между ними

Это уже можно превращать в трафик и лиды.

---

# 20) Что можно добавить на втором шаге

Потом уже:

* поиск по блогу
* schema.org JSON-LD
* хлебные крошки
* pagination
* авто-генерацию OG-картинок
* related posts
* форму подписки / Telegram CTA

---

Если хочешь, следующим сообщением я соберу тебе **полный starter-kit файлами**: прямо по очереди `package.json`, `astro.config.mjs`, `config.ts`, layouts, pages и 2 demo-статьи, чтобы ты просто вставил в проект.

[1]: https://docs.astro.build/en/guides/content-collections/?utm_source=chatgpt.com "Content collections - Astro Docs"
[2]: https://docs.astro.build/en/guides/integrations-guide/sitemap/?utm_source=chatgpt.com "astrojs/sitemap - Astro Docs"
[3]: https://docs.astro.build/en/reference/modules/astro-content/?utm_source=chatgpt.com "Content Collections API Reference - Astro Docs"
[4]: https://docs.astro.build/en/recipes/rss/?utm_source=chatgpt.com "Add an RSS feed - Astro Docs"
[5]: https://docs.astro.build/en/install-and-setup/?utm_source=chatgpt.com "Install Astro | Docs"
