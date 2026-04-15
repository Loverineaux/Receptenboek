import { NextRequest, NextResponse } from 'next/server';

// Proxy recipe images for OG previews — avoids hotlink protection from external sites
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const imageRes = await fetch(url, {
      headers: {
        // Pretend to be a browser to bypass hotlink protection
        'User-Agent': 'Mozilla/5.0 (compatible; Receptenboek/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageRes.ok) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
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
