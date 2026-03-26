'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  Heart,
  Share2,
  Pencil,
  Trash2,
  ChefHat,
  AlertTriangle,
  Lightbulb,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BronBadge from '@/components/ui/BronBadge';
import PortieSelector from '@/components/ui/PortieSelector';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { RecipeWithRelations, Comment as CommentType } from '@/types';

// ── fraction formatting ──────────────────────────

function toFraction(val: number): string {
  if (val === 0) return '0';

  const whole = Math.floor(val);
  const frac = val - whole;

  const fractionMap: [number, string][] = [
    [0.25, '\u00BC'],
    [0.33, '\u2153'],
    [0.5, '\u00BD'],
    [0.66, '\u2154'],
    [0.75, '\u00BE'],
  ];

  let fracStr = '';
  for (const [threshold, symbol] of fractionMap) {
    if (Math.abs(frac - threshold) < 0.05) {
      fracStr = symbol;
      break;
    }
  }

  if (!fracStr && frac > 0.01) {
    // No common fraction match; round to one decimal
    return val.toFixed(1).replace(/\.0$/, '');
  }

  if (whole === 0) return fracStr || val.toFixed(1).replace(/\.0$/, '');
  if (!fracStr) return whole.toString();
  return `${whole}${fracStr}`;
}

// ── tabs ──────────────────────────────────────────

type Tab = 'ingredienten' | 'bereiding' | 'voeding';

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [recipe, setRecipe] = useState<RecipeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ingredienten');
  const [portions, setPortions] = useState(4);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── fetch recipe ────────────────────────────────

  const fetchRecipe = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from('recipes')
      .select(
        `
        *,
        ingredients(*),
        steps(*),
        tags:recipe_tags(tag:tags(*)),
        nutrition(*),
        ratings(*),
        comments(*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)),
        user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
      `
      )
      .eq('id', params.id)
      .single();

    if (!data) {
      setLoading(false);
      return;
    }

    const ratings = data.ratings ?? [];
    const avg =
      ratings.length > 0
        ? ratings.reduce((s: number, r: any) => s + r.score, 0) / ratings.length
        : null;

    const flatTags = (data.tags ?? []).map((rt: any) => rt.tag).filter(Boolean);

    const r: RecipeWithRelations = {
      ...data,
      tags: flatTags,
      average_rating: avg,
      nutrition: Array.isArray(data.nutrition)
        ? data.nutrition[0] ?? null
        : data.nutrition,
      ingredients: (data.ingredients ?? []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
      steps: (data.steps ?? []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
      comments: data.comments ?? [],
      user: data.user as any,
    };

    setRecipe(r);
    setPortions(r.servings);
    setComments(data.comments ?? []);

    // Check favorite
    if (user) {
      const { data: fav } = await supabase
        .from('favorites')
        .select('id')
        .eq('recipe_id', params.id)
        .eq('user_id', user.id)
        .single();

      setIsFavorited(!!fav);

      // Check user rating
      const myRating = ratings.find((rt: any) => rt.user_id === user.id);
      if (myRating) setUserRating(myRating.score);
    }

    setLoading(false);
  }, [supabase, params.id, user]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  // ── actions ────────────────────────────────────

  const toggleFavorite = async () => {
    if (!user) return;

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('recipe_id', params.id)
        .eq('user_id', user.id);
    } else {
      await supabase.from('favorites').insert({
        recipe_id: params.id,
        user_id: user.id,
      });
    }
    setIsFavorited(!isFavorited);
  };

  const handleRate = async (score: number) => {
    if (!user) return;
    setUserRating(score);

    await fetch(`/api/recipes/${params.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: score }),
    });

    // Refresh to update average
    fetchRecipe();
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);

    const res = await fetch(`/api/recipes/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tekst: commentText }),
    });

    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentText('');
    }

    setSubmittingComment(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/recipes/${params.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/recepten');
    }
    setDeleting(false);
    setDeleteModalOpen(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link gekopieerd naar klembord!');
  };

  // ── loading / not found ────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          Recept niet gevonden
        </h2>
        <Link href="/recepten">
          <Button variant="primary" className="mt-4">
            Terug naar recepten
          </Button>
        </Link>
      </div>
    );
  }

  // ── derived values ─────────────────────────────

  const isOwner = user?.id === recipe.user_id;
  const ratio = portions / recipe.servings;
  const totalTime =
    recipe.total_time_minutes ??
    (((recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)) || null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ingredienten', label: 'Ingredienten' },
    { key: 'bereiding', label: 'Bereiding' },
    { key: 'voeding', label: 'Voeding' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Hero image ─────────────────────────────── */}
      <div className="relative -mx-4 -mt-6 overflow-hidden sm:-mx-6 sm:rounded-b-2xl">
        <div className="aspect-[16/7] w-full">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/60">
              <span className="text-7xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

        {/* BronBadge */}
        <div className="absolute left-4 top-4">
          <BronBadge bron={recipe.source} />
        </div>

        {/* Actions overlay */}
        <div className="absolute right-4 top-4 flex gap-2">
          <button
            onClick={toggleFavorite}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorited
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600'
              }`}
            />
          </button>
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Share2 className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── Title area ─────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{recipe.title}</h1>
        {recipe.description && (
          <p className="mt-1 text-text-secondary">{recipe.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {totalTime && (
            <div className="flex items-center gap-1 text-sm text-text-secondary">
              <Clock className="h-4 w-4" />
              <span>{totalTime} min</span>
            </div>
          )}

          <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-text-secondary">
            {recipe.difficulty}
          </span>

          {recipe.average_rating !== null && (
            <StarRating
              value={recipe.average_rating}
              readOnly
              count={recipe.ratings.length}
            />
          )}
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="mt-4 flex gap-2">
            <Link href={`/recepten/${recipe.id}/bewerk`}>
              <Button variant="secondary" size="sm">
                <Pencil className="h-4 w-4" />
                Bewerken
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Verwijderen
            </Button>
          </div>
        )}
      </div>

      {/* ── Portie selector ────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-primary">Porties:</span>
        <PortieSelector value={portions} onChange={setPortions} />
      </div>

      {/* ── Rate (interactive for logged-in users) ── */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary">
            Jouw beoordeling:
          </span>
          <StarRating value={userRating} onChange={handleRate} />
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="flex border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────── */}
      {tab === 'ingredienten' && (
        <ul className="space-y-2">
          {recipe.ingredients.map((ing) => {
            const scaled = ing.hoeveelheid ? ing.hoeveelheid * ratio : null;
            return (
              <li
                key={ing.id}
                className="flex items-baseline gap-2 border-b border-gray-100 py-2 text-sm"
              >
                <span className="min-w-[3rem] font-semibold text-text-primary">
                  {scaled !== null ? toFraction(scaled) : ''}
                </span>
                <span className="text-text-secondary">{ing.eenheid ?? ''}</span>
                <span className="text-text-primary">{ing.naam}</span>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'bereiding' && (
        <ol className="space-y-6">
          {recipe.steps.map((step, idx) => (
            <li key={step.id} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                {step.titel && (
                  <h4 className="font-semibold text-text-primary">
                    {step.titel}
                  </h4>
                )}
                <p className="text-sm text-text-secondary whitespace-pre-line">
                  {step.beschrijving}
                </p>
                {step.afbeelding_url && (
                  <img
                    src={step.afbeelding_url}
                    alt={`Stap ${idx + 1}`}
                    className="mt-2 max-h-48 rounded-lg object-cover"
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === 'voeding' && recipe.nutrition && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  Voedingswaarde
                </th>
                <th className="px-4 py-2 text-right font-medium text-text-secondary">
                  Per portie
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ['Calorieen', recipe.nutrition.calories, 'kcal'],
                ['Eiwitten', recipe.nutrition.protein_grams, 'g'],
                ['Koolhydraten', recipe.nutrition.carbs_grams, 'g'],
                ['Vet', recipe.nutrition.fat_grams, 'g'],
                ['Vezels', recipe.nutrition.fiber_grams, 'g'],
                ['Suikers', recipe.nutrition.sugar_grams, 'g'],
                ['Natrium', recipe.nutrition.sodium_mg, 'mg'],
              ].map(
                ([label, value, unit]) =>
                  value !== null &&
                  value !== undefined && (
                    <tr key={label as string}>
                      <td className="px-4 py-2 text-text-primary">
                        {label as string}
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {value as number} {unit as string}
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'voeding' && !recipe.nutrition && (
        <p className="py-8 text-center text-sm text-text-secondary">
          Geen voedingswaarden beschikbaar.
        </p>
      )}

      {/* ── Sidebar info: weetje, allergenen, benodigdheden ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Weetje - stored as metadata; show if available */}
        <div className="rounded-lg border bg-amber-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <Lightbulb className="h-4 w-4" />
            Weetje
          </div>
          <p className="mt-1 text-sm text-amber-700">
            Binnenkort beschikbaar
          </p>
        </div>

        <div className="rounded-lg border bg-red-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Allergenen
          </div>
          <p className="mt-1 text-sm text-red-700">
            Binnenkort beschikbaar
          </p>
        </div>

        <div className="rounded-lg border bg-blue-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-blue-800">
            <ChefHat className="h-4 w-4" />
            Benodigdheden
          </div>
          <p className="mt-1 text-sm text-blue-700">
            Binnenkort beschikbaar
          </p>
        </div>
      </div>

      {/* ── Comments ───────────────────────────────── */}
      {recipe.is_public && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Reacties</h2>

          {comments.length === 0 && (
            <p className="text-sm text-text-secondary">
              Nog geen reacties. Wees de eerste!
            </p>
          )}

          <div className="space-y-3">
            {comments.map((c: any) => (
              <div
                key={c.id}
                className="flex gap-3 rounded-lg border p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  {c.user?.avatar_url ? (
                    <img
                      src={c.user.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-text-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-primary">
                    {c.user?.display_name ?? 'Anoniem'}
                  </p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {user && (
            <div className="flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Schrijf een reactie..."
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                variant="primary"
                size="sm"
                loading={submittingComment}
                onClick={handleComment}
                className="self-end"
              >
                Plaatsen
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ── Delete modal ───────────────────────────── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Recept verwijderen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Annuleren
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Verwijderen
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Weet je zeker dat je dit recept wilt verwijderen? Dit kan niet ongedaan
          worden gemaakt.
        </p>
      </Modal>
    </div>
  );
}
