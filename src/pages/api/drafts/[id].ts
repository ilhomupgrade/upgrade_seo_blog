import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { commitFileToGitHub } from '../../../lib/github';
import { buildArticleMarkdown } from '../../../lib/frontmatter';

export const prerender = false;

// GET - превью черновика
export const GET: APIRoute = async ({ params }) => {
  const sql = neon(import.meta.env.DATABASE_URL);
  const id = Number(params.id);

  const articles = await sql`SELECT * FROM articles WHERE id = ${id}`;
  if (articles.length === 0) {
    return json({ error: 'Статья не найдена' }, 404);
  }

  return json(articles[0]);
};

// POST - одобрить или отклонить
export const POST: APIRoute = async ({ params, request }) => {
  const sql = neon(import.meta.env.DATABASE_URL);
  const id = Number(params.id);
  const { action } = await request.json();

  // Защита
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const articles = await sql`SELECT * FROM articles WHERE id = ${id}`;
  if (articles.length === 0) {
    return json({ error: 'Статья не найдена' }, 404);
  }

  const article = articles[0];

  if (action === 'reject') {
    await sql`UPDATE articles SET status = 'rejected', updated_at = NOW() WHERE id = ${id}`;
    return json({ success: true, status: 'rejected' });
  }

  if (action === 'approve') {
    const frontmatter = buildArticleMarkdown(article as any);
    const filePath = `src/data/blog/${article.slug}.md`;

    // Коммитим в GitHub
    const githubToken = import.meta.env.GITHUB_TOKEN;
    if (!githubToken) {
      return json({ error: 'GITHUB_TOKEN не настроен' }, 500);
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

    return json({ success: true, status: 'published', path: filePath });
  }

  return json({ error: 'Неизвестное действие. Используйте approve или reject' }, 400);
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
