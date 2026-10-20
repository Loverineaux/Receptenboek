'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  Heart,
  Share,
  Pencil,
  Trash2,
  ChefHat,
  AlertTriangle,
  Lightbulb,
  User,
  FolderPlus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Flame,
  Thermometer,
  MessageCircle,
  Play,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  readCheckedIngredients,
  writeCheckedIngredients,
} from '@/lib/recipe-session';
import BronBadge from '@/components/ui/BronBadge';
import PortieSelector from '@/components/ui/PortieSelector';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Tag from '@/components/ui/Tag';
import dynamic from 'next/dynamic';
import type { ChatMessage } from '@/components/recipes/RecipeChat';

const CookMode = dynamic(() => import('@/components/recipes/CookMode'));
const RecipeChat = dynamic(() => import('@/components/recipes/RecipeChat'));
const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
const ConfirmDialog = dynamic(() => import('@/components/ui/ConfirmDialog'));
const ShareModal = dynamic(() => import('@/components/ui/ShareModal'));
import { useAdmin } from '@/hooks/useAdmin';
import { useRealtimeSubscription, useRealtimeRefresh } from '@/hooks/useRealtimeSubscription';
import type { RecipeWithRelations, Comment as CommentType } from '@/types';
import { RECIPE_DETAIL_SELECT, mapRecipeRow } from '@/lib/recipes/recipe-detail-query';

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

/**
 * Format a scaled amount: amounts >= 20 g/ml are rounded to 10 when the
 * portions changed; otherwise common fractions / one decimal. Comma decimals.
 */
function formatScaledAmount(parsed: number, ratio: number, eenheid?: string | null): string {
  let scaled = parsed * ratio;
  const unit = (eenheid ?? '').trim().toLowerCase();
  if (ratio !== 1 && ['g', 'gram', 'ml'].includes(unit) && scaled >= 20) {
    scaled = Math.round(scaled / 10) * 10;
  }
  return toFraction(scaled).replace('.', ',');
}

const IMPLIED_ONE_UNITS: Record<string, string> = {
  handje: 'handje', handjes: 'handje',
  snufje: 'snufje', snufjes: 'snufje',
  scheutje: 'scheutje', scheutjes: 'scheutje',
  bosje: 'bosje', bosjes: 'bosje',
  takje: 'takje', takjes: 'takje',
  teentje: 'teentje', teentjes: 'teentje',
  plakje: 'plakje', plakjes: 'plakje',
  blaadjes: 'blaadjes',
};

/** Parse an ingredient row into a display amount (scaled, incl. unit) and name. */
function describeIngredient(
  ing: { hoeveelheid: string | null; eenheid: string | null; naam: string | null },
  ratio: number,
): { amountText: string; naam: string } {
  let parsed = parseAmount(ing.hoeveelheid);
  let eenheid = ing.eenheid ?? '';
  let naam = ing.naam ?? '';

  // No amount in hoeveelheid: try the name, e.g. "Rucola Handje" or "Avocado Halve"
  if (parsed === null && naam) {
    const parts = naam.trim().split(/\s+/);
    const lastWord = parts[parts.length - 1]?.toLowerCase();
    if (IMPLIED_ONE_UNITS[lastWord]) {
      parsed = 1;
      eenheid = IMPLIED_ONE_UNITS[lastWord];
      naam = parts.slice(0, -1).join(' ');
    } else if (DUTCH_AMOUNTS[lastWord] !== undefined) {
      parsed = DUTCH_AMOUNTS[lastWord];
      naam = parts.slice(0, -1).join(' ');
    }
  }

  const scaled = parsed !== null ? parsed * ratio : null;
  const amount = parsed !== null ? formatScaledAmount(parsed, ratio, eenheid) : (ing.hoeveelheid ?? '');
  const displayEenheid = scaled !== null && scaled > 1 && eenheid ? smartUnit(eenheid, scaled) : eenheid;

  return { amountText: [amount, displayEenheid].filter(Boolean).join(' '), naam };
}

const textareaClass =
  'min-h-[44px] flex-1 rounded-input border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';

// ── tabs ──────────────────────────────────────────

type Tab = 'ingredienten' | 'bereiding' | 'voeding';

const CATEGORY_LIST = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch', 'Pasta', 'Salade', 'Soep', 'Dessert', 'Ontbijt', 'Lunch'];

export default function RecipeDetailPageWrapper({
  initialRecipe = null,
}: {
  initialRecipe?: RecipeWithRelations | null;
}) {
  return (
    <Suspense>
      <RecipeDetailPage initialRecipe={initialRecipe} />
    </Suspense>
  );
}

function RecipeDetailPage({
  initialRecipe,
}: {
  initialRecipe: RecipeWithRelations | null;
}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isAdmin: isAdminUser } = useAdmin();
  const supabase = createClient();

  const [recipe, setRecipe] = useState<RecipeWithRelations | null>(initialRecipe);
  // When the server already provided the recipe we render it immediately; the
  // fetchRecipe effect below still runs to refresh + load user-specific data
  // (favorite count, own rating) in the background.
  const [loading, setLoading] = useState(!initialRecipe);
  // Tracks whether a recipe is already on screen, so the background refresh
  // doesn't flash the loading spinner over existing content.
  const hasRecipeRef = useRef<boolean>(!!initialRecipe);
  // Ingredient checkboxes are persisted per-recipe in localStorage (24h TTL)
  // so switching apps on a phone and returning keeps what you already
  // ticked off while shopping the kitchen.
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!params.id) return;
    setCheckedIngredients(readCheckedIngredients(params.id));
  }, [params.id]);
  const toggleIngredientChecked = useCallback(
    (ingredientId: string) => {
      setCheckedIngredients((prev) => {
        const next = new Set(prev);
        if (next.has(ingredientId)) next.delete(ingredientId);
        else next.add(ingredientId);
        if (params.id) writeCheckedIngredients(params.id, next);
        return next;
      });
    },
    [params.id],
  );
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return t === 'bereiding' || t === 'voeding' ? t : 'ingredienten';
  });
  const [portions, setPortions] = useState(() => {
    const p = Number(searchParams.get('porties'));
    if (p > 0) return p;
    return initialRecipe?.basis_porties ?? 2;
  });
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
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
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [scaledSteps, setScaledSteps] = useState<any[] | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const nutritionFetched = useRef(false);

  // Persist tab + portions in URL so state survives app suspend / screen off.
  // Bewust history.replaceState i.p.v. router.replace: dat laatste haalt de hele
  // pagina opnieuw van de server (RSC + receptquery) bij elke tab- of portiewissel.
  // Next.js synchroniseert useSearchParams met native replaceState.
  useEffect(() => {
    const p = new URLSearchParams();
    if (tab !== 'ingredienten') p.set('tab', tab);
    if (recipe && portions !== recipe.basis_porties) p.set('porties', String(portions));
    const qs = p.toString();
    const target = `/recepten/${params.id}${qs ? `?${qs}` : ''}`;
    if (`${window.location.pathname}${window.location.search}` === target) return;
    window.history.replaceState(window.history.state, '', target);
  }, [tab, portions, recipe, params.id]);

  // Auto-calculate nutrition when tab is 'voeding' and no source nutrition exists
  useEffect(() => {
    if (tab !== 'voeding' || !recipe || recipe.nutrition || calculation || calculating || nutritionFetched.current) return;
    nutritionFetched.current = true;
    setCalculating(true);
    fetch(`/api/recipes/${params.id}/calculate-nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: false }),
    }).then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCalculation(data); })
      .finally(() => setCalculating(false));
  }, [tab, recipe, calculation, calculating, params.id]);

  const [scalingSteps, setScalingSteps] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const scaledForPortions = useRef<number | null>(null);

  // ── fetch recipe ────────────────────────────────

  const fetchRecipe = useCallback(async () => {
    // Only show the spinner when nothing is on screen yet. When the server
    // already injected the recipe (initialRecipe), this runs as a silent
    // background refresh and must not flash a spinner over the content.
    if (!hasRecipeRef.current) setLoading(true);

    // finally guarantees the spinner always clears — even if the query throws
    // or the session is in a bad state. Without it a rejected/hung auth query
    // left `loading` stuck on true and the page span forever.
    try {
      // Fetch recipe data and favorite count in parallel
      const [recipeResult, fcResult] = await Promise.all([
        supabase
          .from('recipes')
          .select(RECIPE_DETAIL_SELECT)
          .eq('id', params.id)
          .single(),
        fetch(`/api/recipes/${params.id}/favorite-count`)
          .then((r) => (r.ok ? r.json() : { count: 0, is_favorited: false }))
          .catch(() => ({ count: 0, is_favorited: false })),
      ]);

      const { data } = recipeResult;

      if (!data) return;

      const ratings = data.ratings ?? [];

      const fetchedFavCount = fcResult.count ?? 0;
      const fetchedIsFavorited = fcResult.is_favorited ?? false;

      const r: RecipeWithRelations = {
        ...mapRecipeRow(data),
        favorite_count: fetchedFavCount,
      };

      hasRecipeRef.current = true;
      setRecipe(r);
      // Only set default portions if not already set via URL params
      setPortions(() => {
        const urlPortions = Number(searchParams.get('porties'));
        return urlPortions > 0 ? urlPortions : r.basis_porties;
      });
      setComments(data.comments ?? []);
      setFavoriteCount(fetchedFavCount);
      setIsFavorited(fetchedIsFavorited);

      // Check user rating
      if (user) {
        const myRating = ratings.find((rt: any) => rt.user_id === user.id);
        if (myRating) setUserRating(myRating.sterren);
      }
    } finally {
      setLoading(false);
    }
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

  const toggleFavorite = () => {
    if (!user) return;

    const wasLiked = isFavorited;
    setIsFavorited(!wasLiked);
    setFavoriteCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    fetch(`/api/recipes/${params.id}/favorite`, {
      method: wasLiked ? 'DELETE' : 'POST',
    }).then((res) => {
      if (!res.ok) {
        setIsFavorited(wasLiked);
        setFavoriteCount((c) => c + (wasLiked ? 1 : -1));
      }
    }).catch(() => {
      setIsFavorited(wasLiked);
      setFavoriteCount((c) => c + (wasLiked ? 1 : -1));
    });
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

    // Refetch ratings only (not full page)
    refetchRatings();
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
      await fetch(`/api/recipes/${params.id}/comments/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      });
      setCommentLikes((prev) => { const n = new Set(prev); n.delete(commentId); return n; });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes_count: (c.likes_count || 1) - 1 } : c));
    } else {
      await fetch(`/api/recipes/${params.id}/comments/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      });
      setCommentLikes((prev) => new Set(prev).add(commentId));
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c));
    }
  };

  const renderComment = (c: any, isReply = false) => (
    <div key={c.id} className="flex gap-3 rounded-card border border-line bg-surface p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunk">
        {c.user?.avatar_url ? (
          <Image src={c.user.avatar_url} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-ink-3" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-ink">
          {c.user?.display_name ?? 'Anoniem'}
          <span className="ml-2 font-normal text-ink-3">
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
              className="flex-1 rounded-input border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
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
          <p className="mt-0.5 text-[15px] text-ink-2">{c.tekst}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={() => handleLikeComment(c.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                commentLikes.has(c.id) ? 'text-primary font-medium' : 'text-ink-3 hover:text-primary'
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
              className="text-xs text-ink-3 hover:text-primary"
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
                className="text-xs text-ink-3 hover:text-primary"
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
                className="text-xs text-ink-3 hover:text-error"
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

  const [shareOpen, setShareOpen] = useState(false);

  // Realtime: comments
  useRealtimeSubscription({
    table: 'comments',
    filter: `recipe_id=eq.${params.id}`,
    enabled: !!recipe,
    onInsert: async (newComment) => {
      // Fetch the full comment with user profile
      const { data } = await supabase
        .from('comments')
        .select('*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)')
        .eq('id', newComment.id)
        .single();
      if (data) {
        setComments((prev) => {
          // Don't add if already exists (e.g. own comment)
          if (prev.some((c) => c.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    },
    onDelete: (deleted) => {
      setComments((prev) => prev.filter((c) => c.id !== deleted.id));
    },
  });

  // Realtime: favorites count (skip own actions — already handled optimistically)
  useRealtimeSubscription({
    table: 'favorites',
    filter: `recipe_id=eq.${params.id}`,
    enabled: !!recipe,
    onInsert: (fav) => {
      if (fav.user_id === user?.id) return;
      setFavoriteCount((c) => c + 1);
    },
    onDelete: (fav) => {
      if (fav.user_id === user?.id) return;
      setFavoriteCount((c) => Math.max(0, c - 1));
    },
  });

  // Realtime: ratings — always refetch from DB (DELETE events don't include user_id)
  const refetchRatings = useCallback(() => {
    setTimeout(() => {
      supabase.from('ratings').select('sterren, user_id').eq('recipe_id', params.id)
        .then(({ data }) => {
          if (data) {
            const avg = data.length > 0 ? data.reduce((s, r: any) => s + r.sterren, 0) / data.length : null;
            setRecipe((prev) => prev ? { ...prev, average_rating: avg, ratings: data as any } : null);
          }
        });
    }, 300); // Small delay to let DB settle after own optimistic updates
  }, [supabase, params.id]);

  useRealtimeRefresh({
    table: 'ratings',
    filter: `recipe_id=eq.${params.id}`,
    enabled: !!recipe,
    onAnyChange: refetchRatings,
  });

  // Realtime: recipe updates (title, image, etc.) — update in place
  useRealtimeSubscription({
    table: 'recipes',
    filter: `id=eq.${params.id}`,
    enabled: !!recipe,
    onUpdate: (updated) => {
      setRecipe((prev) => prev ? { ...prev, ...updated } : null);
    },
  });

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
        <h2 className="text-xl font-semibold text-ink">
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
  const canEdit = isOwner || isAdminUser;
  const ratio = portions / recipe.basis_porties;
  const authorName: string | null = (recipe as any).user?.display_name ?? null;
  const visibleSteps = scaledSteps || recipe.steps;
  const checkedCount = recipe.ingredients.filter((i) => checkedIngredients.has(i.id)).length;
  const averageText =
    recipe.average_rating !== null ? recipe.average_rating.toFixed(1).replace('.', ',') : null;
  const ratingCount = recipe.ratings?.length ?? recipe.rating_count ?? 0;

  const tabOptions: { value: Tab; label: string }[] = [
    { value: 'ingredienten', label: 'Ingrediënten' },
    { value: 'bereiding', label: 'Bereiding' },
    { value: 'voeding', label: 'Voeding' },
  ];

  const temperatuur = (recipe as any).temperatuur as string | null | undefined;
  const kerntemperatuur = (recipe as any).kerntemperatuur as string | null | undefined;
  const benodigdheden = ((recipe as any).benodigdheden ?? []) as { id: string; naam: string }[];

  // Nutrition cards (bron of berekend)
  const nutritionCards: { label: string; value: string; unit: string }[] | null = recipe.nutrition
    ? [
        { label: 'Energie', value: String(recipe.nutrition.energie_kcal ?? '–'), unit: 'kcal' },
        { label: 'Eiwit', value: String(recipe.nutrition.eiwitten ?? '–'), unit: 'g' },
        { label: 'Koolhydraten', value: String(recipe.nutrition.koolhydraten ?? '–'), unit: 'g' },
        { label: 'Vet', value: String(recipe.nutrition.vetten ?? '–'), unit: 'g' },
      ]
    : calculation
      ? [
          { label: 'Energie', value: String(Math.round(calculation.per_portion_kcal)), unit: 'kcal' },
          { label: 'Eiwit', value: String(Math.round(calculation.per_portion_protein)), unit: 'g' },
          { label: 'Koolhydraten', value: String(Math.round(calculation.per_portion_carbs)), unit: 'g' },
          { label: 'Vet', value: String(Math.round(calculation.per_portion_fat)), unit: 'g' },
        ]
      : null;

  const sectionTitle = 'font-display text-section font-semibold text-ink';
  const infoCard = 'rounded-card border border-line bg-surface p-4';

  return (
    <div className="pb-28 md:pb-24">
      <div className="-mx-gutter -mt-3 md:mx-0 md:mt-0 md:grid md:grid-cols-[5fr_6fr] md:items-start md:gap-10">
        {/* ── Foto ───────────────────────────────────── */}
        <div className="md:sticky md:top-24">
          <div className="relative h-[340px] overflow-hidden bg-placeholder md:h-[520px] md:rounded-card-lg">
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt={recipe.title}
                fill
                className="object-cover"
                priority
                sizes="(min-width: 768px) 45vw, 100vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-placeholder">
                <ChefHat className="h-16 w-16 text-placeholder-2" strokeWidth={1.5} />
              </div>
            )}
            <div className="photo-fade-top pointer-events-none absolute inset-x-0 top-0 h-[120px]" />

            <div className="absolute inset-x-[18px] top-[calc(env(safe-area-inset-top)+12px)] flex justify-between md:top-4">
              <IconButton variant="photo" label="Terug" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" strokeWidth={2} />
              </IconButton>
              <div className="flex gap-2.5">
                <IconButton variant="photo" label="Recept delen" onClick={() => setShareOpen(true)}>
                  <Share className="h-[19px] w-[19px]" strokeWidth={2} />
                </IconButton>
                <IconButton
                  variant="photo"
                  label={isFavorited ? 'Verwijder uit favorieten' : 'Zet in favorieten'}
                  aria-pressed={isFavorited}
                  onClick={toggleFavorite}
                >
                  <Heart
                    className={`h-[19px] w-[19px] ${isFavorited ? 'fill-primary text-primary' : ''}`}
                    strokeWidth={2}
                  />
                </IconButton>
              </div>
            </div>
          </div>
        </div>

        {/* ── Inhoud ─────────────────────────────────── */}
        <div className="relative -mt-[30px] min-w-0 rounded-t-sheet bg-background px-gutter pt-6 md:mt-0 md:rounded-none md:bg-transparent md:p-0">
          {/* Bron + auteur */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-ink-3">
            <BronBadge bron={recipe.bron} />
            {authorName && <span>door {authorName}</span>}
            {favoriteCount > 0 && (
              <span className="tabular">
                {authorName || recipe.bron ? '· ' : ''}
                {favoriteCount} {favoriteCount === 1 ? 'favoriet' : 'favorieten'}
              </span>
            )}
          </div>

          <h1 className="text-pretty mt-3 font-display text-detail-title font-semibold text-ink">
            {recipe.title}
          </h1>

          {/* Receptkaart */}
          <div className="mt-5 grid grid-cols-[1fr_1fr_1.25fr] rounded-card border border-line bg-surface">
            <div className="border-r border-line-soft px-3.5 py-[13px]">
              <div className="text-xs text-ink-3">Tijd</div>
              <div className="mt-[3px] text-[17px] font-semibold text-ink">{recipe.tijd || '–'}</div>
            </div>
            <div className="border-r border-line-soft px-3.5 py-[13px]">
              <div className="text-xs text-ink-3">Beoordeling</div>
              <div className="mt-[3px] text-[17px] font-semibold text-ink">
                {averageText ? (
                  <>
                    <span className="text-primary">★</span> {averageText}
                    {ratingCount > 0 && (
                      <span
                        className="ml-1 text-[13px] font-normal text-ink-3"
                        aria-label={`${ratingCount} ${ratingCount === 1 ? 'beoordeling' : 'beoordelingen'}`}
                      >
                        ({ratingCount})
                      </span>
                    )}
                  </>
                ) : (
                  '–'
                )}
              </div>
            </div>
            <div className="py-2.5 pl-3.5 pr-2.5">
              <div className="text-xs text-ink-3">Personen</div>
              <PortieSelector value={portions} onChange={handlePortionChange} />
            </div>
          </div>

          {/* Intro */}
          {recipe.subtitle && (
            <p className="text-body text-pretty mt-[18px] text-ink-2">{recipe.subtitle}</p>
          )}

          {/* Tags (alleen lezen; bewerken staat onderaan bij "Beheer") */}
          {(recipe.tags.length > 0 || recipe.moeilijkheid) && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {recipe.moeilijkheid && <Tag variant="outline">{recipe.moeilijkheid}</Tag>}
              {recipe.tags.map((tag) => (
                <Tag key={tag.id} variant="outline">
                  {tag.name}
                </Tag>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div data-tour="recipe-tabs" className="mt-6">
            <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />
          </div>

          {/* ── Ingrediënten ───────────────────────── */}
          {tab === 'ingredienten' && (
            <div data-tour="recipe-ingredients" className="mt-2">
              {recipe.ingredients.map((ing) => {
                const { amountText, naam } = describeIngredient(ing, ratio);
                const isChecked = checkedIngredients.has(ing.id);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleIngredientChecked(ing.id)}
                    className="flex min-h-[52px] w-full items-center gap-3.5 border-b border-line py-2 text-left"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-[1.5px] transition-colors ${
                        isChecked ? 'border-primary bg-primary' : 'border-line-strong bg-transparent'
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 text-on-primary" strokeWidth={3} />}
                    </span>
                    <span
                      className={`tabular w-[78px] shrink-0 text-[15px] font-semibold ${
                        isChecked ? 'text-ink-4' : 'text-ink'
                      }`}
                    >
                      {amountText}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[15px] ${
                        isChecked ? 'text-ink-4 line-through' : 'text-ink'
                      }`}
                    >
                      {naam}
                    </span>
                  </button>
                );
              })}
              {recipe.ingredients.length > 0 && (
                <div className="tabular mt-3 text-meta text-ink-3">
                  {checkedCount} van {recipe.ingredients.length} klaargezet
                </div>
              )}
            </div>
          )}

          {/* ── Bereiding ──────────────────────────── */}
          {tab === 'bereiding' && (
            <div data-tour="recipe-steps" className="mt-5">
              {scalingSteps && (
                <div className="mb-4 flex items-center gap-2 rounded-input bg-primary-tint px-4 py-2.5 text-sm text-primary">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Bereiding aanpassen voor {portions} porties...
                </div>
              )}
              <ol className="flex flex-col gap-[18px]">
                {visibleSteps.map((step, idx) => (
                  <li key={step.id || idx} className="flex gap-3.5">
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-[13px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2 pt-1">
                      {step.titel && <h4 className="text-[15.5px] font-semibold text-ink">{step.titel}</h4>}
                      <p className="text-body text-pretty whitespace-pre-line text-ink-2">
                        {scaledSteps ? step.beschrijving : scaleStepText(step.beschrijving, ratio)}
                      </p>
                      {step.afbeelding_url && (
                        <div className="relative mt-2 h-48 w-full overflow-hidden rounded-card">
                          <Image
                            src={step.afbeelding_url}
                            alt={`Stap ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── Voeding ────────────────────────────── */}
          {tab === 'voeding' && (
            <div data-tour="recipe-nutrition" className="mt-[18px]">
              {!recipe.nutrition && calculating && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Voedingswaarden berekenen...
                </div>
              )}

              {nutritionCards && (
                <div className="grid grid-cols-2 gap-2.5">
                  {nutritionCards.map((n) => (
                    <div key={n.label} className="rounded-[18px] border border-line bg-surface px-4 py-3.5">
                      <div className="text-[12.5px] text-ink-3">{n.label}</div>
                      <div className="mt-0.5 font-display text-[27px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
                        {n.value}
                        <span className="ml-[3px] font-sans text-sm font-normal tracking-normal text-ink-3">
                          {n.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2 text-meta text-ink-3">
                    {recipe.nutrition
                      ? 'Per portie · volgens de bron'
                      : 'Per portie · schatting op basis van ingrediënten'}
                  </div>
                </div>
              )}

              {/* Extra waarden uit de bron */}
              {recipe.nutrition && (
                <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-line-soft">
                      {[
                        ['Energie', recipe.nutrition.energie_kj, 'kJ'],
                        ['Waarvan verzadigd', recipe.nutrition.verzadigd, 'g'],
                        ['Waarvan suikers', recipe.nutrition.suikers, 'g'],
                        ['Vezels', recipe.nutrition.vezels, 'g'],
                        ['Zout', recipe.nutrition.zout, 'g'],
                      ].map(([label, value, unit]) =>
                        value != null && value !== '' ? (
                          <tr key={label as string}>
                            <td className="px-4 py-2.5 text-ink-2">{label as string}</td>
                            <td className="tabular px-4 py-2.5 text-right font-medium text-ink">
                              {value as string} {unit as string}
                            </td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dekking van de berekening */}
              {!recipe.nutrition && calculation && (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setNutritionOpen(!nutritionOpen)}
                    aria-expanded={nutritionOpen}
                    className="flex min-h-[44px] w-full items-center justify-between rounded-input px-1 text-sm transition-colors hover:bg-sunk"
                  >
                    <span className="font-medium text-ink-2">
                      {calculation.matched_count} van {calculation.total_count} ingrediënten berekend
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-3">
                      {Math.round(calculation.coverage * 100)}%
                      {nutritionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                  <div className="h-1.5 w-full rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, calculation.coverage * 100)}%` }}
                    />
                  </div>
                  {nutritionOpen && (
                    <div className="rounded-card border border-line bg-surface p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(calculation.matched || []).map((ing: string, i: number) => (
                          <span
                            key={`m-${i}`}
                            className="rounded-chip bg-primary-tint px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {ing}
                          </span>
                        ))}
                        {(calculation.missing || []).map((ing: string, i: number) => (
                          <span
                            key={`x-${i}`}
                            className="rounded-chip bg-sunk px-2.5 py-1 text-xs font-medium text-ink-3"
                          >
                            {ing} (ontbreekt)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!recipe.nutrition && !calculating && !calculation && (
                <p className="py-8 text-center text-sm text-ink-3">Geen voedingswaarden beschikbaar.</p>
              )}
            </div>
          )}

          {/* ── Extra info ─────────────────────────── */}
          {(recipe.weetje || recipe.allergenen || benodigdheden.length > 0 || temperatuur || kerntemperatuur) && (
            <div className="mt-8 space-y-3">
              {(temperatuur || kerntemperatuur) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {temperatuur &&
                    (() => {
                      const temp = temperatuur.toLowerCase();
                      const allSteps = (recipe.steps || [])
                        .map((s: any) => (s.beschrijving || '').toLowerCase())
                        .join(' ');
                      const isBBQ =
                        temp.includes('bbq') ||
                        temp.includes('barbecue') ||
                        temp.includes('grill') ||
                        allSteps.includes('bbq') ||
                        allSteps.includes('barbecue') ||
                        allSteps.includes('grillen');
                      return (
                        <div className="rounded-[18px] border border-line bg-surface px-4 py-3">
                          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                            <Flame className="h-3.5 w-3.5" strokeWidth={2} />
                            {isBBQ ? 'BBQ / Grill' : 'Oven'}
                          </div>
                          <div className="mt-0.5 text-[17px] font-semibold text-ink">{temperatuur}</div>
                        </div>
                      );
                    })()}
                  {kerntemperatuur && (
                    <div className="rounded-[18px] border border-line bg-surface px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                        <Thermometer className="h-3.5 w-3.5" strokeWidth={2} />
                        Kerntemperatuur
                      </div>
                      <div className="mt-0.5 text-[17px] font-semibold text-ink">{kerntemperatuur}</div>
                    </div>
                  )}
                </div>
              )}

              {recipe.weetje && (
                <div className="rounded-card bg-sunk p-4">
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <Lightbulb className="h-4 w-4 text-primary" strokeWidth={2} />
                    Weetje
                  </div>
                  <p className="text-pretty mt-1 text-[15px] leading-relaxed text-ink-2">{recipe.weetje}</p>
                </div>
              )}

              {recipe.allergenen && (
                <div className={infoCard}>
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <AlertTriangle className="h-4 w-4 text-error" strokeWidth={2} />
                    Allergenen
                  </div>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{recipe.allergenen}</p>
                </div>
              )}

              {benodigdheden.length > 0 && (
                <div className={infoCard}>
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <ChefHat className="h-4 w-4 text-primary" strokeWidth={2} />
                    Benodigdheden
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {benodigdheden.map((b) => (
                      <li key={b.id} className="flex gap-2 text-[15px] text-ink-2">
                        <span className="text-ink-4">•</span>
                        {b.naam}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── Jouw beoordeling ───────────────────── */}
          {user && (
            <div className={`${infoCard} mt-8 flex flex-wrap items-center justify-between gap-3`}>
              <span className="text-[15px] font-semibold text-ink">Jouw beoordeling</span>
              <div className="flex items-center gap-2">
                <StarRating value={userRating} onChange={handleRate} />
                {userRating > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRate(userRating)}
                    className="flex h-8 items-center rounded-chip bg-primary-tint px-2.5 text-xs font-semibold text-primary hover:bg-line"
                    aria-label="Beoordeling verwijderen"
                  >
                    {userRating}★ ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Reacties ───────────────────────────── */}
          <section data-tour="recipe-comments" className="mt-8 space-y-4">
            <h2 className={sectionTitle}>
              Reacties{' '}
              {comments.length > 0 && <span className="font-sans text-base font-normal text-ink-3">({comments.length})</span>}
            </h2>

            {user && !replyTo && (
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Schrijf een reactie..."
                  aria-label="Schrijf een reactie"
                  rows={2}
                  className={textareaClass}
                />
                <Button
                  variant="primary"
                  size="md"
                  loading={submittingComment}
                  onClick={() => handleComment()}
                  className="self-end"
                >
                  Plaatsen
                </Button>
              </div>
            )}

            {comments.length === 0 && (
              <p className="text-sm text-ink-3">Nog geen reacties. Wees de eerste!</p>
            )}

            <div className="space-y-3">
              {comments
                .filter((c: any) => !c.parent_id)
                .map((c: any) => {
                  const replies = comments.filter((r: any) => r.parent_id === c.id);
                  return (
                    <div key={c.id}>
                      {renderComment(c)}
                      {replies.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-line pl-4">
                          {replies.map((r: any) => renderComment(r, true))}
                        </div>
                      )}
                      {replyTo === c.id && user && (
                        <div className="ml-6 mt-2 flex gap-2">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={`Reageer op ${c.user?.display_name || 'Anoniem'}...`}
                            aria-label="Schrijf een antwoord"
                            rows={1}
                            autoFocus
                            className={textareaClass}
                          />
                          <Button
                            variant="primary"
                            size="md"
                            loading={submittingComment}
                            onClick={() => handleComment(c.id)}
                          >
                            Reageer
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => {
                              setReplyTo(null);
                              setCommentText('');
                            }}
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

          {/* ── Beheer (eigenaar/admin) ────────────── */}
          {canEdit && (
            <section className="mt-8 space-y-4">
              <h2 className={sectionTitle}>Beheer</h2>

              <div>
                <div className="mb-2 text-meta font-semibold text-ink-3">Categorieën</div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_LIST.map((cat) => {
                    const hasTag = recipe.tags.some((t) => t.name.toLowerCase() === cat.toLowerCase());
                    return (
                      <Chip
                        key={cat}
                        active={hasTag}
                        aria-pressed={hasTag}
                        onClick={async () => {
                          // Toggle tag via API (handles RLS for admin)
                          const currentTags = recipe.tags.map((t) => t.name);
                          const newTags = hasTag
                            ? currentTags.filter((t) => t.toLowerCase() !== cat.toLowerCase())
                            : [...currentTags, cat];

                          await fetch(`/api/recipes/${recipe.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tags: newTags }),
                          });
                          fetchRecipe();
                        }}
                      >
                        {cat}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/recepten/${recipe.id}/bewerk`}>
                  <Button variant="secondary" size="md">
                    <Pencil className="h-4 w-4" />
                    Bewerken
                  </Button>
                </Link>
                <Button variant="danger" size="md" onClick={() => setDeleteModalOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Verwijderen
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Sticky actiebalk ─────────────────────────── */}
      <div
        className="bar-blur fixed inset-x-0 bottom-0 z-40 border-t border-line"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <div className="mx-auto flex max-w-6xl gap-2.5 px-[18px] pt-3 md:px-8">
          {user && (
            <button
              type="button"
              onClick={() => setCollectionModalOpen(true)}
              aria-label="Bewaar in collectie"
              title="Bewaar in collectie"
              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-btn border border-line bg-surface text-ink transition-colors hover:bg-sunk"
            >
              <FolderPlus className="h-[21px] w-[21px]" strokeWidth={1.9} />
            </button>
          )}
          <button
            type="button"
            data-tour="recipe-cook-mode"
            onClick={() => setCookMode(true)}
            className="flex h-[54px] flex-1 items-center justify-center gap-2.5 rounded-btn bg-primary text-base font-semibold text-on-primary shadow-btn-primary transition-colors hover:bg-primary-dark"
          >
            <Play className="h-[17px] w-[17px] fill-current" strokeWidth={0} />
            Start kookmodus
          </button>
          {user && (
            <button
              type="button"
              data-tour="recipe-ai-chat"
              onClick={() => setChatOpen(true)}
              aria-label="Open kookassistent"
              title="Kookassistent"
              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-btn border border-line bg-surface text-primary transition-colors hover:bg-sunk"
            >
              <MessageCircle className="h-[21px] w-[21px]" strokeWidth={1.9} />
            </button>
          )}
        </div>
      </div>

      {/* ── AI Kookassistent ────────────────────── */}
      {user && (
        <RecipeChat
          recipe={recipe}
          messages={chatMessages}
          onMessagesChange={setChatMessages}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      )}

      {/* ── Cook mode ────────────────────────────── */}
      {cookMode && (
        <CookMode
          title={recipe.title}
          steps={visibleSteps.map((s) => ({
            titel: s.titel,
            beschrijving: s.beschrijving,
          }))}
          ingredients={recipe.ingredients.map((ing) => {
            const parsed = parseAmount(ing.hoeveelheid);
            return {
              hoeveelheid:
                parsed !== null
                  ? formatScaledAmount(parsed, ratio, ing.eenheid)
                  : (ing.hoeveelheid ?? ''),
              eenheid: ing.eenheid,
              naam: ing.naam,
            };
          })}
          portions={portions}
          onClose={() => setCookMode(false)}
          recipe={recipe}
          recipeId={params.id}
          chatMessages={chatMessages}
          onChatMessagesChange={setChatMessages}
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
        <p className="text-[15px] text-ink-2">
          Weet je zeker dat je dit recept wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
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

      {/* ── Bewaar in collectie (sheet) ─────────── */}
      {user && (
        <AddToCollectionModal
          recipeId={recipe.id}
          open={collectionModalOpen}
          onClose={() => setCollectionModalOpen(false)}
          recipe={{ title: recipe.title, image_url: recipe.image_url, tijd: recipe.tijd }}
        />
      )}

      {/* ── Share modal ────────────────────────────── */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={recipe?.title || 'Recept'}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        shareType="recipe"
        itemId={params.id}
      />

      {/* ── Toast ──────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-input bg-ink px-4 py-2 text-sm text-on-primary shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
