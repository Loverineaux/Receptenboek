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

  // Refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicPaths = ['/login', '/register', '/wachtwoord-vergeten', '/api/auth']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))
  const isAssetPath = pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.') || pathname === '/sw.js' || pathname === '/manifest.json'

  // Allow social media bots to access recipe pages for link previews (OG tags)
  const userAgent = request.headers.get('user-agent') || ''
  const isSocialBot = /WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Googlebot|Slackbot|Discordbot/i.test(userAgent)

  // Redirect unauthenticated users to login (except public pages, assets, and social bots)
  if (!user && !isPublicPath && !isAssetPath && !isSocialBot) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect blocked users to /geblokkeerd
  if (user && pathname !== '/geblokkeerd'
    && !pathname.startsWith('/api/')
    && !pathname.startsWith('/_next/')
    && !pathname.includes('.')
  ) {
    const cachedCheck = request.cookies.get('blocked_check')?.value
    let isBlocked = false

    if (cachedCheck) {
      const [cachedUid, cachedTs, cachedBlocked] = cachedCheck.split(':')
      const cacheAge = Date.now() - Number(cachedTs)
      if (cachedUid === user.id && cacheAge < 5 * 60 * 1000) {
        isBlocked = cachedBlocked === '1'
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_blocked')
          .eq('id', user.id)
          .single()
        isBlocked = !!profile?.is_blocked
        response.cookies.set('blocked_check', `${user.id}:${Date.now()}:${isBlocked ? '1' : '0'}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 300,
          path: '/',
        })
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', user.id)
        .single()
      isBlocked = !!profile?.is_blocked
      response.cookies.set('blocked_check', `${user.id}:${Date.now()}:${isBlocked ? '1' : '0'}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300,
        path: '/',
      })
    }

    if (isBlocked) {
      return NextResponse.redirect(new URL('/geblokkeerd', request.url))
    }
  }

  // Protect admin routes — require login
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
