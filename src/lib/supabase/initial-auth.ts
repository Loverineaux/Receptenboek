import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/contexts/AuthContext'

/**
 * Resolve the authenticated user (and their profile) on the server from the
 * auth cookie, so the root layout can hand them to <AuthProvider> as initial
 * state. This makes `user` known on the very first render and removes the
 * client-side getSession() + profile waterfall that otherwise blocks every
 * cold open until the JS bundle has downloaded and hydrated.
 *
 * Uses getSession() (signed cookie, no network) to match the middleware and
 * the existing client behaviour. RLS still enforces real auth on every query.
 */
export async function getInitialAuth(): Promise<{
  user: User | null
  profile: Profile | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) return { user: null, profile: null }

    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, email, display_name, avatar_url, bio, role, is_blocked, has_completed_tour'
      )
      .eq('id', user.id)
      .single()

    return { user, profile: (profile as Profile | null) ?? null }
  } catch {
    // Never let an auth read crash the whole layout — fall back to the client
    // resolving the session itself.
    return { user: null, profile: null }
  }
}
