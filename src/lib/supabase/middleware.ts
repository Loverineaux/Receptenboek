import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Read session from cookie (instant, no network call)
  // getUser() was used here before but adds 500ms+ per request
  let session = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data?.session
  } catch {
    // Cookie parsing can fail with corrupted/malformed session data
  }

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicPaths = ['/login', '/register', '/wachtwoord-vergeten']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  // Allow social media / messaging bots through for link preview OG tags
  const ua = request.headers.get('user-agent') || ''
  const isSocialBot = /bot|crawl|spider|WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Googlebot|Slackbot|Discordbot|iMessageBot|Applebot|Bingbot|Pinterestbot/i.test(ua)

  // Check if a session cookie exists (even if getSession returned null due to expiry)
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  // Redirect unauthenticated users to login (except public pages and bots)
  if (!session?.user && !hasSessionCookie && !isPublicPath && !isSocialBot) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Protect admin routes
  if (pathname.startsWith('/admin') && !session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // NOTE: is_blocked check is handled client-side in AuthContext.fetchProfile()
  // Doing it here added ~200ms+ per page request for every user

  return response
}
