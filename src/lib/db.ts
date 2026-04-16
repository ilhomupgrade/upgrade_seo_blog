import { neon } from '@neondatabase/serverless';

export function getDb() {
  const sql = neon(import.meta.env.DATABASE_URL);
  return sql;
}

export type Article = {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  tags: string[];
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected';
  source_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
