import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  return new Response(JSON.stringify({
    fullUrl: request.url,
    origin: url.origin,
    hostname: url.hostname,
    host: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    xForwardedProto: request.headers.get('x-forwarded-proto'),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
