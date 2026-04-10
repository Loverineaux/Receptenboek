'use client';

import { useAuth } from '@/hooks/useAuth';

export function useAdmin() {
  const { user, profile, loading: authLoading } = useAuth();

  // Derive admin status directly from profile — no separate API call needed
  const isAdmin = profile?.role === 'admin';

  // Loading until we have the profile (profile loads in background after user)
  const loading = authLoading || (!!user && !profile);

  return { isAdmin, loading };
}
