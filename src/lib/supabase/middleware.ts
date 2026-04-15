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

  // Read session from cookie — no network call
  await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // NOTE: Auth redirect for unauthenticated users is handled client-side in AuthContext.
  // The middleware only refreshes the session cookie and protects admin routes.
  // Doing auth redirects here caused false redirects when tokens were being refreshed.

  return response
}
