'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Pencil, Share2, Trash2, User, Users, X as XIcon, Copy, UserPlus, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useRealtimeRefresh } from '@/hooks/useRealtimeSubscription';
import { createClient } from '@/lib/supabase/client';
import RecipeCard from '@/components/recipes/RecipeCard';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import dynamic from 'next/dynamic';

const ConfirmDialog = dynamic(() => import('@/components/ui/ConfirmDialog'));
const ShareModal = dynamic(() => import('@/components/ui/ShareModal'));
const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
const Modal = dynamic(() => import('@/components/ui/Modal'));
const UserPicker = dynamic(() => import('@/components/ui/UserPicker'));
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import type { RecipeWithRelations, UserProfile } from '@/types';

export default function CollectionDetailPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState<any>(null);
  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [initialUserRatings, setInitialUserRatings] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [addToCollectionRecipeId, setAddToCollectionRecipeId] = useState<string | null>(null);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collectionRating, setCollectionRating] = useState(0);
  const [avgCollectionRating, setAvgCollectionRating] = useState<number | null>(null);
  const [collectionRatingCount, setCollectionRatingCount] = useState(0);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [removeRecipeId, setRemoveRecipeId] = useState<string | null>(null);

  const collectionRecipeIds = useCollectionRecipeIds();
  const { isAdmin: isAdminUser } = useAdmin();
  const isOwner = user && collection?.user_id === user.id;
  const canEdit = isOwner || isCollaborator || isAdminUser;

  const fetchCollection = useCallback(async () => {
    const res = await fetch(`/api/collections/${params.id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCollection(data);
    setRecipes(data.recipes ?? []);
    setEditTitle(data.title);
    setEditDesc(data.description || '');
    setIsFollowing(data.is_following ?? false);
    setIsCollaborator(data.is_collaborator ?? false);
    setCollaborators(data.collaborators ?? []);
    setAvgCollectionRating(data.average_rating ?? null);
    setCollectionRatingCount(data.rating_count ?? 0);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

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
        setInitialUserRatings(map);
      }
    };
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, recipes.length]);

  const handleSaveEdit = async () => {
    await fetch(`/api/collections/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc }),
    });
    setCollection((prev: any) => ({ ...prev, title: editTitle, description: editDesc || null }));
    setEditing(false);
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
  };

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;
    if (isFavorited) {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
    } else {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'DELETE' });
    }
    setRecipes((prev) => prev.map((r) => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r));
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
  };

  const [shareOpen, setShareOpen] = useState(false);

  // Realtime: collection changes
  useRealtimeRefresh({ table: 'collection_recipes', filter: `collection_id=eq.${params.id}`, onAnyChange: fetchCollection });
  useRealtimeRefresh({ table: 'collection_follows', filter: `collection_id=eq.${params.id}`, onAnyChange: fetchCollection });
  useRealtimeRefresh({ table: 'collection_collaborators', filter: `collection_id=eq.${params.id}`, onAnyChange: fetchCollection });
  const [dupInfoOpen, setDupInfoOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl">🔍</span>
        <h2 className="mt-4 text-lg font-semibold text-text-primary">Collectie niet gevonden</h2>
        <Link href="/collecties">
          <Button variant="primary" className="mt-4">Terug naar collecties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/collecties"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Collecties
      </Link>

      {/* Header */}
      <div className="space-y-2">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Beschrijving..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>Opslaan</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuleren</Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text-primary">{collection.title}</h1>
            {collection.description && (
              <p className="text-sm text-text-secondary">{collection.description}</p>
            )}

            {/* Collection rating */}
            <div className="flex items-center gap-3">
              {user ? (
                <StarRating
                  value={collectionRating}
                  onChange={handleCollectionRate}
                />
              ) : (
                <StarRating
                  value={avgCollectionRating ?? 0}
                  readOnly
                />
              )}
              <span className="text-xs text-text-muted">({collectionRatingCount})</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-text-muted">
                {collection.user?.avatar_url ? (
                  <Image src={collection.user.avatar_url} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                {collection.user?.display_name || 'Gebruiker'}
              </div>
              <span className="text-sm text-text-muted">
                {recipes.length} recept{recipes.length !== 1 ? 'en' : ''}
              </span>
            </div>

            {/* Collaborator avatars */}
            {collaborators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-text-muted" />
                <div className="flex -space-x-2">
                  {collaborators.slice(0, 5).map((c) => (
                    c.avatar_url ? (
                      <Image key={c.id} src={c.avatar_url} alt={c.display_name || ''} title={c.display_name || 'Sous-chef'} width={24} height={24} className="h-6 w-6 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <div key={c.id} title={c.display_name || 'Sous-chef'} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100">
                        <User className="h-3 w-3 text-gray-400" />
                      </div>
                    )
                  ))}
                  {collaborators.length > 5 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-text-secondary">
                      +{collaborators.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Follow + duplicate buttons — only for non-owners, hide follow for collaborators */}
            {user && !isOwner && (
              <>
                {!isCollaborator && (
                  <Button
                    variant={isFollowing ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                  >
                    {isFollowing ? 'Volgend' : 'Volgen'}
                  </Button>
                )}
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDuplicateOpen(true); setDuplicateTitle(''); setDuplicateError(''); }}
                  >
                    <Copy className="h-4 w-4" />
                    Kopieer collectie
                  </Button>
                  <button
                    onClick={() => setDupInfoOpen(true)}
                    className="ml--1 rounded-full p-1 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-primary"
                    title="Wat doet dit?"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Delen
            </Button>
            {(isOwner || isAdminUser) && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setCollabModalOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Sous-chefs
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Bewerken
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                  Verwijderen
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recipes */}
      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="relative">
              <RecipeCard
                recipe={recipe}
                onFavoriteToggle={handleFavoriteToggle}
                onRate={user ? handleRate : undefined}
                userRating={userRatings[recipe.id]}
                initialUserRating={initialUserRatings[recipe.id] ?? 0}
                onAddToCollection={user ? () => setAddToCollectionRecipeId(recipe.id) : undefined}
                isInCollection={collectionRecipeIds.has(recipe.id)}
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setRemoveRecipeId(recipe.id)}
                  className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
                  title="Verwijder uit collectie"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl">🍽️</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">Nog geen recepten</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Voeg recepten toe vanuit de receptdetailpagina.
          </p>
        </div>
      )}

      {/* Add to collection modal */}
      {addToCollectionRecipeId && (
        <AddToCollectionModal
          recipeId={addToCollectionRecipeId}
          open={true}
          onClose={() => setAddToCollectionRecipeId(null)}
        />
      )}

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
            <Button variant="primary" onClick={handleDuplicate} disabled={!duplicateTitle.trim() || duplicating}>
              {duplicating ? 'Dupliceren...' : 'Dupliceren'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Alle recepten worden gekopieerd naar een nieuwe collectie van jou. Kies een unieke naam.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Titel *
            </label>
            <input
              type="text"
              value={duplicateTitle}
              onChange={(e) => { setDuplicateTitle(e.target.value); setDuplicateError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
              placeholder="Naam van je nieuwe collectie..."
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {duplicateError && (
            <p className="text-sm text-red-500">{duplicateError}</p>
          )}
        </div>
      </Modal>

      {/* Collaborator management modal */}
      <Modal
        open={collabModalOpen}
        onClose={() => setCollabModalOpen(false)}
        title="Sous-chefs beheren"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
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
