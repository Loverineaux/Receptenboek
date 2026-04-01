'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
import CookMode from '@/components/recipes/CookMode';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { RecipeWithRelations, Comment as CommentType } from '@/types';

// ── fraction parsing + formatting ────────────────

const UNICODE_FRACTIONS: Record<string, number> = {
  '\u00BC': 0.25, // ¼
  '\u00BD': 0.5,  // ½
  '\u00BE': 0.75, // ¾
  '\u2153': 0.33, // ⅓
  '\u2154': 0.66, // ⅔
  '\u215B': 0.125, // ⅛
};

// Dutch word amounts
const DUTCH_AMOUNTS: Record<string, number> = {
  'halve': 0.5, 'half': 0.5,
  'kwart': 0.25,
  'driekwart': 0.75,
  'hele': 1, 'heel': 1,
  'dubbele': 2, 'dubbel': 2,
};

function parseAmount(text: string | null): number | null {
  if (!text) return null;
  let str = text.trim().toLowerCase();
  if (!str) return null;

  // Dutch word amounts: "halve" → 0.5
  if (DUTCH_AMOUNTS[str] !== undefined) return DUTCH_AMOUNTS[str];

  // Replace comma with dot: "1,5" → "1.5"
  str = str.replace(',', '.');

  // Handle unicode fractions: "1½" → 1.5, "½" → 0.5
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (str.includes(char)) {
      const before = str.replace(char, '').trim();
      const whole = before ? parseFloat(before) : 0;
      return isNaN(whole) ? val : whole + val;
    }
  }

  // Handle text fractions: "1/2" → 0.5, "3/4" → 0.75
  const fracMatch = str.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  // Handle mixed: "1 1/2" → 1.5
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Scale numbers in step text based on portion ratio.
 * Smart about what to scale (ingredients) vs what not to (time, temp, steps).
 */
function scaleStepText(text: string, ratio: number): string {
  if (ratio === 1) return text;

  // Words that should NOT scale
  const skipWords = /^(minuut|minuten|min|uur|uren|sec|seconden|graden|°|cm|mm|meter|stap|keer\s+per|procent|%)/i;

  // Words that should scale AND round to whole numbers (countable items)
  const wholeNumberWords = /^(bord|borden|glas|glazen|kom|kommen|schaal|schalen|pannen?|lepels?|vork|vorken|mes|messen|kopjes?|mokken?)/i;

  // Words that should scale (ingredient amounts)
  const scaleWords = /^(g|gram|kg|ml|l|dl|cl|el|tl|stuks?|plakjes?|sneetjes?|teentjes?|blaadjes?|takjes?|scheutjes?|snufjes?|eetlepels?|theelepels?|handjes?|bosjes?|banaan|bananen|ei|eieren|ui|uien|tomaat|tomaten|aardappel|aardappelen|wortel|wortelen|plak|plakken|schijf|schijven|bal|ballen|wrap|wraps|brood|broodjes|stuk|stukken|stukjes|snee|sneetje|beker|bekers|blik|blikjes?|zakjes?|potjes?)/i;

  return text.replace(/(\d+[\d,./]*)/g, (match, _num, offset) => {
    const after = text.substring(offset + match.length).trimStart();

    // Don't scale time/temperature
    if (skipWords.test(after)) return match;

    const parsed = parseFloat(match.replace(',', '.'));
    if (isNaN(parsed)) return match;

    // Check if followed by a scalable word
    if (wholeNumberWords.test(after)) {
      // Round to whole numbers for countable non-food items
      return String(Math.round(parsed * ratio));
    }

    if (scaleWords.test(after) || /^[a-z]/.test(after)) {
      const scaled = parsed * ratio;
      if (Number.isInteger(scaled)) return String(scaled);
      return scaled.toFixed(1).replace(/\.0$/, '');
    }

    return match;
  });
}

function smartUnit(unit: string, amount: number): string {
  const lower = unit.toLowerCase();

  // Units that don't change
  const invariant = ['gram', 'g', 'kg', 'ml', 'l', 'dl', 'cl', 'el', 'tl'];
  if (invariant.includes(lower)) return unit;

  // Singular/plural pairs
  const pairs: [string, string][] = [
    ['handje', 'handjes'], ['snufje', 'snufjes'], ['scheutje', 'scheutjes'],
    ['bosje', 'bosjes'], ['takje', 'takjes'], ['teentje', 'teentjes'],
    ['plakje', 'plakjes'], ['stuk', 'stuks'], ['blaadje', 'blaadjes'],
    ['sneetje', 'sneetjes'], ['stokje', 'stokjes'], ['blikje', 'blikjes'],
    ['zakje', 'zakjes'], ['potje', 'potjes'],
    ['eetlepel', 'eetlepels'], ['theelepel', 'theelepels'],
  ];

  for (const [singular, plural] of pairs) {
    if (lower === singular || lower === plural) {
      return amount <= 1 ? singular : plural;
    }
  }

  return unit;
}

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

const CATEGORY_LIST = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch', 'Pasta', 'Salade', 'Soep', 'Dessert', 'Ontbijt', 'Lunch'];

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [recipe, setRecipe] = useState<RecipeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ingredienten');
  const [portions, setPortions] = useState(2);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scaledSteps, setScaledSteps] = useState<any[] | null>(null);
  const [scalingSteps, setScalingSteps] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const scaledForPortions = useRef<number | null>(null);

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
        benodigdheden(*),
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
        ? ratings.reduce((s: number, r: any) => s + r.sterren, 0) / ratings.length
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
    setPortions(r.basis_porties);
    setComments(data.comments ?? []);

    // Check favorite
    if (user) {
      const { data: fav } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('recipe_id', params.id)
        .eq('user_id', user.id)
        .single();

      setIsFavorited(!!fav);

      // Check user rating
      const myRating = ratings.find((rt: any) => rt.user_id === user.id);
      if (myRating) setUserRating(myRating.sterren);
    }

    setLoading(false);
  }, [supabase, params.id, user]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  // ── scale steps with AI ────────────────────────

  const scaleStepsWithAi = useCallback(async (newPortions: number) => {
    if (!recipe || newPortions === recipe.basis_porties) {
      setScaledSteps(null);
      scaledForPortions.current = null;
      return;
    }
    if (scaledForPortions.current === newPortions) return;

    setScalingSteps(true);
    try {
      const res = await fetch(`/api/recipes/${params.id}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: recipe.steps,
          ingredients: recipe.ingredients,
          basisPorties: recipe.basis_porties,
          newPorties: newPortions,
        }),
      });
      if (res.ok) {
        const { steps } = await res.json();
        setScaledSteps(steps);
        scaledForPortions.current = newPortions;
      }
    } catch {
      // Fallback: keep regex-scaled text
    } finally {
      setScalingSteps(false);
    }
  }, [recipe, params.id]);

  const handlePortionChange = (newPortions: number) => {
    setPortions(newPortions);
    scaleStepsWithAi(newPortions);
  };

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
    // Toggle: click same star to remove rating
    const newScore = score === userRating ? 0 : score;
    setUserRating(newScore);

    await fetch(`/api/recipes/${params.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: newScore }),
    });

    // Refresh to update average
    fetchRecipe();
  };

  const handleComment = async (parentId?: string) => {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);

    const res = await fetch(`/api/recipes/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tekst: commentText, parent_id: parentId || null }),
    });

    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentText('');
      setReplyTo(null);
    }

    setSubmittingComment(false);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const isLiked = commentLikes.has(commentId);

    if (isLiked) {
      await supabase.from('comment_likes').delete()
        .eq('comment_id', commentId).eq('user_id', user.id);
      setCommentLikes((prev) => { const n = new Set(prev); n.delete(commentId); return n; });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes_count: (c.likes_count || 1) - 1 } : c));
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
      setCommentLikes((prev) => new Set(prev).add(commentId));
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c));
    }
  };

  const renderComment = (c: any, isReply = false) => (
    <div key={c.id} className="flex gap-3 rounded-lg border p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
        {c.user?.avatar_url ? (
          <img src={c.user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-text-muted" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-text-primary">
          {c.user?.display_name ?? 'Anoniem'}
          <span className="ml-2 font-normal text-text-muted">
            {new Date(c.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' '}
            {new Date(c.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
        {editingComment === c.id ? (
          <div className="mt-1 flex gap-2">
            <textarea
              value={editCommentText}
              onChange={(e) => setEditCommentText(e.target.value)}
              rows={2}
              className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex flex-col gap-1">
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (!editCommentText.trim()) return;
                  await supabase.from('comments').update({ tekst: editCommentText.trim() }).eq('id', c.id);
                  setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, tekst: editCommentText.trim() } : x));
                  setEditingComment(null);
                }}
              >
                Opslaan
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingComment(null)}>
                Annuleer
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-text-secondary">{c.tekst}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={() => handleLikeComment(c.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                commentLikes.has(c.id) ? 'text-primary font-medium' : 'text-text-muted hover:text-primary'
              }`}
            >
              <Heart className={`h-3 w-3 ${commentLikes.has(c.id) ? 'fill-primary' : ''}`} />
              {(c.likes_count || 0) > 0 && <span>{c.likes_count}</span>}
            </button>
          )}
          {user && !isReply && (
            <button
              type="button"
              onClick={() => { setReplyTo(c.id); setCommentText(''); }}
              className="text-xs text-text-muted hover:text-primary"
            >
              Reageer
            </button>
          )}
          {user && c.user_id === user.id && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingComment(c.id);
                  setEditCommentText(c.tekst);
                }}
                className="text-xs text-text-muted hover:text-primary"
              >
                Bewerk
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmAction({
                    title: 'Reactie verwijderen',
                    message: 'Weet je zeker dat je deze reactie wilt verwijderen?',
                    onConfirm: async () => {
                      await supabase.from('comments').delete().eq('id', c.id);
                      setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
                      setConfirmAction(null);
                    },
                  });
                }}
                className="text-xs text-text-muted hover:text-red-500"
              >
                Verwijder
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/recipes/${params.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/recepten');
    }
    setDeleting(false);
    setDeleteModalOpen(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: recipe?.title || 'Recept',
      text: `${recipe?.title}${recipe?.subtitle ? ` — ${recipe.subtitle.substring(0, 80)}` : ''}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage('Link gekopieerd naar klembord!');
      setTimeout(() => setToastMessage(null), 3000);
    }
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
  const ratio = portions / recipe.basis_porties;

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

        {/* Back button + BronBadge */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <BronBadge bron={recipe.bron} />
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

        {/* Intro/subtitle in styled block */}
        {recipe.subtitle && (
          <div className="mt-3 rounded-lg border-l-4 border-primary/40 bg-primary/5 px-4 py-3">
            <p className="text-sm italic leading-relaxed text-text-secondary">
              {recipe.subtitle}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {recipe.tijd && (
            <div className="flex items-center gap-1 text-sm text-text-secondary">
              <Clock className="h-4 w-4" />
              <span>{recipe.tijd}</span>
            </div>
          )}

          {recipe.moeilijkheid && (
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-text-secondary">
              {recipe.moeilijkheid}
            </span>
          )}

          {recipe.average_rating !== null && (
            <StarRating
              value={recipe.average_rating}
              readOnly
              count={recipe.ratings.length}
            />
          )}
        </div>

        {/* Tags — owner can edit category tags */}
        <div className="mt-3 flex flex-wrap gap-2">
          {isOwner ? (
            <>
              {CATEGORY_LIST.map((cat) => {
                const hasTag = recipe.tags.some((t) => t.name.toLowerCase() === cat.toLowerCase());
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={async () => {
                      if (hasTag) {
                        // Remove tag
                        const tag = recipe.tags.find((t) => t.name.toLowerCase() === cat.toLowerCase());
                        if (tag) {
                          await supabase.from('recipe_tags').delete()
                            .eq('recipe_id', recipe.id).eq('tag_id', tag.id);
                        }
                      } else {
                        // Add tag — first find existing, then create if needed
                        let { data: tag } = await supabase.from('tags')
                          .select('id').eq('name', cat).single();
                        if (!tag) {
                          const { data: newTag } = await supabase.from('tags')
                            .insert({ name: cat }).select().single();
                          tag = newTag;
                        }
                        if (tag) {
                          const { error } = await supabase.from('recipe_tags')
                            .insert({ recipe_id: recipe.id, tag_id: tag.id });
                          if (error) console.error('recipe_tags insert error:', error.message);
                        }
                      }
                      fetchRecipe();
                    }}
                    className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                      hasTag
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                    }`}
                  >
                    {hasTag ? '✓ ' : ''}{cat}
                  </button>
                );
              })}
              {/* Non-category tags (read-only) */}
              {recipe.tags
                .filter((t) => !CATEGORY_LIST.some((c) => c.toLowerCase() === t.name.toLowerCase()))
                .map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary"
                  >
                    {tag.name}
                  </span>
                ))}
            </>
          ) : (
            recipe.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary"
              >
                {tag.name}
              </span>
            ))
          )}
        </div>

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

      {/* ── Portie selector + Kookmodus ────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary">Porties:</span>
          <PortieSelector value={portions} onChange={handlePortionChange} />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCookMode(true)}
        >
          <ChefHat className="h-4 w-4" />
          Kookmodus
        </Button>
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
        <div className="space-y-1">
          {recipe.ingredients.map((ing) => {
            // Try to parse amount from hoeveelheid field first
            let parsed = parseAmount(ing.hoeveelheid);
            let eenheid = ing.eenheid ?? '';
            let naam = ing.naam ?? '';

            // If no amount in hoeveelheid, try to extract from naam
            // e.g. "Rucola Handje" → amount=1, eenheid=handje, naam=Rucola
            // e.g. "Avocado Halve" → amount=0.5, naam=Avocado
            if (parsed === null && naam) {
              const parts = naam.trim().split(/\s+/);
              const lastWord = parts[parts.length - 1]?.toLowerCase();

              // Check if last word is a unit implying quantity 1
              const impliedOneUnits: Record<string, string> = {
                'handje': 'handje', 'handjes': 'handje',
                'snufje': 'snufje', 'snufjes': 'snufje',
                'scheutje': 'scheutje', 'scheutjes': 'scheutje',
                'bosje': 'bosje', 'bosjes': 'bosje',
                'takje': 'takje', 'takjes': 'takje',
                'teentje': 'teentje', 'teentjes': 'teentje',
                'plakje': 'plakje', 'plakjes': 'plakje',
                'blaadjes': 'blaadjes',
              };

              if (impliedOneUnits[lastWord]) {
                parsed = 1;
                eenheid = impliedOneUnits[lastWord];
                naam = parts.slice(0, -1).join(' ');
              } else {
                // Check for Dutch word amounts: "Avocado Halve"
                const wordAmount = DUTCH_AMOUNTS[lastWord];
                if (wordAmount !== undefined) {
                  parsed = typeof wordAmount === 'number' ? wordAmount : parseAmount(wordAmount);
                  naam = parts.slice(0, -1).join(' ');
                }
              }
            }

            const scaled = parsed !== null ? parsed * ratio : null;
            const amount = scaled !== null ? toFraction(scaled) : (ing.hoeveelheid ?? '');
            // Pluralize unit if scaled > 1
            const displayEenheid = scaled !== null && scaled > 1 && eenheid
              ? smartUnit(eenheid, scaled)
              : eenheid;

            return (
              <label
                key={ing.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                <span className="flex-1 text-sm text-text-primary">
                  {amount && (
                    <span className="font-semibold">{amount}</span>
                  )}{' '}
                  {displayEenheid && (
                    <span className="text-text-secondary">{displayEenheid}</span>
                  )}{' '}
                  {naam}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {tab === 'bereiding' && (
        <div className="space-y-6">
          {scalingSteps && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-2 text-sm text-primary">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Bereiding aanpassen voor {portions} porties...
            </div>
          )}
          <ol className="space-y-6">
            {(scaledSteps || recipe.steps).map((step, idx) => (
              <li key={step.id || idx} className="flex gap-4">
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
                    {scaledSteps ? step.beschrijving : scaleStepText(step.beschrijving, ratio)}
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
        </div>
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
                ['Energie', recipe.nutrition.energie_kcal, 'kcal'],
                ['Energie', recipe.nutrition.energie_kj, 'kJ'],
                ['Vetten', recipe.nutrition.vetten, 'g'],
                ['  waarvan verzadigd', recipe.nutrition.verzadigd, 'g'],
                ['Koolhydraten', recipe.nutrition.koolhydraten, 'g'],
                ['  waarvan suikers', recipe.nutrition.suikers, 'g'],
                ['Vezels', recipe.nutrition.vezels, 'g'],
                ['Eiwitten', recipe.nutrition.eiwitten, 'g'],
                ['Zout', recipe.nutrition.zout, 'g'],
              ].map(
                ([label, value, unit], idx) =>
                  value !== null &&
                  value !== undefined &&
                  value !== '' && (
                    <tr key={`${label}-${idx}`}>
                      <td className="px-4 py-2 text-text-primary">
                        {label as string}
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {value as string} {unit as string}
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

      {/* ── Extra info cards (only show when data exists) ── */}
      {(recipe.weetje || recipe.allergenen || (recipe as any).benodigdheden?.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {recipe.weetje && (
            <div className="rounded-lg border bg-amber-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <Lightbulb className="h-4 w-4" />
                Weetje
              </div>
              <p className="mt-1 text-sm text-amber-700">{recipe.weetje}</p>
            </div>
          )}

          {recipe.allergenen && (
            <div className="rounded-lg border bg-red-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Allergenen
              </div>
              <p className="mt-1 text-sm text-red-700">{recipe.allergenen}</p>
            </div>
          )}

          {(recipe as any).benodigdheden?.length > 0 && (
            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-blue-800">
                <ChefHat className="h-4 w-4" />
                Benodigdheden
              </div>
              <ul className="mt-1 space-y-1">
                {(recipe as any).benodigdheden.map((b: any) => (
                  <li key={b.id} className="text-sm text-blue-700">
                    • {b.naam}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Comments with replies ────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Reacties {comments.length > 0 && <span className="text-text-muted font-normal">({comments.length})</span>}
        </h2>

        {/* Comment input */}
        {user && !replyTo && (
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
              onClick={() => handleComment()}
              className="self-end"
            >
              Plaatsen
            </Button>
          </div>
        )}

        {comments.length === 0 && (
          <p className="text-sm text-text-secondary">
            Nog geen reacties. Wees de eerste!
          </p>
        )}

        {/* Threaded comments */}
        <div className="space-y-3">
          {comments
            .filter((c: any) => !c.parent_id)
            .map((c: any) => {
              const replies = comments.filter((r: any) => r.parent_id === c.id);
              return (
                <div key={c.id}>
                  {renderComment(c)}
                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="ml-10 mt-2 space-y-2 border-l-2 border-gray-100 pl-4">
                      {replies.map((r: any) => renderComment(r, true))}
                    </div>
                  )}
                  {/* Reply input */}
                  {replyTo === c.id && user && (
                    <div className="ml-10 mt-2 flex gap-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={`Reageer op ${c.user?.display_name || 'Anoniem'}...`}
                        rows={1}
                        autoFocus
                        className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        loading={submittingComment}
                        onClick={() => handleComment(c.id)}
                      >
                        Reageer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setReplyTo(null); setCommentText(''); }}
                      >
                        Annuleer
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* ── Cook mode ────────────────────────────── */}
      {cookMode && (
        <CookMode
          title={recipe.title}
          steps={(scaledSteps || recipe.steps).map((s) => ({
            titel: s.titel,
            beschrijving: s.beschrijving,
          }))}
          ingredients={recipe.ingredients.map((ing) => {
            const parsed = parseAmount(ing.hoeveelheid);
            const scaled = parsed !== null ? parsed * ratio : null;
            return {
              hoeveelheid: scaled !== null ? toFraction(scaled) : (ing.hoeveelheid ?? ''),
              eenheid: ing.eenheid,
              naam: ing.naam,
            };
          })}
          portions={portions}
          onClose={() => setCookMode(false)}
        />
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

      {/* ── Confirm dialog ─────────────────────────── */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />

      {/* ── Toast ──────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
