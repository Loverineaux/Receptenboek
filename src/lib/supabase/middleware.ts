import { createServerClient } from '@supabase/ssr'
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
        // getAll/setAll (not get/set/remove): a refreshed Supabase session is
        // written as MULTIPLE cookies at once (large JWTs are chunked into
        // ...auth-token.0, .1, …). The old per-cookie `set` rebuilt `response`
        // on every call, so each rebuild dropped the chunks set before it —
        // leaving a half-written, corrupt session cookie. That surfaced as
        // random logouts and recipes that kept spinning. setAll writes the
        // whole batch in one go, so the rotated token is persisted intact.
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
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

  // Auth check — use getSession() which reads the signed cookie (no network
  // roundtrip). getUser() would verify against the Supabase Auth server, but
  // on cold start that adds ~1-2s to TTFB on every page load. For a
  // middleware redirect decision the signed-cookie check is sufficient; RLS
  // enforces real authentication on every data query anyway.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

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
