import type { APIRoute } from 'astro';

export const prerender = false;

const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'PERPLEXITY_API_KEY не настроен' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { topic, keywords, tone } = await request.json();

  if (!topic) {
    return new Response(JSON.stringify({ error: 'Укажите тему статьи' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = `Ты - профессиональный копирайтер AI-агентства Upgrade. Пишешь экспертные статьи на русском языке для бизнес-аудитории.

Правила:
- Пиши живым языком без канцелярита
- Используй подзаголовки ## и ###
- Добавляй списки и конкретные примеры
- В конце статьи - CTA с предложением услуг Upgrade
- Статья должна быть 800-1200 слов
- Не используй длинные тире (—), используй короткие (-)
- Не используй букву ё
- Не используй эмодзи
- Формат: чистый Markdown`;

  const userPrompt = `Напиши статью для SEO-блога на тему: "${topic}"
${keywords ? `Ключевые слова для SEO: ${keywords}` : ''}
${tone ? `Тон: ${tone}` : 'Тон: экспертный, но доступный'}

Верни JSON в формате:
{
  "title": "Заголовок статьи (до 60 символов)",
  "description": "SEO-описание (до 155 символов)",
  "tags": ["тег1", "тег2", "тег3"],
  "content": "Полный текст статьи в Markdown"
}`;

  try {
    const response = await fetch(PERPLEXITY_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `Perplexity API: ${error}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const citations = data.citations || [];

    let article;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      article = jsonMatch ? JSON.parse(jsonMatch[0]) : { content };
    } catch {
      article = { content };
    }

    return new Response(JSON.stringify({ ...article, citations }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
