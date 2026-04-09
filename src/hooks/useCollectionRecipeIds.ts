'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useCollectionRecipeIds() {
  const { user, loading } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIds(new Set());
      return;
    }

    fetch('/api/collections/my-recipe-ids')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIds(new Set(data));
      })
      .catch(() => {});
  }, [user?.id, loading]);

  return ids;
}
