import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/recepten'

  const supabase = createClient()

  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // If password recovery, redirect to reset page
    if (next === '/auth/reset-password') {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }

    // Check if this is a new OAuth user without access code verification
    if (data?.user) {
      const user = data.user
      const isOAuth = user.app_metadata?.provider !== 'email'

      if (isOAuth) {
        const accessCodeCookie = request.cookies.get('access_code_verified')?.value

        // Check if the user is brand new (created in the last 30 seconds)
        const createdAt = new Date(user.created_at).getTime()
        const isNewUser = Date.now() - createdAt < 30000

        if (isNewUser && accessCodeCookie !== 'true') {
          // New OAuth user without access code — delete and redirect
          // First clean up any auto-created profile
          await supabaseAdmin.from('notification_preferences').delete().eq('user_id', user.id)
          await supabaseAdmin.from('profiles').delete().eq('id', user.id)
          await supabaseAdmin.auth.admin.deleteUser(user.id)
          await supabase.auth.signOut()

          return NextResponse.redirect(
            new URL('/register?error=Je+hebt+een+toegangscode+nodig+om+te+registreren', request.url)
          )
        }

        // Clear the cookie after successful registration
        if (accessCodeCookie) {
          const response = NextResponse.redirect(new URL(next, request.url))
          response.cookies.delete('access_code_verified')
          return response
        }
      }
    }
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any })

    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
