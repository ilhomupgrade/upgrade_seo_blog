import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { askPerplexityWithCitations, parseJSON } from '../../../lib/perplexity';

export const prerender = false;

const SOCIAL_URL_RE = /youtube\.com|youtu\.be|x\.com|twitter\.com|t\.me|instagram\.com|facebook\.com|tiktok\.com/i;
const BOT_UA = 'Mozilla/5.0 (compatible; UpgradeBot/1.0)';

type NewsPost = {
  title: string;
  summary: string;
  why_it_matters: string;
  source_url: string;
  source_name: string;
  event_date?: string;
};

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: 'OPENROUTER_API_KEY не настроен' }, 500);

  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.TELEGRAM_DIGEST_CHAT_ID || '@news_upgrade';
  if (!botToken || !chatId) return json({ error: 'Telegram не настроен' }, 500);

  const databaseUrl = import.meta.env.DATABASE_URL;
  const sql = databaseUrl ? neon(databaseUrl) : null;

  try {
    const recentPosts = sql
      ? await sql`
          SELECT title, source_url
          FROM news_posts
          WHERE published_at >= NOW() - INTERVAL '7 days'
          ORDER BY published_at DESC
          LIMIT 30
        `
      : [];

    const excludedUrls = recentPosts
      .map((post: any) => post.source_url)
      .filter(Boolean)
      .join('\n');
    const excludedTitles = recentPosts
      .map((post: any) => post.title)
      .filter(Boolean)
      .join('\n');

    const now = new Date();
    const from = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const fromStr = from.toISOString().split('T')[0];
    const nowStr = now.toISOString().split('T')[0];

    const { content, citations } = await askPerplexityWithCitations(
      apiKey,
      'Ты - автор Telegram-канала про ИИ. Твоя задача - выбрать одну самую важную свежую новость и подать ее как короткий авторский обзор: живо, понятно, без сухой телеграфной подачи. Отвечай только валидным JSON без комментариев.',
      `Найди ОДНУ самую важную и свежую новость в сфере искусственного интеллекта за период с ${fromStr} по ${nowStr}.

Формат ответа:
{
  "title": "короткий заголовок до 90 символов",
  "summary": "короткий обзор новости на 2-3 предложения, связный, не тезисный",
  "why_it_matters": "что это значит - 1-2 предложения для широкой аудитории",
  "source_url": "прямая ссылка на лучшую текстовую статью или официальный первоисточник",
  "source_name": "название источника",
  "event_date": "YYYY-MM-DD"
}

Жесткие правила:
- Только одна новость
- Только реальные свежие события
- Без воды, без хайпа, без канцелярита
- Писать на русском, просто и понятно
- Тон как у хорошего автора обзоров, а не как у телеграфа
- Не писать рублеными тезисами
- summary должен читаться как цельный короткий абзац
- Не использовать эмодзи
- Не использовать длинные тире, только короткие (-)
- source_url должен быть прямой ссылкой на текстовую статью или официальный анонс
- Нельзя использовать соцсети и видео как источник
- Выбирай новость, которая будет понятна и интересна широкой аудитории

Не предлагай новости, если они уже публиковались недавно.

Не используй эти URL:
${excludedUrls || 'нет'}

Не используй новости с похожими заголовками:
${excludedTitles || 'нет'}

Верни только JSON.`
    );

    const parsed = parseJSON(content) as NewsPost | null;
    if (!parsed?.title || !parsed?.summary || !parsed?.why_it_matters) {
      return json({ error: 'Модель не вернула валидную новость', raw: content.slice(0, 1000) }, 500);
    }

    const candidateUrls = uniqueStrings([
      parsed.source_url,
      ...(citations || []),
    ]).filter((url) => isGoodSourceUrl(url));

    const sourceUrl = candidateUrls[0];
    if (!sourceUrl) {
      return json({ error: 'Не найден валидный URL первоисточника', parsed, citations }, 422);
    }

    if (isDuplicateNews(parsed, recentPosts)) {
      return json({ skipped: true, reason: 'Похожая новость уже публиковалась недавно', title: parsed.title, source_url: sourceUrl });
    }

    const message = buildTelegramPost({
      ...parsed,
      source_url: sourceUrl,
      source_name: parsed.source_name || sourceLabelFromUrl(sourceUrl),
    });

    await sendMessage(botToken, chatId, message);

    if (sql) {
      await sql`
        INSERT INTO news_posts (title, what_happened, why_it_matters, source_url, source_name, image_url, published_at)
        VALUES (
          ${parsed.title},
          ${parsed.summary},
          ${parsed.why_it_matters},
          ${sourceUrl},
          ${parsed.source_name || sourceLabelFromUrl(sourceUrl)},
          ${null},
          NOW()
        )
        ON CONFLICT (source_url) DO NOTHING
      `;
    }

    return json({
      ok: true,
      title: parsed.title,
      source_url: sourceUrl,
      image: null,
    });
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
};

function buildTelegramPost(news: NewsPost): string {
  const parts = [
    `<b>${escapeHtml(news.title.trim())}</b>`,
    sanitizeTelegramText(news.summary),
    news.why_it_matters ? sanitizeTelegramText(news.why_it_matters) : null,
    '@news_upgrade',
  ].filter(Boolean);

  return parts.join('\n\n');
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)).map((value) => value.trim()))];
}

function isGoodSourceUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && !SOCIAL_URL_RE.test(url);
}

function isDuplicateNews(news: NewsPost, recentPosts: any[]): boolean {
  const normalizedTitle = normalizeText(news.title);
  return recentPosts.some((post) => {
    if (post.source_url && news.source_url && post.source_url === news.source_url) return true;
    const recentTitle = normalizeText(post.title || '');
    if (!recentTitle) return false;
    return recentTitle === normalizedTitle || recentTitle.includes(normalizedTitle) || normalizedTitle.includes(recentTitle);
  });
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeTelegramText(text: string): string {
  return escapeHtml(
    text
      .replace(/\s+/g, ' ')
      .replace(/^Что это значит:\s*/i, '')
      .trim()
  );
}

async function sendMessage(token: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Telegram sendMessage error: ${res.status} ${errorText}`);
  }
}

function sourceLabelFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return 'источник';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(text: string): string {
  return text.replace(/"/g, '&quot;');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
