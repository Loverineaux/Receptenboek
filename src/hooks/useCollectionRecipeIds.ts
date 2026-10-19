'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';

export function useCollectionRecipeIds() {
  const { user, loading } = useAuth();

  const { data } = useSWR<string[]>(
    !loading && user ? ['collection-recipe-ids', user.id] : null,
    () => jsonFetcher<string[]>('/api/collections/my-recipe-ids'),
    SWR_PAGE_OPTIONS
  );

  return useMemo(() => new Set<string>(Array.isArray(data) ? data : []), [data]);
}
