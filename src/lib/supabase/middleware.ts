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

  // Use getSession() instead of getUser() — reads from cookie, no network call
  // getUser() always calls Supabase which adds 500ms+ latency on every page load
  let session = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data?.session
  } catch {
    // Cookie parsing can fail with corrupted/malformed session data — continue as unauthenticated
  }

  const pathname = request.nextUrl.pathname

  // Protect admin routes — require login
  if (pathname.startsWith('/admin') && !session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
