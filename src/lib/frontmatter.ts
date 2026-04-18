type ArticleRow = {
  title: string;
  slug: string;
  description: string | null;
  content: string;
  tags: string[] | null;
  source_url: string | null;
};

export function buildArticleMarkdown(article: ArticleRow): string {
  const today = new Date().toISOString().split('T')[0];
  let cover = '/og-default.jpg';
  if (article.source_url) {
    try {
      const meta = JSON.parse(article.source_url);
      if (meta?.cover && typeof meta.cover === 'string' && /^https?:\/\//.test(meta.cover)) {
        cover = meta.cover;
      }
    } catch {
      // source_url не JSON (старый формат) - оставляем дефолт
    }
  }

  const title = article.title.replace(/"/g, '\\"');
  const description = (article.description || '').replace(/"/g, '\\"');
  const tags = (article.tags || []).map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ');

  return [
    '---',
    `title: "${title}"`,
    `description: "${description}"`,
    `pubDate: ${today}`,
    `author: "Upgrade"`,
    `tags: [${tags}]`,
    `cover: "${cover}"`,
    '---',
    '',
    article.content,
  ].join('\n');
}
