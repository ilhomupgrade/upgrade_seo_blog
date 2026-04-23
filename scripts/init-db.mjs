import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function init() {
  console.log('Creating tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      tags TEXT[] DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'published', 'rejected')),
      source_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS topic_queue (
      id SERIAL PRIMARY KEY,
      topic TEXT NOT NULL,
      keywords TEXT[] DEFAULT '{}',
      source TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'done', 'skipped')),
      article_id INTEGER REFERENCES articles(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS news_posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      what_happened TEXT NOT NULL DEFAULT '',
      why_it_matters TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS prompt_posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      how_to_use TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('Tables created successfully!');

  const rows = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log('Tables:', rows.map((r) => r.tablename));
}

init().catch(console.error);
