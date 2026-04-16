import { makeHandler } from '@keystatic/astro/api';
import config from '../keystatic.config';

export const all = makeHandler({
  config,
  clientId: import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID,
  clientSecret: import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET,
  secret: import.meta.env.KEYSTATIC_SECRET,
});
export const ALL = all;

export const prerender = false;
