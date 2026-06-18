'use client'

import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordTiming, recordNavigationTiming } from '@/lib/telemetry'
import type { User, AuthError } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  is_blocked: boolean | null
  has_completed_tour: boolean | null
}

export interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: ReactNode
  /** User resolved server-side from the auth cookie and passed in by the root
   *  layout. When present, `user` is known on the very first render, so the
   *  app is interactive immediately — no client-side getSession() round trip
   *  blocks the cold open. The client effect below still reconciles against
   *  the real cookie in the background. */
  initialUser?: User | null
  initialProfile?: Profile | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  // If the server already resolved a user we are not "loading" — render the
  // authenticated UI on first paint instead of a spinner.
  const [loading, setLoading] = useState(!initialUser)

  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      const tProfile = performance.now()
      const { data } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, bio, role, is_blocked, has_completed_tour')
        .eq('id', userId)
        .single()
      recordTiming('auth.fetchProfile', performance.now() - tProfile)

      // Redirect blocked users
      if (data?.is_blocked && typeof window !== 'undefined' && !window.location.pathname.includes('/geblokkeerd')) {
        window.location.href = '/geblokkeerd'
        return
      }

      setProfile(data as Profile | null)
    },
    [supabase]
  )

  useEffect(() => {
    let cancelled = false
    const t0 = performance.now()

    // Fire once after load: browser navigation timing
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        recordNavigationTiming()
      } else {
        window.addEventListener('load', recordNavigationTiming, { once: true })
      }
    }

    // Reconcile the client against the real auth cookie. When the server
    // already injected `initialUser` this no longer blocks the first paint
    // (loading is already false); it just corrects the state if the cookie
    // disagrees (e.g. a stale PWA cache). RLS enforces real auth on every
    // data query, so the signed-cookie user is safe enough for UX.
    const getInitialSession = async () => {
      const tSession = performance.now()
      const { data: { session } } = await supabase.auth.getSession()
      recordTiming('auth.getSession', performance.now() - tSession)

      const currentUser = session?.user ?? null

      if (cancelled) return

      setUser(currentUser)
      setLoading(false)
      recordTiming('auth.ready', performance.now() - t0, { hasUser: !!currentUser })

      if (currentUser) {
        // Skip the profile round trip when the server already gave us this
        // user's profile — it's fresh and avoids a redundant query on boot.
        if (!initialProfile || initialProfile.id !== currentUser.id) {
          fetchProfile(currentUser.id)
        }
        fetch('/api/users/heartbeat', { method: 'POST' }).catch(() => {})
        // Background verification — if Supabase Auth disagrees with the
        // cookie, onAuthStateChange will fire and the user state resets.
        const tUser = performance.now()
        supabase.auth
          .getUser()
          .then(() => recordTiming('auth.getUser', performance.now() - tUser, { background: true }))
          .catch(() => {})
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null

      setUser(currentUser)
      setLoading(false)

      if (currentUser) {
        // Only fetch profile on sign-in, not on token refresh (profile doesn't change)
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
          fetchProfile(currentUser.id)
        }
      } else {
        setProfile(null)
        if (_event === 'SIGNED_OUT') {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
            window.location.href = '/login'
          }
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    return { error }
  }

  const resetPassword = async (
    email: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/auth/reset-password`,
    })
    return { error }
  }

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
