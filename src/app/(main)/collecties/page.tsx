'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';
import CollectionCard from '@/components/recipes/CollectionCard';
import NewCollectionModal from '@/components/collections/NewCollectionModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import ScreenHeader from '@/components/ui/ScreenHeader';
import IconButton from '@/components/ui/IconButton';
import Chip from '@/components/ui/Chip';
import type { CollectionWithDetails } from '@/types';

type Tab = 'all' | 'mine';

export default function CollectiesPage() {
  const { user, loading: authLoading } = useAuth();
  // SWR-cache (key gedeeld met favorieten-pagina): terugnavigeren toont direct de vorige lijst
  const { data: collectionsData, error, mutate } = useSWR<CollectionWithDetails[]>(
    authLoading ? null : ['collections', user?.id ?? 'anon'],
    () => jsonFetcher<CollectionWithDetails[]>('/api/collections'),
    SWR_PAGE_OPTIONS
  );
  const collections = useMemo(
    () => (Array.isArray(collectionsData) ? collectionsData : []),
    [collectionsData]
  );
  const loading = collectionsData === undefined && !error;
  const fetchCollections = async () => {
    await mutate();
  };
  const [tab, setTab] = useState<Tab>('all');
  const [createOpen, setCreateOpen] = useState(false);

  // Realtime: collections changes
  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel('collections-realtime');
    const refresh = () => fetchCollections();
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collections' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'collections' }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'collections' }, refresh)
      .subscribe();
    return () => { sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = tab === 'mine' && user
    ? collections.filter((c) => c.user_id === user.id || c.is_following || c.is_collaborator)
    : collections;

  const totalRecipes = filtered.reduce((sum, c) => sum + (c.recipe_count ?? 0), 0);
  const subtitle = loading
    ? ' '
    : `${filtered.length} ${filtered.length === 1 ? 'collectie' : 'collecties'} · ${totalRecipes} ${totalRecipes === 1 ? 'recept' : 'recepten'}`;

  return (
    <PullToRefresh onRefresh={fetchCollections}>
      <div data-tour="collections-page">
        <ScreenHeader
          title="Collecties"
          subtitle={subtitle}
          actions={
            user && (
              <IconButton variant="primary" label="Nieuwe collectie" onClick={() => setCreateOpen(true)}>
                <Plus className="h-[19px] w-[19px]" strokeWidth={1.9} />
              </IconButton>
            )
          }
        />

        {/* Filters */}
        {user && (
          <div className="scrollbar-none mt-5 flex gap-2 overflow-x-auto">
            <Chip active={tab === 'all'} onClick={() => setTab('all')}>Alle collecties</Chip>
            <Chip active={tab === 'mine'} onClick={() => setTab('mine')}>Mijn collecties</Chip>
          </div>
        )}

        {/* Loading */}
        {loading && collections.length === 0 && (
          <div className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[168px] animate-pulse rounded-card bg-sunk md:h-[200px]" />
            ))}
          </div>
        )}

        {/* Grid */}
        {(!loading || collections.length > 0) && (
          <div className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
            {user && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-[168px] flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong text-sm font-semibold text-primary transition-colors hover:bg-surface md:h-[200px]"
              >
                <Plus className="h-6 w-6" strokeWidth={2.2} />
                Nieuwe collectie
              </button>
            )}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <p className="mt-6 text-center text-[14.5px] text-ink-3">
            {tab === 'mine' ? 'Je hebt nog geen collecties.' : 'Nog geen collecties.'} Maak je eerste collectie aan en verzamel je favoriete recepten.
          </p>
        )}

        <NewCollectionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => mutate((prev) => [c, ...(prev ?? [])], { revalidate: false })}
        />
      </div>
    </PullToRefresh>
  );
}
