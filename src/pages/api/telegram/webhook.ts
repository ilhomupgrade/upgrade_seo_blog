import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { commitFileToGitHub } from '../../../lib/github';
import { buildArticleMarkdown } from '../../../lib/frontmatter';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const callback = body.callback_query;

  if (!callback?.data) {
    return new Response('OK');
  }

  const [action, idStr] = callback.data.split(':');
  const id = Number(idStr);
  const telegramToken = import.meta.env.TELEGRAM_BOT_TOKEN;

  if (!action || !id || !telegramToken) {
    return new Response('OK');
  }

  const sql = neon(import.meta.env.DATABASE_URL);
  const articles = await sql`SELECT * FROM articles WHERE id = ${id}`;

  if (articles.length === 0) {
    await answerCallback(telegramToken, callback.id, 'Статья не найдена');
    return new Response('OK');
  }

  const article = articles[0];

  if (article.status !== 'pending') {
    await answerCallback(telegramToken, callback.id, `Статья уже ${article.status}`);
    return new Response('OK');
  }

  if (action === 'reject') {
    await sql`UPDATE articles SET status = 'rejected', updated_at = NOW() WHERE id = ${id}`;
    await answerCallback(telegramToken, callback.id, 'Статья отклонена');
    await editMessage(telegramToken, callback.message, `Отклонено: ${article.title}`);
    return new Response('OK');
  }

  if (action === 'approve') {
    try {
      const frontmatter = buildArticleMarkdown(article as any);
      const filePath = `src/data/blog/${article.slug}.md`;
      const githubToken = import.meta.env.GITHUB_TOKEN;

      if (!githubToken) {
        await answerCallback(telegramToken, callback.id, 'GITHUB_TOKEN не настроен');
        return new Response('OK');
      }

      await commitFileToGitHub(
        githubToken,
        'ilhomupgrade',
        'upgrade_seo_blog',
        filePath,
        frontmatter,
        `feat: publish article - ${article.title}`,
      );

      await sql`
        UPDATE articles
        SET status = 'published', published_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
      `;

      await answerCallback(telegramToken, callback.id, 'Статья опубликована! Деплой через ~1 мин');
      await editMessage(
        telegramToken,
        callback.message,
        `Опубликовано: ${article.title}\n\nСтатья появится на сайте через ~1 минуту после деплоя.`,
      );
    } catch (err) {
      await answerCallback(telegramToken, callback.id, `Ошибка: ${String(err).slice(0, 100)}`);
    }

    return new Response('OK');
  }

  return new Response('OK');
};

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function editMessage(token: string, message: any, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: message.chat.id,
      message_id: message.message_id,
      text,
    }),
  });
}
