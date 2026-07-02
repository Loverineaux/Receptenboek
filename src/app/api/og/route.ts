import { NextRequest, NextResponse } from 'next/server';
import { assertPublicUrl } from '@/lib/security/ssrf';

// Proxy recipe images for OG previews — avoids hotlink protection from external sites
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // SSRF-guard: weiger interne/private bestemmingen en niet-http(s) schemes.
  try {
    await assertPublicUrl(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  try {
    // Redirects handmatig volgen zodat elke tussenstap opnieuw tegen de
    // SSRF-guard wordt gevalideerd — een externe host mag ons niet naar een
    // intern adres 302'en na de eerste validatie.
    let current = url;
    let imageRes: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      const res = await fetch(current, {
        redirect: 'manual',
        headers: {
          // Pretend to be a browser to bypass hotlink protection
          'User-Agent': 'Mozilla/5.0 (compatible; Receptenboek/1.0)',
          'Accept': 'image/*',
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;
        const next = new URL(location, current).href;
        await assertPublicUrl(next); // valideer de redirect-bestemming
        current = next;
        continue;
      }
      imageRes = res;
      break;
    }

    if (!imageRes || !imageRes.ok) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    // Alleen afbeeldingen doorgeven — voorkom dat de proxy willekeurige
    // content (HTML/JSON van interne services) teruglekt.
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 400 });
    }
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
