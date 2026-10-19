'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FolderPlus,
  Heart,
  Info,
  MoreHorizontal,
  Pencil,
  Share,
  Shuffle,
  Trash2,
  UserPlus,
  UtensilsCrossed,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useRealtimeRefresh } from '@/hooks/useRealtimeSubscription';
import { createClient } from '@/lib/supabase/client';
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';
import { formatRating } from '@/components/recipes/RecipeCard';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import BottomSheet from '@/components/ui/BottomSheet';
import StarRating from '@/components/ui/StarRating';
import Input from '@/components/ui/Input';
import { joinNames, parseMinutes, recipeCountLabel } from '@/components/collections/utils';
import dynamic from 'next/dynamic';

const ConfirmDialog = dynamic(() => import('@/components/ui/ConfirmDialog'));
const ShareModal = dynamic(() => import('@/components/ui/ShareModal'));
const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
const Modal = dynamic(() => import('@/components/ui/Modal'));
const UserPicker = dynamic(() => import('@/components/ui/UserPicker'));
import type { RecipeWithRelations, UserProfile } from '@/types';

type SortKey = 'recent' | 'snel' | 'beste';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent toegevoegd' },
  { key: 'snel', label: 'Snelste eerst' },
  { key: 'beste', label: 'Best beoordeeld' },
];

type CollectionRecipe = RecipeWithRelations & { added_at?: string | null };

function SheetAction({
  icon,
  children,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[52px] w-full items-center gap-3.5 rounded-input px-2 text-left text-[15.5px] font-medium hover:bg-sunk ${
        danger ? 'text-error' : 'text-ink'
      }`}
    >
      <span className={danger ? 'text-error' : 'text-ink-3'}>{icon}</span>
      {children}
    </button>
  );
}

export default function CollectionDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();

  // SWR-cache per collectie en gebruiker: terugnavigeren toont direct de vorige data
  const {
    data: collectionData,
    error: collectionError,
    mutate: mutateCollection,
  } = useSWR<any>(
    !authLoading && params.id ? ['collection', params.id as string, user?.id ?? 'anon'] : null,
    () => jsonFetcher(`/api/collections/${params.id}`),
    // Geen keepPreviousData: bij een andere collectie mag nooit de vorige getoond worden
    { ...SWR_PAGE_OPTIONS, keepPreviousData: false }
  );
  const loading = collectionData === undefined && !collectionError;

  const [collection, setCollection] = useState<any>(collectionData ?? null);
  const [recipes, setRecipes] = useState<CollectionRecipe[]>(collectionData?.recipes ?? []);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState<string>(collectionData?.title ?? '');
  const [editDesc, setEditDesc] = useState<string>(collectionData?.description || '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState<boolean>(collectionData?.is_following ?? false);
  const [isCollaborator, setIsCollaborator] = useState<boolean>(collectionData?.is_collaborator ?? false);
  const [collaborators, setCollaborators] = useState<UserProfile[]>(collectionData?.collaborators ?? []);
  const [followLoading, setFollowLoading] = useState(false);
  const [addToCollectionRecipeId, setAddToCollectionRecipeId] = useState<string | null>(null);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collectionRating, setCollectionRating] = useState(0);
  const [avgCollectionRating, setAvgCollectionRating] = useState<number | null>(collectionData?.average_rating ?? null);
  const [collectionRatingCount, setCollectionRatingCount] = useState<number>(collectionData?.rating_count ?? 0);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [removeRecipeId, setRemoveRecipeId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [moreOpen, setMoreOpen] = useState(false);
  const [rowMenuRecipeId, setRowMenuRecipeId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [dupInfoOpen, setDupInfoOpen] = useState(false);

  const { isAdmin: isAdminUser } = useAdmin();
  const isOwner = !!user && collection?.user_id === user.id;
  const canEdit = isOwner || isCollaborator || isAdminUser;

  // Spiegel de SWR-data naar lokale state (lokale optimistische updates blijven mogelijk)
  useEffect(() => {
    if (!collectionData) return;
    const data = collectionData;
    setCollection(data);
    setRecipes((prev) => {
      // Bewaar favoriet-status over een refresh heen
      const favs = new Map(prev.map((r) => [r.id, r.is_favorited]));
      return (data.recipes ?? []).map((r: CollectionRecipe) => ({ ...r, is_favorited: favs.get(r.id) }));
    });
    setEditTitle(data.title);
    setEditDesc(data.description || '');
    setIsFollowing(data.is_following ?? false);
    setIsCollaborator(data.is_collaborator ?? false);
    setCollaborators(data.collaborators ?? []);
    setAvgCollectionRating(data.average_rating ?? null);
    setCollectionRatingCount(data.rating_count ?? 0);
  }, [collectionData]);

  const fetchCollection = () => mutateCollection();

  // Load user's collection rating
  useEffect(() => {
    if (!user || !collection) return;
    supabase
      .from('collection_ratings')
      .select('sterren')
      .eq('collection_id', params.id as string)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCollectionRating(data.sterren);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, collection?.id]);

  // Load favorites + ratings
  useEffect(() => {
    if (!user || recipes.length === 0) return;

    const loadUserData = async () => {
      const [{ data: favs }, { data: ratings }] = await Promise.all([
        supabase.from('favorites').select('recipe_id').eq('user_id', user.id),
        supabase.from('ratings').select('recipe_id, sterren').eq('user_id', user.id),
      ]);

      const favIds = new Set((favs ?? []).map((f: any) => f.recipe_id));
      setRecipes((prev) => prev.map((r) => ({ ...r, is_favorited: favIds.has(r.id) })));

      if (ratings) {
        const map: Record<string, number> = {};
        ratings.forEach((r: any) => { map[r.recipe_id] = r.sterren; });
        setUserRatings(map);
      }
    };
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, recipes.length]);

  // Realtime: collection changes
  useRealtimeRefresh({ table: 'collection_recipes', filter: `collection_id=eq.${params.id}`, onAnyChange: fetchCollection });
  useRealtimeRefresh({ table: 'collection_follows', filter: `collection_id=eq.${params.id}`, onAnyChange: fetchCollection });
  useRealtimeRefresh({ table: 'collection_collaborators', filter: `collection_id=eq.${params.id}`, onAnyChange: fetchCollection });

  const sortedRecipes = useMemo(() => {
    const list = [...recipes];
    if (sort === 'recent') {
      list.sort((a, b) => {
        const ta = new Date(a.added_at ?? a.created_at ?? 0).getTime();
        const tb = new Date(b.added_at ?? b.created_at ?? 0).getTime();
        return tb - ta;
      });
    } else if (sort === 'snel') {
      list.sort((a, b) => {
        const ma = parseMinutes(a.tijd);
        const mb = parseMinutes(b.tijd);
        if (ma === null && mb === null) return 0;
        if (ma === null) return 1;
        if (mb === null) return -1;
        return ma - mb;
      });
    } else {
      list.sort((a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1));
    }
    return list;
  }, [recipes, sort]);

  const handleSaveEdit = async () => {
    await fetch(`/api/collections/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc }),
    });
    setCollection((prev: any) => ({ ...prev, title: editTitle, description: editDesc || null }));
    setEditOpen(false);
    mutateCollection();
  };

  const handleDelete = async () => {
    await fetch(`/api/collections/${params.id}`, { method: 'DELETE' });
    router.push('/collecties');
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    await fetch(`/api/collections/${params.id}/recipes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId }),
    });
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    mutateCollection();
  };

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)));
    await fetch(`/api/recipes/${recipeId}/favorite`, { method: isFavorited ? 'POST' : 'DELETE' });
  };

  const handleRate = async (recipeId: string, rating: number) => {
    if (!user) return;
    const newRating = rating === userRatings[recipeId] ? 0 : rating;
    if (newRating === 0) {
      setUserRatings((prev) => { const n = { ...prev }; delete n[recipeId]; return n; });
    } else {
      setUserRatings((prev) => ({ ...prev, [recipeId]: newRating }));
    }
    await fetch(`/api/recipes/${recipeId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: newRating }),
    });
  };

  const handleCollectionRate = async (rating: number) => {
    if (!user) return;
    const newRating = rating === collectionRating ? 0 : rating;
    setCollectionRating(newRating);

    await fetch(`/api/collections/${params.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: newRating }),
    });
  };

  const handleAddCollaborator = async (collab: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>) => {
    const res = await fetch(`/api/collections/${params.id}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: collab.id }),
    });
    if (res.ok) {
      setCollaborators((prev) => [...prev, collab as UserProfile]);
      mutateCollection();
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    const res = await fetch(`/api/collections/${params.id}/collaborators`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.id !== userId));
      mutateCollection();
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTitle.trim()) return;
    setDuplicating(true);
    setDuplicateError('');

    const res = await fetch(`/api/collections/${params.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: duplicateTitle.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setDuplicateOpen(false);
      setDuplicateTitle('');
      router.push(`/collecties/${data.id}`);
    } else {
      const data = await res.json();
      setDuplicateError(data.error || 'Er ging iets mis');
    }
    setDuplicating(false);
  };

  const handleFollowToggle = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    const method = isFollowing ? 'DELETE' : 'POST';
    await fetch(`/api/collections/${params.id}/follow`, { method });
    setIsFollowing(!isFollowing);
    setFollowLoading(false);
    mutateCollection();
  };

  const handleShuffle = () => {
    if (recipes.length === 0) return;
    const pick = recipes[Math.floor(Math.random() * recipes.length)];
    router.push(`/recepten/${pick.id}`);
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/collecties');
  };

  if (loading) {
    return (
      <div className="-mx-gutter -mt-3 md:mx-0 md:mt-0">
        <div className="h-[290px] animate-pulse bg-sunk md:rounded-card-lg" />
        <div className="space-y-3 px-gutter pt-5 md:px-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-card bg-sunk" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="font-display text-section font-semibold text-ink">Collectie niet gevonden</h2>
        <Link href="/collecties">
          <Button variant="primary" className="mt-4">Terug naar collecties</Button>
        </Link>
      </div>
    );
  }

  const cover: string | null =
    collection.image_url || recipes.find((r) => r.image_url)?.image_url || null;

  const others = [collection.user, ...collaborators].filter(
    (p: UserProfile | null | undefined): p is UserProfile =>
      !!p && p.id !== user?.id && !!p.display_name
  );
  const uniqueNames = Array.from(new Set(others.map((p) => p.display_name as string)));
  const subtitle = `${recipeCountLabel(recipes.length)}${
    collaborators.length > 0 && uniqueNames.length > 0
      ? ` · gedeeld met ${joinNames(uniqueNames)}`
      : !isOwner && collection.user?.display_name
        ? ` · door ${collection.user.display_name}`
        : ''
  }`;

  const rowMenuRecipe = recipes.find((r) => r.id === rowMenuRecipeId) ?? null;
  const closeRowMenu = () => setRowMenuRecipeId(null);

  return (
    <div className="-mt-3 md:mt-0">
      {/* Omslag (full-bleed) */}
      <div className="relative -mx-gutter h-[290px] overflow-hidden bg-placeholder-2 md:mx-0 md:rounded-card-lg">
        {cover && (
          <Image
            src={cover}
            alt=""
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
          />
        )}
        <div className="photo-fade pointer-events-none absolute inset-0" />
        <div className="photo-fade-top pointer-events-none absolute inset-x-0 top-0 h-28" />

        <div className="absolute inset-x-[18px] top-[calc(env(safe-area-inset-top)+14px)] flex items-start justify-between">
          <IconButton variant="photo" label="Terug" onClick={goBack}>
            <ArrowLeft className="h-[19px] w-[19px]" strokeWidth={2} />
          </IconButton>
          <div className="flex gap-2.5">
            <IconButton variant="photo" label="Delen" onClick={() => setShareOpen(true)}>
              <Share className="h-[19px] w-[19px]" strokeWidth={2} />
            </IconButton>
            <IconButton variant="photo" label="Meer acties" aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
              <MoreHorizontal className="h-[19px] w-[19px]" strokeWidth={2} />
            </IconButton>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-5 bottom-[22px] text-white">
          <h1 className="font-display text-[37px] font-semibold leading-none tracking-[-0.03em] text-pretty md:text-[44px]">
            {collection.title}
          </h1>
          <p className="mt-2 text-sm font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Acties */}
      <div className="flex gap-2.5 pt-[18px]">
        <button
          type="button"
          onClick={handleShuffle}
          disabled={recipes.length === 0}
          className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[16px] bg-primary text-[15px] font-semibold text-on-primary shadow-btn-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 md:max-w-xs"
        >
          <Shuffle className="h-[18px] w-[18px]" strokeWidth={2} />
          Kies er één voor me
        </button>
        {(isOwner || isAdminUser) && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex h-[50px] shrink-0 items-center rounded-[16px] border border-line bg-surface px-[18px] text-[15px] font-semibold text-ink hover:bg-gray-50"
          >
            Bewerken
          </button>
        )}
      </div>

      {collection.description && (
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 text-pretty">{collection.description}</p>
      )}

      {/* Sorteren */}
      <div className="scrollbar-none -mx-gutter mt-4 flex gap-2 overflow-x-auto px-gutter md:mx-0 md:px-0">
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)} className="h-9">
            {s.label}
          </Chip>
        ))}
      </div>

      {/* Recepten */}
      {sortedRecipes.length > 0 ? (
        <ul className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {sortedRecipes.map((recipe) => {
            const count = recipe.rating_count ?? recipe.ratings?.length ?? 0;
            const avg = recipe.average_rating ?? 0;
            const author = recipe.user?.display_name;
            return (
              <li
                key={recipe.id}
                className="flex items-center gap-3.5 rounded-card border border-line-soft bg-surface p-2"
              >
                <Link href={`/recepten/${recipe.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                  <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[15px] bg-placeholder">
                    {recipe.image_url ? (
                      <Image src={recipe.image_url} alt="" fill sizes="76px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-4">
                        <UtensilsCrossed className="h-6 w-6" strokeWidth={1.8} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-[15.5px] font-semibold leading-[1.3] text-ink text-pretty">
                      {recipe.title}
                    </h3>
                    <div className="mt-[5px] flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-meta text-ink-3">
                      {recipe.tijd && <span>{recipe.tijd}</span>}
                      {count > 0 && avg > 0 && (
                        <span className="tabular font-semibold text-primary">★ {formatRating(avg)}</span>
                      )}
                      {author && <span>door {author}</span>}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setRowMenuRecipeId(recipe.id)}
                  aria-label={`Meer acties voor ${recipe.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-sunk"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-card-lg border-[1.5px] border-dashed border-line-strong px-5 py-8 text-center text-[14.5px] text-ink-3">
          Nog geen recepten. Voeg recepten toe vanuit de receptpagina.
        </div>
      )}

      {/* Meer-menu collectie */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={collection.title}>
        <div className="pb-2">
          {/* Beoordeling */}
          <div className="mb-2 rounded-card bg-surface px-4 py-3">
            <p className="mb-1 text-meta font-semibold text-ink-3">
              {user ? 'Jouw beoordeling van deze collectie' : 'Beoordeling'}
            </p>
            <div className="flex items-center gap-2">
              {user ? (
                <StarRating value={collectionRating} onChange={handleCollectionRate} />
              ) : (
                <StarRating value={avgCollectionRating ?? 0} readOnly />
              )}
              <span className="text-meta text-ink-3">
                {avgCollectionRating ? `${formatRating(avgCollectionRating)} · ` : ''}
                {collectionRatingCount} {collectionRatingCount === 1 ? 'stem' : 'stemmen'}
              </span>
            </div>
          </div>

          {user && !isOwner && !isCollaborator && (
            <SheetAction
              icon={isFollowing ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              onClick={() => { handleFollowToggle(); }}
            >
              {isFollowing ? 'Niet meer volgen' : 'Collectie volgen'}
            </SheetAction>
          )}
          {user && !isOwner && (
            <div className="flex items-center">
              <div className="flex-1">
                <SheetAction
                  icon={<Copy className="h-5 w-5" />}
                  onClick={() => {
                    setMoreOpen(false);
                    setDuplicateOpen(true);
                    setDuplicateTitle('');
                    setDuplicateError('');
                  }}
                >
                  Kopieer collectie
                </SheetAction>
              </div>
              <button
                type="button"
                onClick={() => { setMoreOpen(false); setDupInfoOpen(true); }}
                aria-label="Wat doet kopiëren?"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 hover:bg-sunk"
              >
                <Info className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
          <SheetAction icon={<Share className="h-5 w-5" />} onClick={() => { setMoreOpen(false); setShareOpen(true); }}>
            Delen
          </SheetAction>
          {(isOwner || isAdminUser) && (
            <>
              <SheetAction icon={<UserPlus className="h-5 w-5" />} onClick={() => { setMoreOpen(false); setCollabModalOpen(true); }}>
                Sous-chefs beheren
              </SheetAction>
              <SheetAction icon={<Pencil className="h-5 w-5" />} onClick={() => { setMoreOpen(false); setEditOpen(true); }}>
                Titel en beschrijving bewerken
              </SheetAction>
              <SheetAction icon={<Trash2 className="h-5 w-5" />} danger onClick={() => { setMoreOpen(false); setDeleteOpen(true); }}>
                Collectie verwijderen
              </SheetAction>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Meer-menu recept */}
      <BottomSheet open={!!rowMenuRecipe} onClose={closeRowMenu} title={rowMenuRecipe?.title}>
        {rowMenuRecipe && (
          <div className="pb-2">
            <SheetAction
              icon={<ExternalLink className="h-5 w-5" />}
              onClick={() => { closeRowMenu(); router.push(`/recepten/${rowMenuRecipe.id}`); }}
            >
              Recept openen
            </SheetAction>
            {user && (
              <>
                <SheetAction
                  icon={
                    <Heart
                      className={`h-5 w-5 ${rowMenuRecipe.is_favorited ? 'fill-primary text-primary' : ''}`}
                    />
                  }
                  onClick={() => {
                    handleFavoriteToggle(rowMenuRecipe.id, !rowMenuRecipe.is_favorited);
                    closeRowMenu();
                  }}
                >
                  {rowMenuRecipe.is_favorited ? 'Verwijderen uit favorieten' : 'Toevoegen aan favorieten'}
                </SheetAction>
                <SheetAction
                  icon={<FolderPlus className="h-5 w-5" />}
                  onClick={() => { setAddToCollectionRecipeId(rowMenuRecipe.id); closeRowMenu(); }}
                >
                  Toevoegen aan collectie
                </SheetAction>
                <div className="px-2 py-3">
                  <p className="mb-1 text-meta font-semibold text-ink-3">Jouw beoordeling</p>
                  <StarRating
                    value={userRatings[rowMenuRecipe.id] ?? 0}
                    onChange={(rating) => handleRate(rowMenuRecipe.id, rating)}
                  />
                </div>
              </>
            )}
            {canEdit && (
              <SheetAction
                icon={<Trash2 className="h-5 w-5" />}
                danger
                onClick={() => { setRemoveRecipeId(rowMenuRecipe.id); closeRowMenu(); }}
              >
                Verwijderen uit collectie
              </SheetAction>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Add to collection modal */}
      {addToCollectionRecipeId && (
        <AddToCollectionModal
          recipeId={addToCollectionRecipeId}
          open={true}
          onClose={() => setAddToCollectionRecipeId(null)}
        />
      )}

      {/* Bewerken */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Collectie bewerken"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuleren</Button>
            <Button variant="primary" onClick={handleSaveEdit} disabled={!editTitle.trim()}>Opslaan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
          <div>
            <label htmlFor="edit-collection-desc" className="mb-1.5 block text-[13px] font-semibold text-ink-3">
              Beschrijving
            </label>
            <textarea
              id="edit-collection-desc"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              placeholder="Beschrijving..."
              className="w-full resize-none rounded-input border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
      </Modal>

      {/* Duplicate modal */}
      <Modal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        title="Collectie dupliceren"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDuplicateOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleDuplicate} disabled={!duplicateTitle.trim()} loading={duplicating}>
              Dupliceren
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-3">
            Alle recepten worden gekopieerd naar een nieuwe collectie van jou. Kies een unieke naam.
          </p>
          <Input
            label="Titel *"
            value={duplicateTitle}
            onChange={(e) => { setDuplicateTitle(e.target.value); setDuplicateError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
            placeholder="Naam van je nieuwe collectie..."
            error={duplicateError || undefined}
            autoFocus
          />
        </div>
      </Modal>

      {/* Collaborator management modal */}
      <Modal
        open={collabModalOpen}
        onClose={() => setCollabModalOpen(false)}
        title="Sous-chefs beheren"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-3">
            Sous-chefs kunnen recepten toevoegen aan en verwijderen uit deze collectie. Maximum 10 sous-chefs.
          </p>
          <UserPicker
            selectedUsers={collaborators}
            onAdd={handleAddCollaborator}
            onRemove={handleRemoveCollaborator}
            maxUsers={10}
            excludeIds={user ? [user.id] : []}
          />
        </div>
      </Modal>

      {/* Remove recipe confirmation */}
      <ConfirmDialog
        open={removeRecipeId !== null}
        title="Recept verwijderen uit collectie"
        message={`Weet je zeker dat je "${recipes.find((r) => r.id === removeRecipeId)?.title ?? 'dit recept'}" wilt verwijderen uit deze collectie?`}
        confirmLabel="Verwijderen"
        variant="danger"
        onConfirm={() => {
          if (removeRecipeId) handleRemoveRecipe(removeRecipeId);
          setRemoveRecipeId(null);
        }}
        onCancel={() => setRemoveRecipeId(null)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        title="Collectie verwijderen"
        message={`Weet je zeker dat je "${collection.title}" wilt verwijderen? De recepten zelf blijven bestaan.`}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Share modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={collection.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        shareType="collection"
        itemId={collection.id}
        excludeUserIds={[collection.user_id, ...collaborators.map((c) => c.id)]}
      />

      {/* Duplicate info modal */}
      <ConfirmDialog
        open={dupInfoOpen}
        title="Collectie kopiëren"
        message="Hiermee maak je een eigen kopie van deze collectie met alle recepten erin. Handig als je recepten wilt toevoegen of weghalen zonder de originele collectie te wijzigen."
        confirmLabel="Begrepen"
        variant="primary"
        onConfirm={() => setDupInfoOpen(false)}
        onCancel={() => setDupInfoOpen(false)}
      />
    </div>
  );
}
