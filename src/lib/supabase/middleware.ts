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

  const pathname = request.nextUrl.pathname

  // Public pages — no auth needed
  const isPublicPath = ['/login', '/register', '/wachtwoord-vergeten'].some((p) => pathname.startsWith(p))
  if (isPublicPath) {
    // Still refresh session cookie if one exists
    await supabase.auth.getSession()
    return response
  }

  // Social media bots — let through for OG link previews (WhatsApp, iMessage, etc.)
  const ua = request.headers.get('user-agent') || ''
  const isSocialBot = /bot|crawl|spider|WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Googlebot|Slackbot|Discordbot|iMessageBot|Applebot|Bingbot|Pinterestbot/i.test(ua)
  if (isSocialBot) {
    return response
  }

  // Auth check — use getUser() for reliable server verification
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in → redirect to login, remember where they wanted to go
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return response
}
