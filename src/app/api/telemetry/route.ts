import { NextRequest, NextResponse } from 'next/server';

/**
 * Temporary client-side telemetry collector. Logs each phase + ms to the
 * Vercel runtime log so we can see exactly where cold-load time goes.
 * Zero storage, zero DB writes. Remove the endpoint + caller once we've
 * fixed the slow path.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) return NextResponse.json({ ok: false });
    const session = typeof body.session === 'string' ? body.session : 'anon';
    const phase = typeof body.phase === 'string' ? body.phase : 'unknown';
    const ms = typeof body.ms === 'number' ? body.ms : -1;
    const pathname =
      typeof body.pathname === 'string' ? body.pathname : '';
    const extra =
      body.extra && typeof body.extra === 'object' ? body.extra : undefined;
    console.log(
      `[Telemetry] session=${session} phase=${phase} ms=${ms} path=${pathname}`,
      extra ?? '',
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
