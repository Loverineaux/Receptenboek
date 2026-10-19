import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/contexts/AuthContext'

/**
 * Resolve the authenticated user on the server from the auth cookie, so the
 * root layout can hand it to <AuthProvider> as initial state. This makes
 * `user` known on the very first render and removes the client-side
 * getSession() waterfall that otherwise blocks every cold open until the JS
 * bundle has downloaded and hydrated.
 *
 * Uses getSession() (signed cookie, no network) to match the middleware and
 * the existing client behaviour. RLS still enforces real auth on every query.
 *
 * Bewust GEEN profielquery hier: de root layout blokkeert de hele pagina tot
 * deze functie klaar is. Op de kleine Supabase-instance duurde die query na
 * stilte 5-10 s — precies de "hang" na Google-login. AuthContext haalt het
 * profiel nu op de achtergrond op (initialProfile is dan null).
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

    return { user: session?.user ?? null, profile: null }
  } catch {
    // Never let an auth read crash the whole layout — fall back to the client
    // resolving the session itself.
    return { user: null, profile: null }
  }
}
