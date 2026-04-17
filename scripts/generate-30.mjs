import { config } from 'dotenv';
config({ path: '.env.local' });

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;

const map = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ж':'zh','з':'z','и':'i',
  'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s',
  'т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
  'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya','ё':'e',
};

function slugify(text) {
  return text.toLowerCase().split('').map(ch => map[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function ask(systemPrompt, userPrompt, temp = 0.7, maxTokens = 4000) {
  const res = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'perplexity/sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: temp,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// Темы для 30 статей - разнообразные, трендовые
const topicPrompts = [
  'ИИ-агенты для бизнеса в 2026 году - тренды и прогнозы',
  'Как малый бизнес использует ChatGPT для автоматизации',
  'Google Gemini 2.5 - что нового и как применить в работе',
  'Нейросети для создания видеоконтента - обзор инструментов',
  'Автоматизация продаж с помощью ИИ - практическое руководство',
  'ИИ в маркетинге - как нейросети меняют рекламу',
  'Сравнение GPT-4o, Claude и Gemini - какой выбрать для бизнеса',
  'Как ИИ помогает в HR - подбор персонала нейросетями',
  'Чат-боты для бизнеса - как создать эффективного помощника',
  'ИИ в логистике - оптимизация маршрутов и складов',
  'Midjourney и Flux - генерация изображений для бизнеса',
  'Как защитить бизнес от угроз ИИ - кибербезопасность',
  'ИИ для анализа данных - инструменты и кейсы',
  'Автоматизация бухгалтерии с помощью нейросетей',
  'ИИ в образовании - как технологии меняют обучение',
  'Голосовые ИИ-ассистенты для бизнеса - обзор решений',
  'RAG системы - как научить ИИ работать с вашими документами',
  'ИИ для email-маркетинга - персонализация и автоматизация',
  'Как ИИ меняет юридическую сферу - анализ контрактов',
  'ИИ в недвижимости - автоматизация оценки и продаж',
  'Мультимодальные нейросети - что это и зачем бизнесу',
  'Как ИИ помогает в управлении проектами',
  'ИИ для клиентского сервиса - снижение нагрузки на операторов',
  'Тренды ИИ 2026 - что ждет бизнес в ближайший год',
  'Как внедрить ИИ в производство - промышленный ИИ',
  'ИИ-копирайтинг - как нейросети пишут тексты для бизнеса',
  'Low-code и ИИ - создание приложений без программистов',
  'ИИ для финтеха - автоматизация банковских процессов',
  'Как ИИ помогает в медицине - диагностика и лечение',
  'Open source ИИ модели - Llama, Mistral, Qwen для бизнеса',
];

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const blogDir = join(process.cwd(), 'src/data/blog');

async function generateArticle(topic, index) {
  console.log(`[${index + 1}/30] Генерация: ${topic}`);

  try {
    const raw = await ask(
      `Ты - профессиональный копирайтер AI-агентства Upgrade. Пишешь экспертные статьи на русском языке для бизнес-аудитории.

Правила:
- Пиши живым языком без канцелярита
- Используй подзаголовки ## и ###
- Добавляй списки и конкретные примеры
- В конце статьи - CTA с предложением услуг Upgrade
- Статья должна быть 800-1200 слов
- Не используй длинные тире, используй короткие (-)
- Не используй букву ё
- Не используй эмодзи
- Формат: чистый Markdown`,
      `Напиши статью на тему: "${topic}"

Найди релевантное изображение из первоисточников по теме. Дай прямой URL на изображение (jpg/png/webp).

Верни JSON:
{
  "title": "Заголовок статьи (до 60 символов, на русском)",
  "description": "SEO-описание (до 155 символов, на русском)",
  "tags": ["тег1", "тег2", "тег3"],
  "cover_url": "https://... прямой URL на изображение из первоисточника",
  "content": "Полный текст статьи в Markdown (800-1200 слов)"
}`,
      0.7,
      4000,
    );

    const article = parseJSON(raw);
    if (!article?.title || !article?.content) {
      console.log(`  SKIP: не удалось распарсить JSON`);
      return null;
    }

    const slug = slugify(article.title);
    const filePath = join(blogDir, `${slug}.md`);

    if (existsSync(filePath)) {
      console.log(`  SKIP: файл уже существует ${slug}.md`);
      return null;
    }

    const cover = article.cover_url || '/og-default.jpg';
    const pubDate = new Date(Date.now() - (29 - index) * 86400000).toISOString().split('T')[0];

    const md = [
      '---',
      `title: "${article.title.replace(/"/g, '\\"')}"`,
      `description: "${(article.description || '').replace(/"/g, '\\"')}"`,
      `pubDate: ${pubDate}`,
      `author: "Upgrade"`,
      `tags: [${(article.tags || []).map(t => `"${t}"`).join(', ')}]`,
      `cover: "${cover}"`,
      '---',
      '',
      article.content,
    ].join('\n');

    writeFileSync(filePath, md, 'utf-8');
    console.log(`  OK: ${slug}.md (cover: ${cover.slice(0, 60)}...)`);
    return slug;
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Генерация 30 статей через Perplexity/Sonar на OpenRouter...\n');

  let success = 0;
  for (let i = 0; i < topicPrompts.length; i++) {
    const result = await generateArticle(topicPrompts[i], i);
    if (result) success++;
    // Пауза между запросами чтобы не превысить rate limit
    if (i < topicPrompts.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\nГотово: ${success}/30 статей сгенерировано`);
}

main().catch(console.error);
