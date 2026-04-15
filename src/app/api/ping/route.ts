import { NextResponse } from 'next/server';

// Lightweight endpoint to keep Vercel serverless functions warm
// Also pings other critical API routes to prevent their cold starts
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://receptenboek-rcr7.vercel.app';

  // Fire-and-forget pings to warm up the most-used API routes
  const routes = [
    '/api/notifications/count',
    '/api/collections/my-recipe-ids',
    '/api/users/heartbeat',
  ];

  await Promise.allSettled(
    routes.map((route) =>
      fetch(`${baseUrl}${route}`, {
        method: route === '/api/users/heartbeat' ? 'POST' : 'GET',
        headers: { 'x-warm-ping': '1' },
      }).catch(() => {})
    )
  );

  return NextResponse.json({ ok: true, warmed: routes.length });
}
