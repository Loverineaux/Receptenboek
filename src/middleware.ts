import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for API routes — they handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match page routes only (not static files, images, or API routes handled above).
     */
    // Ook manifest, service workers en overige statische bestanden overslaan:
    // die werden anders naar /login doorgestuurd (PWA-manifest kapot).
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|woff2?)$).*)',
  ],
}
