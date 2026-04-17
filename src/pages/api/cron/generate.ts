import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { askPerplexity, parseJSON } from '../../../lib/perplexity';
import { slugify } from '../../../lib/slugify';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // Защита: только Vercel Cron или секретный ключ
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: 'OPENROUTER_API_KEY не настроен' }, 500);
  }

  const sql = neon(import.meta.env.DATABASE_URL);

  try {
    // 1. Ищем трендовую тему через Perplexity
    const topicRaw = await askPerplexity(
      apiKey,
      'Ты - SEO-аналитик для русскоязычного блога об ИИ и бизнесе. Отвечай только валидным JSON.',
      `Найди одну актуальную и трендовую тему для статьи в русскоязычный блог об ИИ и бизнесе.
Тема должна быть:
- Актуальной (последние новости, тренды, обновления ИИ)
- Интересной для бизнес-аудитории в России
- С хорошим SEO-потенциалом

Верни JSON:
{
  "topic": "Тема статьи",
  "keywords": ["ключ1", "ключ2", "ключ3"],
  "angle": "Угол подачи - почему это важно для бизнеса"
}`,
      0.7,
      1000,
    );

    const topicData = parseJSON(topicRaw);
    if (!topicData?.topic) {
      return json({ error: 'Не удалось определить тему', raw: topicRaw }, 500);
    }

    // Проверим что такой темы ещё нет
    const existing = await sql`
      SELECT id FROM articles WHERE title ILIKE ${'%' + topicData.topic.slice(0, 30) + '%'}
    `;
    if (existing.length > 0) {
      return json({ skipped: true, reason: 'Похожая тема уже есть', topic: topicData.topic });
    }

    // 2. Генерируем статью
    const articleRaw = await askPerplexity(
      apiKey,
      `Ты - профессиональный копирайтер AI-агентства Upgrade. Пишешь экспертные статьи на русском языке для бизнес-аудитории.

Правила:
- Пиши живым языком без канцелярита
- Используй подзаголовки ## и ###
- Добавляй списки и конкретные примеры
- В конце статьи - CTA с предложением услуг Upgrade
- Статья должна быть 800-1200 слов
- Не используй длинные тире, используй короткие (-)
- Не используй букву е (с точками)
- Не используй эмодзи
- Формат: чистый Markdown`,
      `Напиши статью на тему: "${topicData.topic}"
Угол подачи: ${topicData.angle || 'экспертный анализ для бизнеса'}
Ключевые слова для SEO: ${(topicData.keywords || []).join(', ')}

Верни JSON:
{
  "title": "Заголовок статьи (до 60 символов)",
  "description": "SEO-описание (до 155 символов)",
  "tags": ["тег1", "тег2", "тег3"],
  "content": "Полный текст статьи в Markdown"
}`,
      0.7,
      4000,
    );

    const article = parseJSON(articleRaw);
    if (!article?.title || !article?.content) {
      return json({ error: 'Не удалось сгенерировать статью', raw: articleRaw }, 500);
    }

    const slug = slugify(article.title);
    const tags = article.tags || topicData.keywords || [];

    // 3. Сохраняем в БД как черновик (pending = ждет одобрения)
    const result = await sql`
      INSERT INTO articles (title, slug, description, content, tags, status, source_url)
      VALUES (${article.title}, ${slug}, ${article.description || ''}, ${article.content}, ${tags}, 'pending', ${topicData.topic})
      RETURNING id, title, slug
    `;

    // 4. Отправляем уведомление в Telegram
    const telegramToken = import.meta.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = import.meta.env.TELEGRAM_CHAT_ID;

    if (telegramToken && telegramChatId) {
      const previewUrl = `https://upgrade-seo-blog.vercel.app/api/drafts/${result[0].id}/`;
      const message = `Новая статья готова к модерации:\n\n*${article.title}*\n\n${article.description}\n\nТеги: ${tags.join(', ')}\n\n[Превью](${previewUrl})`;

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
