import { makeHandler } from '@keystatic/astro/api';
import config from '../keystatic.config';

const innerHandler = makeHandler({
  config,
  clientId: import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID,
  clientSecret: import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET,
  secret: import.meta.env.KEYSTATIC_SECRET,
});

export const prerender = false;

export async function ALL(context) {
  // Fix request URL origin for Vercel (req.url may show localhost)
  const host = context.request.headers.get('x-forwarded-host')
    || context.request.headers.get('host');
  if (host && new URL(context.request.url).hostname === 'localhost') {
    const proto = context.request.headers.get('x-forwarded-proto') || 'https';
    const originalUrl = new URL(context.request.url);
    const fixedUrl = `${proto}://${host}${originalUrl.pathname}${originalUrl.search}`;
    const fixedRequest = new Request(fixedUrl, {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.body,
      redirect: context.request.redirect,
    });
    return innerHandler({ ...context, request: fixedRequest });
  }
  return innerHandler(context);
}

export const all = ALL;
