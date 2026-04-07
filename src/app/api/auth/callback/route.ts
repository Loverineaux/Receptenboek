import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/recepten'

  const supabase = createClient()

  if (code) {
    // OAuth, magic link, or password recovery flow
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // If this is a password recovery, redirect to reset page
    if (data?.session?.user?.recovery_sent_at) {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }
  } else if (token_hash && type) {
    // Email confirmation flow
    await supabase.auth.verifyOtp({ token_hash, type: type as any })

    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
