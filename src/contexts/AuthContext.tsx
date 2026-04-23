'use client'

import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordTiming, recordNavigationTiming } from '@/lib/telemetry'
import type { User, AuthError } from '@supabase/supabase-js'

interface Profile {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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

    // Get initial session — first try getSession (reads cookie + auto-refreshes token),
    // then verify with getUser if we have a session
    const getInitialSession = async () => {
      const tSession = performance.now()
      const { data: { session } } = await supabase.auth.getSession()
      recordTiming('auth.getSession', performance.now() - tSession)

      let currentUser = session?.user ?? null

      if (currentUser) {
        const tUser = performance.now()
        const { data: { user: verified } } = await supabase.auth.getUser()
        recordTiming('auth.getUser', performance.now() - tUser)
        if (verified) currentUser = verified
      }

      if (cancelled) return

      setUser(currentUser)
      setLoading(false)
      recordTiming('auth.ready', performance.now() - t0, { hasUser: !!currentUser })

      if (currentUser) {
        fetchProfile(currentUser.id)
        fetch('/api/users/heartbeat', { method: 'POST' }).catch(() => {})
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
