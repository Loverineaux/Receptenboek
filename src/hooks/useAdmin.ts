'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Cache admin status per session to avoid repeated API calls
let cachedResult: { userId: string; isAdmin: boolean } | null = null;

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const cached = cachedResult && user && cachedResult.userId === user.id;
  const [isAdmin, setIsAdmin] = useState(cached ? cachedResult!.isAdmin : false);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      cachedResult = null;
      return;
    }

    // Use cache if same user
    if (cachedResult && cachedResult.userId === user.id) {
      setIsAdmin(cachedResult.isAdmin);
      setLoading(false);
      return;
    }

    fetch('/api/admin/check')
      .then((res) => res.json())
      .then((data) => {
        const admin = data.isAdmin === true;
        cachedResult = { userId: user.id, isAdmin: admin };
        setIsAdmin(admin);
        setLoading(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
