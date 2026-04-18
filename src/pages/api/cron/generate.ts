import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { askPerplexityWithCitations, askGemini, parseJSON } from '../../../lib/perplexity';
import { slugify } from '../../../lib/slugify';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: 'OPENROUTER_API_KEY не настроен' }, 500);

  const sql = neon(import.meta.env.DATABASE_URL);

  try {
    const today = new Date();
    const from = new Date(today.getTime() - 2 * 86400000);
    const fromStr = from.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // 1. Ищем одну свежую новость с источниками - с несколькими попытками
    let newsSearch: { content: string; citations: string[] } | null = null;
    let news: any = null;
    let qualitySources: string[] = [];
    const angles = [
      'релиз модели или продукта от OpenAI, Anthropic, Google, Meta, Microsoft, Mistral',
      'крупная сделка, инвестиция или партнерство в ИИ',
      'внедрение ИИ в крупной российской компании или госсекторе',
      'исследование или научный прорыв в ИИ',
      'регуляторная новость по ИИ (ЕС, США, Россия, Китай)',
    ];

    for (let attempt = 0; attempt < angles.length && qualitySources.length < 2; attempt++) {
      newsSearch = await askPerplexityWithCitations(
        apiKey,
        'Ты - новостной аналитик в сфере ИИ. Ищешь только реальные, подтвержденные новости с указанием источников. Отвечай только валидным JSON.',
        `Найди ОДНУ самую значимую новость за период с ${fromStr} по ${todayStr} по направлению: ${angles[attempt]}.

Новость должна:
- Быть реальной и освещенной как минимум в ДВУХ разных текстовых изданиях
- Иметь первоисточник - официальный сайт компании / пресс-релиз / крупное СМИ (techcrunch.com, theverge.com, reuters.com, bloomberg.com, habr.com, vc.ru, rbc.ru, forbes.ru и подобные)
- Произошла именно в указанный период

КРИТИЧЕСКИ ВАЖНО для sources_used:
- Минимум 2 разных URL на ТЕКСТОВЫЕ статьи в СМИ или официальные пресс-релизы
- ЗАПРЕЩЕНО: youtube.com, youtu.be, twitter.com, x.com, t.me, instagram.com, facebook.com, tiktok.com
- Это должны быть прямые ссылки на статьи, НЕ главные страницы сайтов

Верни JSON:
{
  "headline": "Краткий заголовок новости на русском",
  "summary": "Что произошло - 2-3 предложения с ключевыми фактами и датами",
  "date": "Дата события в формате YYYY-MM-DD",
  "key_entities": ["компании", "люди", "продукты - названия как в оригинале"],
  "sources_used": ["URL1", "URL2", "URL3"]
}`,
        0.3,
        1500,
      );

      const parsed = parseJSON(newsSearch.content);
      if (!parsed?.headline) continue;
      news = parsed;
      const all = [...new Set([...(newsSearch.citations || []), ...(parsed.sources_used || [])])].filter(Boolean);
      qualitySources = all.filter((u: string) => !/youtube\.com|youtu\.be|x\.com|twitter\.com|t\.me|instagram\.com|facebook\.com|tiktok\.com/i.test(u));
      if (qualitySources.length >= 2) break;
    }

    if (!news?.headline) {
      return json({ error: 'Не удалось найти свежую новость ни по одному направлению' }, 500);
    }

    if (qualitySources.length < 2) {
      return json({ error: 'Не удалось найти 2+ качественных текстовых источника', news, qualitySources }, 422);
    }

    // Дубль-чек по заголовку
    const existing = await sql`
      SELECT id FROM articles WHERE title ILIKE ${'%' + news.headline.slice(0, 40) + '%'}
    `;
    if (existing.length > 0) {
      return json({ skipped: true, reason: 'Такая новость уже есть', headline: news.headline });
    }

    // 2. Скачиваем HTML первоисточников и извлекаем основной текст
    const sourceTexts = await Promise.all(qualitySources.slice(0, 5).map(fetchSourceText));
    const sourcesBlock = qualitySources.slice(0, 5).map((u, i) => {
      const text = sourceTexts[i];
      return `[${i + 1}] ${u}\n${text ? text.slice(0, 4000) : '(не удалось скачать)'}`;
    }).join('\n\n---\n\n');

    // 3. Рерайт через Gemini 3 Flash на основе фактов из источников
    const articleContent = await askGemini(
      apiKey,
      `Ты - старший аналитик AI-агентства Upgrade. Пишешь глубокие экспертные обзоры новостей ИИ на русском языке для бизнес-аудитории.

Жесткие правила:
- Статья 1200-1800 слов
- Структура: что произошло -> контекст и предыстория -> технический разбор -> влияние на бизнес в России -> что делать сейчас -> CTA к услугам Upgrade
- В каждом фактологическом утверждении ставь ссылку на источник в формате [(источник)](url) - используй реальные URL из предоставленных источников
- Используй ТОЛЬКО факты из предоставленных источников, ничего не выдумывай
- Минимум 5 ссылок на источники в тексте
- Живой экспертный язык, без канцелярита
- Подзаголовки ## и ###, списки, конкретные цифры
- Не используй букву е с двумя точками (латинскую e-umlaut)
- Не используй длинные тире, только короткие (-)
- Не используй эмодзи
- Формат: чистый Markdown
- Отвечай только валидным JSON без комментариев`,
      `Напиши глубокий экспертный обзор новости на основе предоставленных материалов из первоисточников.

НОВОСТЬ: ${news.headline}
СУТЬ: ${news.summary}
ДАТА: ${news.date}
КЛЮЧЕВЫЕ СУЩНОСТИ: ${(news.key_entities || []).join(', ')}

МАТЕРИАЛЫ ПЕРВОИСТОЧНИКОВ (используй ТОЛЬКО факты отсюда, ссылайся на URL):
${sourcesBlock}

Верни ТОЛЬКО валидный JSON без markdown-обертки:
{
  "title": "SEO-заголовок на русском, СТРОГО до 70 символов",
  "description": "SEO-описание СТРОГО до 150 символов включая пробелы, с датой и главным фактом",
  "tags": ["3-5 тегов на русском"],
  "content": "Полный markdown-текст статьи 1200-1800 слов со ссылками [(источник)](url) внутри текста. В конце раздел '## Источники' со списком всех ссылок."
}`,
      0.4,
      12000,
    );

    const article = parseJSON(articleContent);
    if (!article?.title || !article?.content) {
      return json({ error: 'Gemini не сгенерировал обзор', raw: articleContent.slice(0, 2000) }, 500);
    }

    // Жесткая проверка: минимум 3 ссылки в тексте
    const linkCount = (article.content.match(/\]\(https?:\/\//g) || []).length;
    if (linkCount < 3) {
      return json({ error: 'Слишком мало ссылок на источники в тексте', linkCount, content: article.content }, 422);
    }

    // Обложка: парсим og:image из первого источника (Gemini не даёт cover_url)
    const cover = await resolveCover(null, qualitySources);
    if (!cover) {
      return json({ error: 'Не удалось получить картинку из первоисточников', sources: qualitySources }, 422);
    }

    const slug = slugify(article.title);
    const tags = article.tags || [];
    const allCitations = [...qualitySources];

    const sourceData = JSON.stringify({
      headline: news.headline,
      news_date: news.date,
      citations: allCitations,
      cover,
    });

    const result = await sql`
      INSERT INTO articles (title, slug, description, content, tags, status, source_url)
      VALUES (${article.title}, ${slug}, ${article.description || ''}, ${article.content}, ${tags}, 'pending', ${sourceData})
      RETURNING id, title, slug
    `;

    // Telegram уведомление
    const telegramToken = import.meta.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = import.meta.env.TELEGRAM_CHAT_ID;
    if (telegramToken && telegramChatId) {
      const previewUrl = `https://upgrade-seo-blog.vercel.app/api/drafts/${result[0].id}/`;
      const message = `Свежий обзор новости ИИ готов к модерации:\n\n*${article.title}*\n\n${article.description}\n\nИсточников: ${allCitations.length}\nСсылок в тексте: ${linkCount}\n\n[Превью](${previewUrl})`;
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: 'Одобрить', callback_data: `approve:${result[0].id}` },
              { text: 'Отклонить', callback_data: `reject:${result[0].id}` },
            ]],
          },
        }),
      });
    }

    return json({
      success: true,
      article: { id: result[0].id, title: result[0].title, slug: result[0].slug },
      news: { headline: news.headline, date: news.date },
      citations: allCitations.length,
      links_in_text: linkCount,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fetchSourceText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UpgradeBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Грубая очистка: выкидываем script/style/nav/header/footer, оставляем текст
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned;
  } catch {
    return null;
  }
}

async function resolveCover(modelUrl: string | null | undefined, sources: string[]): Promise<string | null> {
  const candidates: string[] = [];
  if (modelUrl && isValidImageUrl(modelUrl)) candidates.push(modelUrl);
  for (const src of sources) {
    const og = await extractOgImage(src).catch(() => null);
    if (og) candidates.push(og);
  }
  for (const url of candidates) {
    if (await imageReachable(url)) return url;
  }
  return null;
}

function isValidImageUrl(url: string): boolean {
  if (!/^https?:\/\//.test(url)) return false;
  if (/favicon|logo|icon/i.test(url)) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes('og') || url.includes('image');
}

async function extractOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UpgradeBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!ogMatch) return null;
    const img = ogMatch[1];
    if (img.startsWith('http')) return img;
    if (img.startsWith('//')) return 'https:' + img;
    try { return new URL(img, pageUrl).toString(); } catch { return null; }
  } catch {
    return null;
  }
}

async function imageReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UpgradeBot/1.0)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}
