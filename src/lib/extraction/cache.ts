import { ExtractedRecipe } from "./prompt";

interface CacheEntry {
  recipe: ExtractedRecipe;
  timestamp: number;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 1000;

const cache = new Map<string, CacheEntry>();

export function getCachedRecipe(url: string): ExtractedRecipe | null {
  const entry = cache.get(url);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(url);
    return null;
  }

  return entry.recipe;
}

export function setCachedRecipe(url: string, recipe: ExtractedRecipe): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES && !cache.has(url)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(url, {
    recipe,
    timestamp: Date.now(),
  });
}
