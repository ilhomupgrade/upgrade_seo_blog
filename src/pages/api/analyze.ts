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

  const { query, type } = await request.json();

  if (!query) {
    return new Response(JSON.stringify({ error: 'Укажите запрос' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompts: Record<string, string> = {
    keywords: `Проанализируй тему "${query}" для русскоязычного SEO-блога об ИИ и бизнесе.

Верни JSON:
{
  "main_keywords": ["5-10 ключевых фраз для SEO"],
  "long_tail": ["5-7 длинных ключевых запросов"],
  "search_volume_estimate": "оценка популярности: высокая/средняя/низкая",
  "competition": "оценка конкуренции: высокая/средняя/низкая",
  "recommendation": "краткая рекомендация по статье"
}`,

    topics: `Предложи 10 тем для статей в русскоязычный SEO-блог AI-агентства на основе тренда: "${query}".

Верни JSON:
{
  "topics": [
    {
      "title": "Заголовок статьи",
      "description": "Краткое описание о чем писать",
      "keywords": ["ключ1", "ключ2"],
      "difficulty": "легко/средне/сложно",
      "potential": "высокий/средний/низкий"
    }
  ]
}`,

    competitors: `Найди топ-5 статей конкурентов в рунете по теме "${query}". Проанализируй их подходы.

Верни JSON:
{
  "competitors": [
    {
      "title": "Заголовок статьи",
      "url": "URL",
      "strengths": "Что хорошо",
      "weaknesses": "Что можно улучшить"
    }
  ],
  "gaps": ["Темы которые конкуренты не покрыли"],
  "our_angle": "Рекомендуемый угол для нашей статьи"
}`,
  };

  const analysisType = type || 'keywords';
  const prompt = prompts[analysisType] || prompts.keywords;

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
          {
            role: 'system',
            content: 'Ты - SEO-аналитик для русскоязычного блога об ИИ и бизнесе. Отвечай только валидным JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
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

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      result = { raw: content };
    }

    return new Response(JSON.stringify({ ...result, citations }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
