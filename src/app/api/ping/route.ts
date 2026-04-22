import { NextResponse } from 'next/server';

// Lightweight endpoint to keep Vercel serverless functions warm
// Also pings other critical API routes to prevent their cold starts
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://receptenboek-rcr7.vercel.app';

  // Fire-and-forget pings to warm up the most-used API routes.
  // These bypass middleware (see src/middleware.ts) so their handler
  // isolates and Supabase connections get primed even without auth.
  const routes = [
    '/api/notifications/count',
    '/api/collections/my-recipe-ids',
    '/api/users/heartbeat',
    // Main recipe list — heaviest query on the initial /recepten page
    '/api/recipes?limit=1',
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
