import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { askPerplexityWithCitations, parseJSON } from '../../../lib/perplexity';

export const prerender = false;

type PromptPost = {
  title: string;
  prompt_text: string;
  how_to_use: string;
  audience?: string;
  source_name?: string;
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
  const chatId = import.meta.env.TELEGRAM_PROMPTS_CHAT_ID || '@prompts_upgrade';
  if (!botToken || !chatId) return json({ error: 'Telegram не настроен' }, 500);

  const databaseUrl = import.meta.env.DATABASE_URL;
  const sql = databaseUrl ? neon(databaseUrl) : null;

  try {
    const recentPosts = sql
      ? await sql`
          SELECT title, prompt_text
          FROM prompt_posts
          WHERE published_at >= NOW() - INTERVAL '30 days'
          ORDER BY published_at DESC
          LIMIT 50
        `
      : [];

    const excludedTitles = recentPosts
      .map((post: any) => post.title)
      .filter(Boolean)
      .join('\n');

    const excludedPrompts = recentPosts
      .map((post: any) => post.prompt_text)
      .filter(Boolean)
      .slice(0, 20)
      .join('\n---\n');

    const { content, citations } = await askPerplexityWithCitations(
      apiKey,
      'Ты - редактор Telegram-канала с полезными AI-промптами. Твоя задача - находить сильные внешние промпты и публиковать их максимально близко к оригиналу. Отвечай только валидным JSON без комментариев.',
      `Найди ОДИН сильный, популярный и полезный промпт во внешних источниках и подготовь версию для канала @prompts_upgrade.

Формат ответа:
{
  "title": "краткий заголовок промпта до 70 символов",
  "prompt_text": "сам промпт максимально близко к оригинальному тексту источника",
  "how_to_use": "1-2 коротких предложения, как лучше использовать этот промпт",
  "audience": "для кого промпт",
  "source_name": "краткое название источника идеи"
}

Требования:
- Один пост = один промпт
- Сначала найди готовый промпт во внешнем источнике, а не придумывай его с нуля
- Бери prompt-идею или почти готовый промпт из популярных подборок, prompt-pack'ов, prompt-guides, обучающих материалов и статей
- Публикуемая версия должна быть максимально близкой к найденному оригиналу
- Не сокращай промпт без необходимости
- Не переписывай промпт заново, если уже найден хороший исходник
- Допустима только минимальная техническая правка: убрать лишнюю вводную фразу, выровнять форматирование, исправить очевидный мусор
- Сохраняй исходный язык промпта. Если источник англоязычный, публикуй промпт на английском
- Подходить широкой аудитории: работа, учеба, контент, аналитика, продуктивность, исследования
- Избегай слишком узких или одноразовых промптов
- Не пиши абстрактные советы, нужен именно готовый промпт
- Не переводи prompt_text на русский, если оригинал не на русском
- Без эмодзи
- Без длинных тире, только короткие (-)
- prompt_text должен быть полным и пригодным для копирования, даже если он длиннее обычного
- how_to_use должен быть понятным и коротким
- Приоритет источников: обучающие prompt-ресурсы, подборки промптов, официальные материалы, качественные статьи
- Если есть несколько вариантов, выбирай самый практичный и универсальный

Не повторяй уже опубликованные идеи.

Не используй похожие заголовки:
${excludedTitles || 'нет'}

Не используй похожие тексты промптов:
${excludedPrompts || 'нет'}

Верни только JSON.`,
      0.4,
      4500,
    );

    const parsed = parseJSON(content) as PromptPost | null;
    if (!parsed?.title || !parsed?.prompt_text || !parsed?.how_to_use) {
      return json({ error: 'Модель не вернула валидный промпт', raw: content.slice(0, 1200) }, 500);
    }

    if (isDuplicatePrompt(parsed, recentPosts)) {
      return json({ skipped: true, reason: 'Похожий промпт уже публиковался недавно', title: parsed.title });
    }

    const sourceLabel = parsed.source_name || sourceNameFromCitations(citations);
    const message = buildTelegramPost({ ...parsed, source_name: sourceLabel });
    await sendMessage(botToken, chatId, message);

    if (sql) {
      await sql`
        INSERT INTO prompt_posts (title, prompt_text, how_to_use, audience, published_at)
        VALUES (
          ${parsed.title},
          ${parsed.prompt_text},
          ${parsed.how_to_use},
          ${parsed.audience || ''},
          NOW()
        )
      `;
    }

    return json({ ok: true, title: parsed.title, source_name: sourceLabel });
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
};

function buildTelegramPost(prompt: PromptPost): string {
  const parts = [
    `<b>${escapeHtml(prompt.title.trim())}</b>`,
    sanitizeText(prompt.prompt_text),
    prompt.how_to_use ? sanitizeText(prompt.how_to_use) : null,
    prompt.source_name ? `Основа: ${escapeHtml(prompt.source_name)}` : null,
    '@prompts_upgrade',
  ].filter(Boolean);

  return parts.join('\n\n');
}

function sanitizeText(text: string): string {
  return escapeHtml(text.replace(/\s+/g, ' ').trim());
}

function sourceNameFromCitations(citations: string[]): string | null {
  const first = citations.find((url) => /^https?:\/\//i.test(url));
  if (!first) return null;
  try {
    return new URL(first).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isDuplicatePrompt(prompt: PromptPost, recentPosts: any[]): boolean {
  const normalizedTitle = normalizeText(prompt.title);
  const normalizedPrompt = normalizeText(prompt.prompt_text);

  return recentPosts.some((post) => {
    const recentTitle = normalizeText(post.title || '');
    const recentPrompt = normalizeText(post.prompt_text || '');

    if (recentTitle && (recentTitle === normalizedTitle || recentTitle.includes(normalizedTitle) || normalizedTitle.includes(recentTitle))) {
      return true;
    }

    if (recentPrompt && normalizedPrompt && recentPrompt === normalizedPrompt) {
      return true;
    }

    return false;
  });
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sendMessage(token: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Telegram sendMessage error: ${res.status} ${errorText}`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
