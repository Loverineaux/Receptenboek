/**
 * Per-recipe session persistence — keeps the "I'm halfway through this
 * recipe" state alive when the PWA gets backgrounded/killed on a phone.
 *
 * Scope:
 *   - Which ingredients the user has ticked off while gathering them.
 *   - Which CookMode step they're on (ingredients overview = -1).
 *
 * Stored in localStorage keyed by recipe id with a 24h TTL. Values older
 * than that are discarded on read so tomorrow's cooking session doesn't
 * start with yesterday's checkboxes.
 */

const CHECKED_PREFIX = 'receptenboek:cook-checked:v1:';
const STEP_PREFIX = 'receptenboek:cook-step:v1:';
const TTL_MS = 24 * 60 * 60 * 1000;

interface StoredCheckedValue {
  t: number;
  ids: string[];
}

interface StoredStepValue {
  t: number;
  step: number;
}

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function readCheckedIngredients(recipeId: string): Set<string> {
  const raw = safeGet(CHECKED_PREFIX + recipeId);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as StoredCheckedValue;
    if (!parsed || typeof parsed.t !== 'number' || !Array.isArray(parsed.ids)) {
      return new Set();
    }
    if (Date.now() - parsed.t > TTL_MS) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

export function writeCheckedIngredients(recipeId: string, ids: Set<string>): void {
  if (ids.size === 0) {
    safeRemove(CHECKED_PREFIX + recipeId);
    return;
  }
  const value: StoredCheckedValue = { t: Date.now(), ids: [...ids] };
  safeSet(CHECKED_PREFIX + recipeId, JSON.stringify(value));
}

export function readCookStep(recipeId: string): number | null {
  const raw = safeGet(STEP_PREFIX + recipeId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredStepValue;
    if (!parsed || typeof parsed.t !== 'number' || typeof parsed.step !== 'number') {
      return null;
    }
    if (Date.now() - parsed.t > TTL_MS) return null;
    return parsed.step;
  } catch {
    return null;
  }
}

export function writeCookStep(recipeId: string, step: number): void {
  const value: StoredStepValue = { t: Date.now(), step };
  safeSet(STEP_PREFIX + recipeId, JSON.stringify(value));
}

export function clearCookSession(recipeId: string): void {
  safeRemove(CHECKED_PREFIX + recipeId);
  safeRemove(STEP_PREFIX + recipeId);
}
