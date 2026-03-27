import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const supabase = createClient()

  if (code) {
    // OAuth or magic link flow
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    // Email confirmation flow
    await supabase.auth.verifyOtp({ token_hash, type: type as any })
  }

  return NextResponse.redirect(new URL('/recepten', request.url))
}
