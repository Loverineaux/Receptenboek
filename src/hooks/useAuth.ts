'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthError } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  is_blocked: boolean | null
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, bio, role, is_blocked')
        .eq('id', userId)
        .single()

      // Redirect blocked users
      if (data?.is_blocked && typeof window !== 'undefined' && !window.location.pathname.includes('/geblokkeerd')) {
        window.location.href = '/geblokkeerd'
        return
      }

      setAuthState((prev) => ({ ...prev, profile: data as Profile | null }))
    },
    [supabase]
  )

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Set loading=false immediately so pages can render and fetch data
      setAuthState((prev) => ({ ...prev, user, loading: false }))

      if (user) {
        // Profile loads in background — Header shows skeleton until ready
        fetchProfile(user.id)
        fetch('/api/users/heartbeat', { method: 'POST' }).catch(() => {})
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useAuth] onAuthStateChange:', _event, session?.user?.id)
      const currentUser = session?.user ?? null

      setAuthState((prev) => ({
        ...prev,
        user: currentUser,
        loading: false,
      }))

      if (currentUser) {
        fetchProfile(currentUser.id)
      } else {
        setAuthState((prev) => ({ ...prev, profile: null }))
        // Session expired or user signed out — redirect to login
        if (_event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED') {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
            window.location.href = '/login'
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
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
    if (authState.user) await fetchProfile(authState.user.id)
  }, [authState.user, fetchProfile])

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    refreshProfile,
  }
}
