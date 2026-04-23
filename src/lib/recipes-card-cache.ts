/**
 * Stale-while-revalidate cache for the /recepten default-view listing.
 *
 * On a cold app open the main recipes query takes ~5s (Supabase Pro infra
 * baseline on this project, see telemetry session=ab0c88ee). Instead of
 * making the user wait, we show the previous-session recipes instantly
 * from localStorage and revalidate in the background. The background
 * fetch never triggers a page reload — it just replaces the recipe list
 * silently once fresh data arrives. If the revalidation takes forever or
 * fails, the cached data stays visible indefinitely.
 *
 * Cache rules:
 *   - Only the default view (no filters, newest sort, page 0) is cached.
 *   - Keyed by user id so per-account separation stays clean.
 *   - 7-day TTL — realtime subscriptions patch individual cards during a
 *     session, and on each app open the background revalidate rewrites
 *     the cache, so a long TTL is safe.
 */

const CACHE_PREFIX = 'receptenboek:recepten-cards:v1:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CardsCacheValue<T> {
  t: number;
  data: T;
}

export function readRecipesCardCache<T>(userId: string | null | undefined): T | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardsCacheValue<T>;
    if (!parsed || typeof parsed.t !== 'number') return null;
    if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeRecipesCardCache<T>(userId: string | null | undefined, data: T): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const value: CardsCacheValue<T> = { t: Date.now(), data };
    window.localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(value));
  } catch {
    // localStorage full or blocked — ignore, cold load will just be slow
  }
}

export function clearRecipesCardCache(userId: string | null | undefined): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(CACHE_PREFIX + userId);
  } catch {}
}
