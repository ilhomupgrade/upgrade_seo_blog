import type { APIRoute } from 'astro';
import { askPerplexityWithCitations } from '../../../lib/perplexity';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: 'OPENROUTER_API_KEY не настроен' }, 500);

  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return json({ error: 'Telegram не настроен' }, 500);

  try {
    const today = new Date();
    const from = new Date(today.getTime() - 86400000);
    const fromStr = from.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const { content, citations } = await askPerplexityWithCitations(
      apiKey,
      'Ты - редактор новостного дайджеста про ИИ. Пишешь на русском языке. Кратко, по делу, только факты.',
      `Найди 7 самых свежих и важных новостей в сфере искусственного интеллекта. Бери самые актуальные из доступных тебе.

Для каждой новости укажи:
- Источник (название издания или компании)
- Заголовок
- 2-4 ключевых тезиса через дефис

Формат СТРОГО такой (один блок = одна новость, между блоками пустая строка):

[Источник]: [Заголовок]

- тезис 1
- тезис 2
- тезис 3

Требования:
- Только реальные новости из реальных источников
- Приоритет: TechCrunch, The Verge, Reuters, Bloomberg, Wired, OpenAI blog, Anthropic blog, Google blog, VC.ru, Habr, RBC
- Без вступлений, без итогов, без лишних слов - только сами блоки новостей
- Ровно 7 новостей`
    );

    // Build sources footer
    const uniqueSources = [...new Set(citations || [])].slice(0, 5);
    const sourcesText = uniqueSources.length > 0
      ? '\n\nИсточники:\n' + uniqueSources.map(u => u).join('\n')
      : '';

    const dateLabel = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const message = `Дайджест ИИ - ${dateLabel}\n\n${content.trim()}${sourcesText}\n\n@upgrade_ai_blog`;

    // Send to Telegram (split if > 4096 chars)
    const chunks = splitMessage(message, 4000);
    for (const chunk of chunks) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
    }

    return json({ ok: true, chunks: chunks.length });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};

function splitMessage(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      parts.push(remaining);
      break;
    }
    // Split on last newline before limit
    let cut = remaining.lastIndexOf('\n', limit);
    if (cut < limit * 0.5) cut = limit;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  return parts;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
