export async function commitFileToGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<boolean> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // Check if file already exists
  const existing = await fetch(url, {
    headers: { Authorization: `token ${token}`, 'User-Agent': 'upgrade-seo-blog' },
  });

  let sha: string | undefined;
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'upgrade-seo-blog',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return true;
}
